from fastapi import APIRouter, HTTPException

from app.services.page_sync_service import (
    get_imported_page,
    import_wordpress_pages,
    list_imported_pages,
)


router = APIRouter()


@router.get("/{store_id}/pages")
async def list_pages(store_id: str) -> dict:
    return {"mode": "wordpress_import", "store_id": store_id, "pages": list_imported_pages(store_id)}


@router.post("/{store_id}/pages/import-wordpress")
async def import_pages_wordpress(store_id: str, payload: dict) -> dict:
    pages = payload.get("pages")
    if not isinstance(pages, list):
        raise HTTPException(status_code=400, detail="Missing pages array")

    summary = import_wordpress_pages(store_id, pages)
    return {"mode": "wordpress_import", "store_id": store_id, "summary": summary}


@router.get("/{store_id}/pages/{page_id}")
async def get_page(store_id: str, page_id: str) -> dict:
    page = get_imported_page(store_id, page_id)
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    return {"mode": "wordpress_import", "store_id": store_id, "page": page}
