# Architecture

## Backend

FastAPI owns API routing, domain services, integration clients, and background job entry points.

Key services:

- `GSCClient`
- `WordPressClient`
- `WooCommerceClient`
- `ProductSyncService`
- `GSCIngestionService`
- `QueryClassifierService`
- `ProductMatcherService`
- `OpportunityService`
- `TaskService`
- `AssetGenerationService`
- `PublishingService`
- `PerformanceService`

## Data Layer

PostgreSQL stores stores, integrations, products, pages, queries, opportunities, tasks, assets, performance snapshots, and audit logs. `pgvector` is enabled for future product/page/query embedding matching.

## Safety Defaults

- Draft-only publishing by default.
- No live WordPress or WooCommerce changes without approval.
- Integration credentials are routed through a token vault interface.
- Every write action should produce an audit log entry.
- Feature flags gate AI visibility, Shopify, autopilot, GA4, and Merchant Center.

## Frontend

The TypeScript app starts as a workbench, not a marketing page. The first screen shows integration status, priority tasks, top opportunities, and operating metrics.

