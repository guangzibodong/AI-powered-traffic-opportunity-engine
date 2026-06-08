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
| `PATCH /api/stores/{store_id}/tasks/{task_id}` | Updates the in-memory demo review status for a task. | Allows `new`, `approved`, `rejected`, and `snoozed` only. |
| `POST /api/stores/{store_id}/tasks/{task_id}/approve` | Convenience route for approving a demo task. | Same in-memory status override. |
| `POST /api/stores/{store_id}/tasks/{task_id}/reject` | Convenience route for rejecting a demo task. | Same in-memory status override. |
| `POST /api/stores/{store_id}/tasks/{task_id}/snooze` | Convenience route for snoozing a demo task. | Same in-memory status override. |

The planning endpoints are read-only demo planning endpoints. The task status endpoints only change Sprint 1 review state in memory. They do not connect to real external services, create WordPress drafts, or publish content.

`PATCH /tasks/{task_id}` returns `400` for missing or unsupported statuses and `404` for unknown demo tasks. Successful status changes are visible from both task detail and task list responses.

## 当前 Adapter 状态

| Layer | 状态 | 说明 |
|---|---|---|
| Backend planning payload | 已完成 | Demo fixture -> graph builder -> opportunity engine -> task service 已能返回 opportunities/tasks。 |
| Backend task status mutation | 已完成 | `PATCH` 与 approve/reject/snooze shortcut routes 会更新 demo task 状态，并在 list/detail 中可见。 |
| Frontend API read adapter | 已完成 | `getTasks`、`getOpportunities` 与 `mapApiPlanningToBoard` 可驱动 API-backed board。 |
| Frontend API mutation client | Done | `updateTaskStatus` wraps `PATCH { status }` for Sprint 1 review states. API settings use direct `import.meta.env.VITE_*` access so Vite can inject them. |
| Visible UI mutation wiring | Done | Task Detail approve/reject/snooze calls `updateTaskStatus` when API board data is connected, then patches board state. |
| Error/loading UX | Partial done | Task Detail now shows pending, synced, local, and API-unavailable fallback feedback; explicit retry/rollback controls remain future work. |

## Local Smoke Run

Start the backend:

```bash
pnpm run dev:api
```

Start the web app with API-backed board loading enabled:

```bash
cd apps/web
pnpm run dev
```

In PowerShell, set the flag before starting Vite:

```powershell
$env:VITE_USE_API_BOARD='true'
pnpm run dev
```

Expected behavior:

- The board first renders safely with mock data.
- If `http://localhost:8000` is available, the board switches to demo API data.
- If the API is unavailable, the board shows a fallback banner and keeps mock data.

## Frontend Adapter Files

| File | Responsibility |
|---|---|
| `apps/web/lib/api-client.ts` | Fetch typed raw API payloads from `VITE_API_BASE_URL` or `http://localhost:8000`. |
| `apps/web/lib/view-model-adapters.ts` | Convert backend snake_case demo payloads into frontend `BoardViewModel`, `Task`, and `Opportunity` shapes. |
| `apps/web/lib/task-state.ts` | Keep local review-state fallback for mock mode and API failure paths. |
| `apps/web/app/App.tsx` | Calls `updateTaskStatus` for API-backed task review actions and falls back to local review-state persistence when the API is unavailable. |

## Important Mappings

| Backend field | Frontend field |
|---|---|
| `priority_score` | `trafscore` |
| `automation_level: generate_draft` | `automationLevel: draft_assist_future` label only; not executable in Sprint 1 |
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
- `PATCH /tasks/{task_id}` is the canonical demo mutation route for task review state.
- `POST /approve`, `POST /reject`, and `POST /snooze` are safe shortcut routes, not publishing or drafting routes.
- API-backed task actions must only change review state: `new`, `approved`, `rejected`, or `snoozed`.
- API-backed demo reads use stable store id `store-demo-outdoor-coffee`; UI display copy can still show "Outdoor Coffee Gear Demo Store".
- API mutation failure must not erase the user's visible local review state.
- Real WooCommerce, GSC, WordPress, credential, and publishing actions remain outside this adapter slice.

## Remaining API-backed Task Action UX

1. Add explicit retry/rollback controls after an API mutation falls back to local state.
2. Keep mock mode behavior unchanged so demos still work without the backend.
3. Add automated browser-level tests that prove API mutation success, fallback behavior, and list/detail state consistency.
4. Keep backend tests covering allowed statuses, illegal statuses, shortcut routes, and 10+ evidence-backed demo tasks.
