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
- Before/after tracking state.
- Imported baseline snapshot id.
- Evidence row count.
- Follow-up state when after metrics are not yet tracked.
- Empty and unavailable comparison diagnostics.
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
- Backend `GET /assets/{asset_id}/performance` returns local-only imported GSC snapshots matched to local asset draft title, slug, and meta tokens; unknown local assets return 404 and unmatched assets return an empty local-only payload.
- Frontend API client exposes `getAssetPerformanceSnapshots`; frontend adapter maps asset performance payloads through `mapApiAssetPerformanceSnapshotsToPreviews`, clamps `externalWriteAllowed` to `false`, clamps `matchScope` to `local_asset_query_page_tokens`, and keeps raw live/source fields hidden.
- Visible local asset editor UI renders a read-only asset performance panel after a safe GET to `/assets/{asset_id}/performance`, showing local imported GSC metrics and match-scope diagnostics without refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Visible store performance UI renders a read-only before/after comparison section for imported baseline snapshots, marks after metrics as not yet tracked instead of inventing deltas, and exposes stable local-only DOM diagnostics without adding refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Browser smoke verifies the before/after comparison section remains visible in empty and unavailable performance states with stable empty-state keys and without rendering comparison metric rows, controls, links, credentials, refresh, sync, publish, draft, navigation, or commerce-write behavior.
- Visible local asset performance UI renders a read-only asset before/after comparison section for the selected local asset baseline, marks follow-up metrics as not yet tracked, preserves `local_asset_query_page_tokens` diagnostics, and exposes no refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Browser smoke verifies asset before/after comparison empty and unavailable states stay visible with stable local-only keys, preserve `local_asset_query_page_tokens`, render zero populated comparison metric rows, and expose no refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Store and asset performance panels expose a stable read-only `Imported GSC` source diagnostic from the safe frontend adapter without exposing raw live source labels or adding refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Store and asset performance panels expose stable read-only local snapshot id diagnostics for populated imported GSC baselines without adding refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Store and asset performance panels expose stable read-only evidence count diagnostics for populated imported GSC baselines without adding refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Store and asset performance panels expose stable read-only split query count and page count diagnostics alongside compact coverage copy without adding refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Asset performance panels expose stable read-only blocked capability count diagnostics across populated, empty, and unavailable states without adding refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Store performance panels expose stable read-only store-specific blocked capability count diagnostics across populated, empty, and unavailable states without adding refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Store and asset before/after comparison panels expose stable read-only blocked capability count diagnostics across populated, empty, and unavailable states without adding refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Asset before/after comparison panels expose stable read-only snapshot count diagnostics across populated, empty, and unavailable states without adding refresh, sync, credential, WordPress, publish, navigation, or commerce-write controls.
- Store and asset before/after comparison panels expose stable read-only `Imported GSC` source diagnostics for populated local imported baselines while empty and unavailable states keep populated metric rows hidden.

Still gated:

- Live GSC OAuth or refresh.
