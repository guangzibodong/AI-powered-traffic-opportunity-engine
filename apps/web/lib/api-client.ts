export type ApiEvidence = {
  entityRefs?: Array<{ id: string; type: string }>;
  metrics?: Record<string, unknown>;
  text: string;
  type: string;
};

export type ApiOpportunity = {
  confidence: number;
  dedupe_key?: string | null;
  evidence: ApiEvidence[];
  generated_by_sync_run_id?: string | null;
  id: string;
  opportunity_type: string;
  recommended_task_type: string;
  rule_id: string;
  rule_version: number;
  score_components: Record<string, number>;
  status: string;
  summary: string;
  title: string;
  trafscore: number;
};

export type ApiTask = {
  action_plan: {
    acceptance_criteria?: string[];
    automation_level?: string;
    confidence?: number;
    source_summary?: string;
    steps?: string[];
    task_category?: string;
    task_title?: string;
  };
  automation_level: string;
  category: string;
  evidence: ApiEvidence[];
  id: string;
  opportunity_id: string;
  priority_score: number;
  source_opportunity?: {
    dedupe_key?: string;
    rule_id?: string;
    rule_version?: number;
  };
  status: string;
  title: string;
};

export type ApiVisibleTaskStatus = "new" | "approved" | "rejected" | "snoozed";

export type ApiPlanningRun = {
  generated_tasks: number;
  run_id: string;
  state: string;
};

export type ApiOpportunitiesResponse = {
  mode: "demo_decisioning";
  opportunities: ApiOpportunity[];
  planning_run: ApiPlanningRun;
  store_id: string;
};

export type ApiTasksResponse = {
  mode: "demo_decisioning";
  planning_run: ApiPlanningRun;
  store_id: string;
  tasks: ApiTask[];
};

export type ApiTaskResponse = {
  store_id: string;
  task: ApiTask;
};

export type ApiIntegrationStatus = {
  blocked_capabilities?: string[];
  connection_mode?: string;
  external_write_allowed?: boolean;
  key: string;
  last_sync_run_id?: string | null;
  name: string;
  safe_operations?: string[];
  status: string;
};

export type ApiIntegrationsResponse = {
  integrations: ApiIntegrationStatus[];
  mode: "integration_status";
  store_id: string;
  summary?: Record<string, number>;
};

export type ApiSyncRunStep = {
  blocked_capabilities?: string[];
  external_write_allowed?: boolean;
  provider: string;
  status: string;
  step_name: string;
};

export type ApiSyncRun = {
  blocked_capabilities?: string[];
  execution_mode?: string;
  id: string;
  requested_by?: string;
  run_type?: string;
  status: string;
  steps?: ApiSyncRunStep[];
};

export type ApiSyncRunsResponse = {
  mode: "sync_run_tracking";
  store_id: string;
  summary?: Record<string, number>;
  sync_runs: ApiSyncRun[];
};

export type ApiAuditLog = {
  action: string;
  actor?: string;
  external_write_allowed?: boolean;
  id: string;
  metadata?: Record<string, unknown>;
  safety_scope?: string;
  target_id: string;
  target_type: string;
};

export type ApiAuditLogsResponse = {
  audit_logs: ApiAuditLog[];
  mode: "audit_logs";
  store_id: string;
  summary?: Record<string, number>;
};

export type ApiImportedQueryCluster = {
  clicks: number;
  cluster_key: string;
  ctr: number;
  impressions: number;
  position: number;
  primary_query: string;
  query_count: number;
  queries?: string[];
  row_ids?: string[];
  top_pages?: string[];
};

export type ApiImportedQueryRow = {
  clicks: number;
  ctr: number;
  id: string;
  impressions: number;
  page: string;
  position: number;
  query: string;
  source?: string;
  store_id?: string;
  window?: string;
};

export type ApiImportedQueriesResponse = {
  mode: "csv_import";
  queries: ApiImportedQueryRow[];
  store_id: string;
};

export type ApiImportedQueryResponse = {
  mode: "csv_import";
  query: ApiImportedQueryRow;
  store_id: string;
};

