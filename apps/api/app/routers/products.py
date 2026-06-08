from fastapi import APIRouter


router = APIRouter()


@router.get("/{store_id}/products")
async def list_products(store_id: str) -> dict:
    return {"store_id": store_id, "products": []}


@router.get("/{store_id}/products/{product_id}")
async def get_product(store_id: str, product_id: str) -> dict:
    return {"store_id": store_id, "id": product_id}


@router.get("/{store_id}/products/{product_id}/opportunities")
async def get_product_opportunities(store_id: str, product_id: str) -> dict:
    return {"store_id": store_id, "product_id": product_id, "opportunities": []}

