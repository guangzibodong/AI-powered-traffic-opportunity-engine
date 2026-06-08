# TrafScope Automation Task Board

Date: 2026-06-08

This board is the execution source of truth for the current sprint builder loop. Work proceeds from the highest-priority incomplete item that is not blocked.

Current loop: Specific Refero/Fal UI convergence.

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
| UI Design Lead | Main thread | Extract the specific Refero/Fal style page and translate it to TrafScope. |
| Frontend Product Engineer | Main thread | Implement the light operational design system in React/CSS. |
| QA Lead | Main thread | Contract tests, visual checks, build, backend tests, and secret scan. |
| Backend/API Engineer | Maxwell | Available for API contract work after UI convergence. |
| UI Systems Engineer | Banach | Available for deeper component/i18n architecture work. |

## Task Queue

| ID | Priority | Status | Owner | Task | Definition of Done |
|---|---:|---|---|---|---|
| UI-REF-001 | 1 | done | UI Design Lead | Extract the specific Refero/Fal style page. | `docs/ui-reference-refero.md` includes the source style ID, tokens, component rules, and TrafScope translation. |
| UI-REF-002 | 2 | done | UI Design Lead | Replace old dark operational design guidance. | `DESIGN.md`, UI meeting notes, implementation plan, component notes, tech-stack notes, and visual QA checklist point to the light operational system. |
| UI-REF-003 | 3 | done | Frontend Product Engineer | Apply Refero/Fal-inspired visual tokens to the app. | `apps/web/app/styles.css` uses white canvas, fog surfaces, graphite actions, 1px borders, no default shadows, and small pixel block accents. |
| UI-REF-004 | 4 | done | Frontend Product Engineer | Fix UI usability issues found during browser QA. | Task queue evidence remains readable on desktop/narrow desktop, redundant object column is removed, and screen changes reset scroll to top. |
| UI-REF-005 | 5 | done | QA Lead | Update screenshots and run verification. | React screenshots are refreshed and verification passes: UI contracts, lint, build, backend unittest, browser console check, and secret scan. |
| UI-REF-006 | 6 | done | Tech Lead | Commit and push coherent UI convergence work. | Local commit exists and push either succeeds or is blocked by concrete GitHub network failure. |

## Blockers

| Blocker | Status | Notes |
|---|---|---|
| GitHub HTTPS push | active | Previous push attempt failed because github.com:443 could not be reached from this environment. Retry after commit with direct HTTPS proxy override. |

## Agent Findings

- The specific Refero page is a light Fal / Generative AI visual system, not the earlier dark operational direction.
- The transferable rules are white canvas, fog-gray sections, 1px neutral borders, graphite primary actions, no default shadows, crisp typography, and sparing pixel block accents.
- Browser QA found and fixed two product UX issues: evidence text became unreadable at narrow desktop widths, and switching screens preserved scroll position.

## Completion Rule

The sprint builder loop is complete when every task above is `done` or explicitly `blocked` with a concrete external reason.
