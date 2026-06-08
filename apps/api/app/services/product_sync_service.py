from app.integrations.woocommerce_client import WooCommerceClient


class ProductSyncService:
    def __init__(self, woocommerce_client: WooCommerceClient) -> None:
        self.woocommerce_client = woocommerce_client

    async def sync_products(self, store_id: str) -> dict:
        products = await self.woocommerce_client.list_products()
        return {"store_id": store_id, "synced_products": len(products)}

