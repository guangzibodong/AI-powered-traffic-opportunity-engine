# TrafScope Automation Task Board

Date: 2026-06-08

This board is the execution source of truth for the current sprint builder loop. Work proceeds from the highest-priority incomplete item that is not blocked.

Current loop: Sprint 1 demo data depth.

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
| DEMO-001 | 1 | done | Backend Decisioning Engineer | Expand demo fixture to Sprint 1 acceptance depth. | Fixture has at least 20 products, 5 pages, and 50 GSC-like metric rows. |
| DEMO-002 | 2 | done | Backend Decisioning Engineer | Generate at least 10 deterministic demo opportunities/tasks. | Demo planning payload returns at least 10 evidence-backed tasks while preserving all three Sprint 1 rule types. |
| DEMO-003 | 3 | done | QA Lead | Add tests for fixture depth and demo task volume. | Backend tests fail before fixture expansion and pass after implementation. |
| DEMO-004 | 4 | done | Tech Lead | Verify, document, commit, and push. | Backend tests, frontend contracts, lint, build, secret scan, commit, and push succeed. |

## Blockers

| Blocker | Status | Notes |
|---|---|---|
| GitHub HTTPS push | resolved | Latest branch push succeeded after retrying direct HTTPS without the stale local proxy. |

## Agent Findings

- Backend/API explorer recommends `api-client.ts` plus `view-model-adapters.ts` as the minimum path from mock UI to API-backed board. Existing demo services can generate deterministic planning data without real credentials.
- Frontend architecture explorer recommends extracting typed i18n/copy first, then splitting `TaskQueue` as the first component slice. It also flagged copy-driven behavior as a risk; AUTO-001 removed the task action behavior dependency on translated `actionLabel` text.

## Completion Rule

The sprint builder loop is complete when every task above is `done` or explicitly `blocked` with a concrete external reason.
