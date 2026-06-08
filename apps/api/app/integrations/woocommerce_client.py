class WooCommerceClient:
    def __init__(
        self,
        base_url: str | None = None,
        consumer_key: str | None = None,
        consumer_secret: str | None = None,
    ) -> None:
        self.base_url = base_url
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret

    async def list_products(self) -> list[dict]:
        return []

    async def list_categories(self) -> list[dict]:
        return []

