import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadAdapterModule() {
  const source = readFileSync(join(root, "lib/view-model-adapters.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: false
    }
  });
  const encoded = Buffer.from(outputText, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const adapter = await loadAdapterModule();

const importedTasks = adapter.mapApiImportedTasksToTasks({
  mode: "imported_tasks",
  store_id: "store-fixture",
  tasks: [
    {
      action_plan: {},
      automation_level: "one_click_apply",
      category: "unsafe_external_write",
      evidence: [],
      id: "imported-task-fixture",
      opportunity_id: "unsafe-opportunity",
      priority_score: 72,
      status: "published",
      title: "Unsafe imported task fixture"
    }
  ]
});

assert(importedTasks.length === 1, "Imported task fixture should map one task");
assert(importedTasks[0].automationLevel === "recommend_only", "Imported task fixtures must clamp automation to recommend_only");
assert(importedTasks[0].status === "new", "Imported task fixtures must clamp unsafe statuses to new");
assert(importedTasks[0].category === "collection_page", "Imported task fixtures must clamp unknown categories safely");
assert(importedTasks[0].actionLabel === "Review", "Imported task fixtures must stay review-only");

const rankingPushOpportunities = adapter.mapApiImportedOpportunitiesToOpportunities({
  mode: "imported_opportunities",
  opportunities: [
    {
      confidence: 0.8,
      dedupe_key: "store-fixture:imported:ranking_push:cluster-fixture:page-fixture",
      evidence: [
        {
          metrics: { position: 8.6, primary_query: "portable espresso maker camping" },
          text: "portable espresso maker camping averages position 8.6 with 5.2% CTR",
          type: "ranking_position"
        }
      ],
      id: "impopp_fixture",
      opportunity_type: "ranking_push",
      recommended_task_type: "ranking_push",
      rule_id: "ranking_push",
      rule_version: 1,
      score_components: { traffic_potential: 72 },
      status: "new",
      summary: "Strong CTR page can be pushed higher.",
      title: "Push ranking for portable espresso maker camping",
      trafscore: 79
    }
  ],
  store_id: "store-fixture",
  summary: { by_rule: { ranking_push: 1 }, by_task_type: { ranking_push: 1 }, opportunities: 1, source_query_clusters: 1 }
});

assert(rankingPushOpportunities.length === 1, "Ranking push opportunity fixture should map one opportunity");
assert(
  rankingPushOpportunities[0].opportunityType === "ranking_push",
  "Imported ranking push opportunities must preserve the ranking_push opportunity type"
);
assert(
  rankingPushOpportunities[0].ruleTrace.ruleId === "ranking_push",
  "Imported ranking push opportunities must preserve the ranking_push rule trace"
);

const rankingPushTasks = adapter.mapApiImportedTasksToTasks({
  mode: "imported_task_previews",
  store_id: "store-fixture",
  summary: { by_category: { ranking_push: 1 }, by_rule: { ranking_push: 1 }, source_opportunities: 1, tasks: 1 },
  tasks: [
    {
      action_plan: { steps: ["Review existing page ranking evidence and SERP intent"] },
      automation_level: "one_click_apply",
      category: "ranking_push",
      evidence: [
        {
          metrics: { position: 8.6, primary_query: "portable espresso maker camping" },
          text: "portable espresso maker camping averages position 8.6 with 5.2% CTR",
          type: "ranking_position"
        }
      ],
      id: "imported-ranking-task-fixture",
      opportunity_id: "impopp_fixture",
      priority_score: 79,
      status: "published",
      title: "Push ranking for portable espresso maker camping"
    }
  ]
});

assert(rankingPushTasks.length === 1, "Ranking push task fixture should map one task");
assert(rankingPushTasks[0].category === "ranking_push", "Imported ranking push tasks must preserve category");
assert(rankingPushTasks[0].ruleId === "ranking_push", "Imported ranking push tasks must infer the ranking_push rule id");
assert(rankingPushTasks[0].automationLevel === "recommend_only", "Imported ranking push tasks must clamp automation to recommend_only");
assert(rankingPushTasks[0].status === "new", "Imported ranking push tasks must clamp unsafe statuses to new");

const importedRows = adapter.mapApiImportedQueriesToPreviews({
  mode: "csv_import",
  queries: [
    {
      clicks: 0,
      ctr: 0.03456,
      id: "query-row-fixture",
      impressions: 987654,
      page: "",
      query: "cold brew camping kit",
      source: "csv_import",
      store_id: "store-fixture",
      window: undefined
    }
  ],
  store_id: "store-fixture"
});

assert(importedRows.length === 1, "Imported query fixture should map one row");
assert(importedRows[0].displayClicks === "0", "Imported query row clicks should use display-safe count formatting");
assert(importedRows[0].displayCtr === "3.46%", "Imported query row CTR should use percent formatting");
assert(importedRows[0].displayEvidenceSummary === "evidence 1 row / Imported GSC", "Imported query row should summarize safe evidence context");
assert(importedRows[0].displayImpressions === "987,654", "Imported query row impressions should use display-safe count formatting");
assert(importedRows[0].displayPage === "Unknown page", "Imported query row should hide empty page values behind a safe label");
assert(importedRows[0].displayPosition === "n/a", "Imported query row should use a safe position fallback");
assert(importedRows[0].source === "Imported GSC", "Imported query row should hide raw csv_import source labels");
assert(importedRows[0].window === "imported", "Imported query row should default missing windows to imported");
assert(
  importedRows[0].evidence[0].metric === "987,654 impressions / 0 clicks / CTR 3.46% / avg position n/a",
  "Imported query row evidence metrics should reuse display-safe formatting"
);

console.log("Imported adapter fixture contract passed");
