# Sprint 3 Safe Local Asset Editor Contract

Date: 2026-06-09

## Decision

The next asset milestone is a local-only structured editor contract. It is not a WordPress draft workflow, not a publishing workflow, and not a commerce write workflow.

Product, backend, frontend, UI, and QA agree on this sequence:

1. Define the local edit contract in documentation.
2. Add failing backend tests for the safe local `PATCH /assets/:assetId` behavior.
3. Implement only the local in-memory asset update path.
4. Add frontend API client and adapter tests.
5. Add editor UI only after the backend and frontend contracts prove there are no external writes.

Until those gates pass, the current UI remains read-only.

## Current Baseline

Existing Sprint 3 behavior:

- `GET /api/stores/:storeId/assets` lists local asset draft candidates.
- `POST /api/stores/:storeId/assets/from-task/:taskId` creates a local draft candidate from an approved demo task.
- `GET /api/stores/:storeId/assets/:assetId` reads one local draft candidate.
- `PATCH /api/stores/:storeId/assets/:assetId` returns `403`.
- `POST /api/stores/:storeId/assets/:assetId/publish-wordpress-draft` returns `403`.
- The frontend reads and renders the asset workspace in API mode, but exposes no editor, no links, no credential fields, no sync controls, no WordPress draft controls, and no commerce write controls.

## Planned Local PATCH Contract

Endpoint:

```txt
PATCH /api/stores/:storeId/assets/:assetId
```

Allowed request fields for the first local editor:

| Field | Type | Notes |
|---|---|---|
| `title` | string | Plain text, trimmed, length-limited. |
| `slug` | string | Local slug only, normalized to lowercase URL-safe text. |
| `meta_title` | string | Plain text SEO title draft. |
| `meta_description` | string | Plain text SEO description draft. |
| `content_blocks` | array | Structured local content blocks only. |
| `faq_items` | array | Local FAQ question/answer drafts only. |
| `schema_json` | object | Local schema preview only; no script tags, external ids, or publish hooks. |
| `internal_links` | array | Store-relative references only; no external navigation URLs. |
| `editor_note` | string | Internal local note for reviewer context. |

Allowed `content_blocks` fields:

| Field | Type | Notes |
|---|---|---|
| `type` | string | Must be one of `answer_summary`, `section`, `faq`, `internal_link_suggestions`, `metadata_only`, or `product_grid_notes`. |
| `heading` | string | Plain text, optional for some block types. |
| `body` | string | Plain text or markdown-safe text. Raw HTML is not accepted. |
| `items` | array of strings | Plain text list items only. |

Response shape:

```json
{
  "mode": "asset_draft_workspace",
  "store_id": "store-demo-outdoor-coffee",
  "asset": {
    "id": "asset_task_002",
    "review_state": "draft_candidate",
    "external_write_allowed": false,
    "blocked_capabilities": [
      "wordpress_draft_creation",
      "wordpress_publish",
      "woocommerce_writes"
    ]
  }
}
```

The response may include the updated safe display fields, but it must keep `external_write_allowed: false` and the same blocked capabilities.

## Forbidden Fields And Actions

The local editor must reject or ignore any attempt to change these fields:

- `id`
- `store_id`
- `source_task_id`
- `source_task_status`
- `asset_type`
- `metadata.source`
- `metadata.opportunity_id`
- `metadata.automation_level`
- `claim_ledger`
- `qa_checks`
- `review_state`
- `publish_preview.wordpress_draft_allowed`
- `publish_preview.external_write_allowed`
- `external_write_allowed`
- `blocked_capabilities`
- `wordpress_draft_id`
- `wordpress_post_id`
- `wp_post_id`
- `published_url`
- `wordpress_status`
- `wordpress_url`
- `external_url`
- `permalink`
- `href`
- `credential`
- `credentials`
- `token`
- `api_key`
- `secret`
- `password`
- WooCommerce product, price, stock, inventory, catalog, or status fields.

Forbidden actions remain blocked:

- Real Google Search Console OAuth.
- Live credential collection or storage.
- Sync execution.
- LLM generation or live connector calls.
- WordPress draft creation.
- WordPress page update.
- WordPress publishing.
- External navigation from asset rows or editor fields.
- WooCommerce writes.
- Task statuses beyond `new`, `approved`, `rejected`, and `snoozed`.

## Validation Rules

Backend validation must enforce:

- Unknown asset returns `404`.
- Empty or non-object request body returns `400`.
- Unknown top-level fields return `400` or `403`.
- Any forbidden external-write field returns `403`.
- Any credential-like key returns `403`.
- Slugs are normalized or rejected if they cannot become URL-safe local slugs.
- Content block types outside the allowlist return `400`.
- Raw HTML, script tags, and external hrefs are rejected.
- Store isolation is enforced: one store cannot PATCH or read another store's local asset.
- Returned assets are deep copies, so callers cannot mutate stored state through response objects.
- Updating local content resets or preserves QA as a local review state only; it cannot mark a draft ready for WordPress.
- Local edits write a sanitized audit event only after an audit contract is defined; raw edited content and credential-like payload fields must not be stored in audit metadata.

