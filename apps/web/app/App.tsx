import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { StatusPill } from "../components/tasks/StatusPill";
import { TaskQueue } from "../components/tasks/TaskQueue";
import { localizeTaskTitle } from "../components/tasks/task-copy";
import {
  getAuditLogs,
  getImportedGraph,
  getImportedPages,
  getImportedProducts,
  getImportedOpportunities,
  getImportedTasks,
  getIntegrations,
  getOpportunities,
  getSyncRuns,
  getTasks,
  isApiBoardEnabled,
  updateTaskStatus
} from "../lib/api-client";
import {
  boardViewModel,
  boundaryCopy,
  integrationHealth,
  opportunityDetail,
  taskDetail
} from "../lib/mock-data";
import {
  applyTaskStatusesToBoard,
  applyTaskStatusToDetail,
  loadTaskStatusMap,
  saveTaskStatusMap,
  updateTaskStatusMap
} from "../lib/task-state";
import { createTaskDetailViewModel } from "../lib/task-detail";
import {
  mapApiAuditLogsToEvidenceRows,
  mapApiImportedGraphToClusterPreviews,
  mapApiImportedPagesToCatalogPreviews,
  mapApiImportedOpportunitiesToOpportunities,
  mapApiImportedProductsToCatalogPreviews,
  mapApiImportedTasksToTasks,
  mapApiIntegrationsToIntegrationHealth,
  mapApiPlanningToBoard,
  mapApiSyncRunsToSyncRunPreviews
} from "../lib/view-model-adapters";
import type {
  BoardViewModel,
  EvidenceRow,
  ImportedCatalogPreview,
  ImportedQueryClusterPreview,
  IntegrationHealth,
  Locale,
  Opportunity,
  OpportunityDetailViewModel,
  RelatedEntity,
  ScoreComponent,
  SyncRunPreview,
  TaskDetailViewModel,
  VisibleTaskStatus
} from "../lib/types";

type Screen = "board" | "opportunity" | "task" | "integrations" | "states";

type BoardDataState = {
  error?: string;
  loading: boolean;
  source: "api" | "fallback" | "mock";
};

type SafetySignalState = {
  auditEvidence: EvidenceRow[];
  syncRunPreviews: SyncRunPreview[];
};

type ImportedPreviewState = {
  availability: "empty" | "ready" | "unavailable";
  clusters: ImportedQueryClusterPreview[];
  error?: string;
  graphSummary: {
    page_matches?: number;
    product_matches?: number;
    query_clusters?: number;
  } | null;
  pages: ImportedCatalogPreview[];
  opportunities: Opportunity[];
  products: ImportedCatalogPreview[];
  tasks: BoardViewModel["tasks"];
  warnings: string[];
};

const demoStoreId = "store-demo-outdoor-coffee";

type PendingTaskStatus = {
  status: VisibleTaskStatus;
  taskId: string;
};

type TaskActionFeedback = {
  kind: "api" | "fallback" | "local" | "pending";
  status: VisibleTaskStatus;
  taskId: string;
} | null;

type MessageKey =
  | "board"
  | "opportunities"
  | "tasks"
  | "safety"
  | "qaStates"
  | "executionBoundary"
  | "executionBoundaryText"
  | "viewSync"
  | "runPlanning"
  | "noLivePublishing"
  | "ruleEngine"
  | "review"
  | "draftLater"
  | "inspect"
  | "viewReason"
  | "safe"
  | "new"
  | "approved"
  | "rejected"
  | "snoozed"
  | "fresh"
  | "degraded";

const messages: Record<Locale, Record<MessageKey, string>> = {
  zh: {
    board: "工作台",
    opportunities: "机会",
    tasks: "任务",
    safety: "安全",
    qaStates: "验收态",
    executionBoundary: "执行边界",
    executionBoundaryText: "GSC 导入只读。WooCommerce 只读。WordPress 草稿创建为后续能力。",
    viewSync: "查看同步",
    runPlanning: "运行规划",
    noLivePublishing: "无线上发布",
    ruleEngine: "规则引擎",
    review: "审核",
    draftLater: "草稿后续",
    inspect: "查看",
    viewReason: "查看原因",
    safe: "安全",
    new: "新任务",
    approved: "已批准",
    rejected: "已拒绝",
    snoozed: "已稍后处理",
    fresh: "新鲜",
    degraded: "降级"
  },
  en: {
    board: "Board",
    opportunities: "Opportunities",
    tasks: "Tasks",
    safety: "Safety",
    qaStates: "QA states",
    executionBoundary: "Execution boundary",
    executionBoundaryText:
      "GSC import is read-only. WooCommerce is read-only. WordPress draft creation is future-gated.",
    viewSync: "View sync",
    runPlanning: "Run planning",
    noLivePublishing: "No live publishing",
    ruleEngine: "rule engine",
    review: "Review",
    draftLater: "Draft later",
    inspect: "Inspect",
    viewReason: "View reason",
    safe: "Safe",
    new: "New",
    approved: "Approved",
    rejected: "Rejected",
    snoozed: "Snoozed",
    fresh: "Fresh",
    degraded: "Degraded"
  }
};

function useMessages(locale: Locale) {
  return useMemo(() => messages[locale], [locale]);
}

