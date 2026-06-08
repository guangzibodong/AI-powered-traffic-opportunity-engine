# TrafScope UI Implementation Plan

Date: 2026-06-08

Status: Approved sequence for UI implementation

## Current State

The current frontend is a Sprint 0 static board prototype:

- `App.tsx` composes the board directly.
- `styles.css` is mostly light SaaS styling.
- Task cards show basic title/category/score/status.
- Opportunities show summary and score.
- Integration status is thin.
- Mock data does not yet match the full evidence contract.

This is a useful seed, but it is not the final TrafScope MVP UI.

## Implementation Principles

- Implement UI contracts before adding broad feature scope.
- Keep dark operational design from `DESIGN.md`.
- Keep evidence visible before action.
- Keep draft-only and read-only safety visible.
- Keep components data-driven through view models.
- Do not expose future unsafe statuses in Sprint 1 UI.

## Phase 1: Foundation

Goals:

- Convert visual system to CSS variables.
- Rework app shell into dark operational workspace.
- Prepare routing and component structure.

Tasks:

- Add token sections to global CSS.
- Update background, panel, border, text, and status colors.
- Move board composition from `App.tsx` to `pages/BoardPage.tsx`.
- Make `App.tsx` root/provider/router oriented.
- Convert navigation buttons into store-scoped route links once React Router is installed.
- Keep lucide icons as functional icons only.

Do not:

- Add Redux/Zustand.
- Add full theming system.
- Add marketing landing page.

## Phase 2: Data Shape And Mock Alignment

Goals:

- Make mock data represent backend-like DTOs.
- Add mapper/view model layer.
- Remove unsafe Sprint 1 UI concepts.

Tasks:

- Add task evidence rows to mock data.
- Add related query/product/page counts.
- Add rule ID/version and dedupe key to opportunity mock data.
- Add score components.
- Add planning run mock state.
- Add integration health details.
- Keep visible task statuses to `new`, `approved`, `rejected`, `snoozed`.
- Keep future asset states disabled or hidden.

Do not:

- Show `published`, `applied`, `one_click_apply`, or `autopilot` in Sprint 1 UI.
- Format numeric metrics as strings before display.

## Phase 3: Board V1

Goals:

- Make the first viewport answer what to do next.

Components:

- `BoardHeader`
- `WeeklyPlanningControl`
- `BoardMetricStrip`
- `PriorityTaskList`
- `TaskRow` / `TaskCard`
- `EvidenceSummary`
- `IntegrationHealthStrip`
- `OpportunityRail`

Acceptance:

- Top 1-3 tasks visible.
- Each task has evidence preview.
- Planning state visible.
- Integration health visible.
- No live publish wording.

## Phase 4: Task Detail

Goals:

- Let user approve, reject, or snooze based on evidence.

Components:

- `TaskDetailHeader`
- `TaskStatusActions`
- `EvidenceTable`
- `ScoreBreakdown`
- `RelatedEntitiesPanel`
- `ActionPlan`
- `AcceptanceCriteriaList`

Acceptance:

- User can inspect evidence within 30 seconds.
- Action buttons are close to safety explanation.
- Missing evidence blocks normal task rendering.

## Phase 5: Opportunity Detail

Goals:

- Explain why an opportunity exists.

Components:

- `OpportunityDetail`
- `RuleTraceCard`
- `ScoreBreakdown`
- `EvidenceTable`
- `RelatedEntitiesPanel`
- `RecommendedTaskPreview`

Acceptance:

- Rule ID and version visible.
- Dedupe key or trace identity visible.
- Score components visible.
- Evidence rows visible.
- Opportunity and task concepts remain visually distinct.

## Phase 6: Integrations Safety View

Goals:

- Make data trust and external write safety visible.

Components:

- `IntegrationSettingsPanel`
- `SyncRunPreview`
- `SafetyDefaultsPanel`
- `AuditLogPreview`

Acceptance:

- WooCommerce read-only visible.
- WordPress draft-only visible.
- GSC demo/import/connected state visible.
- Errors safe and actionable.

## Phase 7: Responsive And Visual QA

Goals:

- Verify real product usability across viewports.

Checks:

- 1440x900 desktop.
- 1024x768 tablet/narrow.
- 390x844 mobile.
- 320x568 small mobile.
- Board screenshot.
- Task detail screenshot.
- Opportunity detail screenshot.
- Empty/loading/error states.
- No overlap.
- No clipped actions.
- Evidence remains visible.

## Phase 8: Later MVP Screens

Asset Draft Review:

- Structured review only.
- Claim ledger.
- QA rail.
- `Create WordPress draft`.
- No full rich text editor.

Performance:

- Baseline snapshot.
- After snapshot.
- Tracking state.
- No complex attribution claim.

## Sprint UI Non-Goals

- Marketing homepage.
- AI chat as primary interface.
- Decorative AI visual effects.
- Live publishing.
- WooCommerce write controls.
- Full rich text editor.
- Heavy charting suite.
- Full Products/Queries top-level management.
- Agency multi-store workspace.

