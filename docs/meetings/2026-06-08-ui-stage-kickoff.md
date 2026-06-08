# TrafScope UI Stage Kickoff Meeting

Date: 2026-06-08

Status: Approved to enter UI specification and visual convergence

## Meeting Goal

Move from finalized requirements and technical stack into the UI stage. Re-study the Refero Styles method and decide how TrafScope should translate it into a concrete product UI system.

## Reference

Reference site: https://styles.refero.design/

The useful lesson is the method, not the visual skin:

1. Define the screen job and audience before styling.
2. Copy the visual system discipline, not the website.
3. Give builders a concrete design system before asking for screens.
4. Specify tokens, layout, components, states, Do/Don't rules, and acceptance criteria.
5. Run a compliance pass after implementation.

## Roles In The Room

| Role | Responsibility |
|---|---|
| UI / UX Lead | Screen order, user decisions, current UI gaps, delivery sequence. |
| Design System Lead | Tokens, component anatomy, anti-patterns, visual acceptance rules. |
| Frontend UI Implementation Lead | React implementation path, page/component split, DTO/view model risks. |
| QA / UX Acceptance Lead | Evidence-first, draft-only, state coverage, responsive screenshot gates. |
| Product / Growth Constraints | MVP remains Traffic Operations Board, not generic SEO dashboard or AI writing tool. |

## Final UI Decision

TrafScope should look and behave like a calm ecommerce traffic operations command room:

- Dark operational workspace.
- Dense but readable task-first layout.
- Evidence visible before action.
- Functional accents, not decorative color.
- Draft-safe and read-only boundaries visible near risky actions.
- No marketing hero inside the app.
- No generic AI dashboard styling.

The UI stage is approved, but not unconditionally final. UI implementation must pass evidence-first, draft-only, state, accessibility, and responsive QA gates before it can be called MVP-ready.

## UI Product Principle

Every screen must help the user answer one of these:

1. What should I do next?
2. Why should I trust this recommendation?
3. What happens if I approve it?
4. How will we know whether it worked?

If a UI element does not help answer one of these, it is likely noise.

## MVP Screen Priority

| Priority | Screen | Decision |
|---|---|---|
| P0 | Traffic Operations Board | Build first. Main MVP screen. |
| P0 | Task Detail | Build in Sprint 1. Approval decision screen. |
| P0 | Opportunity Detail | Build in Sprint 1. Trust/explainability screen. |
| P0 | Settings / Integrations safety view | Build early. Data trust and external write safety. |
| P1 | Asset Draft Review | Sprint 3. Structured review only, no rich text editor. |
| P1 | Performance | Sprint 3. GSC snapshots and tracking state only. |
| Later | Products, Queries, full agency workspace | Do not let these distract Sprint 1. |

## Current UI Gap Assessment

Current frontend is a useful Sprint 0 board sketch, but not MVP UI-ready.

Main gaps:

- `styles.css` is still light SaaS, not TrafScope dark operations workspace.
- CSS variables from `DESIGN.md` are not implemented.
- Task cards do not show enough evidence, related entities, action plan, or acceptance criteria.
- Opportunity panel does not show rule ID/version, score components, evidence rows, or dedupe identity.
- Task/status types expose future or unsafe concepts such as `published`, `applied`, `one_click_apply`, and `guarded_autopilot`.
- Mock data includes rules outside Sprint 1 priority and too few tasks for the PRD goal.
- Integration state lacks last sync, sync errors, WooCommerce read-only, WordPress draft-only, and audit entry.

## Design System Decision

`DESIGN.md` is directionally correct. The next UI step is to upgrade it from style guidance into executable interface contracts.

Add or strengthen:

- Semantic color aliases for surfaces, borders, text, status, evidence, scores, and charts.
- Typography rules for data, truncation, URLs, IDs, table headers, and panel headings.
- Layout tokens for app shell, rail widths, gutters, row heights, breakpoints, and z-index.
- Motion tokens for hover, expand/collapse, job progress, and reduced motion.
- Interaction state tokens for loading, empty, error, stale, syncing, disabled, selected, focus, evidence missing, and draft-only safety.

