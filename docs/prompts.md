# Prompt Contracts

All LLM outputs must be valid JSON. Services should validate output against a schema before storing or using it.

## Intent Classification

Required fields:

- `query`
- `intent`
- `funnel_stage`
- `modifiers`
- `product_attributes`
- `recommended_asset_type`
- `confidence`

## Opportunity

Required fields:

- `title`
- `opportunity_type`
- `summary`
- `evidence`
- `recommended_task_type`
- `expected_impact`
- `confidence`

## Task Action Plan

Required fields:

- `task_title`
- `task_category`
- `automation_level`
- `steps`
- `acceptance_criteria`

## Asset Draft

Required fields:

- `asset_type`
- `title`
- `slug`
- `meta_title`
- `meta_description`
- `sections`
- `schema_json`
- `internal_links`

