from fastapi import APIRouter


router = APIRouter()


@router.get("/{store_id}/performance")
async def get_store_performance(store_id: str) -> dict:
    return {"store_id": store_id, "snapshots": []}


@router.get("/{store_id}/assets/{asset_id}/performance")
async def get_asset_performance(store_id: str, asset_id: str) -> dict:
    return {"store_id": store_id, "asset_id": asset_id, "snapshots": []}


@router.post("/{store_id}/performance/refresh")
async def refresh_performance(store_id: str) -> dict:
    return {"store_id": store_id, "job": "track_performance", "status": "queued"}

