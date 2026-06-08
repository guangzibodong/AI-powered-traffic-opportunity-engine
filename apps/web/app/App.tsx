import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  boardViewModel,
  boundaryCopy,
  integrationHealth,
  opportunityDetail,
  taskDetail
} from "../lib/mock-data";
import type {
  BoardViewModel,
  EvidenceRow,
  IntegrationHealth,
  Locale,
  Opportunity,
  OpportunityDetailViewModel,
  RelatedEntity,
  ScoreComponent,
  Task,
  TaskDetailViewModel,
  VisibleTaskStatus
} from "../lib/types";

type Screen = "board" | "opportunity" | "task" | "integrations" | "states";

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
  const t = useMessages(locale);

  return (
    <div className="app-shell">
      <NavigationRail locale={locale} screen={screen} setScreen={setScreen} t={t} />
      <main className="main">
        <TopBar locale={locale} setLocale={setLocale} />
        {screen === "board" && <TrafficOperationsPage board={boardViewModel} locale={locale} setScreen={setScreen} t={t} />}
        {screen === "task" && <TaskDetailPage task={taskDetail} locale={locale} t={t} />}
        {screen === "opportunity" && <OpportunityDetailPage opportunity={opportunityDetail} locale={locale} t={t} />}
        {screen === "integrations" && <IntegrationsSafetyPage integrations={integrationHealth} locale={locale} t={t} />}
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
  locale,
  setScreen,
  t
}: SharedProps & {
  board: BoardViewModel;
  setScreen: (screen: Screen) => void;
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
          <TaskQueue tasks={board.tasks} locale={locale} setScreen={setScreen} t={t} />
        </section>
        <aside className="side-rail">
          <DataHealthPanel integrations={board.integrations} locale={locale} t={t} />
          <OpportunityRail opportunities={board.opportunities} locale={locale} t={t} />
        </aside>
      </div>
    </section>
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

function TaskQueue({
  tasks,
  locale,
  setScreen,
  t
}: SharedProps & {
  tasks: Task[];
  setScreen: (screen: Screen) => void;
}) {
  return (
    <table className="queue-table">
      <thead>
        <tr>
          <th>{locale === "zh" ? "优先级" : "Priority"}</th>
          <th>{locale === "zh" ? "任务" : "Task"}</th>
          <th>{locale === "zh" ? "证据" : "Evidence"}</th>
          <th>{locale === "zh" ? "对象" : "Objects"}</th>
          <th>{locale === "zh" ? "状态" : "Status"}</th>
          <th>{locale === "zh" ? "动作" : "Action"}</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr key={task.id}>
            <td data-label={locale === "zh" ? "优先级" : "Priority"}>
              <span className={`score ${task.status === "rejected" ? "risk-score" : task.trafscore < 85 ? "mid" : ""}`}>{task.trafscore}</span>
            </td>
            <td data-label={locale === "zh" ? "任务" : "Task"}>
              <span className="row-title">{localizeTaskTitle(task.title, locale)}</span>
              <span className="task-meta mono">
                {task.ruleId} / rule v1
              </span>
              <div className="tag-row">
                <span className="pill search">{task.objects.queries} queries</span>
                {task.objects.products > 0 && <span className="pill commerce">{task.objects.products} SKUs</span>}
                <span className="pill">{task.objects.pages} pages</span>
              </div>
            </td>
            <td data-label={locale === "zh" ? "证据" : "Evidence"}>
              <div className="evidence-mini">
                {task.evidence.slice(0, 3).map((row) => (
                  <span key={`${task.id}-${row.source}-${row.metric}`}>{localizeEvidence(row, locale)}</span>
                ))}
              </div>
            </td>
            <td data-label={locale === "zh" ? "对象" : "Objects"}>
              <span className="mono">
                Q{task.objects.queries}/P{task.objects.products}/WP{task.objects.pages}
              </span>
            </td>
            <td data-label={locale === "zh" ? "状态" : "Status"}>
              <StatusPill status={task.status} t={t} />
            </td>
            <td data-label={locale === "zh" ? "动作" : "Action"}>
              <button
                className={`button ${task.actionLabel.includes("草稿") ? "disabled" : ""}`}
                onClick={() => (task.id === "task_001" ? setScreen("task") : undefined)}
                type="button"
              >
                {localizeAction(task, locale, t)}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusPill({ status, t }: { status: VisibleTaskStatus; t: Record<MessageKey, string> }) {
  const className = status === "rejected" ? "risk" : status === "snoozed" ? "commerce" : "safe";
  return <span className={`status ${className}`}>{t[status]}</span>;
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

function TaskDetailPage({ task, locale, t }: SharedProps & { task: TaskDetailViewModel }) {
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
          <button className="button" type="button">
            {locale === "zh" ? "稍后处理" : "Snooze"}
          </button>
          <button className="button danger" type="button">
            {locale === "zh" ? "拒绝" : "Reject"}
          </button>
          <button className="button primary" type="button">
            {locale === "zh" ? "批准任务" : "Approve task"}
          </button>
        </div>
      </div>

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

function IntegrationsSafetyPage({ integrations, locale, t }: SharedProps & { integrations: IntegrationHealth[] }) {
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
          </tbody>
        </table>
      </section>
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

function localizeTaskTitle(title: string, locale: Locale) {
  if (locale === "zh") return title;
  const map: Record<string, string> = {
    创建露营便携咖啡机集合页: "Create camping portable espresso collection page",
    刷新充电式便携咖啡机商品页: "Refresh rechargeable portable espresso product page",
    优化手压咖啡机查询组点击率: "Improve CTR for manual espresso maker query cluster",
    "创建 100 美元以下手动磨豆机集合页": "Create under-$100 manual grinder collection page"
  };
  return map[title] ?? title;
}

function localizeAction(task: Task, locale: Locale, t: Record<MessageKey, string>) {
  if (task.actionLabel.includes("草稿")) return t.draftLater;
  if (task.actionLabel === "查看") return t.inspect;
  if (task.actionLabel === "查看原因") return t.viewReason;
  return t.review;
}

function localizeEvidence(row: EvidenceRow, locale: Locale) {
  if (locale === "zh") {
    return `${row.source}：${row.metric}`;
  }
  if (row.type === "search") return `GSC: ${localizeMetric(row, locale)}`;
  if (row.type === "commerce") return "WooCommerce: in-stock products match category and attributes";
  if (row.type === "page_graph") return "WordPress: no matching collection page";
  return `${row.source}: ${row.reason}`;
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
  if (integration.name === "Google Search Console") return "Demo import";
  if (integration.name === "WooCommerce") return "Read-only";
  return "Draft future";
}

function localizePermission(integration: IntegrationHealth, locale: Locale) {
  if (locale === "zh") return integration.permissionBoundary;
  if (integration.name === "Google Search Console") return "Read queries, pages, impressions, clicks, and positions";
  if (integration.name === "WooCommerce") return "Read products, categories, and stock attributes; no price or stock writes";
  return "Draft creation is future-gated; publishing, overwrite, and delete are blocked";
}

function localizeErrors(integration: IntegrationHealth, locale: Locale) {
  if (locale === "zh") return integration.errors;
  return integration.errors === "无" ? "None" : "Demo mode, real credentials not connected";
}
