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

const adapter = read("lib/view-model-adapters.ts");
const apiClient = read("lib/api-client.ts");
const app = read("app/App.tsx");

for (const forbidden of ["one_click_apply", "guarded_autopilot", "published", "applied"]) {
  assert(!adapter.includes(forbidden), `adapter leaks forbidden concept: ${forbidden}`);
  assert(!apiClient.includes(forbidden), `api client leaks forbidden concept: ${forbidden}`);
}

assert(adapter.includes('task.automation_level === "recommend_only"'), "adapter must inspect backend automation level");
assert(adapter.includes('"draft_assist_future"'), "adapter must map draft-capable backend tasks to future-gated draft assist");
assert(adapter.includes('? (status as VisibleTaskStatus) : "new"'), "adapter must map unknown backend task statuses to new");
assert(adapter.includes('type === "product_fit"'), "adapter must map product evidence");
assert(adapter.includes('type === "page_gap" || type === "existing_page"'), "adapter must map page graph evidence");
assert(adapter.includes('type.startsWith("gsc") || type === "query_cluster"'), "adapter must map search evidence");
assert(adapter.includes("mapApiPlanningToBoard"), "adapter must expose board-level mapping");
assert(adapter.includes("planningRun"), "adapter must produce frontend planning run state");

assert(apiClient.includes("VITE_USE_API_BOARD"), "API board loading must be explicitly gated");
assert(apiClient.includes("VITE_API_BASE_URL"), "API base URL must be configurable");
assert(app.includes("isApiBoardEnabled()"), "App must respect the API board gate");
assert(app.includes('source: "fallback"'), "App must keep a mock fallback state");

console.log("API adapter contract passed");
