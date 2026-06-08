import hashlib
from typing import Any

from app.integrations.woocommerce_client import WooCommerceClient


_imported_products_by_store: dict[str, dict[str, dict[str, Any]]] = {}


class ProductSyncService:
    def __init__(self, woocommerce_client: WooCommerceClient) -> None:
        self.woocommerce_client = woocommerce_client

    async def sync_products(self, store_id: str) -> dict:
        products = await self.woocommerce_client.list_products()
        summary = import_woocommerce_products(store_id, products)
        return {**summary, "synced_products": summary["imported_products"]}


def clear_imported_products() -> None:
    _imported_products_by_store.clear()


def import_woocommerce_products(store_id: str, products: list[dict[str, Any]]) -> dict[str, Any]:
    products_for_store = _imported_products_by_store.setdefault(store_id, {})
    imported_products = 0
    skipped_products = 0

    for raw_product in products:
        try:
            normalized = _normalize_woocommerce_product(store_id, raw_product)
        except (TypeError, ValueError):
            skipped_products += 1
            continue

        products_for_store[normalized["id"]] = normalized
        imported_products += 1

    return {
        "imported_products": imported_products,
        "mode": "woocommerce_import",
        "skipped_products": skipped_products,
        "store_id": store_id,
        "total_products": len(products_for_store),
    }


def list_imported_products(store_id: str) -> list[dict[str, Any]]:
    products = list(_imported_products_by_store.get(store_id, {}).values())
    return sorted(
        products,
        key=lambda product: (
            not product["in_stock"],
            product["status"] != "publish",
            product["name"],
            product["external_id"],
        ),
    )


def get_imported_product(store_id: str, product_id: str) -> dict[str, Any] | None:
    return _imported_products_by_store.get(store_id, {}).get(product_id)


def _normalize_woocommerce_product(store_id: str, raw_product: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw_product, dict):
        raise TypeError("WooCommerce product must be an object")

    external_id = _read_external_id(raw_product)
    name = _read_string(raw_product.get("name"))
    if not external_id or not name:
        raise ValueError("WooCommerce product requires id and name")

    stock_status = _read_string(raw_product.get("stock_status")) or "unknown"
    return {
        "attributes": _normalize_attributes(raw_product.get("attributes")),
        "categories": _normalize_categories(raw_product.get("categories")),
        "currency": _read_string(raw_product.get("currency")) or None,
        "external_id": external_id,
        "id": _build_product_id(store_id, external_id),
        "images": _normalize_images(raw_product.get("images")),
        "in_stock": stock_status == "instock",
        "name": name,
        "permalink": _read_string(raw_product.get("permalink")) or None,
        "price": _read_optional_float(raw_product.get("price")),
        "regular_price": _read_optional_float(raw_product.get("regular_price")),
        "short_description": _read_string(raw_product.get("short_description")),
        "sku": _read_string(raw_product.get("sku")) or None,
        "slug": _read_string(raw_product.get("slug")) or None,
        "source": "woocommerce_import",
        "status": _read_string(raw_product.get("status")) or "unknown",
        "stock_status": stock_status,
        "store_id": store_id,
    }


def _read_external_id(raw_product: dict[str, Any]) -> str:
    raw_id = raw_product.get("id")
    if raw_id is None:
        raw_id = raw_product.get("external_id")
    return _read_string(raw_id)


def _read_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _read_optional_float(value: Any) -> float | None:
    raw_value = _read_string(value).replace(",", "")
    if not raw_value:
        return None
    return float(raw_value)


def _normalize_categories(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    categories = []
    for item in value:
        if isinstance(item, dict):
            category = _read_string(item.get("name"))
        else:
            category = _read_string(item)
        if category:
            categories.append(category)
    return categories


def _normalize_attributes(value: Any) -> dict[str, list[str]]:
    if not isinstance(value, list):
        return {}

    attributes: dict[str, list[str]] = {}
    for item in value:
        if not isinstance(item, dict):
            continue
        name = _read_string(item.get("name"))
        options = item.get("options", [])
        if not name:
            continue
        if not isinstance(options, list):
            options = [options]
        normalized_options = [_read_string(option) for option in options if _read_string(option)]
        attributes[name] = normalized_options
    return attributes


def _normalize_images(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    images = []
    for item in value:
        if isinstance(item, dict):
            image = _read_string(item.get("src"))
        else:
            image = _read_string(item)
        if image:
            images.append(image)
    return images


def _build_product_id(store_id: str, external_id: str) -> str:
    key = "|".join([store_id, external_id])
    return f"wc_{hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]}"
