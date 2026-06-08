import unittest


class DemoDecisioningLoopTests(unittest.TestCase):
    def test_graph_builder_identifies_collection_gap_cluster(self):
        from app.fixtures.demo_decisioning import load_demo_decisioning_fixture
        from app.services.graph_builder_service import GraphBuilderService

        fixture = load_demo_decisioning_fixture()
        graph = GraphBuilderService().build(fixture)

        cluster = graph.query_clusters["portable espresso camping"]

        self.assertEqual(cluster.primary_query, "portable espresso maker for camping")
        self.assertGreaterEqual(len(cluster.matched_products), 3)
        self.assertTrue(all(product.stock_status == "instock" for product in cluster.matched_products))
        self.assertEqual(cluster.best_existing_page, None)
        self.assertGreater(cluster.total_impressions, 1000)

    def test_opportunity_engine_generates_three_sprint_one_rules(self):
        from app.fixtures.demo_decisioning import load_demo_decisioning_fixture
        from app.services.graph_builder_service import GraphBuilderService
        from app.services.opportunity_engine import OpportunityEngine

        fixture = load_demo_decisioning_fixture()
        graph = GraphBuilderService().build(fixture)
        opportunities = OpportunityEngine().generate(graph)
        by_rule = {opportunity.rule_id: opportunity for opportunity in opportunities}

        self.assertIn("collection_page_gap", by_rule)
        self.assertIn("high_impression_low_ctr", by_rule)
        self.assertIn("ranking_push", by_rule)

        collection_gap = by_rule["collection_page_gap"]
        self.assertEqual(collection_gap.recommended_task_type, "collection_page")
        self.assertGreaterEqual(collection_gap.trafscore, 70)
        self.assertGreaterEqual(len(collection_gap.evidence), 3)
        self.assertIn("portable espresso camping", collection_gap.dedupe_key)

        ctr_refresh = by_rule["high_impression_low_ctr"]
        self.assertEqual(ctr_refresh.recommended_task_type, "ctr_refresh")
        self.assertTrue(any(item["type"] == "gsc_ctr" for item in ctr_refresh.evidence))

        ranking_push = by_rule["ranking_push"]
        self.assertEqual(ranking_push.recommended_task_type, "ranking_push")
        self.assertTrue(any(item["type"] == "gsc_position" for item in ranking_push.evidence))

    def test_opportunity_engine_is_deterministic_and_dedupes_by_rule_key(self):
        from app.fixtures.demo_decisioning import load_demo_decisioning_fixture
        from app.services.graph_builder_service import GraphBuilderService
        from app.services.opportunity_engine import OpportunityEngine

        fixture = load_demo_decisioning_fixture()
        graph = GraphBuilderService().build(fixture)
        first = OpportunityEngine().generate(graph)
        second = OpportunityEngine().generate(graph)

        first_keys = [opportunity.dedupe_key for opportunity in first]
        second_keys = [opportunity.dedupe_key for opportunity in second]

        self.assertEqual(first_keys, second_keys)
        self.assertEqual(len(first_keys), len(set(first_keys)))


if __name__ == "__main__":
    unittest.main()
