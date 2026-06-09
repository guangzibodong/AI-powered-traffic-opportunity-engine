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
        self.client = TestClient(create_app())

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
