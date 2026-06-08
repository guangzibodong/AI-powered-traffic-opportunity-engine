# TrafScope Automation Task Board

Date: 2026-06-08

This board is the execution source of truth for the current sprint builder loop. Work proceeds from the highest-priority incomplete item that is not blocked.

Current loop: Demo task status API.

## Status Legend

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
| Frontend Product Engineer | Main thread | Add API client mutation skeleton for future UI wiring. |
| QA Lead | Main thread | Service tests, API adapter contract, lint, build, backend tests, and secret scan. |
| UI Systems Engineer | Banach | Available for later UI mutation feedback states. |

## Task Queue

| ID | Priority | Status | Owner | Task | Definition of Done |
|---|---:|---|---|---|---|
| TASK-API-001 | 1 | done | QA Lead | Add failing service tests for demo task status updates. | Tests cover persisted detail/list state, invalid status rejection, and unknown task handling. |
| TASK-API-002 | 2 | done | Backend/API Engineer | Implement in-memory demo task status overrides. | `update_demo_task_status` persists approved/rejected/snoozed/new for demo tasks and does not allow unsafe statuses. |
| TASK-API-003 | 3 | done | Backend/API Engineer | Wire task routes to the demo status service. | PATCH plus approve/reject/snooze endpoints return updated task payloads or safe 400/404 errors. |
| TASK-API-004 | 4 | done | Frontend Product Engineer | Add frontend API client mutation skeleton. | `updateTaskStatus` sends PATCH `{ status }` with a Sprint 1 visible status type. |
| TASK-API-005 | 5 | blocked | QA Lead | Verify, commit, and push. | Verification and local commit succeeded; push is blocked by repeated GitHub HTTPS connection failures. |

## Blockers

| Blocker | Status | Notes |
|---|---|---|
| GitHub HTTPS push | active | Three push attempts failed with connection reset or inability to reach github.com:443. |

## Agent Findings

- The previous task PATCH route was a placeholder and did not update returned task state.
- The demo service now keeps state only in memory, which matches Sprint 1 safety boundaries and avoids real store writes.
- Frontend UI still uses local persistence for now; API mutation is ready for the next wiring slice.

## Completion Rule

The sprint builder loop is complete when every task above is `done` or explicitly `blocked` with a concrete external reason.
