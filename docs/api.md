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
- `POST /api/stores/:storeId/products/import-woocommerce`
- `GET /api/stores/:storeId/products/:productId/opportunities`

### WooCommerce product import contract

`POST /api/stores/:storeId/products/import-woocommerce` accepts WooCommerce-like product JSON fixtures:

```json
{
  "products": [
    {
      "id": 101,
      "name": "Trail Brew Portable Espresso Maker",
      "slug": "trail-brew-portable-espresso-maker",
      "sku": "TB-ESP-01",
      "status": "publish",
      "permalink": "https://example.com/product/trail-brew-portable-espresso-maker",
      "price": "89.00",
      "stock_status": "instock",
      "categories": [{ "name": "Camping Coffee" }],
      "attributes": [{ "name": "Use case", "options": ["Camping", "Travel"] }],
      "images": [{ "src": "https://example.com/images/trail-brew.jpg" }]
    }
  ]
}
```

Responses:

- `200` returns `{ "mode": "woocommerce_import", "summary": { ... } }`.
- `400` is returned when `products` is missing or is not an array.

Imported products are in-memory, scoped per store, and idempotent by store and WooCommerce external id. The read endpoints return normalized fields such as `external_id`, `name`, `slug`, `sku`, `status`, `stock_status`, `in_stock`, `price`, `categories`, `attributes`, `images`, and `permalink`.

This is a read/import flow only. It does not create, update, delete, publish, price-edit, or inventory-edit WooCommerce products.

## Pages

- `GET /api/stores/:storeId/pages`
- `GET /api/stores/:storeId/pages/:pageId`
- `POST /api/stores/:storeId/pages/import-wordpress`

### WordPress page import contract

`POST /api/stores/:storeId/pages/import-wordpress` accepts WordPress-like page or post JSON fixtures:

```json
{
  "pages": [
    {
      "id": 201,
      "slug": "camping-espresso",
      "status": "publish",
      "type": "page",
      "link": "https://example.com/camping-espresso",
      "title": { "rendered": "Camping Espresso Collection" },
      "excerpt": { "rendered": "Portable espresso makers for camp coffee." },
      "yoast_head_json": {
        "title": "Camping Espresso Makers",
        "description": "Compare portable espresso makers for camping.",
        "robots": { "index": "index" }
      }
    }
  ]
}
```

Responses:

- `200` returns `{ "mode": "wordpress_import", "summary": { ... } }`.
- `400` is returned when `pages` is missing or is not an array.

Imported pages are in-memory, scoped per store, and idempotent by store and WordPress external id. The read endpoints return normalized fields such as `external_id`, `url`, `title`, `slug`, `status`, `page_type`, `indexable`, `seo`, `excerpt`, and `content_hash`.

This is a read/import flow only. It does not create WordPress drafts, overwrite pages, publish content, or call live write operations.

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

## Imported Graph

- `GET /api/stores/:storeId/imported-graph`

### Imported signal graph contract

`GET /api/stores/:storeId/imported-graph` links imported query clusters to imported products and WordPress pages:

```json
{
  "mode": "imported_graph",
  "store_id": "store-demo-outdoor-coffee",
  "summary": {
    "query_clusters": 2,
    "product_matches": 2,
    "page_matches": 2
  },
  "query_clusters": [
    {
      "cluster_key": "camping-espresso-maker-portable",
      "primary_query": "portable espresso maker camping",
      "matched_products": [
        {
          "product_id": "wc_abc123def456",
          "name": "Trail Brew Portable Espresso Maker",
          "match_score": 100,
          "match_terms": ["camping", "espresso", "maker", "portable"]
        }
      ],
      "best_existing_page": {
        "page_id": "wp_abc123def456",
        "url": "https://example.com/camping-espresso",
        "match_type": "gsc_top_page"
      }
    }
  ]
}
```

Product matches require at least three meaningful token overlaps. Page matches first use exact GSC top-page URL matches, then conservative token overlap fallback. This endpoint is read-only and does not call external services.

## Opportunities

- `GET /api/stores/:storeId/opportunities`
- `GET /api/stores/:storeId/opportunities/:opportunityId`
- `GET /api/stores/:storeId/imported-opportunities`
- `POST /api/stores/:storeId/opportunities/:opportunityId/approve`
- `POST /api/stores/:storeId/opportunities/:opportunityId/reject`

### Imported opportunity preview contract

`GET /api/stores/:storeId/imported-opportunities` returns deterministic opportunity previews from the imported graph:

```json
{
  "mode": "imported_opportunities",
  "store_id": "store-demo-outdoor-coffee",
  "summary": {
    "opportunities": 1,
    "source_query_clusters": 1,
    "by_rule": { "high_impression_low_ctr": 1 }
  },
  "opportunities": [
    {
      "id": "impopp_abc123def456",
      "rule_id": "high_impression_low_ctr",
      "rule_version": 1,
      "recommended_task_type": "ctr_refresh",
      "status": "new",
      "dedupe_key": "store-demo-outdoor-coffee:imported:high_impression_low_ctr:...",
      "source_cluster": { "primary_query": "portable espresso maker camping" },
      "related_page": { "url": "https://example.com/camping-espresso" },
      "related_products": [],
      "evidence": []
    }
  ]
}
```

Current imported preview rules:

- `high_impression_low_ctr`: imported cluster has an indexable existing page, at least 1,000 impressions, CTR at or below 3%, and average position of 20 or better.
- `collection_page_gap`: imported cluster has no best existing page and at least three matched imported products.

This endpoint is read-only. It does not create tasks, assets, WordPress drafts, WooCommerce changes, or external sync jobs.

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
