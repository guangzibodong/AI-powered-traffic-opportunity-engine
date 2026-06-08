class QueryClassifierService:
    def classify(self, query: str) -> dict:
        normalized = query.strip().lower()
        if any(token in normalized for token in ["vs", "compare", "difference"]):
            intent = "comparison"
            recommended_asset_type = "comparison_page"
        elif any(token in normalized for token in ["best", "top", "gift", "under"]):
            intent = "buying_guide"
            recommended_asset_type = "buying_guide"
        elif any(token in normalized for token in ["how", "can", "what", "is", "does"]):
            intent = "faq_informational"
            recommended_asset_type = "faq_page"
        else:
            intent = "collection_commercial"
            recommended_asset_type = "collection_page"

        return {
            "query": query,
            "intent": intent,
            "funnel_stage": "consideration",
            "modifiers": [],
            "product_attributes": normalized.split(),
            "recommended_asset_type": recommended_asset_type,
            "confidence": 0.6,
        }

