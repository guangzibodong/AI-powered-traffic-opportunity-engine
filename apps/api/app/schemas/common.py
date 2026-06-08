from typing import Literal


TaskStatus = Literal[
    "new",
    "queued",
    "drafting",
    "needs_review",
    "approved",
    "published",
    "applied",
    "tracking",
    "completed",
    "rejected",
    "archived",
]

AutomationLevel = Literal[
    "recommend_only",
    "generate_draft",
    "one_click_apply",
    "guarded_autopilot",
]

TaskCategory = Literal[
    "product_seo",
    "collection_page",
    "buying_guide",
    "comparison_page",
    "faq_schema",
    "internal_link",
    "ctr_refresh",
    "ranking_push",
    "ai_visibility",
    "merchant_listing",
    "trend_page",
    "content_refresh",
]

