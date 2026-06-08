# TrafScope MVP PRD

Date: 2026-06-08

Status: Frozen for Sprint 1 planning

## Product Summary

TrafScope is an AI-powered traffic opportunity engine for WooCommerce and WordPress merchants.

The MVP helps a merchant answer:

> What organic traffic action should I take next, why should I trust it, and how will I know whether it worked?

## MVP Product Identity

TrafScope MVP is a Traffic Operations Board, not a traditional SEO dashboard.

It turns demand signals into execution:

```txt
Signal -> Opportunity -> Action -> Asset -> QA -> Execution -> Performance
```

## Target Users

### Primary

WooCommerce / WordPress merchants with roughly 50-2,000 SKUs.

Their pain:

- They have GSC data but do not know which query deserves action.
- They have many products but do not know which pages to create or refresh.
- They do not trust generic AI recommendations unless evidence is visible.
- They want drafts and actions, not just reports.

### Secondary

SEO teams and agencies managing WooCommerce / WordPress stores.

Their pain:

- Manual audits do not scale.
- Client recommendations need evidence.
- Execution and performance follow-up are disconnected.

## MVP Problem Statement

Merchants and SEO operators have signals across GSC, products, pages, and content history, but those signals are fragmented. Existing SEO tools show data; AI writing tools generate text; spreadsheets hold execution state. None reliably answer what action to take next with commerce evidence, safe publishing, and performance follow-up.

## MVP Promise

Connect or import store/search data. Within 10 minutes, see a prioritized board of evidence-backed traffic tasks. Approve one, generate a structured draft, create a WordPress draft, and start tracking performance.

## Core User Flow

```txt
Use demo store or connect/import data
-> Run weekly planning
-> Review prioritized tasks
-> Open task detail
-> Inspect evidence and score breakdown
-> Approve, reject, or snooze
-> Generate structured asset draft
-> Review QA and facts
-> Create WordPress draft
-> Track GSC performance snapshot
```

Sprint 1 minimum flow:

```txt
Demo store -> Run planning -> Board -> Task detail -> Opportunity detail -> approve/reject/snooze
```

## MVP Scope

### Included

- Demo store with products, pages, and GSC-like metrics.
- Store-scoped Traffic Operations Board.
- ProductReadiness score.
- TrafScore score and score components.
- Query-product-page graph.
- Opportunity generation from deterministic rules.
- Task generation with evidence and acceptance criteria.
- Task state: `new`, `approved`, `rejected`, `snoozed`.
- Opportunity Detail and Task Detail.
- Structured asset draft model in Sprint 3.
- WordPress draft-only creation in Sprint 3.
- GSC performance snapshot in Sprint 3.
- Audit logs for write actions.

### Excluded

- Shopify.
- GA4 and Merchant Center.
- Backlink database.
- TikTok, YouTube, Reddit, Xiaohongshu scraping.
- Full AI visibility monitoring.
- Competitor crawling.
- Automatic live publishing.
- LLM-led ranking or scoring.
- Full rich text editor.
- Advanced agency multi-store workspace.
- Yoast / RankMath deep adapters.
- Complex semantic matching as MVP decisioning.

## MVP Screens

### Traffic Operations Board

Purpose: answer what to do next.

Must show:

- Store name.
- Last sync/planning time.
- Integration health.
- `Run weekly planning`.
- TrafScore average.
- Query gaps.
- Products ready.
- Tracked assets.
- Top 5-10 tasks sorted by priority.
- Top opportunities side rail.

Acceptance:

- First viewport answers the top 1-3 actions.
- Each visible task has evidence or an evidence preview.
- Planning job state is explicit.

### Tasks And Task Detail

Purpose: help the user decide whether to approve an action.

Must show:

- Task title.
- Category.
- Status.
- Automation level.
- TrafScore or priority score.
- Evidence summary.
- Related queries, products, pages.
- Action plan.
- Acceptance criteria.
- Source opportunity link.

Actions:

- Approve.
- Reject.
- Snooze.
- Generate draft only after approval.

Acceptance:

- A task without evidence is a blocking error.
- Rejected tasks are retained and suppress noisy regeneration.

### Opportunities And Opportunity Detail

Purpose: explain why an opportunity exists.

Must show:

- Rule ID and rule version.
- Why now.
- TrafScore.
- Score components.
- Evidence rows.
- Related entities.
- Recommended task.
- Dedupe key or equivalent trace identity.

Acceptance:

- Opportunity and Task concepts remain separate.
- Each opportunity traces back to at least one query or query cluster.

### Asset Draft Review

Purpose: review structured content before creating a WordPress draft.

Must show:

- Task context.
- Target queries.
- Related products/pages.
- Evidence references.
- Title.
- Slug.
- Meta title and description.
- Structured content blocks.
- FAQ.
- Schema preview.
- Internal links.
- Claim ledger.
- QA checks.
- `Create WordPress draft`.

