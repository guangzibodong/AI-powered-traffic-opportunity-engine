from app.schemas.opportunity import OpportunityCreate
from app.schemas.task import Task


TASK_TEMPLATES = {
    "product_seo": {
        "automation_level": "generate_draft",
        "steps": [
            "Audit current product title, meta description, copy, FAQ, schema, and images",
            "Draft SEO title and meta description variants",
            "Add attribute-rich product copy and FAQ",
            "Preview Product and Offer schema changes",
            "Track GSC performance after approval",
        ],
        "acceptance_criteria": [
            "SEO title is unique and under 60 characters",
            "Meta description is under 160 characters",
            "Product price and availability remain unchanged",
            "Schema matches visible product data",
        ],
    },
    "collection_page": {
        "automation_level": "generate_draft",
        "steps": [
            "Select matching in-stock products",
            "Generate SEO title and meta description",
            "Generate page intro and buying guide",
            "Generate FAQ",
            "Create WordPress page draft",
            "Track GSC performance after publishing",
        ],
        "acceptance_criteria": [
            "Page draft includes matching in-stock products",
            "Page has SEO title under 60 characters",
            "Page has meta description under 160 characters",
            "Page has FAQ section",
            "Page links to relevant products and parent category",
        ],
    },
    "buying_guide": {
        "automation_level": "generate_draft",
        "steps": [
            "Select products by use case and readiness",
            "Generate decision framework",
            "Generate comparison table",
            "Add CTA blocks and FAQ",
            "Create WordPress post draft",
        ],
        "acceptance_criteria": [
            "Guide explains selection criteria",
            "Guide includes product cards",
            "Guide has a comparison table",
        ],
    },
    "comparison_page": {
        "automation_level": "generate_draft",
        "steps": [
            "Identify compared product types",
            "Generate comparison matrix",
            "Recommend fit by persona or use case",
            "Add FAQ and internal links",
        ],
        "acceptance_criteria": [
            "Comparison is balanced and factual",
            "Recommendations link to relevant products",
        ],
    },
    "faq_schema": {
        "automation_level": "generate_draft",
        "steps": ["Generate FAQ block", "Preview schema JSON-LD", "Request human approval"],
        "acceptance_criteria": ["FAQ answers are factual", "Schema matches visible content"],
    },
    "ctr_refresh": {
        "automation_level": "generate_draft",
        "steps": ["Generate title variants", "Generate meta description", "Log old and new values"],
        "acceptance_criteria": ["No live change is made without approval"],
    },
    "ranking_push": {
        "automation_level": "generate_draft",
        "steps": ["Find missing subtopics", "Add FAQ", "Add internal links", "Refresh content"],
        "acceptance_criteria": ["Changes map to target query evidence"],
    },
}


class TaskService:
    def create_from_opportunity(self, opportunity: OpportunityCreate) -> Task:
        category = opportunity.recommended_task_type
        template = TASK_TEMPLATES.get(category, self._default_template(category))
        return Task(
            title=opportunity.title,
            category=category,
            automation_level=template["automation_level"],
            status="new",
            priority_score=opportunity.trafscore,
            evidence=opportunity.evidence,
            action_plan={
                "task_title": opportunity.title,
                "task_category": category,
                "automation_level": template["automation_level"],
                "steps": template["steps"],
                "acceptance_criteria": template["acceptance_criteria"],
                "source_summary": opportunity.summary,
                "confidence": opportunity.confidence,
            },
        )

    def _default_template(self, category: str) -> dict:
        return {
            "automation_level": "recommend_only",
            "steps": ["Review evidence", "Decide next manual action", "Track outcome"],
            "acceptance_criteria": ["Task has evidence and a measurable follow-up"],
        }