export function App() {
  const [screen, setScreen] = useState<Screen>("board");
  const [locale, setLocale] = useState<Locale>("zh");
  const [baseBoard, setBaseBoard] = useState<BoardViewModel>(boardViewModel);
  const [boardDataState, setBoardDataState] = useState<BoardDataState>({
    loading: false,
    source: "mock"
  });
  const [safetySignals, setSafetySignals] = useState<SafetySignalState>({
    auditEvidence: [],
    syncRunPreviews: []
  });
  const [importedPreviews, setImportedPreviews] = useState<ImportedPreviewState>({
    availability: "empty",
    clusters: [],
    graphSummary: null,
    pages: [],
    opportunities: [],
    products: [],
    tasks: [],
    warnings: []
  });
  const [selectedTaskId, setSelectedTaskId] = useState(taskDetail.id);
  const [taskStatuses, setTaskStatuses] = useState(loadTaskStatusMap);
  const [pendingTaskStatus, setPendingTaskStatus] = useState<PendingTaskStatus | null>(null);
  const [taskActionFeedback, setTaskActionFeedback] = useState<TaskActionFeedback>(null);
  const t = useMessages(locale);
  const board = useMemo(() => applyTaskStatusesToBoard(baseBoard, taskStatuses), [baseBoard, taskStatuses]);
  const selectedTask = useMemo(() => {
    const task = board.tasks.find((item) => item.id === selectedTaskId) ?? board.tasks[0] ?? taskDetail;
    return applyTaskStatusToDetail(createTaskDetailViewModel(task, taskDetail), taskStatuses);
  }, [board.tasks, selectedTaskId, taskStatuses]);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [screen]);

  useEffect(() => {
    if (!isApiBoardEnabled()) return;

    let active = true;
    setBoardDataState({ loading: true, source: "mock" });

    Promise.all([
      getTasks(demoStoreId),
      getOpportunities(demoStoreId),
      getIntegrations(demoStoreId),
      getSyncRuns(demoStoreId),
      getAuditLogs(demoStoreId)
    ])
      .then(
        ([tasksResponse, opportunitiesResponse, integrationsResponse, syncRunsResponse, auditLogsResponse]) => {
        if (!active) return;
        const integrations = mapApiIntegrationsToIntegrationHealth(integrationsResponse);
        const syncRunPreviews = mapApiSyncRunsToSyncRunPreviews(syncRunsResponse);
        const auditEvidence = mapApiAuditLogsToEvidenceRows(auditLogsResponse);
        setSafetySignals({ auditEvidence, syncRunPreviews });
        setBaseBoard(mapApiPlanningToBoard(tasksResponse, opportunitiesResponse, integrations));
        setBoardDataState({ loading: false, source: "api" });

        Promise.allSettled([
          getImportedGraph(demoStoreId),
          getImportedProducts(demoStoreId),
          getImportedPages(demoStoreId),
          getImportedOpportunities(demoStoreId),
          getImportedTasks(demoStoreId)
        ])
          .then(([graphResult, importedProductsResult, importedPagesResult, importedOpportunitiesResult, importedTasksResult]) => {
            if (!active) return;
            if (
              graphResult.status === "rejected" &&
              importedOpportunitiesResult.status === "rejected" &&
              importedTasksResult.status === "rejected"
            ) {
              throw graphResult.reason;
            }

            const graphResponse = graphResult.status === "fulfilled" ? graphResult.value : null;
            const clusters = graphResponse ? mapApiImportedGraphToClusterPreviews(graphResponse) : [];
            const products =
              importedProductsResult.status === "fulfilled"
                ? mapApiImportedProductsToCatalogPreviews(importedProductsResult.value)
                : [];
            const pages =
              importedPagesResult.status === "fulfilled"
                ? mapApiImportedPagesToCatalogPreviews(importedPagesResult.value)
                : [];
            const warnings =
              importedProductsResult.status === "rejected" || importedPagesResult.status === "rejected"
                ? ["catalog_unavailable"]
                : [];
            const opportunities =
              importedOpportunitiesResult.status === "fulfilled"
                ? mapApiImportedOpportunitiesToOpportunities(importedOpportunitiesResult.value)
                : [];
            const tasks =
              importedTasksResult.status === "fulfilled" ? mapApiImportedTasksToTasks(importedTasksResult.value) : [];
            setImportedPreviews({
              availability:
                clusters.length > 0 || products.length > 0 || pages.length > 0 || opportunities.length > 0 || tasks.length > 0
                  ? "ready"
                  : "empty",
              clusters,
              graphSummary: graphResponse?.summary ?? null,
              pages,
              opportunities,
              products,
              tasks,
              warnings
            });
          })
          .catch((importedError: unknown) => {
            if (!active) return;
            setImportedPreviews({
              availability: "unavailable",
              clusters: [],
              error: importedError instanceof Error ? importedError.message : "Imported previews unavailable",
              graphSummary: null,
              pages: [],
              opportunities: [],
              products: [],
              tasks: [],
              warnings: []
            });
          });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setBaseBoard(boardViewModel);
        setImportedPreviews({
          availability: "empty",
          clusters: [],
          graphSummary: null,
          pages: [],
          opportunities: [],
          products: [],
          tasks: [],
          warnings: []
        });
        setSafetySignals({ auditEvidence: [], syncRunPreviews: [] });
        setBoardDataState({
          error: error instanceof Error ? error.message : "Unknown API error",
          loading: false,
          source: "fallback"
        });
      });

    return () => {
      active = false;
    };
  }, []);

  function applyLocalTaskStatus(taskId: string, status: VisibleTaskStatus) {
    setTaskStatuses((current) => {
      const next = updateTaskStatusMap(current, taskId, status);
      saveTaskStatusMap(next);
      return next;
    });
  }

  function clearLocalTaskStatus(taskId: string) {
    setTaskStatuses((current) => {
      if (!current[taskId]) return current;

      const next = { ...current };
      delete next[taskId];
      saveTaskStatusMap(next);
      return next;
    });
  }

  function applyApiTaskStatusToBoard(taskId: string, status: VisibleTaskStatus) {
    setBaseBoard((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
    }));
  }

  async function retryTaskStatusSync(taskId: string, status: VisibleTaskStatus) {
    if (boardDataState.source !== "api") {
      keepLocalTaskStatus(taskId, status);
      return;
    }

    setPendingTaskStatus({ status, taskId });
    setTaskActionFeedback({ kind: "pending", status, taskId });

    try {
      const response = await updateTaskStatus(baseBoard.storeName, taskId, status);
      applyApiTaskStatusToBoard(response.task.id, status);
      clearLocalTaskStatus(response.task.id);
      setTaskActionFeedback({ kind: "api", status, taskId: response.task.id });
    } catch {
      applyLocalTaskStatus(taskId, status);
      setTaskActionFeedback({ kind: "fallback", status, taskId });
    } finally {
      setPendingTaskStatus((current) =>
        current?.taskId === taskId && current.status === status ? null : current
      );
    }
  }

  function keepLocalTaskStatus(taskId: string, status: VisibleTaskStatus) {
    applyLocalTaskStatus(taskId, status);
    setTaskActionFeedback({ kind: "local", status, taskId });
  }

  async function setTaskStatus(taskId: string, status: VisibleTaskStatus) {
    if (boardDataState.source === "api") {
      await retryTaskStatusSync(taskId, status);
      return;
    }

    keepLocalTaskStatus(taskId, status);
  }

  return (
    <div className="app-shell">
      <NavigationRail locale={locale} screen={screen} setScreen={setScreen} t={t} />
      <main className="main">
        <TopBar locale={locale} setLocale={setLocale} />
        {screen === "board" && (
          <TrafficOperationsPage
            board={board}
            dataState={boardDataState}
            importedPreviews={importedPreviews}
            locale={locale}
            onOpenTask={(task) => {
              setSelectedTaskId(task.id);
              setScreen("task");
            }}
            t={t}
          />
        )}
        {screen === "task" && (
          <TaskDetailPage
            locale={locale}
            onKeepLocalTaskStatus={keepLocalTaskStatus}
            onRetryTaskStatusSync={retryTaskStatusSync}
            onTaskStatusChange={setTaskStatus}
            pendingTaskStatus={pendingTaskStatus}
            task={selectedTask}
            taskActionFeedback={taskActionFeedback}
            t={t}
          />
        )}
        {screen === "opportunity" && <OpportunityDetailPage opportunity={opportunityDetail} locale={locale} t={t} />}
        {screen === "integrations" && (
          <IntegrationsSafetyPage
            auditEvidence={safetySignals.auditEvidence}
            integrations={board.integrations}
            locale={locale}
            syncRunPreviews={safetySignals.syncRunPreviews}
            t={t}
          />
        )}
        {screen === "states" && <UiStatesPage locale={locale} t={t} />}
      </main>
    </div>
  );
}

type SharedProps = {
  locale: Locale;
  t: Record<MessageKey, string>;
};

