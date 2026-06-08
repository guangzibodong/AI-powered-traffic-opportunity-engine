# TrafScope Sprint 1 QA Strategy

Date: 2026-06-08

Owner: QA / Test Lead

## Scope

Sprint 1 proves the Demo Decisioning Loop:

```txt
demo store + mock GSC signals
-> product/query/page graph
-> deterministic opportunities
-> deduplicated tasks
-> Traffic Operations Board
-> Task Detail
-> approve / reject / snooze state review
```

This QA plan covers only Sprint 1 behavior. Real WooCommerce sync, real WordPress publishing, real GSC OAuth, LLM asset generation, and performance tracking are out of scope except where a contract or safety guard must already exist.

## Quality Goal

The Sprint 1 demo is acceptable only if a user can trust that every displayed task came from deterministic evidence, has a reproducible score, explains why it should be done, and cannot imply unsafe publishing behavior.

The demo can be simple. It cannot be vague, random, duplicate-heavy, or unsafe.

## Test Strategy

### Test Pyramid

- Backend unit tests: 55%
  Scoring, ProductReadiness, opportunity rules, graph matching helpers, task creation, dedupe, and status transitions.
- Backend contract/API tests: 25%
  Store-scoped demo endpoints, opportunity/task DTOs, schema validation, error states, and fixture stability.
- Rule-engine fixture tests: 10%
  Fixed demo datasets that prove each rule triggers, does not trigger, and deduplicates correctly.
- Frontend component/workbench tests: 5%
  Task cards, evidence display, metric tiles, integration states, empty/error states.
- E2E demo smoke tests: 5%
  Browser-level flow from demo planning to task board review.

### QA Principles

- Deterministic first: same input fixtures must produce the same opportunities, scores, task order, and dedupe keys.
- Evidence required: no opportunity or task may be shown without query/page/product evidence.
- Commerce-aware: out-of-stock, draft, private, or weak product records must not be promoted as high-priority traffic targets without an explicit fix-oriented reason.
- Store-scoped: all API responses and UI screens must remain scoped to the active store.
- Draft-safe: Sprint 1 UI and contracts must not expose or imply live publishing.
- Explainable: TrafScore and ProductReadiness must be visible enough for debugging and user trust.

## Required Test Data

Maintain one stable demo fixture set for Sprint 1:

- Store: `Outdoor Coffee Gear Demo Store`
- Products:
  - At least 12 total products.
  - At least 8 active products.
  - At least 5 in-stock products matching one collection gap.
  - At least 2 weak-readiness products for product/page fit checks, even if product SEO rule is Sprint 2.
  - At least 1 out-of-stock product to prove inventory affects priority.
- Pages:
  - At least 1 existing product page.
  - At least 1 existing category or guide page.
  - At least 1 intentional missing collection page.
- GSC metrics:
  - 28-day and 14-day windows.
  - At least 1 high-impression low-CTR query/page group.
  - At least 1 ranking 4-20 query/page group.
  - At least 1 query cluster with multiple matching products and no target page.
  - Low-volume noise rows that should not generate tasks.
  - Brand-query rows that should not dominate non-brand opportunity ranking.

Fixture expectations should be checked into tests as named snapshots or explicit expected objects, not hidden in assertions spread across multiple files.

## Backend Unit Tests

### Scoring

Cover `calculate_trafscore`:

- Uses the declared weighted formula.
- Rounds to two decimals.
- Allows 0 and 100 boundaries.
- Rejects values below 0 or above 100.
- Produces stable output for a full component set.
- Does not silently ignore unknown or missing components once schema validation is added.

Cover `calculate_product_readiness`:

- Uses the declared weighted formula.
- Inventory-sensitive products score lower when `stock_score` is low.
- Missing content/schema/image components reduce readiness.
- Boundary and invalid values match TrafScore validation behavior.

Acceptance:

- Core scoring tests pass 100%.
- Weight changes require test updates and an explicit rule/version note.
- A failed score validation prevents opportunity creation.

### Task Service

Cover `TaskService.create_from_opportunity`:

