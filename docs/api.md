# API Surface

## Stores

- `POST /api/stores`
- `GET /api/stores`
- `GET /api/stores/:storeId`
- `PATCH /api/stores/:storeId`

## Integrations

- `POST /api/stores/:storeId/integrations/gsc/connect`
- `POST /api/stores/:storeId/integrations/wordpress/connect`
- `POST /api/stores/:storeId/integrations/woocommerce/connect`
- `GET /api/stores/:storeId/integrations`
- `POST /api/stores/:storeId/sync`

## Products

- `GET /api/stores/:storeId/products`
- `GET /api/stores/:storeId/products/:productId`
- `GET /api/stores/:storeId/products/:productId/opportunities`

## Queries

- `GET /api/stores/:storeId/queries`
- `GET /api/stores/:storeId/queries/:queryId`
- `GET /api/stores/:storeId/query-clusters`

## Opportunities

- `GET /api/stores/:storeId/opportunities`
- `GET /api/stores/:storeId/opportunities/:opportunityId`
- `POST /api/stores/:storeId/opportunities/:opportunityId/approve`
- `POST /api/stores/:storeId/opportunities/:opportunityId/reject`

## Tasks

- `GET /api/stores/:storeId/tasks`
- `GET /api/stores/:storeId/tasks/:taskId`
- `PATCH /api/stores/:storeId/tasks/:taskId`
- `POST /api/stores/:storeId/tasks/:taskId/generate-draft`
- `POST /api/stores/:storeId/tasks/:taskId/approve`
- `POST /api/stores/:storeId/tasks/:taskId/reject`

## Assets

- `GET /api/stores/:storeId/assets`
- `GET /api/stores/:storeId/assets/:assetId`
- `PATCH /api/stores/:storeId/assets/:assetId`
- `POST /api/stores/:storeId/assets/:assetId/publish-wordpress-draft`

## Performance

- `GET /api/stores/:storeId/performance`
- `GET /api/stores/:storeId/assets/:assetId/performance`
- `POST /api/stores/:storeId/performance/refresh`

