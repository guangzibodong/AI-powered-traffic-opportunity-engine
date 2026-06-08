import unittest

try:
    from fastapi.testclient import TestClient

    from app.main import create_app
except ModuleNotFoundError:
    TestClient = None
    create_app = None


SAMPLE_GSC_CSV = """Query,Page,Clicks,Impressions,CTR,Position
portable espresso maker camping,https://example.com/camping-espresso,24,1200,2.0%,4.8
manual coffee grinder camping,https://example.com/manual-grinders,8,640,1.25%,9.4
"""

CLUSTER_GSC_CSV = """Query,Page,Clicks,Impressions,CTR,Position
portable espresso maker camping,https://example.com/camping-espresso,24,1200,2.0%,4.8
camping portable espresso machine,https://example.com/camping-espresso,18,800,2.25%,5.2
manual coffee grinder camping,https://example.com/manual-grinders,8,640,1.25%,9.4
camping manual burr grinder,https://example.com/manual-grinders,7,360,1.94%,10.1
"""


class GscCsvImportServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows

        clear_imported_gsc_rows()

    def tearDown(self) -> None:
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows

        clear_imported_gsc_rows()

    def test_import_csv_normalizes_rows_and_sorts_by_impressions(self):
        from app.services.gsc_ingestion_service import import_gsc_csv, list_imported_gsc_rows

        summary = import_gsc_csv("store-demo-outdoor-coffee", SAMPLE_GSC_CSV, window="28d")
        rows = list_imported_gsc_rows("store-demo-outdoor-coffee")

        self.assertEqual(summary["imported_rows"], 2)
        self.assertEqual(summary["skipped_rows"], 0)
        self.assertEqual(rows[0]["query"], "portable espresso maker camping")
        self.assertEqual(rows[0]["page"], "https://example.com/camping-espresso")
        self.assertEqual(rows[0]["clicks"], 24)
        self.assertEqual(rows[0]["impressions"], 1200)
        self.assertAlmostEqual(rows[0]["ctr"], 0.02)
        self.assertAlmostEqual(rows[0]["position"], 4.8)
        self.assertEqual(rows[0]["window"], "28d")
        self.assertTrue(rows[0]["id"].startswith("gsc_"))

    def test_import_csv_is_idempotent_for_same_store_query_page_window(self):
        from app.services.gsc_ingestion_service import import_gsc_csv, list_imported_gsc_rows

        import_gsc_csv("store-demo-outdoor-coffee", SAMPLE_GSC_CSV, window="28d")
        second = import_gsc_csv("store-demo-outdoor-coffee", SAMPLE_GSC_CSV, window="28d")
        rows = list_imported_gsc_rows("store-demo-outdoor-coffee")

        self.assertEqual(second["imported_rows"], 2)
        self.assertEqual(second["total_rows"], 2)
        self.assertEqual(len(rows), 2)

    def test_import_csv_rejects_missing_required_columns(self):
        from app.services.gsc_ingestion_service import import_gsc_csv

        with self.assertRaises(ValueError) as context:
            import_gsc_csv("store-demo-outdoor-coffee", "Query,Clicks\nportable espresso,2\n")

        self.assertIn("Missing required GSC CSV columns", str(context.exception))

    def test_query_clusters_group_imported_rows_by_lightweight_intent(self):
        from app.services.gsc_ingestion_service import import_gsc_csv, list_imported_query_clusters

        import_gsc_csv("store-demo-outdoor-coffee", CLUSTER_GSC_CSV, window="28d")
        clusters = list_imported_query_clusters("store-demo-outdoor-coffee")

        self.assertEqual(len(clusters), 2)
        self.assertEqual(clusters[0]["primary_query"], "portable espresso maker camping")
        self.assertEqual(clusters[0]["query_count"], 2)
        self.assertEqual(clusters[0]["impressions"], 2000)
        self.assertEqual(clusters[0]["clicks"], 42)
        self.assertAlmostEqual(clusters[0]["ctr"], 0.021)
        self.assertAlmostEqual(clusters[0]["position"], 4.96)
        self.assertEqual(clusters[0]["top_pages"], ["https://example.com/camping-espresso"])
        self.assertTrue(all(row_id.startswith("gsc_") for row_id in clusters[0]["row_ids"]))
        self.assertEqual(clusters[1]["primary_query"], "manual coffee grinder camping")

    def test_query_cluster_detail_returns_one_cluster_or_none(self):
        from app.services.gsc_ingestion_service import (
            get_imported_query_cluster,
            import_gsc_csv,
            list_imported_query_clusters,
        )

        import_gsc_csv("store-demo-outdoor-coffee", CLUSTER_GSC_CSV, window="28d")
        cluster = list_imported_query_clusters("store-demo-outdoor-coffee")[0]

        self.assertEqual(
            get_imported_query_cluster("store-demo-outdoor-coffee", cluster["cluster_key"])["cluster_key"],
            cluster["cluster_key"],
        )
        self.assertIsNone(get_imported_query_cluster("store-demo-outdoor-coffee", "missing-cluster"))


