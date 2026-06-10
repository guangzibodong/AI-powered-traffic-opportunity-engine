# Sprint 3 Performance Snapshot UI Contract

Date: 2026-06-10

## Decision

The first performance UI will be a read-only local snapshot panel. It can render snapshots from the local `GET /api/stores/:storeId/performance` endpoint, which aggregates already-imported GSC CSV rows. It must not refresh live GSC, run OAuth, collect credentials, create WordPress drafts, update WordPress pages, publish content, sync integrations, or write WooCommerce data.

## Allowed Data

The UI may read only:

```txt
GET /api/stores/:storeId/performance
```

Allowed display fields:

- Snapshot window.
- Imported GSC source label.
- Clicks.
- Impressions.
- CTR.
- Average position.
- Query count.
- Page count.
- Blocked capabilities.
- `externalWriteAllowed: false`.
- `safetyScope: local_imported_gsc_only`.

## Forbidden Controls

The first UI must not render:

- Refresh performance.
- Sync GSC.
- Connect GSC.
- OAuth, API key, token, secret, password, or credential fields.
- Create WordPress draft.
- Update WordPress page.
- Publish.
- Apply.
- Autopilot.
- WooCommerce product, price, stock, inventory, or catalog write controls.
- External links or `target="_blank"` navigation.

Forbidden request targets:

- `POST /performance/refresh`.
- `/integrations/gsc/connect`.
- `/sync`.
- `/publish-wordpress-draft`.
- WordPress page update or publish endpoints.
- WooCommerce write endpoints.
- External `http` or `https` URLs.

## Layout

Use the current TrafScope workbench style:

- Compact read-only panel, not a landing page.
- 1px neutral borders, light canvas, 8px or smaller radius.
- Dense metric rows for clicks, impressions, CTR, and position.
- Small safety strip with `Local imported GSC only` and blocked capability copy.
- Bilingual-ready labels that wrap on mobile.

## Required Tests Before UI Rendering

- API-client fixture proves `getPerformanceSnapshots` is GET-only and sends no body.
- Adapter fixture proves performance snapshots clamp `externalWriteAllowed` to `false`.
- Adapter fixture hides raw backend source labels and exposes safe `Imported GSC` copy.
- Browser smoke must verify the panel has no buttons, links, forms, credential inputs, refresh, sync, publish, draft, or commerce-write controls before it is considered shippable.

## Current Status

Implemented foundation:

- Backend `GET /performance` returns local-only aggregate snapshots from imported GSC CSV rows.
- Frontend API client exposes `getPerformanceSnapshots`.
- Frontend adapter exposes `mapApiPerformanceSnapshotsToPreviews`.
- Frontend view model exposes `PerformanceSnapshotPreview` with `externalWriteAllowed: false` and `safetyScope: "local_imported_gsc_only"`.
- Visible workbench panel renders local imported GSC snapshot metrics with compact read-only safety diagnostics.
- Browser smoke verifies the panel reads `/performance` exactly once with GET, shows `Local imported GSC only`, renders imported clicks, impressions, CTR, position, and coverage, and exposes no controls, links, credential fields, refresh, sync, publish, draft, or commerce-write copy.
- Browser smoke verifies empty and unavailable states expose stable `data-performance-empty-state-key` diagnostics while keeping `/performance` GET-only and free of refresh, sync, credential, publish, draft, and commerce-write controls.

Still gated:

- Asset-specific performance matching.
- Before/after comparison UI.
- Live GSC OAuth or refresh.
