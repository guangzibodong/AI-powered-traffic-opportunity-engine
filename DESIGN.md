# TrafScope Design System

> Inspired by the DESIGN.md method from Refero Styles: give AI builders a concrete visual system before asking for screens. This is TrafScope's own system, not a copy of any Refero example.

## Product Job

TrafScope is a traffic operations workspace for WooCommerce and WordPress merchants. The interface should help a merchant decide:

1. What traffic action should I take next?
2. Why does the system recommend it?
3. What will happen if I approve it?
4. How will we know whether it worked?

The UI should feel like a calm command room for ecommerce growth: dark, focused, evidence-backed, and operational.

## Theme

Dark operational workspace with restrained editorial hierarchy.

Use dark surfaces, low-contrast borders, precise typography, and quiet accent colors. Do not make it a glossy AI dashboard, a marketing landing page, or a generic SaaS card wall.

## Tokens - Colors

| Name | Value | Token | Role |
|---|---:|---|---|
| Void | `#0f1216` | `--color-background` | App background and main canvas. |
| Panel | `#171b21` | `--color-panel` | Primary work surfaces and grouped regions. |
| Panel Raised | `#1d232b` | `--color-panel-raised` | Hovered cards, selected rows, active tabs. |
| Hairline | `rgba(214, 224, 236, 0.12)` | `--color-border` | Borders, dividers, grid lines. |
| Text | `#f4f7f8` | `--color-text` | Primary text. |
| Muted | `#9aa8b5` | `--color-muted` | Secondary text, timestamps, helper labels. |
| Subtle | `#687584` | `--color-subtle` | Tertiary text and disabled labels. |
| Signal | `#57d0b2` | `--color-signal` | Primary action, healthy states, positive movement. |
| Search Blue | `#8fb8ff` | `--color-search` | Query/search evidence and GSC metrics. |
| Commerce Amber | `#f5bd5b` | `--color-commerce` | Product/inventory evidence and caution states. |
| Risk Red | `#f07878` | `--color-risk` | Failed sync, rejected task, destructive warning. |

Color rule: one dominant dark neutral system plus two functional accents. Green is action/health, blue is search evidence, amber is commerce/inventory. Avoid decorative gradients and hue-heavy backgrounds.

## Tokens - Typography

Use system sans by default. If custom fonts are added later, use a utilitarian sans for UI and an editorial serif only for large page titles or empty-state statements.

| Role | Size | Weight | Line Height | Use |
|---|---:|---:|---:|---|
| Display | 40-48px | 400 | 1.05 | Top-level board title only. |
| Page Title | 28-32px | 600 | 1.15 | Main page headings. |
| Section Title | 18-20px | 600 | 1.3 | Panel headings. |
| Card Title | 15-16px | 600 | 1.35 | Task and opportunity titles. |
| Body | 14px | 400 | 1.5 | Evidence, summaries, descriptions. |
| UI Label | 12-13px | 600 | 1.2 | Pills, table headers, metadata. |
| Metric | 24-32px | 600 | 1.1 | Numeric score or KPI. |

Do not scale type with viewport width. Letter spacing should remain normal except tiny uppercase labels, which may use slight positive tracking.

## Tokens - Spacing And Shape

| Token | Value | Role |
|---|---:|---|
| `--space-1` | 4px | Tight icon/text gaps. |
| `--space-2` | 8px | Pills, compact rows. |
| `--space-3` | 12px | Card inner gaps. |
| `--space-4` | 16px | Panel padding compact. |
| `--space-5` | 20px | Panel padding comfortable. |
| `--space-6` | 24px | Page section gaps. |
| `--space-8` | 32px | Main layout gutters. |

Shapes:

- Cards and panels: 8px radius.
- Buttons and inputs: 6-8px radius.
- Pills, status chips, segmented filters: 999px radius.
- Avoid large rounded cards in the product app even if the reference examples use them; TrafScope is an operations tool.

## Layout Rhythm

- First screen is the Traffic Operations Board.
- Keep the layout dense enough for scanning but not cramped.
- Use a fixed left navigation or compact top navigation, plus a main content area.
- Prefer two-column workbench layouts:
  - Main column: priority tasks, opportunity/task detail, or asset editor.
  - Side rail: integration health, score breakdown, QA checks, related entities.
- Use full-width sections or panels. Do not nest cards inside cards.
- Show actions close to the evidence that justifies them.

## Components

### Traffic Operations Board

Purpose: answer what to do next.

Must include:

- Store name and latest planning run.
- Integration health.
- Primary action: `Run weekly planning`.
- Metrics: TrafScore average, query gaps, products ready, tracked assets.
- Top 5-10 priority tasks.
- Top opportunities side rail.

### Task Card

Purpose: make a recommendation scannable and credible.

Must include:

- TrafScore.
- Task title.
- Category.
- Status.
- Automation level.
- Evidence summary.
- Related query/product/page counts.
- Primary next action.

Never show a task without evidence.

### Opportunity Detail

Purpose: explain why this opportunity exists.

Must include:

- Why now.
- Rule ID and rule version.
- TrafScore and score breakdown.
- Evidence rows.
- Related products, queries, and pages.
- Recommended task.
- Acceptance criteria preview.

### Asset Draft Entry

Purpose: prepare the later draft workflow without pretending Sprint 1 publishes content.

Must include:

- Placeholder or disabled entry for draft generation.
- Explanation that Sprint 1 proves decisioning only.
- Future draft fields: title, slug, meta title, meta description, sections, FAQ, schema.

### Evidence Row

Purpose: show source and confidence.

Use compact rows with:

- Evidence type icon.
- Metric or claim.
- Source object.
- Date range.
- Confidence or severity.

## Do

- Start with the user job and screen type before styling.
- Use real task data and evidence in mock UI.
- Make status and next action obvious.
- Keep controls restrained and readable.
- Use pills/tabs for filters and states.
- Make score breakdown accessible from every opportunity/task detail.
- Preserve draft-only and human-approval boundaries in UI copy.

## Don't

- Do not create a marketing landing page for the app shell.
- Do not use generic AI gradients, decorative orbs, or bokeh backgrounds.
- Do not bury evidence behind charts only.
- Do not show huge hero typography inside dashboard panels.
- Do not make every object a floating card.
- Do not use a one-note green/teal palette; keep blue and amber as functional evidence accents.
- Do not imply live publishing exists in Sprint 1.

## Prompt Guide For Future UI Work

When asking an AI agent to design or build a TrafScope screen, include:

1. The screen type: board, task detail, opportunity detail, asset editor, performance view.
2. The audience: WooCommerce merchant, content operator, agency analyst.
3. The user decision: what they need to decide on this screen.
4. Required content: tasks, evidence, score breakdown, related objects, state, action.
5. Visual constraints from this DESIGN.md.
6. Acceptance criteria: responsive layout, no overlap, clear states, accessible contrast, realistic data.

Good prompt shape:

```txt
Build the TrafScope Task Detail screen for a WooCommerce merchant reviewing a collection-page opportunity. Use the TrafScope DESIGN.md system. The user must understand why the task exists, which queries/products/pages it affects, what the action plan is, and whether they should approve or reject it. Use realistic evidence rows and score breakdown. Keep the UI dark, dense, operational, and draft-safe.
```

## Acceptance Criteria

- The first viewport makes the next best action clear.
- Every recommendation has evidence visible or one click away.
- Text never overflows cards, buttons, tables, or side rails.
- Mobile layout stacks without losing evidence or primary actions.
- Dark surfaces retain accessible contrast.
- UI remains operational and commerce-aware, not decorative.

