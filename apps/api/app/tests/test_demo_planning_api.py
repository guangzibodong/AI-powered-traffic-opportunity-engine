import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


class DemoPlanningPayloadTests(unittest.TestCase):
    def setUp(self) -> None:
        from app.services.demo_planning_service import clear_demo_task_status_overrides

        clear_demo_task_status_overrides()

    def tearDown(self) -> None:
        from app.services.demo_planning_service import clear_demo_task_status_overrides

        clear_demo_task_status_overrides()

    def test_demo_planning_payload_contains_opportunities_and_tasks(self):
        from app.services.demo_planning_service import build_demo_planning_payload

        payload = build_demo_planning_payload("store-demo-outdoor-coffee")

        self.assertEqual(payload["mode"], "demo_decisioning")
        self.assertGreaterEqual(len(payload["opportunities"]), 3)
        self.assertGreaterEqual(len(payload["tasks"]), 10)
        self.assertEqual(payload["planning_run"]["generated_tasks"], len(payload["tasks"]))
        self.assertTrue(all(task["evidence"] for task in payload["tasks"]))

    def test_demo_task_status_update_persists_to_detail_and_list(self):
        from app.services.demo_planning_service import (
            build_demo_planning_payload,
            get_demo_task,
            update_demo_task_status,
        )

        updated = update_demo_task_status("store-demo-outdoor-coffee", "task_002", "approved")

        self.assertIsNotNone(updated)
        self.assertEqual(updated["status"], "approved")
        self.assertEqual(get_demo_task("store-demo-outdoor-coffee", "task_002")["status"], "approved")

        payload = build_demo_planning_payload("store-demo-outdoor-coffee")
        by_id = {task["id"]: task for task in payload["tasks"]}

        self.assertEqual(by_id["task_002"]["status"], "approved")

    def test_demo_task_status_update_rejects_invalid_statuses(self):
        from app.services.demo_planning_service import update_demo_task_status

        for status in ["draft_generated", "failed", "published", "applied", "autopilot", "one_click_apply"]:
            with self.subTest(status=status):
                with self.assertRaises(ValueError):
                    update_demo_task_status("store-demo-outdoor-coffee", "task_002", status)

    def test_demo_task_status_update_returns_none_for_unknown_task(self):
        from app.services.demo_planning_service import update_demo_task_status

        self.assertIsNone(update_demo_task_status("store-demo-outdoor-coffee", "missing-task", "approved"))


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class DemoPlanningApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        from app.services.demo_planning_service import clear_demo_task_status_overrides

        clear_demo_task_status_overrides()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        from app.services.demo_planning_service import clear_demo_task_status_overrides

        clear_demo_task_status_overrides()

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

        self.assertGreaterEqual(payload["planning_run"]["generated_tasks"], 10)
        self.assertTrue(all(task["evidence"] for task in tasks))
        self.assertNotIn("one_click_apply", automation_levels)
        self.assertNotIn("guarded_autopilot", automation_levels)

    def test_task_detail_returns_404_for_unknown_task(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/tasks/missing-task")

        self.assertEqual(response.status_code, 404)

    def test_generate_draft_route_is_future_gated_in_sprint_one(self):
        response = self.client.post("/api/stores/store-demo-outdoor-coffee/tasks/task_002/generate-draft")

        self.assertEqual(response.status_code, 403)
        self.assertIn("future-gated", response.json()["detail"])

    def test_patch_task_status_accepts_sprint_one_review_statuses(self):
        for status in ["new", "approved", "rejected", "snoozed"]:
            with self.subTest(status=status):
                response = self.client.patch(
                    "/api/stores/store-demo-outdoor-coffee/tasks/task_002",
                    json={"status": status},
                )

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["task"]["status"], status)

    def test_patch_task_status_persists_to_detail_and_list(self):
        response = self.client.patch(
            "/api/stores/store-demo-outdoor-coffee/tasks/task_002",
            json={"status": "snoozed"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["task"]["status"], "snoozed")

        detail_response = self.client.get("/api/stores/store-demo-outdoor-coffee/tasks/task_002")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["task"]["status"], "snoozed")

        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/tasks")
        self.assertEqual(list_response.status_code, 200)
        tasks_by_id = {task["id"]: task for task in list_response.json()["tasks"]}
        self.assertEqual(tasks_by_id["task_002"]["status"], "snoozed")

    def test_post_task_status_shortcuts_update_demo_review_state(self):
        shortcuts = [
            ("approve", "approved"),
            ("reject", "rejected"),
            ("snooze", "snoozed"),
        ]

        for route, expected_status in shortcuts:
            with self.subTest(route=route):
                response = self.client.post(f"/api/stores/store-demo-outdoor-coffee/tasks/task_002/{route}")

                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["task"]["status"], expected_status)

                detail_response = self.client.get("/api/stores/store-demo-outdoor-coffee/tasks/task_002")
                self.assertEqual(detail_response.status_code, 200)
                self.assertEqual(detail_response.json()["task"]["status"], expected_status)

    def test_post_task_status_shortcuts_return_404_for_unknown_task(self):
        for route in ["approve", "reject", "snooze"]:
            with self.subTest(route=route):
                response = self.client.post(f"/api/stores/store-demo-outdoor-coffee/tasks/missing-task/{route}")

                self.assertEqual(response.status_code, 404)

    def test_patch_task_status_returns_400_for_illegal_statuses(self):
        for status in ["draft_generated", "failed", "published", "applied", "autopilot", "one_click_apply"]:
            with self.subTest(status=status):
                response = self.client.patch(
                    "/api/stores/store-demo-outdoor-coffee/tasks/task_002",
                    json={"status": status},
                )

                self.assertEqual(response.status_code, 400)
                self.assertIn("Unsupported Sprint 1 demo task status", response.json()["detail"])

    def test_patch_task_status_returns_404_for_unknown_task(self):
        response = self.client.patch(
            "/api/stores/store-demo-outdoor-coffee/tasks/missing-task",
            json={"status": "approved"},
        )

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
