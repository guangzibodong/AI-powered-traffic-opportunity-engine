# TrafScope Automation Task Board

Date: 2026-06-08

This board is the execution source of truth for the current sprint builder loop. Work proceeds from the highest-priority incomplete item that is not blocked.

Current loop: Sprint 1 QA acceptance for Task Detail navigation, demo task status API, and API-backed task review wiring.

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
| Backend/API Engineer | Main thread | Add demo task status mutation and persistence. |
| Frontend Product Engineer | Main thread | Wire API-backed Task Detail approve/reject/snooze while preserving local fallback. |
| QA Lead | Main thread | QA acceptance docs, release gates, API status smoke, and Task Detail navigation checklist. |
| UI Systems Engineer | Banach | Available for later UI mutation feedback states. |

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

## Blockers

| Blocker | Status | Notes |
|---|---|---|
| GitHub HTTPS push | resolved | Network recovered and commit `2fa6792` is ready to push to `codex/sprint1-v3-ui`. |

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

## Completion Rule

The sprint builder loop is complete when every task above is `done` or explicitly `blocked` with a concrete external reason.
