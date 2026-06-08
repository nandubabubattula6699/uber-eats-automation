import hmac
import hashlib
import json
import os
from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from app.models.models import Order
from app.services.uber_eats_service import accept_uber_order, get_order_details

router = APIRouter(prefix="/webhook", tags=["webhook"])

def verify_signature(body: bytes, signature: str) -> bool:
    # Uber docs: HMAC uses client_secret as the signing key
    secret = os.getenv("UBER_CLIENT_SECRET", "")
    if not secret or not signature:
        return True
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return (
        hmac.compare_digest(digest, signature) or
        hmac.compare_digest("sha256=" + digest, signature)
    )

@router.post("/orders")
async def receive_order(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("x-uber-signature", "")

    if signature and not verify_signature(body, signature):
        print(f"[Webhook] Signature mismatch — logging and continuing")
        return {"status": "received"}

    payload = json.loads(body)
    print(f"[Webhook] Received: {json.dumps(payload, indent=2)}")

    event_type = payload.get("event_type", "")
    if "order" not in event_type.lower():
        return {"status": "ignored", "event": event_type}

    # Per Uber docs: resource_id = order_id, resource_href = URL to fetch full order
    order_id      = payload.get("resource_id", "")
    resource_href = payload.get("resource_href", "")

    if not order_id:
        print(f"[Webhook] No resource_id in payload: {payload}")
        return {"status": "no_order_id"}

    # Avoid duplicates — still re-confirm in case previous accept failed
    if db.query(Order).filter(Order.order_id == order_id).first():
        await accept_uber_order(order_id)
        return {"status": "duplicate"}

    # Fetch full order details from Uber using resource_href
    order_data = {}
    if resource_href:
        order_data = await get_order_details(resource_href)
        print(f"[Webhook] Full order: {json.dumps(order_data, indent=2)}")

    customer   = order_data.get("customer", {})
    price_info = order_data.get("price", {})
    items      = order_data.get("cart", {}).get("items", order_data.get("items", []))

    db_order = Order(
        order_id         = order_id,
        restaurant_id    = order_data.get("restaurant_id", os.getenv("UBER_RESTAURANT_UUID", "")),
        customer_name    = (customer.get("first_name", "") + " " + customer.get("last_name", "")).strip() or "Uber Customer",
        customer_phone   = customer.get("phone_number", ""),
        customer_email   = customer.get("email", ""),
        items            = json.dumps(items),
        special_requests = order_data.get("special_instructions", ""),
        total_amount     = float(price_info.get("total_price", 0)) / 100,
        prep_time        = 30,
        status           = "confirmed",
        is_confirmed     = True,
        confirmed_at     = datetime.now(),
    )
    db.add(db_order)
    db.commit()

    accepted = await accept_uber_order(order_id)
    print(f"[Webhook] Order {order_id} auto-accepted: {accepted}")

    return {"status": "confirmed", "order_id": order_id, "uber_accepted": accepted}


@router.get("/orders/test")
async def test_webhook():
    return {"status": "webhook is live", "endpoint": "/webhook/orders"}
