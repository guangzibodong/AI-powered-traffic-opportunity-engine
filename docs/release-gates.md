# TrafScope MVP Release Gates

Date: 2026-06-08

Status: Approved as MVP safety and quality gates

## Release Philosophy

TrafScope is only ready when it is trustworthy, traceable, repeatable, and safe against accidental external writes.

The MVP can be small. It cannot be vague, random, duplicate-heavy, unsafe, or secret-leaking.

## P0 Blockers

Any item below blocks MVP release:

- Task shown without evidence.
- Opportunity shown without rule ID, score components, and related entities.
- Same fixture producing different scores or task order without an intentional rule change.
- Repeated planning generating duplicate top tasks.
- WordPress live publish UI, API parameter, status transition, fixture, or mock behavior.
- WooCommerce write path for products, prices, inventory, or page content.
- Raw secret in API response, logs, frontend state, snapshots, screenshots, or built assets.
- API error exposing stack trace or raw credentials.
- Missing audit log for user or system write action.
- Store-scoped endpoint leaking another store's records.
- Task click opening a stale, hard-coded, or wrong Task Detail.
- Demo task status API accepting a non-Sprint-1 status.
- LLM draft inventing product facts or schema facts.
- Frontend console uncaught runtime error in demo smoke.
- Mobile or desktop layout blocking primary action or evidence.

## Backend Gates

Required:

- Scoring tests pass.
- ProductReadiness tests pass.
- Opportunity rule tests pass.
- Graph/matching tests pass.
- Task generation tests pass.
- Dedupe tests pass.
- Task status transition tests pass.
- Demo task status API tests pass for PATCH, approve, reject, snooze, persistence, 400, and 404 cases.
- Schema contract tests pass.
- API safe error tests pass before real integrations.
- Store isolation tests pass before multi-store use.

Focused command:

```bash
cd apps/api
python -B -m unittest app.tests.test_demo_planning_api
```

Full command:

```bash
cd apps/api
python -B -m unittest discover app/tests
```

Future commands:

```bash
ruff check app
mypy app
```

## Frontend Gates

Required:

- Typecheck/lint passes.
- Production build passes.
- Task card component tests pass.
- Evidence list component tests pass.
- Score breakdown component tests pass.
- Integration status tests pass.
- Empty/loading/error states are tested, including task review mutation pending and fallback feedback.
- API mapper tests pass for snake_case to camelCase conversion.
- Any task card or row opens the corresponding Task Detail.
- Task Detail approve/reject/snooze controls use only Sprint 1 safe statuses, disable duplicate submissions while pending, and show safe fallback feedback when the API is unavailable.
- API-unavailable review feedback offers only safe state actions: retry the demo API sync or keep the local review state.
- Automated API action browser smoke passes.
- No live publish control appears in MVP UI.

Commands:

```bash
npm --workspace apps/web run lint
npm --workspace apps/web run build
npm --workspace apps/web run test
pnpm --filter @trafscope/web run test:api-actions
```

Note: component-level frontend tests are still future work, but API task action browser smoke is now an executable gate.

## E2E Gates

Playwright smoke must cover:

1. Open demo store.
2. Confirm integration state is visible.
3. Run or load planning.
4. Confirm summary metrics render.
5. Confirm at least one task has score, title, category, status, evidence, and next action.
6. Click the top task and confirm the matching Task Detail opens.
7. Return to the board, click a non-top task, and confirm the matching Task Detail opens.
8. Confirm query/product/page evidence is visible.
9. Approve, reject, and snooze a task through UI controls.
10. Confirm API-backed success feedback, API-unavailable local fallback feedback, retry sync, keep-local behavior, unsafe status rejection, and board/detail consistency.
11. Re-run planning and confirm no duplicate task appears.
12. Search UI for live publish controls and confirm none exist.
13. Run desktop and mobile viewport checks.
14. Confirm browser console has no uncaught runtime errors.

Command:

```bash
pnpm --filter @trafscope/web run test:api-actions
```

## WordPress Draft-Only Gate

Rules:

- PublishingService must force WordPress `status=draft`.
- Client input must not be allowed to override status to `publish`, `future`, or `private`.
- UI labels must say `Create WordPress draft`, not generic `Publish`.
- Task status may not move directly to `published` or `applied`.
- Sprint 1 demo task status mutations must accept only `new`, `approved`, `rejected`, and `snoozed`.
- Draft creation records external ID, draft URL, actor, and audit log.
- No existing WordPress page may be overwritten in MVP.

Tests:

- Mock WordPress REST receives only `status=draft`.
- Attempting unsafe status is rejected.
- Demo task status API rejects `draft_generated`, `failed`, `published`, `applied`, `autopilot`, and `one_click_apply`.
- E2E confirms no live publish wording.

## WooCommerce Read-Only Gate

Rules:

- WooCommerce MVP supports read-only product/category/attribute sync.
- No external WooCommerce POST/PUT/PATCH/DELETE calls.
- Local database upsert is allowed.
- Use read-only keys where possible.

Tests:

- Mock WooCommerce server asserts no write methods.
- Product sync is idempotent by `store_id + external_id`.
- No task action plan suggests changing price, inventory, or status automatically.

## Secret Protection Gate

Rules:

- Secrets are never returned by API.
- Secrets are never sent to the frontend.
- Secrets are never written to logs, audit metadata, snapshots, screenshots, or build output.
- Frontend `VITE_*` variables are public-only.
- Connection responses return masked preview or connected status only.
- Real credential storage requires encrypted provider or token vault implementation.

Tests:

- Inject fake secrets and assert they do not appear in API responses.
- Scan logs/snapshots/screenshots for fake secret values.
- Add secret scanning to CI before real credentials are used.

## LLM Safety Gate

Rules:

- LLM output must be valid JSON.
- Output must pass schema validation.
- Output must pass domain validation.
- Every high-risk claim must have a source reference.
- No unsupported price, stock, discount, review, rating, certification, warranty, shipping, performance, compatibility, or competitor claim.
- Schema must match visible content.
- No AggregateRating unless real reviews are present.
- No competitor facts in MVP automated generation.

Tests:

- Fixture with missing price does not produce a price claim.
- Fixture with missing reviews does not produce review/rating schema.
- Fixture with missing certification does not produce certification claim.
- Draft generation fails or blocks review when evidence chain is missing.

## Sprint 1 Exit Criteria

Sprint 1 is complete only when:

- Demo store loads consistently.
- Demo data includes products, pages, and GSC-like metric rows.
- Weekly planning creates at least 10 evidence-backed tasks.
- Three Sprint 1 rules each create at least one opportunity.
- Re-running planning three times creates no duplicates.
- Each task includes evidence, related entities, score, action plan, and acceptance criteria.
- Any task on the board opens its corresponding Task Detail.
- Approve/reject/snooze states persist.
- Task review controls show pending, success, API-unavailable fallback, retry sync, and keep-local feedback without implying execution.
- Demo task status API supports PATCH plus approve/reject/snooze and rejects unsafe statuses.
- Automated browser smoke covers API success, API fallback, retry sync, keep-local confirmation, unsafe status rejection, and board/detail consistency.
- Board and detail UI render the decision clearly.
- No live publish path exists.
- Backend tests pass.
