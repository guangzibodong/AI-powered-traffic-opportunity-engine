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

UI implementation must follow the root `DESIGN.md`. The Refero Styles reference is used for its DESIGN.md method: define the screen job, audience, tokens, component roles, Do/Don't rules, and acceptance criteria before building UI. The concrete visual direction follows the Refero/Fal-style workspace: white canvas, fog gray surfaces, 1px borders, graphite actions, restrained type, and bilingual zh/en copy.

Do not build in Sprint 1:

- Real WooCommerce OAuth or live store sync.
- Real Google Search Console OAuth.
- WordPress draft creation or publishing.
- Automatic execution, autopilot, one-click apply, or live content publishing.
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
| S8 | As a user, I can approve, reject, or snooze a task and see state persist. | Prepare the execution workflow. |

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

## 当前能力快照

截至 2026-06-08，Sprint 1 已经从纯静态 mock UI 进入 API-backed demo planning 阶段。当前状态如下：

| 能力 | 状态 | 说明 |
|---|---|---|
| Demo fixture planning | 已完成 | 后端可用 demo fixture 生成 deterministic opportunities 和 tasks。 |
| Opportunity / task read API | 已完成 | `GET /opportunities`、`GET /opportunities/{id}`、`GET /tasks`、`GET /tasks/{id}` 已返回 Sprint 1 demo payload。 |
| API-backed board loading | 已完成 | 前端在 `VITE_USE_API_BOARD=true` 或设置 `VITE_API_BASE_URL` 时可读取 demo API；API 不可用时保留 mock fallback。 |
| Task review state API | 已完成后端能力 | `PATCH /tasks/{id}` 支持 `new`、`approved`、`rejected`、`snoozed`，状态在当前 API 进程内存中覆盖，并反映到 list/detail。 |
| Task shortcut routes | 已完成后端能力 | `POST /approve`、`POST /reject`、`POST /snooze` 已可更新 demo task review state。 |
| Frontend mutation client | Done | `updateTaskStatus` sends `PATCH { status }` for Sprint 1 review states. |
| Visible UI mutation wiring | Done | Task Detail approve/reject/snooze calls the demo API when API board data is connected, while preserving local fallback. |
| Review action feedback | Done | Task Detail shows pending, synced, local, and API-unavailable fallback feedback; fallback now exposes explicit `Retry sync` and `Keep local` controls. |
| Real integrations and publishing | 明确不做 | Sprint 1 不连接真实 WooCommerce/GSC/OAuth，不创建 WordPress draft，不做 live publish。 |

## Remaining API-backed Task Action UX

| ID | Owner | Action | Definition of Done |
|---|---|---|---|
| API-ACTION-001 | Frontend Product Engineer / QA | Done: add explicit retry/keep-local controls after local fallback. | Users can retry a failed API sync or intentionally keep the local review state. |
| API-ACTION-002 | QA Lead | Done: add automated browser-level API mutation coverage. | `pnpm --filter @trafscope/web run test:api-actions` covers API success, API fallback, retry sync, keep-local confirmation, unsafe status protection, and list/detail state consistency. |
| API-ACTION-003 | Product Ops / Documentation Lead | Keep demo script and release gates aligned. | Docs consistently say Sprint 1 approve/reject/snooze only changes review state. |

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
