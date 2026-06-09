# Sprint 3 Asset Workspace Read-Only Handoff

Date: 2026-06-09

## Status

The Sprint 3 local asset workspace foundation is ready as a read-only UI/API slice. TrafScope can create local structured asset draft candidates from approved demo tasks, read those candidates back through the safe asset workspace API, and render compact workspace diagnostics in the API-backed board.

This handoff does not open an editor, create WordPress drafts, publish content, update WordPress pages, write WooCommerce data, collect credentials, or execute live sync jobs.

## Completed Local Loop

- Asset workspace API safety foundation with explicit blocked capabilities.
- In-memory local asset draft persistence from approved demo tasks.
- Frontend asset workspace API client and safe view-model adapters.
- Read-only asset workspace panel in API mode.
- Resilient asset loading: `/assets` failure does not collapse the main API board or imported preview panel.
- Asset candidate rows with stable diagnostics for id, review state, content block count, content block types, QA check count, and QA pending count.
- Workspace summaries for local candidate count, asset type mix, QA totals, QA readiness, WordPress draft readiness, external write clamp, blocked capabilities, and overflow.
- Browser smoke coverage for empty, populated, unavailable, QA pending, QA clear, no-QA, and overflow states.

## Safety Boundary

The completed slice still forbids:

- Real Google Search Console OAuth.
- Live credential collection or storage.
- WooCommerce product, price, stock, inventory, or catalog writes.
- WordPress draft creation, page updates, or publishing.
- Asset update routes in the UI.
- External navigation controls from asset rows.
- Task statuses beyond `new`, `approved`, `rejected`, and `snoozed`.

Current WordPress draft readiness is diagnostic only. A row such as `0/3 ready` means the local workspace is still blocked from creating WordPress drafts.

## Verification Baseline

Use this baseline before expanding from read-only diagnostics into any editor or WordPress draft workflow:

```powershell
$env:PATH='C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
$env:TRAFSCOPE_PYTHON='C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$node='C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$pnpm='<path-to-corepack-pnpm.js>'
& $node $pnpm --filter @trafscope/web run test:ui-contract
& $node $pnpm --filter @trafscope/web run test:api-actions
& $node $pnpm --filter @trafscope/web run lint
& $node $pnpm --filter @trafscope/web run build

$python='C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
Push-Location apps\api
& $python -B -m unittest discover app/tests
Pop-Location
```

Before any commit, also run:

```powershell
git diff --check
rg -n "<redacted-secret-patterns>" .
rg -n "\|\s*(doing|verify)\s*\|" docs/automation-task-board.md
```

The secret scan should produce no matches.

## Next Gate

Do not open structured asset editing or WordPress draft creation until all of these are true:

- Product approves an editor scope and explicit draft-only boundary.
- Backend exposes a safe local-only asset update contract with tests.
- UI review states remain non-executable until QA passes.
- WordPress draft creation remains future-gated and cannot publish live content.
- Browser smoke proves no credentials, sync execution, href navigation, publishing, or commerce writes were introduced.
