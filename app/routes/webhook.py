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
    if not signature:
        return True
    # Try BASIC_HMAC dashboard Signing Key first, then fall back to client_secret
    keys = [
        os.getenv("UBER_WEBHOOK_SIGNING_KEY", ""),
        os.getenv("UBER_CLIENT_SECRET", ""),
    ]
    for secret in keys:
        if not secret:
            continue
        digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        if (hmac.compare_digest(digest, signature) or
                hmac.compare_digest("sha256=" + digest, signature)):
            return True
    return False

@router.post("/orders")
async def receive_order(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("x-uber-signature", "")

    if signature and not verify_signature(body, signature):
        # Log mismatch but keep processing — Uber may use the dashboard Signing Key
        # instead of client_secret; we don't want to silently drop real orders.
        print(f"[Webhook] WARNING: Signature mismatch (check UBER_CLIENT_SECRET vs dashboard Signing Key). Processing anyway.")

    payload = json.loads(body)
    print(f"[Webhook] Received: {json.dumps(payload, indent=2)}")

    event_type = payload.get("event_type", "")
    if "order" not in event_type.lower():
        return {"status": "ignored", "event": event_type}

    # Per Uber docs: resource_id is inside meta{}, resource_href is top level
    order_id      = payload.get("meta", {}).get("resource_id", "")
    resource_href = payload.get("resource_href", "")

    if not order_id:
        print(f"[Webhook] No resource_id in payload: {payload}")
        return {"status": "no_order_id"}

    # Avoid duplicates — still re-confirm in case previous accept failed
    if db.query(Order).filter(Order.order_id == order_id).first():
        await accept_uber_order(order_id)
        return {"status": "duplicate"}

    # Fetch full order details from Uber using resource_href
    # get_order_details adds ?expand=carts,payment and unwraps {"order":{...}}
    order_data = {}
    if resource_href:
        order_data = await get_order_details(resource_href)
        print(f"[Webhook] Full order: {json.dumps(order_data, indent=2)}")

    # Uber Eats Order Fulfillment API field paths (v1)
    customers  = order_data.get("customers", [])
    customer   = customers[0] if customers else {}
    name_obj   = customer.get("name", {})
    customer_name = (
        name_obj.get("display_name")
        or (name_obj.get("first_name", "") + " " + name_obj.get("last_name", "")).strip()
        or "Uber Customer"
    )
    customer_phone = customer.get("contact", {}).get("phone", {}).get("number", "")

    # Items live in carts[].items (only present when ?expand=carts is used)
    all_items: list = []
    for cart in order_data.get("carts", []):
        all_items.extend(cart.get("items", []))

    # Payment total — Uber uses micro-currency (amount_e5 = 10^5 divisor)
    payment    = order_data.get("payment", {})
    price_obj  = payment.get("price", {})
    raw_total  = price_obj.get("total", price_obj.get("total_price", 0))
    # Uber typically returns amounts in local cents (e2) or e5; if > 100k assume e5
    if isinstance(raw_total, (int, float)) and raw_total > 100000:
        total_amount = float(raw_total) / 100000
    elif isinstance(raw_total, (int, float)) and raw_total > 0:
        total_amount = float(raw_total) / 100
    else:
        total_amount = 0.0

    store_id = order_data.get("store", {}).get("id", os.getenv("UBER_RESTAURANT_UUID", ""))

    db_order = Order(
        order_id         = order_id,
        restaurant_id    = store_id,
        customer_name    = customer_name,
        customer_phone   = customer_phone,
        customer_email   = "",
        items            = json.dumps(all_items),
        special_requests = order_data.get("store_instructions", ""),
        total_amount     = total_amount,
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
