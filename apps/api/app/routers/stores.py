from fastapi import APIRouter


router = APIRouter()


@router.post("")
async def create_store(payload: dict) -> dict:
    return {
        "id": "store_demo",
        "status": "created",
        "platform": payload.get("platform", "woocommerce"),
        "name": payload.get("name", "Demo Store"),
    }


@router.get("")
async def list_stores() -> dict:
    return {"stores": []}


@router.get("/{store_id}")
async def get_store(store_id: str) -> dict:
    return {"id": store_id, "status": "stub"}


@router.patch("/{store_id}")
async def update_store(store_id: str, payload: dict) -> dict:
    return {"id": store_id, "status": "updated", "changes": payload}