export type ApiImportedGraphProduct = {
  categories?: string[];
  external_id?: string;
  in_stock?: boolean;
  match_score?: number;
  match_terms?: string[];
  name: string;
  product_id: string;
  sku?: string | null;
  status?: string;
};

export type ApiImportedGraphPage = {
  external_id?: string;
  indexable?: boolean;
  match_score?: number;
  match_terms?: string[];
  match_type?: string;
  page_id: string;
  page_type?: string;
  status?: string;
  title: string;
  url: string;
};

export type ApiImportedGraphQueryCluster = ApiImportedQueryCluster & {
  best_existing_page?: ApiImportedGraphPage | null;
  matched_pages?: ApiImportedGraphPage[];
  matched_products?: ApiImportedGraphProduct[];
};

export type ApiImportedGraphResponse = {
  mode: "imported_graph";
  query_clusters: ApiImportedGraphQueryCluster[];
  store_id: string;
  summary?: {
    page_matches?: number;
    product_matches?: number;
    query_clusters?: number;
  };
};

export type ApiImportedProduct = {
  attributes?: Record<string, string[]>;
  categories?: string[];
  currency?: string | null;
  external_id: string;
  id: string;
  images?: string[];
  in_stock?: boolean;
  name: string;
  permalink?: string | null;
  price?: number | null;
  regular_price?: number | null;
  short_description?: string;
  sku?: string | null;
  slug?: string | null;
  source?: string;
  status?: string;
  stock_status?: string;
  store_id?: string;
};

export type ApiImportedProductsResponse = {
  mode: "woocommerce_import";
  products: ApiImportedProduct[];
  store_id: string;
};

export type ApiImportedProductResponse = {
  mode: "woocommerce_import";
  product: ApiImportedProduct;
  store_id: string;
};

export type ApiImportedPage = {
  content_hash?: string;
  excerpt?: string;
  external_id: string;
  id: string;
  indexable?: boolean;
  page_type?: string;
  seo?: Record<string, unknown>;
  slug?: string | null;
  source?: string;
  status?: string;
  store_id?: string;
  title: string;
  url: string;
};

export type ApiImportedPagesResponse = {
  mode: "wordpress_import";
  pages: ApiImportedPage[];
  store_id: string;
};

export type ApiImportedPageResponse = {
  mode: "wordpress_import";
  page: ApiImportedPage;
  store_id: string;
};

export type ApiImportedQueryClustersResponse = {
  mode: "csv_import";
  query_clusters: ApiImportedQueryCluster[];
  store_id: string;
};

export type ApiImportedQueryClusterResponse = {
  mode: "csv_import";
  query_cluster: ApiImportedQueryCluster;
  store_id: string;
};

export type ApiImportedOpportunity = ApiOpportunity & {
  related_page?: unknown;
  related_products?: unknown[];
  source_cluster?: ApiImportedQueryCluster;
};

export type ApiImportedOpportunitiesResponse = {
  mode: "imported_opportunities";
  opportunities: ApiImportedOpportunity[];
  store_id: string;
  summary?: Record<string, unknown>;
};

export type ApiImportedOpportunityResponse = {
  mode: "imported_opportunities";
  opportunity: ApiImportedOpportunity;
  store_id: string;
};

export type ApiImportedTask = ApiTask & {
  related_page?: unknown;
  related_products?: unknown[];
  source_opportunity?: {
    dedupe_key?: string;
    rule_id?: string;
    rule_version?: number;
  };
};

export type ApiImportedTasksResponse = {
  mode: "imported_task_previews";
  store_id: string;
  summary?: Record<string, unknown>;
  tasks: ApiImportedTask[];
};

export type ApiImportedTaskResponse = {
  mode: "imported_task_previews";
  store_id: string;
  task: ApiImportedTask;
};

export type ApiAssetDraft = {
  asset_type: string;
  blocked_capabilities?: string[];
  claim_ledger?: unknown[];
  content_blocks?: unknown[];
  external_write_allowed?: boolean;
  id: string;
  qa_checks?: unknown[];
  review_state: string;
  source_task_id: string;
  title: string;
};

