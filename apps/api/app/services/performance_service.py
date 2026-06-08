class PerformanceService:
    def summarize_asset_delta(self, before: dict, after: dict) -> dict:
        return {
            "impressions_delta": after.get("impressions", 0) - before.get("impressions", 0),
            "clicks_delta": after.get("clicks", 0) - before.get("clicks", 0),
            "orders_delta": after.get("orders", 0) - before.get("orders", 0),
            "revenue_delta": after.get("revenue", 0) - before.get("revenue", 0),
        }

