from fastapi import APIRouter

from app.services.imported_graph_service import build_imported_signal_graph


router = APIRouter()


@router.get("/{store_id}/imported-graph")
async def get_imported_graph(store_id: str) -> dict:
    return build_imported_signal_graph(store_id)
