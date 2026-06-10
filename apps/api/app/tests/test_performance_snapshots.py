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

    def test_asset_performance_snapshots_match_local_asset_to_imported_gsc_rows(self):
        from app.services.asset_workspace_service import clear_asset_workspace, create_asset_draft_from_task
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.performance_snapshot_service import list_asset_performance_snapshots

        clear_asset_workspace()
        self.addCleanup(clear_asset_workspace)
        asset = create_asset_draft_from_task(
            "store-demo-outdoor-coffee",
            {
                "action_plan": {},
                "automation_level": "recommend_only",
                "category": "collection_page",
                "evidence": [],
                "id": "task_perf_asset",
                "opportunity_id": "opp_perf",
                "status": "approved",
                "summary": "Local asset candidate for camping espresso queries.",
                "title": "Portable espresso maker camping collection",
            },
        )
        import_gsc_csv("store-demo-outdoor-coffee", PERFORMANCE_GSC_CSV, window="28d")

        payload = list_asset_performance_snapshots("store-demo-outdoor-coffee", asset["id"])

        self.assertIsNotNone(payload)
        assert payload is not None
        self.assertEqual(payload["mode"], "asset_performance_snapshots")
        self.assertEqual(payload["store_id"], "store-demo-outdoor-coffee")
        self.assertEqual(payload["asset_id"], asset["id"])
        self.assertEqual(payload["safety_scope"], "local_imported_gsc_only")
        self.assertFalse(payload["external_write_allowed"])
        self.assertIn("real_gsc_oauth", payload["blocked_capabilities"])
        self.assertEqual(payload["summary"]["snapshot_count"], 1)
        self.assertEqual(payload["summary"]["matching_rows"], 1)
        self.assertEqual(payload["summary"]["clicks"], 24)
        self.assertEqual(payload["summary"]["impressions"], 1200)

        snapshot = payload["snapshots"][0]
        self.assertTrue(snapshot["id"].startswith("asset_perf_"))
        self.assertEqual(snapshot["asset_id"], asset["id"])
        self.assertEqual(snapshot["window"], "28d")
        self.assertEqual(snapshot["clicks"], 24)
        self.assertEqual(snapshot["impressions"], 1200)
        self.assertEqual(snapshot["query_count"], 1)
        self.assertEqual(snapshot["page_count"], 1)
        self.assertEqual(snapshot["match_scope"], "local_asset_query_page_tokens")
        self.assertFalse(snapshot["external_write_allowed"])

    def test_asset_performance_snapshots_return_empty_for_unmatched_local_asset(self):
        from app.services.asset_workspace_service import clear_asset_workspace, create_asset_draft_from_task
        from app.services.gsc_ingestion_service import import_gsc_csv
        from app.services.performance_snapshot_service import list_asset_performance_snapshots

        clear_asset_workspace()
        self.addCleanup(clear_asset_workspace)
        asset = create_asset_draft_from_task(
            "store-demo-outdoor-coffee",
            {
                "action_plan": {},
                "automation_level": "recommend_only",
                "category": "collection_page",
                "evidence": [],
                "id": "task_perf_empty",
                "opportunity_id": "opp_perf",
                "status": "approved",
                "summary": "Local asset candidate for unrelated topics.",
                "title": "Home office chair collection",
            },
        )
        import_gsc_csv("store-demo-outdoor-coffee", PERFORMANCE_GSC_CSV, window="28d")

        payload = list_asset_performance_snapshots("store-demo-outdoor-coffee", asset["id"])

        self.assertIsNotNone(payload)
        assert payload is not None
        self.assertEqual(payload["snapshots"], [])
        self.assertEqual(payload["summary"]["snapshot_count"], 0)
        self.assertEqual(payload["summary"]["matching_rows"], 0)
        self.assertFalse(payload["external_write_allowed"])

    def test_asset_performance_snapshots_return_none_for_unknown_asset(self):
        from app.services.performance_snapshot_service import list_asset_performance_snapshots

        payload = list_asset_performance_snapshots("store-demo-outdoor-coffee", "missing-asset")

        self.assertIsNone(payload)

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
        from app.services.asset_workspace_service import clear_asset_workspace
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows

        clear_asset_workspace()
        clear_imported_gsc_rows()

    def test_asset_performance_endpoint_returns_local_matching_snapshot_payload(self):
        self.client.post("/api/stores/store-demo-outdoor-coffee/tasks/task_002/approve")
        create_response = self.client.post("/api/stores/store-demo-outdoor-coffee/assets/from-task/task_002")
        self.assertEqual(create_response.status_code, 201)
        asset = create_response.json()["asset"]
        self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json={"title": "Portable espresso maker camping collection"},
        )
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/queries/import-csv",
            json={"csv_text": PERFORMANCE_GSC_CSV, "window": "28d"},
        )

        response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}/performance")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "asset_performance_snapshots")
        self.assertEqual(payload["asset_id"], asset["id"])
        self.assertEqual(payload["safety_scope"], "local_imported_gsc_only")
        self.assertFalse(payload["external_write_allowed"])
        self.assertEqual(payload["summary"]["matching_rows"], 1)
        self.assertEqual(payload["snapshots"][0]["clicks"], 24)

    def test_asset_performance_endpoint_returns_404_for_unknown_local_asset(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/assets/missing-asset/performance")

        self.assertEqual(response.status_code, 404)
        self.assertIn("Asset draft not found", response.json()["detail"])

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
