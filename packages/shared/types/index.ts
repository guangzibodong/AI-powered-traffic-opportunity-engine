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

export type EvidenceItem = {
  type: string;
  text: string;
};

export type TrafScoreComponents = {
  trafficPotential: number;
  intentScore: number;
  productFitScore: number;
  revenueFitScore: number;
  inventoryScore: number;
  gapScore: number;
  timingScore: number;
  executionEase: number;
  confidenceScore: number;
};

