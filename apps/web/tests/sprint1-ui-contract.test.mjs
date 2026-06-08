import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
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
const taskQueue = read("components/tasks/TaskQueue.tsx");
const taskCopy = read("components/tasks/task-copy.ts");
const statusPill = read("components/tasks/StatusPill.tsx");
const apiClient = read("lib/api-client.ts");
const viewModelAdapters = read("lib/view-model-adapters.ts");

const uiContractTargets = {
  "App.tsx": app,
  "TaskQueue.tsx": taskQueue,
  "StatusPill.tsx": statusPill,
  "api-client.ts": apiClient,
  "mock-data.ts": data,
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

assert(styles.includes("--bg: #0f1216"), "styles.css must use the V3 dark operational canvas token");
assert(styles.includes("@media (max-width: 760px)"), "styles.css must include mobile responsive rules");

console.log("Sprint 1 UI contract passed");
