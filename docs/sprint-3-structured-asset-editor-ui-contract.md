# Sprint 3 Structured Asset Editor UI Contract

Date: 2026-06-09

## Decision

The first visible asset editor will be a local structured review surface. It will use the safe local `updateAsset` client helper, but it will not create WordPress drafts, publish content, sync integrations, collect credentials, navigate to external URLs, or write WooCommerce data.

This contract must be implemented before any editor UI appears in the app.

## Entry Point

The first editor entry point should be scoped to an existing local asset candidate from the asset workspace.

Allowed entry:

- A local asset candidate row can expose a compact `Review local draft` control after browser tests are ready.

Blocked entries:

- No editor for unavailable asset workspace states.
- No editor for imported task previews.
- No editor for unapproved demo tasks.
- No editor from catalog, query, opportunity, sync, integration, or audit rows.
- No route or button that implies WordPress draft creation.

## Layout

The editor should use a dense three-zone layout, matching the Refero-inspired TrafScope workbench style:

| Zone | Purpose | Content |
|---|---|---|
| Left context rail | Why this asset exists | Source task id, source task status, asset type, evidence summary, blocked capabilities, QA readiness. |
| Center editor | Local structured draft fields | Title, slug, meta title, meta description, content blocks, FAQ items, schema preview, internal links, editor note. |
| Right QA rail | Whether it is safe to continue | QA check counts, pending check list, external writes false, WordPress draft readiness diagnostic only. |

Visual rules:

- Light canvas, fog-gray panels, 1px neutral borders, compact 8px panel radius.
- No nested cards inside cards.
- No gradients, glass effects, decorative AI imagery, or dark hero treatment.
- Dense app typography, not marketing hero scale.
- Buttons use 4px radius and clear command labels.
- Long titles, slugs, internal-link references, and bilingual labels must wrap without resizing fixed controls.

## Allowed Controls

The first editor may expose only local-save controls:

| Control | English | Chinese | Behavior |
|---|---|---|---|
| Primary local save | Save local draft | 保存本地草稿 | Calls safe local `PATCH /assets/:assetId`. |
| Secondary close | Close | 关闭 | Returns to the board or previous panel without writes. |
| Optional reset | Reset local changes | 重置本地修改 | Resets unsaved local form state only. |

Required save states:

- Idle: `Save local draft` / `保存本地草稿`.
- Pending: `Saving local draft` / `正在保存本地草稿`.
- Success: `Local draft saved` / `本地草稿已保存`.
- Failed: `Local save failed` / `本地保存失败`.
- Unavailable: no form controls; show read-only unavailable state.

The save button must be disabled while a save is in flight.

## Forbidden Controls And Copy

The editor must not expose:

- `Create WordPress draft`.
- `Publish`.
- `Apply`.
- `Autopilot`.
- `Sync`.
- `Connect`.
- Credential, token, API key, OAuth, secret, or password fields.
- External URL links or `target="_blank"`.
- WooCommerce product, price, stock, inventory, catalog, or status editors.
- Task review status controls beyond the existing task detail review actions.

Forbidden request targets from the editor:

- `/publish-wordpress-draft`
- `/sync`
- `/integrations/*/connect`
- WooCommerce write endpoints.
- WordPress page update or publish endpoints.
- Any external `http` or `https` URL.

## Field Rules

Visible fields must map only to the backend local update allowlist:

- `title`
- `slug`
- `meta_title`
- `meta_description`
- `content_blocks`
- `faq_items`
- `schema_json`
- `internal_links`
- `editor_note`

Content blocks:

- The UI should render one block per structured item.
- Block type is visible but not freeform for the first version.
- Block fields are `heading`, `body`, and `items` only.
- No raw HTML editor.
- No rich text editor plugin.
- No external link picker.

FAQ:

- Question and answer fields only.
- No FAQ schema publishing action.

Internal links:

- Store-relative references only, such as `collection:camping-coffee`.
- No clickable external anchors.

Schema preview:

- Display local JSON preview as text.
- No script tag rendering.
- No publish action.

## Safety Copy

Every editor view must keep this safety context visible:

English:

- `Local draft only`
- `External writes disabled`
- `WordPress draft creation blocked`
- `WooCommerce writes blocked`

Chinese:

- `仅本地草稿`
- `外部写入已关闭`
- `WordPress 草稿创建已阻止`
- `WooCommerce 写入已阻止`