## Required Backend Tests

Before implementation, add failing tests that prove:

- An approved demo task can create an asset, then a local PATCH updates allowed fields.
- The local PATCH response keeps `mode: "asset_draft_workspace"` and `external_write_allowed: false`.
- The stored asset detail and list reads reflect the local edit.
- Unknown asset PATCH returns `404`.
- Forbidden fields such as `external_write_allowed`, `blocked_capabilities`, `wordpress_draft_id`, and `href` are rejected.
- Credential-like payload keys are rejected and are never stored or returned.
- Invalid content block types and raw HTML are rejected.
- WordPress draft creation still returns `403` after local edits.
- WooCommerce write concepts are still absent from the asset route surface.
- Store isolation prevents one store from updating or reading another store's asset.
- Local edit audit logging is sanitized when the audit hook is introduced.

Preferred test file:

```txt
apps/api/app/tests/test_asset_safety.py
```

If the file grows too broad, create:

```txt
apps/api/app/tests/test_asset_editor_contract.py
```

## Required Frontend Tests

Frontend work can begin only after the backend local PATCH contract passes.

Required API client and adapter coverage:

- `updateAsset` exists only after backend tests pass.
- `updateAsset` sends `PATCH` only to `/assets/:assetId`.
- The request body contains only allowed local editor fields.
- Store and asset path segments are URL encoded.
- The safe adapter keeps `externalWriteAllowed` false.
- The safe adapter keeps `externalWriteAllowed` false even if an unsafe backend fixture returns `external_write_allowed: true` or `publish_preview.wordpress_draft_allowed: true`.
- The adapter does not expose raw forbidden keys to UI state.

Required browser smoke coverage before visible editor release:

- Editor controls appear only on an existing local asset candidate.
- Saving an edit sends exactly one local `PATCH`.
- No request is made to `publish-wordpress-draft`, `/sync`, connect endpoints, WooCommerce write endpoints, or external URLs.
- No credential-like input appears, including `type=password` or field names, ids, labels, or placeholders containing token, secret, api key, oauth, credential, or password.
- No external navigation appears in asset rows or editor surfaces, including `href`, `target="_blank"`, or `role="link"`.
- The page still renders blocked capability context after save.
- Bilingual English and Chinese labels fit compact controls and do not imply publishing.
- Desktop and mobile screenshots prove long titles, slugs, internal-link references, and bilingual labels do not overflow their containers.
- Copy must avoid executable implications such as `Publish`, `Apply`, `Autopilot`, `Sync`, or `Connect` until those flows have their own approved contracts.
- Asset workspace unavailable state still shows no editor controls.

## UI Scope

The first editor UI should be structured and compact:

- Left: task/evidence context and blocked capability context.
- Center: title, slug, meta draft, structured content blocks, FAQ, and internal link suggestions.
- Right: QA diagnostics and save status.

The first UI must not include:

- Rich text editor plugins.
- External link previews.
- WordPress draft buttons.
- Publish buttons.
- Credential inputs.
- Sync buttons.
- Product price, stock, inventory, or status editors.

## Backend Status

The backend local-only PATCH contract has a red-green test path:

- Red tests define allowed local fields, unknown asset handling, forbidden external-write fields, credential rejection, raw HTML rejection, persisted list/detail reads, and continued WordPress draft `403`.
- The green implementation updates only the in-memory local asset draft and keeps `external_write_allowed: false`.
- Frontend client exposure is now limited to a safe local `updateAsset` helper with request-body allowlisting and adapter external-write clamping.
- Editor UI remains gated.

## Frontend Status

The frontend local asset update client has a red-green contract path:

- Red tests require `updateAsset` to encode asset paths, use only `PATCH /assets/:assetId`, send JSON, and strip unsafe top-level and nested content-block fields before fetch.
- Adapter fixtures clamp unsafe backend asset responses to `externalWriteAllowed: false` and do not expose raw href or WordPress draft ids in the safe preview.
- The visible app still does not render editor controls, WordPress draft controls, sync controls, credential fields, href navigation, or commerce-write controls.

## Browser QA Status

Browser smoke now proves the asset workspace UI gate remains closed:

- Asset workspace panels expose no buttons, links, forms, inputs, textareas, contenteditable regions, role buttons, role links, or href navigation.
- Credential-like inputs are absent.
- Save, edit, sync, connect, credential, apply, autopilot, WordPress draft creation, and publish action copy is absent from the asset panel.
- API-mode board loading still reads the asset workspace with GET and does not issue asset PATCH requests from the visible UI.

## Next Task

The next safe implementation task is editor UI contract planning:

```txt
TASK-S3-PM-030 Plan structured asset editor UI contract.
```

That task should define the first visible editor workflow, layout, copy, bilingual states, and browser gates before any editable UI is added.
