from app.integrations.gsc_client import GSCClient


class GSCIngestionService:
    def __init__(self, gsc_client: GSCClient) -> None:
        self.gsc_client = gsc_client

    async def sync_metrics(self, store_id: str, site_url: str) -> dict:
        rows = await self.gsc_client.query_search_analytics(site_url=site_url)
        return {"store_id": store_id, "synced_rows": len(rows)}

