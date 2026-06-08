export type IntentClassificationOutput = {
  query: string;
  intent: string;
  funnel_stage: string;
  modifiers: string[];
  product_attributes: string[];
  recommended_asset_type: string;
  confidence: number;
};

export type OpportunityOutput = {
  title: string;
  opportunity_type: string;
  summary: string;
  evidence: Array<{ type: string; text: string }>;
  recommended_task_type: string;
  expected_impact: string;
  confidence: number;
};

export type TaskActionPlanOutput = {
  task_title: string;
  task_category: string;
  automation_level: string;
  steps: string[];
  acceptance_criteria: string[];
};

export type AssetDraftOutput = {
  asset_type: string;
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  sections: Array<Record<string, unknown>>;
  schema_json: Record<string, unknown>;
  internal_links: string[];
};

