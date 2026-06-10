from fastapi import APIRouter, HTTPException

from app.services.performance_snapshot_service import (
    build_performance_refresh_preview,
    list_asset_performance_snapshots,
    list_store_performance_snapshots,
)


router = APIRouter()


@router.get("/{store_id}/performance")
async def get_store_performance(store_id: str) -> dict:
    return list_store_performance_snapshots(store_id)


@router.get("/{store_id}/assets/{asset_id}/performance")
async def get_asset_performance(store_id: str, asset_id: str) -> dict:
    payload = list_asset_performance_snapshots(store_id, asset_id)
    if payload is None:
        raise HTTPException(status_code=404, detail="Asset draft not found")
    return payload


@router.post("/{store_id}/performance/refresh")
async def refresh_performance(store_id: str) -> dict:
    return build_performance_refresh_preview(store_id)
