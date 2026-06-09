import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class AssetSafetyApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        from app.services.asset_workspace_service import clear_asset_workspace
        from app.services.demo_planning_service import clear_demo_task_status_overrides

        clear_asset_workspace()
        clear_demo_task_status_overrides()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        from app.services.asset_workspace_service import clear_asset_workspace
        from app.services.demo_planning_service import clear_demo_task_status_overrides

        clear_asset_workspace()
        clear_demo_task_status_overrides()

    def test_asset_list_is_empty_local_workspace_with_blocked_writes(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/assets")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "asset_draft_workspace")
        self.assertEqual(payload["store_id"], "store-demo-outdoor-coffee")
        self.assertEqual(payload["assets"], [])
        self.assertEqual(payload["summary"]["asset_drafts"], 0)
        self.assertEqual(payload["summary"]["ready_for_wordpress_draft"], 0)
        self.assertFalse(payload["external_write_allowed"])
        self.assertIn("wordpress_draft_creation", payload["blocked_capabilities"])
        self.assertIn("wordpress_publish", payload["blocked_capabilities"])
        self.assertIn("woocommerce_writes", payload["blocked_capabilities"])

    def test_asset_detail_returns_404_until_local_asset_persistence_exists(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/assets/missing-asset")

        self.assertEqual(response.status_code, 404)
        self.assertIn("not found", response.json()["detail"].casefold())

    def test_asset_patch_is_future_gated(self):
        response = self.client.patch(
            "/api/stores/store-demo-outdoor-coffee/assets/asset-demo",
            json={"review_state": "approved"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("future-gated", response.json()["detail"])

    def test_wordpress_draft_creation_is_future_gated(self):
        response = self.client.post("/api/stores/store-demo-outdoor-coffee/assets/asset-demo/publish-wordpress-draft")

        self.assertEqual(response.status_code, 403)
        self.assertIn("future-gated", response.json()["detail"])

    def test_can_create_local_asset_draft_from_approved_demo_task(self):
        approve_response = self.client.post("/api/stores/store-demo-outdoor-coffee/tasks/task_002/approve")
        self.assertEqual(approve_response.status_code, 200)

        response = self.client.post("/api/stores/store-demo-outdoor-coffee/assets/from-task/task_002")

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        asset = payload["asset"]
        self.assertEqual(payload["mode"], "asset_draft_workspace")
        self.assertEqual(asset["id"], "asset_task_002")
        self.assertEqual(asset["source_task_id"], "task_002")
        self.assertEqual(asset["source_task_status"], "approved")
        self.assertEqual(asset["review_state"], "draft_candidate")
        self.assertFalse(asset["external_write_allowed"])
        self.assertIn("wordpress_draft_creation", asset["blocked_capabilities"])
        self.assertGreaterEqual(len(asset["content_blocks"]), 2)
        self.assertEqual(asset["metadata"]["source"], "demo_task")
        self.assertNotIn("external_url", asset)

        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/assets")
        self.assertEqual(list_response.status_code, 200)
        listed = list_response.json()
        self.assertEqual(listed["summary"]["asset_drafts"], 1)
        self.assertEqual(listed["summary"]["ready_for_wordpress_draft"], 0)
        self.assertEqual(listed["assets"][0]["id"], "asset_task_002")

        detail_response = self.client.get("/api/stores/store-demo-outdoor-coffee/assets/asset_task_002")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["asset"]["id"], "asset_task_002")

    def test_local_asset_draft_creation_requires_approved_task(self):
        response = self.client.post("/api/stores/store-demo-outdoor-coffee/assets/from-task/task_002")

        self.assertEqual(response.status_code, 403)
        self.assertIn("approved", response.json()["detail"])

    def test_local_asset_draft_creation_returns_404_for_unknown_task(self):
        response = self.client.post("/api/stores/store-demo-outdoor-coffee/assets/from-task/missing-task")

        self.assertEqual(response.status_code, 404)
