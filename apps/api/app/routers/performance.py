from fastapi import APIRouter, HTTPException

from app.services.audit_log_service import record_audit_log
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
    preview = build_performance_refresh_preview(store_id)
    record_audit_log(
        store_id,
        action="performance.refresh_previewed",
        target_type="performance",
        target_id="performance_refresh_preview",
        metadata={
            "external_write_allowed": preview["external_write_allowed"],
            "safety_scope": preview["safety_scope"],
            "snapshot_count": preview["snapshot_count"],
            "source": preview["source"],
            "status": preview["status"],
        },
    )
    return preview
