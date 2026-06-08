import type {
  BoardViewModel,
  Integration,
  IntegrationHealth,
  Opportunity,
  OpportunityDetailViewModel,
  Task,
  TaskDetailViewModel
} from "./types";

const collectionRule = {
  ruleId: "collection_page_gap",
  version: "v1",
  dedupeKey: "colgap-camping-espresso",
  runId: "planning-run-042",
  scoring: "deterministic_rules"
} as const;

const rankingRule = {
  ruleId: "ranking_push",
  version: "v1",
  dedupeKey: "rankpush-rechargeable-espresso",
  runId: "planning-run-042",
  scoring: "deterministic_rules"
} as const;

const ctrRule = {
  ruleId: "high_impression_low_ctr",
  version: "v1",
  dedupeKey: "ctr-manual-espresso",
  runId: "planning-run-042",
  scoring: "deterministic_rules"
} as const;

export const boundaryCopy = {
  zh: {
    product: "证据驱动流量运营工作台",
    scoring:
      "分数和排序来自确定性规则引擎。AI 不参与打分或排序，只能在后续解释和草稿环节辅助。"
  },
  en: {
    product: "Evidence-driven traffic workspace",
    scoring:
      "Scores and ranking come from deterministic rules. AI does not calculate scores or rank tasks; it can only assist later explanations and drafts."
  }
};

export const integrations: Integration[] = [
  {
    key: "woocommerce",
    name: "WooCommerce",
    description: "Products, categories, stock attributes",
    status: "connected"
  },
  {
    key: "wordpress",
    name: "WordPress",
    description: "Draft creation future-gated",
    status: "pending"
  },
  {
    key: "gsc",
    name: "Google Search Console",
    description: "Queries, pages, clicks, positions",
    status: "connected"
  }
];

export const integrationHealth: IntegrationHealth[] = [
  {
    name: "Google Search Console",
    mode: "演示导入",
    permissionBoundary: "只读查询、页面、曝光、点击、排名",
    lastSync: "2026-06-08 13:35",
    freshness: "fresh",
    errors: "无",
    action: "详情"
  },
  {
    name: "WooCommerce",
    mode: "只读",
    permissionBoundary: "读商品、分类、库存属性；不写价格和库存",
    lastSync: "2026-06-08 13:39",
    freshness: "fresh",
    errors: "无",
    action: "详情"
  },
  {
    name: "WordPress",
    mode: "草稿后续",
    permissionBoundary: "草稿创建为后续能力；发布、覆盖、删除被禁止",
    lastSync: "2026-06-08 13:32",
    freshness: "degraded",
    errors: "演示模式，真实凭证未连接",
    action: "稍后连接"
  }
];

