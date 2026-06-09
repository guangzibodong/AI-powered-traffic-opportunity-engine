import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const repoRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const apiRoot = join(repoRoot, "apps", "api");
const webRoot = join(repoRoot, "apps", "web");
const storeId = "store-demo-outdoor-coffee";
const taskTitle = "Create collection page for Portable Espresso Maker For Camping";
const taskId = "task_001";

const apiPort = Number(process.env.TRAFSCOPE_API_ACTION_API_PORT ?? 8120);
const webPort = Number(process.env.TRAFSCOPE_API_ACTION_WEB_PORT ?? 5177);
const apiUrl = `http://127.0.0.1:${apiPort}`;
const webUrl = `http://127.0.0.1:${webPort}`;

const importedGscCsv = `Query,Page,Clicks,Impressions,CTR,Position
portable espresso maker camping,https://example.com/camping-espresso,24,1200,2.0%,4.8
camping portable espresso machine,https://example.com/camping-espresso,18,800,2.25%,5.2
camping pour over kit,https://example.com/camping-pour-over,20,1100,1.8%,6.1
trail cold brew bottle,https://example.com/trail-cold-brew,16,1050,1.5%,7.4
`;

const importedProducts = [
  {
    attributes: [{ name: "Use case", options: ["Camping", "Espresso"] }],
    categories: [{ name: "Camping Coffee" }],
    id: 101,
    name: "Trail Brew Portable Espresso Maker",
    slug: "trail-brew-portable-espresso-maker",
    status: "publish",
    stock_status: "instock"
  },
  {
    attributes: [{ name: "Use case", options: ["Camping", "Manual brew"] }],
    categories: [{ name: "Camping Coffee" }],
    id: 102,
    name: "Camp Kettle Pour Over Kit",
    slug: "camp-kettle-pour-over-kit",
    status: "publish",
    stock_status: "instock"
  },
  {
    attributes: [{ name: "Use case", options: ["Camping", "Cold brew"] }],
    categories: [{ name: "Camping Coffee" }],
    id: 103,
    name: "Trail Cold Brew Bottle",
    slug: "trail-cold-brew-bottle",
    status: "publish",
    stock_status: "instock"
  }
];

const importedPages = [
  {
    excerpt: { rendered: "Portable espresso makers for camp coffee." },
    id: 301,
    link: "https://example.com/camping-espresso",
    slug: "camping-espresso",
    status: "publish",
    title: { rendered: "Camping Espresso Collection" },
    type: "page",
    yoast_head_json: {
      description: "Compare portable espresso makers for camping.",
      robots: { index: "index" },
      title: "Camping Espresso Makers"
    }
  },
  {
    excerpt: { rendered: "Manual camp coffee brewing kits." },
    id: 302,
    link: "https://example.com/camping-pour-over",
    slug: "camping-pour-over",
    status: "publish",
    title: { rendered: "Camping Pour Over Guide" },
    type: "page",
    yoast_head_json: {
      description: "Choose pour over kits for camp coffee.",
      robots: { index: "index" },
      title: "Camping Pour Over Guide"
    }
  },
  {
    excerpt: { rendered: "Cold brew bottles for travel." },
    id: 303,
    link: "https://example.com/trail-cold-brew",
    slug: "trail-cold-brew",
    status: "publish",
    title: { rendered: "Trail Cold Brew Bottles" },
    type: "page",
    yoast_head_json: {
      description: "Compare cold brew bottles for trail coffee.",
      robots: { index: "index" },
      title: "Trail Cold Brew Bottles"
    }
  }
];

