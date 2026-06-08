# TrafScope Tech Stack Decision

Date: 2026-06-08

Status: Approved for MVP

## Decision Summary

TrafScope will use:

- Frontend: React + Vite + TypeScript.
- Frontend routing/state/forms: React Router + TanStack Query + React Hook Form + Zod.
- Backend: FastAPI + Python + Pydantic.
- Database: PostgreSQL + JSONB.
- Vector capability: pgvector reserved, not MVP decisioning.
- Background jobs: Celery selected for real sync/generation/publishing work.
- Testing: backend unit/contract tests, Vitest component tests, Playwright E2E smoke.

## Stack Principles

1. Deterministic decisioning before LLM automation.
2. Evidence and score explanations are product features.
3. Store-scoped data is mandatory.
4. API contracts must stabilize early.
5. Frontend components receive normalized camelCase view models.
6. PostgreSQL remains the source of truth.
7. AI output is validated before use.
8. WordPress draft-only and WooCommerce read-only are hard safety defaults.

## Frontend Decision

### Selected

| Layer | Choice | Decision |
|---|---|---|
| UI framework | React | Approved. Good fit for operational workbench UI. |
| Build tool | Vite | Approved. Fast MVP iteration and simple deployment. |
| Language | TypeScript | Approved. Required for stable DTOs and view models. |
| Routing | React Router | Approved. Store-scoped routes. |
| Server state | TanStack Query | Approved. Query cache, polling, mutations, loading/error states. |
| Forms | React Hook Form | Approved when forms land. |
| Validation | Zod | Approved for forms and DTO adapter boundaries. |
| Component tests | Vitest + Testing Library | Approved. |
| E2E | Playwright | Approved. |

### Not Selected For Sprint 1

- Redux.
- Zustand.
- Next.js / SSR.
- Full rich text editor.
- Heavy charting framework unless needed.

### Routes

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

Root path should redirect to the demo store during MVP development.

### Frontend Architecture

Recommended structure:

```txt
apps/web/
  app/
    App.tsx
    main.tsx
    styles.css
  pages/
    BoardPage.tsx
    TaskDetailPage.tsx
    OpportunityDetailPage.tsx
    AssetDraftReviewPage.tsx
    PerformancePage.tsx
    IntegrationsPage.tsx
  features/
    tasks/
    opportunities/
    assets/
    integrations/
  components/
    ui/
  lib/
    api/
      http.ts
      stores.ts
      integrations.ts
      tasks.ts
      opportunities.ts
      assets.ts
      performance.ts
      dto.ts
      mappers.ts
```

Rules:

- Components do not call `fetch` directly.
- Backend snake_case is normalized at API client boundary.
- UI components receive camelCase view models.
- Empty arrays are `[]`, not `null`.
- Numeric metrics stay numeric until display formatting.
- Job polling only runs while status is active.

## Backend Decision

### Selected

| Layer | Choice | Decision |
|---|---|---|
| API framework | FastAPI | Approved. |
| Language | Python | Approved. |
| Schema validation | Pydantic | Approved. |
| Database | PostgreSQL | Approved. |
| Flexible payloads | JSONB | Approved for evidence, score components, QA checks, LLM metadata. |
| Vector matching | pgvector | Reserved. Do not rely on it for MVP ranking. |
| Background jobs | Celery | Approved for real sync/generation/publishing workflows. |
| Migrations | SQL migrations | Approved under `infra/migrations`. |

### Service Boundaries

| Service | Responsibility | Must Not Do |
|---|---|---|
| IntegrationService | Connection state and credential references. | Expose raw secrets. |
| ProductSyncService | WooCommerce read-only product/category/attribute sync. | Write to WooCommerce. |
| PageSyncService | WordPress read-only page/post sync. | Publish or overwrite live pages. |
| GSCIngestionService | Query/page/date metrics import. | Create opportunities directly. |
| GraphBuilderService | Query-product-page graph edges and page gaps. | Score opportunities. |
| ScoringService | TrafScore and ProductReadiness. | Call LLMs. |
| OpportunityEngine | Deterministic rule generation and dedupe keys. | Create tasks or assets. |
| TaskEngine / TaskService | Opportunity-to-task conversion and task state machine. | Recalculate opportunity score. |
| AssetGenerationService | Structured draft generation and validation. | Bypass QA. |
| PublishingService | WordPress draft-only creation. | Accept live publish status. |
| PerformanceService | GSC snapshots and tracking state. | Claim complex attribution. |
| AuditService | Actor/action/target/safe metadata log. | Store raw credentials. |