@unittest.skipIf(TestClient is None, "FastAPI is not installed in this local test runtime")
class GscCsvImportApiTests(unittest.TestCase):
    def setUp(self) -> None:
        assert TestClient is not None
        assert create_app is not None
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows

        clear_imported_gsc_rows()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        from app.services.gsc_ingestion_service import clear_imported_gsc_rows

        clear_imported_gsc_rows()

    def test_import_csv_endpoint_then_list_and_detail_queries(self):
        response = self.client.post(
            "/api/stores/store-demo-outdoor-coffee/queries/import-csv",
            json={"csv_text": SAMPLE_GSC_CSV, "window": "28d"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "csv_import")
        self.assertEqual(payload["summary"]["imported_rows"], 2)
        self.assertEqual(payload["summary"]["total_rows"], 2)

        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/queries")
        self.assertEqual(list_response.status_code, 200)
        rows = list_response.json()["queries"]
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]["query"], "portable espresso maker camping")

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/queries/{rows[0]['id']}")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["query"]["id"], rows[0]["id"])

    def test_import_csv_endpoint_returns_400_for_invalid_csv(self):
        response = self.client.post(
            "/api/stores/store-demo-outdoor-coffee/queries/import-csv",
            json={"csv_text": "Query,Clicks\nportable espresso,2\n"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing required GSC CSV columns", response.json()["detail"])

    def test_query_detail_returns_404_for_unknown_imported_query(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/queries/missing-query")

        self.assertEqual(response.status_code, 404)

    def test_query_clusters_endpoint_returns_imported_clusters(self):
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/queries/import-csv",
            json={"csv_text": CLUSTER_GSC_CSV, "window": "28d"},
        )

        response = self.client.get("/api/stores/store-demo-outdoor-coffee/query-clusters")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["mode"], "csv_import")
        self.assertEqual(len(payload["query_clusters"]), 2)
        self.assertEqual(payload["query_clusters"][0]["primary_query"], "portable espresso maker camping")

    def test_query_cluster_detail_endpoint_returns_cluster_and_404(self):
        self.client.post(
            "/api/stores/store-demo-outdoor-coffee/queries/import-csv",
            json={"csv_text": CLUSTER_GSC_CSV, "window": "28d"},
        )
        list_response = self.client.get("/api/stores/store-demo-outdoor-coffee/query-clusters")
        cluster_key = list_response.json()["query_clusters"][0]["cluster_key"]

        detail_response = self.client.get(f"/api/stores/store-demo-outdoor-coffee/query-clusters/{cluster_key}")
        missing_response = self.client.get("/api/stores/store-demo-outdoor-coffee/query-clusters/missing-cluster")

        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["mode"], "csv_import")
        self.assertEqual(detail_response.json()["query_cluster"]["cluster_key"], cluster_key)
        self.assertEqual(missing_response.status_code, 404)

    def test_query_clusters_endpoint_returns_empty_array_without_imported_rows(self):
        response = self.client.get("/api/stores/store-demo-outdoor-coffee/query-clusters")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["query_clusters"], [])


if __name__ == "__main__":
    unittest.main()
