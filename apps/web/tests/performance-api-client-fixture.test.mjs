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
const assetId = "Asset 1/Collection%";
const unsafeAssetPayload = {
  asset_id: assetId,
  asset_title: "Portable espresso maker camping collection",
  blocked_capabilities: ["real_gsc_oauth", "wordpress_writes", "woocommerce_writes"],
  external_write_allowed: true,
  match_scope: "unsafe_live_match",
  mode: "asset_performance_snapshots",
  safety_scope: "unsafe_live_source",
  snapshots: [
    {
      asset_id: assetId,
      clicks: 24,
      ctr: 0.02,
      external_write_allowed: true,
      id: "asset_perf_unsafe",
      impressions: 1200,
      match_scope: "unsafe_live_match",
      page_count: 1,
      position: 4.8,
      query_count: 1,
      row_ids: ["gsc_one"],
      source: "live_gsc",
      window: "28d"
    }
  ],
  store_id: storeId,
  summary: { clicks: 24, ctr: 0.02, impressions: 1200, matching_rows: 1, position: 4.8, snapshot_count: 1 }
};
const unsafeRefreshPayload = {
  blocked_capabilities: [
    "real_gsc_oauth",
    "credential_collection",
    "external_sync_execution",
    "wordpress_draft_creation",
    "wordpress_page_updates",
    "wordpress_publish",
    "woocommerce_writes"
  ],
  external_write_allowed: true,
  mode: "performance_refresh_preview",
  safety_scope: "unsafe_live_refresh",
  snapshot_count: 1,
  source: "live_gsc",
  status: "queued",
  store_id: storeId,
  summary: { clicks: 32, ctr: 0.017391, impressions: 1840, position: 6.4, snapshot_count: 1 },
  would_call_external_gsc: true,
  would_create_wordpress_draft: true,
  would_update_wordpress_page: true,
  would_write_woocommerce: true
};

