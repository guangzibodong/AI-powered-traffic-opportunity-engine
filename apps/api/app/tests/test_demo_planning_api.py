import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


class DemoPlanningPayloadTests(unittest.TestCase):
    def test_demo_planning_payload_contains_opportunities_and_tasks(self):
        from app.services.demo_planning_service import build_demo_planning_payload

        payload = build_demo_planning_payload("store-demo-outdoor-coffee")

        self.assertEqual(payload["mode"], "demo_decisioning")
        self.assertGreaterEqual(len(payload["opportunities"]), 3)
        self.assertGreaterEqual(len(payload["tasks"]), 3)
        self.assertEqual(payload["planning_run"]["generated_tasks"], len(payload["tasks"]))
        self.assertTrue(all(task["evidence"] for task in payload["tasks"]))


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class DemoPlanningApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        self.client = TestClient(create_app())

    def test_opportunities_endpoint_returns_sprint_one_rules(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/opportunities")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        opportunities = payload["opportunities"]
        by_rule = {opportunity["rule_id"] for opportunity in opportunities}

        self.assertEqual(payload["mode"], "demo_decisioning")
        self.assertIn("collection_page_gap", by_rule)
        self.assertIn("high_impression_low_ctr", by_rule)
        self.assertIn("ranking_push", by_rule)
        self.assertTrue(all(opportunity["evidence"] for opportunity in opportunities))

    def test_tasks_endpoint_returns_demo_tasks_without_autopilot_levels(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/tasks")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        tasks = payload["tasks"]
        automation_levels = {task["automation_level"] for task in tasks}

        self.assertGreaterEqual(payload["planning_run"]["generated_tasks"], 3)
        self.assertTrue(all(task["evidence"] for task in tasks))
        self.assertNotIn("one_click_apply", automation_levels)
        self.assertNotIn("guarded_autopilot", automation_levels)

    def test_task_detail_returns_404_for_unknown_task(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/tasks/missing-task")

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
