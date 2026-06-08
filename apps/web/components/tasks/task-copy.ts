import type { EvidenceRow, Locale, Task } from "../../lib/types";

export type TaskQueueMessages = {
  approved: string;
  draftLater: string;
  inspect: string;
  new: string;
  rejected: string;
  review: string;
  snoozed: string;
  viewReason: string;
};

export function getTaskQueueLabels(locale: Locale) {
  return {
    action: locale === "zh" ? "动作" : "Action",
    evidence: locale === "zh" ? "证据" : "Evidence",
    objects: locale === "zh" ? "对象" : "Objects",
    priority: locale === "zh" ? "优先级" : "Priority",
    status: locale === "zh" ? "状态" : "Status",
    task: locale === "zh" ? "任务" : "Task"
  };
}

export function localizeTaskTitle(title: string, locale: Locale) {
  if (locale === "zh") return title;

  const map: Record<string, string> = {
    创建露营便携咖啡机集合页: "Create camping portable espresso collection page",
    刷新充电式便携咖啡机商品页: "Refresh rechargeable portable espresso product page",
    优化手压咖啡机查询组点击率: "Improve CTR for manual espresso maker query cluster",
    "创建 100 美元以下手动磨豆机集合页": "Create under-$100 manual grinder collection page"
  };

  return map[title] ?? title;
}

export function localizeTaskAction(task: Task, t: TaskQueueMessages) {
  if (task.automationLevel === "draft_assist_future") return t.draftLater;
  if (task.status === "rejected") return t.viewReason;
  if (task.status === "snoozed") return t.inspect;
  return t.review;
}

export function localizeTaskEvidence(row: EvidenceRow, locale: Locale) {
  if (locale === "zh") {
    return `${row.source}：${row.metric}`;
  }

  if (row.type === "search") return `GSC: ${localizeEvidenceMetric(row, locale)}`;
  if (row.type === "commerce") return "WooCommerce: in-stock products match category and attributes";
  if (row.type === "page_graph") return "WordPress: no matching collection page";
  return `${row.source}: ${row.reason}`;
}

function localizeEvidenceMetric(row: EvidenceRow, locale: Locale) {
  if (locale === "zh") return row.metric;
  if (row.metric.includes("18.4K")) return "18.4K impressions / 352 clicks / CTR 1.9% / avg position 4.8";
  if (row.metric.includes("0.84")) return "match confidence 0.84 / readiness 86";
  if (row.metric.includes("0 个匹配集合页")) return "0 matching collection pages / 2 adjacent guides";
  if (row.metric.includes("平均排名")) return "avg position 6.8, impressions rising";
  if (row.metric.includes("11.2K")) return "11.2K impressions / CTR 1.6% / avg position 4.9";
  return row.metric;
}