Acceptance:

- No full rich text editor in MVP.
- No WordPress live publish path.
- Blocking QA prevents draft creation.

### Performance

Purpose: show whether an execution is working.

Must show:

- Baseline snapshot.
- After snapshot.
- Clicks, impressions, CTR, average position.
- Tracking state.
- Next refresh time.

Acceptance:

- MVP does not claim complex attribution.
- It shows measurable GSC movement or tracking state.

### Settings / Integrations

Purpose: make data trust and integration safety visible.

Must show:

- WooCommerce connection state.
- WordPress connection state.
- GSC connection/import state.
- Last sync status.
- Sync errors.
- Draft-only publishing safety.
- Read-only WooCommerce safety.
- Audit log entry point.

## Opportunity Rules

### Sprint 1 Rules

| Rule | Trigger | Output |
|---|---|---|
| `high_impression_low_ctr` | High impressions, low CTR, existing relevant page. | CTR refresh task. |
| `ranking_push` | Average position 4-20, meaningful impressions/clicks, improvable page. | Ranking push task. |
| `collection_page_gap` | Query cluster maps to multiple active/in-stock products and no matching page exists. | Collection page task. |

### Sprint 2/3 Rules

| Rule | Timing | Notes |
|---|---|---|
| `product_seo` | Sprint 2 | Needs real WooCommerce product data. |
| `buying_guide_gap` | Sprint 2/3 | Needs reliable intent and product graph. |
| `comparison_page_gap` | Later | Requires source controls and competitor fact safety. |
| `ai_citation_gap` | Later | Not MVP monitoring. Citation readiness lives in QA. |

## Evidence Contract

Every opportunity and task must include:

- Data source.
- Date range.
- Sync/import/planning run ID.
- Query or query cluster.
- Impressions.
- Clicks.
- CTR.
- Average position.
- Page URL if applicable.
- Product IDs if applicable.
- Product status and readiness if applicable.
- Match type.
- Match confidence.
- Match reason.
- Rule ID.
- Rule version.
- Dedupe key.
- Score components.
- Action plan.
- Acceptance criteria.
- Baseline tracking reference when available.

LLMs may summarize evidence but may not create evidence.

## Task Status Model

Sprint 1 user-facing task statuses:

- `new`
- `approved`
- `rejected`
- `snoozed`

Future internal statuses:

- `draft_generated`
- `needs_review`
- `wordpress_draft_created`
- `failed`

Rules:

- `new -> approved`
- `new -> rejected`
- `new -> snoozed`
- `approved -> draft_generated`
- `draft_generated -> needs_review`
- `needs_review -> wordpress_draft_created`
- Rejected tasks do not regenerate as new duplicates without explicit restore.
- No status may imply live publish in MVP.

## AI Requirements

AI may assist:

- Intent classification.
- Opportunity explanation.
- Task action plan copy.
- Structured draft generation.
- Draft QA assistance.
- Performance narrative.

AI may not:

- Rank opportunities.
- Calculate TrafScore.
- Calculate ProductReadiness.
- Create evidence.
- Invent product facts.
- Invent prices, inventory, reviews, certifications, shipping claims, competitor facts, or schema facts.
- Publish live.
- Write to WooCommerce.

All LLM output must be JSON and pass:

1. JSON parse.
2. Schema validation.
3. Domain validation.
4. Publish validation.

## Asset Draft Model

Asset draft fields:

- `asset_type`
- `task_context`
- `metadata`
- `content_blocks`
- `faq_items`
- `schema_json`
- `internal_links`
- `claim_ledger`
- `qa_checks`
- `publish_preview`
- `review_state`

Content block types:

- `intro`
- `answer_summary`
- `product_grid`
- `product_spotlight`
- `buying_criteria`
- `comparison_table`
- `faq`
- `metadata_only`
- `internal_link_suggestions`
- `call_to_action`

## Success Metrics

Sprint 1:

- Demo planning generates at least 10 evidence-backed tasks.
- Three Sprint 1 rules each generate at least one opportunity.
- Re-running planning three times produces no duplicate tasks.
- Every task includes evidence, score, related entities, action plan, and acceptance criteria.
- Task approve/reject/snooze state persists.

MVP:

- Time to first opportunity: under 10 minutes from demo/import/connect.
- At least one top task is approved by a user in the demo flow.
- Approved task can generate a structured draft.
- WordPress draft can be created without live publish.
- GSC baseline and after snapshot can be shown.

## Release Gates

MVP cannot be called ready unless:

- Backend core tests pass.
- Frontend typecheck and build pass.
- Demo E2E smoke passes.
- No task is shown without evidence.
- No live publish UI or API path exists.
- WooCommerce remains read-only.
- Secrets are not exposed in responses, logs, snapshots, frontend state, or screenshots.
- Write actions create audit logs.
- WordPress publish path forces `status=draft`.

