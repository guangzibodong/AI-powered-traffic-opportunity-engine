class SyncJobs:
    async def sync_store_project(self, store_id: str) -> dict:
        return {"store_id": store_id, "steps": ["products", "pages", "gsc"], "status": "queued"}

    async def build_product_query_graph(self, store_id: str) -> dict:
        return {"store_id": store_id, "status": "queued"}

    async def generate_opportunities(self, store_id: str) -> dict:
        return {"store_id": store_id, "status": "queued"}

    async def generate_tasks(self, store_id: str) -> dict:
        return {"store_id": store_id, "status": "queued"}

    async def track_performance(self, store_id: str) -> dict:
        return {"store_id": store_id, "status": "queued"}

