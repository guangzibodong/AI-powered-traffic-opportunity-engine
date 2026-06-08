from fastapi import APIRouter


router = APIRouter()


@router.get("/{store_id}/opportunities")
async def list_opportunities(store_id: str) -> dict:
    return {"store_id": store_id, "opportunities": []}


@router.get("/{store_id}/opportunities/{opportunity_id}")
async def get_opportunity(store_id: str, opportunity_id: str) -> dict:
    return {"store_id": store_id, "id": opportunity_id}


@router.post("/{store_id}/opportunities/{opportunity_id}/approve")
async def approve_opportunity(store_id: str, opportunity_id: str) -> dict:
    return {"store_id": store_id, "id": opportunity_id, "status": "approved"}


@router.post("/{store_id}/opportunities/{opportunity_id}/reject")
async def reject_opportunity(store_id: str, opportunity_id: str) -> dict:
    return {"store_id": store_id, "id": opportunity_id, "status": "rejected"}

