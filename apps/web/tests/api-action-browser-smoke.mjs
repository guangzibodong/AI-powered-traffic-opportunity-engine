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
  await waitForHttp(webUrl, "TrafScope web app");

  const executablePath = findBrowserExecutable();
  const browser = await chromium.launch({
    executablePath,
    headless: true
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(webUrl);
    await clickUnique(page.getByRole("button", { name: "EN" }), "language switcher");
    await expectVisible(page.getByText("Demo API connected"), "API connected banner");

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
