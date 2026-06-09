import type {
  BoardViewModel,
  AssetDraftPreview,
  AuditLogPreview,
  EvidenceRow,
  ImportedCatalogPreview,
  ImportedQueryClusterPreview,
  ImportedQueryRowPreview,
  IntegrationHealth,
  Opportunity,
  ScoreComponent,
  SprintOneRuleId,
  SyncRunPreview,
  Task,
  TaskCategory,
  VisibleTaskStatus
} from "./types";
import type {
  ApiAssetResponse,
  ApiAssetWorkspaceResponse,
  ApiAuditLogsResponse,
  ApiEvidence,
  ApiImportedGraphResponse,
  ApiImportedPageResponse,
  ApiImportedPagesResponse,
  ApiImportedOpportunityResponse,
  ApiImportedOpportunitiesResponse,
  ApiImportedProductResponse,
  ApiImportedProductsResponse,
  ApiImportedQueryClusterResponse,
  ApiImportedQueryClustersResponse,
  ApiImportedQueryResponse,
  ApiImportedQueriesResponse,
  ApiImportedTaskResponse,
  ApiImportedTasksResponse,
  ApiIntegrationStatus,
  ApiIntegrationsResponse,
  ApiOpportunitiesResponse,
  ApiOpportunity,
  ApiSyncRun,
  ApiSyncRunsResponse,
  ApiTask,
  ApiTasksResponse
} from "./api-client";

const sprintOneRules = new Set<SprintOneRuleId>([
  "buying_guide_gap",
  "collection_page_gap",
  "high_impression_low_ctr",
  "product_seo",
  "ranking_push"
]);

const visibleTaskStatuses = new Set<VisibleTaskStatus>(["new", "approved", "rejected", "snoozed"]);
const catalogHrefDisplayMaxLength = 72;

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
    ruleId: mapRuleId(task.source_opportunity?.rule_id ?? inferRuleId(task.opportunity_id, task.evidence)),
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

export function mapApiIntegrationsToIntegrationHealth(response: ApiIntegrationsResponse): IntegrationHealth[] {
  return response.integrations.map((integration) => ({
    action: integration.status === "connected_stub" ? "Details" : "Connect later",
    errors: mapIntegrationErrors(integration.status),
    freshness: mapIntegrationFreshness(integration.status),
    lastSync: integration.last_sync_run_id ?? "not synced",
    mode: integration.connection_mode ?? "not_connected",
    name: integration.name || integration.key,
    permissionBoundary: mapIntegrationPermissionBoundary(integration)
  }));
}

export function mapApiSyncRunsToSyncRunPreviews(response: ApiSyncRunsResponse): SyncRunPreview[] {
  return response.sync_runs.map((run) => {
    const backendExternalWriteFlag = Boolean(run.steps?.some((step) => step.external_write_allowed));
    return {
      blockedCapabilities: backendExternalWriteFlag
        ? [...(run.blocked_capabilities ?? []), "frontend_external_write_clamp"]
        : run.blocked_capabilities ?? [],
      executionMode: run.execution_mode ?? "tracking_only",
      externalWriteAllowed: false,
      id: run.id,
      providerSteps: (run.steps ?? []).map((step) => `${step.provider}:${step.step_name}`),
      status: mapSyncRunStatus(run.status)
    };
  });
}

export function mapApiAuditLogsToEvidenceRows(response: ApiAuditLogsResponse): EvidenceRow[] {
  return response.audit_logs.map((entry) => ({
    entity: `${entry.target_type}:${entry.target_id}`,
    metric: entry.action,
    reason: entry.safety_scope ?? "local_tracking_only",
    source: "Audit",
    type: "audit",
    window: "local"
  }));
}

export function mapApiAuditLogsToPreviews(response: ApiAuditLogsResponse): AuditLogPreview[] {
  return response.audit_logs.map((entry) => ({
    action: entry.action,
    actor: entry.actor ?? "system",
    externalWriteAllowed: false,
    id: entry.id,
    safetyScope: entry.safety_scope ?? "local_tracking_only",
    target: `${entry.target_type}:${entry.target_id}`
  }));
}

