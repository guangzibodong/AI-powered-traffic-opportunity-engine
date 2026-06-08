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

## 当前执行分工

截至 2026-06-08，当前分支 `codex/sprint1-v3-ui` 采用并行协作。每个角色只改自己负责的范围，不能 revert 或覆盖其他人的未完成改动。

| Role | 当前职责 | 当前状态 |
|---|---|---|
| Product Ops / Documentation Lead | 维护 README、Sprint backlog、API adapter plan、team operating model、automation task board。 | 本轮只改产品/项目文档，不改前后端实现。 |
| Tech Lead / Facilitator | 控制 Sprint 1 scope，协调 API/UI/QA 的接线顺序，保护 demo-only 安全边界。 | 继续要求所有 task action 只是 review state change。 |
| Backend/API Engineer | 维护 demo planning endpoints、task detail/list endpoints、task status mutation endpoints。 | 已完成 `PATCH /tasks/{id}` 与 approve/reject/snooze shortcut routes。 |
| Frontend Product Engineer | 维护 Traffic Operations Board、Task Detail、API client、mock fallback。 | 已完成 API-backed board read adapter、`updateTaskStatus` client、visible Task Detail button wiring。 |
| QA / Test Lead | 验证 scoring、dedupe、state transitions、API adapter contract、fallback、release gates。 | 已扩展后端状态 mutation 与 shortcut route 覆盖；下一步补 browser-level mutation/fallback 覆盖。 |
| UI Systems Engineer | 支持后续 loading/error/disabled/retry 状态设计。 | 下一步补 mutation feedback states，不阻塞当前 API review wiring。 |

## 当前已完成能力

| Capability | Evidence / Contract |
|---|---|
| Deterministic demo planning | Demo fixture 经过 graph builder、opportunity engine、task service 生成 opportunities 和 tasks。 |
| API-backed board read path | `getTasks`、`getOpportunities`、`mapApiPlanningToBoard` 可把后端 payload 转成前端 board view model。 |
| Safe fallback path | API 不可用时前端保留 mock board，并显示 fallback 状态。 |
| Sprint 1 visible task statuses | 前后端都限制为 `new`、`approved`、`rejected`、`snoozed`。 |
| Demo task status API | `PATCH /tasks/{id}` 更新当前 API 进程内存中的状态覆盖。 |
| Demo task shortcut actions | `POST /approve`、`POST /reject`、`POST /snooze` 与同一 status override 逻辑一致。 |
| List/detail consistency | 成功更新后，task list 和 task detail 都能读到相同状态。 |
| API-backed visible review wiring | Task Detail approve/reject/snooze uses the demo API when API board data is connected, with local fallback retained. |
| Draft safety boundary | `/generate-draft` is future-gated in Sprint 1 and returns a safe blocked response instead of creating drafts. |

## 下一步协作顺序

1. UI Systems Engineer 补 loading、disabled、error、retry/rollback 状态的视觉与交互细节。
2. QA / Test Lead 补 browser-level API mutation/fallback 覆盖，确认非法状态不会进入 UI 或 API。
3. Product Ops / Documentation Lead 继续更新 demo script、release gates、automation board 中的完成口径。
4. Tech Lead 做 integration review，确认没有真实外部写入、没有 WordPress draft creation、没有 unsafe automation level。

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
