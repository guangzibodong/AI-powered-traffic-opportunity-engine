# TrafScope Commerce OS Requirements Workshop

Date: 2026-06-08

## Participants

- Product Manager
- UI/UX Designer
- Frontend Engineer
- Backend Engineer
- QA Engineer
- Codex Facilitator

## Meeting Goal

Align the first buildable version of TrafScope Commerce OS: a WooCommerce and WordPress-first AI traffic operator that turns product, page, and Google Search Console signals into prioritized growth tasks and draft assets.

## Core Product Question

What is the smallest version that proves merchants will trust TrafScope to decide what organic traffic actions they should take next?

## Agenda

1. Confirm target user and job-to-be-done.
2. Define MVP user flow.
3. Identify must-have product surfaces.
4. Align backend data and service boundaries.
5. Align frontend implementation shape.
6. Define QA gates and release criteria.
7. Decide Sprint 1-3 scope.

## Working Assumptions

- WooCommerce and WordPress are first-class integrations.
- Google Search Console is required for real opportunity generation, but mock/imported GSC data is acceptable for the first demo.
- MVP defaults to draft assist, not autopilot.
- No live WordPress or WooCommerce changes happen without explicit approval.
- Deterministic scoring and rules come before heavy LLM automation.

## Workshop Output

The sections below should be filled from role reviews and consolidated into decisions.

### Product View

- Primary ICP: WooCommerce / WordPress merchants with roughly 50-2,000 SKUs, plus agencies managing WooCommerce SEO for multiple clients.
- Core JTBD: when store owners have products, pages, and GSC data but do not know what to optimize first, TrafScope should translate search demand into prioritized, evidence-backed traffic tasks.
- MVP must solve five problems:
  - Data ingestion from WooCommerce, WordPress, and GSC or demo/import equivalents.
  - Query-product-page mapping.
  - Opportunity prioritization with TrafScore and ProductReadiness.
  - Opportunity-to-task conversion with evidence, affected objects, action plan, and acceptance criteria.
  - Post-execution tracking through at least GSC performance changes.
- Product risk: generated opportunities may feel untrustworthy or AI-random. Every task must be tied to real evidence, deterministic scoring, and concrete products/pages/queries.
- PM recommendation: Sprint 1 proves the demo loop, Sprint 2 connects real data, Sprint 3 ships draft generation and performance tracking.

### UI/UX View

- The first screen should be a Traffic Operations Board, not a traditional analytics dashboard.
- MVP navigation should stay light: Board, Opportunities, Assets, Performance, Settings. Products and Queries can appear as linked objects inside details before becoming top-level sections.
- Dashboard hierarchy:
  - Store, last sync, integration health, and `Run weekly planning`.
  - Summary metrics: TrafScore average, query gaps, products ready, tracked assets.
  - Next best tasks, showing the top 5-10 prioritized actions.
  - Top opportunities and integration status in the side rail.
- Task cards must show title, category, TrafScore, status, automation level, evidence summary, related objects, and next action.
- Opportunity Detail must emphasize explainability: why now, evidence, score breakdown, related products/pages/queries, recommended task, and acceptance preview.
- Asset Editor should use a three-zone layout:
  - Left: task context, target queries, products, evidence, acceptance criteria.
  - Center: editable asset content, title, slug, meta, sections, FAQ, product grid, internal links.
  - Right: QA checks and `Create WordPress draft`.
- UX risks:
  - Too many tasks without a strong top-three/top-ten prioritization.
  - Users not trusting TrafScore without evidence and score breakdown.
  - Opportunity, Task, and Asset concepts blending together.
  - AI content editor feeling like a generic writing tool instead of commerce-aware execution.
  - Empty-state problems when integrations are incomplete.
  - Any ambiguity around draft-only publishing.

### Frontend View

- Frontend should be organized around the store-scoped route model:
  - `/stores/:storeId`
  - `/stores/:storeId/integrations`
  - `/stores/:storeId/opportunities`
  - `/stores/:storeId/opportunities/:opportunityId`
  - `/stores/:storeId/tasks`
  - `/stores/:storeId/tasks/:taskId`
  - `/stores/:storeId/assets/:assetId`
  - `/stores/:storeId/performance`
- Current `App.tsx` is a useful Traffic Ops Board seed and should evolve into API-backed dashboard data.
- Frontend needs stable DTOs early:
  - Store, Integration, Product, QueryMetric, Opportunity, Task, AssetDraft, PerformanceSummary.
