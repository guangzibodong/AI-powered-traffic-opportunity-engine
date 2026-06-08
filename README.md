# TrafScope Commerce OS

![TrafScope Commerce OS](docs/assets/trafscope-hero.png)

TrafScope is an AI-powered traffic opportunity engine for WooCommerce and WordPress businesses.
It finds demand signals from search data, product data, website pages, and execution history, then turns those signals into prioritized growth tasks, draft content assets, and measurable performance loops.

Repository: https://github.com/guangzibodong/AI-powered-traffic-opportunity-engine

## Product Positioning

Traditional SEO tools show keywords, rankings, audits, and charts. TrafScope is designed to answer a more operational question:

> What should this store do next to capture hidden organic traffic?

The product focuses on the full traffic execution loop:

![TrafScope Product Loop](docs/assets/trafscope-product-loop.svg)

## Who It Is For

- WooCommerce and WordPress merchants with 50-2,000 SKUs.
- SEO teams that need a task board instead of another reporting dashboard.
- Content marketing teams that want evidence-backed page ideas.
- B2B and ecommerce growth teams looking for organic traffic opportunities.
- Agencies managing WordPress and WooCommerce growth work for multiple clients.
- Brands preparing for AI search visibility and citation workflows.

## What TrafScope Does

TrafScope connects store data, Google Search Console signals, WordPress pages, and execution history to generate practical traffic actions:

- Find high-impression, low-click query opportunities.
- Identify ranking-push keywords that are close to page-one or top-three wins.
- Map queries to products, product pages, collection pages, guides, and comparison assets.
- Score opportunities with deterministic TrafScore and ProductReadiness logic.
- Generate tasks with evidence, related objects, action plans, and acceptance criteria.
- Create draft assets such as SEO pages, buying guides, comparison pages, FAQ blocks, and metadata.
- Publish to WordPress as draft-only content after human approval.
- Track clicks, impressions, ranking movement, AI citation signals, and conversion impact.

## MVP Scope

The first build is not a broad SEO suite. It is a focused traffic operations loop for WooCommerce and WordPress.

| Area | MVP Decision |
|---|---|
| Primary platform | WooCommerce plus WordPress |
| Search data | Google Search Console, starting with demo or imported fixtures |
| Core screen | Traffic Operations Board |
| Core proof | At least 10 prioritized, evidence-backed tasks from demo data |
| Decisioning | Deterministic rules first, LLMs assist with explanations and drafts |
| Publishing | WordPress draft-only, never automatic live publish |
| Tracking | GSC performance snapshots and before-after asset tracking |

Deferred from MVP: Shopify, backlink databases, full AI visibility monitoring, TikTok, YouTube, Reddit, Xiaohongshu scraping, GA4, Merchant Center, and fully autonomous publishing.

## Product Surfaces

The first version is a working product experience, not a marketing landing page.

- Traffic Operations Board: top tasks, integration health, weekly planning, key metrics.
- Opportunities: rule-based traffic opportunities with score breakdowns and evidence.
- Task Detail: why this task exists, affected queries/products/pages, action plan, acceptance criteria.
- Asset Draft Review: structured draft review for titles, slugs, metadata, sections, FAQ, schema, and internal links.
- Performance: tracking state and before-after GSC movement.
- Settings and Integrations: WooCommerce, WordPress, GSC, sync status, safety controls.

## Architecture

![TrafScope Architecture](docs/assets/trafscope-architecture.svg)

TrafScope is organized as a monorepo with a FastAPI backend, a Vite/React frontend, shared TypeScript contracts, SQL migrations, and product documentation.

```txt
apps/
  api/       FastAPI backend, services, integrations, workers, tests
  web/       Vite, React, TypeScript product workbench
packages/
  shared/    Shared TypeScript types and LLM contracts
infra/       Docker Compose and SQL migrations
docs/        Product, API, architecture, design, QA, and planning docs
```

## Technology Stack

| Layer | Stack |
|---|---|
| Frontend | React, Vite, TypeScript |
| Frontend state | Planned: TanStack Query, React Router, React Hook Form, Zod |
| Backend API | FastAPI, Python |
| Database | PostgreSQL, with pgvector reserved for future matching and embeddings |
| Background work | Planned: RQ or Celery for sync, planning, generation, and publishing jobs |
| Integrations | Google Search Console, WooCommerce REST API, WordPress REST API |
| AI layer | LLM-assisted asset generation with strict JSON contracts |
| Testing | Python unittest now, planned pytest and frontend component/E2E tests |
| Local infra | Docker Compose |

See [docs/tech-stack.md](docs/tech-stack.md) for the detailed stack decisions and rationale.

## Local Development

Backend:

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Frontend:

```bash
cd apps/web
npm install
npm run dev
```

Infrastructure:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Backend tests:

```bash
cd apps/api
python -B -m unittest discover app/tests
```

## Safety Defaults

- No live WordPress publishing in MVP.
- WordPress publishing creates drafts only.
- WooCommerce sync is read-only.
- GSC import and planning runs must be idempotent.
- Every write action should create an audit log.
- Generated content must not invent product claims, prices, reviews, certifications, stock status, or competitor facts.
- Every opportunity and task must include evidence and score explanation.

## Roadmap

### Sprint 1: Demo Decisioning Loop

Prove TrafScope can turn demo store data and GSC-like signals into trustworthy tasks.

- Demo store and GSC fixtures.
- ProductReadiness and TrafScore scoring.
- Query-product-page graph.
- Opportunity rules for CTR refresh, ranking push, and collection page gaps.
- Task generation, dedupe, and state model.
- API-backed task board and opportunity detail.

### Sprint 2: Real Store Sync

Connect the decisioning loop to real WooCommerce and WordPress data.

- WooCommerce read-only product sync.
- WordPress read-only page/post sync.
- Integration status and sync run tracking.
- Audit logs.
- Stable frontend DTO conversion.

### Sprint 3: Draft Asset and Feedback Loop

Let users approve a task, generate a structured draft, create a WordPress draft, and track performance.

- Asset draft persistence.
- Structured draft editor.
- SEO metadata, FAQ, schema, and QA checks.
- WordPress draft-only publishing.
- Performance snapshots and before-after views.

## Key Docs

- [Product spec](docs/product-spec.md)
- [Architecture](docs/architecture.md)
- [Tech stack](docs/tech-stack.md)
- [API surface](docs/api.md)
- [Design system](DESIGN.md)
- [Requirements workshop](docs/requirements-workshop.md)
- [Sprint 1 backlog](docs/sprint-1-backlog.md)
- [QA strategy](docs/qa-sprint-1.md)
