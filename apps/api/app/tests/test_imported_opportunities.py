import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


CTR_GSC_CSV = """Query,Page,Clicks,Impressions,CTR,Position
portable espresso maker camping,https://example.com/camping-espresso,24,1200,2.0%,4.8
camping portable espresso machine,https://example.com/camping-espresso,18,800,2.25%,5.2
"""

RANKING_PUSH_GSC_CSV = """Query,Page,Clicks,Impressions,CTR,Position
portable espresso maker camping,https://example.com/camping-espresso,68,1300,5.23%,8.6
"""

GAP_GSC_CSV = """Query,Page,Clicks,Impressions,CTR,Position
camping espresso gift set,https://example.com/search/camping-espresso-gift-set,12,1400,0.86%,11.2
portable camping espresso kit,https://example.com/search/camping-espresso-gift-set,9,900,1.0%,12.4
"""

CTR_PRODUCTS = [
    {
        "id": 101,
        "name": "Trail Brew Portable Espresso Maker",
        "slug": "trail-brew-portable-espresso-maker",
        "status": "publish",
        "stock_status": "instock",
        "categories": [{"name": "Camping Coffee"}],
        "attributes": [{"name": "Use case", "options": ["Camping", "Espresso"]}],
    }
]

GAP_PRODUCTS = [
    {
        "id": 201,
        "name": "Camping Espresso Gift Set",
        "slug": "camping-espresso-gift-set",
        "status": "publish",
        "stock_status": "instock",
        "categories": [{"name": "Camping Coffee"}],
        "attributes": [{"name": "Use case", "options": ["Camping", "Espresso", "Gift"]}],
    },
    {
        "id": 202,
        "name": "Portable Camping Espresso Kit",
        "slug": "portable-camping-espresso-kit",
        "status": "publish",
        "stock_status": "instock",
        "categories": [{"name": "Camping Coffee"}],
        "attributes": [{"name": "Use case", "options": ["Camping", "Espresso"]}],
    },
    {
        "id": 203,
        "name": "Camping Espresso Maker Bundle",
        "slug": "camping-espresso-maker-bundle",
        "status": "publish",
        "stock_status": "instock",
        "categories": [{"name": "Camping Coffee"}],
        "attributes": [{"name": "Use case", "options": ["Camping", "Espresso", "Gift"]}],
    },
]

PRODUCT_SEO_GSC_CSV = """Query,Page,Clicks,Impressions,CTR,Position
portable titanium camp mug,https://example.com/search/portable-titanium-camp-mug,22,1100,2.0%,8.5
"""

PRODUCT_SEO_PRODUCTS = [
    {
        "id": 401,
        "name": "Portable Titanium Camp Mug",
        "slug": "portable-titanium-camp-mug",
        "status": "publish",
        "stock_status": "instock",
        "categories": [{"name": "Camping Mugs"}],
        "attributes": [{"name": "Material", "options": ["Titanium", "Camping"]}],
    }
]

CTR_PAGES = [
    {
        "id": 301,
        "slug": "camping-espresso",
        "status": "publish",
        "type": "page",
        "link": "https://example.com/camping-espresso",
        "title": {"rendered": "Camping Espresso Collection"},
        "excerpt": {"rendered": "Portable espresso makers for camp coffee."},
        "yoast_head_json": {
            "title": "Camping Espresso Makers",
            "description": "Compare portable espresso makers for camping.",
            "robots": {"index": "index"},
        },
    }
]


class ImportedOpportunityServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows
        from app.services.page_sync_service import clear_imported_pages
        from app.services.product_sync_service import clear_imported_products

        clear_imported_gsc_rows()
        clear_imported_products()
        clear_imported_pages()

    def tearDown(self) -> None:
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows
        from app.services.page_sync_service import clear_imported_pages
        from app.services.product_sync_service import clear_imported_products

        clear_imported_gsc_rows()
        clear_imported_products()
        clear_imported_pages()

    def test_imported_opportunities_generate_ctr_refresh_from_existing_low_ctr_page(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_opportunity_service import generate_imported_opportunities
        from app.services.page_sync_service import import_wordpress_pages
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", CTR_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", CTR_PRODUCTS)
        import_wordpress_pages("store-demo-outdoor-coffee", CTR_PAGES)

        payload = generate_imported_opportunities("store-demo-outdoor-coffee")
        opportunities = payload["opportunities"]

        self.assertEqual(payload["mode"], "imported_opportunities")
        self.assertEqual(len(opportunities), 1)
        self.assertEqual(opportunities[0]["rule_id"], "high_impression_low_ctr")
        self.assertEqual(opportunities[0]["recommended_task_type"], "ctr_refresh")
        self.assertEqual(opportunities[0]["status"], "new")
        self.assertEqual(opportunities[0]["related_page"]["url"], "https://example.com/camping-espresso")
        self.assertEqual(opportunities[0]["source_cluster"]["primary_query"], "portable espresso maker camping")
        self.assertTrue(opportunities[0]["dedupe_key"].startswith("store-demo-outdoor-coffee:imported:high_impression_low_ctr:"))
        self.assertTrue(any(item["type"] == "gsc_ctr" for item in opportunities[0]["evidence"]))

    def test_imported_opportunities_generate_ranking_push_from_existing_strong_ctr_page(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_opportunity_service import generate_imported_opportunities
        from app.services.page_sync_service import import_wordpress_pages
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", RANKING_PUSH_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", CTR_PRODUCTS)
        import_wordpress_pages("store-demo-outdoor-coffee", CTR_PAGES)

        payload = generate_imported_opportunities("store-demo-outdoor-coffee")
        opportunities = payload["opportunities"]

        self.assertEqual(len(opportunities), 1)
        self.assertEqual(opportunities[0]["rule_id"], "ranking_push")
        self.assertEqual(opportunities[0]["opportunity_type"], "ranking_push")
        self.assertEqual(opportunities[0]["recommended_task_type"], "ranking_push")
        self.assertEqual(opportunities[0]["status"], "new")
        self.assertEqual(opportunities[0]["related_page"]["url"], "https://example.com/camping-espresso")
        self.assertTrue(opportunities[0]["dedupe_key"].startswith("store-demo-outdoor-coffee:imported:ranking_push:"))
        self.assertTrue(any(item["type"] == "ranking_position" for item in opportunities[0]["evidence"]))
        self.assertEqual(payload["summary"]["by_rule"]["ranking_push"], 1)
        self.assertEqual(payload["summary"]["by_status"]["new"], 1)
        self.assertEqual(payload["summary"]["by_task_type"]["ranking_push"], 1)

    def test_imported_opportunities_generate_collection_gap_without_existing_page(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_opportunity_service import generate_imported_opportunities
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", GAP_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", GAP_PRODUCTS)

        payload = generate_imported_opportunities("store-demo-outdoor-coffee")
        opportunities = payload["opportunities"]

        self.assertEqual(len(opportunities), 1)
        self.assertEqual(opportunities[0]["rule_id"], "collection_page_gap")
        self.assertEqual(opportunities[0]["recommended_task_type"], "collection_page")
        self.assertEqual(len(opportunities[0]["related_products"]), 3)
        self.assertIsNone(opportunities[0]["related_page"])
        self.assertTrue(any(item["type"] == "page_gap" for item in opportunities[0]["evidence"]))

    def test_imported_opportunities_generate_product_seo_for_single_matched_product_without_page(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_opportunity_service import generate_imported_opportunities
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", PRODUCT_SEO_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", PRODUCT_SEO_PRODUCTS)

        payload = generate_imported_opportunities("store-demo-outdoor-coffee")
        opportunities = payload["opportunities"]

        self.assertEqual(len(opportunities), 1)
        self.assertEqual(opportunities[0]["rule_id"], "product_seo")
        self.assertEqual(opportunities[0]["opportunity_type"], "product_seo")
        self.assertEqual(opportunities[0]["recommended_task_type"], "product_seo")
        self.assertEqual(opportunities[0]["status"], "new")
        self.assertIsNone(opportunities[0]["related_page"])
        self.assertEqual(opportunities[0]["related_products"][0]["name"], "Portable Titanium Camp Mug")
        self.assertTrue(opportunities[0]["dedupe_key"].startswith("store-demo-outdoor-coffee:imported:product_seo:"))
        self.assertTrue(any(item["type"] == "product_fit" for item in opportunities[0]["evidence"]))
        self.assertTrue(any(item["type"] == "page_gap" for item in opportunities[0]["evidence"]))
        self.assertEqual(payload["summary"]["by_rule"]["product_seo"], 1)
        self.assertEqual(payload["summary"]["by_task_type"]["product_seo"], 1)

    def test_imported_opportunities_return_empty_state_without_graph_inputs(self):
        from app.services.imported_opportunity_service import generate_imported_opportunities

        payload = generate_imported_opportunities("store-demo-outdoor-coffee")

        self.assertEqual(payload["opportunities"], [])
        self.assertEqual(payload["summary"]["opportunities"], 0)
        self.assertEqual(payload["summary"]["by_rule"], {})
        self.assertEqual(payload["summary"]["by_status"], {})
        self.assertEqual(payload["summary"]["by_task_type"], {})

    def test_imported_opportunity_detail_returns_one_preview_or_none(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_opportunity_service import generate_imported_opportunities, get_imported_opportunity
        from app.services.page_sync_service import import_wordpress_pages
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", CTR_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", CTR_PRODUCTS)
        import_wordpress_pages("store-demo-outdoor-coffee", CTR_PAGES)
        opportunity = generate_imported_opportunities("store-demo-outdoor-coffee")["opportunities"][0]

        self.assertEqual(get_imported_opportunity("store-demo-outdoor-coffee", opportunity["id"])["id"], opportunity["id"])
        self.assertIsNone(get_imported_opportunity("store-demo-outdoor-coffee", "missing-opportunity"))


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class ImportedOpportunityApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows
        from app.services.page_sync_service import clear_imported_pages
        from app.services.product_sync_service import clear_imported_products

        clear_imported_gsc_rows()
        clear_imported_products()
        clear_imported_pages()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows
        from app.services.page_sync_service import clear_imported_pages
        from app.services.product_sync_service import clear_imported_products

        clear_imported_gsc_rows()
        clear_imported_products()
        clear_imported_pages()

    def test_imported_opportunities_endpoint_returns_generated_previews(self):
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/queries/import-csv",
            json={"csv_text": CTR_GSC_CSV, "window": "28d"},
        )
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/products/import-woocommerce",
            json={"products": CTR_PRODUCTS},
        )
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/pages/import-wordpress",
            json={"pages": CTR_PAGES},
        )

        response = self.client.get("/api/stores/store-demo-outdoor-coffee/imported-opportunities")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "imported_opportunities")
        self.assertEqual(payload["opportunities"][0]["rule_id"], "high_impression_low_ctr")

    def test_imported_opportunity_detail_endpoint_returns_preview_and_404(self):
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/queries/import-csv",
            json={"csv_text": CTR_GSC_CSV, "window": "28d"},
        )
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/products/import-woocommerce",
            json={"products": CTR_PRODUCTS},
        )
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/pages/import-wordpress",
            json={"pages": CTR_PAGES},
        )
        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/imported-opportunities")
        opportunity_id = list_response.json()["opportunities"][0]["id"]

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/imported-opportunities/{opportunity_id}")
        missing_response = self.client.get("/api/stores/store-demo-outdoor-coffee/imported-opportunities/missing-opportunity")

        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["mode"], "imported_opportunities")
        self.assertEqual(detail_response.json()["opportunity"]["id"], opportunity_id)
        self.assertEqual(missing_response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
