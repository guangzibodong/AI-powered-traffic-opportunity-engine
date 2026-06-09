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
