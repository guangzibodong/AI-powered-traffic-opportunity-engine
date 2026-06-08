from fastapi import APIRouter, HTTPException

from app.services.audit_log_service import get_audit_log, list_audit_logs


router = APIRouter()


@router.get("/{store_id}/audit-logs")
async def get_audit_logs(store_id: str) -> dict:
    return list_audit_logs(store_id)


@router.get("/{store_id}/audit-logs/{audit_log_id}")
async def get_audit_log_detail(store_id: str, audit_log_id: str) -> dict:
    entry = get_audit_log(store_id, audit_log_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return {"audit_log": entry, "mode": "audit_logs", "store_id": store_id}
