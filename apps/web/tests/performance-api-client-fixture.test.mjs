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

async function loadModule(relativePath) {
  const source = readFileSync(join(root, relativePath), "utf8");
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

const apiClient = await loadModule("lib/api-client.ts");
const adapter = await loadModule("lib/view-model-adapters.ts");
const fetchCalls = [];
const apiBaseUrl = "https://api.example.test/base";
const storeId = "Store A/100%";

globalThis.fetch = async (url, init) => {
  fetchCalls.push({ init, url: String(url) });
  return {
    ok: true,
    async json() {
      return {
        blocked_capabilities: ["real_gsc_oauth", "wordpress_writes", "woocommerce_writes"],
        external_write_allowed: false,
        mode: "performance_snapshots",
        safety_scope: "local_imported_gsc_only",
        snapshots: [],
        store_id: storeId,
        summary: { clicks: 0, ctr: 0, impressions: 0, position: 0, snapshot_count: 0 }
      };
    }
  };
};

await apiClient.getPerformanceSnapshots(storeId, apiBaseUrl);

assert(fetchCalls.length === 1, "Performance snapshot helper should issue one fetch");
const expectedUrl = `${apiBaseUrl}/api/stores/${encodeURIComponent(storeId)}/performance`;
assert(fetchCalls[0].url === expectedUrl, "getPerformanceSnapshots must target the store performance endpoint");
assert((fetchCalls[0].init?.method ?? "GET") === "GET", "getPerformanceSnapshots must stay GET-only");
assert(fetchCalls[0].init?.body === undefined, "getPerformanceSnapshots must not send a body");

const unsafePayload = {
  blocked_capabilities: ["real_gsc_oauth"],
  external_write_allowed: true,
  mode: "performance_snapshots",
  safety_scope: "unsafe_live_source",
  snapshots: [
    {
      clicks: 32,
      ctr: 0.017391,
      external_write_allowed: true,
      id: "perf_unsafe",
      impressions: 1840,
      page_count: 2,
      position: 6.4,
      query_count: 2,
      row_ids: ["gsc_one", "gsc_two"],
      source: "live_gsc",
      window: "28d"
    }
  ],
  store_id: storeId,
  summary: { clicks: 32, ctr: 0.017391, impressions: 1840, position: 6.4, snapshot_count: 1 }
};

const previews = adapter.mapApiPerformanceSnapshotsToPreviews(unsafePayload);

assert(previews.length === 1, "Performance adapter should map one snapshot preview");
assert(previews[0].id === "perf_unsafe", "Performance preview should preserve stable ids");
assert(previews[0].source === "Imported GSC", "Performance preview should hide raw source labels");
assert(previews[0].safetyScope === "local_imported_gsc_only", "Performance preview should clamp unsafe safety scopes");
assert(previews[0].externalWriteAllowed === false, "Performance preview must clamp external write state");
assert(previews[0].displayClicks === "32", "Performance preview should format clicks");
assert(previews[0].displayImpressions === "1,840", "Performance preview should format impressions");
assert(previews[0].displayCtr === "1.74%", "Performance preview should format CTR");
assert(previews[0].displayPosition === "6.4", "Performance preview should format average position");
assert(previews[0].evidence[0].source === "Imported GSC", "Performance evidence should use safe source copy");
assert(previews[0].evidence[0].type === "search", "Performance evidence should be search evidence");

const serializedCalls = JSON.stringify(fetchCalls);
for (const forbidden of ["POST", "PATCH", "PUT", "DELETE", "oauth", "sync", "draft", "publish", "token", "secret", "password"]) {
  assert(!serializedCalls.toLowerCase().includes(forbidden), `Performance API fixture leaked ${forbidden}`);
}

const serializedPreview = JSON.stringify(previews);
for (const forbidden of ["unsafe_live_source", "live_gsc", "row_ids", "external_write_allowed"]) {
  assert(!serializedPreview.includes(forbidden), `Performance preview leaked raw backend field ${forbidden}`);
}

console.log("Performance API client fixture contract passed");
