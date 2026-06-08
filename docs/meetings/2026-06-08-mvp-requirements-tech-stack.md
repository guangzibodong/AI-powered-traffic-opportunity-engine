# TrafScope MVP Requirements And Tech Stack Decision Meeting

Date: 2026-06-08

Facilitator: Codex

## Meeting Goal

Create a cross-functional team, settle the MVP requirements, settle the technical stack, and define the delivery boundaries before more feature development.

## Roles In The Room

| Role | Responsibility |
|---|---|
| Product Lead | Freeze target user, product promise, MVP scope, and success metrics. |
| SEO / GEO Growth Lead | Define traffic opportunity rules, evidence requirements, and AI search boundaries. |
| UI / UX Lead | Define screens, user decisions, visual system, states, and UX acceptance criteria. |
| Frontend Architect | Define frontend stack, routes, API client, state, DTO mapping, and UI test gates. |
| Backend / Data Architect | Define backend stack, data model, service boundaries, API contracts, and job model. |
| AI / Content Engine Lead | Define where LLMs can assist, JSON contracts, draft model, and hallucination gates. |
| QA / Security Lead | Define release gates, test pyramid, integration safety, and secret protection. |

## Final Product Decision

TrafScope MVP is a WooCommerce and WordPress traffic operations workspace.

It is not a general SEO suite, not a keyword dashboard, not a generic AI writing tool, and not an autonomous publishing system.

The first product identity is:

> Traffic Operations Board for evidence-backed organic growth tasks.

The MVP must prove one question:

> Can TrafScope turn store, page, and GSC signals into trustworthy prioritized traffic tasks that a merchant is willing to approve?

## Target User Decision

Primary ICP:

- WooCommerce and WordPress merchants with roughly 50-2,000 SKUs.

Secondary ICP:

- SEO teams and agencies managing WooCommerce / WordPress organic growth work.

Not MVP primary users:

- Shopify merchants.
- Broad social content teams.
- Backlink teams.
- Fully autonomous AI SEO publishers.
- Teams looking for large-scale competitor crawling or full AI visibility monitoring first.

## MVP Loop Decision

Freeze this loop:

```txt
Demo/imported data
-> products, pages, and GSC signals
-> query-product-page graph
-> TrafScore + ProductReadiness
-> deterministic opportunity
-> evidence-backed task
-> approve / reject / snooze
-> structured asset draft
-> QA review
-> WordPress draft-only creation
-> GSC performance snapshot
```

Sprint 1 proves only the decisioning loop:

```txt
Demo store -> Run planning -> Board -> Task detail -> Opportunity detail -> approve/reject/snooze
```

## Requirements Decisions

### Must-Have MVP Requirements

| Requirement | Decision |
|---|---|
| First screen | Traffic Operations Board. |
| Platform | WooCommerce + WordPress first. |
| Search data | GSC data, starting with demo/import fixture. |
| Core output | At least 10 prioritized evidence-backed tasks. |
| Recommendation logic | Deterministic rules first. |
| AI role | Assist explanations, action plans, and drafts only. |
| Publishing | WordPress draft-only after human approval. |
| Tracking | GSC baseline and before/after performance snapshot. |
| Trust layer | Evidence, related entities, score breakdown, rule version, dedupe key. |
| Safety layer | Audit logs, secret protection, no live publish, WooCommerce read-only. |

### Explicit Non-Goals

These are cut from MVP:

- Shopify.
- GA4.
- Merchant Center.
- Backlink database.
- Full AI visibility monitoring.
- TikTok, YouTube, Reddit, Xiaohongshu scraping.
- Competitor crawling.
- Live publishing.
- LLM-led scoring or ranking.
- Full rich text CMS editor.
- Advanced agency multi-store workspace.
- Yoast / RankMath deep adapter.
- Complex embedding-driven matching.
- Large product/query management tables.
- Automatic comparison pages based on unsupported competitor facts.

## Opportunity Rule Decisions

| Rule | Sprint | Decision |
|---|---:|---|
| `high_impression_low_ctr` | 1 | Keep. Strong GSC evidence, clear CTR refresh action. |
| `ranking_push` | 1 | Keep. Good proof for position-driven opportunity. |
| `collection_page_gap` | 1 | Keep. Best early ecommerce-specific rule. |
| `product_seo` | 2 | Keep for real WooCommerce data phase. |
| `buying_guide_gap` | 2/3 | Keep after graph confidence improves. |
| `comparison_page_gap` | Later | Delay due to competitor fact and legal/source risk. |
| `ai_citation_gap` | Later | Delay as monitoring rule; allow citation readiness QA only. |

