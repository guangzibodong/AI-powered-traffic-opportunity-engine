from fastapi import APIRouter


router = APIRouter()


@router.post("/{store_id}/integrations/gsc/connect")
async def connect_gsc(store_id: str, payload: dict) -> dict:
    return {"store_id": store_id, "integration": "gsc", "status": "connected_stub"}


@router.post("/{store_id}/integrations/wordpress/connect")
async def connect_wordpress(store_id: str, payload: dict) -> dict:
    return {"store_id": store_id, "integration": "wordpress", "status": "connected_stub"}


@router.post("/{store_id}/integrations/woocommerce/connect")
async def connect_woocommerce(store_id: str, payload: dict) -> dict:
    return {"store_id": store_id, "integration": "woocommerce", "status": "connected_stub"}


@router.get("/{store_id}/integrations")
async def list_integrations(store_id: str) -> dict:
    return {
        "store_id": store_id,
        "integrations": [
            {"name": "Google Search Console", "key": "gsc", "status": "not_connected"},
            {"name": "WordPress", "key": "wordpress", "status": "not_connected"},
            {"name": "WooCommerce", "key": "woocommerce", "status": "not_connected"},
        ],
    }


@router.post("/{store_id}/sync")
async def enqueue_sync(store_id: str) -> dict:
    return {"store_id": store_id, "job": "sync_store_project", "status": "queued"}