- Copies title, recommended task type, TrafScore, confidence, and evidence from opportunity to task.
- Sets default status to `new`.
- Uses `generate_draft` for known draftable categories.
- Falls back to `recommend_only` for unknown categories.
- Includes `steps`, `acceptance_criteria`, `source_summary`, and `confidence` in `action_plan`.
- Keeps evidence as structured data, not just plain text.

Acceptance:

- Every generated task has evidence, priority score, action plan, and acceptance criteria.
- Unknown opportunity types cannot crash task generation.

### Task Status Model

Sprint 1 should validate the status model used by the demo and API.

Required Sprint 1 task statuses:

- `new`
- `approved`
- `rejected`
- `snoozed`

Transitions to test:

- `new -> approved`
- `new -> rejected`
- `new -> snoozed`
- `approved -> new` when an explicit reset/restore path is supported by the API
- `rejected -> new` when an explicit reset/restore path is supported by the API
- `snoozed -> new` when an explicit reset/restore path is supported by the API

Unsafe or future statuses to reject in Sprint 1:

- `draft_generated`
- `failed`
- `published`
- `applied`
- `autopilot`
- `one_click_apply`

Acceptance:

- UI labels and backend values map cleanly.
- Demo task status mutation accepts only `new`, `approved`, `rejected`, and `snoozed`.
- Rejected tasks are preserved for dedupe suppression.
- No Sprint 1 path moves a task to `draft_generated`, `failed`, `published`, or `applied`.

## Rule Engine Tests

Sprint 1 rule engine should be deterministic and fixture-backed. LLMs must not participate in ranking or triggering.

### Rule: `high_impression_low_ctr`

Trigger when:

- Impressions exceed the configured demo threshold.
- CTR is below the configured threshold.
- Position is good enough that title/meta refresh is plausible.
- A page exists for the query/page pair.

Do not trigger when:

- Impressions are too low.
- CTR is already healthy.
- Query is unrelated to any store page.
- The only matched page is non-indexable or excluded.

Expected output:

- Opportunity type: `ctr_refresh`
- Recommended task type: `ctr_refresh`
- Evidence includes query, page URL, impressions, clicks, CTR, position, and date window.
- Score components include traffic potential, gap, timing, execution ease, and confidence.

### Rule: `ranking_push`

Trigger when:

- Average position is between 4 and 20.
- Query has meaningful impressions or clicks.
- Existing page can be improved.

Do not trigger when:

- Position is top 3 with healthy CTR.
- Position is worse than 20 and traffic potential is weak.
- No relevant page exists, in which case collection/page-gap rules should own it.

Expected output:

- Opportunity type: `ranking_push`
- Recommended task type: `ranking_push`
- Evidence includes target query, page, position, impressions, current CTR, and missing subtopic or internal-link reason if available.

### Rule: `collection_page_gap`

Trigger when:

- A query or query cluster maps to multiple active products.
- Enough matched products are in stock.
- No existing collection/category/page covers the cluster.

Do not trigger when:

- Only one product matches.
- Matching products are mostly out of stock.
- An equivalent collection page already exists.
- The query is purely informational and better suited to a guide.

Expected output:

- Opportunity type: `collection_page_gap`
- Recommended task type: `collection_page`
- Evidence includes query cluster, matched products, stock count, missing page reason, and target intent.

### Dedupe Rules

Test dedupe by:

- Running the same planning job twice.
- Running with reordered fixture rows.
- Running with duplicate query/page metrics.
- Rejecting one task, then planning again.

Acceptance:

- No duplicate opportunity for the same `rule_id + rule_version + store_id + dedupe_key`.
- No duplicate task for the same opportunity or equivalent task dedupe key.
- Rejected/snoozed/failed records are retained and suppress noisy regeneration according to product rules.

## Graph And Matching Tests

Sprint 1 graph tests should validate relationships even if matching logic is simple.

Required relations:

- Query to product match with `match_type`, `confidence`, and human-readable reason.
- Product to page link with link type, such as `product_page`, `collection_page`, `guide`, or `comparison`.
- Opportunity to entities, including query, product, page, and category references when present.

