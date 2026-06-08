import unittest
from pathlib import Path


class SprintOneSchemaContractTests(unittest.TestCase):
    def test_sync_run_and_step_contracts_are_idempotent_job_records(self):
        try:
            from app.schemas.sync import SyncRun, SyncStep
        except ModuleNotFoundError as exc:
            self.fail(f"sync schema contracts are missing: {exc}")

        first_run = SyncRun(store_id="store-1", run_type="sync_products")
        second_run = SyncRun(store_id="store-1", run_type="sync_pages")
        step = SyncStep(sync_run_id="run-1", step_name="fetch_products", provider="woocommerce")

        self.assertEqual(first_run.status, "queued")
        self.assertEqual(first_run.retry_count, 0)
        self.assertEqual(first_run.metadata, {})
        self.assertIsNot(first_run.metadata, second_run.metadata)
        self.assertIsNone(first_run.started_at)
        self.assertIsNone(first_run.finished_at)

        self.assertEqual(step.status, "queued")
        self.assertEqual(step.records_seen, 0)
        self.assertEqual(step.records_upserted, 0)
        self.assertEqual(step.records_skipped, 0)
        self.assertEqual(step.records_failed, 0)

    def test_graph_relationship_contracts_preserve_evidence_and_dedupe_identity(self):
        try:
            from app.schemas.graph import (
                OpportunityEntity,
                ProductPageLink,
                QueryProductMatch,
            )
        except ModuleNotFoundError as exc:
            self.fail(f"graph schema contracts are missing: {exc}")

        query_product = QueryProductMatch(
            store_id="store-1",
            query_id="query-1",
            product_id="product-1",
            match_type="semantic",
            confidence=0.82,
            reason="Query describes portable espresso products.",
            evidence=[{"type": "query_token", "value": "portable espresso"}],
        )
        product_page = ProductPageLink(
            store_id="store-1",
            product_id="product-1",
            page_id="page-1",
            link_type="product_page",
            confidence=1.0,
            source="wordpress_sync",
        )
        entity = OpportunityEntity(
            store_id="store-1",
            opportunity_id="opportunity-1",
            entity_type="query",
            entity_id="query-1",
            role="primary",
            confidence=0.91,
        )

        self.assertEqual(query_product.match_type, "semantic")
        self.assertEqual(query_product.confidence, 0.82)
        self.assertEqual(query_product.evidence[0]["value"], "portable espresso")
        self.assertEqual(product_page.link_type, "product_page")
        self.assertEqual(product_page.source, "wordpress_sync")
        self.assertEqual(entity.entity_type, "query")
        self.assertEqual(entity.role, "primary")

    def test_opportunity_contract_contains_versioned_rule_metadata(self):
        try:
            from app.schemas.opportunity import OpportunityCreate
        except ModuleNotFoundError as exc:
            self.fail(f"opportunity schema contract is missing: {exc}")

        opportunity = OpportunityCreate(
            title="Refresh title for camping espresso page",
            opportunity_type="high_impression_low_ctr",
            summary="Strong impressions with weak CTR.",
            recommended_task_type="ctr_refresh",
            trafscore=84.2,
            confidence=0.76,
            rule_id="high_impression_low_ctr",
            rule_version=1,
            score_components={"traffic_potential": 90, "intent_score": 70},
            dedupe_key="store-1:ctr:query-cluster-1:page-1",
            generated_by_sync_run_id="sync-run-1",
        )
        defaulted = OpportunityCreate(
            title="Manual opportunity",
            opportunity_type="collection_page",
            summary="Create a missing collection page.",
            recommended_task_type="collection_page",
            trafscore=73.0,
            confidence=0.64,
        )

        self.assertEqual(opportunity.rule_id, "high_impression_low_ctr")
        self.assertEqual(opportunity.rule_version, 1)
        self.assertEqual(opportunity.score_components["traffic_potential"], 90)
        self.assertEqual(opportunity.dedupe_key, "store-1:ctr:query-cluster-1:page-1")
        self.assertEqual(opportunity.generated_by_sync_run_id, "sync-run-1")

        self.assertEqual(defaulted.rule_id, "manual")
        self.assertEqual(defaulted.rule_version, 1)
        self.assertEqual(defaulted.score_components, {})
        self.assertIsNone(defaulted.dedupe_key)
        self.assertIsNone(defaulted.generated_by_sync_run_id)

    def test_sprint_one_migration_declares_p0_tables_and_rule_metadata(self):
        root = Path(__file__).resolve().parents[4]
        migration = root / "infra" / "migrations" / "0002_sprint1_decisioning_kernel.sql"
        self.assertTrue(migration.exists(), "Sprint 1 migration file is missing")

        sql = migration.read_text(encoding="utf-8").lower()
        required_tables = [
            "create table if not exists sync_runs",
            "create table if not exists sync_steps",
            "create table if not exists query_product_matches",
            "create table if not exists product_page_links",
            "create table if not exists opportunity_entities",
        ]
        required_opportunity_columns = [
            "add column if not exists rule_id",
            "add column if not exists rule_version",
            "add column if not exists score_components",
            "add column if not exists dedupe_key",
            "add column if not exists generated_by_sync_run_id",
        ]

        for table_sql in required_tables:
            self.assertIn(table_sql, sql)

        for column_sql in required_opportunity_columns:
            self.assertIn(column_sql, sql)

        self.assertIn("references sync_runs(id) on delete cascade", sql)
        self.assertIn("references opportunities(id) on delete cascade", sql)
        self.assertIn("unique(store_id, query_id, product_id, match_type)", sql)
        self.assertIn("unique(store_id, product_id, page_id, link_type)", sql)
        self.assertIn("unique(opportunity_id, entity_type, entity_id, role)", sql)
        self.assertIn("idx_opportunities_store_rule_dedupe", sql)


if __name__ == "__main__":
    unittest.main()
