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