## Component Priority

### P0 Primitives

- `AppShell`
- `NavigationRail`
- `TopBar`
- `Button`
- `IconButton`
- `SegmentedControl`
- `Tabs`
- `Badge`
- `Chip`
- `StatusPill`
- `ScoreBadge`
- `Panel`
- `SectionHeader`
- `Toolbar`
- `Divider`
- `DataTable`
- `DataList`
- `KeyValueList`
- `Tooltip`
- `Popover`
- `Drawer`
- `Modal`
- `Toast`
- `Skeleton`
- `EmptyState`
- `ErrorState`
- `MetricTile`
- `DeltaMetric`
- `Sparkline`
- `AlertBanner`
- `JobProgress`

### P0 Product Components

- `TrafficOperationsBoard`
- `WeeklyPlanningControl`
- `IntegrationHealthStrip`
- `BoardMetricStrip`
- `PriorityTaskList`
- `TaskRow` / `TaskCard`
- `TaskDetailHeader`
- `TaskStatusActions`
- `EvidenceSummary`
- `EvidenceRow`
- `ScoreBreakdown`
- `OpportunityRail`
- `OpportunityDetail`
- `RuleTraceCard`
- `RelatedEntitiesPanel`
- `AcceptanceCriteriaList`

### P1 Product Components

- `AssetDraftReview`
- `ClaimLedger`
- `QACheckRail`
- `PublishSafetyPanel`
- `PerformanceSnapshot`
- `BeforeAfterMetrics`
- `AuditLogPreview`
- `IntegrationSettingsPanel`

## Frontend Implementation Decision

Implementation should evolve in this order:

1. Keep global CSS for now, but reorganize it around tokens, layout, app shell, and component classes.
2. Move current board composition out of `App.tsx` into `pages/BoardPage.tsx`.
3. Make `App.tsx` the application root with routing and future providers.
4. Convert navigation buttons into store-scoped links.
5. Add DTO/view model mapping before components rely on API-like mock data.
6. Update mock data to include PRD evidence contract fields.
7. Remove unsafe Sprint 1 UI language from visible states.
8. Implement Board, Task Detail, Opportunity Detail, and Integrations safety view before Asset Draft and Performance.

## UI Safety Decisions

Draft-only:

- Use `Create WordPress draft`, never generic `Publish`.
- Do not show `published`, `applied`, `one-click apply`, or `autopilot` in Sprint 1 UI.
- Approved task next step is generate/review/create draft only.
- Settings and risky actions must show WordPress draft-only safety.

Evidence-first:

- Top task must show evidence preview in the first viewport.
- Task Detail and Opportunity Detail must show structured evidence rows.
- Evidence rows must include source, date range, entity reference, metric/claim, and confidence/reason.
- Task without evidence is a blocking UI error.
- LLM text may summarize evidence but cannot replace evidence.

## Visual Direction

Use:

- `#0f1216` app background.
- `#171b21` panels.
- `#1d232b` raised panels.
- `#57d0b2` action/healthy state.
- `#8fb8ff` search/GSC evidence.
- `#f5bd5b` commerce/product caution.
- `#f07878` risk/failure.

Avoid:

- Marketing hero layouts.
- AI gradient/orb/glassmorphism.
- Generic KPI + giant chart dashboards.
- One-note teal/green palette.
- Large-radius soft SaaS cards.
- Decorative charts that replace evidence rows.
- Oversized type in dashboard panels.

## UI Delivery Sequence

1. Design tokens and app shell.
2. P0 primitives.
3. Board v1 with evidence-backed Top tasks.
4. Task Detail.
5. Opportunity Detail.
6. Settings / Integrations safety view.
7. Responsive and accessibility pass.
8. Visual QA screenshots.
9. Asset Draft Review.
10. Performance.

## UI Stage Exit Criteria

The UI stage can move into implementation when:

- `DESIGN.md` is reinforced by UI-specific specs.
- Sprint 1 screen contracts are documented.
- Component priority is documented.
- Visual QA checklist is documented.
- Current frontend gaps are known and accepted.
- Evidence-first and draft-only gates are explicit.