Avoid vague AI copy such as:

- `Let AI publish this`
- `Autopilot`
- `One-click apply`
- `Push live`
- `Instant sync`

## API Client Rules

The editor must call only:

```txt
PATCH /api/stores/:storeId/assets/:assetId
```

The request body must be produced through the safe `updateAsset` helper and its allowlist sanitizer. The UI cannot assemble arbitrary JSON for fetch.

After save:

- Refresh or reconcile only the local asset preview state.
- Keep `externalWriteAllowed` false in UI state.
- Keep blocked capabilities visible.
- Do not mark WordPress draft readiness as executable.

## Required Tests Before UI Implementation

Add failing tests before implementation:

- UI contract test requires editor copy to include local-only language and exclude forbidden publish/sync/connect/autopilot copy.
- API client fixture remains green and proves `updateAsset` strips unsafe top-level and nested content block fields.
- Browser smoke opens an asset candidate editor and verifies a single local PATCH on save.
- Browser smoke verifies no request to WordPress draft, sync, connect, WooCommerce write, or external URL targets.
- Browser smoke verifies no credential-like inputs.
- Browser smoke verifies no href or role link in asset editor content.
- Browser smoke verifies unavailable asset workspace states expose no editor entry or editor form.
- Desktop and mobile browser screenshots prove long bilingual labels and long slugs do not overflow.

## Implementation Sequence

1. Add UI contract tests for editor copy and forbidden controls.
2. Add browser smoke route fixture with one local candidate.
3. Add a hidden-by-default editor state model.
4. Render editor only for local candidates.
5. Wire `Save local draft` to `updateAsset`.
6. Re-run browser safety checks before any commit.

## Implementation Status

The first local editor slice is implemented with a conservative scope:

