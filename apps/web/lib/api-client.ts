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
