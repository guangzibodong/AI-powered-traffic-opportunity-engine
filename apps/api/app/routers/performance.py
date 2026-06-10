from fastapi import APIRouter

from app.services.performance_snapshot_service import list_store_performance_snapshots


router = APIRouter()


@router.get("/{store_id}/performance")
async def get_store_performance(store_id: str) -> dict:
    return list_store_performance_snapshots(store_id)


@router.get("/{store_id}/assets/{asset_id}/performance")
async def get_asset_performance(store_id: str, asset_id: str) -> dict:
    return {"store_id": store_id, "asset_id": asset_id, "snapshots": []}


@router.post("/{store_id}/performance/refresh")
async def refresh_performance(store_id: str) -> dict:
    return {
        "blocked_capabilities": ["real_gsc_oauth", "wordpress_writes", "woocommerce_writes", "live_publish"],
        "external_write_allowed": False,
        "job": "track_performance",
        "mode": "performance_refresh_preview",
        "safety_scope": "local_tracking_only",
        "status": "queued",
        "store_id": store_id,
    }
