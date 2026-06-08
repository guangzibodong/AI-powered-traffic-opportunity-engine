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
- Schema contract tests pass.
- API safe error tests pass before real integrations.
- Store isolation tests pass before multi-store use.

Current command:

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
- Empty/loading/error states are tested.
- API mapper tests pass for snake_case to camelCase conversion.
- No live publish control appears in MVP UI.

Commands:

```bash
npm --workspace apps/web run lint
npm --workspace apps/web run build
npm --workspace apps/web run test
```

Note: final frontend test infrastructure must be added before this can become a real gate.

## E2E Gates

Playwright smoke must cover:

1. Open demo store.
2. Confirm integration state is visible.
3. Run or load planning.
4. Confirm summary metrics render.
5. Confirm at least one task has score, title, category, status, evidence, and next action.
6. Open task or opportunity detail.
7. Confirm query/product/page evidence is visible.
8. Approve or reject a task.
9. Re-run planning and confirm no duplicate task appears.
10. Search UI for live publish controls and confirm none exist.
11. Run desktop and mobile viewport checks.
12. Confirm browser console has no uncaught runtime errors.

Command:

```bash
npx playwright test
```

## WordPress Draft-Only Gate

Rules:

- PublishingService must force WordPress `status=draft`.
- Client input must not be allowed to override status to `publish`, `future`, or `private`.
- UI labels must say `Create WordPress draft`, not generic `Publish`.
- Task status may not move directly to `published` or `applied`.
- Draft creation records external ID, draft URL, actor, and audit log.
- No existing WordPress page may be overwritten in MVP.

Tests:

- Mock WordPress REST receives only `status=draft`.
- Attempting unsafe status is rejected.
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
- Approve/reject/snooze states persist.
- Board and detail UI render the decision clearly.
- No live publish path exists.
- Backend tests pass.

