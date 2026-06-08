import type { Integration, Opportunity, Task } from "./types";

export const metrics = {
  trafscoreAverage: "82.4",
  queryGaps: "31",
  productsReady: "18",
  trackedAssets: "7"
};

export const integrations: Integration[] = [
  {
    key: "woocommerce",
    name: "WooCommerce",
    description: "Products, categories, inventory",
    status: "connected"
  },
  {
    key: "wordpress",
    name: "WordPress",
    description: "Pages, posts, draft publishing",
    status: "connected"
  },
  {
    key: "gsc",
    name: "Google Search Console",
    description: "Queries, pages, clicks, positions",
    status: "pending"
  }
];

export const tasks: Task[] = [
  {
    id: "task_001",
    title: "Create Portable Espresso Makers for Camping collection page",
    category: "collection_page",
    automationLevel: "generate_draft",
    status: "new",
    trafscore: 91
  },
  {
    id: "task_002",
    title: "Refresh X1 product page for rechargeable portable espresso maker",
    category: "product_seo",
    automationLevel: "generate_draft",
    status: "needs_review",
    trafscore: 87
  },
  {
    id: "task_003",
    title: "Draft Manual vs Electric Portable Espresso Makers comparison",
    category: "comparison_page",
    automationLevel: "generate_draft",
    status: "new",
    trafscore: 81
  }
];

export const opportunities: Opportunity[] = [
  {
    id: "opp_001",
    title: "Camping espresso cluster is rising",
    summary: "Related GSC queries grew 180% over 14 days with five in-stock product matches.",
    trafscore: 91
  },
  {
    id: "opp_002",
    title: "High impressions with weak CTR",
    summary: "Rechargeable espresso query has strong impressions and title metadata can be improved.",
    trafscore: 87
  }
];

