import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


SAMPLE_WORDPRESS_PAGES = [
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
        "status": "draft",
        "type": "post",
        "link": "https://example.com/manual-burr-grinder-guide",
        "title": {"rendered": "Manual Burr Grinder Guide"},
        "excerpt": {"rendered": "How to pick a hand grinder for travel."},
        "yoast_head_json": {
            "title": "Manual Burr Grinder Guide",
            "description": "Choose a manual grinder for travel and camping.",
            "robots": {"index": "noindex"},
        },
    },
]


class WordPressPageImportServiceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        from app.services.page_sync_service import clear_imported_pages

        clear_imported_pages()

    def tearDown(self) -> None:
        from app.services.page_sync_service import clear_imported_pages

        clear_imported_pages()

    def test_import_pages_normalizes_rows_and_sorts_indexable_pages_first(self):
        from app.services.page_sync_service import import_wordpress_pages, list_imported_pages

        summary = import_wordpress_pages("store-demo-outdoor-coffee", SAMPLE_WORDPRESS_PAGES)
        pages = list_imported_pages("store-demo-outdoor-coffee")

        self.assertEqual(summary["mode"], "wordpress_import")
        self.assertEqual(summary["imported_pages"], 2)
        self.assertEqual(summary["skipped_pages"], 0)
        self.assertEqual(pages[0]["title"], "Camping Espresso Collection")
        self.assertEqual(pages[0]["external_id"], "201")
        self.assertEqual(pages[0]["source"], "wordpress_import")
        self.assertEqual(pages[0]["page_type"], "page")
        self.assertEqual(pages[0]["status"], "publish")
        self.assertEqual(pages[0]["url"], "https://example.com/camping-espresso")
        self.assertTrue(pages[0]["indexable"])
        self.assertEqual(pages[0]["seo"]["title"], "Camping Espresso Makers")
        self.assertEqual(pages[0]["seo"]["description"], "Compare portable espresso makers for camping.")
        self.assertTrue(pages[0]["id"].startswith("wp_"))
        self.assertFalse(pages[1]["indexable"])

    def test_import_pages_is_idempotent_for_same_store_and_external_id(self):
        from app.services.page_sync_service import import_wordpress_pages, list_imported_pages

        import_wordpress_pages("store-demo-outdoor-coffee", SAMPLE_WORDPRESS_PAGES)
        second = import_wordpress_pages("store-demo-outdoor-coffee", SAMPLE_WORDPRESS_PAGES)
        pages = list_imported_pages("store-demo-outdoor-coffee")

        self.assertEqual(second["imported_pages"], 2)
        self.assertEqual(second["total_pages"], 2)
        self.assertEqual(len(pages), 2)

    async def test_sync_pages_uses_read_only_client_calls(self):
        from app.services.page_sync_service import PageSyncService, list_imported_pages

        class FakeWordPressClient:
            def __init__(self) -> None:
                self.list_pages_called = 0
                self.write_calls: list[str] = []

            async def list_pages(self) -> list[dict]:
                self.list_pages_called += 1
                return SAMPLE_WORDPRESS_PAGES

            async def create_page_draft(self, title: str, slug: str, html: str) -> None:
                self.write_calls.append("create_page_draft")

        client = FakeWordPressClient()
        summary = await PageSyncService(client).sync_pages("store-demo-outdoor-coffee")

        self.assertEqual(client.list_pages_called, 1)
        self.assertEqual(client.write_calls, [])
        self.assertEqual(summary["mode"], "wordpress_import")
        self.assertEqual(summary["synced_pages"], 2)
        self.assertEqual(len(list_imported_pages("store-demo-outdoor-coffee")), 2)


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class WordPressPageImportApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        from app.services.page_sync_service import clear_imported_pages

        clear_imported_pages()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        from app.services.page_sync_service import clear_imported_pages

        clear_imported_pages()

    def test_import_pages_endpoint_then_list_and_detail_pages(self):
        response = self.client.post(
            "/api/stores/store-demo-outdoor-coffee/pages/import-wordpress",
            json={"pages": SAMPLE_WORDPRESS_PAGES},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "wordpress_import")
        self.assertEqual(payload["summary"]["imported_pages"], 2)

        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/pages")
        self.assertEqual(list_response.status_code, 200)
        pages = list_response.json()["pages"]
        self.assertEqual(len(pages), 2)
        self.assertEqual(pages[0]["external_id"], "201")

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/pages/{pages[0]['id']}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["page"]["id"], pages[0]["id"])

    def test_import_pages_endpoint_returns_400_for_missing_pages_array(self):
        response = self.client.post(
            "/api/stores/store-demo-outdoor-coffee/pages/import-wordpress",
            json={"pages": "not-a-list"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Missing pages array")

    def test_page_detail_returns_404_for_unknown_imported_page(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/pages/missing-page")

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
