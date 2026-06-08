# TrafScope UI Components

Date: 2026-06-08

Status: Component priority and anatomy for UI implementation

## Principles

- Components exist to support product decisions, not decoration.
- Product components must keep evidence and safety close to actions.
- Primitive components must be stable before large page work.
- Components should use lucide icons where useful, but icons cannot replace unfamiliar labels.
- Components must support the light operational surfaces from `DESIGN.md`.

## P0 Primitives

### AppShell

Anatomy:

- Navigation rail.
- Main content.
- Optional right rail.
- Responsive collapse behavior.

States:

- Desktop.
- Tablet.
- Mobile.
- Loading route.

Acceptance:

- Main content never sits inside a marketing hero.
- Right rail can move below content on smaller screens.

### NavigationRail

Items:

- Board.
- Opportunities.
- Tasks.
- Assets.
- Performance.
- Settings.

Rules:

- Use real links when routing is available.
- Active state must be visible without relying on color alone.
- Do not expose Products/Queries as top-level Sprint 1 nav.

### Button

Variants:

- Primary.
- Secondary.
- Ghost.
- Danger.
- Disabled.

Rules:

- Primary is reserved for the main action on a screen.
- `Create WordPress draft` must include draft wording.
- Do not use generic `Publish`.

### StatusPill

Statuses:

- `new`
- `approved`
- `rejected`
- `snoozed`
- `running`
- `failed`
- `stale`
- `draft-only`
- `read-only`

Acceptance:

- Text label must be present.
- Color alone is not sufficient.

### ScoreBadge

Score bands:

- High: 80-100.
- Medium: 60-79.
- Low: 40-59.
- Risk: below 40 or blocked.

Rules:

- Score is numeric.
- Tooltip or adjacent explanation should reveal score components in detail screens.

### EvidenceRow

Required fields:

- Evidence type.
- Source.
- Date range.
- Entity reference.
- Metric or claim.
- Confidence or reason.

Evidence types:

- Search/GSC.
- Commerce/product.
- WordPress/page.
- Rule.
- Audit.

Acceptance:

- Evidence row cannot be replaced by an AI-written summary.

### EmptyState

Required:

- State reason.
- Next action.
- Safe explanation.

Examples:

- No tasks: run planning or load demo data.
- No GSC: use demo/import fixture.
- No performance: waiting for baseline/after window.

### ErrorState

Required:

- Safe error summary.
- Recovery action.
- Last successful result if available.

Rules:

- Never show stack trace.
- Never show raw credentials.

### JobProgress

Statuses:

- Queued.
- Running.
- Succeeded.
- Failed.
- Cancelled.

Rules:

- Use `aria-live`.
- Disable repeated job-triggering buttons while active.

## P0 Product Components

### TrafficOperationsBoard

Composes:

- BoardHeader.
- WeeklyPlanningControl.
- BoardMetricStrip.
- PriorityTaskList.
- IntegrationHealthStrip.
- OpportunityRail.

Acceptance:

- Top tasks have evidence preview.
- Top 1-3 actions are visible in first viewport.

### WeeklyPlanningControl

Required:

- Last planning run.
- Current run status.
- Run action.
- Input data readiness summary.

States:

- Ready.
- Running.
- Failed.
- Stale data.

Acceptance:

- Button disabled while running.
- Does not promise magic or autopilot.

### TaskRow / TaskCard

Required:

- Score.
- Title.
- Category.
- Status.
- Automation level.
- Evidence summary.
- Related query/product/page counts.
- Next action.

Acceptance:

- Missing evidence shows blocking state.
- Long titles clamp without layout shift.

### TaskDetailHeader

Required:

- Title.
- Score.
- Status.
- Category.
- Primary actions.
- Safety note.

Actions:

- Approve.
- Reject.
- Snooze.

Acceptance:

- User understands approval does not publish live content.

### ScoreBreakdown

Required:

- Component name.
- Component value.
- Weight if available.
- Explanation.

Acceptance:

- Component values are numeric.
- Used in Task Detail and Opportunity Detail.

### OpportunityRail

Required:

- Top opportunities.
- Rule type.
- TrafScore.
- Why now.
- Related entity count.

Acceptance:

- Clicking opens detail.
- Does not replace Opportunity Detail.

### RuleTraceCard

Required:

- Rule ID.
- Rule version.
- Dedupe key.
- Trigger thresholds or reason.

Acceptance:

- Used wherever a recommendation needs trust explanation.

### RelatedEntitiesPanel

Entities:

- Queries.
- Products.
- Pages.
- Categories.

Acceptance:

- Entity chips have type and label.
- Long URLs/products are truncated safely.

### AcceptanceCriteriaList

Required:

- Criteria items.
- Completion state if available.

Rules:

- Must be tied to task action plan.

## P1 Product Components

### AssetDraftReview

Required later:

- Task context.
- Metadata fields.
- Content blocks.
- FAQ.
- Schema preview.
- Claim ledger.
- QA rail.
- Create WordPress draft action.

Rules:

- Structured review only.
- No full rich text editor.
- Draft-only wording required.

### PerformanceSnapshot

Required later:

- Baseline metrics.
- After metrics.
- Tracking state.
- Next refresh.

Rules:

- Do not claim complex attribution.

## Component Anti-Patterns

- Card inside card.
- Recommendation without evidence.
- Icon-only unfamiliar actions.
- Generic AI summary replacing data.
- Primary action far away from supporting evidence.
- `Publish` wording.
- Hero-scale typography in panels.
- Decorative charts with no decision value.
