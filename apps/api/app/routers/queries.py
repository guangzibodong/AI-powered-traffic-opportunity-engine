from fastapi import APIRouter


router = APIRouter()


@router.get("/{store_id}/queries")
async def list_queries(store_id: str) -> dict:
    return {"store_id": store_id, "queries": []}


@router.get("/{store_id}/queries/{query_id}")
async def get_query(store_id: str, query_id: str) -> dict:
    return {"store_id": store_id, "id": query_id}


@router.get("/{store_id}/query-clusters")
async def list_query_clusters(store_id: str) -> dict:
    return {"store_id": store_id, "query_clusters": []}

