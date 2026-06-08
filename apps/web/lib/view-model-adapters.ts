import type {
  BoardViewModel,
  EvidenceRow,
  IntegrationHealth,
  Opportunity,
  ScoreComponent,
  SprintOneRuleId,
  Task,
  TaskCategory,
  VisibleTaskStatus
} from "./types";
import type { ApiEvidence, ApiOpportunitiesResponse, ApiOpportunity, ApiTask, ApiTasksResponse } from "./api-client";

const sprintOneRules = new Set<SprintOneRuleId>([
  "collection_page_gap",
  "high_impression_low_ctr",
  "ranking_push"
]);

const visibleTaskStatuses = new Set<VisibleTaskStatus>(["new", "approved", "rejected", "snoozed"]);

export function mapApiPlanningToBoard(
  tasksResponse: ApiTasksResponse,
  opportunitiesResponse: ApiOpportunitiesResponse,
  integrations: IntegrationHealth[]
): BoardViewModel {
  const tasks = tasksResponse.tasks.map(mapApiTaskToTask);
  const opportunities = opportunitiesResponse.opportunities.map(mapApiOpportunityToOpportunity);

  return {
    fixtureLabel: `${tasksResponse.mode} / read-only`,
    integrations,
    metrics: {
      priorityAverage: average(tasks.map((task) => task.trafscore)),
      productsReady: countRelatedProducts(tasks),
      queryGaps: opportunities.filter((opportunity) => opportunity.opportunityType === "collection_page_gap").length,
      trackedAssets: 0
    },
    opportunities,
    planningRun: {
      currentState: tasksResponse.planning_run.state === "ready" ? "ready" : "running",
      generatedTasks: tasksResponse.planning_run.generated_tasks,
      lastSuccessfulAt: "demo",
      runId: tasksResponse.planning_run.run_id
    },
    storeName: tasksResponse.store_id,
    tasks
  };
}

export function mapApiTaskToTask(task: ApiTask): Task {
  return {
    actionLabel: "Review",
    automationLevel: task.automation_level === "recommend_only" ? "recommend_only" : "draft_assist_future",
    category: mapTaskCategory(task.category),
    evidence: task.evidence.map(mapApiEvidenceToEvidenceRow),
    id: task.id,
    objects: countObjects(task.evidence),
    ruleId: inferRuleId(task.opportunity_id, task.evidence),
    status: mapVisibleTaskStatus(task.status),
    title: task.title,
    trafscore: task.priority_score
  };
}

export function mapApiOpportunityToOpportunity(opportunity: ApiOpportunity): Opportunity {
  return {
    confidence: opportunity.confidence,
    id: opportunity.id,
    opportunityType: mapRuleId(opportunity.rule_id),
    relatedEntities: [],
    ruleTrace: {
      dedupeKey: opportunity.dedupe_key ?? opportunity.id,
      ruleId: mapRuleId(opportunity.rule_id),
      runId: opportunity.generated_by_sync_run_id ?? "demo",
      scoring: "deterministic_rules",
      version: `v${opportunity.rule_version}`
    },
    scoreComponents: mapScoreComponents(opportunity.score_components),
    summary: opportunity.summary,
    title: opportunity.title,
    trafscore: opportunity.trafscore
  };
}

function mapApiEvidenceToEvidenceRow(evidence: ApiEvidence): EvidenceRow {
  return {
    confidence: readNumberMetric(evidence, "confidence"),
    entity: readStringMetric(evidence, "query") ?? readEntityRef(evidence) ?? evidence.type,
    metric: evidence.text,
    reason: evidence.text,
    source: mapEvidenceSource(evidence),
    type: mapEvidenceType(evidence.type),
    window: "demo"
  };
}

function mapScoreComponents(components: Record<string, number>): ScoreComponent[] {
  return Object.entries(components).map(([label, value]) => ({ label, value }));
}

function mapVisibleTaskStatus(status: string): VisibleTaskStatus {
  return visibleTaskStatuses.has(status as VisibleTaskStatus) ? (status as VisibleTaskStatus) : "new";
}

function mapRuleId(ruleId: string): SprintOneRuleId {
  return sprintOneRules.has(ruleId as SprintOneRuleId) ? (ruleId as SprintOneRuleId) : "collection_page_gap";
}

function inferRuleId(opportunityId: string, evidence: ApiEvidence[]): SprintOneRuleId {
  if (evidence.some((item) => item.type === "gsc_ctr")) return "high_impression_low_ctr";
  if (evidence.some((item) => item.type === "gsc_position")) return "ranking_push";
  if (opportunityId.includes("ranking")) return "ranking_push";
  return "collection_page_gap";
}

function mapTaskCategory(category: string): TaskCategory {
  if (category === "ctr_refresh" || category === "ranking_push" || category === "collection_page") {
    return category;
  }
  return "collection_page";
}

function mapEvidenceType(type: string): EvidenceRow["type"] {
  if (type === "product_fit") return "commerce";
  if (type === "page_gap" || type === "existing_page") return "page_graph";
  if (type.startsWith("gsc") || type === "query_cluster") return "search";
  return "rule";
}

function mapEvidenceSource(evidence: ApiEvidence) {
  if (evidence.type === "product_fit") return "WooCommerce";
  if (evidence.type === "page_gap" || evidence.type === "existing_page") return "WordPress";
  if (evidence.type.startsWith("gsc") || evidence.type === "query_cluster") return "GSC";
  return "TrafScope";
}

function countObjects(evidence: ApiEvidence[]): Task["objects"] {
  const entityRefs = evidence.flatMap((item) => item.entityRefs ?? []);
  return {
    pages: entityRefs.filter((item) => item.type === "page").length,
    products: entityRefs.filter((item) => item.type === "product").length,
    queries: Math.max(1, evidence.filter((item) => mapEvidenceType(item.type) === "search").length)
  };
}

function countRelatedProducts(tasks: Task[]) {
  return tasks.reduce((total, task) => total + task.objects.products, 0);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function readEntityRef(evidence: ApiEvidence) {
  const entityRef = evidence.entityRefs?.[0];
  return entityRef ? `${entityRef.type}:${entityRef.id}` : undefined;
}

function readStringMetric(evidence: ApiEvidence, key: string) {
  const value = evidence.metrics?.[key];
  return typeof value === "string" ? value : undefined;
}

function readNumberMetric(evidence: ApiEvidence, key: string) {
  const value = evidence.metrics?.[key];
  return typeof value === "number" ? value : undefined;
}
