class GSCClient:
    def __init__(self, access_token: str | None = None) -> None:
        self.access_token = access_token

    async def query_search_analytics(self, site_url: str) -> list[dict]:
        return []

