from fastapi import APIRouter, HTTPException

from app.services.integration_status_service import (
    enqueue_sync_run,
    get_sync_run,
    list_integrations as list_store_integrations,
    list_sync_runs,
    record_integration_connection,
)


router = APIRouter()


@router.post("/{store_id}/integrations/gsc/connect")
async def connect_gsc(store_id: str, payload: dict) -> dict:
    integration = record_integration_connection(store_id, "gsc", payload)
    return {"integration": integration, "integration_key": "gsc", "status": integration["status"], "store_id": store_id}


@router.post("/{store_id}/integrations/wordpress/connect")
async def connect_wordpress(store_id: str, payload: dict) -> dict:
    integration = record_integration_connection(store_id, "wordpress", payload)
    return {"integration": integration, "integration_key": "wordpress", "status": integration["status"], "store_id": store_id}


@router.post("/{store_id}/integrations/woocommerce/connect")
async def connect_woocommerce(store_id: str, payload: dict) -> dict:
    integration = record_integration_connection(store_id, "woocommerce", payload)
    return {"integration": integration, "integration_key": "woocommerce", "status": integration["status"], "store_id": store_id}


@router.get("/{store_id}/integrations")
async def list_integrations(store_id: str) -> dict:
    return list_store_integrations(store_id)


@router.post("/{store_id}/sync")
async def enqueue_sync(store_id: str, payload: dict | None = None) -> dict:
    requested_by = (payload or {}).get("requested_by", "manual")
    run = enqueue_sync_run(store_id, requested_by=requested_by if isinstance(requested_by, str) else "manual")
    return {"job": "sync_store_project", "status": run["status"], "store_id": store_id, "sync_run": run}


@router.get("/{store_id}/sync-runs")
async def get_sync_runs(store_id: str) -> dict:
    return list_sync_runs(store_id)


@router.get("/{store_id}/sync-runs/{sync_run_id}")
async def get_sync_run_detail(store_id: str, sync_run_id: str) -> dict:
    run = get_sync_run(store_id, sync_run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Sync run not found")
    return {"mode": "sync_run_tracking", "store_id": store_id, "sync_run": run}