globalThis.fetch = async (url, init) => {
  fetchCalls.push({ init, url: String(url) });
  return {
    ok: true,
    async json() {
      if (String(url).includes("/performance/refresh")) {
        return unsafeRefreshPayload;
      }

      if (String(url).includes("/assets/")) {
        return unsafeAssetPayload;
      }

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
await apiClient.getAssetPerformanceSnapshots(storeId, assetId, apiBaseUrl);

assert(fetchCalls.length === 2, "Performance snapshot helpers should issue two fetches");
const expectedUrl = `${apiBaseUrl}/api/stores/${encodeURIComponent(storeId)}/performance`;
assert(fetchCalls[0].url === expectedUrl, "getPerformanceSnapshots must target the store performance endpoint");
assert((fetchCalls[0].init?.method ?? "GET") === "GET", "getPerformanceSnapshots must stay GET-only");
assert(fetchCalls[0].init?.body === undefined, "getPerformanceSnapshots must not send a body");
const expectedAssetUrl = `${apiBaseUrl}/api/stores/${encodeURIComponent(storeId)}/assets/${encodeURIComponent(
  assetId
)}/performance`;
assert(
  fetchCalls[1].url === expectedAssetUrl,
  "getAssetPerformanceSnapshots must target the encoded asset performance endpoint"
);
assert((fetchCalls[1].init?.method ?? "GET") === "GET", "getAssetPerformanceSnapshots must stay GET-only");
assert(fetchCalls[1].init?.body === undefined, "getAssetPerformanceSnapshots must not send a body");

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

const assetPreviews = adapter.mapApiAssetPerformanceSnapshotsToPreviews(unsafeAssetPayload);

assert(assetPreviews.length === 1, "Asset performance adapter should map one snapshot preview");
assert(assetPreviews[0].assetId === assetId, "Asset performance preview should preserve safe asset id");
assert(
  assetPreviews[0].matchScope === "local_asset_query_page_tokens",
  "Asset performance preview should clamp unsafe match scopes"
);
assert(assetPreviews[0].source === "Imported GSC", "Asset performance preview should hide raw source labels");
assert(assetPreviews[0].safetyScope === "local_imported_gsc_only", "Asset performance preview should clamp safety scope");
assert(assetPreviews[0].externalWriteAllowed === false, "Asset performance preview must clamp external write state");
assert(assetPreviews[0].displayClicks === "24", "Asset performance preview should format clicks");
assert(assetPreviews[0].displayImpressions === "1,200", "Asset performance preview should format impressions");
assert(assetPreviews[0].displayCtr === "2.00%", "Asset performance preview should format CTR");
assert(assetPreviews[0].displayPosition === "4.8", "Asset performance preview should format average position");

const serializedCalls = JSON.stringify(fetchCalls);
for (const forbidden of ["POST", "PATCH", "PUT", "DELETE", "oauth", "sync", "draft", "publish", "token", "secret", "password"]) {
  assert(!serializedCalls.toLowerCase().includes(forbidden), `Performance API fixture leaked ${forbidden}`);
}

const refreshResponse = await apiClient.previewPerformanceRefresh(storeId, apiBaseUrl);
assert(fetchCalls.length === 3, "Performance preview helper should issue a third fetch");
const expectedRefreshUrl = `${apiBaseUrl}/api/stores/${encodeURIComponent(storeId)}/performance/refresh`;
assert(fetchCalls[2].url === expectedRefreshUrl, "previewPerformanceRefresh must target the encoded refresh preview endpoint");
assert(fetchCalls[2].init?.method === "POST", "previewPerformanceRefresh must use POST for the local preview endpoint");
assert(fetchCalls[2].init?.body === undefined, "previewPerformanceRefresh must not send a body");
assert(refreshResponse === unsafeRefreshPayload, "previewPerformanceRefresh should return the typed API payload");

const refreshPreview = adapter.mapApiPerformanceRefreshPreviewToPreview(unsafeRefreshPayload);

assert(refreshPreview.status === "preview_only", "Performance refresh preview adapter must clamp status to preview_only");
assert(refreshPreview.safetyScope === "local_tracking_preview_only", "Performance refresh preview adapter must clamp safety scope");
assert(refreshPreview.externalWriteAllowed === false, "Performance refresh preview adapter must clamp external writes");
assert(refreshPreview.source === "Imported GSC", "Performance refresh preview adapter should hide raw source labels");
assert(refreshPreview.snapshotCount === 1, "Performance refresh preview adapter should preserve snapshot count");
assert(refreshPreview.displayClicks === "32", "Performance refresh preview adapter should format clicks");
assert(refreshPreview.displayImpressions === "1,840", "Performance refresh preview adapter should format impressions");
assert(refreshPreview.displayCtr === "1.74%", "Performance refresh preview adapter should format CTR");
assert(refreshPreview.displayPosition === "6.4", "Performance refresh preview adapter should format average position");
assert(
  refreshPreview.blockedCapabilities.includes("real_gsc_oauth"),
  "Performance refresh preview adapter must preserve blocked capability context"
);

const serializedPreview = JSON.stringify(previews);
for (const forbidden of ["unsafe_live_source", "live_gsc", "row_ids", "external_write_allowed"]) {
  assert(!serializedPreview.includes(forbidden), `Performance preview leaked raw backend field ${forbidden}`);
}
const serializedAssetPreview = JSON.stringify(assetPreviews);
for (const forbidden of ["unsafe_live_source", "unsafe_live_match", "live_gsc", "row_ids", "external_write_allowed"]) {
  assert(!serializedAssetPreview.includes(forbidden), `Asset performance preview leaked raw backend field ${forbidden}`);
}
const serializedRefreshPreview = JSON.stringify(refreshPreview);
for (const forbidden of [
  "unsafe_live_refresh",
  "live_gsc",
  "external_write_allowed",
  "would_call_external_gsc",
  "would_create_wordpress_draft",
  "would_update_wordpress_page",
  "would_write_woocommerce",
  "queued"
]) {
  assert(!serializedRefreshPreview.includes(forbidden), `Performance refresh preview leaked raw backend field ${forbidden}`);
}

console.log("Performance API client fixture contract passed");
