# TrafScope Automation Task Board

Date: 2026-06-08

This board is the execution source of truth for the current sprint builder loop. Work proceeds from the highest-priority incomplete item that is not blocked.

Current loop: Sprint 2 imported query row position display formatting completed; remaining live credential work is blocked. Scope stays safe: imported/demo search data only, no real GSC OAuth, no WooCommerce writes, and no WordPress publishing.

## Status Legend

These are internal execution-board statuses, not TrafScope product task review statuses. Product task review is limited to `new`, `approved`, `rejected`, and `snoozed`.

| Status | Meaning |
|---|---|
| `todo` | Ready to start. |
| `doing` | Currently being implemented. |
| `verify` | Code is written and needs verification. |
| `done` | Verified and committed. |
| `blocked` | Cannot move without external input, network, or credentials. |

## Active Team

| Role | Person/Agent | Current assignment |
|---|---|---|
| Product Manager | Main thread | Keep Sprint 1 review actions state-only and draft-safe. |
| Backend/API Engineer | Main thread | Keep Sprint 2 imported preview APIs stable while frontend DTOs are added. |
| Frontend Product Engineer | Main thread | Add stable API client DTOs and safe adapters for imported query clusters, opportunities, and task previews. |
| QA Lead | Main thread | Add contract tests for imported preview reads, safe status fallback, and no execution controls. |
| UI Systems Engineer | Banach | Reserved for later Sync run UI. |

## Task Queue

