class AssetGenerationService:
    def build_collection_page_draft(self, task: dict, products: list[dict]) -> dict:
        slug = task["title"].lower().replace(" ", "-").replace(":", "")
        return {
            "asset_type": "collection_page",
            "title": task["title"],
            "slug": slug,
            "meta_title": task["title"][:60],
            "meta_description": "Compare relevant products and choose the right option for your store.",
            "sections": [
                {"type": "intro", "heading": task["title"], "body": ""},
                {"type": "product_grid", "product_ids": [product["id"] for product in products[:24]]},
                {"type": "faq", "items": []},
            ],
            "schema_json": {},
            "internal_links": [],
        }