export const tasks: Task[] = [
  {
    id: "task_001",
    title: "创建露营便携咖啡机集合页",
    category: "collection_page",
    automationLevel: "recommend_only",
    status: "new",
    trafscore: 91,
    ruleId: "collection_page_gap",
    objects: { queries: 14, products: 7, pages: 0 },
    actionLabel: "审核",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "portable espresso maker camping",
        metric: "18.4K 曝光 / 352 点击 / CTR 1.9% / 均排 4.8",
        window: "2026-05-11 - 2026-06-08",
        reason: "集合页商业意图超过阈值",
        confidence: 0.88
      },
      {
        type: "commerce",
        source: "WooCommerce",
        entity: "7 个在售商品",
        metric: "匹配置信度 0.84 / 就绪度 86",
        window: "2026-06-08",
        reason: "类目、库存、属性、图片检查通过",
        confidence: 0.84
      },
      {
        type: "page_graph",
        source: "WordPress",
        entity: "页面图谱",
        metric: "0 个匹配集合页 / 2 个相邻指南",
        window: "2026-06-08",
        reason: "页面缺口成立，且有内链来源",
        confidence: 0.9
      }
    ]
  },
  {
    id: "task_002",
    title: "刷新充电式便携咖啡机商品页",
    category: "ranking_push",
    automationLevel: "draft_assist_future",
    status: "approved",
    trafscore: 84,
    ruleId: "ranking_push",
    objects: { queries: 9, products: 1, pages: 1 },
    actionLabel: "草稿后续",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "rechargeable portable espresso maker",
        metric: "平均排名 6.8，曝光上涨",
        window: "2026-05-11 - 2026-06-08",
        reason: "ranking_push 阈值通过",
        confidence: 0.79
      },
      {
        type: "page_graph",
        source: "WordPress",
        entity: "product-page-x1",
        metric: "标题陈旧，FAQ 缺失，内链弱",
        window: "2026-06-08",
        reason: "页面可先刷新，不需要新建集合页"
      }
    ]
  },
  {
    id: "task_003",
    title: "优化手压咖啡机查询组点击率",
    category: "ctr_refresh",
    automationLevel: "recommend_only",
    status: "snoozed",
    trafscore: 79,
    ruleId: "high_impression_low_ctr",
    objects: { queries: 11, products: 0, pages: 1 },
    actionLabel: "查看",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "manual espresso maker",
        metric: "11.2K 曝光 / CTR 1.6% / 均排 4.9",
        window: "2026-05-11 - 2026-06-08",
        reason: "high_impression_low_ctr 阈值通过",
        confidence: 0.76
      },
      {
        type: "page_graph",
        source: "WordPress",
        entity: "manual-espresso-guide",
        metric: "标题没有匹配商业意图",
        window: "2026-06-08",
        reason: "先优化标题和摘要"
      }
    ]
  },
  {
    id: "task_004",
    title: "创建 100 美元以下手动磨豆机集合页",
    category: "collection_page",
    automationLevel: "recommend_only",
    status: "rejected",
    trafscore: 68,
    ruleId: "collection_page_gap",
    objects: { queries: 8, products: 5, pages: 0 },
    actionLabel: "查看原因",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "manual grinder under 100",
        metric: "8.6K 曝光 / CTR 2.1%",
        window: "2026-05-11 - 2026-06-08",
        reason: "查询可能存在价格型集合页意图"
      },
      {
        type: "commerce",
        source: "WooCommerce",
        entity: "5 个商品",
        metric: "匹配价格和类目",
        window: "2026-06-08",
        reason: "曾因意图不确定被拒绝"
      }
    ]
  },
  {
    id: "task_005",
    title: "Refresh Portable Espresso Maker X1 review query",
    category: "ctr_refresh",
    automationLevel: "recommend_only",
    status: "new",
    trafscore: 86,
    ruleId: "high_impression_low_ctr",
    objects: { queries: 6, products: 1, pages: 1 },
    actionLabel: "Review",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "portable espresso maker x1 review",
        metric: "2.2K impressions / 42 clicks / CTR 1.9% / avg position 8.6",
        window: "2026-05-11 - 2026-06-08",
        reason: "Existing product page has strong impressions but low CTR.",
        confidence: 0.81
      },
      {
        type: "page_graph",
        source: "WordPress",
        entity: "page-x1",
        metric: "Product page title and FAQ can be refreshed",
        window: "2026-06-08",
        reason: "No product write is required in Sprint 1."
      }
    ]
  },
  {
    id: "task_006",
    title: "Improve compact manual burr grinder CTR",
    category: "ctr_refresh",
    automationLevel: "recommend_only",
    status: "new",
    trafscore: 83,
    ruleId: "high_impression_low_ctr",
    objects: { queries: 5, products: 1, pages: 1 },
    actionLabel: "Review",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "compact manual burr grinder",
        metric: "2.6K impressions / 55 clicks / CTR 2.1% / avg position 9.2",
        window: "2026-05-11 - 2026-06-08",
        reason: "high_impression_low_ctr threshold passed.",
        confidence: 0.8
      }
    ]
  },
  {
    id: "task_007",
    title: "Push camping pour over coffee guide",
    category: "ranking_push",
    automationLevel: "draft_assist_future",
    status: "new",
    trafscore: 82,
    ruleId: "ranking_push",
    objects: { queries: 7, products: 3, pages: 1 },
    actionLabel: "Draft later",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "camping pour over coffee",
        metric: "2.1K impressions / 126 clicks / CTR 6.0% / avg position 9.8",
        window: "2026-05-11 - 2026-06-08",
        reason: "Page is within striking distance and can receive internal-link support.",
        confidence: 0.78
      }
    ]
  },
  {
    id: "task_008",
    title: "Expand best portable espresso maker camping guide",
    category: "ranking_push",
    automationLevel: "draft_assist_future",
    status: "new",
    trafscore: 81,
    ruleId: "ranking_push",
    objects: { queries: 8, products: 5, pages: 1 },
    actionLabel: "Draft later",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "best portable espresso maker camping",
        metric: "2.4K impressions / 146 clicks / CTR 6.1% / avg position 7.9",
        window: "2026-05-11 - 2026-06-08",
        reason: "ranking_push threshold passed.",
        confidence: 0.79
      }
    ]
  },
  {
    id: "task_009",
    title: "Refresh travel cold brew bottle snippet",
    category: "ctr_refresh",
    automationLevel: "recommend_only",
    status: "new",
    trafscore: 78,
    ruleId: "high_impression_low_ctr",
    objects: { queries: 4, products: 1, pages: 1 },
    actionLabel: "Review",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "travel cold brew bottle",
        metric: "1.45K impressions / 24 clicks / CTR 1.7% / avg position 11.1",
        window: "2026-05-11 - 2026-06-08",
        reason: "CTR is below threshold while ranking is still visible.",
        confidence: 0.74
      }
    ]
  },
  {
    id: "task_010",
    title: "Push manual coffee grinder for camping page",
    category: "ranking_push",
    automationLevel: "draft_assist_future",
    status: "new",
    trafscore: 77,
    ruleId: "ranking_push",
    objects: { queries: 6, products: 2, pages: 1 },
    actionLabel: "Draft later",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "best manual coffee grinder for camping",
        metric: "1.6K impressions / 74 clicks / CTR 4.6% / avg position 14.1",
        window: "2026-05-11 - 2026-06-08",
        reason: "Ranking can be pushed with comparison content and internal links.",
        confidence: 0.73
      }
    ]
  },
  {
    id: "task_011",
    title: "Refresh insulated travel coffee mug CTR",
    category: "ctr_refresh",
    automationLevel: "recommend_only",
    status: "new",
    trafscore: 75,
    ruleId: "high_impression_low_ctr",
    objects: { queries: 3, products: 1, pages: 1 },
    actionLabel: "Review",
    evidence: [
      {
        type: "search",
        source: "GSC",
        entity: "insulated travel coffee mug",
        metric: "1.84K impressions / 36 clicks / CTR 2.0% / avg position 10.4",
        window: "2026-05-11 - 2026-06-08",
        reason: "Title and meta refresh can be reviewed without product writes.",
        confidence: 0.71
      }
    ]
  }
];

