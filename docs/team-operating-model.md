# TrafScope Sprint 1 Team Operating Model

Date: 2026-06-08

## Team Size

Sprint 1 should run with a focused 6-person product squad:

1. Product Owner / PM
2. Tech Lead / Facilitator
3. Backend Data and Persistence Engineer
4. Backend Decisioning Engine Engineer
5. Frontend Product Engineer
6. QA / Test Lead

This is enough to move in parallel without creating coordination overhead. A dedicated UI/UX designer is useful for discovery and review, but Sprint 1 can treat UI direction as embedded in frontend/product work because the first build is a functional traffic operations board, not a polished full app.

## Why Not More People

- Real integrations are intentionally deferred until the decisioning loop is credible.
- Sprint 1 needs deterministic graph, rules, tasks, and evidence more than broad feature surface.
- More roles would increase meeting and merge overhead before the product shape is proven.
- The main risk is trustworthiness, not raw implementation volume.

## Role Responsibilities

### Product Owner / PM

Owns:

- Sprint 1 backlog and user stories.
- Demo narrative.
- Definition of done for each product flow.
- Prioritization when scope pressure appears.

Output:

- Sprint 1 backlog.
- Demo success script.
- Acceptance criteria.

### Tech Lead / Facilitator

Owns:

- Architecture coherence.
- Role coordination.
- Merge and integration decisions.
- Keeping Sprint 1 focused on the demo decisioning loop.

Output:

- Integrated implementation plan.
- Final review and verification.
- Cross-role decision log.

### Backend Data and Persistence Engineer

Owns:

- P0 schema contracts.
- Migration additions.
- Sync/job tracking tables.
- Graph relationship persistence contracts.

Files:

- `infra/migrations/`
- `apps/api/app/schemas/`
- `apps/api/app/tests/test_schema_contracts.py`

Primary concerns:

- Idempotency.
- Auditability.
- Store isolation.
- Stable data contracts for the engine and frontend.

### Backend Decisioning Engine Engineer

Owns:

- Demo fixture data.
- Graph builder first pass.
- Deterministic opportunity rules.
- Opportunity dedupe keys.

Files:

- `apps/api/app/services/graph_builder_service.py`
- `apps/api/app/services/opportunity_engine.py`
- `apps/api/app/fixtures/`
- `apps/api/app/tests/test_opportunity_engine.py`

Primary concerns:

- Evidence-backed outputs.
- Rule versioning.
- Deterministic behavior.
- Useful tasks from mock/demo data.

### Frontend Product Engineer

Owns:

- Traffic Operations Board.
- Opportunity detail UI.
- Task detail UI.
- Asset draft entry UI.
- API/mock data view models.

Files:

- `apps/web/app/`
- `apps/web/components/`
- `apps/web/lib/`

Primary concerns:

- Action-first UI.
- Evidence visibility.
- Clear task state and next action.
- Avoiding generic dashboard clutter.

### QA / Test Lead

Owns:

- Sprint 1 test strategy.
- Release gates.
- Demo verification checklist.
- Safety and trust red lines.

Files:

- `docs/qa-sprint-1.md`

Primary concerns:

- Scoring determinism.
- No duplicate tasks.
- Evidence preserved from opportunity to task.
- Draft-only publishing path.
- No secrets exposure.

## Sprint 1 Mission

Prove that TrafScope can turn demo store and search signals into trustworthy, prioritized, evidence-backed traffic tasks.

## Sprint 1 Must Demonstrate

1. Demo store exists with realistic products.
2. Mock/imported GSC signals exist.
3. Product readiness and TrafScore are calculated deterministically.
4. Product-query-page graph exists.
5. At least three rules generate opportunities:
   - High impression low CTR
   - Ranking 4-20 push
   - Collection page gap
6. Opportunities become deduplicated tasks.
7. Each task includes:
   - Evidence
   - TrafScore
   - Related queries/products/pages
   - Action plan
   - Acceptance criteria
8. Frontend board shows the next best tasks clearly.

## Working Rules

- Default to deterministic rules before LLM output.
- Do not add new channels or integrations in Sprint 1.
- Do not build live publishing in Sprint 1.
- Do not build a broad analytics dashboard before the task flow works.
- Every generated recommendation must have explainable evidence.
- Every testable core behavior should have a test before implementation.
- UI work must follow the root `DESIGN.md`, which adapts the Refero Styles DESIGN.md method to TrafScope's own operational product language.

## Parallel Work Streams

| Stream | Owner | Dependency |
|---|---|---|
| Backlog and demo script | PM | Requirements workshop |
| Schema contracts | Backend Data | Sprint 1 scope |
| Demo graph and rules | Backend Engine | Existing scoring service |
| Traffic Ops UI | Frontend | Existing mock UI |
| QA checklist | QA | Requirements workshop |
| Integration review | Tech Lead | Outputs from all streams |

## First Integration Checkpoint

The first checkpoint happens after each stream has produced its first output. The Tech Lead should review:

- Are data contracts and engine outputs compatible?
- Can frontend display the evidence and action plan without extra interpretation?
- Do tests cover scoring, graph building, rules, dedupe, and task transitions?
- Does the demo script tell a clear merchant story?
