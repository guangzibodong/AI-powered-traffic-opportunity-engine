from typing import Any

from fastapi import APIRouter, Body, HTTPException

from app.services.asset_workspace_service import (
    AssetDraftUpdateError,
    create_asset_draft_from_task,
    get_asset_draft,
    list_asset_drafts,
    update_asset_draft,
)
from app.services.demo_planning_service import get_demo_task


router = APIRouter()


@router.get("/{store_id}/assets")
async def list_assets(store_id: str) -> dict:
    return list_asset_drafts(store_id)


@router.post("/{store_id}/assets/from-task/{task_id}", status_code=201)
async def create_asset_from_task(store_id: str, task_id: str) -> dict:
    task = get_demo_task(store_id, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] != "approved":
        raise HTTPException(status_code=403, detail="Task must be approved before creating a local asset draft")

    asset = create_asset_draft_from_task(store_id, task)
    return {"mode": "asset_draft_workspace", "store_id": store_id, "asset": asset}


@router.get("/{store_id}/assets/{asset_id}")
async def get_asset(store_id: str, asset_id: str) -> dict:
    asset = get_asset_draft(store_id, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset draft not found")
    return {"mode": "asset_draft_workspace", "store_id": store_id, "asset": asset}


@router.patch("/{store_id}/assets/{asset_id}")
async def update_asset(store_id: str, asset_id: str, payload: Any = Body(...)) -> dict:
    try:
        asset = update_asset_draft(store_id, asset_id, payload)
    except AssetDraftUpdateError as error:
        raise HTTPException(status_code=error.status_code, detail=error.detail) from error
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset draft not found")
    return {"mode": "asset_draft_workspace", "store_id": store_id, "asset": asset}


@router.post("/{store_id}/assets/{asset_id}/publish-wordpress-draft")
async def publish_wordpress_draft(store_id: str, asset_id: str) -> dict:
    raise HTTPException(
        status_code=403,
        detail="WordPress draft creation is future-gated until asset QA and boundary approval are complete",
    )
