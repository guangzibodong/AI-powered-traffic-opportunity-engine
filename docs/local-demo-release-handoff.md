# Local Demo Release Handoff

Date: 2026-06-10

## Status

The current TrafScope branch is ready as a local demo release candidate. It demonstrates the safe end-to-end product loop from deterministic demo planning, local/imported data, imported opportunities, recommend-only task previews, local asset candidates, a local-only asset editor, and read-only performance diagnostics.

This release is still a local/demo release. It does not connect real accounts, collect credentials, write WooCommerce data, create WordPress drafts, update WordPress pages, or publish content.

## Demo-Ready Capabilities

- Bilingual traffic operations workbench with board, task detail, opportunity detail, safety, imported preview, asset workspace, and performance surfaces.
- Demo task review actions limited to `new`, `approved`, `rejected`, and `snoozed`.
- API-backed demo task status mutations with safe local fallback feedback.
- Local GSC CSV-style import foundation, imported query rows, deterministic query clusters, and imported signal graph matching.
- Read-only WooCommerce-like product and WordPress-like page imports from local fixtures.
- Imported opportunity previews for CTR refresh, collection page gaps, product SEO gaps, ranking push, and buying guide gaps.
- Recommend-only imported task previews that stay `new` and do not mutate imported tasks.
- Integration status, sync run tracking, and sanitized audit logs for local-safe operations only.
- Local asset workspace that can create structured local asset candidates from approved demo tasks.
- Safe local asset editor for title, meta, and structured section changes through local-only asset PATCH requests.
- Read-only store performance snapshots from already-imported GSC rows.
- Read-only selected-asset performance snapshots and before/after comparison diagnostics.
- Browser smoke coverage for API actions, imported preview diagnostics, local editor save/failure/retry/close behavior, screenshot artifacts, and performance safety diagnostics.

If the local API is unavailable, the visible board keeps a safe local fallback state. That fallback is useful for demo resilience, but it is not proof of live external connectivity or production persistence.

## Safety Boundary

The local demo release must continue to forbid:

- Real Google Search Console OAuth.
- Credential collection, credential storage, API key entry, token entry, or secret persistence.
- Live WooCommerce writes, including product, price, stock, inventory, and catalog updates.
- WordPress draft creation.
- WordPress page updates.
- WordPress publishing or live content changes.
- External sync execution against real accounts.
- External navigation controls from imported catalog or asset rows.
- Product task statuses outside `new`, `approved`, `rejected`, and `snoozed`.
- Any UI that implies autopilot execution, live publishing, live refresh, or commerce writes.

Current WordPress draft readiness, sync status, and performance comparison states are diagnostics only. They are allowed to explain what is blocked, but they must not become executable controls without explicit boundary approval.

## Demo Walkthrough

Start the local API and frontend from the repo root:

```powershell
pnpm run dev:api
pnpm run dev:web
```

For API-backed UI testing, keep `VITE_USE_API_BOARD=true` in the frontend environment. The browser smoke script starts isolated local API and web ports automatically.

1. Start the API-backed board using the local development commands above.
2. Open the Traffic Operations Board and confirm the visible workbench loads deterministic demo tasks and opportunities.
3. Open a task detail and use approve, reject, or snooze to verify local review-state feedback.
4. Open the imported preview rail and review query clusters, catalog references, imported opportunities, and recommend-only imported tasks.
5. Open the safety surface and confirm integrations, sync runs, and audit logs are local-safe diagnostics only.
6. Approve a demo task and create or inspect local asset candidates in the asset workspace.
7. Open a local asset candidate, edit safe local fields, save the local draft, close, reopen, and confirm stale feedback does not leak between sessions.
8. Review store and selected-asset performance panels. Confirm they show imported GSC baselines, blocked capabilities, and follow-up metrics as not yet tracked.
9. Confirm there are no credential fields, publish buttons, WordPress draft buttons, live refresh controls, sync execution controls, href navigation controls, or commerce-write controls.

## Verification Matrix

Use the bundled runtime paths to avoid local machine drift.

Backend:

```powershell
Push-Location apps\api
& "C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -B -m unittest discover app/tests
Pop-Location
```

Frontend contracts, fixtures, type checks, and build:

```powershell
Push-Location apps\web
$node = "C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $node tests/sprint1-ui-contract.test.mjs
& $node tests/api-adapter-contract.test.mjs
& $node tests/imported-adapter-fixture.test.mjs
& $node tests/imported-api-client-fixture.test.mjs
& $node tests/asset-api-client-fixture.test.mjs
& $node tests/performance-api-client-fixture.test.mjs
& $node .\node_modules\typescript\bin\tsc --noEmit
& $node .\node_modules\typescript\bin\tsc -b
& $node .\node_modules\vite\bin\vite.js build
Pop-Location
```

Browser smoke:

```powershell
$env:PATH = "C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\python;C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;" + $env:PATH
Push-Location apps\web
& "C:\Users\Harry\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" tests\api-action-browser-smoke.mjs
Pop-Location
```

Final repository scans:

```powershell
git diff --check
rg -n "<known leaked credential markers>" .
rg -n "^\| TASK-[^|]+\|\s*\d+\s*\|\s*(todo|doing|verify)\s*\|" docs\automation-task-board.md
rg -n "^\| TASK-[^|]+\|\s*\d+\s*\|\s*blocked\s*\|" docs\automation-task-board.md
```

Expected results:

- Backend unittest suite passes.
- Frontend contract and fixture checks pass.
- TypeScript checks and Vite build pass.
- Browser smoke passes and may refresh local screenshot artifacts.
- `git diff --check` returns no whitespace errors.
- Secret scan returns no matches.
- Task-board unfinished-status scan returns no matches before final commit.
- Blocked task scan returns only the live integration blocker that is waiting on credentials and explicit boundary approval.

## No-Go Blockers

Do not promote this local demo release into live integration work until all of these are explicitly approved:

- Real read-only credential handling for GSC, WooCommerce, or WordPress.
- A documented credential redaction and no-secret-storage test plan.
- A revised boundary for real external reads.
- A separate approval for WordPress draft creation, if draft creation is ever opened.
- A separate approval for WordPress page updates or publishing.
- A separate approval for any WooCommerce write path.

## Handoff Decision

The safe next engineering path is either:

- Continue local-only hardening with more read-only diagnostics and QA coverage.
- Or pause local expansion and request explicit boundary approval for real read-only connectors.

Until that approval exists, the project should stay on local/demo/imported data and keep every external write path blocked.
