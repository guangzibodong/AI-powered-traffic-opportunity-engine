import json
import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


def clear_tracking_state() -> None:
    from app.services.integration_status_service import clear_integration_tracking_state

    clear_integration_tracking_state()


class IntegrationSyncTrackingServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        clear_tracking_state()

    def tearDown(self) -> None:
        clear_tracking_state()

    def test_default_integrations_are_not_connected_and_write_safe(self):
        from app.services.integration_status_service import list_integrations

        payload = list_integrations("store-demo-outdoor-coffee")

        self.assertEqual(payload["mode"], "integration_status")
        self.assertEqual(payload["store_id"], "store-demo-outdoor-coffee")
        self.assertEqual([item["key"] for item in payload["integrations"]], ["gsc", "wordpress", "woocommerce"])
        self.assertTrue(all(item["status"] == "not_connected" for item in payload["integrations"]))
        self.assertTrue(all(item["external_write_allowed"] is False for item in payload["integrations"]))
        self.assertTrue(all("credential" not in json.dumps(item).casefold() for item in payload["integrations"]))

    def test_stub_connection_updates_status_without_storing_credentials(self):
        from app.services.integration_status_service import list_integrations, record_integration_connection

        connected = record_integration_connection(
            "store-demo-outdoor-coffee",
            "woocommerce",
            {"consumer_key": "ck_test", "consumer_secret": "dummy-password-for-test"},
        )

        self.assertEqual(connected["status"], "connected_stub")
        self.assertEqual(connected["connection_mode"], "stub_read_only")
        self.assertFalse(connected["external_write_allowed"])
        self.assertNotIn("dummy-password-for-test", json.dumps(connected))

        integrations = list_integrations("store-demo-outdoor-coffee")["integrations"]
        woocommerce = next(item for item in integrations if item["key"] == "woocommerce")
        self.assertEqual(woocommerce["status"], "connected_stub")
        self.assertNotIn("dummy-password-for-test", json.dumps(integrations))

    def test_sync_run_is_tracking_only_with_safe_steps(self):
        from app.services.integration_status_service import enqueue_sync_run, get_sync_run, list_sync_runs

        run = enqueue_sync_run("store-demo-outdoor-coffee", requested_by="manual")

        self.assertTrue(run["id"].startswith("syncrun_"))
        self.assertEqual(run["status"], "queued")
        self.assertEqual(run["execution_mode"], "tracking_only")
        self.assertEqual(run["requested_by"], "manual")
        self.assertEqual([step["provider"] for step in run["steps"]], ["gsc", "woocommerce", "wordpress"])
        self.assertTrue(all(step["status"] == "queued" for step in run["steps"]))
        self.assertTrue(all(step["external_write_allowed"] is False for step in run["steps"]))
        self.assertIn("real_gsc_oauth", run["blocked_capabilities"])
        self.assertIn("woocommerce_writes", run["blocked_capabilities"])
        self.assertIn("wordpress_writes", run["blocked_capabilities"])

        listed = list_sync_runs("store-demo-outdoor-coffee")
        self.assertEqual(listed["summary"]["sync_runs"], 1)
        self.assertEqual(listed["sync_runs"][0]["id"], run["id"])
        self.assertEqual(get_sync_run("store-demo-outdoor-coffee", run["id"])["id"], run["id"])
        self.assertIsNone(get_sync_run("store-demo-outdoor-coffee", "missing-run"))


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class IntegrationSyncTrackingApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        clear_tracking_state()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        clear_tracking_state()

    def test_integration_connect_and_list_are_stubbed_and_safe(self):
        response = self.client.post(
            "/api/stores/store-demo-outdoor-coffee/integrations/wordpress/connect",
            json={"username": "editor", "application_password": "dummy-password-for-test"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["integration"]["status"], "connected_stub")
        self.assertNotIn("dummy-password-for-test", json.dumps(response.json()))

        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/integrations")
        self.assertEqual(list_response.status_code, 200)
        wordpress = next(item for item in list_response.json()["integrations"] if item["key"] == "wordpress")
        self.assertEqual(wordpress["status"], "connected_stub")
        self.assertFalse(wordpress["external_write_allowed"])
        self.assertNotIn("dummy-password-for-test", json.dumps(list_response.json()))

    def test_sync_endpoint_records_run_and_detail_without_execution(self):
        response = self.client.post("/api/stores/store-demo-outdoor-coffee/sync", json={"requested_by": "qa"})

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        run = payload["sync_run"]
        self.assertEqual(payload["status"], "queued")
        self.assertEqual(run["execution_mode"], "tracking_only")
        self.assertTrue(all(step["external_write_allowed"] is False for step in run["steps"]))

        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/sync-runs")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["sync_runs"][0]["id"], run["id"])

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/sync-runs/{run['id']}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["sync_run"]["id"], run["id"])

    def test_unknown_sync_run_detail_returns_404(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/sync-runs/missing-run")

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
