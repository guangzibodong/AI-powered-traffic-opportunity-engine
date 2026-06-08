# TrafScope Sprint 1 UI Screen Contracts

Date: 2026-06-08

Status: Approved UI contracts for Sprint 1 implementation

## Screen Contract Format

Each screen follows the Refero-inspired method:

1. Audience.
2. Screen job.
3. User decision.
4. Required data.
5. Layout.
6. States.
7. Actions.
8. Acceptance criteria.

## Traffic Operations Board

### Audience

WooCommerce merchant, SEO operator, agency analyst.

### Screen Job

Answer what traffic action should be reviewed first.

### User Decision

What are the top 1-3 tasks I should inspect now, and should I run weekly planning again?

### Required Data

- Store name.
- Last planning run time.
- Planning run status.
- Integration health.
- GSC/demo data mode.
- TrafScore average.
- Query gaps.
- Products ready.
- Tracked assets.
- Top 5-10 tasks.
- Top opportunities.

Each top task must include:

- Task title.
- Category.
- Status.
- Automation level.
- TrafScore or priority score.
- Evidence summary.
- Related query count.
- Related product count.
- Related page count.
- Next action.

### Layout

Desktop:

- Left navigation rail.
- Main column with board header, metric strip, and priority task list.
- Right rail with integration health and top opportunities.

Tablet:

- Navigation remains visible or collapses.
- Right rail moves below task list if space is tight.

Mobile:

- Navigation collapses.
- Metrics become 2 columns or 1 column.
- Task rows stack without hiding evidence or next action.

### States

- Ready with demo fixture.
- Planning not run.
- Planning queued.
- Planning running.
- Planning succeeded.
- Planning failed with last successful run preserved.
- No tasks.
- Evidence missing.
- Integration degraded.
- Demo mode vs real connected mode.

### Actions

- Run weekly planning.
- Open task detail.
- Open opportunity detail.
- Open integrations.

### Acceptance Criteria

- First viewport shows the top action.
- Every visible task has evidence preview.
- Planning action is disabled while running.
- Planning state uses visible text and `aria-live`.
- No live publish language appears.
- No task without evidence renders as a normal actionable task.

## Task Detail

### Audience

WooCommerce merchant, SEO operator, content operator.

### Screen Job

Help the user decide whether to approve, reject, or snooze a task.

### User Decision

Do I trust this task enough to approve it?

### Required Data

- Task title.
- Category.
- Status.
- Automation level.
- TrafScore / priority score.
- Source opportunity.
- Rule trace.
- Evidence rows.
- Score breakdown.
- Related queries.
- Related products.
- Related pages.
- Action plan.
- Acceptance criteria.
- Draft-safe next step.

### Layout

Desktop:

- Header with title, status, score, and actions.
- Main column with evidence, action plan, and acceptance criteria.
- Right rail with score breakdown, related entities, source opportunity, and safety note.

Mobile:

- Header actions remain close to title.
- Score breakdown and related entities stack after evidence.
- Approve/reject/snooze remain reachable without covering content.

### States

- New.
- Approved.
- Rejected.
- Snoozed.
- Missing evidence.
- Mutation pending.
- Mutation failed.
- Future draft generation disabled.

### Actions

- Approve.
- Reject.
- Snooze.
- Open source opportunity.
- Future: generate structured draft after approval.

### Acceptance Criteria

- User can inspect evidence within 30 seconds.
- Approve action explains next step is not live publish.
- Rejected state is visible and not regenerated as normal new work.
- Missing evidence blocks normal task rendering.
- Score breakdown is visible or one click away.

## Opportunity Detail

### Audience

SEO operator, skeptical merchant, growth analyst.

### Screen Job

Explain why an opportunity exists and whether the recommended task is reasonable.

### User Decision

Is this a real opportunity or a false positive?

### Required Data

- Opportunity title.
- Opportunity type.
- Rule ID.
- Rule version.
- Dedupe key.
- Why now.
- TrafScore.
- Confidence.
- Score components.
- Evidence rows.
- Related queries.
- Related products.
- Related pages.
- Recommended task.
- Acceptance criteria preview.

### Layout

Desktop:

- Main column with why now, evidence rows, and recommended task.
- Right rail with rule trace, score breakdown, and related entities.

Mobile:

- Rule trace appears near the top.
- Evidence rows remain readable and not collapsed away by default.

### States

- Active.
- Approved into task.
- Rejected.
- Stale data.
- Missing related entity.
- Rule error.

### Actions

- Approve into task.
- Reject.
- Open task.
- Open related product/page/query references.

### Acceptance Criteria

- Opportunity and Task are visually distinct concepts.
- Rule ID/version are visible.
- Dedupe key or trace identity is visible for debugging.
- Each opportunity traces back to at least one query or cluster.
- Collection page gap references multiple products.

## Settings / Integrations Safety View

### Audience

Merchant/admin, SEO operator, agency analyst.

### Screen Job

Make data trust and external write safety visible.

### User Decision

Is the data connected and safe enough to run planning or create drafts?

### Required Data

- WooCommerce connection status.
- WordPress connection status.
- GSC connection or import status.
- Demo mode flag.
- Last sync.
- Last successful run.
- Sync errors.
- Credential safe status.
- WooCommerce read-only note.
- WordPress draft-only note.
- Audit log entry point.

### Layout

- Integration health list.
- Safety defaults panel.
- Sync run history preview.
- Error and reconnect guidance.

### States

- Demo mode.
- Connected.
- Disconnected.
- Pending.
- Failed.
- Degraded.
- Stale.
- Permission missing.

### Actions

- View sync details.
- Retry sync.
- Open audit log.
- Future: connect/disconnect.

### Acceptance Criteria

- Demo/mock and real connected states are visually distinct.
- Read-only and draft-only safety is visible.
- Errors are safe and actionable.
- No raw credentials appear.

