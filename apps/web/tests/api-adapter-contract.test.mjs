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
assert(adapter.includes("mapApiIntegrationsToIntegrationHealth"), "adapter must expose integration status DTO conversion");
assert(adapter.includes("mapApiSyncRunsToSyncRunPreviews"), "adapter must expose sync run DTO conversion");
assert(adapter.includes("mapApiAuditLogsToEvidenceRows"), "adapter must expose audit log DTO conversion");
assert(adapter.includes("mapApiImportedQueryClustersToPreviews"), "adapter must expose imported query cluster DTO conversion");
assert(adapter.includes("mapApiImportedOpportunitiesToOpportunities"), "adapter must expose imported opportunity DTO conversion");
assert(adapter.includes("mapApiImportedTasksToTasks"), "adapter must expose imported task preview DTO conversion");
assert(adapter.includes("automationLevel: \"recommend_only\""), "imported task preview adapter must keep imported previews recommend-only");
assert(adapter.includes("source: \"Imported GSC\""), "imported query cluster adapter must label imported GSC evidence");
assert(adapter.includes('type: "audit"'), "audit log DTO conversion must produce audit evidence rows");
assert(adapter.includes('status === "connected_stub"'), "integration adapter must handle connected_stub status");
assert(adapter.includes('status === "not_connected"'), "integration adapter must handle not_connected status");
assert(adapter.includes("blocked_capabilities"), "adapter must preserve blocked capability context for safety copy");
assert(adapter.includes("external_write_allowed"), "adapter must inspect backend external write flags");
assert(adapter.includes("externalWriteAllowed: false"), "sync preview adapter must clamp external write state to false");

assert(apiClient.includes("VITE_USE_API_BOARD"), "API board loading must be explicitly gated");
assert(apiClient.includes("VITE_API_BASE_URL"), "API base URL must be configurable");
assert(apiClient.includes("import.meta.env.VITE_USE_API_BOARD"), "API board gate must read Vite env through direct import.meta.env access");
assert(apiClient.includes("import.meta.env.VITE_API_BASE_URL"), "API base URL must read Vite env through direct import.meta.env access");
assert(apiClient.includes("ApiVisibleTaskStatus"), "API client must type Sprint 1 visible task status updates");
assert(apiClient.includes("encodeURIComponent"), "API client must encode store and task path segments");
assert(apiClient.includes("updateTaskStatus"), "API client must expose task status mutation for the demo API");
assert(apiClient.includes("ApiIntegrationsResponse"), "API client must type integration status responses");
assert(apiClient.includes("ApiSyncRunsResponse"), "API client must type sync run responses");
assert(apiClient.includes("ApiAuditLogsResponse"), "API client must type audit log responses");
assert(apiClient.includes("ApiImportedQueryClustersResponse"), "API client must type imported query cluster responses");
assert(apiClient.includes("ApiImportedOpportunitiesResponse"), "API client must type imported opportunity responses");
assert(apiClient.includes("ApiImportedTasksResponse"), "API client must type imported task preview responses");
assert(apiClient.includes("getIntegrations"), "API client must expose integration status reads");
assert(apiClient.includes("getSyncRuns"), "API client must expose sync run reads");
assert(apiClient.includes("getAuditLogs"), "API client must expose audit log reads");
assert(apiClient.includes("getImportedQueryClusters"), "API client must expose imported query cluster reads");
assert(apiClient.includes("getImportedOpportunities"), "API client must expose imported opportunity reads");
assert(apiClient.includes("getImportedTasks"), "API client must expose imported task preview reads");
assert(apiClient.includes("/imported-tasks"), "Imported task client must target the read-only imported task endpoint");
assert(apiClient.includes('method: "PATCH"'), "Task status mutation must use PATCH");
assert(apiClient.includes("JSON.stringify({ status })"), "Task status mutation must send only the selected review status");
assert(apiClient.includes("encodeURIComponent(taskId)"), "Task status mutation must encode the selected task id");
assert(apiClient.includes("/tasks/${encodedTaskId}"), "Task status mutation must target the encoded selected task id");
assert(app.includes("isApiBoardEnabled()"), "App must respect the API board gate");
assert(app.includes("store-demo-outdoor-coffee"), "App must load API-backed demo data with the stable demo store id");
assert(app.includes('source: "fallback"'), "App must keep a mock fallback state");
assert(app.includes("getIntegrations("), "App must read API-backed integration status in API mode");
assert(app.includes("getSyncRuns("), "App must read API-backed sync run tracking in API mode");
assert(app.includes("getAuditLogs("), "App must read API-backed audit logs in API mode");
assert(app.includes("mapApiIntegrationsToIntegrationHealth("), "App must map API integration status into integration health rows");
assert(app.includes("mapApiSyncRunsToSyncRunPreviews("), "App must map API sync runs through the safe adapter");
assert(app.includes("mapApiAuditLogsToEvidenceRows("), "App must map audit logs into safe audit evidence rows");
assert(app.includes("integrations={board.integrations}"), "Safety page must render board integrations, including API-backed integrations");
assert(app.includes("updateTaskStatus("), "App must call the demo task status API when API-backed board data is available");
assert(app.includes('boardDataState.source === "api"'), "App must gate task status API mutations to the connected API board state");
assert(app.includes("applyApiTaskStatusToBoard"), "App must apply successful API task status responses to the board state");
assert(app.includes("applyLocalTaskStatus(taskId, status)"), "App must fall back to local task status state when the API mutation is unavailable");

console.log("API adapter contract passed");
