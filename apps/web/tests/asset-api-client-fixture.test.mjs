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

async function loadApiClientModule() {
  const source = readFileSync(join(root, "lib/api-client.ts"), "utf8");
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

const apiClient = await loadApiClientModule();
const fetchCalls = [];
const apiBaseUrl = "https://api.example.test/base";
const storeId = "Store A/100%";

globalThis.fetch = async (url, init) => {
  fetchCalls.push({ init, url: String(url) });
  return {
    ok: true,
    async json() {
      return {};
    }
  };
};

await apiClient.getAssets(storeId, apiBaseUrl);
await apiClient.getAsset(storeId, "asset / 100%", apiBaseUrl);
await apiClient.createAssetFromTask(storeId, "task / approved%", apiBaseUrl);

assert(fetchCalls.length === 3, "Asset API helpers should issue three fetches");

const expectedBase = `${apiBaseUrl}/api/stores/${encodeURIComponent(storeId)}`;
assert(fetchCalls[0].url === `${expectedBase}/assets`, "getAssets must target the asset workspace list");
assert((fetchCalls[0].init?.method ?? "GET") === "GET", "getAssets must stay GET-only");
assert(fetchCalls[0].init?.body === undefined, "getAssets must not send a body");

assert(
  fetchCalls[1].url === `${expectedBase}/assets/${encodeURIComponent("asset / 100%")}`,
  "getAsset must encode asset path segments"
);
assert((fetchCalls[1].init?.method ?? "GET") === "GET", "getAsset must stay GET-only");
assert(fetchCalls[1].init?.body === undefined, "getAsset must not send a body");

assert(
  fetchCalls[2].url === `${expectedBase}/assets/from-task/${encodeURIComponent("task / approved%")}`,
  "createAssetFromTask must encode task path segments"
);
assert(fetchCalls[2].init?.method === "POST", "createAssetFromTask must use POST");
assert(fetchCalls[2].init?.body === undefined, "createAssetFromTask must not send arbitrary body content");

const serializedCalls = JSON.stringify(fetchCalls);
for (const forbidden of ["PATCH", "PUT", "DELETE", "oauth", "sync", "publish"]) {
  assert(!serializedCalls.toLowerCase().includes(forbidden.toLowerCase()), `Asset API fixture leaked ${forbidden}`);
}
assert(!("publishWordpressDraft" in apiClient), "API client must not expose WordPress draft publishing");
assert(!("updateAsset" in apiClient), "API client must not expose asset mutation before QA gates");

console.log("Asset API client fixture contract passed");
