import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


GRAPH_GSC_CSV = """Query,Page,Clicks,Impressions,CTR,Position
portable espresso maker camping,https://example.com/camping-espresso,24,1200,2.0%,4.8
camping portable espresso machine,https://example.com/camping-espresso,18,800,2.25%,5.2
manual coffee grinder camping,https://example.com/manual-burr-grinder-guide,8,640,1.25%,9.4
camping manual burr grinder,https://example.com/manual-burr-grinder-guide,7,360,1.94%,10.1
"""

GRAPH_PRODUCTS = [
    {
        "id": 101,
        "name": "Trail Brew Portable Espresso Maker",
        "slug": "trail-brew-portable-espresso-maker",
        "sku": "TB-ESP-01",
        "status": "publish",
        "permalink": "https://example.com/product/trail-brew-portable-espresso-maker",
        "price": "89.00",
        "stock_status": "instock",
        "categories": [{"name": "Camping Coffee"}],
        "attributes": [{"name": "Use case", "options": ["Camping", "Travel", "Espresso"]}],
        "images": [{"src": "https://example.com/images/trail-brew.jpg"}],
    },
    {
        "id": 102,
        "name": "Manual Burr Grinder Camp Kit",
        "slug": "manual-burr-grinder-camp-kit",
        "sku": "TB-GRIND-02",
        "status": "publish",
        "permalink": "https://example.com/product/manual-burr-grinder-camp-kit",
        "price": "49.50",
        "stock_status": "instock",
        "categories": [{"name": "Coffee Grinders"}],
        "attributes": [{"name": "Use case", "options": ["Camping", "Manual"]}],
        "images": [{"src": "https://example.com/images/grinder.jpg"}],
    },
    {
        "id": 103,
        "name": "Ceramic Home Coffee Mug",
        "slug": "ceramic-home-coffee-mug",
        "status": "publish",
        "stock_status": "instock",
        "categories": [{"name": "Kitchen"}],
        "attributes": [],
        "images": [],
    },
]

GRAPH_PAGES = [
    {
        "id": 201,
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
    },
    {
        "id": 202,
        "slug": "manual-burr-grinder-guide",
        "status": "publish",
        "type": "post",
        "link": "https://example.com/manual-burr-grinder-guide",
        "title": {"rendered": "Manual Burr Grinder Guide"},
        "excerpt": {"rendered": "How to pick a hand grinder for travel."},
        "yoast_head_json": {
            "title": "Manual Burr Grinder Guide",
            "description": "Choose a manual grinder for travel and camping.",
            "robots": {"index": "index"},
        },
    },
]


def import_graph_fixtures() -> None:
    from app.services.gsc_ingestion_service import import_gsc_csv
    from app.services.page_sync_service import import_wordpress_pages
    from app.services.product_sync_service import import_woocommerce_products

    import_gsc_csv("store-demo-outdoor-coffee", GRAPH_GSC_CSV, window="28d")
    import_woocommerce_products("store-demo-outdoor-coffee", GRAPH_PRODUCTS)
    import_wordpress_pages("store-demo-outdoor-coffee", GRAPH_PAGES)


class ImportedSignalGraphServiceTests(unittest.TestCase):
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

    def test_imported_graph_links_clusters_to_products_and_pages(self):
        from app.services.imported_graph_service import build_imported_signal_graph

        import_graph_fixtures()
        graph = build_imported_signal_graph("store-demo-outdoor-coffee")

        self.assertEqual(graph["mode"], "imported_graph")
        self.assertEqual(graph["summary"]["query_clusters"], 2)
        self.assertEqual(graph["summary"]["product_matches"], 2)
        self.assertEqual(graph["summary"]["page_matches"], 2)

        espresso_cluster = graph["query_clusters"][0]
        self.assertEqual(espresso_cluster["primary_query"], "portable espresso maker camping")
        self.assertEqual(espresso_cluster["matched_products"][0]["name"], "Trail Brew Portable Espresso Maker")
        self.assertEqual(espresso_cluster["matched_products"][0]["match_terms"], ["camping", "espresso", "maker", "portable"])
        self.assertEqual(espresso_cluster["best_existing_page"]["url"], "https://example.com/camping-espresso")
        self.assertEqual(espresso_cluster["matched_pages"][0]["match_type"], "gsc_top_page")

        grinder_cluster = graph["query_clusters"][1]
        self.assertEqual(grinder_cluster["primary_query"], "manual coffee grinder camping")
        self.assertEqual(grinder_cluster["matched_products"][0]["name"], "Manual Burr Grinder Camp Kit")
        self.assertEqual(grinder_cluster["best_existing_page"]["url"], "https://example.com/manual-burr-grinder-guide")

    def test_imported_graph_returns_empty_state_without_imports(self):
        from app.services.imported_graph_service import build_imported_signal_graph

        graph = build_imported_signal_graph("store-demo-outdoor-coffee")

        self.assertEqual(graph["mode"], "imported_graph")
        self.assertEqual(graph["query_clusters"], [])
        self.assertEqual(graph["summary"]["query_clusters"], 0)
        self.assertEqual(graph["summary"]["product_matches"], 0)
        self.assertEqual(graph["summary"]["page_matches"], 0)


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class ImportedSignalGraphApiTests(unittest.TestCase):
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

    def test_imported_graph_endpoint_returns_linked_imported_entities(self):
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/queries/import-csv",
            json={"csv_text": GRAPH_GSC_CSV, "window": "28d"},
        )
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/products/import-woocommerce",
            json={"products": GRAPH_PRODUCTS},
        )
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/pages/import-wordpress",
            json={"pages": GRAPH_PAGES},
        )

        response = self.client.get("/api/stores/store-demo-outdoor-coffee/imported-graph")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "imported_graph")
        self.assertEqual(payload["summary"]["query_clusters"], 2)
        self.assertEqual(payload["query_clusters"][0]["matched_products"][0]["name"], "Trail Brew Portable Espresso Maker")
        self.assertEqual(payload["query_clusters"][0]["best_existing_page"]["url"], "https://example.com/camping-espresso")


if __name__ == "__main__":
    unittest.main()