## Data Model Decision

Core chain:

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

### Required Constraints

- All business tables include `store_id`.
- `products(store_id, external_id)` must be unique.
- `pages(store_id, external_id)` must be unique when external ID exists.
- `gsc_metrics(store_id, query_id, page_id, metric_date)` or equivalent window key must be unique.
- `opportunities(store_id, rule_id, rule_version, dedupe_key)` must be unique.
- `tasks` must have a dedupe identity.
- Rejected and snoozed task records must be retained.

## Job Model Decision

All long-running or repeatable work should be represented as `sync_runs` and `sync_steps`, including:

- Product sync.
- Page sync.
- GSC ingest.
- Graph build.
- Planning run.
- Draft generation.
- WordPress draft creation.
- Performance refresh.

Status values:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

Each run should record:

- `store_id`
- run type.
- status.
- started_at.
- finished_at.
- counts.
- safe error summary.
- actor.
- retry metadata.

## API Contract Decision

Key DTOs:

- `StoreDTO`
- `IntegrationDTO`
- `SyncRunDTO`
- `ProductDTO`
- `PageDTO`
- `QueryMetricDTO`
- `QueryProductMatchDTO`
- `OpportunityDTO`
- `TaskDTO`
- `AssetDraftDTO`
- `PerformanceSnapshotDTO`
- `AuditLogDTO`

Important endpoints:

```txt
GET /api/stores/{store_id}
GET /api/stores/{store_id}/integrations
POST /api/stores/{store_id}/planning-runs
GET /api/stores/{store_id}/sync-runs/{run_id}
GET /api/stores/{store_id}/tasks?status=&limit=&cursor=
GET /api/stores/{store_id}/tasks/{task_id}
PATCH /api/stores/{store_id}/tasks/{task_id}
GET /api/stores/{store_id}/opportunities?rule_id=&status=
GET /api/stores/{store_id}/opportunities/{opportunity_id}
POST /api/stores/{store_id}/tasks/{task_id}/generate-draft
GET /api/stores/{store_id}/assets/{asset_id}
POST /api/stores/{store_id}/assets/{asset_id}/publish-wordpress-draft
GET /api/stores/{store_id}/performance
```

## AI Contract Decision

LLM outputs must be:

- Pure JSON.
- Schema versioned.
- Source referenced.
- Validated by Pydantic.
- Stored with generation run metadata.
- Reviewed before WordPress draft creation.

Required extra fields for generated content:

- `schema_version`
- `generation_run_id`
- `source_refs`
- `confidence`
- `warnings`
- `claim_ledger`
- `qa_checks`

Validation layers:

1. JSON parse.
2. Schema validation.
3. Domain validation.
4. Publish validation.

## Test Stack Decision

Backend:

```bash
cd apps/api
python -B -m unittest discover app/tests
```

Future backend gates:

```bash
ruff check app
mypy app
```

Frontend gates:

```bash
npm --workspace apps/web run lint
npm --workspace apps/web run build
npm --workspace apps/web run test
```

E2E gate:

```bash
npx playwright test
```

`apps/web` does not yet have the final Vitest/Testing Library setup, so the frontend test gate is a required Sprint 1 infrastructure task.

## Open But Controlled Decisions

| Decision | Current Position |
|---|---|
| Auth | MVP demo may use simple app/session scope; production needs org/store access control. |
| LLM provider | Keep provider abstraction until asset generation starts. |
| Deployment provider | Not locked; stack remains portable to Vercel/Netlify/Cloudflare for web and Render/Fly/Railway for API. |
| Rich editor | Do not add in MVP; use structured block review. |
| AI visibility monitoring | Not MVP; citation readiness QA only. |

