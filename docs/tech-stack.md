# TrafScope Technology Stack

This document records the initial stack choices for TrafScope Commerce OS and the reasoning behind them.

## Stack Principles

1. The deterministic decisioning engine comes before broad AI automation.
2. Integrations must be explicit, traceable, and safe by default.
3. Frontend components should render evidence, status, and next action clearly.
4. Data contracts should stabilize early so backend and frontend can move in parallel.
5. The MVP should be easy to run locally and easy to extend into production.

## Frontend

| Choice | Status | Why |
|---|---|---|
| React | Selected | Mature ecosystem and fast product iteration. |
| Vite | Selected | Simple local development and build tooling. |
| TypeScript | Selected | Safer DTOs and shared contracts across app surfaces. |
| React Router | Planned | Store-scoped routes such as `/stores/:storeId/tasks/:taskId`. |
| TanStack Query | Planned | Server state, caching, polling, loading states, and mutations. |
| React Hook Form | Planned | Integration forms, onboarding, and asset metadata editing. |
| Zod | Planned | Runtime validation for frontend forms and API DTO boundaries. |

MVP frontend routes:

```txt
/stores/:storeId
/stores/:storeId/integrations
/stores/:storeId/opportunities
/stores/:storeId/opportunities/:opportunityId
/stores/:storeId/tasks
/stores/:storeId/tasks/:taskId
/stores/:storeId/assets/:assetId
/stores/:storeId/performance
```

## Backend

| Choice | Status | Why |
|---|---|---|
| FastAPI | Selected | Strong Python API framework with typed request and response models. |
| Python | Selected | Good fit for scoring, data processing, integrations, and AI workflows. |
| Pydantic | Selected | Validation and schema contracts for API and service boundaries. |
| SQL migrations | Selected | Explicit schema evolution in `infra/migrations`. |
| Celery | Selected | Background sync, planning, generation, publishing, retries, and performance refresh jobs. |

Primary backend services:

- IntegrationService
- ProductSyncService
- PageSyncService
- GSCIngestionService
- GraphBuilderService
- ScoringService
- OpportunityEngine
- TaskEngine
- AssetGenerationService
- PublishingService
- PerformanceService
- AuditService

## Data Layer

| Choice | Status | Why |
|---|---|---|
| PostgreSQL | Selected | Reliable relational core for stores, products, pages, queries, opportunities, tasks, assets, and audits. |
| pgvector | Reserved | Future product/page/query embedding matching and semantic clustering. |
| JSONB | Planned | Score components, evidence payloads, LLM contracts, and provider metadata. |

Core entities:

```txt
stores
integrations
sync_runs
sync_steps
products
pages
search_queries
gsc_metrics
query_product_matches
product_page_links
opportunities
opportunity_entities
tasks
assets
performance_snapshots
audit_logs
```

## Integrations

| Integration | MVP Role | Safety Default |
|---|---|---|
| Google Search Console | Query and performance signals | Import/read only |
| WooCommerce REST API | Product, category, status, stock, attributes | Read only |
| WordPress REST API | Pages, posts, draft publishing | Draft-only writes |

Integration order:

1. Demo and CSV-like GSC fixtures.
2. WooCommerce read-only product sync.
3. WordPress read-only page/post sync.
4. Real GSC ingestion.
5. WordPress draft publishing.
6. Performance refresh.

## AI Layer

LLMs should assist with explanations, draft generation, and structured content production. They should not own MVP ranking logic.

MVP AI rules:

- Deterministic TrafScore and ProductReadiness decide priority.
- LLM output must use strict JSON contracts.
- Drafts must be grounded in task evidence and known product data.
- Drafts must not invent product claims, reviews, certifications, stock, price, or competitor facts.
- QA checks run before any WordPress draft is created.

## Testing

Current verification:

```bash
cd apps/api
python -B -m unittest discover app/tests
```

Target test mix:

- Backend unit tests for scoring, rules, schemas, task generation, and dedupe.
- Backend API tests for Store -> Sync -> Opportunity -> Task -> Asset -> Performance.
- Fixture-backed contract tests for WooCommerce, WordPress, and GSC.
- Frontend component tests for task, evidence, status, and QA rendering.
- E2E smoke tests for the demo loop.

## Deployment Direction

No production deployment provider is locked yet. The stack should remain deployable to common options:

- Backend API on Render, Fly.io, Railway, or similar.
- Frontend on Vercel, Netlify, Cloudflare Pages, or similar.
- PostgreSQL on managed Postgres.
- Workers on the same platform as the backend or separate worker processes.

## Open Stack Decisions

| Decision | Current Recommendation |
|---|---|
| Queue system | Celery is selected for real sync, generation, publishing, retries, and step tracking. Sprint 1 demo services may run synchronously while recording run state. |
| Auth | Start with app-level session or token auth for MVP demo; design for organization/store scopes. |
| LLM provider | Keep provider abstraction; choose once asset generation begins. |
| Frontend test runner | Vitest plus Testing Library for components; Playwright for E2E smoke tests. |
| Rich text editor | Avoid full rich text in MVP; use a structured section editor first. |
