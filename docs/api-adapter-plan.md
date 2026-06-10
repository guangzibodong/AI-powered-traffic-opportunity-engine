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
| `POST /api/stores/{store_id}/queries/import-csv` | Imports GSC-like CSV rows for Sprint 2 query metrics. | In-memory per store and window; no real GSC OAuth. |
| `GET /api/stores/{store_id}/queries` | Lists imported query/page rows. | Imported CSV rows sorted by impressions and clicks. |
| `GET /api/stores/{store_id}/queries/{query_id}` | Returns one imported query/page row. | Same imported CSV store. |
| `GET /api/stores/{store_id}/query-clusters` | Returns deterministic lightweight clusters over imported rows. | Local token-overlap grouping with aggregate metrics. |
| `GET /api/stores/{store_id}/query-clusters/{cluster_key}` | Returns one imported query cluster. | Same deterministic local cluster generation. |
| `POST /api/stores/{store_id}/products/import-woocommerce` | Imports WooCommerce-like product fixture rows. | In-memory per store; no WooCommerce write calls. |
| `GET /api/stores/{store_id}/products` | Lists imported product rows. | Imported WooCommerce fixture rows, in-stock products first. |
| `GET /api/stores/{store_id}/products/{product_id}` | Returns one imported product row. | Same imported product store. |
| `POST /api/stores/{store_id}/pages/import-wordpress` | Imports WordPress-like page/post fixture rows. | In-memory per store; no WordPress draft or publish calls. |
| `GET /api/stores/{store_id}/pages` | Lists imported page/post rows. | Imported WordPress fixture rows, indexable published pages first. |
| `GET /api/stores/{store_id}/pages/{page_id}` | Returns one imported page/post row. | Same imported page store. |
| `GET /api/stores/{store_id}/imported-graph` | Links imported query clusters to imported products and pages. | Deterministic local token/URL matching; no external calls. |
| `GET /api/stores/{store_id}/imported-opportunities` | Generates read-only opportunities from imported graph rows. | Deterministic CTR refresh and collection gap previews only. |
| `GET /api/stores/{store_id}/imported-opportunities/{opportunity_id}` | Returns one imported opportunity preview. | Same deterministic preview generated from imported data. |
| `GET /api/stores/{store_id}/imported-tasks` | Generates read-only task previews from imported opportunity previews. | Recommend-only action plans with `new` status; no mutation, draft, or external write path. |
| `GET /api/stores/{store_id}/imported-tasks/{task_id}` | Returns one imported task preview. | Same recommend-only preview generated from imported data. |
| `GET /api/stores/{store_id}/sync-runs` | Lists local sync run tracking records. | Queued tracking-only records; no external job execution. |
| `GET /api/stores/{store_id}/sync-runs/{sync_run_id}` | Returns one local sync run tracking record. | 404 for unknown runs; no external calls. |
| `GET /api/stores/{store_id}/audit-logs` | Lists sanitized local audit events. | Newest-first event trail for safe local actions; no secrets or external writes. |
| `GET /api/stores/{store_id}/audit-logs/{audit_log_id}` | Returns one sanitized audit event. | 404 for unknown logs; read-only. |

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
| Error/loading UX | Done | Task Detail shows pending, synced, local, and API-unavailable fallback feedback. API-unavailable fallback includes explicit `Retry sync` and `Keep local` controls. |
| Browser mutation smoke | Done | `pnpm --filter @trafscope/web run test:api-actions` launches isolated API/web ports in a real browser and covers success, fallback, retry, keep-local, unsafe status rejection, and board/detail consistency. |
| CSV GSC import foundation | Done | `POST /queries/import-csv` imports GSC-like CSV exports into in-memory per-store query rows, with list/detail read APIs. No real GSC OAuth is connected. |
| Imported query clustering | Done | `GET /query-clusters` groups imported rows into deterministic demand clusters with primary query, source row ids, totals, CTR, weighted position, and top pages. |
| WooCommerce product import foundation | Done | `POST /products/import-woocommerce` normalizes WooCommerce-like product rows into in-memory per-store products with list/detail APIs. Sync service uses read-only client calls only. |
| WordPress page import foundation | Done | `POST /pages/import-wordpress` normalizes WordPress-like page/post rows into in-memory per-store pages with list/detail APIs. Sync service uses read-only `list_pages` calls only. |
| Imported signal graph foundation | Done | `GET /imported-graph` links imported query clusters to imported products and pages with deterministic local matching and aggregate counts. |
| Imported opportunity preview foundation | Done | `GET /imported-opportunities` produces deterministic read-only CTR refresh and collection page gap previews from the imported graph. |
| Imported task preview foundation | Done | `GET /imported-tasks` converts imported opportunity previews into recommend-only action plans with evidence, acceptance criteria, safe `new` status, and no review, draft, or write path. |
| Integration status and sync run tracking foundation | Done | Stub connect endpoints record local `connected_stub` state, `/sync` creates queued tracking-only runs, and sync run list/detail reads expose safe local status without real external execution. |
| Audit log foundation | Done | Integration stub connects and sync queue tracking write sanitized local audit events, with audit list/detail reads and no secret storage, publishing, drafts, commerce writes, or external execution. |
| Stable frontend DTO conversion foundation | Done | API client and view-model adapters type and safely convert integration status, sync run, and audit log payloads while preserving Sprint 1 UI behavior. |
| API-backed safety panel foundation | Done | API board loading also reads integrations, sync run tracking, and audit logs, then feeds existing Safety UI rows through safe read-only adapters. |
| Imported preview frontend DTO foundation | Done | API client and view-model adapters type imported query clusters, imported opportunities, and imported task previews as read-only preview data for later UI rendering. |

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
| `apps/web/lib/view-model-adapters.ts` | Convert backend snake_case demo payloads into frontend `BoardViewModel`, `Task`, `Opportunity`, integration health, sync preview, and audit evidence shapes. |
| `apps/web/lib/task-state.ts` | Keep local review-state fallback for mock mode and API failure paths. |
| `apps/web/app/App.tsx` | Loads API-backed tasks, opportunities, integrations, sync runs, and audit logs; calls `updateTaskStatus` for API-backed task review actions; falls back to local review-state persistence when the API is unavailable. |
| `apps/web/tests/api-action-browser-smoke.mjs` | Runs the automated browser smoke for API-backed review mutations. |

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
| `query_clusters[]` | `ImportedQueryClusterPreview[]` with `Imported GSC` evidence |
| `imported-opportunities[]` | `Opportunity[]` through the deterministic opportunity adapter |
| `imported-tasks[]` | `Task[]` with `automationLevel: recommend_only` |

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
- API mutation fallback controls must remain state-only: `Retry sync` re-attempts `PATCH`, and `Keep local` confirms the local demo review state.
- Local browser smoke may set `CORS_ORIGINS` for isolated test ports; production/live integrations remain outside Sprint 1.
- CSV GSC import is allowed as a read/import fixture path; real GSC OAuth, WooCommerce writes, WordPress writes, credentials, and publishing actions remain outside this adapter slice.
- Imported query clustering must stay deterministic and local in Sprint 2; no embeddings, LLM calls, or external service calls are required to form clusters.
- WooCommerce product import must stay read-only in Sprint 2; no create, update, delete, price, stock, product content, or inventory write route may be added.
- WordPress page import must stay read-only in Sprint 2; no draft creation, page overwrite, live publish, or content mutation route may be added.
- Imported graph matching must stay local and deterministic; no embeddings, LLM calls, live sync calls, or external writes are allowed.
- Imported opportunity previews must not create tasks, assets, WordPress drafts, sync jobs, or external writes.
- Imported task previews must stay recommend-only and read-only; no approve/reject/snooze routes, task persistence, asset generation, WordPress draft creation, publishing, WooCommerce writes, or external calls are allowed.
- Integration status and sync run tracking must not store raw secrets, perform real OAuth, execute external sync jobs, create WordPress drafts, publish content, or write WooCommerce data.
- Audit logs must redact sensitive metadata and stay read-only; logging must not become an execution, draft, publishing, OAuth, or commerce write path.
- Frontend audit DTO adapters must map `performance.refresh_previewed` into safe display copy and a local preview event kind without exposing raw audit metadata, credential-like values, live source labels, queued status, or external-write flags.
- Frontend asset DTO adapters must map `qa_checks` into safe local QA check previews with allowlisted keys/statuses, clamp unknown or unsafe values to `local_review` and `pending`, and avoid exposing QA metadata, credential-like values, QA mutation controls, or WordPress draft readiness as an executable action.
- Frontend asset DTO adapters may map `claim_ledger` into safe read-only claim previews with id/source/text fields only, clamp unknown or credential-like values to local review defaults, and avoid exposing raw claim metadata, claim editing controls, credential-like values, navigation, draft creation, publishing, sync, or commerce-write controls.
- Visible asset workspace QA diagnostics may render those safe local QA check previews as text and stable DOM markers only; they must not add QA mutation, draft, publish, sync, OAuth, credential, navigation, or commerce-write controls.
- Visible asset workspace and local editor claim diagnostics may render safe claim count and claim detail previews as text and stable DOM markers only; they must not add claim editing, href navigation, draft creation, publishing, sync, OAuth, credential, or commerce-write controls.
- Visible asset workspace row claim diagnostics may expose read-only row-level claim detail counts and reconciliation markers proving rendered safe claim detail rows match that row's safe claim count; they must remain diagnostics only and cannot become claim editing, navigation, draft creation, publishing, sync, OAuth, credential, or commerce-write controls.
- Visible asset workspace claim diagnostics may expose read-only total, visible, hidden, and reconciliation count markers proving compact rows and overflow still add up to the safe claim total; these markers must remain diagnostics only.
- Visible asset workspace and local editor claim source diagnostics may expose read-only source count rows and reconciliation markers derived from safe claim previews; they must remain diagnostics only and cannot become claim editing, navigation, draft creation, publishing, sync, OAuth, credential, or commerce-write controls.
- Local asset editor claim count diagnostics may expose a read-only reconciliation marker proving safe claim detail rows match the safe claim count; it must remain diagnostics only and cannot become claim editing, navigation, draft creation, publishing, sync, OAuth, credential, or commerce-write controls.
- Local asset editor QA diagnostics may render safe local QA check previews as text and editor-specific DOM markers only; they must stay read-only and cannot mark QA passed, create drafts, publish, sync, connect OAuth, collect credentials, navigate externally, or write commerce data.
- Local asset editor QA aggregate diagnostics may expose check count, pending count, and readiness state as visible read-only summary copy plus DOM attributes; they must remain derived from local safe QA previews and cannot become QA workflow actions.
- Local asset editor safety diagnostics may expose a read-only blocked-state strip with blocked capability count and key markers for external writes, WordPress draft creation, and WooCommerce writes; they must remain visible diagnostics only and cannot become workflow actions.
- Local asset editor save-state diagnostics may expose read-only save-state and save-feedback markers for idle, pending, saved, and failed local save states; they must remain visible diagnostics only and cannot become workflow actions.
- Local asset editor field fill diagnostics may expose read-only field count, filled count, empty count, and visible field summary markers for local draft fields; they must remain diagnostics only and cannot become workflow actions.
- Local asset editor per-field diagnostics may expose read-only field keys and filled/empty states for local draft fields; they must remain diagnostics only and cannot become workflow actions.
- Local asset editor field reconciliation diagnostics may expose a read-only marker proving per-field rows reconcile with field count, filled count, and empty count; they must remain diagnostics only and cannot become workflow actions.
- Local asset editor field readiness diagnostics may expose a read-only `incomplete_fields` or `all_fields_filled` state derived from local draft field completeness; they must remain diagnostics only and cannot become workflow actions.
- Visible local asset editor field readiness summary rows may render those readiness states as compact read-only copy; they must remain diagnostics only and cannot become workflow actions.
- Visible local asset editor field readiness summary rows may expose read-only filled, empty, and total count diagnostics that reconcile with editor field counts; they must remain diagnostics only and cannot become workflow actions.
- Visible local asset editor field readiness summary rows may expose a read-only count reconciliation marker proving filled plus empty equals total; it must remain diagnostics only and cannot become a workflow action.
- Local asset editor dirty-state diagnostics may expose a read-only `clean` or `dirty` state derived from local form fields versus the selected asset defaults; it must remain diagnostics only and cannot become a workflow action.
- Visible local asset editor dirty-state summary rows may render clean/dirty local form states as compact read-only copy; they must remain diagnostics only and cannot become workflow actions.
- Local asset editor dirty field count diagnostics may expose read-only root and visible-summary counts for changed local fields; they must remain diagnostics only and cannot become workflow actions.
- Local asset editor per-field dirty diagnostics may expose read-only `clean` or `dirty` state markers on each local draft field row; they must reconcile with the root dirty field count and remain diagnostics only.
- Local asset editor dirty field key diagnostics may expose read-only changed-field key lists on the editor root and visible dirty summary; they must reconcile with per-field dirty states and remain diagnostics only.
- Local asset editor dirty field key reconciliation diagnostics may expose read-only booleans proving dirty field key lists match dirty field counts; they must remain diagnostics only and cannot become workflow actions.
- Local asset editor reset-local-changes controls may reset unsaved local form state only; they must not call `updateAsset`, create drafts, sync, collect credentials, navigate externally, or write commerce data.
- Local asset editor structured section heading fields may collect one plain local heading and send it only through safe `content_blocks` section heading; they must not become rich text editors, create drafts, sync, collect credentials, navigate externally, publish, or write commerce data.
- Local asset editor product grid notes may collect one plain local notes field and send it only through safe `content_blocks` as `product_grid_notes`; they must not edit products, prices, inventory, product status, drafts, sync, credentials, external navigation, or commerce data.
- Local asset editor FAQ draft fields may collect one local question/answer pair and send it only through safe `faq_items`; they must not publish FAQ schema, create drafts, sync, collect credentials, navigate externally, or write commerce data.
- Local asset editor schema preview fields may collect one plain local schema type preview and send it only through safe `schema_json`; they must not render script tags, publish schema, create drafts, sync, collect credentials, navigate externally, or write commerce data.
- Local asset editor internal link reference fields may collect one plain store-relative reference and send it only through safe `internal_links`; they must not render hrefs, navigate externally, create drafts, sync, collect credentials, publish, or write commerce data.
- Frontend DTO adapters must clamp unsafe or unknown backend states to safe UI defaults and must not expose `one_click_apply`, `guarded_autopilot`, live publish, applied, or external-write controls.
- API-backed Safety UI must remain read-only; it can render integration, sync, and audit state, but it must not trigger sync execution, credential flows, draft creation, publishing, or commerce writes.
- Imported preview frontend DTOs must remain read-only and recommend-only; they must not expose approve/reject/snooze mutation, draft generation, sync execution, credential flows, publishing, or commerce writes.
- The performance refresh preview helper may call the backend's local `POST /performance/refresh` preview route for typed contract coverage only. It must send no body or credential-like values, map the response through a safe view model, and stay disconnected from the visible UI until a separate browser-gated UI contract exists.

## Remaining API-backed Task Action UX

1. Keep mock mode behavior unchanged so demos still work without the backend.
2. Keep browser mutation smoke green as UI copy and task flows evolve.
3. Keep backend tests covering allowed statuses, illegal statuses, shortcut routes, and 10+ evidence-backed demo tasks.