export function mapApiAssetWorkspaceToPreviews(response: ApiAssetWorkspaceResponse): AssetDraftPreview[] {
  return response.assets.map((asset) => mapApiAssetDraftToPreview(asset, response.blocked_capabilities));
}

export function mapApiAssetResponseToPreview(response: ApiAssetResponse): AssetDraftPreview {
  return mapApiAssetDraftToPreview(response.asset);
}

function mapApiAssetDraftToPreview(
  asset: ApiAssetResponse["asset"],
  workspaceBlockedCapabilities: string[] = []
): AssetDraftPreview {
  return {
    assetType: asset.asset_type,
    blockedCapabilities: asset.blocked_capabilities ?? workspaceBlockedCapabilities,
    contentBlockCount: asset.content_blocks?.length ?? 0,
    contentBlockTypes: mapAssetContentBlockTypes(asset.content_blocks),
    externalWriteAllowed: false,
    id: asset.id,
    qaCheckCount: countAssetQaChecks(asset.qa_checks),
    qaPendingCount: countPendingAssetQaChecks(asset.qa_checks),
    reviewState: asset.review_state,
    sourceTaskId: asset.source_task_id,
    title: asset.title
  };
}

function mapAssetContentBlockTypes(contentBlocks: unknown[] | undefined): string[] {
  if (!Array.isArray(contentBlocks)) return [];
  return contentBlocks.flatMap((block) => {
    if (!block || typeof block !== "object" || !("type" in block)) return [];
    const blockType = (block as { type?: unknown }).type;
    return typeof blockType === "string" && blockType.trim() ? [blockType] : [];
  });
}

function countAssetQaChecks(qaChecks: unknown[] | undefined): number {
  return Array.isArray(qaChecks) ? qaChecks.filter(isAssetQaCheck).length : 0;
}

function countPendingAssetQaChecks(qaChecks: unknown[] | undefined): number {
  if (!Array.isArray(qaChecks)) return 0;
  return qaChecks.filter((check) => isAssetQaCheck(check) && check.status === "pending").length;
}

function isAssetQaCheck(check: unknown): check is { status: string } {
  if (!check || typeof check !== "object" || !("status" in check)) return false;
  return typeof (check as { status?: unknown }).status === "string";
}

export function mapApiImportedGraphToClusterPreviews(
  response: ApiImportedGraphResponse
): ImportedQueryClusterPreview[] {
  return response.query_clusters.map(mapApiImportedQueryClusterToPreview);
}

export function mapApiImportedProductsToCatalogPreviews(
  response: ApiImportedProductsResponse
): ImportedCatalogPreview[] {
  return response.products.map(mapApiImportedProductToCatalogPreview);
}

export function mapApiImportedQueriesToPreviews(response: ApiImportedQueriesResponse): ImportedQueryRowPreview[] {
  return response.queries.map(mapApiImportedQueryRowToPreview);
}

export function mapApiImportedQueryResponseToPreview(response: ApiImportedQueryResponse): ImportedQueryRowPreview {
  return mapApiImportedQueryRowToPreview(response.query);
}

export function mapApiImportedProductResponseToCatalogPreview(
  response: ApiImportedProductResponse
): ImportedCatalogPreview {
  return mapApiImportedProductToCatalogPreview(response.product);
}

export function mapApiImportedPagesToCatalogPreviews(response: ApiImportedPagesResponse): ImportedCatalogPreview[] {
  return response.pages.map(mapApiImportedPageToCatalogPreview);
}

export function mapApiImportedPageResponseToCatalogPreview(
  response: ApiImportedPageResponse
): ImportedCatalogPreview {
  return mapApiImportedPageToCatalogPreview(response.page);
}

function mapApiImportedProductToCatalogPreview(
  product: ApiImportedProductsResponse["products"][number]
): ImportedCatalogPreview {
  const href = product.permalink ?? undefined;
  return {
    detail: `SKU ${product.sku ?? "n/a"} / ${product.categories?.[0] ?? "uncategorized"}`,
    displayHref: formatImportedCatalogHrefForDisplay(href),
    href,
    id: product.id,
    kind: "product",
    source: "WooCommerce",
    title: product.name
  };
}

