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

const defaultApiBaseUrl = "http://localhost:8000";

export function getApiBaseUrl() {
  const meta = import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } };
  return meta.env?.VITE_API_BASE_URL ?? defaultApiBaseUrl;
}

export function isApiBoardEnabled() {
  const meta = import.meta as ImportMeta & {
    env?: {
      VITE_API_BASE_URL?: string;
      VITE_USE_API_BOARD?: string;
    };
  };
  return meta.env?.VITE_USE_API_BOARD === "true" || Boolean(meta.env?.VITE_API_BASE_URL);
}

export async function getOpportunities(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiOpportunitiesResponse>(`${apiBaseUrl}/api/stores/${storeId}/opportunities`);
}

export async function getTasks(storeId: string, apiBaseUrl = getApiBaseUrl()) {
  return fetchJson<ApiTasksResponse>(`${apiBaseUrl}/api/stores/${storeId}/tasks`);
}

async function fetchJson<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TrafScope API request failed: ${response.status}`);
  }
  return response.json() as Promise<TResponse>;
}
