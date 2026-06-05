import hmac
import hashlib
import json
import os
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from app.models.models import Order
from app.services.uber_eats_service import accept_uber_order

router = APIRouter(prefix="/webhook", tags=["webhook"])

def verify_signature(body: bytes, signature: str) -> bool:
    secret = os.getenv("UBER_WEBHOOK_SECRET", "")
    if not secret:
        return True
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

@router.post("/orders")
async def receive_order(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("x-uber-signature", "")

    if not verify_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = json.loads(body)
    print(f"[Webhook] Received: {json.dumps(payload, indent=2)}")

    event_type = payload.get("event_type", "")
    if "order" not in event_type.lower():
        return {"status": "ignored", "event": event_type}

    # Extract order details from Uber payload
    order_data   = payload.get("order", payload)
    order_id     = order_data.get("id") or payload.get("meta", {}).get("order_id", "")
    customer     = order_data.get("customer", {})
    price_info   = order_data.get("price", {})
    items        = order_data.get("items", [])

    if not order_id:
        return {"status": "no_order_id"}

    # Avoid duplicates
    if db.query(Order).filter(Order.order_id == order_id).first():
        return {"status": "duplicate"}

    # Save order to database
    db_order = Order(
        order_id         = order_id,
        restaurant_id    = order_data.get("restaurant_id", os.getenv("UBER_RESTAURANT_UUID", "")),
        customer_name    = customer.get("first_name", "") + " " + customer.get("last_name", ""),
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

    # Auto-confirm with Uber Eats API
    accepted = await accept_uber_order(order_id)
    print(f"[Webhook] Order {order_id} auto-accepted: {accepted}")

    return {"status": "confirmed", "order_id": order_id, "uber_accepted": accepted}


@router.get("/orders/test")
async def test_webhook():
    """Health check for webhook endpoint"""
    return {"status": "webhook is live", "endpoint": "/webhook/orders"}