Test cases:

- Exact term match from query to product title/category.
- Attribute match from query to product attributes.
- Category cluster match to several products.
- No match for unrelated query.
- Ambiguous match receives lower confidence or requires multiple evidence points.
- Existing page link prevents false page-gap generation.

Acceptance:

- Every generated opportunity can be traced back to at least one query or query cluster.
- Collection page opportunities reference at least two products.
- Ranking and CTR opportunities reference an existing page.
- Match confidence is stored and exposed for debugging.

## Schema And API Contract Tests

Sprint 1 API and shared contracts must stabilize enough for frontend work.

### DTO Requirements

`Opportunity` must include:

- `id`
- `storeId`
- `title`
- `opportunityType`
- `summary`
- `recommendedTaskType`
- `trafscore`
- `confidence`
- `status`
- `evidence`
- `scoreComponents`
- `relatedQueries`
- `relatedProducts`
- `relatedPages`
- `dedupeKey`

`Task` must include:

- `id`
- `storeId`
- `opportunityId`
- `title`
- `category`
- `automationLevel`
- `status`
- `priorityScore` or frontend-normalized `trafscore`
- `evidence`
- `actionPlan`
- `relatedQueries`
- `relatedProducts`
- `relatedPages`
- `acceptanceCriteria`

`EvidenceItem` must include:

- `type`
- `source`
- `text`
- `metrics` when numeric evidence exists
- `entityRefs` when tied to product/page/query records

### Contract Checks

- Backend may use snake_case internally, but API client must normalize frontend props to camelCase.
- Numeric fields must be numbers, not formatted strings.
- Empty lists must be `[]`, not null.
- Optional fields must have documented defaults.
- IDs must be stable across repeated demo planning runs.
- API errors must return safe messages without secrets, stack traces, or raw credentials.

Acceptance:

- Contract tests validate representative JSON for opportunities, tasks, integrations, and dashboard summary.
- Frontend mock data and backend demo responses use the same shape or an explicit adapter.
- Schema changes require updating shared types and tests in the same PR.

### Demo Task Status API

Verify the demo API supports state-only task review without external writes:

- `PATCH /api/stores/:storeId/tasks/:taskId` accepts `{ "status": "new" }`, `{ "status": "approved" }`, `{ "status": "rejected" }`, and `{ "status": "snoozed" }`.
- `POST /api/stores/:storeId/tasks/:taskId/approve` returns the same task with status `approved`.
- `POST /api/stores/:storeId/tasks/:taskId/reject` returns the same task with status `rejected`.
- `POST /api/stores/:storeId/tasks/:taskId/snooze` returns the same task with status `snoozed`.
- List and detail reads return the updated status for the same demo process.
- Unknown task IDs return a safe 404 response.
- Unsupported status values, including `draft_generated`, `failed`, `published`, `applied`, `autopilot`, and `one_click_apply`, return a safe 400 response.
- The mutation is store-scoped and does not create WordPress, WooCommerce, or asset-generation side effects.

Verification commands:

```bash
cd apps/api
python -B -m unittest app.tests.test_demo_planning_api
python -B -m unittest discover app/tests
```

## Frontend Workbench Tests

### Traffic Operations Board

Verify:

- Store name is visible.
- `Run weekly planning` action is visible and has loading/disabled/error states once wired.
- Summary tiles render TrafScore average, query gaps, products ready, and tracked assets.
- Top tasks are ordered by priority descending.
- At least 5 top tasks can render without layout breakage.
- Empty state explains that demo data or integration sync is needed.
- Failed planning state shows a recoverable error.

Acceptance:

- User can answer in 30 seconds: what should I do, why, and what is the next action?

### Task Cards

Every card must show:

- Score or priority.
- Task title.
- Category.
- Status.
- Automation level.
- Evidence summary.
- Related object counts or chips.
- Primary action, such as `Review` or `Generate draft`.

Test states:

- New task.
- Approved task.
- Rejected task.
- Failed task.
- Long title.
- Missing optional related page.
- Zero evidence should render as a blocking error state, not a normal task.