- API naming should be normalized in the frontend API client. Components should not mix backend `snake_case` and frontend `camelCase`.
- Recommended frontend stack:
  - React Router for store-scoped pages.
  - TanStack Query for server state, caching, mutations, loading/error states, and polling.
  - React Hook Form plus Zod for onboarding, integration, and asset metadata forms.
  - Structured section editor for MVP asset drafts, not a full rich text editor.
- Frontend delivery order:
  - App shell, routes, API client, shared UI states.
  - Store and integration screens.
  - API-backed Traffic Ops Dashboard.
  - Task Board and Task Detail.
  - Opportunity Detail.
  - Asset Draft Review.
  - Lightweight Products/Queries support pages.
  - Performance loop.
- Frontend risks:
  - DTO instability causing churn.
  - Async jobs feeling broken without polling and explicit states.
  - Asset editor scope creep.
  - Large product/query tables needing pagination and server-side filtering.
  - Design debt if common components are not introduced early.

### Backend View

- Backend mainline should stabilize the persisted loop:
  - `stores -> integrations -> products/pages/search_queries/gsc_metrics -> graph matches -> opportunities -> tasks -> assets -> performance_snapshots -> audit_logs`.
- Missing P0 tables/relations to add before serious feature work:
  - `sync_runs` / `sync_steps` for every sync, planning, generation, and publishing run.
  - `query_product_matches` with match type, confidence, and reason.
  - `product_page_links` to connect products and product pages, collection pages, guides, and comparison assets.
  - `opportunity_entities` to connect opportunities to queries, products, pages, and categories.
  - Rule metadata on opportunities: `rule_id`, `rule_version`, `score_components`, `dedupe_key`.
- Integration order:
  - Mock/CSV GSC first, so opportunity generation can be developed before OAuth.
  - WooCommerce read-only product sync.
  - WordPress read-only page/post sync.
  - Product-keyword-page graph construction.
  - Real GSC API ingestion.
  - WordPress draft publishing.
  - Performance refresh.
- Service boundaries:
  - `IntegrationService`
  - `ProductSyncService`
  - `PageSyncService`
  - `GSCIngestionService`
  - `GraphBuilderService`
  - `ScoringService`
  - `OpportunityEngine`
  - `TaskEngine`
  - `AssetGenerationService`
  - `PublishingService`
  - `PerformanceService`
  - `AuditService`
- Opportunity Engine should start deterministic. LLMs can help explain and draft, but not own core ranking in MVP.
- First rules:
  - `high_impression_low_ctr`
  - `ranking_push`
  - `product_seo`
  - `collection_page_gap`
  - `buying_guide_gap`
  - `comparison_page_gap`
- Task generation rules:
  - One primary task per opportunity by default.
  - Deduplicate by task type, query cluster, product/page, and rule key.
  - Preserve rejected/snoozed/failed states so rejected ideas do not reappear repeatedly.
  - Action plans must be displayable by UI and consumable by asset generation.
- Backend priority for Sprint 1 is not real API integration. It is graph, rules, dedupe, and task state reliability.

### QA View

- MVP quality is not just page availability. It is whether TrafScope gives credible, traceable, safe growth tasks.
- Highest QA risks:
  - GSC aggregation errors that poison opportunity generation.
  - WooCommerce sync errors around price, stock, product status, categories, and attributes.
  - WordPress publishing accidentally creating live content or overwriting pages.
  - TrafScore instability or poor explainability.
  - Opportunity evidence missing from downstream tasks.
  - LLM drafts inventing product claims, prices, reviews, availability, certifications, or competitor facts.
  - Schema not matching visible page content.
  - Secrets leaking through logs, API responses, or frontend state.
  - Duplicate tasks/pages from repeated sync or planning jobs.
- Test pyramid:
  - 55% backend unit tests for scoring, rules, task templates, schema validation, state machines.
  - 25% backend API/integration tests for Store -> Sync -> Opportunity -> Task -> Asset -> Performance.
  - 10% external contract tests with fixture/mock servers for WooCommerce, WordPress, and GSC.
  - 5% frontend component tests for status and task evidence rendering.
  - 5% E2E smoke tests for the critical demo loop.
