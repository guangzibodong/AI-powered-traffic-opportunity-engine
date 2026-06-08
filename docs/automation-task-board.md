# TrafScope Automation Task Board

Date: 2026-06-08

This board is the execution source of truth for the current sprint builder loop. Work proceeds from the highest-priority incomplete item that is not blocked.

Current loop: API-backed board implementation.

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
| Product Manager | Main thread | Keep Sprint 1 focused on evidence-backed task review. |
| Tech Lead | Main thread | Integrate code, verification, commits, and push attempts. |
| Frontend Product Engineer | Main thread | Task status persistence and UI state model. |
| Backend/API Engineer | Maxwell | API contract exploration for future board wiring. |
| UI Systems Engineer | Banach | Frontend decomposition and i18n architecture exploration. |
| QA Lead | Main thread | Contract tests, build, backend tests, secret scan. |

## Task Queue

| ID | Priority | Status | Owner | Task | Definition of Done |
|---|---:|---|---|---|---|
| API-001 | 1 | done | Frontend Product Engineer | Add API-backed board loading with mock fallback. | Board uses demo API when enabled, shows source/loading/error state, and falls back to mock without breaking Sprint 1 UI. |
| API-002 | 2 | done | QA Lead | Add API adapter contract tests. | Tests prove backend-style payload maps to safe Sprint 1 frontend statuses, rules, automation levels, and evidence. |
| API-003 | 3 | done | Backend/API Engineer | Add a documented local API smoke command. | README/docs explain how to run backend and web together for demo planning. |
| API-004 | 4 | done | Tech Lead | Verify and push API board loop. | Frontend contract, lint, build, backend tests, secret scan, commit, and push succeed. |

## Blockers

| Blocker | Status | Notes |
|---|---|---|
| GitHub HTTPS push | resolved | Latest branch push succeeded after retrying direct HTTPS without the stale local proxy. |

## Agent Findings

- Backend/API explorer recommends `api-client.ts` plus `view-model-adapters.ts` as the minimum path from mock UI to API-backed board. Existing demo services can generate deterministic planning data without real credentials.
- Frontend architecture explorer recommends extracting typed i18n/copy first, then splitting `TaskQueue` as the first component slice. It also flagged copy-driven behavior as a risk; AUTO-001 removed the task action behavior dependency on translated `actionLabel` text.

## Completion Rule

The sprint builder loop is complete when every task above is `done` or explicitly `blocked` with a concrete external reason.
