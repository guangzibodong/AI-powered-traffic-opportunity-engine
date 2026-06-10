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

const unsafeAssetWorkspacePayload = {
  assets: [
    {
      asset_type: "collection_page",
      blocked_capabilities: ["wordpress_draft_creation"],
      content_blocks: [{ type: "section" }],
      external_write_allowed: true,
      id: "asset-safe-qa",
      qa_checks: [
        { key: "seo", status: "passed" },
        { key: "geo", status: "pending" },
        {
          credential_hint: "token-password-secret",
          key: "oauth_token",
          metadata: { api_key: "unsafe-api-key" },
          status: "published"
        }
      ],
      review_state: "draft_candidate",
      source_task_id: "task-safe-qa",
      title: "Safe local QA draft"
    }
  ],
  blocked_capabilities: ["wordpress_draft_creation"],
  external_write_allowed: true,
  mode: "asset_draft_workspace",
  store_id: storeId
};

const assetPreviews = adapter.mapApiAssetWorkspaceToPreviews(unsafeAssetWorkspacePayload);
assert(assetPreviews.length === 1, "Asset adapter should map one local asset draft");
assert(assetPreviews[0].qaCheckCount === 3, "Asset adapter should preserve local QA check counts");
assert(assetPreviews[0].qaPendingCount === 2, "Asset adapter should count clamped unsafe QA status as pending");
assert(Array.isArray(assetPreviews[0].qaChecks), "Asset adapter should expose safe local QA check details");
assert(assetPreviews[0].qaChecks.length === 3, "Asset adapter should preserve QA check detail rows");
assert(assetPreviews[0].qaChecks[0].key === "seo", "Asset QA detail should preserve allowlisted SEO key");
assert(assetPreviews[0].qaChecks[0].status === "passed", "Asset QA detail should preserve allowlisted passed status");
assert(assetPreviews[0].qaChecks[1].key === "geo", "Asset QA detail should preserve allowlisted GEO key");
assert(assetPreviews[0].qaChecks[1].status === "pending", "Asset QA detail should preserve allowlisted pending status");
assert(
  assetPreviews[0].qaChecks[2].key === "local_review",
  "Asset QA detail should clamp unknown or credential-like QA keys"
);
assert(assetPreviews[0].qaChecks[2].status === "pending", "Asset QA detail should clamp unsafe QA statuses");
assert(assetPreviews[0].externalWriteAllowed === false, "Asset adapter must clamp external writes");

const serializedAssetPreviews = JSON.stringify(assetPreviews);
for (const forbidden of [
  "token-password-secret",
  "unsafe-api-key",
  "credential_hint",
  "metadata",
  "oauth_token",
  "published",
  "external_write_allowed"
]) {
  assert(!serializedAssetPreviews.includes(forbidden), `Asset QA preview leaked unsafe QA payload field ${forbidden}`);
}

console.log("Asset API client fixture contract passed");
