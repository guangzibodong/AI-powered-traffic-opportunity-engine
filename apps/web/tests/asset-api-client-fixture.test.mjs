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

function collectObjectKeys(value) {
  if (Array.isArray(value)) {
    return value.flatMap(collectObjectKeys);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nestedValue]) => [key, ...collectObjectKeys(nestedValue)]);
  }
  return [];
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
await apiClient.updateAsset(
  storeId,
  "asset / 100%",
  {
    api_key: "unsafe",
    asset_type: "collection_page",
    blocked_capabilities: [],
    commerce_write: true,
    content_blocks: [
      {
        body: "Safe local body",
        credential: "unsafe",
        heading: "Safe heading",
        href: "https://example.com/live",
        items: ["collection:camping-coffee"],
        publish_preview: { wordpress_draft_allowed: true },
        type: "section"
      }
    ],
    editor_note: "Local editor note",
    external_write_allowed: true,
    faq_items: [
      {
        answer: "Use a compact manual brewer.",
        href: "https://example.com/live",
        question: "Can I brew espresso outside?"
      }
    ],
    href: "https://example.com/live",
    id: "asset-unsafe",
    internal_links: ["collection:camping-coffee"],
    meta_description: "Compare camping espresso kits.",
    meta_title: "Camping espresso kits",
    permalink: "https://example.com/live",
    publish_preview: { wordpress_draft_allowed: true },
    qa_checks: [],
    review_state: "approved",
    schema_json: { "@type": "FAQPage" },
    slug: "Camping Espresso Kits",
    source_task_id: "task-unsafe",
    store_id: "store-unsafe",
    sync_run_id: "sync-unsafe",
    title: "Camping espresso kits",
    wordpress_draft_id: "wp-123"
  },
  apiBaseUrl
);

assert(fetchCalls.length === 4, "Asset API helpers should issue four fetches");

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

assert(
  fetchCalls[3].url === `${expectedBase}/assets/${encodeURIComponent("asset / 100%")}`,
  "updateAsset must encode asset path segments"
);
assert(fetchCalls[3].init?.method === "PATCH", "updateAsset must use PATCH");
assert(fetchCalls[3].init?.headers?.["Content-Type"] === "application/json", "updateAsset must send JSON content");
const updateBody = JSON.parse(fetchCalls[3].init?.body ?? "{}");
assert(updateBody.title === "Camping espresso kits", "updateAsset must preserve allowed title edits");
assert(updateBody.slug === "Camping Espresso Kits", "updateAsset must preserve allowed slug edits");
assert(updateBody.meta_title === "Camping espresso kits", "updateAsset must preserve allowed meta title edits");
assert(updateBody.meta_description === "Compare camping espresso kits.", "updateAsset must preserve allowed meta description edits");
assert(Array.isArray(updateBody.content_blocks), "updateAsset must preserve allowed content blocks");
assert(updateBody.content_blocks[0].type === "section", "updateAsset must preserve allowed content block types");
assert(updateBody.content_blocks[0].heading === "Safe heading", "updateAsset must preserve allowed content block headings");
assert(updateBody.content_blocks[0].body === "Safe local body", "updateAsset must preserve allowed content block bodies");
assert(
  updateBody.content_blocks[0].items[0] === "collection:camping-coffee",
  "updateAsset must preserve allowed content block items"
);
assert(Array.isArray(updateBody.faq_items), "updateAsset must preserve allowed FAQ items");
assert(updateBody.faq_items[0].question === "Can I brew espresso outside?", "updateAsset must preserve allowed FAQ questions");
assert(updateBody.faq_items[0].answer === "Use a compact manual brewer.", "updateAsset must preserve allowed FAQ answers");
assert(updateBody.schema_json?.["@type"] === "FAQPage", "updateAsset must preserve allowed schema preview");
assert(Array.isArray(updateBody.internal_links), "updateAsset must preserve allowed internal links");
assert(updateBody.editor_note === "Local editor note", "updateAsset must preserve allowed editor note");
const serializedUpdateBody = JSON.stringify(updateBody);
const updateBodyKeys = new Set(collectObjectKeys(updateBody));
for (const forbidden of [
  "api_key",
  "asset_type",
  "blocked_capabilities",
  "commerce_write",
  "credential",
  "external_write_allowed",
  "href",
  "id",
  "permalink",
  "publish_preview",
  "qa_checks",
  "review_state",
  "source_task_id",
  "store_id",
  "sync_run_id",
  "wordpress_draft_id"
]) {
  assert(!updateBodyKeys.has(forbidden), `updateAsset body leaked forbidden field ${forbidden}`);
}
for (const forbiddenValue of ["unsafe", "wp-123", "https://example.com/live", "sync-unsafe", "store-unsafe"]) {
  assert(!serializedUpdateBody.includes(forbiddenValue), `updateAsset body leaked forbidden value ${forbiddenValue}`);
}

const serializedCalls = JSON.stringify(fetchCalls);
for (const forbidden of ["PUT", "DELETE", "oauth", "sync", "publish", "woocommerce", "token", "secret", "password"]) {
  assert(!serializedCalls.toLowerCase().includes(forbidden.toLowerCase()), `Asset API fixture leaked ${forbidden}`);
}
assert(!("publishWordpressDraft" in apiClient), "API client must not expose WordPress draft publishing");
assert("updateAsset" in apiClient, "API client must expose safe local asset update after backend QA gates");

console.log("Asset API client fixture contract passed");
