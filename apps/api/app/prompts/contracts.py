INTENT_CLASSIFICATION_SCHEMA = {
    "type": "object",
    "required": [
        "query",
        "intent",
        "funnel_stage",
        "modifiers",
        "product_attributes",
        "recommended_asset_type",
        "confidence",
    ],
}

OPPORTUNITY_SCHEMA = {
    "type": "object",
    "required": [
        "title",
        "opportunity_type",
        "summary",
        "evidence",
        "recommended_task_type",
        "expected_impact",
        "confidence",
    ],
}

TASK_ACTION_PLAN_SCHEMA = {
    "type": "object",
    "required": ["task_title", "task_category", "automation_level", "steps", "acceptance_criteria"],
}

ASSET_DRAFT_SCHEMA = {
    "type": "object",
    "required": [
        "asset_type",
        "title",
        "slug",
        "meta_title",
        "meta_description",
        "sections",
        "schema_json",
        "internal_links",
    ],
}