| ID | Priority | Status | Owner | Task | Definition of Done |
|---|---:|---|---|---|---|
| TASK-API-001 | 1 | done | QA Lead | Add failing service tests for demo task status updates. | Tests cover persisted detail/list state, invalid status rejection, and unknown task handling. |
| TASK-API-002 | 2 | done | Backend/API Engineer | Implement in-memory demo task status overrides. | `update_demo_task_status` persists approved/rejected/snoozed/new for demo tasks and does not allow unsafe statuses. |
| TASK-API-003 | 3 | done | Backend/API Engineer | Wire task routes to the demo status service. | PATCH plus approve/reject/snooze endpoints return updated task payloads or safe 400/404 errors. |
| TASK-API-004 | 4 | done | Frontend Product Engineer | Add frontend API client mutation skeleton. | `updateTaskStatus` sends PATCH `{ status }` with a Sprint 1 visible status type. |
| TASK-API-005 | 5 | done | QA Lead | Verify, commit, and push. | Verification, local commit, and push succeeded. |
| TASK-QA-006 | 6 | done | QA Lead | Update Sprint 1 QA and release gates for latest acceptance scope. | Docs require any task to open matching Task Detail and demo status API to support PATCH/approve/reject/snooze while rejecting unsafe statuses. |
| TASK-API-007 | 7 | done | Frontend Product Engineer | Wire visible Task Detail review actions to the demo API when API board data is connected. | `App.tsx` calls `updateTaskStatus`, applies successful API responses to board state, and keeps local fallback for API-disabled or failed mutations. |
| TASK-QA-008 | 8 | done | QA Lead | Expand status API acceptance coverage. | Tests cover 10+ evidence-backed tasks, shortcut routes, unknown shortcut tasks, unsafe review statuses, and future-gated draft generation. |
| TASK-DOC-009 | 9 | done | Product Ops / Documentation Lead | Reconcile docs with API-backed review wiring and Sprint 1 draft-safety boundaries. | README, backlog, adapter plan, and task board all state that Sprint 1 review actions are state-only and no WordPress draft is created. |
| TASK-UX-010 | 10 | done | Frontend Product Engineer / UI Systems Engineer | Add review action pending, success, local, and API fallback feedback states. | Task Detail disables duplicate review submissions while syncing, announces feedback with `aria-live`, and shows safe fallback copy when the API is unavailable. |
| TASK-UX-011 | 11 | done | Frontend Product Engineer / QA Lead | Add fallback retry and keep-local controls. | API-unavailable review feedback lets users retry the demo API sync or intentionally keep the local review state without creating drafts, publishing, or writing commerce data. |
| TASK-QA-012 | 12 | done | QA Lead / Frontend Product Engineer | Add automated browser-level API task action coverage. | A repo script launches the API and web app, drives the Task Detail UI in a real browser, verifies API success, API fallback, retry sync, keep-local confirmation, unsafe status rejection, and board/detail status consistency. |
| TASK-S2-GSC-001 | 13 | done | Backend/API Engineer / QA Lead | Add CSV GSC import foundation. | API accepts GSC CSV text, normalizes query/page/clicks/impressions/CTR/position rows, stores them in-memory per store, exposes list/detail reads, rejects invalid rows safely, and preserves Sprint 1 no-live-integration boundaries. |
| TASK-S2-GSC-002 | 14 | done | Backend/API Engineer / QA Lead | Add lightweight query clustering for imported GSC rows. | `GET /query-clusters` groups imported query rows into deterministic clusters with primary query, row ids, totals, weighted CTR, average position, and top pages without using embeddings or external services. |
| TASK-S2-WC-003 | 15 | done | Backend/API Engineer / QA Lead | Add WooCommerce read-only product import foundation. | API accepts WooCommerce-like product fixture payloads, normalizes product fields, stores them in-memory per store, exposes list/detail reads, syncs through read-only client calls, rejects or skips invalid rows safely, and has no WooCommerce write path. |
| TASK-S2-WP-004 | 16 | done | Backend/API Engineer / QA Lead | Add WordPress read-only page import foundation. | API accepts WordPress-like page/post fixture payloads, normalizes page fields, stores them in-memory per store, exposes list/detail reads, syncs through read-only `list_pages` calls, and does not create drafts or publish content. |
| TASK-S2-GRAPH-005 | 17 | done | Backend/API Engineer / QA Lead | Add imported signal graph foundation. | `GET /imported-graph` links imported query clusters to imported products and WordPress pages with deterministic local token/URL matching, aggregate counts, empty states, and no external service calls. |
| TASK-S2-OPP-006 | 18 | done | Backend/API Engineer / QA Lead | Add imported opportunity preview foundation. | `GET /imported-opportunities` generates deterministic read-only opportunity previews from the imported graph for CTR refresh and collection page gaps, with evidence, dedupe keys, safe statuses, and no task/draft/external writes. |
| TASK-S2-TASK-007 | 19 | done | Backend/API Engineer / QA Lead | Add imported task preview foundation. | `GET /imported-tasks` and detail reads convert imported opportunity previews into deterministic recommend-only task previews with evidence, action plans, acceptance criteria, safe `new` status, and no review mutation, draft, or external write path. |
| TASK-S2-SYNC-008 | 20 | done | Backend/API Engineer / QA Lead | Add integration status and sync run tracking foundation. | `GET /integrations`, stub connect endpoints, `POST /sync`, and sync run list/detail reads record local safe connection/sync state without real GSC OAuth, WooCommerce writes, WordPress writes, draft creation, or live publishing. |
| TASK-S2-AUDIT-009 | 21 | done | Backend/API Engineer / QA Lead | Add audit log foundation. | Integration connect and sync tracking actions record sanitized local audit events, `GET /audit-logs` and detail reads expose them, raw secrets are never stored or returned, and audit logging does not create drafts, publish, or write commerce data. |
| TASK-S2-DTO-010 | 22 | done | Frontend Product Engineer / QA Lead | Add stable frontend DTO conversion foundation. | API client and view-model adapters expose typed integrations, sync runs, and audit log reads/conversions that clamp unsafe external-write signals, map unknown statuses to safe UI states, and keep Sprint 1 UI behavior stable. |
| TASK-S2-LIVE-011 | 23 | blocked | Product Manager / Backend/API Engineer | Plan real read-only credential handshake for live WooCommerce, WordPress, and GSC sources. | Blocked on explicit credentials and boundary approval; current sprint rules still forbid real GSC OAuth, WooCommerce writes, WordPress writes, draft creation, and live publishing. |
| TASK-S2-UI-012 | 24 | done | Frontend Product Engineer / QA Lead | Add API-backed safety panel foundation. | API board loading also reads integration status, sync runs, and audit logs, maps them through safe DTO adapters, updates the visible Safety page from `board.integrations`, and does not add sync execution, credential, draft, publish, or commerce write controls. |
| TASK-S2-IMPORT-013 | 25 | done | Frontend Product Engineer / QA Lead | Add imported preview frontend DTO foundation. | API client and view-model adapters expose read-only imported query cluster, imported opportunity, and imported task preview conversions with safe `new` status fallback, `recommend_only` task previews, and no review mutation, draft, publish, sync execution, credential, or commerce write controls. |
| TASK-S2-IMPORT-014 | 26 | done | Frontend Product Engineer / QA Lead | Add API-backed imported preview UI panel. | API mode reads imported query clusters, imported opportunities, and imported task previews, renders them in a read-only board side panel, and exposes no review mutation, credential, sync execution, draft, publish, product edit, commerce write, or live integration controls. |
| TASK-S2-IMPORT-015 | 27 | done | Frontend Product Engineer / QA Lead | Make imported preview loading resilient. | Imported preview endpoint failures leave the API-backed board, tasks, opportunities, integrations, sync runs, and audit logs usable; the imported preview panel shows a safe unavailable/empty state and does not add retries, credentials, sync execution, draft, publish, or commerce write controls. |
| TASK-S2-IMPORT-016 | 28 | done | Frontend Product Engineer / QA Lead | Add imported task detail read client foundation. | Frontend API client exposes a typed read-only `GET /imported-tasks/{task_id}` helper, encodes store/task path segments, keeps imported task detail previews `recommend_only`, and adds no review mutation, credential, sync execution, draft, publish, or commerce write controls. |
| TASK-S2-OPP-017 | 29 | done | Backend/API Engineer / QA Lead | Add imported opportunity detail read API. | API exposes read-only `GET /imported-opportunities/{opportunity_id}` with deterministic generated previews and 404 for unknown ids, without task creation, review mutation, draft, publish, credential, sync execution, or commerce write controls. |
| TASK-S2-OPP-018 | 30 | done | Frontend Product Engineer / QA Lead | Add imported opportunity detail read client foundation. | Frontend API client exposes a typed read-only `GET /imported-opportunities/{opportunity_id}` helper, encodes store/opportunity path segments, maps one imported opportunity preview through the safe opportunity adapter, and adds no review mutation, task creation, draft, publish, credential, sync execution, or commerce write controls. |
| TASK-S2-GSC-019 | 31 | done | Backend/API Engineer / QA Lead | Add imported query cluster detail read API. | API exposes read-only `GET /query-clusters/{cluster_key}` with deterministic imported GSC cluster payloads and 404 for unknown keys, without embeddings, real GSC OAuth, sync execution, task creation, draft, publish, credential, or external write controls. |
| TASK-S2-GSC-020 | 32 | done | Frontend Product Engineer / QA Lead | Add imported query cluster detail read client foundation. | Frontend API client exposes a typed read-only `GET /query-clusters/{cluster_key}` helper, encodes store/cluster path segments, maps one imported query cluster through the safe preview adapter, and adds no embedding, real GSC OAuth, sync execution, task creation, draft, publish, credential, or external write controls. |
| TASK-S2-GRAPH-021 | 33 | done | Frontend Product Engineer / QA Lead | Add imported signal graph read client foundation. | Frontend API client exposes a typed read-only `GET /imported-graph` helper and maps imported graph query clusters through the safe cluster preview adapter, without embeddings, real GSC OAuth, sync execution, task creation, draft, publish, credential, or external write controls. |
| TASK-S2-CATALOG-022 | 34 | done | Frontend Product Engineer / QA Lead | Add imported catalog read client foundation. | Frontend API client exposes typed read-only list/detail helpers for imported WooCommerce products and WordPress pages, encodes store/product/page path segments, and adds no credential, sync execution, draft, publish, product edit, price edit, inventory edit, commerce write, or external write controls. |
| TASK-S2-CATALOG-023 | 35 | done | Frontend Product Engineer / QA Lead | Add API-backed imported catalog preview UI. | Imported preview UI renders read-only imported WooCommerce products and WordPress pages through the new GET helpers, shows compact catalog counts and rows, and adds no edit, write, credential, draft, publish, or sync controls. |
| TASK-S2-CATALOG-024 | 36 | done | Frontend Product Engineer / QA Lead | Make imported catalog preview loading partially resilient. | If imported WooCommerce product or WordPress page reads fail, the imported preview panel still renders graph clusters, opportunities, and recommend-only task previews from successful read-only endpoints, shows no write/retry/credential controls, and keeps the main API board usable. |
| TASK-S2-CATALOG-025 | 37 | done | Frontend Product Engineer / QA Lead | Show imported catalog partial-failure messaging. | When product or page catalog reads fail but graph, opportunity, or task previews still render, the imported preview panel shows a read-only catalog unavailable message without retry, credential, sync, draft, publish, edit, or write controls. |
| TASK-S2-CATALOG-026 | 38 | done | Frontend Product Engineer / QA Lead | Add safe imported catalog view-model adapters. | Imported product and page previews are mapped through frontend view-model adapters before rendering, preserving only safe display fields and keeping raw API catalog payloads out of the UI state. |
| TASK-S2-CATALOG-027 | 39 | done | Frontend Product Engineer / QA Lead | Add safe imported catalog detail view-model adapters. | Imported product and page detail reads can be mapped through frontend view-model adapters into the same safe catalog preview shape, without exposing raw API catalog payloads or adding edit, credential, sync, draft, publish, or commerce write controls. |
| TASK-S2-CATALOG-028 | 40 | done | Frontend Product Engineer / QA Lead | Show safe imported catalog source labels. | Imported product and page cards render their source from the safe catalog view model, making WooCommerce and WordPress origins visible without exposing raw API DTO fields or adding edit, credential, sync, draft, publish, or commerce write controls. |
| TASK-S2-CATALOG-029 | 41 | done | Frontend Product Engineer / QA Lead | Add safe imported catalog URL display. | Imported product and page cards render a sanitized display URL from the catalog view model instead of raw href text, keeping long links layout-safe and avoiding external navigation controls, edit controls, credentials, sync execution, drafts, publishing, or commerce writes. |
| TASK-S2-CATALOG-030 | 42 | done | Frontend Product Engineer / QA Lead | Clamp imported catalog display URL length. | Imported catalog display URLs are capped to a compact fixed length with an ASCII ellipsis, preserving read-only reference context without allowing long URLs to stretch preview cards or adding external navigation, edit, credential, sync, draft, publish, or commerce write controls. |
| TASK-S2-CATALOG-031 | 43 | done | Frontend Product Engineer / QA Lead | Show imported catalog item count metrics. | Imported preview metrics distinguish graph-matched products/pages from the actual imported product/page counts, using only already-read safe catalog view models and adding no external navigation, edit, credential, sync, draft, publish, or commerce write controls. |
| TASK-S2-CATALOG-032 | 44 | done | Frontend Product Engineer / QA Lead | Show imported catalog overflow indicators. | When more imported catalog products or pages exist than the preview rail displays, the UI shows read-only overflow counts so users know the compact preview is partial, without adding external navigation, edit, credential, sync, draft, publish, or commerce write controls. |
| TASK-S2-IMPORT-033 | 45 | done | Frontend Product Engineer / QA Lead | Show imported non-catalog overflow indicators. | When more imported query clusters, opportunity previews, or task previews exist than the preview rail displays, the UI shows read-only overflow counts so users know the compact preview is partial, without adding review mutation, credential, sync, draft, publish, or commerce write controls. |
| TASK-S2-QA-034 | 46 | done | Frontend Product Engineer / QA Lead | Add browser smoke coverage for catalog overflow indicators. | Browser smoke seeds more imported products and pages than the preview rail displays, verifies the read-only catalog overflow indicators, and still confirms no buttons, unsafe methods, credentials, sync, draft, publish, or commerce write controls. |
| TASK-S2-QA-035 | 47 | done | Frontend Product Engineer / QA Lead | Add browser smoke coverage for non-catalog overflow indicators. | Browser smoke seeds more imported query clusters, opportunity previews, and task previews than the preview rail displays, verifies the read-only overflow indicators, and still confirms no buttons, unsafe methods, credentials, sync, draft, publish, or commerce write controls. |
| TASK-S2-GSC-036 | 48 | done | Frontend Product Engineer / QA Lead | Add imported query row read client foundation. | Frontend API client exposes typed read-only list/detail helpers for imported GSC query rows, encodes store/query path segments, and adds no import execution, real GSC OAuth, credential, sync, task, draft, publish, or external write controls. |
| TASK-S2-GSC-037 | 49 | done | Frontend Product Engineer / QA Lead | Add safe imported query row view-model adapters. | Frontend adapters map imported GSC query row list/detail DTOs into safe display previews with source/window defaults, compact page labels, evidence rows, and no import execution, real GSC OAuth, credential, sync, task, draft, publish, or external write controls. |
| TASK-S2-GSC-038 | 50 | done | Frontend Product Engineer / QA Lead | Add API-backed imported query row preview UI. | API mode reads imported GSC query rows, maps them through safe query row adapters, renders compact read-only query row counts/cards/overflow indicators, and adds no import execution, real GSC OAuth, credential, sync, task, draft, publish, external navigation, or external write controls. |
| TASK-S2-GSC-039 | 51 | done | Frontend Product Engineer / QA Lead | Show imported query row partial-failure messaging. | If imported GSC query row reads fail while other imported preview reads succeed, the panel shows a read-only query row unavailable message, keeps successful imported previews visible, and adds no retry, import execution, real GSC OAuth, credential, sync, task, draft, publish, external navigation, or external write controls. |
| TASK-S2-GSC-040 | 52 | done | Frontend Product Engineer / QA Lead | Show imported query row window labels. | Imported query row cards render the safe imported GSC window label, preserving metric time context without adding import execution, real GSC OAuth, credential, sync, task, draft, publish, external navigation, or external write controls. |
| TASK-S2-GSC-041 | 53 | done | Frontend Product Engineer / QA Lead | Show imported query row friendly source labels. | Imported query row cards hide raw internal source codes such as `csv_import`, render a human-friendly `Imported GSC` label, and add no import execution, real GSC OAuth, credential, sync, task, draft, publish, external navigation, or external write controls. |
| TASK-S2-GSC-042 | 54 | done | Frontend Product Engineer / QA Lead | Show imported query row page reference labels. | Imported query row cards prefix sanitized page references with a clear `page` label, keep the reference as text only, and add no import execution, real GSC OAuth, credential, sync, task, draft, publish, external navigation, or external write controls. |
| TASK-S2-GSC-043 | 55 | done | Frontend Product Engineer / QA Lead | Format imported query row CTR labels. | Imported query row cards render normalized CTR values as human-readable percentages, keep raw CTR values inside the safe view model, and add no import execution, real GSC OAuth, credential, sync, task, draft, publish, external navigation, or external write controls. |
| TASK-S2-GSC-044 | 56 | done | Frontend Product Engineer / QA Lead | Format imported query row count labels. | Imported query row cards render clicks and impressions with stable display-safe number formatting, keep raw counts inside the safe view model, and add no import execution, real GSC OAuth, credential, sync, task, draft, publish, external navigation, or external write controls. |
| TASK-S2-GSC-045 | 57 | done | Frontend Product Engineer / QA Lead | Format imported query row position labels. | Imported query row cards render average position with a clear display-safe label, keep raw position inside the safe view model, and add no import execution, real GSC OAuth, credential, sync, task, draft, publish, external navigation, or external write controls. |

