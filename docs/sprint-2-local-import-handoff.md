# Sprint 2 Local Import Handoff

Date: 2026-06-09

## Status

The Sprint 2 local/import-only loop is complete. TrafScope can import local fixture or CSV data, build deterministic read-only search/product/page context, render imported opportunities and recommend-only task previews, and verify the imported action-mix diagnostics in browser smoke coverage.

Live integration work is still parked. `TASK-S2-LIVE-011` remains blocked until credentials and a revised boundary are explicitly approved.

## Completed Local Loop

- GSC-like CSV imports, query reads, and deterministic query clustering.
- WooCommerce-like product fixture imports and read-only catalog reads.
- WordPress-like page/post fixture imports and read-only page reads.
- Imported signal graph matching across queries, products, and pages.
- Imported opportunity previews for CTR refresh, collection page, product SEO, ranking push, and buying guide gap signals.
- Imported task previews that remain `recommend_only` and `new`.
- Integration status, sync run tracking, and sanitized audit logs for local-safe operations.
- API-backed safety panel and imported preview UI.
- Imported preview diagnostics for section health, catalog overflow, action shares, action mix state, action mix row styling, aggregate reconciliation, and top-row reconciliation.

## Safety Boundary

The completed loop does not add:

- Real Google Search Console OAuth.
- Live credential collection or storage.
- Sync execution against a real external account.
- WordPress draft creation, update, or publishing.
- WooCommerce product, price, stock, inventory, or catalog writes.
- Imported opportunity or imported task review mutation.
- Unsafe task statuses beyond `new`, `approved`, `rejected`, and `snoozed`.

## Verification Baseline

Use this baseline before reopening Sprint 2 live integration work:

```powershell
$python='C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $python -B -m unittest discover app/tests

$env:PATH='C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
$env:TRAFSCOPE_PYTHON='C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$node='C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$pnpm='C:\Users\Harry\Documents\多agent工作流编排平台\.tools\node\node_modules\corepack\dist\pnpm.js'
& $node $pnpm --filter @trafscope/web run test:ui-contract
& $node $pnpm --filter @trafscope/web run test:api-actions
& $node $pnpm --filter @trafscope/web run lint
& $node $pnpm --filter @trafscope/web run build
```

Before any commit, also run:

```powershell
git diff --check
rg -n "<redacted-secret-patterns>" .
```

The secret scan should produce no matches.

## Live Handoff Gate

Reopen `TASK-S2-LIVE-011` only after all of these are true:

- The user approves real read-only credential handling.
- The product boundary explicitly allows real OAuth or API credential setup.
- The implementation plan confirms no WooCommerce writes and no WordPress publishing.
- QA adds credential redaction tests before any live connector code is merged.