- Local asset candidates expose `Review local draft`.
- The editor saves title, slug, meta title, meta description, one structured section, and editor note through the safe `updateAsset` helper.
- The editor saves one local FAQ question/answer draft pair through the safe `faq_items` allowlist without exposing schema publishing.
- The editor exposes `Reset local changes` as a local-only form reset that restores unsaved field values without sending `PATCH /assets/:assetId`.
- The editor keeps `Local draft only`, `External writes disabled`, `WordPress draft creation blocked`, and `WooCommerce writes blocked` visible.
- Browser smoke proves the save path issues exactly one safe local asset PATCH and no unsafe asset requests.
- Mobile browser smoke verifies the Chinese editor copy, a long local title, local save success, and horizontal containment of editor controls.
- Browser smoke verifies a local asset PATCH failure keeps the editor open, shows `Local save failed`, re-enables `Save local draft`, and still records no WordPress draft, publish, sync, credential, external navigation, or commerce-write requests.
- Browser smoke verifies retry-after-failure by failing the first local asset PATCH, succeeding on the second local PATCH, clearing the failure copy with `Local draft saved`, and still recording no unsafe requests.
- Browser smoke verifies `Close` hides the local editor after unsaved edits without issuing a local asset PATCH or any WordPress draft, publish, sync, credential, external navigation, or commerce-write request.
- Browser smoke verifies `Reset local changes` restores local draft fields and dirty diagnostics without closing the editor, issuing a local asset PATCH, or touching WordPress draft, publish, sync, credential, external navigation, or commerce-write paths.
- Browser smoke verifies local FAQ question/answer draft fields are included in field readiness and dirty diagnostics, then saved through `faq_items` in one safe local asset PATCH without FAQ schema publishing, WordPress draft, publish, sync, credential, external navigation, or commerce-write paths.
- Browser smoke verifies reopening after close discards unsaved local edits, restores the safe asset preview title and empty local-only editor fields, and records no write requests.
- Browser smoke verifies close-after-failed-save feedback reset with red-green coverage: stale `Local save failed` feedback is cleared when the local editor closes, and reopening starts from neutral local-only feedback.
- Browser smoke verifies close-after-success feedback reset: stale `Local draft saved` feedback is cleared after close and reopen while the saved local asset preview title remains visible.
- Browser smoke verifies reopening during a delayed local save resets the button from pending/disabled back to an enabled `Save local draft` state without unsafe requests.
- Browser smoke verifies delayed local save success and failure responses after Close do not repaint stale feedback into a reopened local editor; stale async feedback is suppressed by the local editor session guard.
- Browser smoke verifies cross-asset feedback isolation: switching from a delayed first asset save to a second asset editor keeps the second editor neutral after the first response resolves.
- Browser smoke verifies second-asset save isolation: after switching from a delayed first asset save, saving the second asset targets only the second asset PATCH, shows second-asset feedback, and avoids unsafe requests.
- Browser smoke verifies same-asset double-submit protection: a forced click on the disabled pending save button still results in exactly one local PATCH and no unsafe requests.
- Browser smoke verifies closing during a pending local save does not submit again, does not reopen the editor after the delayed response, and records only one local PATCH.
- Browser smoke verifies closing during a pending local save, waiting for the delayed response to resolve, and reopening the same asset starts from neutral local-only feedback with no stale success/failure copy and only one local PATCH.
- Browser smoke captures and verifies `docs/design-mockups/screenshots/local-asset-editor-mobile-zh.png` as a mobile local editor QA artifact after confirming Chinese local-only safety copy, contained editor controls, one safe local PATCH, and no unsafe requests.
- Browser smoke captures and verifies `docs/design-mockups/screenshots/local-asset-editor-desktop-en.png` as a desktop local editor QA artifact after confirming English local-only safety copy, contained editor controls, one safe local PATCH, and no unsafe requests.
- Frontend asset adapters expose safe local QA check detail previews with allowlisted keys/statuses, clamp unsafe values to `local_review` and `pending`, preserve aggregate counts, and do not expose raw QA metadata, credential-like values, QA mutation controls, WordPress draft creation, publishing, sync, OAuth, or commerce writes.
- Asset workspace rows render safe QA detail labels with stable `data-asset-qa-detail`, `data-asset-qa-key`, and `data-asset-qa-status` diagnostics while browser smoke keeps unsafe QA metadata and draft/publish/sync controls absent.
- Asset workspace rows expose read-only row-level QA detail count and pending count reconciliation markers so each visible row's rendered safe QA details match that row's safe QA totals without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Asset workspace rows expose read-only row-level QA status distribution rows and reconciliation markers so each visible row's status counts match that row's safe QA details without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Asset workspace rows expose read-only row-level QA readiness state, pending/total counts, visible readiness summary copy, and reconciliation markers so each visible row's readiness matches that row's safe QA details without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Asset workspace rows expose read-only row-level blocked capability counts, key rows, and reconciliation markers so each visible row's safety diagnostics match that row's safe blocked capability list without draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace panel exposes read-only workspace-level blocked capability key rows and a reconciliation marker so visible panel safety rows match the workspace blocked capability count without claim editing, QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace WordPress draft readiness row exposes a read-only reconciliation marker proving ready counts do not exceed total local draft counts and total readiness counts match the local asset draft count without WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace external-write row exposes read-only clamp reconciliation markers proving root and visible external-write diagnostics both stay false without external writes, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace availability row exposes read-only reconciliation markers proving the visible availability state matches the root workspace availability state across empty, ready, and unavailable panels without external writes, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace local candidate count row exposes read-only reconciliation markers proving the visible count matches the root local asset draft count without external writes, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace visible-row overflow diagnostics expose read-only visible and hidden row count markers proving visible rows plus hidden overflow rows match the root local asset draft count without external writes, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace type mix diagnostics expose read-only per-type rows and reconciliation markers proving local asset type counts sum to the root local asset draft count without external writes, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace local review-state diagnostics expose read-only review-state rows and reconciliation markers derived from existing local asset preview state without adding product task statuses beyond `new`, `approved`, `rejected`, and `snoozed`, task mutation, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace source task diagnostics expose read-only source task rows and reconciliation markers derived from local asset preview `sourceTaskId` values without task mutation, product task status expansion, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace source task status diagnostics expose read-only status rows and reconciliation markers derived from safe local asset preview `sourceTaskStatus` values without adding product task statuses beyond `new`, `approved`, `rejected`, and `snoozed`, task mutation, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace QA aggregate diagnostics expose read-only total, visible, hidden, and reconciliation markers proving visible plus hidden QA check and pending counts match the root local asset QA totals without QA mutation, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace QA readiness diagnostics expose read-only pending/total count markers and a reconciliation marker proving readiness state matches safe local QA totals across populated, no-QA, and unavailable states without QA mutation, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace content block aggregate diagnostics expose read-only total, visible, hidden, and reconciliation markers proving visible plus hidden content block counts match the root local asset content block total without rich text editing, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- The asset workspace content block type diagnostics expose read-only workspace-level type rows and reconciliation markers proving local content block type counts sum to the root local asset content block total without rich text editing, WordPress draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Asset workspace rows expose read-only row-level content block type distribution rows and reconciliation markers so each visible row's block type counts match that row's safe content block count without rich text editing, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Asset workspace rows expose read-only row-level content block count reconciliation markers so each visible row's type rows match that row's safe content block count without rich text editing, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only content block type distribution rows and reconciliation markers so the selected asset's editor diagnostics match the safe content block count without rich text editing, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only content block count reconciliation markers so editor-visible content block type rows match the selected asset's safe content block count without rich text editing, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor renders the same safe QA detail labels with editor-specific `data-asset-editor-qa-detail`, `data-asset-editor-qa-key`, and `data-asset-editor-qa-status` diagnostics while keeping QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, and commerce-write controls absent.
- Local asset editor exposes read-only QA aggregate diagnostics with `data-asset-editor-qa-check-count`, `data-asset-editor-qa-pending-count`, and `data-asset-editor-qa-readiness-state`, derived only from safe local QA previews.
- Local asset editor renders a compact visible read-only QA aggregate summary with `data-asset-editor-qa-summary`, `data-asset-editor-qa-readiness`, and `data-asset-editor-qa-checks`, showing bilingual-safe readiness and pending/check copy without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor exposes read-only QA readiness pending/total counts and reconciliation markers on both the editor root and visible readiness summary, proving editor readiness matches safe QA detail counts without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only QA status distribution rows and reconciliation markers so selected asset editor QA statuses match safe QA detail rows without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only QA detail count and pending detail count reconciliation markers so rendered safe QA detail rows match selected asset QA totals without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only source task id/status context rows from the selected safe local asset preview without task mutation, product task status expansion, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only asset type context rows from the selected safe local asset preview without asset type mutation, task mutation, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only local asset review-state context rows from the selected safe local asset preview without product task status expansion, review mutation, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only evidence summary context from safe local claim counts without claim editing, task mutation, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only WordPress draft readiness context as blocked `0/1 ready` diagnostics for the selected local asset without draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only external-write false context from the selected safe local asset preview without external writes, draft creation, page updates, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor exposes read-only commerce-write false context without WooCommerce writes, product edits, price edits, inventory edits, draft creation, publishing, sync, OAuth, credential, navigation, or task mutation controls.
- Local asset editor exposes read-only live-access false context without credential collection/storage, real OAuth, sync, external writes, draft creation, publishing, navigation, product edit, commerce-write, or task mutation controls.
- Local asset editor exposes read-only remote-run false context without sync execution, credential collection/storage, real OAuth, external writes, draft creation, publishing, navigation, product edit, commerce-write, or task mutation controls.
- Local asset editor exposes read-only public-release false context without publishing, draft creation, page updates, sync execution, credential collection/storage, real OAuth, external writes, navigation, product edit, commerce-write, or task mutation controls.
- Local asset editor renders a read-only safety strip with `data-asset-editor-safety`, `data-asset-editor-blocked-capability-count`, and `data-asset-editor-blocked-capability-key`, keeping external writes, WordPress draft creation, and WooCommerce writes visible as blocked diagnostics only.
- Local asset editor exposes a read-only blocked capability reconciliation marker on the safety strip, proving visible blocked capability key rows match the editor blocked capability count without claim editing, QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, product edit, or commerce-write controls.
- Local asset editor renders read-only save-state diagnostics with `data-asset-editor-save-state` and `data-asset-editor-save-feedback`, keeping idle, pending, saved, and failed local save states visible without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders read-only field fill diagnostics with `data-asset-editor-field-count`, `data-asset-editor-filled-field-count`, `data-asset-editor-empty-field-count`, and `data-asset-editor-field-summary`, keeping draft field completeness visible without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders read-only per-field diagnostics with `data-asset-editor-field-key` and `data-asset-editor-field-state`, keeping draft field completeness machine-readable without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders a read-only field reconciliation marker with `data-asset-editor-field-counts-reconciled`, proving the per-field rows reconcile with field count, filled count, and empty count across initial, edited, and saved local draft states without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders a read-only field readiness state with `data-asset-editor-field-readiness-state`, distinguishing `incomplete_fields` from `all_fields_filled` without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders a visible read-only field readiness summary row with `data-asset-editor-field-readiness`, keeping incomplete and complete local draft field states visible without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders read-only readiness row count diagnostics with `data-asset-editor-field-readiness-filled-count`, `data-asset-editor-field-readiness-empty-count`, and `data-asset-editor-field-readiness-total-count`, keeping the visible readiness row reconcilable with field totals without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders a read-only readiness row count reconciliation marker with `data-asset-editor-field-readiness-counts-reconciled`, proving filled plus empty equals total without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders a read-only dirty-state marker with `data-asset-editor-dirty-state`, distinguishing `clean` from `dirty` local field states across open, edit, save, and refill flows without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders a visible read-only dirty-state summary row with `data-asset-editor-dirty-summary`, keeping clean and dirty local field states visible without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders read-only dirty field count diagnostics with `data-asset-editor-dirty-field-count` and `data-asset-editor-dirty-summary-field-count`, keeping changed local field counts machine-readable without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders read-only per-field dirty diagnostics with `data-asset-editor-field-dirty-state`, keeping title, slug, meta title, meta description, structured section, and editor note clean/dirty markers reconciled with the root dirty field count without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders read-only dirty field key diagnostics with `data-asset-editor-dirty-field-keys` and `data-asset-editor-dirty-summary-field-keys`, keeping changed local field identities machine-readable without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders read-only dirty field key reconciliation diagnostics with `data-asset-editor-dirty-field-keys-reconciled` and `data-asset-editor-dirty-summary-field-keys-reconciled`, proving dirty field key lists match dirty field counts without QA mutation, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders one plain structured section heading field with `data-asset-editor-section-heading-draft` and `data-asset-editor-section-heading`, includes it in field readiness and dirty diagnostics, and saves it only through safe `content_blocks` section heading without rich text editing, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders one plain product grid notes draft field with `data-asset-editor-product-grid-notes-draft` and `data-asset-editor-product-grid-notes`, includes it in field readiness and dirty diagnostics, and saves it only through safe `content_blocks` as `product_grid_notes` without product edits, price edits, inventory edits, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders one plain local schema preview draft field with `data-asset-editor-schema-preview-draft` and `data-asset-editor-schema-preview`, includes it in field readiness and dirty diagnostics, and saves it only through safe `schema_json` without script tags, schema publishing, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor renders one plain internal link reference draft field with `data-asset-editor-internal-link-draft` and `data-asset-editor-internal-link-reference`, includes it in field readiness and dirty diagnostics, and saves it only through safe `internal_links` without external hrefs, navigation, draft creation, publishing, sync, OAuth, credential, or commerce-write controls.
- Frontend asset draft adapters expose safe read-only claim ledger previews with local id/source/text fields and claim counts, clamping unknown or credential-like values to local review defaults without claim editing, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Asset workspace rows and the local asset editor render read-only claim ledger diagnostics with stable claim count/detail/source/id DOM markers, preserving safe local evidence context without claim editing, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Asset workspace rows expose read-only row-level claim detail count and reconciliation markers so each visible row's rendered safe claim details match that row's safe claim count without claim editing, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Asset workspace rows expose read-only row-level claim source distribution rows and reconciliation markers so each visible row's source counts match that row's safe claim details without claim editing, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Asset workspace claim ledger diagnostics expose read-only total, visible, hidden, and reconciliation markers so compact visible rows plus hidden overflow claim counts reconcile with the total safe claim count without claim editing, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Asset workspace and local editor claim ledger diagnostics expose read-only source distribution rows and reconciliation markers so safe claim source counts reconcile with safe claim detail rows without claim editing, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.
- Local asset editor claim ledger diagnostics expose a read-only claim count reconciliation marker so rendered safe claim detail rows match the safe claim count without claim editing, draft creation, publishing, sync, OAuth, credential, navigation, or commerce-write controls.

Still gated:

- WordPress draft creation.
- Three-column full asset review route.
- Claim ledger editing.
- Rich schema editor.
- Rich text editor.

## Out Of Scope

- WordPress draft creation.
- WordPress publishing.
- WordPress page update.
- WooCommerce writes.
- Real GSC OAuth.
- Live sync execution.
- LLM generation.
- Rich text editing.
- External link navigation.
- Performance tracking updates.
