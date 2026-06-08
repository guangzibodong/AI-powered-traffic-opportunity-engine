import unittest


class CommerceDecisioningTests(unittest.TestCase):
    def test_trafscore_uses_weighted_ecommerce_formula(self):
        try:
            from app.services.scoring import ScoreComponents, calculate_trafscore
        except ModuleNotFoundError as exc:
            self.fail(f"scoring service is missing: {exc}")

        score = calculate_trafscore(
            ScoreComponents(
                traffic_potential=80,
                intent_score=90,
                product_fit_score=70,
                revenue_fit_score=60,
                inventory_score=100,
                gap_score=85,
                timing_score=75,
                execution_ease=95,
                confidence_score=80,
            )
        )

        self.assertEqual(score, 80.35)

    def test_product_readiness_uses_specified_formula(self):
        try:
            from app.services.scoring import ProductReadinessComponents, calculate_product_readiness
        except ModuleNotFoundError as exc:
            self.fail(f"product readiness scoring is missing: {exc}")

        score = calculate_product_readiness(
            ProductReadinessComponents(
                stock_score=100,
                content_completeness=70,
                structured_data_completeness=80,
                review_score=60,
                image_score=90,
                price_competitiveness=50,
                conversion_proxy=40,
            )
        )

        self.assertEqual(score, 75.0)

    def test_opportunity_becomes_draft_assist_task_by_default(self):
        try:
            from app.services.task_service import TaskService
            from app.schemas.opportunity import OpportunityCreate
        except ModuleNotFoundError as exc:
            self.fail(f"task creation contract is missing: {exc}")

        opportunity = OpportunityCreate(
            title="Create collection page for Portable Espresso Makers for Camping",
            opportunity_type="collection_page",
            summary="GSC demand is rising and matching products are in stock.",
            recommended_task_type="collection_page",
            trafscore=86.5,
            confidence=0.84,
            evidence=[
                {"type": "gsc_growth", "text": "Related queries grew 180% over 14 days"},
                {"type": "product_fit", "text": "8 matching products, 5 in stock"},
            ],
        )

        task = TaskService().create_from_opportunity(opportunity)

        self.assertEqual(task.status, "new")
        self.assertEqual(task.category, "collection_page")
        self.assertEqual(task.automation_level, "generate_draft")
        self.assertIn("Create WordPress page draft", task.action_plan["steps"])
        self.assertGreaterEqual(len(task.evidence), 2)


if __name__ == "__main__":
    unittest.main()