export type ApiAssetWorkspaceResponse = {
  assets: ApiAssetDraft[];
  blocked_capabilities?: string[];
  external_write_allowed?: boolean;
  mode: "asset_draft_workspace";
  store_id: string;
  summary?: Record<string, number>;
};

export type ApiAssetResponse = {
  asset: ApiAssetDraft;
  mode: "asset_draft_workspace";
  store_id: string;
};

export type ApiPerformanceSnapshot = {
  asset_id?: string;
  clicks?: number;
  ctr?: number;
  external_write_allowed?: boolean;
  id: string;
  impressions?: number;
  match_scope?: string;
  page_count?: number;
  position?: number;
  query_count?: number;
  row_ids?: string[];
  source?: string;
  window?: string;
};

export type ApiPerformanceSnapshotsResponse = {
  blocked_capabilities?: string[];
  external_write_allowed?: boolean;
  mode: "performance_snapshots";
  safety_scope?: string;
  snapshots: ApiPerformanceSnapshot[];
  store_id: string;
  summary?: Record<string, number>;
};

export type ApiAssetPerformanceSnapshotsResponse = {
  asset_id: string;
  asset_title?: string;
  blocked_capabilities?: string[];
  external_write_allowed?: boolean;
  match_scope?: string;
  mode: "asset_performance_snapshots";
  safety_scope?: string;
  snapshots: ApiPerformanceSnapshot[];
  store_id: string;
  summary?: Record<string, number>;
};

export type ApiPerformanceRefreshPreviewResponse = {
  blocked_capabilities?: string[];
  external_write_allowed?: boolean;
  mode: "performance_refresh_preview";
  safety_scope?: string;
  snapshot_count?: number;
  source?: string;
  status?: string;
  store_id: string;
  summary?: Record<string, number>;
  would_call_external_gsc?: boolean;
  would_create_wordpress_draft?: boolean;
  would_update_wordpress_page?: boolean;
  would_write_woocommerce?: boolean;
};

export type ApiAssetContentBlockUpdate = {
  body?: string;
  heading?: string;
  items?: string[];
  type: "answer_summary" | "section" | "faq" | "internal_link_suggestions" | "metadata_only" | "product_grid_notes";
};

export type ApiAssetFaqItemUpdate = {
  answer: string;
  question: string;
};

export type ApiAssetUpdatePayload = {
  content_blocks?: ApiAssetContentBlockUpdate[];
  editor_note?: string;
  faq_items?: ApiAssetFaqItemUpdate[];
  internal_links?: string[];
  meta_description?: string;
  meta_title?: string;
  schema_json?: Record<string, unknown>;
  slug?: string;
  title?: string;
};

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_USE_API_BOARD?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const defaultApiBaseUrl = "http://localhost:8000";

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl;
}

export function isApiBoardEnabled() {
  return import.meta.env.VITE_USE_API_BOARD === "true" || Boolean(import.meta.env.VITE_API_BASE_URL);
}

export async function getOpportunities(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiOpportunitiesResponse>(`${storeApiPath(apiBaseUrl, storeId)}/opportunities`);
}

export async function getTasks(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiTasksResponse>(`${storeApiPath(apiBaseUrl, storeId)}/tasks`);
}

export async function getIntegrations(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiIntegrationsResponse>(`${storeApiPath(apiBaseUrl, storeId)}/integrations`);
}

export async function getSyncRuns(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiSyncRunsResponse>(`${storeApiPath(apiBaseUrl, storeId)}/sync-runs`);
}

export async function getAuditLogs(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiAuditLogsResponse>(`${storeApiPath(apiBaseUrl, storeId)}/audit-logs`);
}

export async function getImportedGraph(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiImportedGraphResponse>(`${storeApiPath(apiBaseUrl, storeId)}/imported-graph`);
}

export async function getImportedQueries(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiImportedQueriesResponse>(`${storeApiPath(apiBaseUrl, storeId)}/queries`);
}

