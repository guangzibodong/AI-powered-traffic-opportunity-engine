import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None

from app.tests.test_imported_opportunities import (
    BUYING_GUIDE_GSC_CSV,
    BUYING_GUIDE_PRODUCTS,
    CTR_GSC_CSV,
    CTR_PAGES,
    CTR_PRODUCTS,
    GAP_GSC_CSV,
    GAP_PRODUCTS,
    PRODUCT_SEO_GSC_CSV,
    PRODUCT_SEO_PRODUCTS,
    RANKING_PUSH_GSC_CSV,
)


def clear_imported_task_inputs() -> None:
    from app.services.gsc_ingestion_service import clear_imported_gsc_rows
    from app.services.page_sync_service import clear_imported_pages
    from app.services.product_sync_service import clear_imported_products

    clear_imported_gsc_rows()
    clear_imported_products()
    clear_imported_pages()


class ImportedTaskServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        clear_imported_task_inputs()

    def tearDown(self) -> None:
        clear_imported_task_inputs()

    def test_imported_tasks_convert_ctr_opportunity_to_recommend_only_task_preview(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_task_service import generate_imported_tasks
        from app.services.page_sync_service import import_wordpress_pages
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", CTR_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", CTR_PRODUCTS)
        import_wordpress_pages("store-demo-outdoor-coffee", CTR_PAGES)

        payload = generate_imported_tasks("store-demo-outdoor-coffee")
        tasks = payload["tasks"]

        self.assertEqual(payload["mode"], "imported_task_previews")
        self.assertEqual(len(tasks), 1)
        self.assertEqual(tasks[0]["category"], "ctr_refresh")
        self.assertEqual(tasks[0]["automation_level"], "recommend_only")
        self.assertEqual(tasks[0]["status"], "new")
        self.assertTrue(tasks[0]["id"].startswith("imptask_"))
        self.assertTrue(tasks[0]["opportunity_id"].startswith("impopp_"))
        self.assertEqual(tasks[0]["source_opportunity"]["rule_id"], "high_impression_low_ctr")
        self.assertTrue(tasks[0]["evidence"])
        self.assertIn("Do not publish or update WordPress from this preview", tasks[0]["action_plan"]["steps"])
        self.assertNotIn("Create WordPress page draft", tasks[0]["action_plan"]["steps"])

    def test_imported_tasks_convert_collection_gap_to_safe_action_plan(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_task_service import generate_imported_tasks
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", GAP_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", GAP_PRODUCTS)

        payload = generate_imported_tasks("store-demo-outdoor-coffee")
        task = payload["tasks"][0]

        self.assertEqual(task["category"], "collection_page")
        self.assertEqual(task["automation_level"], "recommend_only")
        self.assertEqual(len(task["related_products"]), 3)
        self.assertIsNone(task["related_page"])
        self.assertIn("Review matched imported products and query cluster", task["action_plan"]["steps"])
        self.assertIn("WordPress draft is not created by this preview", task["action_plan"]["acceptance_criteria"])

    def test_imported_tasks_convert_product_seo_to_safe_product_action_plan(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_task_service import generate_imported_tasks
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", PRODUCT_SEO_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", PRODUCT_SEO_PRODUCTS)

        payload = generate_imported_tasks("store-demo-outdoor-coffee")
        task = payload["tasks"][0]

        self.assertEqual(task["category"], "product_seo")
        self.assertEqual(task["automation_level"], "recommend_only")
        self.assertEqual(task["status"], "new")
        self.assertEqual(task["source_opportunity"]["rule_id"], "product_seo")
        self.assertEqual(task["related_products"][0]["name"], "Portable Titanium Camp Mug")
        self.assertIn("Review imported product match and query cluster evidence", task["action_plan"]["steps"])
        self.assertIn("Do not update WooCommerce from this preview", task["action_plan"]["steps"])
        self.assertIn("No WooCommerce product data is changed by this preview", task["action_plan"]["acceptance_criteria"])
        self.assertEqual(payload["summary"]["by_category"]["product_seo"], 1)
        self.assertEqual(payload["summary"]["by_rule"]["product_seo"], 1)

    def test_imported_tasks_convert_buying_guide_gap_to_safe_guide_action_plan(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_task_service import generate_imported_tasks
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", BUYING_GUIDE_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", BUYING_GUIDE_PRODUCTS)

        payload = generate_imported_tasks("store-demo-outdoor-coffee")
        task = payload["tasks"][0]

        self.assertEqual(task["category"], "buying_guide")
        self.assertEqual(task["automation_level"], "recommend_only")
        self.assertEqual(task["status"], "new")
        self.assertEqual(task["source_opportunity"]["rule_id"], "buying_guide_gap")
        self.assertEqual(len(task["related_products"]), 2)
        self.assertIsNone(task["related_page"])
        self.assertIn("Review buying-guide query intent and imported product evidence", task["action_plan"]["steps"])
        self.assertIn("Do not create a WordPress draft from this preview", task["action_plan"]["steps"])
        self.assertIn("No WordPress draft or product update is created by this preview", task["action_plan"]["acceptance_criteria"])
        self.assertEqual(payload["summary"]["by_category"]["buying_guide"], 1)
        self.assertEqual(payload["summary"]["by_rule"]["buying_guide_gap"], 1)

    def test_imported_tasks_convert_ranking_push_to_safe_page_action_plan(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_task_service import generate_imported_tasks
        from app.services.page_sync_service import import_wordpress_pages
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", RANKING_PUSH_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", CTR_PRODUCTS)
        import_wordpress_pages("store-demo-outdoor-coffee", CTR_PAGES)

        payload = generate_imported_tasks("store-demo-outdoor-coffee")
        task = payload["tasks"][0]

        self.assertEqual(task["category"], "ranking_push")
        self.assertEqual(task["automation_level"], "recommend_only")
        self.assertEqual(task["status"], "new")
        self.assertEqual(task["source_opportunity"]["rule_id"], "ranking_push")
        self.assertEqual(task["related_page"]["url"], "https://example.com/camping-espresso")
        self.assertIn("Review existing page ranking evidence and SERP intent", task["action_plan"]["steps"])
        self.assertIn("Do not publish or update WordPress from this preview", task["action_plan"]["steps"])
        self.assertIn("No WordPress update is made by this preview", task["action_plan"]["acceptance_criteria"])
        self.assertEqual(payload["summary"]["by_automation_level"]["recommend_only"], 1)
        self.assertEqual(payload["summary"]["by_category"]["ranking_push"], 1)
        self.assertEqual(payload["summary"]["by_rule"]["ranking_push"], 1)
        self.assertEqual(payload["summary"]["by_status"]["new"], 1)

    def test_imported_task_detail_returns_one_preview_or_none(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.imported_task_service import generate_imported_tasks, get_imported_task
        from app.services.page_sync_service import import_wordpress_pages
        from app.services.product_sync_service import import_woocommerce_products

        import_gsc_csv("store-demo-outdoor-coffee", CTR_GSC_CSV, window="28d")
        import_woocommerce_products("store-demo-outdoor-coffee", CTR_PRODUCTS)
        import_wordpress_pages("store-demo-outdoor-coffee", CTR_PAGES)
        task = generate_imported_tasks("store-demo-outdoor-coffee")["tasks"][0]

        self.assertEqual(get_imported_task("store-demo-outdoor-coffee", task["id"])["id"], task["id"])
        self.assertIsNone(get_imported_task("store-demo-outdoor-coffee", "missing-task"))

    def test_imported_tasks_empty_state_without_opportunities(self):
        from app.services.imported_task_service import generate_imported_tasks

        payload = generate_imported_tasks("store-demo-outdoor-coffee")

        self.assertEqual(payload["tasks"], [])
        self.assertEqual(payload["summary"]["tasks"], 0)
        self.assertEqual(payload["summary"]["by_automation_level"], {})
        self.assertEqual(payload["summary"]["by_category"], {})
        self.assertEqual(payload["summary"]["by_rule"], {})
        self.assertEqual(payload["summary"]["by_status"], {})


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class ImportedTaskApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        clear_imported_task_inputs()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        clear_imported_task_inputs()

    def test_imported_tasks_endpoint_returns_task_previews_and_detail(self):
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

        response = self.client.get("/api/stores/store-demo-outdoor-coffee/imported-tasks")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        task = payload["tasks"][0]
        self.assertEqual(payload["mode"], "imported_task_previews")
        self.assertEqual(task["automation_level"], "recommend_only")

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/imported-tasks/{task['id']}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["task"]["id"], task["id"])

    def test_imported_task_detail_returns_404_for_unknown_preview(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/imported-tasks/missing-task")

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
