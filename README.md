# TrafScope Commerce OS

TrafScope Commerce OS is an AI traffic operator for WooCommerce and WordPress stores. It connects store data, Google Search Console signals, website pages, and execution history to plan product-level organic growth tasks.

GitHub repository: https://github.com/guangzibodong/AI-powered-traffic-opportunity-engine

## Repo Layout

```txt
apps/
  api/      FastAPI backend, services, integrations, workers, tests
  web/      TypeScript frontend workbench
packages/
  shared/   Shared TypeScript contracts
infra/      Local services and SQL migrations
docs/       Product, API, architecture, and prompt notes
```

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

## MVP Loop

```txt
Store data -> Search signal -> Product mapping -> Opportunity -> Task -> Asset draft -> WordPress draft -> Performance feedback
```

## Verification

Backend unit tests currently cover the deterministic TrafScore formula, ProductReadiness formula, and opportunity-to-task conversion contract.
