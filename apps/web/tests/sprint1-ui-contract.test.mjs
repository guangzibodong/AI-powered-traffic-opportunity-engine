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

for (const concept of forbiddenVisibleConcepts) {
  assert(!types.includes(concept), `types.ts still exposes forbidden Sprint 1 concept: ${concept}`);
  assert(!data.includes(concept), `mock-data.ts still exposes forbidden Sprint 1 concept: ${concept}`);
  assert(!taskState.includes(concept), `task-state.ts still exposes forbidden Sprint 1 concept: ${concept}`);
  assert(!taskQueue.includes(concept), `TaskQueue.tsx still exposes forbidden Sprint 1 concept: ${concept}`);
  assert(!taskCopy.includes(concept), `task-copy.ts still exposes forbidden Sprint 1 concept: ${concept}`);
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
assert(statusPill.includes("VisibleTaskStatus"), "StatusPill must use the visible Sprint 1 task status type");

assert(styles.includes("--bg: #0f1216"), "styles.css must use the V3 dark operational canvas token");
assert(styles.includes("@media (max-width: 760px)"), "styles.css must include mobile responsive rules");

console.log("Sprint 1 UI contract passed");
