import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readRepo(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const types = read("lib/types.ts");
const app = read("app/App.tsx");
const data = read("lib/mock-data.ts");
const styles = read("app/styles.css");
const taskState = read("lib/task-state.ts");
const taskDetail = read("lib/task-detail.ts");
const taskQueue = read("components/tasks/TaskQueue.tsx");
const taskCopy = read("components/tasks/task-copy.ts");
const statusPill = read("components/tasks/StatusPill.tsx");
const apiClient = read("lib/api-client.ts");
const viewModelAdapters = read("lib/view-model-adapters.ts");
const uiReference = readRepo("docs/ui-reference-refero.md");
const visualChecklist = readRepo("docs/ui-visual-qa-checklist.md");

const uiContractTargets = {
  "App.tsx": app,
  "TaskQueue.tsx": taskQueue,
  "StatusPill.tsx": statusPill,
  "api-client.ts": apiClient,
  "mock-data.ts": data,
  "task-detail.ts": taskDetail,
  "task-copy.ts": taskCopy,
  "task-state.ts": taskState,
  "types.ts": types,
  "view-model-adapters.ts": viewModelAdapters
};

const forbiddenVisibleConcepts = [
  "published",
  "applied",
  "one_click_apply",
  "guarded_autopilot",
  "ai_visibility",
  "faq_gap",
  "Publish live",
  "Autopilot"
];

for (const [fileName, content] of Object.entries(uiContractTargets)) {
  for (const concept of forbiddenVisibleConcepts) {
    assert(!content.includes(concept), `${fileName} still exposes forbidden Sprint 1 concept: ${concept}`);
  }
}

for (const required of [
  "VisibleTaskStatus",
  "EvidenceRow",
  "ScoreComponent",
  "RuleTrace",
  "BoardViewModel",
  "Locale"
]) {
  assert(types.includes(required), `types.ts missing ${required}`);
}

for (const required of [
  "TrafficOperationsPage",
  "TaskDetailPage",
  "OpportunityDetailPage",
  "IntegrationsSafetyPage",
  "UiStatesPage",
  "LanguageSwitcher"
]) {
  assert(app.includes(required), `App.tsx missing ${required}`);
}

for (const required of [
  "deterministic rules",
  "AI does not calculate scores",
  "Evidence-driven traffic workspace",
  "证据驱动流量运营工作台",
  "Sprint 1"
]) {
  assert(data.includes(required) || app.includes(required), `missing required boundary copy: ${required}`);
}

for (const required of ["collection_page_gap", "ranking_push", "high_impression_low_ctr"]) {
  assert(data.includes(required), `mock data missing Sprint 1 rule: ${required}`);
}

const mockTaskCount = (data.match(/id: "task_/g) || []).length;
assert(mockTaskCount >= 10, `mock board must expose at least 10 Sprint 1 tasks, found ${mockTaskCount}`);

assert(
  types.includes('export type VisibleTaskStatus = "new" | "approved" | "rejected" | "snoozed";'),
  "VisibleTaskStatus must stay limited to Sprint 1 review states"
);
assert(
  types.includes('export type AutomationLevel = "recommend_only" | "draft_assist_future";'),
  "AutomationLevel must stay limited to Sprint 1 safe levels"
);

for (const evidenceField of ["type:", "source:", "entity:", "metric:", "window:", "reason:"]) {
  assert(data.includes(evidenceField), `mock data evidence missing field marker: ${evidenceField}`);
}

for (const required of [
  "TASK_STATUS_STORAGE_KEY",
  "loadTaskStatusMap",
  "saveTaskStatusMap",
  "updateTaskStatusMap",
  "applyTaskStatusesToBoard",
  "applyTaskStatusToDetail",
  "isVisibleTaskStatus"
]) {
  assert(taskState.includes(required), `task-state.ts missing ${required}`);
}

for (const status of ["new", "approved", "rejected", "snoozed"]) {
  assert(taskState.includes(status), `task-state.ts missing visible status: ${status}`);
}

assert(app.includes("onTaskStatusChange(task.id, \"approved\")"), "Task detail must approve task state");
assert(app.includes("onTaskStatusChange(task.id, \"rejected\")"), "Task detail must reject task state");
assert(app.includes("onTaskStatusChange(task.id, \"snoozed\")"), "Task detail must snooze task state");
assert(!app.includes("actionLabel.includes"), "Task behavior must not depend on translated action copy");
assert(taskQueue.includes("onOpenTask"), "TaskQueue must expose a typed open-task callback");
assert(taskCopy.includes("localizeTaskAction"), "task-copy.ts must own task action copy");
assert(taskCopy.includes('action: locale === "zh"'), "task-copy.ts must provide bilingual task table labels");
assert(app.includes("LanguageSwitcher"), "App must expose language switching");
assert(app.includes('setLocale("zh")') && app.includes('setLocale("en")'), "LanguageSwitcher must support zh and en");
assert(statusPill.includes("VisibleTaskStatus"), "StatusPill must use the visible Sprint 1 task status type");
assert(apiClient.includes("VITE_API_BASE_URL"), "api-client.ts must support configurable API base URL");
assert(apiClient.includes("VITE_USE_API_BOARD"), "api-client.ts must gate API-backed board loading");
assert(viewModelAdapters.includes("mapApiPlanningToBoard"), "view-model-adapters.ts must expose board adapter");
assert(viewModelAdapters.includes("draft_assist_future"), "view-model-adapters.ts must future-gate draft automation");
assert(app.includes("BoardDataBanner"), "App must show API/mock board data state");
assert(app.includes("mapApiPlanningToBoard"), "App must wire API planning payloads through the adapter");
assert(app.includes("updateTaskStatus("), "App must route task status actions through the demo API when connected");
assert(app.includes('boardDataState.source === "api"'), "App must only call task status API mutations for API-backed board data");
assert(app.includes("applyApiTaskStatusToBoard"), "App must merge successful API task status changes into board state");
assert(app.includes("applyLocalTaskStatus(taskId, status)"), "App must keep safe local task status fallback for API failures");
assert(app.includes("pendingTaskStatus"), "App must track an in-flight task review status mutation");
assert(app.includes("taskActionFeedback"), "App must retain safe review action feedback after API mutation attempts");
assert(app.includes("ReviewActionFeedback"), "Task Detail must render review action feedback");
assert(app.includes("isReviewActionPending"), "Task Detail must disable review controls while a mutation is pending");
assert(app.includes("disabled={isReviewActionPending}"), "Task Detail review buttons must be disabled while syncing");
assert(app.includes('aria-live="polite"'), "Review action feedback must announce pending/error state accessibly");
assert(app.includes("Syncing review state"), "Review action feedback must include non-technical pending copy");
assert(app.includes("API unavailable"), "Review action feedback must include safe API failure fallback copy");
assert(app.includes("retryTaskStatusSync"), "Fallback review feedback must expose an explicit retry sync action");
assert(app.includes("keepLocalTaskStatus"), "Fallback review feedback must expose an explicit keep-local action");
assert(app.includes("Retry sync"), "Fallback review feedback must include clear retry copy");
assert(app.includes("Keep local"), "Fallback review feedback must include clear keep-local copy");
assert(styles.includes(".review-feedback"), "styles.css must style review action feedback");
assert(app.includes("window.scrollTo({ left: 0, top: 0 })"), "App must reset scroll to the top when switching screens");
assert(app.includes("selectedTaskId"), "App must track the selected task id for task detail routing");
assert(app.includes("setSelectedTaskId(task.id)"), "Task queue clicks must select the clicked task before opening detail");
assert(!app.includes('if (task.id === "task_001")'), "Task queue must not gate detail opening to the first mock task");
assert(app.includes("createTaskDetailViewModel"), "App must build task detail from the currently selected board task");

for (const required of [
  "createTaskDetailViewModel",
  "fallback.id === task.id",
  "task.evidence.map",
  "ruleTrace",
  "acceptanceCriteria"
]) {
  assert(taskDetail.includes(required), `task-detail.ts missing selected-task detail behavior: ${required}`);
}

for (const required of [
  "14cc44e6-41bf-4178-b834-fc61bfeed4ae",
  "Fal / Generative AI",
  "white canvas",
  "1px neutral borders",
  "no shadow",
  "pixel block"
]) {
  assert(uiReference.includes(required), `ui-reference-refero.md missing extracted Refero/Fal rule: ${required}`);
}

assert(!uiReference.includes("Theme: dark operational workspace"), "Refero translation must not keep the old dark workspace theme");
assert(!visualChecklist.includes("dark operational"), "visual QA checklist must not require the old dark operational surface");
assert(styles.includes("--bg: #ffffff"), "styles.css must use the Refero/Fal white canvas token");
assert(styles.includes("--panel-soft: #f4f4f5"), "styles.css must use the Refero/Fal fog surface token");
assert(styles.includes("--line: #e5e7eb"), "styles.css must use 1px neutral border tokens");
assert(styles.includes("--text: #1b1b1d"), "styles.css must use near-black text on light canvas");
assert(styles.includes("--shadow: none"), "styles.css must remove generic app card shadows");
assert(
  styles.includes('.section-health-summary[data-section-health-summary="ready"] strong'),
  "styles.css must style ready imported section health summaries"
);
assert(
  styles.includes('.section-health-summary[data-section-health-summary="empty"] strong'),
  "styles.css must style empty imported section health summaries"
);
assert(
  styles.includes('.section-health-summary[data-section-health-summary="degraded"] strong'),
  "styles.css must style degraded imported section health summaries"
);
assert(
  styles.includes('.action-mix-summary[data-action-mix-state="empty"] strong'),
  "styles.css must style empty imported action mix summaries"
);
assert(
  styles.includes('.action-mix-summary[data-action-mix-state="concentrated"] strong'),
  "styles.css must style concentrated imported action mix summaries"
);
assert(
  styles.includes('.action-mix-summary[data-action-mix-state="balanced"] strong'),
  "styles.css must style balanced imported action mix summaries"
);
assert(styles.includes(".action-mix-list"), "styles.css must style imported action mix row lists");
assert(styles.includes(".action-mix-row"), "styles.css must style imported action mix rows");
assert(
  styles.includes('.action-mix-row[data-action-mix-row-state="active"] strong'),
  "styles.css must style active imported action mix rows"
);
assert(
  styles.includes('.action-mix-row[data-action-mix-row-state="empty"] strong'),
  "styles.css must style empty imported action mix rows"
);
assert(!taskQueue.includes("<th>{labels.objects}</th>"), "TaskQueue must not duplicate object counts in a separate narrow desktop column");
assert(!taskQueue.includes("data-label={labels.objects}"), "TaskQueue object counts should stay inside task metadata pills");
assert(styles.includes("@media (max-width: 1320px)"), "styles.css must stack the side rail before evidence columns become unreadable");
assert(styles.includes("@media (max-width: 760px)"), "styles.css must include mobile responsive rules");

console.log("Sprint 1 UI contract passed");