## UI Decisions

MVP pages:

| Page | User Decision |
|---|---|
| Traffic Operations Board | What are the top 1-3 actions I should take now? |
| Tasks / Task Detail | Do I trust and approve this action? |
| Opportunities / Opportunity Detail | Is this opportunity real, urgent, and explainable? |
| Asset Draft Review | Is this draft factually safe and ready for WordPress draft creation? |
| Performance | Did the action work or need adjustment? |
| Settings / Integrations | Is my data connected and trustworthy enough to run planning? |

UI red lines:

- No marketing landing page as the app shell.
- No generic AI gradient/orb look.
- No recommendation without visible evidence.
- No publish wording without `draft`.
- No large hero typography inside operational panels.
- No hiding sync/planning/generation failures behind vague spinners.

## Frontend Stack Decision

Final frontend stack:

- React.
- Vite.
- TypeScript.
- React Router.
- TanStack Query.
- React Hook Form for forms.
- Zod for runtime validation and DTO/form boundaries.
- Vitest + Testing Library planned.
- Playwright planned for E2E smoke.

Do not add Redux/Zustand in Sprint 1. Server state belongs to TanStack Query. Local state should stay limited to filters, tabs, expanded rows, and temporary UI controls.

## Backend Stack Decision

Final backend stack:

- FastAPI.
- Python.
- Pydantic as API/schema contract layer.
- PostgreSQL as source of truth.
- JSONB for score components, evidence payloads, and LLM contract metadata.
- pgvector reserved for future semantic matching, not MVP decisioning.
- SQL migrations under `infra/migrations`.
- Celery selected for future background jobs because real sync, retries, and step tracking will need it.

Sprint 1 may run synchronous demo services while still recording `sync_runs` / planning runs as the job boundary.

## AI Decision

AI is a controlled generation layer, not a decision layer.

AI may assist:

- Query intent classification.
- Opportunity explanation.
- Task action plan copy.
- Structured asset draft generation.
- Draft QA assistance.
- Performance narrative after metrics exist.

AI may not:

- Decide TrafScore.
- Decide ProductReadiness.
- Rank opportunities.
- Create evidence.
- Invent product facts.
- Create competitor facts without a source.
- Choose live publish.
- Write to WooCommerce.
- Run broad AI visibility monitoring in MVP.

## Data Model Decision

Freeze the primary chain:

```txt
stores
-> integrations
-> sync_runs / sync_steps
-> products / pages / search_queries / gsc_metrics
-> query_product_matches / product_page_links
-> opportunities / opportunity_entities
-> tasks
-> assets
-> performance_snapshots
-> audit_logs
```

Every business record must be store-scoped.

Every opportunity must carry:

- `rule_id`.
- `rule_version`.
- `score_components`.
- `evidence`.
- `dedupe_key`.
- related query/product/page/category entities.

Every task must inherit:

- opportunity evidence.
- score.
- related entities.
- action plan.
- acceptance criteria.
- dedupe identity.

## API Contract Decision

Backends may expose snake_case. Frontend components should receive camelCase view models through the API client mapper.

Key DTOs to freeze:

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

All API errors must be safe, structured, and secret-free.

## QA And Security Decisions

P0 release blockers:

- Task without evidence.
- Duplicate top task after repeated planning.
- Unstable scoring from the same fixture.
- Live publish UI or API path.
- WooCommerce write path.
- Raw credential in API response, logs, frontend state, screenshots, or snapshots.
- Missing audit log for a write action.
- API response leaking stack trace or secret.
- Frontend console runtime errors in demo smoke.

Release gates:

- Backend core tests pass.
- Demo planning produces 10+ evidence-backed tasks.
- Re-running planning three times does not duplicate tasks.
- Each task has evidence, related entities, TrafScore/priority, action plan, and acceptance criteria.
- WordPress draft-only contract is enforced.
- WooCommerce read-only contract is enforced.
- Frontend typecheck/build passes once dependencies are installed.
- Component tests and Playwright E2E are added before MVP release.

## Final Meeting Decision

The team approves the MVP direction:

1. Build the trustworthy demo decisioning loop first.
2. Keep deterministic rules ahead of LLM automation.
3. Keep WooCommerce / WordPress as the only MVP platform.
4. Treat evidence, score explanation, dedupe, and audit logs as product features.
5. Make draft-only publishing and human approval hard release gates.
6. Use React/Vite/TypeScript on the frontend and FastAPI/PostgreSQL/Celery on the backend.
7. Let GEO enter MVP as content quality and citation readiness QA, not as full AI search monitoring.

