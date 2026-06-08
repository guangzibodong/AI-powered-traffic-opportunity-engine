from fastapi import APIRouter, HTTPException

from app.services.demo_planning_service import build_demo_planning_payload, get_demo_opportunity
from app.services.imported_opportunity_service import generate_imported_opportunities


router = APIRouter()


@router.get("/{store_id}/opportunities")
async def list_opportunities(store_id: str) -> dict:
    payload = build_demo_planning_payload(store_id)
    return {
        "store_id": store_id,
        "mode": payload["mode"],
        "planning_run": payload["planning_run"],
        "opportunities": payload["opportunities"],
    }


@router.get("/{store_id}/imported-opportunities")
async def list_imported_opportunities(store_id: str) -> dict:
    return generate_imported_opportunities(store_id)


@router.get("/{store_id}/opportunities/{opportunity_id}")
async def get_opportunity(store_id: str, opportunity_id: str) -> dict:
    opportunity = get_demo_opportunity(store_id, opportunity_id)
    if opportunity is None:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return {"store_id": store_id, "opportunity": opportunity}


@router.post("/{store_id}/opportunities/{opportunity_id}/approve")
async def approve_opportunity(store_id: str, opportunity_id: str) -> dict:
    return {"store_id": store_id, "id": opportunity_id, "status": "approved"}


@router.post("/{store_id}/opportunities/{opportunity_id}/reject")
async def reject_opportunity(store_id: str, opportunity_id: str) -> dict:
    return {"store_id": store_id, "id": opportunity_id, "status": "rejected"}
