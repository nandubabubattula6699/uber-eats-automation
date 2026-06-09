import httpx
import os
import time

UBER_TOKEN_URL = "https://sandbox-login.uber.com/oauth/v2/token"
UBER_API_BASE  = "https://test-api.uber.com"

# Cache: (access_token, expires_at_timestamp)
_token_cache: tuple[str, float] = ("", 0.0)

async def get_access_token() -> str:
    global _token_cache
    token, expires_at = _token_cache
    if token and time.time() < expires_at - 300:  # reuse until 5 min before expiry
        return token

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            UBER_TOKEN_URL,
            data={
                "client_id":     os.getenv("UBER_CLIENT_ID"),
                "client_secret": os.getenv("UBER_CLIENT_SECRET"),
                "grant_type":    "client_credentials",
                "scope":         "eats.order eats.store",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token", "")
        expires_in = data.get("expires_in", 2592000)
        _token_cache = (token, time.time() + expires_in)
        print(f"[Uber] New token fetched, expires in {expires_in}s")
        return token

async def get_order_details(resource_href: str) -> dict:
    """Fetch full order details using the resource_href from the webhook payload"""
    try:
        token = await get_access_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                resource_href,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        print(f"[Uber] Failed to fetch order details from {resource_href}: {e}")
        return {}

async def enable_store_webhooks() -> bool:
    """Enable all order webhook types on the store via PATCH /pos_data.
    Uber resets these to false on first provisioning; we call this once at startup."""
    store_id = os.getenv("UBER_RESTAURANT_UUID", "")
    if not store_id:
        print("[Uber] No UBER_RESTAURANT_UUID — skipping webhook enable")
        return False
    try:
        token = await get_access_token()
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{UBER_API_BASE}/v1/eats/stores/{store_id}/pos_data",
                headers={"Authorization": f"Bearer {token}"},
                json={
                    "webhooks_config": {
                        "webhooks_version": "0.1",
                        "schedule_order_webhooks":  {"is_enabled": True},
                        "order_release_webhooks":   {"is_enabled": True},
                        "delivery_status_webhooks": {"is_enabled": True},
                    }
                },
            )
            print(f"[Uber] Store webhook enable: {resp.status_code}")
            return resp.status_code in (200, 204)
    except Exception as e:
        print(f"[Uber] Failed to enable store webhooks: {e}")
        return False


async def accept_uber_order(order_id: str) -> bool:
    try:
        token = await get_access_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{UBER_API_BASE}/v1/delivery/order/{order_id}/accept",
                headers={"Authorization": f"Bearer {token}"},
                json={},
            )
            print(f"[Uber] Accept order {order_id}: {resp.status_code} {resp.text}")
            return resp.status_code in (200, 204)
    except Exception as e:
        print(f"[Uber] Failed to accept order {order_id}: {e}")
        return False
