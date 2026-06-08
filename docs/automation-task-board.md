# TrafScope Automation Task Board

Date: 2026-06-08

This board is the execution source of truth for the current sprint builder loop. Work proceeds from the highest-priority incomplete item that is not blocked.

Current loop: Sprint 2 lightweight query clustering over imported GSC CSV rows. Scope stays safe: imported/demo search data only, no real GSC OAuth, no WooCommerce writes, and no WordPress publishing.

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
| Backend/API Engineer | Main thread | Add deterministic lightweight clustering for imported GSC rows. |
| Frontend Product Engineer | Main thread | No UI import panel in this slice; keep existing Sprint 1 UI stable. |
| QA Lead | Main thread | Add service and API tests for imported query clustering, sorting, and empty states. |
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

## Blockers

| Blocker | Status | Notes |
|---|---|---|
| GitHub HTTPS push | resolved | Commit `7e86560` was pushed to `codex/sprint1-v3-ui`; future pushes may need the repo proxy override cleared if `127.0.0.1:7897` is not running. |

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

## Completion Rule

The sprint builder loop is complete when every task above is `done` or explicitly `blocked` with a concrete external reason.
