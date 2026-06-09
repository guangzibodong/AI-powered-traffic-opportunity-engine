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

const detailCases = [
  {
    call: () => apiClient.getImportedQuery(storeId, "query one/two%three", apiBaseUrl),
    entityId: "query one/two%three",
    path: "queries"
  },
  {
    call: () => apiClient.getImportedProduct(storeId, "product sku/50% off", apiBaseUrl),
    entityId: "product sku/50% off",
    path: "products"
  },
  {
    call: () => apiClient.getImportedPage(storeId, "page / landing%copy", apiBaseUrl),
    entityId: "page / landing%copy",
    path: "pages"
  },
  {
    call: () => apiClient.getImportedQueryCluster(storeId, "cluster/key 100%", apiBaseUrl),
    entityId: "cluster/key 100%",
    path: "query-clusters"
  },
  {
    call: () => apiClient.getImportedOpportunity(storeId, "opp/ctr 20%", apiBaseUrl),
    entityId: "opp/ctr 20%",
    path: "imported-opportunities"
  },
  {
    call: () => apiClient.getImportedTask(storeId, "task/detail read?", apiBaseUrl),
    entityId: "task/detail read?",
    path: "imported-tasks"
  }
];

for (const detailCase of detailCases) {
  await detailCase.call();
}

assert(fetchCalls.length === detailCases.length, "Imported detail helpers should each issue one fetch");

for (const [index, detailCase] of detailCases.entries()) {
  const call = fetchCalls[index];
  const expectedUrl = `${apiBaseUrl}/api/stores/${encodeURIComponent(storeId)}/${detailCase.path}/${encodeURIComponent(
    detailCase.entityId
  )}`;
  assert(call.url === expectedUrl, `Imported detail helper must encode path segments for ${detailCase.path}`);
  assert((call.init?.method ?? "GET") === "GET", `Imported detail helper must stay GET-only for ${detailCase.path}`);
  assert(call.init?.body === undefined, `Imported detail helper must not send a body for ${detailCase.path}`);
}

const serializedCalls = JSON.stringify(fetchCalls);
for (const forbidden of ["POST", "PATCH", "PUT", "DELETE", "oauth", "sync", "draft", "publish"]) {
  assert(!serializedCalls.toLowerCase().includes(forbidden.toLowerCase()), `Imported detail helper fixture leaked ${forbidden}`);
}

console.log("Imported API client fixture contract passed");
