# Sprint 1 Backlog: Demo Decisioning Loop

## Team

- PM / Product Owner
- Tech Lead / Facilitator
- Backend Data Engineer
- Backend Decisioning Engineer
- Frontend Product Engineer
- QA / Test Lead

## Sprint Boundary

Sprint 1 proves the decisioning loop with demo/mock data.

UI implementation must follow the root `DESIGN.md`. The Refero Styles reference is used for its DESIGN.md method: define the screen job, audience, tokens, component roles, Do/Don't rules, and acceptance criteria before building UI.

Do not build in Sprint 1:

- Real WooCommerce OAuth or live store sync.
- Real Google Search Console OAuth.
- WordPress draft publishing.
- LLM asset generation.
- Shopify.
- Social/AI visibility/competitor crawling.

## User Stories

| ID | Story | Value |
|---|---|---|
| S1 | As a merchant, I can open a demo store with loaded products, pages, and search signals. | Experience core value without live integrations. |
| S2 | As a merchant, I can see ProductReadiness and TrafScore with score components. | Build trust in recommendations. |
| S3 | As a merchant, I can see query-product-page matches. | Prove recommendations are store-aware. |
| S4 | As a merchant, I can get at least 10 evidence-backed tasks. | Prove TrafScope tells me what to do. |
| S5 | As a merchant, I can see CTR refresh, ranking push, and collection page gap opportunities. | Cover the most explainable first opportunity types. |
| S6 | As a merchant, I can inspect opportunity/task evidence, related objects, action plan, and acceptance criteria. | Reduce AI-randomness concerns. |
| S7 | As an operator, I can rerun planning without duplicate tasks. | Prove the system can be used repeatedly. |
| S8 | As a user, I can approve or reject a task and see state persist. | Prepare the execution workflow. |

## P0 Backlog

| Item | Owner | Notes |
|---|---|---|
| Demo store fixture | Backend / PM | Outdoor coffee gear scenario. |
| Mock GSC ingest | Backend | 7/14/28-day query/page metrics with clicks, impressions, CTR, position. |
| ProductReadiness scoring | Backend / QA | Apply existing scoring model to demo products. |
| TrafScore breakdown | Backend / Frontend | Return total and components. |
| P0 graph relations | Backend Data | `sync_runs`, `query_product_matches`, `product_page_links`, `opportunity_entities`. |
| GraphBuilder v1 | Backend Engine | Rule/keyword matching first, no embeddings. |
| Opportunity rules v1 | Backend Engine | `high_impression_low_ctr`, `ranking_push`, `collection_page_gap`. |
| Opportunity dedupe | Backend / QA | Stable key from rule + query cluster + product/page. |
| Opportunity to Task | Backend | Preserve evidence, score, related entities, action plan, acceptance criteria. |
| Task status model | Backend / Frontend / QA | Sprint 1 supports `new`, `approved`, `rejected`, `snoozed`. |
| API-backed Board | Frontend | Use API DTO or local API fixture if backend endpoint lags. |
| Opportunity Detail | Frontend | Why now, evidence, score breakdown, related objects, recommended task. |
| Task Board / Detail | Frontend | Sorted by TrafScore, evidence summary visible. |
| Core tests | QA / Backend | Scoring, rules, dedupe, task inheritance, state transitions. |
| Demo smoke script | PM / QA / Frontend | Stable demo path. |

## P1 Backlog

- CSV GSC import.
- Lightweight query clustering.
- Product/query support previews.
- Sync run UI.
- Kanban view.
- More rules: `product_seo`, `buying_guide_gap`.
- Audit log preview.
- Empty and error states.

## Acceptance Criteria

- Demo store includes at least 20 products, 5 pages, and 50 query/page metric rows.
- Every opportunity returns TrafScore, confidence, score components, and evidence.
- Every generated task links to at least one query.
- `collection_page_gap` links to at least three products.
- `ranking_push` and `high_impression_low_ctr` link to at least one existing page.
- Weekly planning generates at least 10 tasks.
- Three rule types each generate at least one opportunity.
- Re-running planning three times does not produce duplicates.
- Approved, rejected, and snoozed states persist.

## Demo Script

1. Open the TrafScope demo store.
2. Confirm store, latest planning run, and mock integration health are visible.
3. Click `Run weekly planning`.
4. Show `12 prioritized traffic tasks found` or equivalent.
5. Review metrics: TrafScore average, query gaps, products ready, tracked assets.
6. Show the top three priority tasks:
   - Create collection page for portable espresso makers for camping.
   - Refresh rechargeable portable espresso maker product page.
   - Improve CTR for manual espresso maker query cluster.
7. Open the collection page gap opportunity.
8. Show query growth, matching in-stock products, missing page, and score breakdown.
9. Approve as task.
10. Open Task Detail and show action plan plus acceptance criteria.
11. Return to Task Board and confirm approved state.
12. Run planning again and show no duplicate task appears.

## Cadence

- Monday: Sprint planning, 45 minutes.
- Daily: Standup, 15 minutes.
- Wednesday: Product/design/engineering review, 45 minutes.
- Thursday: QA risk review, 30 minutes.
- Friday: Demo and retro, 45 minutes.
- Daily async: `Done / Next / Blocked`.