export async function getImportedQuery(storeId: string, queryId: string, apiBaseUrl = getApiBaseUrl()) {
  const encodedQueryId = encodeURIComponent(queryId);
  return fetchJson<ApiImportedQueryResponse>(`${storeApiPath(apiBaseUrl, storeId)}/queries/${encodedQueryId}`);
}

export async function getImportedProducts(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiImportedProductsResponse>(`${storeApiPath(apiBaseUrl, storeId)}/products`);
}

export async function getImportedProduct(storeId: string, productId: string, apiBaseUrl = getApiBaseUrl()) {
  const encodedProductId = encodeURIComponent(productId);
  return fetchJson<ApiImportedProductResponse>(`${storeApiPath(apiBaseUrl, storeId)}/products/${encodedProductId}`);
}

export async function getImportedPages(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiImportedPagesResponse>(`${storeApiPath(apiBaseUrl, storeId)}/pages`);
}

export async function getImportedPage(storeId: string, pageId: string, apiBaseUrl = getApiBaseUrl()) {
  const encodedPageId = encodeURIComponent(pageId);
  return fetchJson<ApiImportedPageResponse>(`${storeApiPath(apiBaseUrl, storeId)}/pages/${encodedPageId}`);
}

export async function getImportedQueryClusters(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiImportedQueryClustersResponse>(`${storeApiPath(apiBaseUrl, storeId)}/query-clusters`);
}

export async function getImportedQueryCluster(storeId: string, clusterKey: string, apiBaseUrl = getApiBaseUrl()) {
  const encodedClusterKey = encodeURIComponent(clusterKey);
  return fetchJson<ApiImportedQueryClusterResponse>(
    `${storeApiPath(apiBaseUrl, storeId)}/query-clusters/${encodedClusterKey}`
  );
}

export async function getImportedOpportunities(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiImportedOpportunitiesResponse>(`${storeApiPath(apiBaseUrl, storeId)}/imported-opportunities`);
}

export async function getImportedOpportunity(storeId: string, opportunityId: string, apiBaseUrl = getApiBaseUrl()) {
  const encodedOpportunityId = encodeURIComponent(opportunityId);
  return fetchJson<ApiImportedOpportunityResponse>(
    `${storeApiPath(apiBaseUrl, storeId)}/imported-opportunities/${encodedOpportunityId}`
  );
}

export async function getImportedTasks(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiImportedTasksResponse>(`${storeApiPath(apiBaseUrl, storeId)}/imported-tasks`);
}

export async function getImportedTask(storeId: string, taskId: string, apiBaseUrl = getApiBaseUrl()) {
  const encodedTaskId = encodeURIComponent(taskId);
  return fetchJson<ApiImportedTaskResponse>(`${storeApiPath(apiBaseUrl, storeId)}/imported-tasks/${encodedTaskId}`);
}

export async function getAssets(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiAssetWorkspaceResponse>(`${storeApiPath(apiBaseUrl, storeId)}/assets`);
}

export async function getPerformanceSnapshots(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiPerformanceSnapshotsResponse>(`${storeApiPath(apiBaseUrl, storeId)}/performance`);
}

export async function getAssetPerformanceSnapshots(storeId: string, assetId: string, apiBaseUrl = getApiBaseUrl()) {
  const encodedAssetId = encodeURIComponent(assetId);
  return fetchJson<ApiAssetPerformanceSnapshotsResponse>(
    `${storeApiPath(apiBaseUrl, storeId)}/assets/${encodedAssetId}/performance`
  );
}

export async function previewPerformanceRefresh(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiPerformanceRefreshPreviewResponse>(`${storeApiPath(apiBaseUrl, storeId)}/performance/refresh`, {
    method: "POST"
  });
}

export async function getAsset(storeId: string, assetId: string, apiBaseUrl = getApiBaseUrl()) {
  const encodedAssetId = encodeURIComponent(assetId);
  return fetchJson<ApiAssetResponse>(`${storeApiPath(apiBaseUrl, storeId)}/assets/${encodedAssetId}`);
}

