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

    def _create_local_asset_from_approved_task(self, task_id: str = "task_002") -> dict:
        approve_response = self.client.post(f"/api/stores/store-demo-outdoor-coffee/tasks/{task_id}/approve")
        self.assertEqual(approve_response.status_code, 200)

        create_response = self.client.post(f"/api/stores/store-demo-outdoor-coffee/assets/from-task/{task_id}")
        self.assertEqual(create_response.status_code, 201)
        return create_response.json()["asset"]

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

    def test_asset_patch_rejects_system_owned_review_state(self):
        asset = self._create_local_asset_from_approved_task()

        response = self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json={"review_state": "approved"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("external write", response.json()["detail"].casefold())

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

    def test_asset_patch_updates_allowed_local_editor_fields(self):
        asset = self._create_local_asset_from_approved_task()

        response = self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json={
                "title": "Updated camping espresso collection",
                "slug": "Updated Camping Espresso Collection!",
                "meta_title": "Camping Espresso Gear | Trail Brew",
                "meta_description": "Compare portable espresso gear for outdoor coffee kits.",
                "content_blocks": [
                    {
                        "type": "answer_summary",
                        "heading": "Best camping espresso setup",
                        "body": "Use compact brewers, insulated cups, and a hand grinder.",
                    },
                    {
                        "type": "internal_link_suggestions",
                        "heading": "Internal links",
                        "items": ["collection:camping-coffee", "product:trail-brew-portable-espresso"],
                    },
                ],
                "faq_items": [
                    {
                        "question": "Can I make espresso at camp?",
                        "answer": "Yes. Use a compact manual brewer and preheat your cup.",
                    }
                ],
                "schema_json": {"@type": "FAQPage"},
                "internal_links": ["collection:camping-coffee"],
                "editor_note": "Local review draft only.",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "asset_draft_workspace")
        updated = payload["asset"]
        self.assertEqual(updated["title"], "Updated camping espresso collection")
        self.assertEqual(updated["slug"], "updated-camping-espresso-collection")
        self.assertEqual(updated["meta_title"], "Camping Espresso Gear | Trail Brew")
        self.assertEqual(updated["meta_description"], "Compare portable espresso gear for outdoor coffee kits.")
        self.assertEqual(updated["content_blocks"][0]["type"], "answer_summary")
        self.assertEqual(updated["faq_items"][0]["question"], "Can I make espresso at camp?")
        self.assertEqual(updated["schema_json"], {"@type": "FAQPage"})
        self.assertEqual(updated["internal_links"], ["collection:camping-coffee"])
        self.assertFalse(updated["external_write_allowed"])
        self.assertIn("wordpress_draft_creation", updated["blocked_capabilities"])

        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/assets")
        self.assertEqual(list_response.status_code, 200)
        listed = list_response.json()
        self.assertEqual(listed["assets"][0]["title"], "Updated camping espresso collection")
        self.assertEqual(listed["summary"]["ready_for_wordpress_draft"], 0)

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["asset"]["meta_title"], "Camping Espresso Gear | Trail Brew")

    def test_asset_patch_returns_404_for_unknown_local_asset(self):
        response = self.client.patch(
            "/api/stores/store-demo-outdoor-coffee/assets/missing-asset",
            json={"title": "Missing asset edit"},
        )

        self.assertEqual(response.status_code, 404)

    def test_asset_patch_rejects_empty_or_non_object_payload(self):
        asset = self._create_local_asset_from_approved_task()

        empty_response = self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json={},
        )
        self.assertEqual(empty_response.status_code, 400)
        self.assertIn("non-empty object", empty_response.json()["detail"])

        list_response = self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json=["title", "bad"],
        )
        self.assertEqual(list_response.status_code, 400)
        self.assertIn("non-empty object", list_response.json()["detail"])

    def test_asset_patch_is_store_scoped(self):
        asset = self._create_local_asset_from_approved_task()

        response = self.client.patch(
            f"/api/stores/other-store/assets/{asset['id']}",
            json={"title": "Cross-store edit"},
        )

        self.assertEqual(response.status_code, 404)

    def test_asset_patch_rejects_forbidden_external_write_fields(self):
        asset = self._create_local_asset_from_approved_task()

        response = self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json={
                "external_write_allowed": True,
                "blocked_capabilities": [],
                "publish_preview": {"wordpress_draft_allowed": True, "external_write_allowed": True},
                "wordpress_draft_id": "wp-123",
                "href": "https://example.com/live",
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("external write", response.json()["detail"].casefold())

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}")
        detail = detail_response.json()["asset"]
        self.assertFalse(detail["external_write_allowed"])
        self.assertIn("wordpress_draft_creation", detail["blocked_capabilities"])
        self.assertNotIn("wordpress_draft_id", detail)
        self.assertNotIn("href", detail)

    def test_asset_patch_rejects_credential_like_fields(self):
        asset = self._create_local_asset_from_approved_task()

        response = self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json={"title": "Credential attempt", "api_key": "test-key-123"},
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("credential", response.json()["detail"].casefold())

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}")
        self.assertNotIn("api_key", detail_response.json()["asset"])

    def test_asset_patch_rejects_invalid_block_types_and_html(self):
        asset = self._create_local_asset_from_approved_task()

        invalid_type_response = self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json={"content_blocks": [{"type": "autopilot_publish", "heading": "Nope", "body": "Unsafe"}]},
        )
        self.assertEqual(invalid_type_response.status_code, 400)
        self.assertIn("content block", invalid_type_response.json()["detail"].casefold())

        html_response = self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json={"content_blocks": [{"type": "section", "heading": "Unsafe", "body": "<script>alert(1)</script>"}]},
        )
        self.assertEqual(html_response.status_code, 400)
        self.assertIn("html", html_response.json()["detail"].casefold())

    def test_wordpress_draft_creation_stays_future_gated_after_local_asset_edit(self):
        asset = self._create_local_asset_from_approved_task()

        update_response = self.client.patch(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}",
            json={"title": "Edited local-only asset"},
        )
        self.assertEqual(update_response.status_code, 200)

        response = self.client.post(
            f"/api/stores/store-demo-outdoor-coffee/assets/{asset['id']}/publish-wordpress-draft"
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("future-gated", response.json()["detail"])
