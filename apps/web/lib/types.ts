export type Locale = "zh" | "en";

export type VisibleTaskStatus = "new" | "approved" | "rejected" | "snoozed";

export type TaskStatus = VisibleTaskStatus;

export type AutomationLevel = "recommend_only" | "draft_assist_future";

export type TaskCategory = "collection_page" | "ctr_refresh" | "product_seo" | "ranking_push";

export type SprintOneRuleId = "collection_page_gap" | "high_impression_low_ctr" | "product_seo" | "ranking_push";

export type EvidenceType = "search" | "commerce" | "page_graph" | "rule" | "audit";

export type EvidenceRow = {
  type: EvidenceType;
  source: string;
  entity: string;
  metric: string;
  window: string;
  reason: string;
  confidence?: number;
};

export type ScoreComponent = {
  label: string;
  value: number;
  weight?: number;
};

export type RuleTrace = {
  ruleId: SprintOneRuleId;
  version: string;
  dedupeKey: string;
  runId: string;
  scoring: "deterministic_rules";
};

export type RelatedEntity = {
  kind: "query" | "product" | "page";
  title: string;
  detail: string;
};

export type Task = {
  id: string;
  title: string;
  category: TaskCategory;
  automationLevel: AutomationLevel;
  status: VisibleTaskStatus;
  trafscore: number;
  ruleId: SprintOneRuleId;
  evidence: EvidenceRow[];
  objects: {
    queries: number;
    products: number;
    pages: number;
  };
  actionLabel: string;
};

export type TaskDetailViewModel = Task & {
  subtitle: string;
  actionPlan: Array<{
    title: string;
    description: string;
  }>;
  acceptanceCriteria: string[];
  scoreComponents: ScoreComponent[];
  ruleTrace: RuleTrace;
  relatedEntities: RelatedEntity[];
};

export type Opportunity = {
  id: string;
  title: string;
  opportunityType: SprintOneRuleId;
  summary: string;
  trafscore: number;
  confidence: number;
  ruleTrace: RuleTrace;
  scoreComponents: ScoreComponent[];
  relatedEntities: RelatedEntity[];
};

export type OpportunityDetailViewModel = Opportunity & {
  whyNow: string[];
  evidence: EvidenceRow[];
  falsePositiveControls: Array<{
    title: string;
    description: string;
  }>;
  recommendedTask: Pick<Task, "id" | "title" | "trafscore" | "ruleId">;
};

export type Integration = {
  key: "woocommerce" | "wordpress" | "gsc";
  name: string;
  description: string;
  status: "connected" | "pending" | "not_connected";
};

export type IntegrationHealth = {
  name: string;
  mode: string;
  permissionBoundary: string;
  lastSync: string;
  freshness: "fresh" | "degraded" | "stale" | "failed";
  errors: string;
  action: string;
};

export type SyncRunPreview = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  executionMode: string;
  providerSteps: string[];
  blockedCapabilities: string[];
  externalWriteAllowed: false;
};

export type AuditLogPreview = {
  id: string;
  action: string;
  actor: string;
  target: string;
  safetyScope: string;
  externalWriteAllowed: false;
};

export type ImportedQueryClusterPreview = {
  id: string;
  primaryQuery: string;
  queryCount: number;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  topPages: string[];
  evidence: EvidenceRow[];
};

export type ImportedQueryRowPreview = {
  clicks: number;
  ctr: number;
  displayClicks: string;
  displayCtr: string;
  displayEvidenceSummary: string;
  displayImpressions: string;
  displayPage: string;
  displayPosition: string;
  evidence: EvidenceRow[];
  id: string;
  impressions: number;
  page: string;
  position: number;
  query: string;
  source: string;
  window: string;
};

export type ImportedCatalogPreview = {
  detail: string;
  displayHref?: string;
  href?: string;
  id: string;
  kind: "product" | "page";
  source: "WooCommerce" | "WordPress";
  title: string;
};

export type PlanningRunViewModel = {
  runId: string;
  lastSuccessfulAt: string;
  currentState: "ready" | "running" | "failed";
  generatedTasks: number;
};

export type BoardViewModel = {
  storeName: string;
  fixtureLabel: string;
  planningRun: PlanningRunViewModel;
  metrics: {
    priorityAverage: number;
    queryGaps: number;
    productsReady: number;
    trackedAssets: number;
  };
  tasks: Task[];
  opportunities: Opportunity[];
  integrations: IntegrationHealth[];
};