- Release gates:
  - Core backend tests pass with deterministic scoring and task-rule coverage.
  - WordPress publish path can only create drafts in MVP.
  - Store sync and planning jobs are idempotent.
  - Every write action has an audit log.
  - Demo store reliably generates at least 10 evidence-backed tasks.
  - No secret is exposed to frontend responses, logs, or snapshots.
  - Real browser smoke test covers board, task detail, opportunity detail, draft review, and performance entry.

### Decisions

1. MVP product identity is `Traffic Operations Board`, not an SEO dashboard.
2. The core user-visible proof is a prioritized list of evidence-backed tasks.
3. WooCommerce/WordPress remain first. Shopify, social channels, broad AI visibility, GA4, Merchant Center, and competitor crawling are deferred.
4. Sprint 1 uses demo/mock data intentionally. Real integrations come after the opportunity/task engine is credible.
5. Deterministic rules and scores come before LLM automation.
6. Every opportunity and task must carry evidence, related entities, and scoring explanation.
7. MVP publishing is draft-only. No automatic live publish.
8. All write actions need audit logs.
9. Frontend MVP should optimize the line: Task Board -> Task Detail -> Draft Review -> WordPress Draft -> Performance.
10. Asset Editor is structured block review in MVP, not a full rich text editor.

### Open Questions

1. Should Sprint 1 include CSV upload for GSC fixtures, or only built-in demo data?
2. Do we use `approved -> draft_generated -> draft_approved -> published_draft` as the task status model, or preserve the broader spec status list and map UI states on top?
3. Should collection pages be WordPress pages containing product blocks in MVP? Current recommendation: yes.
4. Which WordPress auth method is MVP default: application passwords, OAuth plugin, or manually configured token?
5. How much SEO metadata can be read from existing WordPress/WooCommerce installs without requiring Yoast/RankMath-specific adapters?
6. Should agencies get multi-store switching in MVP, or only a single-store flow with route-level extensibility?
7. What is the first target merchant category for demo and testing beyond outdoor coffee gear?
8. Which LLM provider and JSON schema validation layer should be used for asset generation once deterministic core is ready?

### Sprint Plan

#### Sprint 1: Demo Decisioning Loop

Goal: prove that TrafScope can turn store/search signals into trustworthy tasks before connecting real APIs.

Build:

- Demo store and mock/importable GSC metrics.
- ProductReadiness scoring.
- TrafScore scoring and score breakdown.
- P0 graph tables and relation models:
  - `sync_runs`
  - `query_product_matches`
  - `product_page_links`
  - `opportunity_entities`
- GraphBuilder first pass.
- Opportunity rules:
  - CTR refresh
  - ranking push
  - collection page gap
- Task generation, dedupe, and status model.
- API-backed Task Board and Opportunity Detail.
- Tests for scoring, rules, task inheritance, dedupe, and task statuses.

Acceptance:

- Demo store reliably generates at least 10 tasks.
- Each task includes evidence, TrafScore, related queries/products/pages, action plan, and acceptance criteria.
- No task is generated twice for the same dedupe key.

#### Sprint 2: Real Store Sync

Goal: feed the decisioning engine with real WooCommerce and WordPress data.

Build:

- WooCommerce read-only product/category/attribute sync.
- WordPress read-only page/post sync.
- Integration connection tests and sync status UI.
- External ID uniqueness and idempotent upsert.
- GraphBuilder works with real product/page data.
- Opportunity rules:
  - product SEO
  - buying guide gap
- Audit logs for connect, disconnect, sync, approval, and task status change.
- Store-scoped frontend routes and stable DTO conversion.

Acceptance:

- A real or fixture-backed WooCommerce/WordPress store can sync without duplicate products/pages.
- System generates at least 3 opportunity types from real store/page data plus GSC fixture data.
- Failed integrations show actionable frontend states.

#### Sprint 3: Draft Asset And Feedback Loop

Goal: let users approve a task, generate an asset draft, publish it as a WordPress draft, and begin tracking performance.

Build:

- Asset draft persistence.
- Structured Asset Editor.
- Collection page, buying guide, and product SEO draft generators.
- SEO title/meta/FAQ/schema preview and QA checks.
- WordPress draft publishing only.
- Publish audit log.
- Performance snapshot and before/after GSC view.
- E2E smoke flow: demo store -> opportunity -> task -> draft -> WordPress draft -> performance tracking.

Acceptance:

- User can generate a structured draft from a task.
- User can create a WordPress draft without live publishing.
- Published draft has external ID/URL stored.
- Performance page shows tracking state or before/after data.
- QA confirms no secrets leak and no live publish path exists in MVP.
