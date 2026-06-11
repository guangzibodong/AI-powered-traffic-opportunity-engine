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

function readExportedFunction(content, name) {
  const start = content.indexOf(`export async function ${name}(`);
  assert(start >= 0, `Missing exported function: ${name}`);
  const next = content.indexOf("\nexport async function", start + 1);
  return content.slice(start, next === -1 ? content.length : next);
}

function readExportedType(content, name) {
  const start = content.indexOf(`export type ${name} = {`);
  assert(start >= 0, `Missing exported type: ${name}`);
  const next = content.indexOf("\nexport type", start + 1);
  return content.slice(start, next === -1 ? content.length : next);
}

const adapter = read("lib/view-model-adapters.ts");
const apiClient = read("lib/api-client.ts");
const app = read("app/App.tsx");
const types = read("lib/types.ts");

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
assert(adapter.includes("mapApiImportedQueriesToPreviews"), "adapter must expose imported query row DTO conversion");
assert(adapter.includes("mapApiImportedQueryResponseToPreview"), "adapter must expose imported query row detail DTO conversion");
assert(adapter.includes("mapApiImportedProductsToCatalogPreviews"), "adapter must expose imported product catalog preview conversion");
assert(adapter.includes("mapApiImportedPagesToCatalogPreviews"), "adapter must expose imported page catalog preview conversion");
assert(adapter.includes("mapApiImportedProductResponseToCatalogPreview"), "adapter must expose imported product detail catalog preview conversion");
assert(adapter.includes("mapApiImportedPageResponseToCatalogPreview"), "adapter must expose imported page detail catalog preview conversion");
assert(types.includes("displayHref"), "Imported catalog preview view model must expose a sanitized display URL field");
assert(adapter.includes("formatImportedCatalogHrefForDisplay"), "adapter must centralize imported catalog URL display formatting");
assert(adapter.includes("catalogHrefDisplayMaxLength"), "adapter must cap imported catalog display URL length");
assert(adapter.includes("mapApiImportedOpportunitiesToOpportunities"), "adapter must expose imported opportunity DTO conversion");
assert(adapter.includes("mapApiImportedTasksToTasks"), "adapter must expose imported task preview DTO conversion");
assert(adapter.includes("automationLevel: \"recommend_only\""), "imported task preview adapter must keep imported previews recommend-only");
assert(types.includes("AssetDraftPreview"), "types must expose a safe asset draft preview view model");
assert(types.includes("AssetQaCheckPreview"), "types must expose safe asset QA check previews");
assert(types.includes("AssetClaimPreview"), "types must expose safe asset claim ledger previews");
assert(adapter.includes("mapApiAssetWorkspaceToPreviews"), "adapter must expose asset workspace DTO conversion");
assert(adapter.includes("mapApiAssetResponseToPreview"), "adapter must expose asset detail DTO conversion");
assert(adapter.includes("externalWriteAllowed: false"), "asset adapter must clamp external write state to false");
assert(adapter.includes("blocked_capabilities"), "asset adapter must preserve blocked capability context");
assert(adapter.includes("mapAssetQaChecks"), "asset adapter must map QA checks through a safe helper");
assert(adapter.includes("assetQaCheckKeys"), "asset adapter must allowlist asset QA check keys");
assert(adapter.includes("assetQaCheckStatuses"), "asset adapter must allowlist asset QA check statuses");
assert(adapter.includes("mapAssetClaimLedger"), "asset adapter must map claim ledger rows through a safe helper");
assert(adapter.includes("mapApiPerformanceSnapshotsToPreviews"), "adapter must expose performance snapshot DTO conversion");
assert(
  adapter.includes("mapApiAssetPerformanceSnapshotsToPreviews"),
  "adapter must expose asset performance snapshot DTO conversion"
);
assert(
  adapter.includes("mapApiPerformanceRefreshPreviewToPreview"),
  "adapter must expose performance refresh preview DTO conversion"
);
assert(adapter.includes("local_imported_gsc_only"), "performance snapshot adapter must clamp to local imported GSC scope");
assert(adapter.includes("local_tracking_preview_only"), "performance refresh preview adapter must clamp to local preview scope");
const assetDraftPreviewType = readExportedType(types, "AssetDraftPreview");
assert(assetDraftPreviewType.includes("externalWriteAllowed: false"), "Asset draft preview must keep external write as literal false");
assert(assetDraftPreviewType.includes("qaChecks: AssetQaCheckPreview[]"), "Asset draft preview must expose safe QA check details");
assert(assetDraftPreviewType.includes("claimLedger: AssetClaimPreview[]"), "Asset draft preview must expose safe claim ledger details");
assert(assetDraftPreviewType.includes("claimCount: number"), "Asset draft preview must expose a claim count diagnostic");
for (const forbiddenAssetPreviewField of ["href", "publish", "sync", "credential", "commerce", "wordpressDraft"]) {
  assert(
    !assetDraftPreviewType.toLowerCase().includes(forbiddenAssetPreviewField.toLowerCase()),
    `Asset draft preview must not expose ${forbiddenAssetPreviewField}`
  );
}
const assetClaimPreviewType = readExportedType(types, "AssetClaimPreview");
for (const requiredAssetClaimField of ["id: string", "source: string", "text: string"]) {
  assert(assetClaimPreviewType.includes(requiredAssetClaimField), `Asset claim preview must expose ${requiredAssetClaimField}`);
}
for (const forbiddenAssetClaimField of ["metadata", "credential", "token", "secret", "password", "apiKey", "publish", "sync"]) {
  assert(
    !assetClaimPreviewType.toLowerCase().includes(forbiddenAssetClaimField.toLowerCase()),
    `Asset claim preview must not expose ${forbiddenAssetClaimField}`
  );
}
const assetQaCheckPreviewType = readExportedType(types, "AssetQaCheckPreview");
assert(assetQaCheckPreviewType.includes('"local_review"'), "Asset QA check preview must include a safe local review fallback");
assert(assetQaCheckPreviewType.includes('"pending"'), "Asset QA check preview must expose pending status");
for (const forbiddenAssetQaField of ["metadata", "credential", "token", "secret", "password", "apiKey", "publish", "sync"]) {
  assert(
    !assetQaCheckPreviewType.toLowerCase().includes(forbiddenAssetQaField.toLowerCase()),
    `Asset QA check preview must not expose ${forbiddenAssetQaField}`
  );
}
const performanceSnapshotPreviewType = readExportedType(types, "PerformanceSnapshotPreview");
assert(
  performanceSnapshotPreviewType.includes("externalWriteAllowed: false"),
  "Performance snapshot preview must keep external write as literal false"
);
assert(
  performanceSnapshotPreviewType.includes('safetyScope: "local_imported_gsc_only"'),
  "Performance snapshot preview must use local imported GSC safety scope"
);
for (const forbiddenPerformancePreviewField of ["href", "publish", "sync", "credential", "commerce", "wordpressDraft"]) {
  assert(
    !performanceSnapshotPreviewType.toLowerCase().includes(forbiddenPerformancePreviewField.toLowerCase()),
    `Performance snapshot preview must not expose ${forbiddenPerformancePreviewField}`
  );
}
const performanceRefreshPreviewType = readExportedType(types, "PerformanceRefreshPreview");
assert(
  performanceRefreshPreviewType.includes("externalWriteAllowed: false"),
  "Performance refresh preview must keep external write as literal false"
);
assert(
  performanceRefreshPreviewType.includes('status: "preview_only"'),
  "Performance refresh preview must expose only preview_only status"
);
assert(
  performanceRefreshPreviewType.includes('safetyScope: "local_tracking_preview_only"'),
  "Performance refresh preview must use local preview safety scope"
);
for (const forbiddenRefreshPreviewField of ["href", "publish", "sync", "credential", "commerce", "wordpressDraft"]) {
  assert(
    !performanceRefreshPreviewType.toLowerCase().includes(forbiddenRefreshPreviewField.toLowerCase()),
    `Performance refresh preview must not expose ${forbiddenRefreshPreviewField}`
  );
}
assert(types.includes('"product_seo"'), "frontend task categories and rule ids must preserve imported product_seo previews");
assert(adapter.includes('"product_seo"'), "imported opportunity adapter must preserve product_seo rule ids");
assert(adapter.includes('category === "product_seo"'), "imported task adapter must preserve product_seo categories");
assert(types.includes('"buying_guide"'), "frontend task categories must preserve imported buying_guide previews");
assert(types.includes('"buying_guide_gap"'), "frontend rule ids must preserve imported buying_guide_gap previews");
assert(adapter.includes('"buying_guide_gap"'), "imported opportunity adapter must preserve buying_guide_gap rule ids");
assert(adapter.includes('category === "buying_guide"'), "imported task adapter must preserve buying_guide categories");
assert(adapter.includes("source_opportunity?.rule_id"), "imported task adapter must read source opportunity rule ids");
assert(adapter.includes("source: \"Imported GSC\""), "imported query cluster adapter must label imported GSC evidence");
assert(types.includes("ImportedQueryRowPreview"), "types must expose a safe imported query row preview view model");
assert(types.includes("displayCtr"), "Imported query row preview must expose a display-safe CTR field");
assert(types.includes("displayClicks"), "Imported query row preview must expose a display-safe clicks field");
assert(types.includes("displayEvidenceSummary"), "Imported query row preview must expose a display-safe evidence summary field");
assert(types.includes("displayImpressions"), "Imported query row preview must expose a display-safe impressions field");
assert(types.includes("displayPage"), "Imported query row preview must expose a display-safe page field");
assert(types.includes("displayPosition"), "Imported query row preview must expose a display-safe position field");
assert(adapter.includes("mapApiImportedQueryRowToPreview"), "adapter must map raw imported query rows through a safe row preview helper");
assert(adapter.includes("formatImportedQueryRowCtr"), "imported query row adapter must centralize CTR display formatting");
assert(adapter.includes("formatImportedQueryRowCount"), "imported query row adapter must centralize count display formatting");
assert(adapter.includes("formatImportedQueryRowEvidenceSummary"), "imported query row adapter must centralize evidence summary formatting");
assert(adapter.includes("formatImportedQueryRowMetric"), "imported query row adapter must centralize evidence metric formatting");
assert(adapter.includes("formatImportedQueryRowPosition"), "imported query row adapter must centralize position display formatting");
assert(adapter.includes("row.window ?? \"imported\""), "imported query row adapter must default missing windows to imported");
assert(adapter.includes("formatImportedQueryRowSource"), "imported query row adapter must centralize source label formatting");
assert(adapter.includes('source === "csv_import"'), "imported query row adapter must hide raw csv_import source labels");
assert(adapter.includes('type: "audit"'), "audit log DTO conversion must produce audit evidence rows");
assert(adapter.includes("formatAuditAction"), "audit log DTO conversion must centralize safe action display copy");
assert(
  adapter.includes('"performance.refresh_previewed"'),
  "audit log DTO conversion must recognize performance refresh preview events"
);
const auditLogPreviewType = readExportedType(types, "AuditLogPreview");
assert(auditLogPreviewType.includes("displayAction"), "Audit log preview must expose safe display action copy");
assert(auditLogPreviewType.includes("eventKind"), "Audit log preview must expose a safe event kind");
for (const forbiddenAuditPreviewField of ["metadata", "credential", "token", "secret", "password", "apiKey"]) {
  assert(
    !auditLogPreviewType.toLowerCase().includes(forbiddenAuditPreviewField.toLowerCase()),
    `Audit log preview must not expose ${forbiddenAuditPreviewField}`
  );
}
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
assert(apiClient.includes("ApiImportedGraphResponse"), "API client must type imported graph responses");
assert(apiClient.includes("ApiImportedQueryRow"), "API client must type imported query row records");
assert(apiClient.includes("ApiImportedQueriesResponse"), "API client must type imported query row list responses");
assert(apiClient.includes("ApiImportedQueryResponse"), "API client must type imported query row detail responses");
assert(apiClient.includes("ApiImportedProductsResponse"), "API client must type imported product list responses");
assert(apiClient.includes("ApiImportedProductResponse"), "API client must type imported product detail responses");
assert(apiClient.includes("ApiImportedPagesResponse"), "API client must type imported page list responses");
assert(apiClient.includes("ApiImportedPageResponse"), "API client must type imported page detail responses");
assert(apiClient.includes("ApiImportedQueryClustersResponse"), "API client must type imported query cluster responses");
assert(apiClient.includes("ApiImportedQueryClusterResponse"), "API client must type imported query cluster detail responses");
assert(apiClient.includes("ApiImportedOpportunitiesResponse"), "API client must type imported opportunity responses");
assert(apiClient.includes("ApiImportedOpportunityResponse"), "API client must type imported opportunity detail responses");
assert(apiClient.includes("ApiImportedTasksResponse"), "API client must type imported task preview responses");
assert(apiClient.includes("ApiImportedTaskResponse"), "API client must type imported task preview detail responses");
assert(apiClient.includes("ApiAssetDraft"), "API client must type asset draft records");
assert(apiClient.includes("ApiAssetUpdatePayload"), "API client must type safe local asset update payloads");
assert(apiClient.includes("ApiAssetWorkspaceResponse"), "API client must type asset workspace list responses");
assert(apiClient.includes("ApiAssetResponse"), "API client must type asset detail and creation responses");
assert(apiClient.includes("ApiPerformanceSnapshotsResponse"), "API client must type performance snapshot responses");
assert(apiClient.includes("ApiAssetPerformanceSnapshotsResponse"), "API client must type asset performance snapshot responses");
assert(apiClient.includes("ApiPerformanceRefreshPreviewResponse"), "API client must type performance refresh preview responses");
assert(apiClient.includes("getIntegrations"), "API client must expose integration status reads");
assert(apiClient.includes("getSyncRuns"), "API client must expose sync run reads");
assert(apiClient.includes("getAuditLogs"), "API client must expose audit log reads");
assert(apiClient.includes("getImportedGraph"), "API client must expose imported signal graph reads");
assert(apiClient.includes("getImportedQueries"), "API client must expose imported query row reads");
assert(apiClient.includes("getImportedQuery"), "API client must expose imported query row detail reads");
assert(apiClient.includes("getImportedProducts"), "API client must expose imported product reads");
assert(apiClient.includes("getImportedProduct"), "API client must expose imported product detail reads");
assert(apiClient.includes("getImportedPages"), "API client must expose imported page reads");
assert(apiClient.includes("getImportedPage"), "API client must expose imported page detail reads");
assert(apiClient.includes("getImportedQueryClusters"), "API client must expose imported query cluster reads");
assert(apiClient.includes("getImportedQueryCluster"), "API client must expose imported query cluster detail reads");
assert(apiClient.includes("getImportedOpportunities"), "API client must expose imported opportunity reads");
assert(apiClient.includes("getImportedOpportunity"), "API client must expose imported opportunity detail reads");
assert(apiClient.includes("getImportedTasks"), "API client must expose imported task preview reads");
assert(apiClient.includes("getImportedTask"), "API client must expose imported task preview detail reads");
assert(apiClient.includes("getAssets"), "API client must expose asset workspace reads");
assert(apiClient.includes("getAsset"), "API client must expose asset detail reads");
assert(apiClient.includes("createAssetFromTask"), "API client must expose local asset creation from approved tasks");
assert(!apiClient.includes("publishWordpressDraft"), "API client must not expose WordPress draft publishing");
assert(apiClient.includes("updateAsset"), "API client must expose safe local asset mutation after backend QA gates");
assert(apiClient.includes("getPerformanceSnapshots"), "API client must expose performance snapshot reads");
assert(apiClient.includes("getAssetPerformanceSnapshots"), "API client must expose asset performance snapshot reads");
assert(apiClient.includes("previewPerformanceRefresh"), "API client must expose local performance refresh previews");
const performanceSnapshotClient = readExportedFunction(apiClient, "getPerformanceSnapshots");
assert(performanceSnapshotClient.includes("/performance"), "Performance snapshot client must target the read-only performance endpoint");
for (const unsafeMethod of ['method: "POST"', 'method: "PATCH"', 'method: "PUT"', 'method: "DELETE"']) {
  assert(!performanceSnapshotClient.includes(unsafeMethod), `Performance snapshot client must stay read-only and not use ${unsafeMethod}`);
}
const assetPerformanceSnapshotClient = readExportedFunction(apiClient, "getAssetPerformanceSnapshots");
assert(
  assetPerformanceSnapshotClient.includes("encodeURIComponent(assetId)"),
  "Asset performance snapshot client must encode asset ids"
);
assert(
  assetPerformanceSnapshotClient.includes("/assets/${encodedAssetId}/performance"),
  "Asset performance snapshot client must target the read-only asset performance endpoint"
);
for (const unsafeMethod of ['method: "POST"', 'method: "PATCH"', 'method: "PUT"', 'method: "DELETE"']) {
  assert(
    !assetPerformanceSnapshotClient.includes(unsafeMethod),
    `Asset performance snapshot client must stay read-only and not use ${unsafeMethod}`
  );
}
const performanceRefreshPreviewClient = readExportedFunction(apiClient, "previewPerformanceRefresh");
assert(
  performanceRefreshPreviewClient.includes("/performance/refresh"),
  "Performance refresh preview client must target the local preview endpoint"
);
assert(
  performanceRefreshPreviewClient.includes('method: "POST"'),
  "Performance refresh preview client must use POST for the explicit preview route"
);
assert(
  !performanceRefreshPreviewClient.includes("body:"),
  "Performance refresh preview client must not send a request body or credentials"
);
assert(
  !performanceRefreshPreviewClient.toLowerCase().includes("oauth") &&
    !performanceRefreshPreviewClient.toLowerCase().includes("token") &&
    !performanceRefreshPreviewClient.toLowerCase().includes("secret") &&
    !performanceRefreshPreviewClient.toLowerCase().includes("password"),
  "Performance refresh preview client must not collect credential-like values"
);
const assetUpdateClient = readExportedFunction(apiClient, "updateAsset");
assert(assetUpdateClient.includes("encodeURIComponent(assetId)"), "Asset update client must encode asset path segments");
assert(assetUpdateClient.includes("/assets/${encodedAssetId}"), "Asset update client must target the encoded local asset id");
assert(assetUpdateClient.includes('method: "PATCH"'), "Asset update client must use PATCH");
assert(assetUpdateClient.includes("sanitizeAssetUpdatePayload(payload)"), "Asset update client must sanitize update payloads");
assert(!assetUpdateClient.includes("publish-wordpress-draft"), "Asset update client must not target WordPress draft publishing");
assert(apiClient.includes("/imported-tasks"), "Imported task client must target the read-only imported task endpoint");
for (const importedReadFunction of ["getImportedGraph", "getImportedQueries", "getImportedQuery", "getImportedProducts", "getImportedProduct", "getImportedPages", "getImportedPage", "getImportedQueryClusters", "getImportedQueryCluster", "getImportedOpportunities", "getImportedOpportunity", "getImportedTasks", "getImportedTask"]) {
  const functionBody = readExportedFunction(apiClient, importedReadFunction);
  for (const unsafeMethod of ['method: "POST"', 'method: "PATCH"', 'method: "PUT"', 'method: "DELETE"']) {
    assert(!functionBody.includes(unsafeMethod), `${importedReadFunction} must stay read-only and not use ${unsafeMethod}`);
  }
}
assert(readExportedFunction(apiClient, "getImportedGraph").includes("/imported-graph"), "Imported graph client must target the read-only imported graph endpoint");
assert(readExportedFunction(apiClient, "getImportedQueries").includes("/queries"), "Imported query rows client must target the read-only queries endpoint");
const importedQueryDetailClient = readExportedFunction(apiClient, "getImportedQuery");
assert(importedQueryDetailClient.includes("/queries/${encodedQueryId}"), "Imported query detail client must target the encoded query id");
assert(importedQueryDetailClient.includes("encodeURIComponent(queryId)"), "Imported query detail client must encode query path segments");
assert(readExportedFunction(apiClient, "getImportedProducts").includes("/products"), "Imported products client must target the read-only products endpoint");
const importedProductDetailClient = readExportedFunction(apiClient, "getImportedProduct");
assert(importedProductDetailClient.includes("/products/${encodedProductId}"), "Imported product detail client must target the encoded product id");
assert(importedProductDetailClient.includes("encodeURIComponent(productId)"), "Imported product detail client must encode product path segments");
assert(readExportedFunction(apiClient, "getImportedPages").includes("/pages"), "Imported pages client must target the read-only pages endpoint");
const importedPageDetailClient = readExportedFunction(apiClient, "getImportedPage");
assert(importedPageDetailClient.includes("/pages/${encodedPageId}"), "Imported page detail client must target the encoded page id");
assert(importedPageDetailClient.includes("encodeURIComponent(pageId)"), "Imported page detail client must encode page path segments");
const importedQueryClusterDetailClient = readExportedFunction(apiClient, "getImportedQueryCluster");
assert(importedQueryClusterDetailClient.includes("/query-clusters/${encodedClusterKey}"), "Imported query cluster detail client must target the encoded cluster key");
assert(importedQueryClusterDetailClient.includes("encodeURIComponent(clusterKey)"), "Imported query cluster detail client must encode cluster path segments");
const importedOpportunityDetailClient = readExportedFunction(apiClient, "getImportedOpportunity");
assert(importedOpportunityDetailClient.includes("/imported-opportunities/${encodedOpportunityId}"), "Imported opportunity detail client must target the encoded imported opportunity id");
assert(importedOpportunityDetailClient.includes("encodeURIComponent(opportunityId)"), "Imported opportunity detail client must encode opportunity path segments");
const importedTaskDetailClient = readExportedFunction(apiClient, "getImportedTask");
assert(importedTaskDetailClient.includes("/imported-tasks/${encodedTaskId}"), "Imported task detail client must target the encoded imported task id");
assert(importedTaskDetailClient.includes("encodeURIComponent(taskId)"), "Imported task detail client must encode task path segments");
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
assert(app.includes("getImportedGraph("), "App must read API-backed imported graph in API mode");
assert(app.includes("getImportedQueries("), "App must read API-backed imported query rows in API mode");
assert(app.includes("getImportedProducts("), "App must read API-backed imported products in API mode");
assert(app.includes("getImportedPages("), "App must read API-backed imported pages in API mode");
assert(app.includes("getImportedOpportunities("), "App must read API-backed imported opportunities in API mode");
assert(app.includes("getImportedTasks("), "App must read API-backed imported task previews in API mode");
assert(app.includes("getPerformanceSnapshots("), "App must read API-backed local performance snapshots in API mode");
assert(
  app.includes("getAssetPerformanceSnapshots("),
  "App must read API-backed local asset performance snapshots when an asset editor opens"
);
assert(app.includes("mapApiIntegrationsToIntegrationHealth("), "App must map API integration status into integration health rows");
assert(app.includes("mapApiSyncRunsToSyncRunPreviews("), "App must map API sync runs through the safe adapter");
assert(app.includes("mapApiAuditLogsToEvidenceRows("), "App must map audit logs into safe audit evidence rows");
assert(adapter.includes("mapApiImportedGraphToClusterPreviews"), "Adapter must expose imported graph DTO conversion");
assert(app.includes("mapApiImportedGraphToClusterPreviews("), "App must map imported graph through the safe adapter");
assert(app.includes("mapApiImportedQueriesToPreviews("), "App must map imported query rows through the safe adapter");
assert(app.includes("mapApiImportedProductsToCatalogPreviews("), "App must map imported products through the safe adapter");
assert(app.includes("mapApiImportedPagesToCatalogPreviews("), "App must map imported pages through the safe adapter");
assert(app.includes("mapApiPerformanceSnapshotsToPreviews("), "App must map performance snapshots through the safe adapter");
assert(
  app.includes("mapApiAssetPerformanceSnapshotsToPreviews("),
  "App must map asset performance snapshots through the safe adapter"
);
assert(!app.includes("previewPerformanceRefresh("), "App must not call local performance refresh previews from the visible UI");
assert(app.includes("PerformanceSnapshotPanel"), "Board must expose a read-only performance snapshot panel");
assert(app.includes("AssetPerformancePanel"), "Board must expose a read-only asset performance panel");
assert(app.includes("performance-snapshot-panel"), "Performance snapshot UI must have a stable read-only panel class");
assert(
  app.includes("data-performance-blocked-capability-count"),
  "Performance snapshot UI must expose stable store-specific blocked capability count diagnostics"
);
assert(app.includes("performance-comparison-panel"), "Performance snapshot UI must expose a stable before/after comparison panel class");
assert(
  app.includes("data-performance-comparison-blocked-capability-count"),
  "Performance comparison UI must expose stable blocked capability count diagnostics"
);
assert(
  app.includes('data-performance-comparison-metric="source"'),
  "Performance comparison UI must expose stable baseline source diagnostics"
);
assert(
  app.includes('data-performance-comparison-metric="baseline_snapshot_id"'),
  "Performance comparison UI must expose stable baseline snapshot id diagnostics"
);
assert(
  app.includes('data-performance-comparison-metric="evidence_count"'),
  "Performance comparison UI must expose stable evidence count diagnostics"
);
assert(app.includes("data-asset-qa-detail"), "Asset workspace UI must expose stable QA detail diagnostics");
assert(app.includes("data-asset-qa-key"), "Asset workspace UI must expose stable QA key diagnostics");
assert(app.includes("data-asset-qa-status"), "Asset workspace UI must expose stable QA status diagnostics");
assert(
  app.includes("data-asset-row-qa-detail-count"),
  "Asset workspace UI must expose stable row-level QA detail count diagnostics"
);
assert(
  app.includes("data-asset-row-qa-pending-detail-count"),
  "Asset workspace UI must expose stable row-level QA pending detail count diagnostics"
);
assert(
  app.includes("data-asset-row-qa-counts-reconciled"),
  "Asset workspace UI must expose stable row-level QA count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-row-qa-pending-counts-reconciled"),
  "Asset workspace UI must expose stable row-level QA pending count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-row-qa-status-count"),
  "Asset workspace UI must expose stable row-level QA status count diagnostics"
);
assert(
  app.includes("data-asset-row-qa-status-key"),
  "Asset workspace UI must expose stable row-level QA status key diagnostics"
);
assert(
  app.includes("data-asset-row-qa-status-counts-reconciled"),
  "Asset workspace UI must expose stable row-level QA status reconciliation diagnostics"
);
assert(
  app.includes("data-asset-row-qa-readiness-state"),
  "Asset workspace UI must expose stable row-level QA readiness state diagnostics"
);
assert(
  app.includes("data-asset-row-qa-readiness-pending-count"),
  "Asset workspace UI must expose stable row-level QA readiness pending count diagnostics"
);
assert(
  app.includes("data-asset-row-qa-readiness-total-count"),
  "Asset workspace UI must expose stable row-level QA readiness total count diagnostics"
);
assert(
  app.includes("data-asset-row-qa-readiness-counts-reconciled"),
  "Asset workspace UI must expose stable row-level QA readiness count reconciliation diagnostics"
);
assert(
  app.includes('data-asset-row-qa-readiness="true"'),
  "Asset workspace UI must expose a stable visible row-level QA readiness summary"
);
assert(
  app.includes("data-asset-qa-readiness-pending-count"),
  "Asset workspace UI must expose stable workspace-level QA readiness pending count diagnostics"
);
assert(
  app.includes("data-asset-qa-readiness-total-count"),
  "Asset workspace UI must expose stable workspace-level QA readiness total count diagnostics"
);
assert(
  app.includes("data-asset-qa-readiness-counts-reconciled"),
  "Asset workspace UI must expose stable workspace-level QA readiness count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-row-blocked-capability-count"),
  "Asset workspace UI must expose stable row-level blocked capability count diagnostics"
);
assert(
  app.includes("data-asset-row-blocked-capability-key"),
  "Asset workspace UI must expose stable row-level blocked capability key diagnostics"
);
assert(
  app.includes("data-asset-row-blocked-capability-counts-reconciled"),
  "Asset workspace UI must expose stable row-level blocked capability reconciliation diagnostics"
);
assert(
  app.includes("data-blocked-capability-counts-reconciled"),
  "Asset workspace UI must expose stable workspace-level blocked capability reconciliation diagnostics"
);
assert(
  app.includes('data-blocked-capability-row="true"'),
  "Asset workspace UI must expose stable workspace-level blocked capability rows"
);
assert(
  app.includes("data-blocked-capability-key"),
  "Asset workspace UI must expose stable workspace-level blocked capability key diagnostics"
);
assert(
  app.includes("data-wordpress-draft-readiness-counts-reconciled"),
  "Asset workspace UI must expose stable WordPress draft readiness count reconciliation diagnostics"
);
assert(
  app.includes("data-external-write-clamp-reconciled"),
  "Asset workspace UI must expose stable external-write clamp reconciliation diagnostics"
);
assert(
  app.includes('data-external-write-row="true"'),
  "Asset workspace UI must expose a stable visible external-write row diagnostic"
);
assert(
  app.includes("data-asset-workspace-availability-reconciled"),
  "Asset workspace UI must expose stable availability reconciliation diagnostics"
);
assert(
  app.includes('data-asset-workspace-availability-row="true"'),
  "Asset workspace UI must expose a stable visible availability row diagnostic"
);
assert(
  app.includes("data-asset-workspace-availability-row-state"),
  "Asset workspace UI must expose stable visible availability row state diagnostics"
);
assert(
  app.includes("data-asset-draft-counts-reconciled"),
  "Asset workspace UI must expose stable draft count reconciliation diagnostics"
);
assert(
  app.includes('data-asset-draft-count-row="true"'),
  "Asset workspace UI must expose a stable visible draft count row diagnostic"
);
assert(
  app.includes("data-asset-draft-count-row-value"),
  "Asset workspace UI must expose stable visible draft count row value diagnostics"
);
assert(
  app.includes("data-asset-row-counts-reconciled"),
  "Asset workspace UI must expose stable visible-row overflow reconciliation diagnostics"
);
assert(
  app.includes("data-hidden-asset-count"),
  "Asset workspace UI must expose stable hidden asset row count diagnostics"
);
assert(
  app.includes("data-visible-asset-count"),
  "Asset workspace UI must expose stable visible asset row count diagnostics"
);
assert(
  app.includes("data-asset-qa-counts-reconciled"),
  "Asset workspace UI must expose stable QA aggregate reconciliation diagnostics"
);
assert(
  app.includes("data-visible-asset-qa-check-count"),
  "Asset workspace UI must expose stable visible QA check aggregate diagnostics"
);
assert(
  app.includes("data-hidden-asset-qa-check-count"),
  "Asset workspace UI must expose stable hidden QA check aggregate diagnostics"
);
assert(
  app.includes("data-visible-asset-qa-pending-count"),
  "Asset workspace UI must expose stable visible QA pending aggregate diagnostics"
);
assert(
  app.includes("data-hidden-asset-qa-pending-count"),
  "Asset workspace UI must expose stable hidden QA pending aggregate diagnostics"
);
assert(
  app.includes("data-asset-type-counts-reconciled"),
  "Asset workspace UI must expose stable asset type mix reconciliation diagnostics"
);
assert(
  app.includes('data-asset-type-row="true"'),
  "Asset workspace UI must expose stable asset type rows"
);
assert(
  app.includes("data-asset-type-key"),
  "Asset workspace UI must expose stable asset type key diagnostics"
);
assert(
  app.includes("data-asset-type-row-count"),
  "Asset workspace UI must expose stable asset type row count diagnostics"
);
assert(app.includes("data-asset-claim-count"), "Asset workspace UI must expose stable claim count diagnostics");
assert(
  app.includes("data-asset-workspace-content-block-count"),
  "Asset workspace UI must expose stable workspace content block count diagnostics"
);
assert(
  app.includes("data-asset-workspace-content-block-counts-reconciled"),
  "Asset workspace UI must expose stable workspace content block reconciliation diagnostics"
);
assert(
  app.includes("data-visible-asset-content-block-count"),
  "Asset workspace UI must expose stable visible content block aggregate diagnostics"
);
assert(
  app.includes("data-hidden-asset-content-block-count"),
  "Asset workspace UI must expose stable hidden content block aggregate diagnostics"
);
assert(
  app.includes("data-asset-workspace-content-block-type-count"),
  "Asset workspace UI must expose stable workspace content block type count diagnostics"
);
assert(
  app.includes("data-asset-workspace-content-block-type-total-count"),
  "Asset workspace UI must expose stable workspace content block type total diagnostics"
);
assert(
  app.includes("data-asset-workspace-content-block-type-counts-reconciled"),
  "Asset workspace UI must expose stable workspace content block type reconciliation diagnostics"
);
assert(
  app.includes('data-asset-workspace-content-block-type-row="true"'),
  "Asset workspace UI must expose stable workspace content block type rows"
);
assert(
  app.includes("data-asset-workspace-content-block-type-key"),
  "Asset workspace UI must expose stable workspace content block type key diagnostics"
);
assert(
  app.includes("data-asset-workspace-content-block-type-row-count"),
  "Asset workspace UI must expose stable workspace content block type row count diagnostics"
);
assert(
  app.includes("data-asset-row-content-block-type-count"),
  "Asset workspace UI must expose stable row-level content block type count diagnostics"
);
assert(
  app.includes("data-asset-row-content-block-count"),
  "Asset workspace UI must expose stable row-level content block count diagnostics"
);
assert(
  app.includes("data-asset-row-content-block-counts-reconciled"),
  "Asset workspace UI must expose stable row-level content block count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-row-content-block-type-key"),
  "Asset workspace UI must expose stable row-level content block type key diagnostics"
);
assert(
  app.includes("data-asset-row-content-block-type-counts-reconciled"),
  "Asset workspace UI must expose stable row-level content block type reconciliation diagnostics"
);
assert(
  app.includes("data-asset-row-claim-detail-count"),
  "Asset workspace UI must expose stable row-level claim detail count diagnostics"
);
assert(
  app.includes("data-asset-row-claim-counts-reconciled"),
  "Asset workspace UI must expose stable row-level claim count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-row-claim-source-count"),
  "Asset workspace UI must expose stable row-level claim source count diagnostics"
);
assert(
  app.includes("data-asset-row-claim-source-key"),
  "Asset workspace UI must expose stable row-level claim source key diagnostics"
);
assert(
  app.includes("data-asset-row-claim-source-counts-reconciled"),
  "Asset workspace UI must expose stable row-level claim source reconciliation diagnostics"
);
assert(app.includes("data-asset-claim-detail"), "Asset workspace UI must expose stable claim detail diagnostics");
assert(app.includes("data-asset-claim-id"), "Asset workspace UI must expose stable claim id diagnostics");
assert(app.includes("data-asset-claim-source"), "Asset workspace UI must expose stable claim source diagnostics");
assert(
  app.includes("data-asset-claim-counts-reconciled"),
  "Asset workspace UI must expose stable claim count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-claim-source-count"),
  "Asset workspace UI must expose stable claim source count diagnostics"
);
assert(app.includes("data-asset-claim-source-key"), "Asset workspace UI must expose stable claim source key diagnostics");
assert(
  app.includes("data-asset-claim-source-counts-reconciled"),
  "Asset workspace UI must expose stable claim source count reconciliation diagnostics"
);
assert(app.includes("data-visible-asset-claim-count"), "Asset workspace UI must expose visible claim count diagnostics");
assert(app.includes("data-hidden-asset-claim-count"), "Asset workspace UI must expose hidden claim count diagnostics");
assert(app.includes("Claim ledger"), "Asset workspace UI must expose English claim ledger copy");
assert(app.includes("data-asset-editor-qa-detail"), "Local asset editor UI must expose stable QA detail diagnostics");
assert(app.includes("data-asset-editor-qa-key"), "Local asset editor UI must expose stable QA key diagnostics");
assert(app.includes("data-asset-editor-qa-status"), "Local asset editor UI must expose stable QA status diagnostics");
assert(
  app.includes("data-asset-editor-qa-detail-count"),
  "Local asset editor UI must expose stable QA detail count diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-pending-detail-count"),
  "Local asset editor UI must expose stable QA pending detail count diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-counts-reconciled"),
  "Local asset editor UI must expose stable QA count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-pending-counts-reconciled"),
  "Local asset editor UI must expose stable QA pending count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-status-count"),
  "Local asset editor UI must expose stable QA status count diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-status-key"),
  "Local asset editor UI must expose stable QA status key diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-status-counts-reconciled"),
  "Local asset editor UI must expose stable QA status reconciliation diagnostics"
);
assert(app.includes("data-asset-editor-claim-count"), "Local asset editor UI must expose stable claim count diagnostics");
assert(
  app.includes("data-asset-editor-claim-counts-reconciled"),
  "Local asset editor UI must expose stable claim count reconciliation diagnostics"
);
assert(app.includes("data-asset-editor-claim-detail"), "Local asset editor UI must expose stable claim detail diagnostics");
assert(app.includes("data-asset-editor-claim-id"), "Local asset editor UI must expose stable editor claim id diagnostics");
assert(app.includes("data-asset-editor-claim-source"), "Local asset editor UI must expose stable editor claim source diagnostics");
assert(
  app.includes("data-asset-editor-claim-source-count"),
  "Local asset editor UI must expose stable claim source count diagnostics"
);
assert(
  app.includes("data-asset-editor-claim-source-key"),
  "Local asset editor UI must expose stable editor claim source key diagnostics"
);
assert(
  app.includes("data-asset-editor-claim-source-counts-reconciled"),
  "Local asset editor UI must expose stable editor claim source count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-editor-content-block-type-count"),
  "Local asset editor UI must expose stable content block type count diagnostics"
);
assert(
  app.includes("data-asset-editor-content-block-count"),
  "Local asset editor UI must expose stable content block count diagnostics"
);
assert(
  app.includes("data-asset-editor-content-block-counts-reconciled"),
  "Local asset editor UI must expose stable content block count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-editor-content-block-type-key"),
  "Local asset editor UI must expose stable content block type key diagnostics"
);
assert(
  app.includes("data-asset-editor-content-block-type-counts-reconciled"),
  "Local asset editor UI must expose stable content block type reconciliation diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-check-count"),
  "Local asset editor UI must expose stable QA check count diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-pending-count"),
  "Local asset editor UI must expose stable QA pending count diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-readiness-state"),
  "Local asset editor UI must expose stable QA readiness diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-readiness-pending-count"),
  "Local asset editor UI must expose stable QA readiness pending count diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-readiness-total-count"),
  "Local asset editor UI must expose stable QA readiness total count diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-readiness-counts-reconciled"),
  "Local asset editor UI must expose stable QA readiness count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-summary"),
  "Local asset editor UI must expose a stable visible QA aggregate summary"
);
assert(
  app.includes("data-asset-editor-qa-readiness"),
  "Local asset editor UI must expose stable visible QA readiness summary diagnostics"
);
assert(
  app.includes("data-asset-editor-qa-checks"),
  "Local asset editor UI must expose stable visible QA check summary diagnostics"
);
assert(
  app.includes("data-asset-editor-safety"),
  "Local asset editor UI must expose stable safety diagnostics"
);
assert(
  app.includes("data-asset-editor-blocked-capability-count"),
  "Local asset editor UI must expose stable blocked capability count diagnostics"
);
assert(
  app.includes("data-asset-editor-blocked-capability-counts-reconciled"),
  "Local asset editor UI must expose stable blocked capability reconciliation diagnostics"
);
assert(
  app.includes("data-asset-editor-blocked-capability-key"),
  "Local asset editor UI must expose stable blocked capability key diagnostics"
);
assert(
  app.includes("data-asset-editor-save-state"),
  "Local asset editor UI must expose stable save-state diagnostics"
);
assert(
  app.includes("data-asset-editor-save-feedback"),
  "Local asset editor UI must expose stable save feedback diagnostics"
);
assert(
  app.includes("data-asset-editor-reset-control"),
  "Local asset editor UI must expose a stable local reset control diagnostic"
);
assert(
  app.includes("Reset local changes"),
  "Local asset editor UI must expose English reset-local-changes copy"
);
assert(app.includes("data-asset-editor-faq-draft"), "Local asset editor UI must expose stable FAQ draft diagnostics");
assert(app.includes("data-asset-editor-faq-question"), "Local asset editor UI must expose stable FAQ question diagnostics");
assert(app.includes("data-asset-editor-faq-answer"), "Local asset editor UI must expose stable FAQ answer diagnostics");
assert(app.includes("FAQ question"), "Local asset editor UI must expose English FAQ question copy");
assert(app.includes("FAQ answer"), "Local asset editor UI must expose English FAQ answer copy");
assert(
  app.includes("data-asset-editor-product-grid-notes-draft"),
  "Local asset editor UI must expose stable product grid notes draft diagnostics"
);
assert(
  app.includes("data-asset-editor-product-grid-notes"),
  "Local asset editor UI must expose stable product grid notes diagnostics"
);
assert(app.includes("Product grid notes"), "Local asset editor UI must expose English product grid notes copy");
assert(
  app.includes("data-asset-editor-section-heading-draft"),
  "Local asset editor UI must expose stable structured section heading draft diagnostics"
);
assert(
  app.includes("data-asset-editor-section-heading"),
  "Local asset editor UI must expose stable structured section heading diagnostics"
);
assert(app.includes("Section heading"), "Local asset editor UI must expose English structured section heading copy");
assert(
  app.includes("data-asset-editor-internal-link-draft"),
  "Local asset editor UI must expose stable internal link draft diagnostics"
);
assert(
  app.includes("data-asset-editor-internal-link-reference"),
  "Local asset editor UI must expose stable internal link reference diagnostics"
);
assert(app.includes("Internal link reference"), "Local asset editor UI must expose English internal link reference copy");
assert(
  app.includes("data-asset-editor-schema-preview-draft"),
  "Local asset editor UI must expose stable schema preview draft diagnostics"
);
assert(
  app.includes("data-asset-editor-schema-preview"),
  "Local asset editor UI must expose stable schema preview diagnostics"
);
assert(app.includes("Schema preview"), "Local asset editor UI must expose English schema preview copy");
assert(
  app.includes("data-asset-editor-dirty-state"),
  "Local asset editor UI must expose stable dirty-state diagnostics"
);
assert(
  app.includes("data-asset-editor-dirty-field-count"),
  "Local asset editor UI must expose stable dirty field count diagnostics"
);
assert(
  app.includes("data-asset-editor-dirty-field-keys"),
  "Local asset editor UI must expose stable dirty field key diagnostics"
);
assert(
  app.includes("data-asset-editor-dirty-field-keys-reconciled"),
  "Local asset editor UI must expose stable dirty field key reconciliation diagnostics"
);
assert(
  app.includes('data-asset-editor-dirty-summary="true"'),
  "Local asset editor UI must expose a stable visible dirty-state summary"
);
assert(
  app.includes("data-asset-editor-dirty-summary-field-count"),
  "Local asset editor dirty-state summary must expose dirty field count diagnostics"
);
assert(
  app.includes("data-asset-editor-dirty-summary-field-keys"),
  "Local asset editor dirty-state summary must expose dirty field key diagnostics"
);
assert(
  app.includes("data-asset-editor-dirty-summary-field-keys-reconciled"),
  "Local asset editor dirty-state summary must expose dirty field key reconciliation diagnostics"
);
assert(
  app.includes("data-asset-editor-field-count"),
  "Local asset editor UI must expose stable field count diagnostics"
);
assert(
  app.includes("data-asset-editor-filled-field-count"),
  "Local asset editor UI must expose stable filled field count diagnostics"
);
assert(
  app.includes("data-asset-editor-empty-field-count"),
  "Local asset editor UI must expose stable empty field count diagnostics"
);
assert(
  app.includes("data-asset-editor-field-summary"),
  "Local asset editor UI must expose stable visible field summary diagnostics"
);
assert(
  app.includes("data-asset-editor-field-key"),
  "Local asset editor UI must expose stable per-field key diagnostics"
);
assert(
  app.includes("data-asset-editor-field-state"),
  "Local asset editor UI must expose stable per-field fill state diagnostics"
);
assert(
  app.includes("data-asset-editor-field-dirty-state"),
  "Local asset editor UI must expose stable per-field dirty state diagnostics"
);
assert(
  app.includes("data-asset-editor-field-counts-reconciled"),
  "Local asset editor UI must expose stable field count reconciliation diagnostics"
);
assert(
  app.includes("data-asset-editor-field-readiness-state"),
  "Local asset editor UI must expose stable field readiness diagnostics"
);
assert(
  app.includes('data-asset-editor-field-readiness="true"'),
  "Local asset editor UI must expose a stable visible field readiness summary"
);
assert(
  app.includes("data-asset-editor-field-readiness-filled-count"),
  "Local asset editor field readiness summary must expose filled count diagnostics"
);
assert(
  app.includes("data-asset-editor-field-readiness-empty-count"),
  "Local asset editor field readiness summary must expose empty count diagnostics"
);
assert(
  app.includes("data-asset-editor-field-readiness-total-count"),
  "Local asset editor field readiness summary must expose total count diagnostics"
);
assert(
  app.includes("data-asset-editor-field-readiness-counts-reconciled"),
  "Local asset editor field readiness summary must expose count reconciliation diagnostics"
);
assert(app.includes('"all_fields_filled"'), "Local asset editor UI must expose a complete field readiness state");
assert(app.includes('"incomplete_fields"'), "Local asset editor UI must expose an incomplete field readiness state");
assert(app.includes('data-performance-metric="snapshot_id"'), "Performance snapshot UI must expose stable snapshot id diagnostics");
assert(app.includes('data-performance-metric="source"'), "Performance snapshot UI must expose stable source diagnostics");
assert(
  app.includes('data-performance-metric="evidence_count"'),
  "Performance snapshot UI must expose stable evidence count diagnostics"
);
assert(
  app.includes('data-performance-metric="query_count"'),
  "Performance snapshot UI must expose stable query count diagnostics"
);
assert(
  app.includes('data-performance-metric="page_count"'),
  "Performance snapshot UI must expose stable page count diagnostics"
);
assert(
  app.includes("data-performance-comparison-state"),
  "Performance comparison UI must expose stable local-only state diagnostics"
);
assert(app.includes("asset-performance-panel"), "Asset performance UI must have a stable read-only panel class");
assert(
  app.includes("data-asset-performance-blocked-capability-count"),
  "Asset performance UI must expose stable blocked capability count diagnostics"
);
assert(
  app.includes('data-asset-performance-metric="snapshot_id"'),
  "Asset performance UI must expose stable snapshot id diagnostics"
);
assert(app.includes('data-asset-performance-metric="source"'), "Asset performance UI must expose stable source diagnostics");
assert(
  app.includes('data-asset-performance-metric="evidence_count"'),
  "Asset performance UI must expose stable evidence count diagnostics"
);
assert(
  app.includes('data-asset-performance-metric="query_count"'),
  "Asset performance UI must expose stable query count diagnostics"
);
assert(
  app.includes('data-asset-performance-metric="page_count"'),
  "Asset performance UI must expose stable page count diagnostics"
);
assert(
  app.includes("asset-performance-comparison-panel"),
  "Asset performance UI must expose a stable asset before/after comparison panel class"
);
assert(
  app.includes("data-asset-performance-comparison-blocked-capability-count"),
  "Asset performance comparison UI must expose stable blocked capability count diagnostics"
);
assert(
  app.includes("data-asset-performance-comparison-snapshot-count"),
  "Asset performance comparison UI must expose stable snapshot count diagnostics"
);
assert(
  app.includes('data-asset-performance-comparison-metric="source"'),
  "Asset performance comparison UI must expose stable baseline source diagnostics"
);
assert(
  app.includes('data-asset-performance-comparison-metric="baseline_snapshot_id"'),
  "Asset performance comparison UI must expose stable baseline snapshot id diagnostics"
);
assert(
  app.includes('data-asset-performance-comparison-metric="evidence_count"'),
  "Asset performance comparison UI must expose stable evidence count diagnostics"
);
assert(
  app.includes("data-asset-performance-comparison-state"),
  "Asset performance comparison UI must expose stable local-only state diagnostics"
);
assert(app.includes("Local imported GSC only"), "Performance snapshot UI must expose local-only safety copy");
assert(app.includes("Catalog products"), "Imported preview UI must distinguish imported catalog product count from graph matches");
assert(app.includes("Catalog pages"), "Imported preview UI must distinguish imported catalog page count from graph matches");
assert(app.includes("Query rows"), "Imported preview UI must show imported query row count");
assert(app.includes("importedPreviews.queries.length"), "Imported query row count metric must use safe imported query row previews");
assert(app.includes("importedPreviews.products.length"), "Imported product count metric must use safe imported product previews");
assert(app.includes("importedPreviews.pages.length"), "Imported page count metric must use safe imported page previews");
assert(app.includes("productOverflowCount"), "Imported product preview UI must disclose hidden product rows when the preview is truncated");
assert(app.includes("pageOverflowCount"), "Imported page preview UI must disclose hidden page rows when the preview is truncated");
assert(app.includes("more catalog products"), "Imported product overflow copy must stay read-only and non-actionable");
assert(app.includes("more catalog pages"), "Imported page overflow copy must stay read-only and non-actionable");
assert(app.includes("clusterOverflowCount"), "Imported cluster preview UI must disclose hidden query cluster rows when truncated");
assert(app.includes("opportunityOverflowCount"), "Imported opportunity preview UI must disclose hidden opportunity rows when truncated");
assert(app.includes("taskOverflowCount"), "Imported task preview UI must disclose hidden task rows when truncated");
assert(app.includes("queryRowOverflowCount"), "Imported query row preview UI must disclose hidden query rows when truncated");
assert(app.includes("more query clusters"), "Imported cluster overflow copy must stay read-only and non-actionable");
assert(app.includes("more query rows"), "Imported query row overflow copy must stay read-only and non-actionable");
assert(app.includes("more opportunity previews"), "Imported opportunity overflow copy must stay read-only and non-actionable");
assert(app.includes("more task previews"), "Imported task overflow copy must stay read-only and non-actionable");
assert(app.includes("product.detail"), "Imported product preview UI must render safe product catalog detail");
assert(app.includes("page.detail"), "Imported page preview UI must render safe page catalog detail");
assert(app.includes("product.source"), "Imported product preview UI must render the safe product source label");
assert(app.includes("page.source"), "Imported page preview UI must render the safe page source label");
assert(app.includes("product.displayHref"), "Imported product preview UI must render the sanitized display URL");
assert(app.includes("page.displayHref"), "Imported page preview UI must render the sanitized display URL");
assert(app.includes("queryRow.displayCtr"), "Imported query row preview UI must render display-safe CTR text");
assert(app.includes("queryRow.displayClicks"), "Imported query row preview UI must render display-safe click count text");
assert(app.includes("queryRow.displayEvidenceSummary"), "Imported query row preview UI must render display-safe evidence summary text");
assert(app.includes("queryRow.displayImpressions"), "Imported query row preview UI must render display-safe impression count text");
assert(app.includes("queryRow.displayPosition"), "Imported query row preview UI must render display-safe average position text");
assert(app.includes("queryRow.displayPage"), "Imported query row preview UI must render the display-safe page label");
assert(app.includes("page {queryRow.displayPage}"), "Imported query row preview UI must label display-safe page references");
assert(app.includes("queryRow.source"), "Imported query row preview UI must render the safe query row source label");
assert(app.includes("queryRow.window"), "Imported query row preview UI must render the safe query row window label");
assert(!app.includes("product.href ? <p"), "Imported product preview UI must not render raw href text directly");
assert(!app.includes("page.href ? <p"), "Imported page preview UI must not render raw href text directly");
assert(!app.includes("product.sku"), "Imported product preview UI must not render raw product SKU DTO fields directly");
assert(!app.includes("product.categories"), "Imported product preview UI must not render raw product category DTO fields directly");
assert(!app.includes("page.url"), "Imported page preview UI must not render raw page URL DTO fields directly");
assert(adapter.includes("mapApiImportedQueryClusterResponseToPreview"), "Adapter must expose imported query cluster detail DTO conversion");
assert(app.includes("mapApiImportedOpportunitiesToOpportunities("), "App must map imported opportunities through the safe adapter");
assert(app.includes("mapApiImportedTasksToTasks("), "App must map imported task previews through the safe adapter");
assert(adapter.includes("mapApiImportedOpportunityResponseToOpportunity"), "Adapter must expose imported opportunity detail DTO conversion");
assert(adapter.includes("mapApiImportedTaskResponseToTask"), "Adapter must expose imported task detail DTO conversion");
assert(app.includes("integrations={board.integrations}"), "Safety page must render board integrations, including API-backed integrations");
assert(app.includes("ImportedPreviewPanel"), "Board must expose an imported preview panel for API-backed imported data");
assert(app.includes("read-only imported previews"), "Imported preview UI must state that previews are read-only");
assert(app.includes("query_rows_unavailable"), "Imported preview UI must preserve a query row partial-failure warning");
assert(app.includes("Query rows unavailable"), "Imported preview UI must explain when query row reads are unavailable");
assert(app.includes("updateTaskStatus("), "App must call the demo task status API when API-backed board data is available");
assert(app.includes('boardDataState.source === "api"'), "App must gate task status API mutations to the connected API board state");
assert(app.includes("applyApiTaskStatusToBoard"), "App must apply successful API task status responses to the board state");
assert(app.includes("applyLocalTaskStatus(taskId, status)"), "App must fall back to local task status state when the API mutation is unavailable");

console.log("API adapter contract passed");
