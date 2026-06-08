from fastapi import APIRouter, HTTPException

from app.services.gsc_ingestion_service import (
    get_imported_gsc_row,
    import_gsc_csv,
    list_imported_gsc_rows,
    list_imported_query_clusters,
)


router = APIRouter()


@router.get("/{store_id}/queries")
async def list_queries(store_id: str) -> dict:
    return {"mode": "csv_import", "store_id": store_id, "queries": list_imported_gsc_rows(store_id)}


@router.post("/{store_id}/queries/import-csv")
async def import_queries_csv(store_id: str, payload: dict) -> dict:
    csv_text = payload.get("csv_text")
    if not isinstance(csv_text, str) or not csv_text.strip():
        raise HTTPException(status_code=400, detail="Missing csv_text")

    window = payload.get("window", "28d")
    if not isinstance(window, str) or not window.strip():
        raise HTTPException(status_code=400, detail="Invalid GSC window")

    try:
        summary = import_gsc_csv(store_id, csv_text, window=window.strip())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    return {"mode": "csv_import", "store_id": store_id, "summary": summary}


@router.get("/{store_id}/queries/{query_id}")
async def get_query(store_id: str, query_id: str) -> dict:
    row = get_imported_gsc_row(store_id, query_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Query not found")
    return {"mode": "csv_import", "store_id": store_id, "query": row}


@router.get("/{store_id}/query-clusters")
async def list_query_clusters(store_id: str) -> dict:
    return {
        "mode": "csv_import",
        "store_id": store_id,
        "query_clusters": list_imported_query_clusters(store_id),
    }