### Task Detail Navigation And Review

Verify:

- Every visible task card or task row is clickable, not only the first/top task.
- Clicking a task opens the corresponding Task Detail for the same `taskId`.
- The detail title, status, score, evidence, related entities, action plan, and acceptance criteria match the selected task.
- Browser back or the provided return affordance brings the user back to the board without losing current status.
- Directly loading a valid Task Detail URL renders the same task.
- Unknown task IDs render a safe not-found or recoverable error state.
- Approve, reject, and snooze controls call the demo status API from the UI and show pending/synced/fallback feedback.
- Review controls are disabled while a mutation is pending, then re-enabled after success or fallback.
- API failure keeps a safe local fallback state and shows non-technical feedback without raw stack traces or credentials.
- API failure feedback lets the user retry demo API sync or intentionally keep the local review state.
- Updated status is reflected on both Task Detail and the board after return or refresh.

Acceptance:

- A user can click any task in the board and land on the matching Task Detail.
- No task click opens stale, hard-coded, or mismatched detail content.
- API-backed review success, API-unavailable fallback, retry sync, and keep-local confirmation are visible from Task Detail.
- Status review remains state-only and cannot imply draft generation or live publishing.

### Opportunity Detail Or Panel

Verify:

- TrafScore and confidence are visible.
- Why-now summary is visible.
- Evidence rows are visible and source-labeled.
- Score breakdown can be inspected.
- Opportunity task actions inherit the same state-only review boundary; loading/error feedback must never imply publishing.

### Integration Status

Even in Sprint 1 demo mode, verify:

- WooCommerce, WordPress, and GSC statuses are displayed.
- Demo/mock mode is clearly distinguishable from real connected integrations.
- Pending and failed states do not block the demo when fixtures are intentionally enabled.

## E2E Demo Script

The E2E script should run in a real browser against the local app and fixture-backed API or mock data.

### Script: Demo Decisioning Loop

1. Open the app.
2. Confirm the demo store name is visible.
3. Confirm integration status panel is visible.
4. Click or trigger `Run weekly planning`.
5. Wait for planning to complete or for fixture tasks to appear.
6. Verify summary metrics render.
7. Verify at least 10 evidence-backed tasks are available in the data layer or API response.
8. Verify the visible top task has:
   - Score.
   - Title.
   - Category.
   - Status.
   - Evidence summary.
   - Next action.
9. Click multiple visible tasks, including a non-top task, and verify each opens the matching Task Detail by task ID or title.
10. Return to the board after each detail check and confirm the task list still renders.
11. Open or inspect an opportunity detail view when available.
12. Verify evidence includes query/page/product references.
13. Approve, reject, and snooze a task through the UI or API-backed control path when available.
14. Verify task status changes without duplicate task creation.
15. Attempt to find live publish controls.
16. Confirm no live publish action exists.

Acceptance:

- The demo flow passes in desktop and mobile-sized viewports.
- No obvious overlapping text or broken layout on the board.
- Screenshots are captured for board, task evidence, and any detail view.
- Console has no uncaught runtime errors.

API-backed status smoke:

```bash
cd apps/api
python -B -m unittest app.tests.test_demo_planning_api
```

## Publishing Safety Red Lines

Sprint 1 must preserve these safety rules even before publishing is implemented:

- No UI label may say or imply `Publish live`.
- No API route may accept a WordPress status of `publish` for MVP draft flow.
- No task may move directly from `new` or `approved` to a live published state.
- No fixture, test, or mock response should normalize unsafe publish behavior.
- No WooCommerce product update, stock update, price update, or page overwrite action may exist in Sprint 1.
- Generated action plans must describe draft creation or review, not automatic live publication.
- Any future publish contract must default to `draft` and require explicit approval.
- Secrets, API keys, application passwords, OAuth tokens, and raw credential payloads must never appear in frontend props, API responses, logs, screenshots, or test snapshots.

Release blocker examples:

- A button labeled `Publish` with no draft qualifier.
- A backend default payload setting WordPress `status` to `publish`.
- A successful path that overwrites an existing page.
- A task shown without evidence.
- A duplicated top task after repeated planning.
- A high-priority task recommending out-of-stock products without a fix-first reason.

## Sprint 1 Acceptance Checklist

### Demo Data

- [ ] Demo store fixture exists and loads consistently.
- [ ] Mock GSC metrics include 28-day and 14-day windows.
- [ ] Fixture has at least one case for CTR refresh, ranking push, and collection page gap.
- [ ] Low-quality/noise rows do not generate high-priority tasks.

### Backend

- [ ] TrafScore tests cover formula, rounding, boundaries, and invalid values.
- [ ] ProductReadiness tests cover formula, inventory impact, and invalid values.
- [ ] Rule tests cover trigger and non-trigger cases for all three Sprint 1 rules.
- [ ] Graph tests prove query-product-page relationships are persisted or returned.
- [ ] Opportunity records include rule id, rule version, score components, evidence, entities, and dedupe key.
- [ ] Task creation copies evidence, score, summary, confidence, and acceptance criteria.
- [ ] Demo task status API supports PATCH plus approve/reject/snooze action endpoints.
- [ ] Demo task status API accepts only `new`, `approved`, `rejected`, and `snoozed`.
- [ ] Demo task status API rejects unsafe future states with safe 400 errors.
- [ ] Planning is idempotent across repeated runs.
- [ ] Rejected tasks do not reappear as new duplicates.
- [ ] Store-scoped APIs do not leak records across stores.

### Schema Contracts

- [ ] Opportunity DTO matches the agreed fields.
- [ ] Task DTO matches the agreed fields.
- [ ] EvidenceItem supports metrics and entity references.
- [ ] API client or shared type layer resolves snake_case/camelCase mismatch.
- [ ] Error responses are safe and structured.

### Frontend

- [ ] Traffic Operations Board shows store, planning action, summary metrics, priority tasks, and integration status.
- [ ] Task cards show score, category, status, automation level, evidence, related objects, and next action.
- [ ] Clicking any task opens the corresponding Task Detail.
- [ ] Task Detail status review can approve, reject, and snooze without implying publishing.
- [ ] Opportunity/task evidence is visible without opening developer tools.
- [ ] Empty, loading, failed, and demo modes are represented.
- [ ] Desktop and mobile layouts have no major overlap or clipped labels.

### E2E

- [ ] Browser smoke test opens the app.
- [ ] Demo store is visible.
- [ ] Planning produces or displays task data.
- [ ] At least one task detail/evidence path is verified.
- [ ] A non-top task opens the matching Task Detail.
- [ ] Approve/reject/snooze status mutation is verified through UI controls.
- [ ] API-backed success feedback, API-unavailable local fallback feedback, retry sync, and keep-local confirmation are verified.
- [ ] Repeated planning does not duplicate the task.
- [ ] No live publish control is present.
- [ ] Console has no uncaught runtime errors.

### Safety

- [ ] No live WordPress publishing path exists.
- [ ] No WooCommerce write path exists.
- [ ] All action plans use draft/review wording.
- [ ] Demo task status mutations are state-only and restricted to Sprint 1 safe statuses.
- [ ] No secrets appear in logs, responses, screenshots, or snapshots.
- [ ] Unsafe publish behavior is covered by tests or explicit assertions.

## Exit Criteria

Sprint 1 can be accepted when:

- Demo planning reliably produces at least 10 tasks.
- The top tasks are deterministic across repeated runs.
- Every task has evidence, related entities, TrafScore or priority score, action plan, and acceptance criteria.
- The three Sprint 1 opportunity rules have positive and negative tests.
- Dedupe is proven by repeated planning runs.
- Frontend board renders the prioritized work clearly.
- Clicking any board task opens its corresponding Task Detail.
- Demo task status API supports PATCH/approve/reject/snooze and rejects unsafe statuses.
- E2E demo smoke passes in a real browser.
- Publishing safety red lines are still intact.

If any exit criterion fails, the sprint can still demo work in progress, but it should not be called a completed Demo Decisioning Loop.
