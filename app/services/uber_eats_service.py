import httpx
import os

UBER_TOKEN_URL = "https://sandbox-login.uber.com/oauth/v2/token"
UBER_API_BASE  = "https://api.uber.com"

async def get_access_token() -> str:
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
        return resp.json().get("access_token", "")

async def accept_uber_order(order_id: str) -> bool:
    try:
        token = await get_access_token()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{UBER_API_BASE}/v2/eats/orders/{order_id}/accept_pos_order",
                headers={"Authorization": f"Bearer {token}"},
                json={"reason": "auto_accept"},
            )
            return resp.status_code in (200, 204)
    except Exception as e:
        print(f"[Uber] Failed to accept order {order_id}: {e}")
        return False
