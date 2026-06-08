export type TaskStatus =
  | "new"
  | "queued"
  | "drafting"
  | "needs_review"
  | "approved"
  | "published"
  | "applied"
  | "tracking"
  | "completed"
  | "rejected"
  | "archived";

export type AutomationLevel = "recommend_only" | "generate_draft" | "one_click_apply" | "guarded_autopilot";

export type TaskCategory =
  | "product_seo"
  | "collection_page"
  | "buying_guide"
  | "comparison_page"
  | "faq_schema"
  | "internal_link"
  | "ctr_refresh"
  | "ranking_push"
  | "ai_visibility"
  | "merchant_listing"
  | "trend_page"
  | "content_refresh";

export type Task = {
  id: string;
  title: string;
  category: TaskCategory;
  automationLevel: AutomationLevel;
  status: TaskStatus;
  trafscore: number;
};

export type Opportunity = {
  id: string;
  title: string;
  summary: string;
  trafscore: number;
};

export type Integration = {
  key: "woocommerce" | "wordpress" | "gsc";
  name: string;
  description: string;
  status: "connected" | "pending" | "not_connected";
};

