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
- `POST /api/stores/:storeId/queries/import-csv`
- `GET /api/stores/:storeId/query-clusters`

### CSV GSC import contract

`POST /api/stores/:storeId/queries/import-csv` accepts exported GSC-like CSV text in JSON:

```json
{
  "csv_text": "Query,Page,Clicks,Impressions,CTR,Position\nportable espresso,https://example.com/page,24,1200,2.0%,4.8\n",
  "window": "28d"
}
```

Required CSV columns:

- `Query`
- `Page`
- `Clicks`
- `Impressions`
- `CTR`
- `Position`

Responses:

- `200` returns `{ "mode": "csv_import", "summary": { ... } }`.
- `400` is returned when `csv_text` is missing or required columns are absent.

Imported rows are in-memory, scoped per store, and idempotent by store, window, query, and page. This is an import/read flow only; it does not connect real GSC OAuth.

### Imported query cluster contract

`GET /api/stores/:storeId/query-clusters` returns lightweight deterministic clusters generated from imported GSC CSV rows:

```json
{
  "mode": "csv_import",
  "store_id": "store-demo-outdoor-coffee",
  "query_clusters": [
    {
      "cluster_key": "camping-espresso-maker-portable",
      "primary_query": "portable espresso maker camping",
      "query_count": 2,
      "queries": ["camping portable espresso machine", "portable espresso maker camping"],
      "row_ids": ["gsc_abc123def456", "gsc_def456abc123"],
      "clicks": 42,
      "impressions": 2000,
      "ctr": 0.021,
      "position": 4.96,
      "top_pages": ["https://example.com/camping-espresso"]
    }
  ]
}
```

The service uses local token overlap only. It does not call embeddings, LLMs, GSC OAuth, WooCommerce, or WordPress. CTR is calculated from total clicks divided by total impressions, and `position` is impression-weighted.

## Opportunities

- `GET /api/stores/:storeId/opportunities`
- `GET /api/stores/:storeId/opportunities/:opportunityId`
- `POST /api/stores/:storeId/opportunities/:opportunityId/approve`
- `POST /api/stores/:storeId/opportunities/:opportunityId/reject`

## Tasks

- `GET /api/stores/:storeId/tasks`
- `GET /api/stores/:storeId/tasks/:taskId`
- `PATCH /api/stores/:storeId/tasks/:taskId`
- `POST /api/stores/:storeId/tasks/:taskId/generate-draft` - future-gated in Sprint 1 and returns `403`; it does not create a WordPress draft.
- `POST /api/stores/:storeId/tasks/:taskId/approve`
- `POST /api/stores/:storeId/tasks/:taskId/reject`
- `POST /api/stores/:storeId/tasks/:taskId/snooze`

### Demo task status contract

`PATCH /api/stores/:storeId/tasks/:taskId` accepts a JSON body with `status`.

Allowed Sprint 1 demo statuses:

- `new`
- `approved`
- `rejected`
- `snoozed`

Responses:

- `200` returns `{ "store_id": "...", "task": { ... } }` with the updated task status.
- `400` is returned when `status` is missing, not a string, or outside the allowed Sprint 1 demo statuses.
- `404` is returned when `taskId` does not match a demo task.

The demo status override is reflected by both `GET /api/stores/:storeId/tasks/:taskId` and `GET /api/stores/:storeId/tasks`.

## Assets

- `GET /api/stores/:storeId/assets`
- `GET /api/stores/:storeId/assets/:assetId`
- `PATCH /api/stores/:storeId/assets/:assetId`
- `POST /api/stores/:storeId/assets/:assetId/publish-wordpress-draft`

## Performance

- `GET /api/stores/:storeId/performance`
- `GET /api/stores/:storeId/assets/:assetId/performance`
- `POST /api/stores/:storeId/performance/refresh`
