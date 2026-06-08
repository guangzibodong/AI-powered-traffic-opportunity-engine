from fastapi import APIRouter, HTTPException

from app.services.product_sync_service import (
    get_imported_product,
    import_woocommerce_products,
    list_imported_products,
)


router = APIRouter()


@router.get("/{store_id}/products")
async def list_products(store_id: str) -> dict:
    return {"mode": "woocommerce_import", "store_id": store_id, "products": list_imported_products(store_id)}


@router.post("/{store_id}/products/import-woocommerce")
async def import_products_woocommerce(store_id: str, payload: dict) -> dict:
    products = payload.get("products")
    if not isinstance(products, list):
        raise HTTPException(status_code=400, detail="Missing products array")

    summary = import_woocommerce_products(store_id, products)
    return {"mode": "woocommerce_import", "store_id": store_id, "summary": summary}


@router.get("/{store_id}/products/{product_id}")
async def get_product(store_id: str, product_id: str) -> dict:
    product = get_imported_product(store_id, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"mode": "woocommerce_import", "store_id": store_id, "product": product}


@router.get("/{store_id}/products/{product_id}/opportunities")
async def get_product_opportunities(store_id: str, product_id: str) -> dict:
    return {"store_id": store_id, "product_id": product_id, "opportunities": []}
