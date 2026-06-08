# TrafScope API Adapter Plan

Date: 2026-06-08

Status: Sprint builder implementation note

## Goal

Move the V3 UI from static mock data toward API-backed demo planning without touching real GSC, WooCommerce, WordPress, or credential flows.

## Current Backend Demo Endpoints

| Endpoint | Role | Source |
|---|---|---|
| `GET /api/stores/{store_id}/opportunities` | Returns deterministic Sprint 1 opportunity payloads. | Demo fixture -> graph builder -> opportunity engine. |
| `GET /api/stores/{store_id}/opportunities/{opportunity_id}` | Returns one deterministic demo opportunity. | Same demo planning payload. |
| `GET /api/stores/{store_id}/tasks` | Returns deterministic Sprint 1 tasks generated from opportunities. | Demo fixture -> opportunity engine -> task service. |
| `GET /api/stores/{store_id}/tasks/{task_id}` | Returns one deterministic demo task. | Same demo planning payload. |

These endpoints are read-only demo planning endpoints. They do not connect to real external services.

## Frontend Adapter Files

| File | Responsibility |
|---|---|
| `apps/web/lib/api-client.ts` | Fetch typed raw API payloads from `VITE_API_BASE_URL` or `http://localhost:8000`. |
| `apps/web/lib/view-model-adapters.ts` | Convert backend snake_case demo payloads into frontend `BoardViewModel`, `Task`, and `Opportunity` shapes. |

## Important Mappings

| Backend field | Frontend field |
|---|---|
| `priority_score` | `trafscore` |
| `automation_level: generate_draft` | `automationLevel: draft_assist_future` |
| `rule_id` | `ruleId` / `ruleTrace.ruleId` |
| `rule_version` | `ruleTrace.version` |
| `dedupe_key` | `ruleTrace.dedupeKey` |
| `score_components: Record<string, number>` | `ScoreComponent[]` |
| `evidence[].type: gsc_* / query_cluster` | `EvidenceRow.type: search` |
| `evidence[].type: product_fit` | `EvidenceRow.type: commerce` |
| `evidence[].type: page_gap / existing_page` | `EvidenceRow.type: page_graph` |

## Safety Rules

- API adapter must not expose `one_click_apply` or `guarded_autopilot`.
- Unknown backend task statuses map to `new`.
- Unknown backend rules map to a safe Sprint 1 rule fallback until a stricter error state is added.
- WordPress draft creation remains future-gated.
- The UI can keep using mock data until a loading/error state is introduced.