export const taskDetail: TaskDetailViewModel = {
  ...tasks[0],
  subtitle: "该任务成立，因为搜索需求、商品就绪度、页面缺口三个阈值均通过。",
  actionPlan: [
    {
      title: "批准任务状态",
      description: "将任务从新任务改为已批准。Sprint 1 不创建页面、商品或 WordPress 草稿。"
    },
    {
      title: "准备结构化草稿计划",
      description: "记录标题意图、商品集合、FAQ 意图和内链目标，供后续草稿审核使用。"
    },
    {
      title: "后续创建效果基线",
      description: "后续 Sprint 记录 GSC 基线，并在执行后对比效果。"
    }
  ],
  acceptanceCriteria: [
    "证据表包含来源、指标、时间窗、对象和规则原因。",
    "已批准状态刷新后保留，并抑制重复规划结果。",
    "Sprint 1 没有任何动作暗示线上发布或商品写入。"
  ],
  scoreComponents: [
    { label: "搜索潜力", value: 92, weight: 35 },
    { label: "商品就绪度", value: 86, weight: 25 },
    { label: "页面缺口", value: 94, weight: 25 },
    { label: "执行难度", value: 78, weight: 15 }
  ],
  ruleTrace: collectionRule,
  relatedEntities: [
    { kind: "query", title: "portable espresso maker camping", detail: "查询组核心词" },
    { kind: "product", title: "TrailBrew Pro 450ml", detail: "SKU TB-450 / in stock" },
    { kind: "page", title: "Outdoor coffee guide", detail: "WP page / internal link candidate" }
  ]
};

export const opportunities: Opportunity[] = [
  {
    id: "opp_001",
    title: "集合页缺口",
    opportunityType: "collection_page_gap",
    summary: "14 个查询，7 个在售商品，0 个匹配页面。",
    trafscore: 91,
    confidence: 0.87,
    ruleTrace: collectionRule,
    scoreComponents: taskDetail.scoreComponents,
    relatedEntities: taskDetail.relatedEntities
  },
  {
    id: "opp_002",
    title: "排名推动",
    opportunityType: "ranking_push",
    summary: "页面排名 6.8，曝光上涨，内容陈旧。",
    trafscore: 84,
    confidence: 0.79,
    ruleTrace: rankingRule,
    scoreComponents: [
      { label: "搜索潜力", value: 84 },
      { label: "页面刷新价值", value: 82 }
    ],
    relatedEntities: [
      { kind: "query", title: "rechargeable portable espresso maker", detail: "9 queries" },
      { kind: "page", title: "Rechargeable espresso product page", detail: "WP1" }
    ]
  }
];

export const opportunityDetail: OpportunityDetailViewModel = {
  ...opportunities[0],
  whyNow: [
    "搜索需求已出现：14 个相关查询组，28 天曝光 18.4K。",
    "商品供给能支撑页面：7 个在售商品匹配类目和属性。",
    "页面图谱存在空缺：没有匹配集合页，只有相邻指南。"
  ],
  evidence: tasks[0].evidence,
  falsePositiveControls: [
    { title: "意图不匹配", description: "查询可能是教程意图，不是集合页意图。" },
    { title: "商品不匹配", description: "商品可能无法支撑页面范围。" },
    { title: "季节性", description: "需求可能来自短期季节波动。" },
    { title: "已有页面", description: "人工确认已有页面覆盖该意图。" }
  ],
  recommendedTask: {
    id: tasks[0].id,
    title: tasks[0].title,
    trafscore: tasks[0].trafscore,
    ruleId: tasks[0].ruleId
  }
};

export const boardViewModel: BoardViewModel = {
  storeName: "Outdoor Coffee Gear Demo Store",
  fixtureLabel: "GSC 演示数据",
  planningRun: {
    runId: "planning-run-042",
    lastSuccessfulAt: "2026-06-08 13:42",
    currentState: "ready",
    generatedTasks: 11
  },
  metrics: {
    priorityAverage: 82,
    queryGaps: 37,
    productsReady: 128,
    trackedAssets: 9
  },
  tasks,
  opportunities,
  integrations: integrationHealth
};

export const metrics = {
  trafscoreAverage: String(boardViewModel.metrics.priorityAverage),
  queryGaps: String(boardViewModel.metrics.queryGaps),
  productsReady: String(boardViewModel.metrics.productsReady),
  trackedAssets: String(boardViewModel.metrics.trackedAssets)
};

void ctrRule;