function mapApiImportedPageToCatalogPreview(
  page: ApiImportedPagesResponse["pages"][number]
): ImportedCatalogPreview {
  return {
    detail: `${page.page_type ?? "page"} / ${page.status ?? "unknown"}${page.indexable === false ? " / noindex" : ""}`,
    displayHref: formatImportedCatalogHrefForDisplay(page.url),
    href: page.url,
    id: page.id,
    kind: "page",
    source: "WordPress",
    title: page.title
  };
}

function formatImportedCatalogHrefForDisplay(href?: string | null): string | undefined {
  if (!href) return undefined;

  let displayHref: string;
  try {
    const url = new URL(href);
    const displayPath = `${url.hostname}${url.pathname}`.replace(/\/$/, "");
    displayHref = displayPath || url.hostname;
  } catch {
    displayHref = href.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  if (!displayHref) return undefined;
  return truncateCatalogHrefDisplay(displayHref);
}

function truncateCatalogHrefDisplay(displayHref: string): string {
  if (displayHref.length <= catalogHrefDisplayMaxLength) return displayHref;
  return `${displayHref.slice(0, catalogHrefDisplayMaxLength - 3)}...`;
}

function mapApiImportedQueryRowToPreview(row: ApiImportedQueriesResponse["queries"][number]): ImportedQueryRowPreview {
  const clicks = normalizeImportedQueryRowNumber(row.clicks);
  const ctr = normalizeImportedQueryRowNumber(row.ctr);
  const impressions = normalizeImportedQueryRowNumber(row.impressions);
  const page = row.page ?? "";
  const position = normalizeImportedQueryRowNumber(row.position);
  const query = row.query ?? "Unknown query";
  const source = formatImportedQueryRowSource(row.source);
  const window = row.window ?? "imported";
  const displayPage = formatImportedQueryPageForDisplay(page);
  const displayClicks = formatImportedQueryRowCount(clicks);
  const displayCtr = formatImportedQueryRowCtr(ctr);
  const displayImpressions = formatImportedQueryRowCount(impressions);
  const displayPosition = formatImportedQueryRowPosition(position);
  const displayEvidenceSummary = formatImportedQueryRowEvidenceSummary(1, source);

  return {
    clicks,
    ctr,
    displayClicks,
    displayCtr,
    displayEvidenceSummary,
    displayImpressions,
    displayPage,
    displayPosition,
    evidence: [
      {
        entity: query,
        metric: formatImportedQueryRowMetric(displayImpressions, displayClicks, displayCtr, displayPosition),
        reason: `Imported query row for ${displayPage}`,
        source,
        type: "search",
        window
      }
    ],
    id: row.id,
    impressions,
    page,
    position,
    query,
    source,
    window
  };
}

function formatImportedQueryPageForDisplay(page: string): string {
  return formatImportedCatalogHrefForDisplay(page) ?? "Unknown page";
}

function formatImportedQueryRowCtr(ctr: number): string {
  return `${(ctr * 100).toFixed(2)}%`;
}

function formatImportedQueryRowCount(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}

function formatImportedQueryRowPosition(position: number): string {
  if (position <= 0) return "n/a";
  return position.toFixed(1);
}

function normalizeImportedQueryRowNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatImportedQueryRowEvidenceSummary(evidenceCount: number, source: string): string {
  return `evidence ${evidenceCount} row${evidenceCount === 1 ? "" : "s"} / ${source}`;
}

function formatImportedQueryRowMetric(
  displayImpressions: string,
  displayClicks: string,
  displayCtr: string,
  displayPosition: string
): string {
  return `${displayImpressions} impressions / ${displayClicks} clicks / CTR ${displayCtr} / avg position ${displayPosition}`;
}

function formatImportedQueryRowSource(source?: string | null): string {
  if (!source || source === "csv_import") return "Imported GSC";
  return source;
}

export function mapApiImportedQueryClustersToPreviews(
  response: ApiImportedQueryClustersResponse
): ImportedQueryClusterPreview[] {
  return response.query_clusters.map(mapApiImportedQueryClusterToPreview);
}

export function mapApiImportedQueryClusterResponseToPreview(
  response: ApiImportedQueryClusterResponse
): ImportedQueryClusterPreview {
  return mapApiImportedQueryClusterToPreview(response.query_cluster);
}

function mapApiImportedQueryClusterToPreview(cluster: ApiImportedQueryClusterResponse["query_cluster"]): ImportedQueryClusterPreview {
  return {
    clicks: cluster.clicks,
    ctr: cluster.ctr,
    evidence: [
      {
        entity: cluster.primary_query,
        metric: `${cluster.impressions} impressions / ${cluster.clicks} clicks / CTR ${cluster.ctr}`,
        reason: `${cluster.query_count} imported queries grouped by local token overlap`,
        source: "Imported GSC",
        type: "search",
        window: "imported"
      }
    ],
    id: cluster.cluster_key,
    impressions: cluster.impressions,
    position: cluster.position,
    primaryQuery: cluster.primary_query,
    queryCount: cluster.query_count,
    topPages: cluster.top_pages ?? []
  };
}

export function mapApiImportedOpportunitiesToOpportunities(
  response: ApiImportedOpportunitiesResponse
): Opportunity[] {
  return response.opportunities.map(mapApiOpportunityToOpportunity);
}

export function mapApiImportedOpportunityResponseToOpportunity(
  response: ApiImportedOpportunityResponse
): Opportunity {
  return mapApiOpportunityToOpportunity(response.opportunity);
}

export function mapApiImportedTasksToTasks(response: ApiImportedTasksResponse): Task[] {
  return response.tasks.map(mapApiImportedTaskToTask);
}

export function mapApiImportedTaskResponseToTask(response: ApiImportedTaskResponse): Task {
  return mapApiImportedTaskToTask(response.task);
}

function mapApiImportedTaskToTask(task: ApiTask): Task {
  return {
    ...mapApiTaskToTask(task),
    actionLabel: "Review",
    automationLevel: "recommend_only",
    status: mapVisibleTaskStatus(task.status)
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
  if (evidence.some((item) => item.type === "gsc_position" || item.type === "ranking_position")) return "ranking_push";
  if (evidence.some((item) => item.type === "buying_guide_intent")) return "buying_guide_gap";
  if (opportunityId.includes("ranking")) return "ranking_push";
  return "collection_page_gap";
}

function mapTaskCategory(category: string): TaskCategory {
  if (
    category === "ctr_refresh" ||
    category === "buying_guide" ||
    category === "product_seo" ||
    category === "ranking_push" ||
    category === "collection_page"
  ) {
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

function mapIntegrationFreshness(status: string): IntegrationHealth["freshness"] {
  if (status === "connected_stub") return "degraded";
  if (status === "not_connected") return "stale";
  return "stale";
}

function mapIntegrationErrors(status: string) {
  if (status === "connected_stub") return "No external writes enabled";
  if (status === "not_connected") return "Demo mode, real credentials not connected";
  return "Unknown integration status mapped to safe fallback";
}

function mapIntegrationPermissionBoundary(integration: ApiIntegrationStatus) {
  const backendExternalWriteFlag = integration.external_write_allowed === true;
  const blockedCapabilities = integration.blocked_capabilities ?? [];
  const safeOperations = integration.safe_operations ?? [];
  const blockedCopy = blockedCapabilities.length ? `Blocked: ${blockedCapabilities.join(", ")}` : "Blocked: external writes";
  const safeCopy = safeOperations.length ? `Allowed: ${safeOperations.join(", ")}` : "Allowed: read-only status";
  return backendExternalWriteFlag ? `${safeCopy}; ${blockedCopy}; external writes disabled by UI adapter` : `${safeCopy}; ${blockedCopy}`;
}

function mapSyncRunStatus(status: string): SyncRunPreview["status"] {
  if (status === "queued" || status === "running" || status === "completed" || status === "failed") {
    return status;
  }
  return "queued";
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