function NavigationRail({
  locale,
  screen,
  setScreen,
  t
}: SharedProps & {
  screen: Screen;
  setScreen: (screen: Screen) => void;
}) {
  const items: Array<{ key: Screen; shortcut: string; label: string }> = [
    { key: "board", shortcut: "B", label: t.board },
    { key: "opportunity", shortcut: "O", label: t.opportunities },
    { key: "task", shortcut: "T", label: t.tasks },
    { key: "integrations", shortcut: "S", label: t.safety },
    { key: "states", shortcut: "Q", label: t.qaStates }
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>TrafScope</strong>
        <span>{boundaryCopy[locale].product}</span>
      </div>
      <nav className="nav-list" aria-label="Main navigation">
        {items.map((item) => (
          <button
            className={`nav-link ${screen === item.key ? "active" : ""}`}
            key={item.key}
            onClick={() => setScreen(item.key)}
            type="button"
          >
            <span className="nav-key">{item.shortcut}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="side-note">
        <strong>{t.executionBoundary}</strong>
        <span>{t.executionBoundaryText}</span>
      </div>
    </aside>
  );
}

function TopBar({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <div className="topbar">
      <div>
        <div className="crumb">
          {locale === "zh"
            ? "Outdoor Coffee Gear Demo Store / GSC 演示数据"
            : "Outdoor Coffee Gear Demo Store / GSC demo fixture"}
        </div>
        <div className="crumb mono">2026-06-08 13:42 / planning-run-042</div>
      </div>
      <LanguageSwitcher locale={locale} setLocale={setLocale} />
    </div>
  );
}

function LanguageSwitcher({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  return (
    <div className="language" aria-label="Language switcher">
      <button className={locale === "zh" ? "active" : ""} onClick={() => setLocale("zh")} type="button">
        中文
      </button>
      <button className={locale === "en" ? "active" : ""} onClick={() => setLocale("en")} type="button">
        EN
      </button>
    </div>
  );
}

function TrafficOperationsPage({
  board,
  dataState,
  importedPreviews,
  locale,
  onOpenTask,
  t
}: SharedProps & {
  board: BoardViewModel;
  dataState: BoardDataState;
  importedPreviews: ImportedPreviewState;
  onOpenTask: (task: BoardViewModel["tasks"][number]) => void;
}) {
  return (
    <section>
      <div className="title-row">
        <div>
          <h1>{locale === "zh" ? "流量运营台" : "Traffic operations"}</h1>
          <p className="subtitle">
            {locale === "zh"
              ? "本周有证据支撑的审核队列。Sprint 1 只覆盖确定性规划和任务审核。"
              : "This week's evidence-backed review queue. Sprint 1 only covers deterministic planning and task review."}
          </p>
        </div>
        <div className="actions">
          <span className="status safe">{t.noLivePublishing}</span>
          <button className="button" type="button">
            {t.viewSync}
          </button>
          <button className="button primary" type="button">
            {t.runPlanning}
          </button>
        </div>
      </div>

      <BoundaryBanner locale={locale} t={t} />
      <BoardDataBanner dataState={dataState} locale={locale} />

      <section className="planning-grid" aria-label="Planning status">
        <InfoCard
          label={locale === "zh" ? "输入就绪度" : "Input readiness"}
          value={locale === "zh" ? "GSC 56 行 / Woo 128 商品 / WP 12 页面" : "GSC 56 rows / Woo 128 products / WP 12 pages"}
        >
          <div className="tag-row">
            <span className="pill search">GSC 28d</span>
            <span className="pill commerce">{locale === "zh" ? "WooCommerce 只读" : "WooCommerce read-only"}</span>
            <span className="pill safe">{locale === "zh" ? "WordPress 草稿后续" : "WordPress draft future"}</span>
          </div>
        </InfoCard>
        <InfoCard
          label={locale === "zh" ? "最近成功规划" : "Last successful planning"}
          value={board.planningRun.lastSuccessfulAt}
          mono
          description={
            locale === "zh"
              ? `生成 ${board.planningRun.generatedTasks} 条有证据任务`
              : `Generated ${board.planningRun.generatedTasks} evidence-backed tasks`
          }
        />
        <InfoCard
          label={locale === "zh" ? "当前状态" : "Current state"}
          value={locale === "zh" ? "待审核" : "Ready for review"}
          description={locale === "zh" ? "没有后台任务正在运行" : "No background job is running"}
        />
        <InfoCard label={locale === "zh" ? "下一步" : "Next step"} value="">
          <button className="button primary" type="button">
            {t.runPlanning}
          </button>
          <p className="muted">{locale === "zh" ? "只生成建议，不改商品或页面。" : "Suggestions only. No product or page writes."}</p>
        </InfoCard>
      </section>

      <section className="metric-grid" aria-label="Traffic summary">
        <Metric label={locale === "zh" ? "平均优先级分" : "Average priority score"} value={board.metrics.priorityAverage} />
        <Metric label={locale === "zh" ? "查询缺口，12 个未映射页面" : "Query gaps, 12 unmapped to pages"} value={board.metrics.queryGaps} />
        <Metric
          label={locale === "zh" ? "已分析商品，5 个高匹配候选" : "Analyzed products, 5 high-fit candidates"}
          value={board.metrics.productsReady}
        />
        <Metric label={locale === "zh" ? "追踪资产，3 个点击增长" : "Tracked assets, 3 gaining clicks"} value={board.metrics.trackedAssets} />
      </section>

      <div className="workbench-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{locale === "zh" ? "Sprint 1 工作队列" : "Sprint 1 work queue"}</h2>
              <p className="muted">
                {locale === "zh"
                  ? "仅展示 CTR 缺口、排名推动、集合页缺口三类任务。"
                  : "Only high CTR gap, ranking push, and collection page gap tasks are shown."}
              </p>
            </div>
            <span className="status">{board.planningRun.generatedTasks}</span>
          </div>
          <TaskQueue
            locale={locale}
            onOpenTask={onOpenTask}
            t={t}
            tasks={board.tasks}
          />
        </section>
        <aside className="side-rail">
          <DataHealthPanel integrations={board.integrations} locale={locale} t={t} />
          <ImportedPreviewPanel importedPreviews={importedPreviews} locale={locale} />
          <OpportunityRail opportunities={board.opportunities} locale={locale} t={t} />
        </aside>
      </div>
    </section>
  );
}

function BoardDataBanner({ dataState, locale }: { dataState: BoardDataState; locale: Locale }) {
  if (dataState.source === "mock" && !dataState.loading) return null;

  const title =
    dataState.source === "api"
      ? locale === "zh"
        ? "已连接 demo API"
        : "Demo API connected"
      : dataState.loading
        ? locale === "zh"
          ? "正在加载 demo API"
          : "Loading demo API"
        : locale === "zh"
          ? "使用 mock 回退"
          : "Using mock fallback";

  const description =
    dataState.source === "api"
      ? locale === "zh"
        ? "当前工作台数据来自后端只读 demo planning endpoint。"
        : "The workspace is using read-only demo planning data from the backend."
      : dataState.loading
        ? locale === "zh"
          ? "如果后端不可用，工作台会自动保留安全 mock 数据。"
          : "If the backend is unavailable, the workspace keeps the safe mock data."
        : dataState.error ?? "API unavailable, mock data retained.";

  return (
    <div className={`banner ${dataState.source === "fallback" ? "blocked" : "rule"}`}>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <span className="pill mono">{dataState.source}</span>
    </div>
  );
}

function BoundaryBanner({ locale, t }: SharedProps) {
  return (
    <div className="banner rule">
      <div>
        <strong>{locale === "zh" ? "评分边界" : "Scoring boundary"}</strong>
        <span>{boundaryCopy[locale].scoring}</span>
      </div>
      <span className="pill search">{t.ruleEngine}</span>
    </div>
  );
}

function InfoCard({
  label,
  value,
  description,
  mono,
  children
}: {
  label: string;
  value: string;
  description?: string;
  mono?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="info-card">
      <span className="label">{label}</span>
      {value && <span className={`value ${mono ? "mono" : ""}`}>{value}</span>}
      {description && <p className="muted">{description}</p>}
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-tile">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function DataHealthPanel({ integrations, locale, t }: SharedProps & { integrations: IntegrationHealth[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "数据健康" : "Data health"}</h2>
        <span className="status safe">{t.safe}</span>
      </div>
      <div className="kv-list">
        {integrations.map((integration) => (
          <div className="kv-row" key={integration.name}>
            <span>{integration.name === "Google Search Console" ? "GSC" : integration.name}</span>
            <strong>{localizeIntegrationSummary(integration, locale)}</strong>
          </div>
        ))}
        <div className="kv-row">
          <span>{locale === "zh" ? "最近同步" : "Last sync"}</span>
          <strong>2026-06-08 13:42</strong>
        </div>
      </div>
    </section>
  );
}

function ImportedPreviewPanel({
  importedPreviews,
  locale
}: {
  importedPreviews: ImportedPreviewState;
  locale: Locale;
}) {
  const visibleClusters = importedPreviews.clusters.slice(0, 2);
  const visibleProducts = importedPreviews.products.slice(0, 2);
  const visiblePages = importedPreviews.pages.slice(0, 2);
  const visibleOpportunities = importedPreviews.opportunities.slice(0, 2);
  const visibleTasks = importedPreviews.tasks.slice(0, 2);
  const clusterOverflowCount = Math.max(importedPreviews.clusters.length - visibleClusters.length, 0);
  const productOverflowCount = Math.max(importedPreviews.products.length - visibleProducts.length, 0);
  const pageOverflowCount = Math.max(importedPreviews.pages.length - visiblePages.length, 0);
  const opportunityOverflowCount = Math.max(importedPreviews.opportunities.length - visibleOpportunities.length, 0);
  const taskOverflowCount = Math.max(importedPreviews.tasks.length - visibleTasks.length, 0);
  const hasImportedPreviews =
    importedPreviews.availability === "ready" &&
    (visibleClusters.length > 0 ||
      visibleProducts.length > 0 ||
      visiblePages.length > 0 ||
      visibleOpportunities.length > 0 ||
      visibleTasks.length > 0);

  return (
    <section className="panel imported-preview-panel" aria-label="Imported preview panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "Imported 预览" : "Imported previews"}</h2>
        <span className="status safe">read-only imported previews</span>
      </div>
      <div className="kv-list">
        <div className="kv-row">
          <span>{locale === "zh" ? "图谱关联簇" : "Graph-linked clusters"}</span>
          <strong>{importedPreviews.graphSummary?.query_clusters ?? importedPreviews.clusters.length}</strong>
        </div>
        <div className="kv-row">
          <span>{locale === "zh" ? "匹配商品" : "Matched products"}</span>
          <strong>{importedPreviews.graphSummary?.product_matches ?? 0}</strong>
        </div>
        <div className="kv-row">
          <span>{locale === "zh" ? "匹配页面" : "Matched pages"}</span>
          <strong>{importedPreviews.graphSummary?.page_matches ?? 0}</strong>
        </div>
        <div className="kv-row">
          <span>{locale === "zh" ? "Catalog 商品" : "Catalog products"}</span>
          <strong>{importedPreviews.products.length}</strong>
        </div>
        <div className="kv-row">
          <span>{locale === "zh" ? "Catalog 页面" : "Catalog pages"}</span>
          <strong>{importedPreviews.pages.length}</strong>
        </div>
        <div className="kv-row">
          <span>{locale === "zh" ? "机会预览" : "Opportunity previews"}</span>
          <strong>{importedPreviews.opportunities.length}</strong>
        </div>
        <div className="kv-row">
          <span>{locale === "zh" ? "任务预览" : "Task previews"}</span>
          <strong>{importedPreviews.tasks.length}</strong>
        </div>
      </div>
      {importedPreviews.warnings.includes("catalog_unavailable") && (
        <div className="imported-preview-empty">
          <strong>{locale === "zh" ? "Catalog reads unavailable" : "Catalog reads unavailable"}</strong>
          <p className="muted">
            {locale === "zh"
              ? "商品或页面预览暂不可用；图谱、机会和任务预览仍保持只读展示。"
              : "Product or page preview reads are unavailable; graph, opportunity, and task previews remain read-only."}
          </p>
        </div>
      )}
      {hasImportedPreviews ? (
        <div className="imported-preview-list">
          {visibleClusters.map((cluster) => (
            <article className="rail-item" key={cluster.id}>
              <span className="pill search">{locale === "zh" ? "查询簇" : "Cluster"}</span>
              <h3>{cluster.primaryQuery}</h3>
              <p className="muted">
                {cluster.impressions} impressions / {cluster.clicks} clicks / CTR {cluster.ctr}
              </p>
            </article>
          ))}
          {clusterOverflowCount > 0 ? (
            <p className="muted imported-preview-overflow">
              {locale === "zh"
                ? `还有 ${clusterOverflowCount} 个查询簇未在预览中展示`
                : `${clusterOverflowCount} more query clusters not shown in this preview`}
            </p>
          ) : null}
          {visibleProducts.map((product) => (
            <article className="rail-item" key={product.id}>
              <span className="pill commerce">
                {locale === "zh" ? `商品 / ${product.source}` : `Product / ${product.source}`}
              </span>
              <h3>{product.title}</h3>
              <p className="muted">{product.detail}</p>
              {product.displayHref ? <p className="muted catalog-reference">{product.displayHref}</p> : null}
            </article>
          ))}
          {productOverflowCount > 0 ? (
            <p className="muted catalog-overflow">
              {locale === "zh"
                ? `还有 ${productOverflowCount} 个 catalog 商品未在预览中展示`
                : `${productOverflowCount} more catalog products not shown in this preview`}
            </p>
          ) : null}
          {visiblePages.map((page) => (
            <article className="rail-item" key={page.id}>
              <span className="pill safe">{locale === "zh" ? `页面 / ${page.source}` : `Page / ${page.source}`}</span>
              <h3>{page.title}</h3>
              <p className="muted">{page.detail}</p>
              {page.displayHref ? <p className="muted catalog-reference">{page.displayHref}</p> : null}
            </article>
          ))}
          {pageOverflowCount > 0 ? (
            <p className="muted catalog-overflow">
              {locale === "zh"
                ? `还有 ${pageOverflowCount} 个 catalog 页面未在预览中展示`
                : `${pageOverflowCount} more catalog pages not shown in this preview`}
            </p>
          ) : null}
          {visibleOpportunities.map((opportunity) => (
            <article className="rail-item" key={opportunity.id}>
              <span className="pill safe">{locale === "zh" ? "机会" : "Opportunity"}</span>
              <h3>{opportunity.title}</h3>
              <p className="muted">{opportunity.summary}</p>
            </article>
          ))}
          {opportunityOverflowCount > 0 ? (
            <p className="muted imported-preview-overflow">
              {locale === "zh"
                ? `还有 ${opportunityOverflowCount} 个机会预览未在预览中展示`
                : `${opportunityOverflowCount} more opportunity previews not shown in this preview`}
            </p>
          ) : null}
          {visibleTasks.map((task) => (
            <article className="rail-item" key={task.id}>
              <span className="pill commerce">{locale === "zh" ? "任务预览" : "Task preview"}</span>
              <h3>{localizeTaskTitle(task.title, locale)}</h3>
              <p className="muted">
                {locale === "zh"
                  ? `recommend_only / 分数 ${task.trafscore} / 证据 ${task.evidence.length}`
                  : `recommend_only / score ${task.trafscore} / evidence ${task.evidence.length}`}
              </p>
            </article>
          ))}
          {taskOverflowCount > 0 ? (
            <p className="muted imported-preview-overflow">
              {locale === "zh"
                ? `还有 ${taskOverflowCount} 个任务预览未在预览中展示`
                : `${taskOverflowCount} more task previews not shown in this preview`}
            </p>
          ) : null}
        </div>
      ) : importedPreviews.availability === "unavailable" ? (
        <div className="imported-preview-empty">
          <strong>{locale === "zh" ? "Imported previews unavailable" : "Imported previews unavailable"}</strong>
          <p className="muted">
            {locale === "zh"
              ? "主工作台仍使用 demo API 数据。Imported preview 读取暂不可用，已保持只读空状态。"
              : "The main board still uses demo API data. Imported preview reads are unavailable, so this panel stays read-only and empty."}
          </p>
        </div>
      ) : (
        <div className="imported-preview-empty">
          <p className="muted">
            {locale === "zh"
              ? "本地 imported preview endpoint 已连接；当前会话还没有导入的 GSC、WooCommerce 或 WordPress fixture。"
              : "The local imported preview endpoints are connected; this session has no imported GSC, WooCommerce, or WordPress fixture data yet."}
          </p>
        </div>
      )}
    </section>
  );
}

function OpportunityRail({ opportunities, locale, t }: SharedProps & { opportunities: Opportunity[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "顶部机会" : "Top opportunities"}</h2>
      </div>
      <div className="rail-list">
        {opportunities.map((opportunity) => (
          <article className="rail-item" key={opportunity.id}>
            <h3>{localizeOpportunityTitle(opportunity.title, locale)}</h3>
            <p className="muted">{localizeOpportunitySummary(opportunity.summary, locale)}</p>
            <div className="tag-row">
              <span className={opportunity.confidence >= 0.85 ? "pill safe" : "pill commerce"}>
                {locale === "zh" ? "置信度" : "confidence"} {opportunity.confidence}
              </span>
              <span className="pill mono">rule v1</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function reviewButtonLabel(
  locale: Locale,
  status: VisibleTaskStatus,
  pendingTaskStatus: PendingTaskStatus | null,
  isReviewActionPending: boolean,
  zh: string,
  en: string
) {
  if (!isReviewActionPending || pendingTaskStatus?.status !== status) return locale === "zh" ? zh : en;
  return locale === "zh" ? "同步中" : "Syncing";
}

function ReviewActionFeedback({
  feedback,
  isPending,
  locale,
  onKeepLocalTaskStatus,
  onRetryTaskStatusSync
}: {
  feedback: TaskActionFeedback;
  isPending: boolean;
  locale: Locale;
  onKeepLocalTaskStatus: (taskId: string, status: VisibleTaskStatus) => void;
  onRetryTaskStatusSync: (taskId: string, status: VisibleTaskStatus) => Promise<void> | void;
}) {
  if (!feedback) return null;

  const copy = getReviewActionFeedbackCopy(feedback.kind, locale);
  const shouldShowFallbackActions = feedback.kind === "fallback";

  return (
    <div
      aria-live="polite"
      className={`banner review-feedback ${feedback.kind === "fallback" ? "blocked" : "rule"}`}
    >
      <div>
        <strong>{copy.title}</strong>
        <span>{copy.description}</span>
      </div>
      <div className="review-feedback-side">
        <span className={`pill ${feedback.kind === "fallback" ? "commerce" : "safe"}`}>{copy.badge}</span>
        {shouldShowFallbackActions && (
          <div className="review-feedback-actions" aria-label={locale === "zh" ? "fallback 同步动作" : "Fallback sync actions"}>
            <button
              className="button"
              disabled={isPending}
              onClick={() => onRetryTaskStatusSync(feedback.taskId, feedback.status)}
              type="button"
            >
              {locale === "zh" ? "重试同步 / Retry sync" : "Retry sync"}
            </button>
            <button
              className="button"
              disabled={isPending}
              onClick={() => onKeepLocalTaskStatus(feedback.taskId, feedback.status)}
              type="button"
            >
              {locale === "zh" ? "保留本地 / Keep local" : "Keep local"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getReviewActionFeedbackCopy(kind: NonNullable<TaskActionFeedback>["kind"], locale: Locale) {
  const copy: Record<NonNullable<TaskActionFeedback>["kind"], Record<Locale, { badge: string; description: string; title: string }>> = {
    api: {
      zh: {
        badge: "demo API",
        description: "审核状态已同步到 demo API。没有创建 WordPress 草稿或改写商品数据。",
        title: "审核状态已同步"
      },
      en: {
        badge: "demo API",
        description: "The review state is synced to the demo API. No WordPress draft or product data was changed.",
        title: "Review state synced"
      }
    },
    fallback: {
      zh: {
        badge: "fallback",
        description: "API 不可用。我们已把这次审核状态保留在本地演示状态中，没有执行任何外部写入。",
        title: "API 不可用"
      },
      en: {
        badge: "fallback",
        description: "API unavailable. We kept this review state locally for the demo and made no external writes.",
        title: "API unavailable"
      }
    },
    local: {
      zh: {
        badge: "local",
        description: "审核状态已保存在本地演示状态中。启用 API board 后会优先同步 demo API。",
        title: "审核状态已本地保存"
      },
      en: {
        badge: "local",
        description: "The review state is saved locally for the demo. API board mode syncs the demo API first.",
        title: "Review state saved locally"
      }
    },
    pending: {
      zh: {
        badge: "syncing",
        description: "正在同步审核状态。按钮会暂时禁用，以避免重复提交。",
        title: "正在同步审核状态"
      },
      en: {
        badge: "syncing",
        description: "Syncing review state. The review buttons are temporarily disabled to prevent duplicate submissions.",
        title: "Syncing review state"
      }
    }
  };

  return copy[kind][locale];
}

function TaskDetailPage({
  task,
  locale,
  onKeepLocalTaskStatus,
  onRetryTaskStatusSync,
  onTaskStatusChange,
  pendingTaskStatus,
  taskActionFeedback,
  t
}: SharedProps & {
  task: TaskDetailViewModel;
  onKeepLocalTaskStatus: (taskId: string, status: VisibleTaskStatus) => void;
  onRetryTaskStatusSync: (taskId: string, status: VisibleTaskStatus) => Promise<void> | void;
  onTaskStatusChange: (taskId: string, status: VisibleTaskStatus) => Promise<void> | void;
  pendingTaskStatus: PendingTaskStatus | null;
  taskActionFeedback: TaskActionFeedback;
}) {
  const isReviewActionPending = pendingTaskStatus?.taskId === task.id;
  const visibleFeedback = taskActionFeedback?.taskId === task.id ? taskActionFeedback : null;

  return (
    <section>
      <div className="title-row">
        <div>
          <h1>{locale === "zh" ? "是否批准集合页任务？" : "Approve this collection-page task?"}</h1>
          <p className="subtitle">
            {locale === "zh"
              ? "批准只改变任务状态。Sprint 1 不创建 WordPress 草稿。"
              : "Approval changes task state only. Sprint 1 does not create WordPress drafts."}
          </p>
        </div>
        <div className="actions">
          <span className="status-label">{locale === "zh" ? "当前状态" : "Current status"}</span>
          <StatusPill status={task.status} t={t} />
          <button
            className="button"
            disabled={isReviewActionPending}
            onClick={() => onTaskStatusChange(task.id, "snoozed")}
            type="button"
          >
            {reviewButtonLabel(locale, "snoozed", pendingTaskStatus, isReviewActionPending, "稍后处理", "Snooze")}
          </button>
          <button
            className="button danger"
            disabled={isReviewActionPending}
            onClick={() => onTaskStatusChange(task.id, "rejected")}
            type="button"
          >
            {reviewButtonLabel(locale, "rejected", pendingTaskStatus, isReviewActionPending, "拒绝", "Reject")}
          </button>
          <button
            className="button primary"
            disabled={isReviewActionPending}
            onClick={() => onTaskStatusChange(task.id, "approved")}
            type="button"
          >
            {reviewButtonLabel(locale, "approved", pendingTaskStatus, isReviewActionPending, "批准任务", "Approve task")}
          </button>
        </div>
      </div>

      <ReviewActionFeedback
        feedback={visibleFeedback}
        isPending={isReviewActionPending}
        locale={locale}
        onKeepLocalTaskStatus={onKeepLocalTaskStatus}
        onRetryTaskStatusSync={onRetryTaskStatusSync}
      />

      <div className="banner">
        <div>
          <strong>{locale === "zh" ? "批准后发生什么" : "After approval"}</strong>
          <span>
            {locale === "zh"
              ? "负责人：内容运营。预计：1 个工作日。效果判断：后续 Sprint 用 GSC 基线快照和执行后快照对比。"
              : "Owner: content operator. ETA: 1 working day. Success check: baseline GSC snapshot then post-change comparison in a later sprint."}
          </span>
        </div>
        <span className="pill safe">{locale === "zh" ? "仅状态流转" : "state change only"}</span>
      </div>

      <HeaderDecision task={task} locale={locale} />

      <div className="detail-grid">
        <div className="screen-gap">
          <EvidenceTable evidence={task.evidence} locale={locale} />
          <ActionPlan task={task} locale={locale} />
          <AcceptanceCriteria criteria={task.acceptanceCriteria} locale={locale} />
        </div>
        <aside className="screen-gap">
          <ScoreBreakdown components={task.scoreComponents} locale={locale} />
          <RuleTracePanel task={task} locale={locale} />
          <RelatedEntitiesPanel entities={task.relatedEntities} locale={locale} />
        </aside>
      </div>
    </section>
  );
}

function HeaderDecision({ task, locale }: { task: TaskDetailViewModel; locale: Locale }) {
  return (
    <div className="decision">
      <span className="score">{task.trafscore}</span>
      <div>
        <h2>{localizeTaskTitle(task.title, locale)}</h2>
        <p className="subtitle">{locale === "zh" ? task.subtitle : "This task exists because search demand, product readiness, and page gap thresholds all passed."}</p>
        <div className="tag-row">
          <span className="pill mono">{task.ruleId}</span>
          <span className="pill search">{task.objects.queries} queries</span>
          <span className="pill commerce">{task.objects.products} SKUs</span>
          <span className="pill">WP{task.objects.pages}</span>
        </div>
      </div>
    </div>
  );
}

function EvidenceTable({ evidence, locale }: { evidence: EvidenceRow[]; locale: Locale }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "证据" : "Evidence"}</h2>
        <span className="status safe">{locale === "zh" ? "完整" : "Complete"}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>{locale === "zh" ? "来源" : "Source"}</th>
            <th>{locale === "zh" ? "对象" : "Entity"}</th>
            <th>{locale === "zh" ? "指标" : "Metric"}</th>
            <th>{locale === "zh" ? "时间窗" : "Window"}</th>
            <th>{locale === "zh" ? "原因" : "Reason"}</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((row) => (
            <tr key={`${row.source}-${row.metric}`}>
              <td data-label={locale === "zh" ? "来源" : "Source"}>
                <span className={`pill ${row.type === "search" ? "search" : row.type === "commerce" ? "commerce" : ""}`}>
                  {localizeEvidenceType(row.type, locale)}
                </span>
              </td>
              <td data-label={locale === "zh" ? "对象" : "Entity"}>{localizeEntity(row, locale)}</td>
              <td data-label={locale === "zh" ? "指标" : "Metric"}>{localizeMetric(row, locale)}</td>
              <td data-label={locale === "zh" ? "时间窗" : "Window"} className="mono">
                {row.window}
              </td>
              <td data-label={locale === "zh" ? "原因" : "Reason"}>{localizeReason(row, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ActionPlan({ task, locale }: { task: TaskDetailViewModel; locale: Locale }) {
  const english = [
    {
      title: "Approve task state",
      description: "Move task from new to approved. No page, product, or WordPress draft is created in Sprint 1."
    },
    {
      title: "Prepare structured draft plan",
      description: "Record title intent, product set, FAQ intent, and internal link targets for later draft review."
    },
    {
      title: "Create measurement baseline later",
      description: "A later sprint will capture GSC baseline and compare after execution."
    }
  ];
  const items = locale === "zh" ? task.actionPlan : english;

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "行动计划" : "Action plan"}</h2>
      </div>
      <div className="step-list">
        {items.map((item) => (
          <div className="step" key={item.title}>
            <div>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AcceptanceCriteria({ criteria, locale }: { criteria: string[]; locale: Locale }) {
  const english = [
    "Evidence table includes source, metric, window, entity, and rule reason.",
    "Approved state persists after refresh and suppresses duplicate planning output.",
    "No Sprint 1 action implies live publishing or product writes."
  ];
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "验收标准" : "Acceptance criteria"}</h2>
      </div>
      <ul className="check-list">
        {(locale === "zh" ? criteria : english).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function ScoreBreakdown({ components, locale }: { components: ScoreComponent[]; locale: Locale }) {
  const englishLabels: Record<string, string> = {
    搜索潜力: "Search potential",
    商品就绪度: "Product readiness",
    页面缺口: "Page gap",
    执行难度: "Execution ease"
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "评分拆解" : "Score breakdown"}</h2>
      </div>
      <div className="score-breakdown">
        {components.map((component) => (
          <div className="score-line" key={component.label}>
            <div>
              <span>{locale === "zh" ? component.label : englishLabels[component.label] ?? component.label}</span>
              <strong>
                {component.value} / 100{component.weight ? ` · ${component.weight}%` : ""}
              </strong>
            </div>
            <div className="bar">
              <i style={{ width: `${component.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RuleTracePanel({ task, locale }: { task: TaskDetailViewModel; locale: Locale }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "规则追踪" : "Rule trace"}</h2>
      </div>
      <div className="kv-list">
        <div className="kv-row">
          <span>Rule</span>
          <strong className="mono">{task.ruleTrace.ruleId}</strong>
        </div>
        <div className="kv-row">
          <span>Version</span>
          <strong className="mono">{task.ruleTrace.version}</strong>
        </div>
        <div className="kv-row">
          <span>Dedupe</span>
          <strong className="mono">{task.ruleTrace.dedupeKey}</strong>
        </div>
        <div className="kv-row">
          <span>Run</span>
          <strong className="mono">{task.ruleTrace.runId}</strong>
        </div>
        <div className="kv-row">
          <span>{locale === "zh" ? "评分" : "Scoring"}</span>
          <strong>{locale === "zh" ? "确定性规则" : "deterministic rules"}</strong>
        </div>
      </div>
    </section>
  );
}

function RelatedEntitiesPanel({ entities, locale }: { entities: RelatedEntity[]; locale: Locale }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "相关对象" : "Related entities"}</h2>
      </div>
      <div className="rail-list">
        {entities.map((entity) => (
          <article className="rail-item" key={`${entity.kind}-${entity.title}`}>
            <h3>{entity.title}</h3>
            <p className="muted">{localizeRelatedDetail(entity, locale)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function OpportunityDetailPage({ opportunity, locale }: SharedProps & { opportunity: OpportunityDetailViewModel }) {
  return (
    <section>
      <div className="title-row">
        <div>
          <h1>{locale === "zh" ? "集合页缺口：露营咖啡机" : "Collection page gap: camping espresso makers"}</h1>
          <p className="subtitle">
            {locale === "zh" ? "机会页回答“信号是否真实”，任务页回答“如何执行”。" : "Opportunity explains whether the signal is real. Task explains how to execute."}
          </p>
        </div>
        <div className="actions">
          <button className="button danger" type="button">
            {locale === "zh" ? "拒绝机会" : "Reject opportunity"}
          </button>
          <button className="button primary" type="button">
            {locale === "zh" ? "创建任务" : "Create task"}
          </button>
        </div>
      </div>
      <div className="detail-grid">
        <div className="screen-gap">
          <section className="panel">
            <div className="panel-heading">
              <h2>{locale === "zh" ? "为什么现在" : "Why now"}</h2>
              <span className="status safe">
                {locale === "zh" ? "置信度" : "confidence"} {opportunity.confidence}
              </span>
            </div>
            <ul className="check-list">
              {(locale === "zh"
                ? opportunity.whyNow
                : [
                    "Search demand is visible: 14 related query clusters and 18.4K impressions in 28 days.",
                    "Product supply can support the page: 7 in-stock products match category and attributes.",
                    "The page graph has a gap: no matching collection page, only adjacent guides."
                  ]
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <EvidenceRowsCompact evidence={opportunity.evidence} locale={locale} />
          <RecommendedTaskPreview opportunity={opportunity} locale={locale} />
          <FalsePositiveControls opportunity={opportunity} locale={locale} />
        </div>
        <aside className="screen-gap">
          <TriggerThresholds locale={locale} />
          <RelatedEntitiesPanel entities={opportunity.relatedEntities} locale={locale} />
          <section className="panel">
            <div className="panel-heading">
              <h2>{locale === "zh" ? "规则追踪" : "Rule trace"}</h2>
            </div>
            <div className="kv-list">
              <div className="kv-row">
                <span>Rule ID</span>
                <strong className="mono">{opportunity.ruleTrace.ruleId}</strong>
              </div>
              <div className="kv-row">
                <span>Rule version</span>
                <strong className="mono">{opportunity.ruleTrace.version}</strong>
              </div>
              <div className="kv-row">
                <span>Dedupe key</span>
                <strong className="mono">{opportunity.ruleTrace.dedupeKey}</strong>
              </div>
              <div className="kv-row">
                <span>Generated by</span>
                <strong className="mono">{opportunity.ruleTrace.runId}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function EvidenceRowsCompact({ evidence, locale }: { evidence: EvidenceRow[]; locale: Locale }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "证据行" : "Evidence rows"}</h2>
      </div>
      <table>
        <thead>
          <tr>
            <th>{locale === "zh" ? "证据类型" : "Evidence type"}</th>
            <th>{locale === "zh" ? "结论" : "Claim"}</th>
            <th>{locale === "zh" ? "指标" : "Metric"}</th>
            <th>{locale === "zh" ? "置信度" : "Confidence"}</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((row) => (
            <tr key={`${row.source}-${row.entity}`}>
              <td data-label={locale === "zh" ? "证据类型" : "Evidence type"}>
                <span className={`pill ${row.type === "search" ? "search" : row.type === "commerce" ? "commerce" : ""}`}>
                  {localizeEvidenceType(row.type, locale)}
                </span>
              </td>
              <td data-label={locale === "zh" ? "结论" : "Claim"}>{localizeClaim(row, locale)}</td>
              <td data-label={locale === "zh" ? "指标" : "Metric"}>{localizeMetric(row, locale)}</td>
              <td data-label={locale === "zh" ? "置信度" : "Confidence"}>{row.confidence ?? "0.90"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RecommendedTaskPreview({ opportunity, locale }: { opportunity: OpportunityDetailViewModel; locale: Locale }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "推荐任务预览" : "Recommended task preview"}</h2>
      </div>
      <div className="decision no-margin">
        <span className="score">{opportunity.recommendedTask.trafscore}</span>
        <div>
          <h3>{localizeTaskTitle(opportunity.recommendedTask.title, locale)}</h3>
          <p className="subtitle">
            {locale === "zh"
              ? "创建可审核任务。Sprint 1 不创建或发布页面。"
              : "Creates a reviewable task. It does not create or publish a page in Sprint 1."}
          </p>
          <div className="tag-row">
            <span className="pill safe">{locale === "zh" ? "验收预览" : "acceptance preview"}</span>
            <span className="pill mono">acceptance: 3</span>
            <span className="pill mono">evidence: 3</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function FalsePositiveControls({ opportunity, locale }: { opportunity: OpportunityDetailViewModel; locale: Locale }) {
  const english = [
    { title: "Intent mismatch", description: "Queries may be tutorial intent, not collection intent." },
    { title: "Product mismatch", description: "Products may not support the page scope." },
    { title: "Seasonality", description: "Demand may come from a short-term seasonal spike." },
    { title: "Existing page found", description: "A human confirms another page already covers the intent." }
  ];
  const controls = locale === "zh" ? opportunity.falsePositiveControls : english;
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "误判控制" : "False positive controls"}</h2>
      </div>
      <div className="control-grid">
        {controls.map((control) => (
          <div className="control-item" key={control.title}>
            <strong>{control.title}</strong>
            <p className="muted">{control.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TriggerThresholds({ locale }: { locale: Locale }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{locale === "zh" ? "触发阈值" : "Trigger thresholds"}</h2>
      </div>
      <div className="kv-list">
        <div className="kv-row">
          <span>ready products</span>
          <strong>&gt;= 5 / actual 7</strong>
        </div>
        <div className="kv-row">
          <span>matching pages</span>
          <strong>= 0 / actual 0</strong>
        </div>
        <div className="kv-row">
          <span>query impressions</span>
          <strong>&gt;= 10K / actual 18.4K</strong>
        </div>
        <div className="kv-row">
          <span>confidence</span>
          <strong>&gt;= 0.75 / actual 0.87</strong>
        </div>
      </div>
    </section>
  );
}

function IntegrationsSafetyPage({
  auditEvidence,
  integrations,
  locale,
  syncRunPreviews,
  t
}: SharedProps & {
  auditEvidence: EvidenceRow[];
  integrations: IntegrationHealth[];
  syncRunPreviews: SyncRunPreview[];
}) {
  return (
    <section>
      <div className="title-row">
        <div>
          <h1>{locale === "zh" ? "数据信任与安全" : "Data trust and safety"}</h1>
          <p className="subtitle">
            {locale === "zh"
              ? "这里确认 TrafScope 能读什么、不能写什么、最近同步是否可信。"
              : "This page confirms what TrafScope can read, what it cannot write, and whether sync data is trustworthy."}
          </p>
        </div>
        <div className="actions">
          <button className="button" type="button">
            {locale === "zh" ? "查看审计" : "View audit"}
          </button>
          <button className="button primary" type="button">
            {locale === "zh" ? "重试同步" : "Retry sync"}
          </button>
        </div>
      </div>

      <div className="banner">
        <div>
          <strong>{locale === "zh" ? "演示模式已启用" : "Demo mode active"}</strong>
          <span>
            {locale === "zh"
              ? "真实凭证未连接。所有外部写入动作关闭。WordPress 草稿创建是后续能力。"
              : "Real credentials are not connected. External writes are disabled. WordPress draft creation is future-gated."}
          </span>
        </div>
        <span className="pill safe">demo-fixture</span>
      </div>

      <section className="panel">
        <div className="panel-heading">
          <h2>{locale === "zh" ? "权限矩阵" : "Permission matrix"}</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>{locale === "zh" ? "集成" : "Integration"}</th>
              <th>{locale === "zh" ? "模式" : "Mode"}</th>
              <th>{locale === "zh" ? "权限边界" : "Permission boundary"}</th>
              <th>{locale === "zh" ? "最近同步" : "Last sync"}</th>
              <th>{locale === "zh" ? "新鲜度" : "Freshness"}</th>
              <th>{locale === "zh" ? "错误" : "Errors"}</th>
              <th>{locale === "zh" ? "动作" : "Action"}</th>
            </tr>
          </thead>
          <tbody>
            {integrations.map((integration) => (
              <tr key={integration.name}>
                <td data-label={locale === "zh" ? "集成" : "Integration"}>{integration.name}</td>
                <td data-label={locale === "zh" ? "模式" : "Mode"}>
                  <span className={`pill ${integration.name === "WooCommerce" ? "commerce" : integration.name === "Google Search Console" ? "search" : "safe"}`}>
                    {localizeIntegrationMode(integration, locale)}
                  </span>
                </td>
                <td data-label={locale === "zh" ? "权限边界" : "Permission boundary"}>{localizePermission(integration, locale)}</td>
                <td data-label={locale === "zh" ? "最近同步" : "Last sync"} className="mono">
                  {integration.lastSync}
                </td>
                <td data-label={locale === "zh" ? "新鲜度" : "Freshness"}>
                  <span className={`status ${integration.freshness === "fresh" ? "safe" : "commerce"}`}>
                    {integration.freshness === "fresh" ? t.fresh : t.degraded}
                  </span>
                </td>
                <td data-label={locale === "zh" ? "错误" : "Errors"}>{localizeErrors(integration, locale)}</td>
                <td data-label={locale === "zh" ? "动作" : "Action"}>
                  <button className="button" type="button">
                    {locale === "zh" ? integration.action : integration.action === "详情" ? "Details" : "Connect later"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel safety-panel">
        <div className="panel-heading">
          <h2>{locale === "zh" ? "安全默认值" : "Safety defaults"}</h2>
        </div>
        <div className="safety-grid">
          {[
            [locale === "zh" ? "WooCommerce 只读" : "WooCommerce read-only", locale === "zh" ? "不提供价格、库存、商品编辑入口。" : "No price, stock, or product edit controls."],
            [locale === "zh" ? "WordPress 草稿后续" : "WordPress draft future", locale === "zh" ? "草稿创建仍需后续 QA 闸门。" : "Draft creation still requires a later QA gate."],
            [locale === "zh" ? "审计日志必需" : "Audit log required", locale === "zh" ? "规划、批准、拒绝、同步都记录。" : "Planning, approve, reject, and sync are recorded."],
            [locale === "zh" ? "凭证隐藏" : "Credentials hidden", locale === "zh" ? "UI 不显示原始密钥和错误堆栈。" : "UI never shows raw keys or stack traces."]
          ].map(([title, description]) => (
            <div className="lock-row" key={title}>
              <span className="status safe">{locale === "zh" ? "已锁定" : "Locked"}</span>
              <strong>{title}</strong>
              <p className="muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel safety-panel">
        <div className="panel-heading">
          <h2>{locale === "zh" ? "同步历史" : "Sync history"}</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>{locale === "zh" ? "结果" : "Result"}</th>
              <th>{locale === "zh" ? "状态" : "Status"}</th>
              <th>{locale === "zh" ? "时间" : "Time"}</th>
            </tr>
          </thead>
          <tbody>
            {syncRunPreviews.length > 0 ? (
              syncRunPreviews.map((run) => (
                <tr key={run.id}>
                  <td data-label="Run" className="mono">
                    {run.id}
                  </td>
                  <td data-label={locale === "zh" ? "结果" : "Result"}>
                    {locale === "zh"
                      ? `${run.executionMode} / ${run.providerSteps.length} 个步骤 / 外部写入关闭`
                      : `${run.executionMode} / ${run.providerSteps.length} steps / external writes disabled`}
                  </td>
                  <td data-label={locale === "zh" ? "状态" : "Status"}>
                    <span className={`status ${run.status === "failed" ? "risk" : "commerce"}`}>{run.status}</span>
                  </td>
                  <td data-label={locale === "zh" ? "时间" : "Time"} className="mono">
                    {run.externalWriteAllowed ? "blocked" : "local"}
                  </td>
                </tr>
              ))
            ) : (
              <>
                <tr>
                  <td data-label="Run" className="mono">
                    planning-run-042
                  </td>
                  <td data-label={locale === "zh" ? "结果" : "Result"}>{locale === "zh" ? "生成 10 条有证据任务" : "Generated 10 evidence-backed tasks"}</td>
                  <td data-label={locale === "zh" ? "状态" : "Status"}>
                    <span className="status safe">{locale === "zh" ? "成功" : "Succeeded"}</span>
                  </td>
                  <td data-label={locale === "zh" ? "时间" : "Time"} className="mono">
                    13:42
                  </td>
                </tr>
                <tr>
                  <td data-label="Run" className="mono">
                    gsc-import-demo
                  </td>
                  <td data-label={locale === "zh" ? "结果" : "Result"}>{locale === "zh" ? "导入 56 行查询/页面指标" : "Loaded 56 query/page metric rows"}</td>
                  <td data-label={locale === "zh" ? "状态" : "Status"}>
                    <span className="status safe">{locale === "zh" ? "成功" : "Succeeded"}</span>
                  </td>
                  <td data-label={locale === "zh" ? "时间" : "Time"} className="mono">
                    13:35
                  </td>
                </tr>
                <tr>
                  <td data-label="Run" className="mono">
                    wordpress-page-sync
                  </td>
                  <td data-label={locale === "zh" ? "结果" : "Result"}>{locale === "zh" ? "演示模式，真实凭证未连接" : "Demo mode, real credentials not connected"}</td>
                  <td data-label={locale === "zh" ? "状态" : "Status"}>
                    <span className="status commerce">{t.degraded}</span>
                  </td>
                  <td data-label={locale === "zh" ? "时间" : "Time"} className="mono">
                    13:32
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </section>
      {auditEvidence.length > 0 && (
        <section className="panel safety-panel">
          <div className="panel-heading">
            <h2>{locale === "zh" ? "审计事件" : "Audit events"}</h2>
          </div>
          <div className="kv-list">
            {auditEvidence.slice(0, 4).map((event) => (
              <div className="kv-row" key={`${event.entity}-${event.metric}`}>
                <span>{event.metric}</span>
                <strong>{event.reason}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function UiStatesPage({ locale }: SharedProps) {
  const states = locale === "zh"
    ? [
        ["规划运行中", "运行按钮禁用，aria-live 播报任务进度。", "running"],
        ["规划失败", "显示安全错误摘要、重试动作和最近成功结果。", "failed"],
        ["未发现任务", "提供重新加载演示数据或运行规划，不暗示系统失败。", "empty"],
        ["缺少证据", "来源、指标、时间窗、原因缺失时不能批准。", "blocked"],
        ["拒绝任务保留", "拒绝任务保留可见，并抑制重复生成。", "rejected"],
        ["集成数据陈旧", "显示最近同步、受影响集成和重试详情。", "stale"]
      ]
    : [
        ["Planning running", "Run button is disabled. aria-live announces job progress.", "running"],
        ["Planning failed", "Show safe error summary, retry action, and last successful run.", "failed"],
        ["No tasks found", "Offer demo reload or planning run. Do not imply failure.", "empty"],
        ["Missing evidence", "Task cannot be approved until source, metric, window, and reason exist.", "blocked"],
        ["Rejected task retained", "Rejected tasks remain visible and suppress duplicate regeneration.", "rejected"],
        ["Integration stale", "Show last sync, affected integration, and retry details.", "stale"]
      ];

  return (
    <section>
      <div className="title-row">
        <div>
          <h1>{locale === "zh" ? "Sprint 1 UI 验收态" : "Sprint 1 UI states"}</h1>
          <p className="subtitle">
            {locale === "zh"
              ? "内部设计 QA 屏，用来检查开发审批前必须具备的状态。"
              : "Internal design QA screen for states that must exist before development approval."}
          </p>
        </div>
      </div>
      <div className="state-grid">
        {states.map(([title, description, kind]) => (
          <div className="state-card" key={title}>
            {kind === "running" ? <span className="spinner" /> : <span className={`status ${kind === "failed" || kind === "blocked" || kind === "rejected" ? "risk" : kind === "stale" ? "commerce" : ""}`}>{kind}</span>}
            <strong>{title}</strong>
            <p className="muted">{description}</p>
          </div>
        ))}
      </div>
      <section className="panel safety-panel">
        <div className="panel-heading">
          <h2>{locale === "zh" ? "缺证据阻断任务行" : "No-evidence blocked task row"}</h2>
        </div>
        <div className="banner blocked no-margin">
          <div>
            <strong>{locale === "zh" ? "任务阻断：证据不完整" : "Task blocked: evidence incomplete"}</strong>
            <span>
              {locale === "zh"
                ? "缺少 GSC 时间窗和商品匹配原因。证据契约完整前，批准按钮禁用。"
                : "Missing GSC date window and product match reason. Approval is disabled until the evidence contract is complete."}
            </span>
          </div>
          <button className="button disabled" type="button">
            {locale === "zh" ? "批准已禁用" : "Approve disabled"}
          </button>
        </div>
      </section>
    </section>
  );
}

function localizeEvidenceType(type: EvidenceRow["type"], locale: Locale) {
  const zh: Record<EvidenceRow["type"], string> = {
    search: "搜索",
    commerce: "商品",
    page_graph: "页面图谱",
    rule: "规则",
    audit: "审计"
  };
  const en: Record<EvidenceRow["type"], string> = {
    search: "Search",
    commerce: "Commerce",
    page_graph: "Page graph",
    rule: "Rule",
    audit: "Audit"
  };
  return locale === "zh" ? zh[type] : en[type];
}

function localizeEntity(row: EvidenceRow, locale: Locale) {
  if (locale === "zh") return row.entity;
  if (row.source === "WooCommerce") return "7 in-stock SKUs";
  if (row.source === "WordPress") return "Page graph";
  return row.entity;
}

function localizeMetric(row: EvidenceRow, locale: Locale) {
  if (locale === "zh") return row.metric;
  if (row.metric.includes("18.4K")) return "18.4K impressions / 352 clicks / CTR 1.9% / avg position 4.8";
  if (row.metric.includes("0.84")) return "match confidence 0.84 / readiness 86";
  if (row.metric.includes("0 个匹配集合页")) return "0 matching collection pages / 2 adjacent guides";
  if (row.metric.includes("平均排名")) return "avg position 6.8, impressions rising";
  if (row.metric.includes("11.2K")) return "11.2K impressions / CTR 1.6% / avg position 4.9";
  return row.metric;
}

function localizeReason(row: EvidenceRow, locale: Locale) {
  if (locale === "zh") return row.reason;
  if (row.reason.includes("集合页商业意图")) return "Collection/commercial intent exceeds threshold";
  if (row.reason.includes("类目")) return "Category, stock, attributes, and image checks passed";
  if (row.reason.includes("页面缺口")) return "Gap is real and internal links are available";
  return row.reason;
}

function localizeClaim(row: EvidenceRow, locale: Locale) {
  if (locale === "zh") {
    if (row.type === "search") return "露营便携咖啡机查询存在集合页意图";
    if (row.type === "commerce") return "商品池足够支撑集合页";
    return "WordPress 没有等价集合页";
  }
  if (row.type === "search") return "Camping portable espresso queries show collection intent";
  if (row.type === "commerce") return "The product pool is sufficient for a collection page";
  return "WordPress has no equivalent collection page";
}

function localizeRelatedDetail(entity: RelatedEntity, locale: Locale) {
  if (locale === "zh") return entity.detail;
  if (entity.kind === "query") return "Core query cluster";
  if (entity.kind === "product") return entity.detail;
  return "WP page / internal link candidate";
}

function localizeOpportunityTitle(title: string, locale: Locale) {
  if (locale === "zh") return title;
  return title === "集合页缺口" ? "Collection page gap" : "Ranking push";
}

function localizeOpportunitySummary(summary: string, locale: Locale) {
  if (locale === "zh") return summary;
  if (summary.includes("14 个查询")) return "14 queries, 7 in-stock products, 0 matching pages.";
  return "Page ranks 6.8 with rising impressions and stale content.";
}

function localizeIntegrationSummary(integration: IntegrationHealth, locale: Locale) {
  if (locale === "zh") {
    if (integration.name === "Google Search Console") return "演示导入，28 天窗口";
    if (integration.name === "WooCommerce") return "只读商品、分类、库存属性";
    return "草稿创建为后续能力";
  }
  if (integration.name === "Google Search Console") return "Demo import, 28-day window";
  if (integration.name === "WooCommerce") return "Read products, categories, stock attributes";
  return "Draft creation future-gated";
}

function localizeIntegrationMode(integration: IntegrationHealth, locale: Locale) {
  if (locale === "zh") return integration.mode;
  if (integration.mode === "not_connected" || integration.mode.includes("_")) return integration.mode.replace(/_/g, " ");
  if (integration.name === "Google Search Console") return "Demo import";
  if (integration.name === "WooCommerce") return "Read-only";
  return "Draft future";
}

function localizePermission(integration: IntegrationHealth, locale: Locale) {
  if (locale === "zh") return integration.permissionBoundary;
  if (integration.permissionBoundary.startsWith("Allowed:")) return integration.permissionBoundary;
  if (integration.name === "Google Search Console") return "Read queries, pages, impressions, clicks, and positions";
  if (integration.name === "WooCommerce") return "Read products, categories, and stock attributes; no price or stock writes";
  return "Draft creation is future-gated; publishing, overwrite, and delete are blocked";
}

function localizeErrors(integration: IntegrationHealth, locale: Locale) {
  if (locale === "zh") return integration.errors;
  if (integration.errors !== "无" && !integration.errors.includes("模式")) return integration.errors;
  return integration.errors === "无" ? "None" : "Demo mode, real credentials not connected";
}
