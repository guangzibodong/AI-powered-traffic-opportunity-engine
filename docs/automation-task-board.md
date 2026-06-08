# TrafScope Automation Task Board

Date: 2026-06-08

This board is the execution source of truth for the current sprint builder loop. Work proceeds from the highest-priority incomplete item that is not blocked.

Current loop: Selected task detail routing.

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
| Product Manager | Main thread | Keep Sprint 1 focused on real task review behavior. |
| Frontend Product Engineer | Main thread | Wire selected task state from board row to task detail. |
| UI Systems Engineer | Main thread | Keep detail fallback data consistent for mock/API tasks. |
| QA Lead | Main thread | Contract, TypeScript, build, browser interaction, backend tests, and secret scan. |
| Backend/API Engineer | Maxwell | Available for future task mutation API work. |

## Task Queue

| ID | Priority | Status | Owner | Task | Definition of Done |
|---|---:|---|---|---|---|
| TASK-DETAIL-001 | 1 | done | QA Lead | Add a failing contract for selected task detail behavior. | UI contract fails before implementation when `selectedTaskId` and task-detail helper are missing. |
| TASK-DETAIL-002 | 2 | done | Frontend Product Engineer | Track selected task ID in App state. | Clicking any task row sets `selectedTaskId` and opens the task detail screen. |
| TASK-DETAIL-003 | 3 | done | UI Systems Engineer | Derive task detail view models from board/API tasks. | `createTaskDetailViewModel` can use the rich fallback for `task_001` and generate safe detail fields for other tasks. |
| TASK-DETAIL-004 | 4 | done | QA Lead | Verify selected task behavior and commit/push. | UI contract, TypeScript, build, browser interaction, backend unittest, secret scan, commit, and push succeed. |

## Blockers

| Blocker | Status | Notes |
|---|---|---|
| None | clear | No external credential or network blocker is known for this loop. |

## Agent Findings

- Before this loop, only `task_001` could open Task Detail.
- Task Detail always used the static `taskDetail` fixture, so API-backed tasks would not be inspectable.
- The fix keeps the richer mock detail for `task_001` while allowing every board task to produce a safe review detail.

## Completion Rule

The sprint builder loop is complete when every task above is `done` or explicitly `blocked` with a concrete external reason.
