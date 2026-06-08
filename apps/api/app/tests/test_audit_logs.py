import json
import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


def clear_audit_test_state() -> None:
    from app.services.audit_log_service import clear_audit_logs
    from app.services.integration_status_service import clear_integration_tracking_state

    clear_audit_logs()
    clear_integration_tracking_state()


class AuditLogServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        clear_audit_test_state()

    def tearDown(self) -> None:
        clear_audit_test_state()

    def test_record_audit_log_sanitizes_sensitive_metadata(self):
        from app.services.audit_log_service import get_audit_log, list_audit_logs, record_audit_log

        entry = record_audit_log(
            "store-demo-outdoor-coffee",
            action="integration.connected_stub",
            target_type="integration",
            target_id="wordpress",
            actor="qa",
            metadata={
                "application_password": "dummy-password-for-test",
                "nested": {"consumer_secret": "dummy-password-for-test"},
                "safe": "wordpress",
            },
        )

        serialized = json.dumps(entry)
        self.assertTrue(entry["id"].startswith("audit_"))
        self.assertEqual(entry["safety_scope"], "local_tracking_only")
        self.assertFalse(entry["external_write_allowed"])
        self.assertEqual(entry["metadata"]["application_password"], "[redacted]")
        self.assertEqual(entry["metadata"]["nested"]["consumer_secret"], "[redacted]")
        self.assertEqual(entry["metadata"]["safe"], "wordpress")
        self.assertNotIn("dummy-password-for-test", serialized)

        listed = list_audit_logs("store-demo-outdoor-coffee")
        self.assertEqual(listed["summary"]["audit_logs"], 1)
        self.assertEqual(get_audit_log("store-demo-outdoor-coffee", entry["id"])["id"], entry["id"])
        self.assertIsNone(get_audit_log("store-demo-outdoor-coffee", "missing-log"))

    def test_integration_connect_and_sync_queue_record_audit_events(self):
        from app.services.audit_log_service import list_audit_logs
        from app.services.integration_status_service import enqueue_sync_run, record_integration_connection

        record_integration_connection(
            "store-demo-outdoor-coffee",
            "gsc",
            {"refresh_token": "dummy-password-for-test"},
        )
        run = enqueue_sync_run("store-demo-outdoor-coffee", requested_by="qa")

        events = list_audit_logs("store-demo-outdoor-coffee")["audit_logs"]
        actions = [event["action"] for event in events]
        self.assertEqual(actions, ["sync.queued", "integration.connected_stub"])
        self.assertEqual(events[0]["target_id"], run["id"])
        self.assertEqual(events[1]["target_id"], "gsc")
        self.assertTrue(all(event["external_write_allowed"] is False for event in events))
        self.assertNotIn("dummy-password-for-test", json.dumps(events))


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class AuditLogApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        clear_audit_test_state()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        clear_audit_test_state()

    def test_audit_log_list_and_detail_after_safe_actions(self):
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/integrations/woocommerce/connect",
            json={"consumer_secret": "dummy-password-for-test"},
        )
        self.client.post("/api/stores/store-demo-outdoor-coffee/sync", json={"requested_by": "qa"})

        response = self.client.get("/api/stores/store-demo-outdoor-coffee/audit-logs")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "audit_logs")
        self.assertEqual(payload["summary"]["audit_logs"], 2)
        self.assertEqual(payload["audit_logs"][0]["action"], "sync.queued")
        self.assertFalse(payload["audit_logs"][0]["external_write_allowed"])
        self.assertNotIn("dummy-password-for-test", json.dumps(payload))

        detail_response = self.client.get(
            f"/api/stores/store-demo-outdoor-coffee/audit-logs/{payload['audit_logs'][0]['id']}"
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["audit_log"]["id"], payload["audit_logs"][0]["id"])

    def test_unknown_audit_log_detail_returns_404(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/audit-logs/missing-log")

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
