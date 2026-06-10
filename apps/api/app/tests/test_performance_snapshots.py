import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


PERFORMANCE_GSC_CSV = """Query,Page,Clicks,Impressions,CTR,Position
portable espresso maker camping,https://example.com/camping-espresso,24,1200,2.0%,4.8
manual coffee grinder camping,https://example.com/manual-grinders,8,640,1.25%,9.4
"""


class PerformanceSnapshotServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows

        clear_imported_gsc_rows()

    def tearDown(self) -> None:
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows

        clear_imported_gsc_rows()

    def test_store_performance_snapshots_aggregate_imported_gsc_rows(self):
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.performance_snapshot_service import list_store_performance_snapshots

        import_gsc_csv("store-demo-outdoor-coffee", PERFORMANCE_GSC_CSV, window="28d")
        payload = list_store_performance_snapshots("store-demo-outdoor-coffee")

        self.assertEqual(payload["mode"], "performance_snapshots")
        self.assertEqual(payload["store_id"], "store-demo-outdoor-coffee")
        self.assertEqual(payload["safety_scope"], "local_imported_gsc_only")
        self.assertFalse(payload["external_write_allowed"])
        self.assertIn("real_gsc_oauth", payload["blocked_capabilities"])
        self.assertIn("wordpress_writes", payload["blocked_capabilities"])
        self.assertIn("woocommerce_writes", payload["blocked_capabilities"])
        self.assertEqual(payload["summary"]["snapshot_count"], 1)
        self.assertEqual(payload["summary"]["clicks"], 32)
        self.assertEqual(payload["summary"]["impressions"], 1840)
        self.assertAlmostEqual(payload["summary"]["ctr"], 0.0174)
        self.assertAlmostEqual(payload["summary"]["position"], 6.4)

        snapshot = payload["snapshots"][0]
        self.assertTrue(snapshot["id"].startswith("perf_"))
        self.assertEqual(snapshot["source"], "imported_gsc_csv")
        self.assertEqual(snapshot["window"], "28d")
        self.assertEqual(snapshot["clicks"], 32)
        self.assertEqual(snapshot["impressions"], 1840)
        self.assertAlmostEqual(snapshot["ctr"], 0.0174)
        self.assertAlmostEqual(snapshot["position"], 6.4)
        self.assertEqual(snapshot["query_count"], 2)
        self.assertEqual(snapshot["page_count"], 2)
        self.assertEqual(len(snapshot["row_ids"]), 2)
        self.assertFalse(snapshot["external_write_allowed"])

    def test_store_performance_snapshots_are_empty_without_imported_rows(self):
        from app.services.performance_snapshot_service import list_store_performance_snapshots

        payload = list_store_performance_snapshots("store-demo-outdoor-coffee")

        self.assertEqual(payload["mode"], "performance_snapshots")
        self.assertEqual(payload["snapshots"], [])
        self.assertEqual(payload["summary"]["snapshot_count"], 0)
        self.assertEqual(payload["summary"]["clicks"], 0)
        self.assertEqual(payload["summary"]["impressions"], 0)
        self.assertFalse(payload["external_write_allowed"])


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class PerformanceSnapshotApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows

        clear_imported_gsc_rows()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows

        clear_imported_gsc_rows()

    def test_performance_endpoint_returns_imported_gsc_snapshot_payload(self):
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/queries/import-csv",
            json={"csv_text": PERFORMANCE_GSC_CSV, "window": "28d"},
        )

        response = self.client.get("/api/stores/store-demo-outdoor-coffee/performance")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "performance_snapshots")
        self.assertEqual(payload["safety_scope"], "local_imported_gsc_only")
        self.assertFalse(payload["external_write_allowed"])
        self.assertEqual(payload["summary"]["impressions"], 1840)
        self.assertEqual(payload["snapshots"][0]["window"], "28d")