## Blockers

| Blocker | Status | Notes |
|---|---|---|
| GitHub HTTPS push | resolved | Commit `7e86560` was pushed to `codex/sprint1-v3-ui`; future pushes may need the repo proxy override cleared if `127.0.0.1:7897` is not running. |
| Live integration credentials and boundary approval | blocked | The next non-local Sprint 2 step needs user-approved credentials and a revised boundary for real read-only connection work; current safe loop remains local/import-only. |

## Agent Findings

- The previous task PATCH route was a placeholder and did not update returned task state.
- The demo service now keeps state only in memory, which matches Sprint 1 safety boundaries and avoids real store writes.
- Frontend UI now calls the demo API for review-state changes when API board data is connected, with local persistence retained as the fallback path.
- QA gates now require any task click to open the matching Task Detail, including non-top tasks.
- QA gates now require the demo status API to accept only `new`, `approved`, `rejected`, and `snoozed`.
- Shortcut route and unsafe-status test coverage has been expanded for the demo status API.
- The frontend API gate now reads `import.meta.env.VITE_*` directly so Vite dev/build can inject API settings.
- The API-backed board now uses stable demo store id `store-demo-outdoor-coffee` instead of the display store name.
- Browser smoke on `localhost:3000` confirmed API-connected board, non-top task detail routing, and API-backed approve mutation for `task_006`.
- Browser smoke on `localhost:3000` confirmed review feedback success path for `task_007` and API-unavailable fallback path for `task_008`.
- Browser smoke on `localhost:3000` confirmed API-unavailable fallback exposes `Retry sync` and `Keep local`, retry returns to synced API feedback after API recovery, and keep-local confirms local state without execution.
- Automated browser smoke command added: `pnpm --filter @trafscope/web run test:api-actions`. It launches isolated API/web ports, uses a real browser, and covers success, fallback, retry, keep-local, unsafe status rejection, and board/detail consistency.
- Sprint 2 starts with imported CSV search data because it moves TrafScope from demo-only planning toward user-owned GSC exports without requiring OAuth credentials.
- CSV import tests cover normalization, sorting, idempotency, missing required columns, endpoint import/list/detail, and unknown query 404 behavior.
- Query clustering is next because it turns raw imported rows into opportunity-ready demand groups while staying deterministic and local.
- Lightweight query clustering is verified by service and API tests, plus the existing full backend, frontend contract, lint, build, and browser smoke gates.
- WooCommerce product import is next because query clusters need store-owned product entities before query-product matching can graduate from demo fixtures.
- WooCommerce product import is verified by service/API/client-safety tests, plus the existing full backend, frontend contract, lint, build, and browser smoke gates.
- WordPress page import is next because imported GSC rows need existing page entities before page gap and refresh rules can graduate from demo fixtures.
- WordPress page import is verified by service/API/read-only sync tests, plus the existing full backend, frontend contract, lint, build, and browser smoke gates.
- Imported graph matching is next because raw imported queries, products, and pages need one deterministic relationship layer before imported-data opportunities can be generated.
- Imported graph matching is verified by service/API tests plus the existing full backend, frontend contract, lint, build, and browser smoke gates.
- Imported opportunity previews are next because imported graphs need to produce reviewable growth opportunities before imported-data task generation can happen.
- Imported opportunity previews are verified by service/API tests plus the existing full backend, frontend contract, lint, build, and browser smoke gates.
- Imported task previews are next because imported opportunities need a safe Action layer before later task persistence and review workflows.
- Imported task previews are verified by service/API tests plus the existing full backend, frontend contract, lint, build, and browser smoke gates.
- Integration status and sync run tracking is next because imported-data workflows need visible connection state and auditable sync attempts before real credentials or background jobs are introduced.
- Integration status and sync run tracking is verified by service/API tests plus the existing full backend, frontend contract, lint, build, and browser smoke gates.
- Audit logs are next because safe local connection and sync state need a human-readable event trail before any future write action is introduced.
- Audit logs are verified by service/API tests plus the existing full backend, frontend contract, lint, build, and browser smoke gates.
- Stable frontend DTO conversion is next because Sprint 2 backend payloads need typed client contracts before the UI starts rendering imported sync and audit panels.
- Stable frontend DTO conversion is verified by backend tests plus the existing frontend contract, lint, build, and browser smoke gates.
- The remaining Sprint 2 roadmap step that is not purely local is live read-only credential work, which is blocked until credentials and boundary approval are provided.
- API-backed safety panel wiring is next because existing safe DTOs should feed the current Safety surface before any live credential work is attempted.
- API-backed safety panel wiring is verified by backend tests plus the existing frontend contract, lint, build, and browser smoke gates.
- Imported preview frontend DTOs are next because the backend already exposes read-only imported clusters, opportunities, and task previews that need stable frontend contracts before UI rendering.
- Imported preview frontend DTOs are verified by backend tests plus the existing frontend contract, lint, build, and browser smoke gates.
- Imported preview UI is next because the backend and DTOs already expose imported previews, but the visible app still needs a safe read-only surface that cannot trigger review mutations or external writes.
- Imported preview UI is verified by backend tests, frontend contract, lint, build, browser smoke with seeded imported fixture data, read-only imported endpoint request checks, diff check, and secret scan.
- Imported preview resilient loading is next because a supplementary imported preview read should not make the whole API-backed planning board fall back to mock data.
- Imported preview resilient loading is verified by browser smoke that aborts imported preview endpoints while preserving the API-backed board, plus backend tests, frontend contract, lint, build, diff check, and secret scan.
- Imported task detail read client is next because the backend already exposes read-only imported task detail previews, but the frontend contract only covers the list endpoint.
- Imported task detail read client is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported opportunity detail read API is next because imported opportunities can be listed but not read individually for future preview-only detail surfaces.
- Imported opportunity detail read API is verified by service/API red-green coverage, backend tests, frontend contract, lint, build, browser smoke, diff check, and secret scan.
- Imported opportunity detail read client is next because the backend now exposes one imported opportunity preview, but the frontend contract only covers imported opportunity lists.
- Imported opportunity detail read client is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query cluster detail read API is next because imported query clusters can be listed but not read individually for future preview-only demand-cluster detail surfaces.
- Imported query cluster detail read API is verified by service/API red-green coverage, backend tests, frontend contract, lint, build, browser smoke, diff check, and secret scan.
- Imported query cluster detail read client is next because the backend now exposes one imported query cluster, but the frontend contract only covers imported cluster lists.
- Imported query cluster detail read client is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported signal graph read client is next because the backend graph endpoint already links imported clusters/products/pages, but the frontend contract does not expose a read-only graph client yet.
- Imported signal graph read client is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported catalog read client is next because graph and opportunity previews now reference imported WooCommerce products and WordPress pages, but the frontend has no stable read-only list/detail DTO helpers for those catalog entities.
- Imported catalog read client is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported catalog preview UI is next because the new product and page read helpers exist, but the imported preview panel still needs a direct catalog surface for read-only product/page inspection.
- Imported catalog preview UI is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported catalog partial-failure resilience is next because catalog reads are supplementary and should not hide graph, opportunity, or task previews when only product/page endpoints are temporarily unavailable.
- Imported catalog partial-failure resilience is verified by browser red-green coverage, backend tests, frontend contract, lint, build, diff check, and secret scan.
- Imported catalog partial-failure messaging is next because silent partial omissions make it unclear whether product/page catalog reads are empty or temporarily unavailable.
- Imported catalog partial-failure messaging is verified by browser red-green coverage, backend tests, frontend contract, lint, build, diff check, and secret scan.
- Imported catalog view-model adapters are next because products and pages now render in the imported preview panel, but raw API catalog DTOs should be converted into stable safe display models first.
- Imported catalog view-model adapters are verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported catalog detail view-model adapters are next because catalog list reads now use safe display models, but future read-only detail surfaces should share the same safe adapter boundary before any UI is added.
- Imported catalog detail view-model adapters are verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported catalog source labels are next because catalog cards now use safe display models, but users should still see whether each read-only item came from WooCommerce or WordPress.
- Imported catalog source labels are verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported catalog safe URL display is next because full imported product/page URLs can be long enough to damage compact preview cards, and the UI only needs a read-only human-safe reference label.
- Imported catalog safe URL display is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported catalog URL truncation is next because sanitized URL labels can still be long enough to stretch the compact imported preview rail.
- Imported catalog URL truncation is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported catalog item count metrics are next because matched product/page counts can be lower than the actual imported catalog volume, and users need to tell imported volume from graph matches without any write controls.
- Imported catalog item count metrics are verified by frontend contract and browser red-green coverage, backend tests, lint, build, diff check, and secret scan.
- Imported catalog overflow indicators are next because the preview rail intentionally shows only the first few catalog records and should disclose when additional imported products or pages are hidden.
- Imported catalog overflow indicators are verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported non-catalog overflow indicators are next because the same compact preview truncation applies to query clusters, opportunity previews, and recommend-only task previews.
- Imported non-catalog overflow indicators are verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Catalog overflow browser smoke coverage is next because the UI contract checks overflow code statically, but the real browser smoke should exercise seeded catalog overflow in the rendered imported preview panel.
- Catalog overflow browser smoke coverage is verified by browser smoke red-green coverage, frontend contract, backend tests, lint, build, diff check, and secret scan.
- Non-catalog overflow browser smoke coverage is next because query cluster, opportunity, and task overflow indicators should also be exercised in a real rendered API-backed imported preview panel.
- Non-catalog overflow browser smoke coverage is verified by browser smoke red-green coverage, frontend contract, backend tests, lint, build, diff check, and secret scan.
- Imported query row read client foundation is next because backend CSV import rows already have safe list/detail read APIs, but the frontend client only exposes derived query cluster reads.
- Imported query row read client foundation is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query row view-model adapters are next because frontend UI should consume safe row previews instead of raw imported GSC query DTOs when a future read-only row panel is added.
- Imported query row view-model adapters are verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query row preview UI is next because API mode can now read and safely map raw imported rows, but the visible imported preview panel still only shows derived clusters.
- Imported query row preview UI is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query row partial-failure messaging is next because query rows are supplementary and should not silently disappear or collapse successful imported previews when only `/queries` is temporarily unavailable.
- Imported query row partial-failure messaging is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query row window labels are next because raw query row clicks, impressions, CTR, and position need visible time-window context before users compare rows.
- Imported query row window labels are verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query row friendly source labels are next because backend source codes such as `csv_import` are implementation details and should not appear in the preview UI.
- Imported query row friendly source labels are verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query row page reference labels are next because the preview card currently shows a sanitized page value without naming it as a page reference.
- Imported query row page reference labels are verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query row CTR display formatting is next because backend-normalized CTR decimals such as `0.02` should not leak into the user-facing preview card.
- Imported query row CTR display formatting is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query row count display formatting is next because raw impression counts such as `1200` should be scan-friendly in compact preview cards.
- Imported query row count display formatting is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.
- Imported query row position display formatting is next because raw position values should be labeled as average position before users compare query rows.
- Imported query row position display formatting is verified by frontend contract red-green coverage, backend tests, lint, build, browser smoke, diff check, and secret scan.

## Completion Rule

The sprint builder loop is complete when every task above is `done` or explicitly `blocked` with a concrete external reason.