export async function createAssetFromTask(storeId: string, taskId: string, apiBaseUrl = getApiBaseUrl()) {
  const encodedTaskId = encodeURIComponent(taskId);
  return fetchJson<ApiAssetResponse>(`${storeApiPath(apiBaseUrl, storeId)}/assets/from-task/${encodedTaskId}`, {
    method: "POST"
  });
}

export async function updateAsset(
  storeId: string,
  assetId: string,
  payload: ApiAssetUpdatePayload,
  apiBaseUrl = getApiBaseUrl()
) {
  const encodedAssetId = encodeURIComponent(assetId);
  return fetchJson<ApiAssetResponse>(`${storeApiPath(apiBaseUrl, storeId)}/assets/${encodedAssetId}`, {
    body: JSON.stringify(sanitizeAssetUpdatePayload(payload)),
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
}

export async function updateTaskStatus(
  storeId: string,
  taskId: string,
  status: ApiVisibleTaskStatus,
  apiBaseUrl = getApiBaseUrl()
) {
  const encodedTaskId = encodeURIComponent(taskId);
  return fetchJson<ApiTaskResponse>(`${storeApiPath(apiBaseUrl, storeId)}/tasks/${encodedTaskId}`, {
    body: JSON.stringify({ status }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
}

function storeApiPath(apiBaseUrl: string, storeId: string) {
  return `${apiBaseUrl}/api/stores/${encodeURIComponent(storeId)}`;
}

async function fetchJson<TResponse>(url: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`TrafScope API request failed: ${response.status}`);
  }
  return response.json() as Promise<TResponse>;
}

function sanitizeAssetUpdatePayload(payload: ApiAssetUpdatePayload): ApiAssetUpdatePayload {
  const safePayload: ApiAssetUpdatePayload = {};
  const unsafePayload = payload as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(unsafePayload, "title")) safePayload.title = payload.title;
  if (Object.prototype.hasOwnProperty.call(unsafePayload, "slug")) safePayload.slug = payload.slug;
  if (Object.prototype.hasOwnProperty.call(unsafePayload, "meta_title")) safePayload.meta_title = payload.meta_title;
  if (Object.prototype.hasOwnProperty.call(unsafePayload, "meta_description")) {
    safePayload.meta_description = payload.meta_description;
  }
  if (Object.prototype.hasOwnProperty.call(unsafePayload, "content_blocks")) {
    safePayload.content_blocks = sanitizeAssetContentBlocks(payload.content_blocks);
  }
  if (Object.prototype.hasOwnProperty.call(unsafePayload, "faq_items")) {
    safePayload.faq_items = sanitizeAssetFaqItems(payload.faq_items);
  }
  if (Object.prototype.hasOwnProperty.call(unsafePayload, "schema_json")) safePayload.schema_json = payload.schema_json;
  if (Object.prototype.hasOwnProperty.call(unsafePayload, "internal_links")) safePayload.internal_links = payload.internal_links;
  if (Object.prototype.hasOwnProperty.call(unsafePayload, "editor_note")) safePayload.editor_note = payload.editor_note;

  return safePayload;
}

function sanitizeAssetContentBlocks(
  contentBlocks: ApiAssetUpdatePayload["content_blocks"]
): ApiAssetUpdatePayload["content_blocks"] {
  return contentBlocks?.map((block) => {
    const safeBlock: ApiAssetContentBlockUpdate = { type: block.type };
    if (Object.prototype.hasOwnProperty.call(block, "heading")) safeBlock.heading = block.heading;
    if (Object.prototype.hasOwnProperty.call(block, "body")) safeBlock.body = block.body;
    if (Object.prototype.hasOwnProperty.call(block, "items")) safeBlock.items = block.items;
    return safeBlock;
  });
}

function sanitizeAssetFaqItems(faqItems: ApiAssetUpdatePayload["faq_items"]): ApiAssetUpdatePayload["faq_items"] {
  return faqItems?.map((item) => ({
    answer: item.answer,
    question: item.question
  }));
}
