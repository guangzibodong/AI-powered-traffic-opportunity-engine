from fastapi import APIRouter


router = APIRouter()


@router.get("/{store_id}/assets")
async def list_assets(store_id: str) -> dict:
    return {"store_id": store_id, "assets": []}


@router.get("/{store_id}/assets/{asset_id}")
async def get_asset(store_id: str, asset_id: str) -> dict:
    return {"store_id": store_id, "id": asset_id}


@router.patch("/{store_id}/assets/{asset_id}")
async def update_asset(store_id: str, asset_id: str, payload: dict) -> dict:
    return {"store_id": store_id, "id": asset_id, "status": "updated", "changes": payload}


@router.post("/{store_id}/assets/{asset_id}/publish-wordpress-draft")
async def publish_wordpress_draft(store_id: str, asset_id: str) -> dict:
    return {
        "store_id": store_id,
        "asset_id": asset_id,
        "status": "draft_published",
        "external_url": None,
    }