const managedProcesses = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function spawnManaged(name, command, args, options) {
  const logs = [];
  const child = spawn(command, args, {
    ...options,
    env: { ...process.env, ...options.env },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => logs.push(`[${name}:stdout] ${chunk.toString()}`));
  child.stderr.on("data", (chunk) => logs.push(`[${name}:stderr] ${chunk.toString()}`));
  managedProcesses.push({ child, logs, name });
  return { child, logs, name };
}

async function waitForHttp(url, label) {
  const deadline = Date.now() + 30_000;
  let lastError = "";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for ${label}: ${lastError}`);
}

async function clickUnique(locator, label) {
  const count = await locator.count();
  assert(count === 1, `Expected one ${label}, found ${count}`);
  await locator.click();
}

async function expectVisible(locator, label) {
  await locator.first().waitFor({ state: "visible", timeout: 10_000 });
  const count = await locator.count();
  assert(count >= 1, `Expected visible ${label}, found none`);
}

async function postJson(url, body, label) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  });
  assert(response.ok, `${label} failed with ${response.status}: ${await response.text()}`);
}

async function seedImportedPreviewFixtures(currentApiUrl, currentStoreId) {
  const storePath = `${currentApiUrl}/api/stores/${currentStoreId}`;
  await postJson(`${storePath}/queries/import-csv`, { csv_text: importedGscCsv, window: "28d" }, "GSC fixture import");
  await postJson(`${storePath}/products/import-woocommerce`, { products: importedProducts }, "Woo fixture import");
  await postJson(`${storePath}/pages/import-wordpress`, { pages: importedPages }, "WordPress fixture import");
}

function findBrowserExecutable() {
  const candidates = [
    process.env.TRAFSCOPE_BROWSER_EXECUTABLE,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/microsoft-edge"
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

async function runSmoke() {
  const python = process.env.TRAFSCOPE_PYTHON ?? "python";
  const viteBin = join(webRoot, "node_modules", "vite", "bin", "vite.js");
  assert(existsSync(viteBin), `Vite binary not found at ${viteBin}`);

  spawnManaged("api", python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(apiPort)], {
    cwd: apiRoot,
    env: {
      CORS_ORIGINS: webUrl
    }
  });

  spawnManaged("web", process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], {
    cwd: webRoot,
    env: {
      VITE_API_BASE_URL: apiUrl,
      VITE_USE_API_BOARD: "true"
    }
  });

  await waitForHttp(`${apiUrl}/api/stores/${storeId}/tasks`, "TrafScope API");
  await seedImportedPreviewFixtures(apiUrl, storeId);
  await waitForHttp(webUrl, "TrafScope web app");

  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({
    executablePath,
    headless: true
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const importedPreviewRequests = [];

    page.on("request", (request) => {
      const url = request.url();
      if (
        url.includes("/imported-graph") ||
        url.includes("/queries") ||
        url.includes("/products") ||
        url.includes("/pages") ||
        url.includes("/imported-opportunities") ||
        url.includes("/imported-tasks")
      ) {
        importedPreviewRequests.push({ method: request.method(), url });
      }
    });

    await page.goto(webUrl);
    await clickUnique(page.getByRole("button", { name: "EN" }), "language switcher");
    await expectVisible(page.getByText("read-only imported previews"), "read-only imported preview badge");
    await expectVisible(page.getByText("Graph-linked clusters"), "graph-linked cluster metric");
    await expectVisible(page.getByText("Query rows"), "imported query row count metric");
    await expectVisible(page.getByText("Catalog products"), "imported catalog product count metric");
    await expectVisible(page.getByText("Catalog pages"), "imported catalog page count metric");
    await expectVisible(page.getByText("portable espresso maker camping"), "imported query cluster");
    await expectVisible(page.getByText("window 28d"), "imported query row window label");
    await expectVisible(page.getByText("Trail Brew Portable Espresso Maker"), "imported product row");
    await expectVisible(page.getByText("Camping Espresso Collection"), "imported page row");
    await expectVisible(page.getByText("1 more catalog products"), "catalog product overflow indicator");
    await expectVisible(page.getByText("1 more catalog pages"), "catalog page overflow indicator");
    await expectVisible(page.getByText("1 more query clusters"), "query cluster overflow indicator");
    await expectVisible(page.getByText("2 more query rows"), "query row overflow indicator");
    await expectVisible(page.getByText("1 more opportunity previews"), "opportunity preview overflow indicator");
    await expectVisible(page.getByText("1 more task previews"), "task preview overflow indicator");
    await expectVisible(page.getByText("recommend_only"), "recommend-only imported task preview");

    for (const target of ["/imported-graph", "/queries", "/products", "/pages", "/imported-opportunities", "/imported-tasks"]) {
      assert(
        importedPreviewRequests.some((request) => request.method === "GET" && request.url.includes(target)),
        `Imported preview endpoint was not read with GET: ${target}`
      );
    }

    const unsafeImportedRequests = importedPreviewRequests.filter((request) => request.method !== "GET");
    assert(
      unsafeImportedRequests.length === 0,
      `Imported preview endpoints must be read-only GETs: ${JSON.stringify(unsafeImportedRequests)}`
    );

    const importedPanel = page.locator(".imported-preview-panel");
    assert((await importedPanel.locator("button").count()) === 0, "Imported preview panel must not render action buttons");
    const importedPanelText = (await importedPanel.textContent()) ?? "";
    for (const forbidden of [
      "Retry sync",
      "Connect later",
      "Approve task",
      "Publish",
      "Apply",
      "Create task",
      "Run planning",
      "credential",
      "price edit",
      "stock edit",
      "product edit",
      "commerce write"
    ]) {
      assert(!importedPanelText.includes(forbidden), `Imported preview panel exposes unsafe control copy: ${forbidden}`);
    }

    const resilientPage = await context.newPage();
    await resilientPage.route("**/api/stores/**", async (route) => {
      const url = route.request().url();
      if (
        url.includes("/imported-graph") ||
        url.includes("/queries") ||
        url.includes("/products") ||
        url.includes("/pages") ||
        url.includes("/imported-opportunities") ||
        url.includes("/imported-tasks")
      ) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });
    await resilientPage.goto(webUrl);
    await clickUnique(resilientPage.getByRole("button", { name: "EN" }), "resilient language switcher");
    await expectVisible(resilientPage.getByText("Imported previews unavailable"), "resilient imported preview fallback");
    assert(
      (await resilientPage.locator(".imported-preview-panel button").count()) === 0,
      "Resilient imported preview fallback must not render action buttons"
    );
    await resilientPage.close();

    const catalogFailurePage = await context.newPage();
    await catalogFailurePage.route("**/api/stores/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/products") || url.endsWith("/pages")) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });
    await catalogFailurePage.goto(webUrl);
    await clickUnique(catalogFailurePage.getByRole("button", { name: "EN" }), "catalog failure language switcher");
    await expectVisible(catalogFailurePage.getByText("read-only imported previews"), "catalog failure imported preview badge");
    await expectVisible(catalogFailurePage.getByText("Catalog reads unavailable"), "catalog failure unavailable message");
    await expectVisible(catalogFailurePage.getByText("Graph-linked clusters"), "catalog failure graph metric");
    await expectVisible(catalogFailurePage.getByText("portable espresso maker camping"), "catalog failure imported query cluster");
    await expectVisible(catalogFailurePage.getByText("recommend_only"), "catalog failure recommend-only task preview");
    assert(
      (await catalogFailurePage.locator(".imported-preview-panel button").count()) === 0,
      "Catalog-only preview failure must not render action buttons"
    );
    await catalogFailurePage.close();

    const queryRowFailurePage = await context.newPage();
    await queryRowFailurePage.route("**/api/stores/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/queries")) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });
    await queryRowFailurePage.goto(webUrl);
    await clickUnique(queryRowFailurePage.getByRole("button", { name: "EN" }), "query row failure language switcher");
    await expectVisible(queryRowFailurePage.getByText("read-only imported previews"), "query row failure imported preview badge");
    await expectVisible(queryRowFailurePage.getByText("Query rows unavailable"), "query row failure unavailable message");
    await expectVisible(queryRowFailurePage.getByText("Graph-linked clusters"), "query row failure graph metric");
    await expectVisible(queryRowFailurePage.getByText("portable espresso maker camping"), "query row failure imported query cluster");
    await expectVisible(queryRowFailurePage.getByText("Trail Brew Portable Espresso Maker"), "query row failure imported product row");
    assert(
      (await queryRowFailurePage.locator(".imported-preview-panel button").count()) === 0,
      "Query-row-only preview failure must not render action buttons"
    );
    await queryRowFailurePage.close();

    const firstTaskRow = page.locator("tr").filter({ hasText: taskTitle });
    assert((await firstTaskRow.count()) === 1, "Expected first demo task row to be visible");
    await clickUnique(firstTaskRow.getByRole("button", { name: "Draft later" }), "first task action");
    await expectVisible(page.getByRole("heading", { name: "Approve this collection-page task?" }), "Task Detail heading");

    await clickUnique(page.getByRole("button", { name: "Approve task" }), "approve action");
    await expectVisible(page.getByText("Review state synced"), "synced feedback");
    await expectVisible(page.getByText("No WordPress draft or product data was changed."), "safe synced copy");

    const unsafeResponse = await page.evaluate(
      async ({ apiUrl: currentApiUrl, storeId: currentStoreId, taskId: currentTaskId }) => {
        const response = await fetch(`${currentApiUrl}/api/stores/${currentStoreId}/tasks/${currentTaskId}`, {
          body: JSON.stringify({ status: "published" }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH"
        });
        return { body: await response.text(), status: response.status };
      },
      { apiUrl, storeId, taskId }
    );
    assert(unsafeResponse.status === 400, `Unsafe status should return 400, got ${unsafeResponse.status}`);
    assert(unsafeResponse.body.includes("Unsupported Sprint 1 demo task status"), "Unsafe status detail missing");

    await clickUnique(page.getByRole("button", { name: "B Board" }), "board navigation");
    const approvedTaskRow = page.locator("tr").filter({ hasText: taskTitle });
    await expectVisible(approvedTaskRow.getByText("Approved"), "approved board status");
    await clickUnique(approvedTaskRow.getByRole("button", { name: "Draft later" }), "approved task action");

    const taskPatchPattern = "**/api/stores/**/tasks/**";
    const failPatchRoute = async (route) => {
      if (route.request().method() === "PATCH") {
        await route.abort("failed");
        return;
      }

      await route.continue();
    };

    await page.route(taskPatchPattern, failPatchRoute);
    await clickUnique(page.getByRole("button", { name: "Reject" }), "reject action");
    await expectVisible(page.getByText("API unavailable"), "fallback feedback");
    await expectVisible(page.getByRole("button", { name: "Retry sync" }), "retry sync action");
    await expectVisible(page.getByRole("button", { name: "Keep local" }), "keep local action");

    await page.unroute(taskPatchPattern, failPatchRoute);
    await clickUnique(page.getByRole("button", { name: "Retry sync" }), "retry sync action");
    await expectVisible(page.getByText("Review state synced"), "retry synced feedback");
    await expectVisible(page.getByText("Rejected"), "rejected detail status");

    await page.route(taskPatchPattern, failPatchRoute);
    await clickUnique(page.getByRole("button", { name: "Snooze" }), "snooze action");
    await expectVisible(page.getByText("API unavailable"), "snooze fallback feedback");
    await clickUnique(page.getByRole("button", { name: "Keep local" }), "keep local confirmation");
    await expectVisible(page.getByText("Review state saved locally"), "local saved feedback");
    await expectVisible(page.getByText("Snoozed"), "local snoozed detail status");

    const apiDetailAfterKeepLocal = await page.evaluate(
      async ({ apiUrl: currentApiUrl, storeId: currentStoreId, taskId: currentTaskId }) => {
        const response = await fetch(`${currentApiUrl}/api/stores/${currentStoreId}/tasks/${currentTaskId}`);
        return response.json();
      },
      { apiUrl, storeId, taskId }
    );
    assert(apiDetailAfterKeepLocal.task.status === "rejected", "Keep local must not mutate API state");

    await page.unroute(taskPatchPattern, failPatchRoute);
    await context.close();
  } finally {
    await browser.close();
  }
}

async function cleanup() {
  for (const { child } of managedProcesses.reverse()) {
    if (!child.killed) child.kill();
  }

  await delay(250);
}

try {
  await runSmoke();
  console.log("API task action browser smoke passed");
} catch (error) {
  for (const { logs, name } of managedProcesses) {
    const tail = logs.slice(-20).join("");
    if (tail) console.error(`\n--- ${name} log tail ---\n${tail}`);
  }

  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
} finally {
  await cleanup();
}
