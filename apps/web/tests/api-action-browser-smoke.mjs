import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
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
const desktopAssetEditorScreenshotPath = join(
  repoRoot,
  "docs",
  "design-mockups",
  "screenshots",
  "local-asset-editor-desktop-en.png"
);
const mobileAssetEditorScreenshotPath = join(
  repoRoot,
  "docs",
  "design-mockups",
  "screenshots",
  "local-asset-editor-mobile-zh.png"
);

const importedGscCsv = `Query,Page,Clicks,Impressions,CTR,Position
portable espresso maker camping,https://example.com/camping-espresso,24,1200,2.0%,4.8
camping portable espresso machine,https://example.com/camping-espresso,18,800,2.25%,5.2
camping pour over kit,https://example.com/camping-pour-over,20,1100,1.8%,6.1
trail cold brew bottle,https://example.com/trail-cold-brew,16,1050,1.5%,7.4
best camp coffee grinder,https://example.com/search/best-camp-coffee-grinder,17,850,2.0%,9.2
`;

const importedProducts = [
  {
    attributes: [{ name: "Use case", options: ["Camping", "Espresso"] }],
    categories: [{ name: "Camping Coffee" }],
    id: 101,
    name: "Trail Brew Portable Espresso Maker",
    permalink: "https://example.com/product/trail-brew-portable-espresso-maker",
    slug: "trail-brew-portable-espresso-maker",
    status: "publish",
    stock_status: "instock"
  },
  {
    attributes: [{ name: "Use case", options: ["Camp", "Camping", "Coffee", "Grinder", "Manual brew"] }],
    categories: [{ name: "Camping Coffee" }],
    id: 102,
    name: "Camp Kettle Pour Over Kit",
    permalink: "https://example.com/product/camp-kettle-pour-over-kit",
    slug: "camp-kettle-pour-over-kit",
    status: "publish",
    stock_status: "instock"
  },
  {
    attributes: [{ name: "Use case", options: ["Camp", "Camping", "Cold brew", "Coffee", "Grinder"] }],
    categories: [{ name: "Camping Coffee" }],
    id: 103,
    name: "Trail Cold Brew Bottle",
    permalink: "https://example.com/product/trail-cold-brew-bottle",
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

function assertScreenshotArtifact(path, label) {
  assert(existsSync(path), `${label} screenshot artifact missing at ${path}`);
  const { size } = statSync(path);
  assert(size > 10_000, `${label} screenshot artifact is unexpectedly small: ${size} bytes`);
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

async function assertImportedPreviewPanelIsReadOnly(page, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  await expectVisible(importedPanel, `${label} imported preview panel`);

  const safetyScope = await importedPanel.getAttribute("data-safety-scope");
  assert(
    safetyScope === "read-only-imported-preview",
    `${label} imported preview panel must declare a read-only safety scope`
  );

  const interactiveSelector = [
    "button",
    "a",
    "form",
    "input",
    "select",
    "textarea",
    "[href]",
    "[role='button']",
    "[role='link']"
  ].join(", ");
  const interactiveCount = await importedPanel.locator(interactiveSelector).count();
  assert(
    interactiveCount === 0,
    `${label} imported preview panel must not render interactive controls, role controls, or href navigation`
  );

  const importedPanelText = ((await importedPanel.textContent()) ?? "").toLowerCase();
  const forbiddenCopyPatterns = [
    /\boauth\b/,
    /\bsync\b/,
    /\bconnect\b/,
    /\bdraft\b/,
    /\bpublish\b/,
    /\bedit\b/,
    /\bapply\b/,
    /\bapprove\b/,
    /\breject\b/,
    /\bsnooze\b/,
    /\bretry\b/,
    /\bcredential\b/,
    /\bwrite\b/,
    /create task/,
    /run planning/
  ];
  for (const pattern of forbiddenCopyPatterns) {
    assert(
      !pattern.test(importedPanelText),
      `${label} imported preview panel exposes unsafe action copy: ${pattern}`
    );
  }
}

async function assertPerformanceSnapshotPanelIsReadOnly(page, label) {
  const performancePanel = page.locator(".performance-snapshot-panel");
  await expectVisible(performancePanel, `${label} performance snapshot panel`);
  await waitForPerformanceSnapshotState(performancePanel, "ready", 1, label);

  const safetyScope = await performancePanel.getAttribute("data-safety-scope");
  const externalWriteAllowed = await performancePanel.getAttribute("data-external-write-allowed");
  const blockedCapabilityCount = Number(await performancePanel.getAttribute("data-blocked-capability-count"));
  const performanceBlockedCapabilityCount = Number(
    await performancePanel.getAttribute("data-performance-blocked-capability-count")
  );
  assert(
    safetyScope === "local_imported_gsc_only",
    `${label} performance snapshot panel must declare local imported GSC scope`
  );
  assert(
    externalWriteAllowed === "false",
    `${label} performance snapshot panel must clamp external writes to false`
  );
  assert(
    Number.isInteger(blockedCapabilityCount) && blockedCapabilityCount >= 1,
    `${label} performance snapshot panel must expose blocked capability diagnostics`
  );
  assert(
    performanceBlockedCapabilityCount === blockedCapabilityCount,
    `${label} performance snapshot panel must expose matching store-specific blocked capability diagnostics`
  );

  const performancePanelText = ((await performancePanel.textContent()) ?? "").toLowerCase();
  for (const expectedCopy of ["performance snapshots", "local imported gsc only", "read-only"]) {
    assert(
      performancePanelText.includes(expectedCopy),
      `${label} performance snapshot panel must show ${expectedCopy}`
    );
  }

  const expectedMetrics = {
    clicks: "95",
    coverage: "5 queries / 4 pages",
    ctr: "1.90%",
    evidence_count: "1",
    impressions: "5,000",
    page_count: "4",
    position: "6.4",
    query_count: "5",
    snapshot_id: "perf_9dd0fb2b550a",
    source: "Imported GSC",
    window: "28d"
  };
  for (const [metric, expectedValue] of Object.entries(expectedMetrics)) {
    const metricValue = (
      (await performancePanel.locator(`[data-performance-metric='${metric}'] strong`).textContent()) ?? ""
    ).trim();
    assert(
      metricValue === expectedValue,
      `${label} performance snapshot ${metric} mismatch: expected ${expectedValue}, got ${metricValue}`
    );
  }

  const comparisonPanel = performancePanel.locator(".performance-comparison-panel");
  await expectVisible(comparisonPanel, `${label} performance before/after comparison panel`);
  const comparisonState = await comparisonPanel.getAttribute("data-performance-comparison-state");
  const comparisonSafetyScope = await comparisonPanel.getAttribute("data-safety-scope");
  const comparisonExternalWriteAllowed = await comparisonPanel.getAttribute("data-external-write-allowed");
  const beforeSnapshotId = await comparisonPanel.getAttribute("data-before-snapshot-id");
  const afterSnapshotId = await comparisonPanel.getAttribute("data-after-snapshot-id");
  const comparisonSnapshotCount = await comparisonPanel.getAttribute("data-snapshot-count");
  const comparisonBlockedCapabilityCount = Number(
    await comparisonPanel.getAttribute("data-performance-comparison-blocked-capability-count")
  );
  assert(
    comparisonState === "baseline_only",
    `${label} performance comparison state mismatch: expected baseline_only, got ${comparisonState ?? "missing"}`
  );
  assert(
    comparisonSafetyScope === "local_imported_gsc_only",
    `${label} performance comparison must declare local imported GSC scope`
  );
  assert(
    comparisonExternalWriteAllowed === "false",
    `${label} performance comparison must clamp external writes to false`
  );
  assert(
    Boolean(beforeSnapshotId),
    `${label} performance comparison must expose the imported baseline snapshot id`
  );
  assert(
    afterSnapshotId === "not_tracked",
    `${label} performance comparison after snapshot id mismatch: expected not_tracked, got ${afterSnapshotId ?? "missing"}`
  );
  assert(
    comparisonSnapshotCount === "1",
    `${label} performance comparison snapshot count mismatch: expected 1, got ${comparisonSnapshotCount ?? "missing"}`
  );
  assert(
    comparisonBlockedCapabilityCount === performanceBlockedCapabilityCount,
    `${label} performance comparison must expose matching blocked capability count diagnostics`
  );

  const comparisonText = ((await comparisonPanel.textContent()) ?? "").toLowerCase();
  for (const expectedCopy of [
    "before / after tracking",
    "imported baseline",
    "follow-up not tracked",
    "pending local evidence"
  ]) {
    assert(
      comparisonText.includes(expectedCopy),
      `${label} performance comparison panel must show ${expectedCopy}`
    );
  }

  const expectedComparisonMetrics = {
    after: "Follow-up not tracked",
    baseline_snapshot_id: "perf_9dd0fb2b550a",
    before: "Imported baseline / 28d",
    clicks: "95 -> follow-up not tracked",
    delta: "Pending local evidence",
    evidence_count: "1",
    impressions: "5,000 -> follow-up not tracked",
    source: "Imported GSC"
  };
  for (const [metric, expectedValue] of Object.entries(expectedComparisonMetrics)) {
    const metricValue = (
      (await comparisonPanel.locator(`[data-performance-comparison-metric='${metric}'] strong`).textContent()) ?? ""
    ).trim();
    assert(
      metricValue === expectedValue,
      `${label} performance comparison ${metric} mismatch: expected ${expectedValue}, got ${metricValue}`
    );
  }

  const interactiveSelector = [
    "button",
    "a",
    "form",
    "input",
    "select",
    "textarea",
    "[href]",
    "[role='button']",
    "[role='link']"
  ].join(", ");
  const interactiveCount = await performancePanel.locator(interactiveSelector).count();
  assert(
    interactiveCount === 0,
    `${label} performance snapshot panel must not render controls, links, forms, or href navigation`
  );
  const comparisonInteractiveCount = await comparisonPanel.locator(interactiveSelector).count();
  assert(
    comparisonInteractiveCount === 0,
    `${label} performance comparison panel must not render controls, links, forms, or href navigation`
  );

  const forbiddenCopyPatterns = [
    /\brefresh\b/,
    /\bsync\b/,
    /\bconnect\b/,
    /\boauth\b/,
    /\bcredential\b/,
    /\bpublish\b/,
    /\bdraft\b/,
    /\bcommerce\b/,
    /\btoken\b/,
    /\bsecret\b/,
    /\bpassword\b/
  ];
  for (const pattern of forbiddenCopyPatterns) {
    assert(
      !pattern.test(performancePanelText),
      `${label} performance snapshot panel exposes unsafe copy: ${pattern}`
    );
  }
}

async function waitForPerformanceSnapshotState(performancePanel, expectedState, expectedCount, label) {
  const deadline = Date.now() + 10_000;
  let lastState = "missing";
  let lastCount = "missing";

  while (Date.now() < deadline) {
    lastState = (await performancePanel.getAttribute("data-performance-snapshot-state")) ?? "missing";
    lastCount = (await performancePanel.getAttribute("data-performance-snapshot-count")) ?? "missing";
    if (lastState === expectedState && lastCount === String(expectedCount)) return;
    await delay(100);
  }

  throw new Error(
    `${label} performance snapshot state did not reach ${expectedState}/${expectedCount}; last ${lastState}/${lastCount}`
  );
}

async function assertPerformanceSnapshotEmptyStateIsReadOnly(page, label, expectedState, expectedEmptyStateKey, expectedCopy) {
  const performancePanel = page.locator(".performance-snapshot-panel");
  await expectVisible(performancePanel, `${label} performance snapshot panel`);
  await waitForPerformanceSnapshotState(performancePanel, expectedState, 0, label);

  const safetyScope = await performancePanel.getAttribute("data-safety-scope");
  const externalWriteAllowed = await performancePanel.getAttribute("data-external-write-allowed");
  const blockedCapabilityCount = Number(await performancePanel.getAttribute("data-blocked-capability-count"));
  const performanceBlockedCapabilityCount = Number(
    await performancePanel.getAttribute("data-performance-blocked-capability-count")
  );
  assert(
    safetyScope === "local_imported_gsc_only",
    `${label} performance snapshot panel must stay local imported GSC only`
  );
  assert(externalWriteAllowed === "false", `${label} performance snapshot panel must keep external writes false`);
  assert(
    Number.isInteger(blockedCapabilityCount) && blockedCapabilityCount >= 1,
    `${label} performance empty state must expose blocked capability diagnostics`
  );
  assert(
    performanceBlockedCapabilityCount === blockedCapabilityCount,
    `${label} performance empty state must expose matching store-specific blocked capability diagnostics`
  );

  const emptyRow = performancePanel.locator("[data-performance-empty-state='true']");
  await expectVisible(emptyRow, `${label} performance empty-state row`);
  const emptyStateKey = await emptyRow.getAttribute("data-performance-empty-state-key");
  assert(
    emptyStateKey === expectedEmptyStateKey,
    `${label} performance empty-state key mismatch: expected ${expectedEmptyStateKey}, got ${emptyStateKey ?? "missing"}`
  );
  await expectVisible(performancePanel.getByText(expectedCopy), `${label} performance empty-state copy`);

  const metricCount = await performancePanel.locator("[data-performance-metric]").count();
  assert(metricCount === 0, `${label} performance empty state must not render populated metric rows`);

  const comparisonPanel = performancePanel.locator(".performance-comparison-panel");
  await expectVisible(comparisonPanel, `${label} performance comparison empty-state panel`);
  const comparisonState = await comparisonPanel.getAttribute("data-performance-comparison-state");
  const comparisonSafetyScope = await comparisonPanel.getAttribute("data-safety-scope");
  const comparisonExternalWriteAllowed = await comparisonPanel.getAttribute("data-external-write-allowed");
  const comparisonSnapshotCount = await comparisonPanel.getAttribute("data-snapshot-count");
  const comparisonBlockedCapabilityCount = Number(
    await comparisonPanel.getAttribute("data-performance-comparison-blocked-capability-count")
  );
  assert(
    comparisonState === expectedState,
    `${label} performance comparison state mismatch: expected ${expectedState}, got ${comparisonState ?? "missing"}`
  );
  assert(
    comparisonSafetyScope === "local_imported_gsc_only",
    `${label} performance comparison empty state must stay local imported GSC only`
  );
  assert(
    comparisonExternalWriteAllowed === "false",
    `${label} performance comparison empty state must keep external writes false`
  );
  assert(
    comparisonSnapshotCount === "0",
    `${label} performance comparison empty-state snapshot count mismatch: expected 0, got ${
      comparisonSnapshotCount ?? "missing"
    }`
  );
  assert(
    comparisonBlockedCapabilityCount === performanceBlockedCapabilityCount,
    `${label} performance comparison empty state must expose matching blocked capability count diagnostics`
  );

  const comparisonEmptyRow = comparisonPanel.locator("[data-performance-comparison-empty-state='true']");
  await expectVisible(comparisonEmptyRow, `${label} performance comparison empty-state row`);
  const comparisonEmptyStateKey = await comparisonEmptyRow.getAttribute("data-performance-comparison-empty-state-key");
  assert(
    comparisonEmptyStateKey ===
      (expectedState === "unavailable" ? "performance_comparison_unavailable" : "no_imported_gsc_comparison"),
    `${label} performance comparison empty-state key mismatch: got ${comparisonEmptyStateKey ?? "missing"}`
  );
  const comparisonMetricCount = await comparisonPanel.locator("[data-performance-comparison-metric]").count();
  assert(
    comparisonMetricCount === 0,
    `${label} performance comparison empty state must not render populated comparison metric rows`
  );

  const interactiveSelector = [
    "button",
    "a",
    "form",
    "input",
    "select",
    "textarea",
    "[href]",
    "[role='button']",
    "[role='link']"
  ].join(", ");
  const interactiveCount = await performancePanel.locator(interactiveSelector).count();
  assert(interactiveCount === 0, `${label} performance empty state must not render controls or navigation`);
  const comparisonInteractiveCount = await comparisonPanel.locator(interactiveSelector).count();
  assert(
    comparisonInteractiveCount === 0,
    `${label} performance comparison empty state must not render controls or navigation`
  );

  const performancePanelText = ((await performancePanel.textContent()) ?? "").toLowerCase();
  const forbiddenCopyPatterns = [
    /\brefresh\b/,
    /\bsync\b/,
    /\bconnect\b/,
    /\boauth\b/,
    /\bcredential\b/,
    /\bpublish\b/,
    /\bdraft\b/,
    /\bcommerce\b/,
    /\btoken\b/,
    /\bsecret\b/,
    /\bpassword\b/
  ];
  for (const pattern of forbiddenCopyPatterns) {
    assert(!pattern.test(performancePanelText), `${label} performance empty state exposes unsafe copy: ${pattern}`);
  }
}

async function assertAssetPerformancePanelIsReadOnly(page, label, assetId, expectedMetrics) {
  const performancePanel = page.locator(".asset-performance-panel");
  await expectVisible(performancePanel, `${label} asset performance panel`);

  const renderedAssetId = await performancePanel.getAttribute("data-asset-id");
  const safetyScope = await performancePanel.getAttribute("data-safety-scope");
  const externalWriteAllowed = await performancePanel.getAttribute("data-external-write-allowed");
  const snapshotState = await performancePanel.getAttribute("data-asset-performance-state");
  const snapshotCount = await performancePanel.getAttribute("data-asset-performance-count");
  const blockedCapabilityCount = Number(
    await performancePanel.getAttribute("data-asset-performance-blocked-capability-count")
  );
  assert(renderedAssetId === assetId, `${label} asset performance id mismatch: expected ${assetId}, got ${renderedAssetId}`);
  assert(safetyScope === "local_imported_gsc_only", `${label} asset performance must declare local imported GSC scope`);
  assert(externalWriteAllowed === "false", `${label} asset performance must clamp external writes to false`);
  assert(snapshotState === "ready", `${label} asset performance state mismatch: expected ready, got ${snapshotState}`);
  assert(snapshotCount === "1", `${label} asset performance count mismatch: expected 1, got ${snapshotCount}`);
  assert(
    Number.isInteger(blockedCapabilityCount) && blockedCapabilityCount >= 1,
    `${label} asset performance must expose blocked capability count diagnostics`
  );

  const panelText = ((await performancePanel.textContent()) ?? "").toLowerCase();
  for (const expectedCopy of ["asset performance", "local imported gsc only", "read-only", "local_asset_query_page_tokens"]) {
    assert(panelText.includes(expectedCopy), `${label} asset performance panel must show ${expectedCopy}`);
  }

  for (const [metric, expectedValue] of Object.entries(expectedMetrics)) {
    const metricValue = (
      (await performancePanel.locator(`[data-asset-performance-metric='${metric}'] strong`).textContent()) ?? ""
    ).trim();
    assert(
      metricValue === expectedValue,
      `${label} asset performance ${metric} mismatch: expected ${expectedValue}, got ${metricValue}`
    );
  }

  const comparisonPanel = performancePanel.locator(".asset-performance-comparison-panel");
  await expectVisible(comparisonPanel, `${label} asset performance before/after comparison panel`);
  const comparisonAssetId = await comparisonPanel.getAttribute("data-asset-id");
  const comparisonState = await comparisonPanel.getAttribute("data-asset-performance-comparison-state");
  const comparisonSafetyScope = await comparisonPanel.getAttribute("data-safety-scope");
  const comparisonExternalWriteAllowed = await comparisonPanel.getAttribute("data-external-write-allowed");
  const comparisonMatchScope = await comparisonPanel.getAttribute("data-match-scope");
  const beforeSnapshotId = await comparisonPanel.getAttribute("data-before-snapshot-id");
  const afterSnapshotId = await comparisonPanel.getAttribute("data-after-snapshot-id");
  const comparisonSnapshotCount = await comparisonPanel.getAttribute("data-asset-performance-comparison-snapshot-count");
  const comparisonBlockedCapabilityCount = Number(
    await comparisonPanel.getAttribute("data-asset-performance-comparison-blocked-capability-count")
  );
  assert(comparisonAssetId === assetId, `${label} asset comparison id mismatch: expected ${assetId}, got ${comparisonAssetId}`);
  assert(
    comparisonState === "baseline_only",
    `${label} asset comparison state mismatch: expected baseline_only, got ${comparisonState ?? "missing"}`
  );
  assert(
    comparisonSafetyScope === "local_imported_gsc_only",
    `${label} asset comparison must declare local imported GSC scope`
  );
  assert(
    comparisonExternalWriteAllowed === "false",
    `${label} asset comparison must clamp external writes to false`
  );
  assert(
    comparisonMatchScope === "local_asset_query_page_tokens",
    `${label} asset comparison match scope mismatch: got ${comparisonMatchScope ?? "missing"}`
  );
  assert(Boolean(beforeSnapshotId), `${label} asset comparison must expose the imported baseline snapshot id`);
  assert(
    afterSnapshotId === "not_tracked",
    `${label} asset comparison after snapshot id mismatch: expected not_tracked, got ${afterSnapshotId ?? "missing"}`
  );
  assert(
    comparisonSnapshotCount === "1",
    `${label} asset comparison snapshot count mismatch: expected 1, got ${comparisonSnapshotCount ?? "missing"}`
  );
  assert(
    comparisonBlockedCapabilityCount === blockedCapabilityCount,
    `${label} asset comparison must expose matching blocked capability count diagnostics`
  );

  const comparisonText = ((await comparisonPanel.textContent()) ?? "").toLowerCase();
  for (const expectedCopy of [
    "asset before / after",
    "imported asset baseline",
    "follow-up not tracked",
    "pending local evidence",
    "local_asset_query_page_tokens"
  ]) {
    assert(comparisonText.includes(expectedCopy), `${label} asset comparison panel must show ${expectedCopy}`);
  }

  const expectedComparisonMetrics = {
    after: "Follow-up not tracked",
    baseline_snapshot_id: expectedMetrics.snapshot_id,
    before: "Imported asset baseline / 28d",
    clicks: `${expectedMetrics.clicks} -> follow-up not tracked`,
    delta: "Pending local evidence",
    evidence_count: expectedMetrics.evidence_count,
    impressions: `${expectedMetrics.impressions} -> follow-up not tracked`,
    match_scope: "local_asset_query_page_tokens",
    source: "Imported GSC"
  };
  for (const [metric, expectedValue] of Object.entries(expectedComparisonMetrics)) {
    const metricValue = (
      (await comparisonPanel.locator(`[data-asset-performance-comparison-metric='${metric}'] strong`).textContent()) ??
      ""
    ).trim();
    assert(
      metricValue === expectedValue,
      `${label} asset comparison ${metric} mismatch: expected ${expectedValue}, got ${metricValue}`
    );
  }

  const interactiveSelector = [
    "button",
    "a",
    "form",
    "input",
    "select",
    "textarea",
    "[href]",
    "[role='button']",
    "[role='link']"
  ].join(", ");
  const interactiveCount = await performancePanel.locator(interactiveSelector).count();
  assert(interactiveCount === 0, `${label} asset performance panel must not render controls or navigation`);
  const comparisonInteractiveCount = await comparisonPanel.locator(interactiveSelector).count();
  assert(comparisonInteractiveCount === 0, `${label} asset comparison panel must not render controls or navigation`);

  for (const pattern of [
    /\brefresh\b/,
    /\bsync\b/,
    /\bconnect\b/,
    /\boauth\b/,
    /\bcredential\b/,
    /\bpublish\b/,
    /\bdraft\b/,
    /\bcommerce\b/,
    /\btoken\b/,
    /\bsecret\b/,
    /\bpassword\b/
  ]) {
    assert(!pattern.test(panelText), `${label} asset performance panel exposes unsafe copy: ${pattern}`);
  }
}

async function assertAssetPerformanceEmptyStateIsReadOnly(page, label, assetId, expectedState, expectedEmptyStateKey) {
  const performancePanel = page.locator(".asset-performance-panel");
  await expectVisible(performancePanel, `${label} asset performance empty-state panel`);
  const stateDeadline = Date.now() + 10_000;
  let latestState = await performancePanel.getAttribute("data-asset-performance-state");
  let latestCount = await performancePanel.getAttribute("data-asset-performance-count");
  while (Date.now() < stateDeadline && (latestState !== expectedState || latestCount !== "0")) {
    await delay(100);
    latestState = await performancePanel.getAttribute("data-asset-performance-state");
    latestCount = await performancePanel.getAttribute("data-asset-performance-count");
  }

  const renderedAssetId = await performancePanel.getAttribute("data-asset-id");
  const safetyScope = await performancePanel.getAttribute("data-safety-scope");
  const externalWriteAllowed = await performancePanel.getAttribute("data-external-write-allowed");
  const snapshotState = await performancePanel.getAttribute("data-asset-performance-state");
  const snapshotCount = await performancePanel.getAttribute("data-asset-performance-count");
  const blockedCapabilityCount = Number(
    await performancePanel.getAttribute("data-asset-performance-blocked-capability-count")
  );
  assert(renderedAssetId === assetId, `${label} asset performance id mismatch: expected ${assetId}, got ${renderedAssetId}`);
  assert(safetyScope === "local_imported_gsc_only", `${label} asset performance must declare local imported GSC scope`);
  assert(externalWriteAllowed === "false", `${label} asset performance must clamp external writes to false`);
  assert(snapshotState === expectedState, `${label} asset performance state mismatch: expected ${expectedState}, got ${snapshotState}`);
  assert(snapshotCount === "0", `${label} asset performance count mismatch: expected 0, got ${snapshotCount}`);
  assert(
    Number.isInteger(blockedCapabilityCount) && blockedCapabilityCount >= 1,
    `${label} asset performance empty state must expose blocked capability count diagnostics`
  );

  const emptyRow = performancePanel.locator("[data-asset-performance-empty-state='true']");
  await expectVisible(emptyRow, `${label} asset performance empty-state row`);
  const metricCount = await performancePanel.locator("[data-asset-performance-metric]").count();
  assert(metricCount === 0, `${label} asset performance empty state must not render populated metric rows`);

  const comparisonPanel = performancePanel.locator(".asset-performance-comparison-panel");
  await expectVisible(comparisonPanel, `${label} asset performance comparison empty-state panel`);
  const comparisonAssetId = await comparisonPanel.getAttribute("data-asset-id");
  const comparisonState = await comparisonPanel.getAttribute("data-asset-performance-comparison-state");
  const comparisonSafetyScope = await comparisonPanel.getAttribute("data-safety-scope");
  const comparisonExternalWriteAllowed = await comparisonPanel.getAttribute("data-external-write-allowed");
  const comparisonMatchScope = await comparisonPanel.getAttribute("data-match-scope");
  const beforeSnapshotId = await comparisonPanel.getAttribute("data-before-snapshot-id");
  const afterSnapshotId = await comparisonPanel.getAttribute("data-after-snapshot-id");
  const comparisonSnapshotCount = await comparisonPanel.getAttribute("data-asset-performance-comparison-snapshot-count");
  const comparisonBlockedCapabilityCount = Number(
    await comparisonPanel.getAttribute("data-asset-performance-comparison-blocked-capability-count")
  );
  assert(comparisonAssetId === assetId, `${label} asset comparison id mismatch: expected ${assetId}, got ${comparisonAssetId}`);
  assert(
    comparisonState === expectedState,
    `${label} asset comparison state mismatch: expected ${expectedState}, got ${comparisonState ?? "missing"}`
  );
  assert(
    comparisonSafetyScope === "local_imported_gsc_only",
    `${label} asset comparison empty state must stay local imported GSC only`
  );
  assert(
    comparisonExternalWriteAllowed === "false",
    `${label} asset comparison empty state must keep external writes false`
  );
  assert(
    comparisonMatchScope === "local_asset_query_page_tokens",
    `${label} asset comparison empty match scope mismatch: got ${comparisonMatchScope ?? "missing"}`
  );
  assert(
    beforeSnapshotId === "none",
    `${label} asset comparison empty before snapshot mismatch: expected none, got ${beforeSnapshotId ?? "missing"}`
  );
  assert(
    afterSnapshotId === "not_tracked",
    `${label} asset comparison empty after snapshot mismatch: expected not_tracked, got ${afterSnapshotId ?? "missing"}`
  );
  assert(
    comparisonSnapshotCount === "0",
    `${label} asset comparison empty snapshot count mismatch: expected 0, got ${
      comparisonSnapshotCount ?? "missing"
    }`
  );
  assert(
    comparisonBlockedCapabilityCount === blockedCapabilityCount,
    `${label} asset comparison empty state must expose matching blocked capability count diagnostics`
  );

  const comparisonEmptyRow = comparisonPanel.locator("[data-asset-performance-comparison-empty-state='true']");
  await expectVisible(comparisonEmptyRow, `${label} asset performance comparison empty-state row`);
  const comparisonEmptyStateKey = await comparisonEmptyRow.getAttribute(
    "data-asset-performance-comparison-empty-state-key"
  );
  assert(
    comparisonEmptyStateKey === expectedEmptyStateKey,
    `${label} asset comparison empty-state key mismatch: expected ${expectedEmptyStateKey}, got ${
      comparisonEmptyStateKey ?? "missing"
    }`
  );
  const comparisonMetricCount = await comparisonPanel.locator("[data-asset-performance-comparison-metric]").count();
  assert(
    comparisonMetricCount === 0,
    `${label} asset comparison empty state must not render populated comparison metric rows`
  );

  const interactiveSelector = [
    "button",
    "a",
    "form",
    "input",
    "select",
    "textarea",
    "[href]",
    "[role='button']",
    "[role='link']"
  ].join(", ");
  const interactiveCount = await performancePanel.locator(interactiveSelector).count();
  assert(interactiveCount === 0, `${label} asset performance empty state must not render controls or navigation`);
  const comparisonInteractiveCount = await comparisonPanel.locator(interactiveSelector).count();
  assert(
    comparisonInteractiveCount === 0,
    `${label} asset comparison empty state must not render controls or navigation`
  );

  const panelText = ((await performancePanel.textContent()) ?? "").toLowerCase();
  for (const expectedCopy of ["asset before / after", "local_asset_query_page_tokens"]) {
    assert(panelText.includes(expectedCopy), `${label} asset comparison empty state must show ${expectedCopy}`);
  }
  for (const pattern of [
    /\brefresh\b/,
    /\bsync\b/,
    /\bconnect\b/,
    /\boauth\b/,
    /\bcredential\b/,
    /\bpublish\b/,
    /\bdraft\b/,
    /\bcommerce\b/,
    /\btoken\b/,
    /\bsecret\b/,
    /\bpassword\b/
  ]) {
    assert(!pattern.test(panelText), `${label} asset performance empty state exposes unsafe copy: ${pattern}`);
  }
}

function assertAssetPerformanceRequestsReadOnly(requests, expectedReadCount, label, assetId) {
  const performanceReads = requests.filter(
    (request) =>
      request.method === "GET" && request.url.endsWith(`/api/stores/${storeId}/assets/${assetId}/performance`)
  );
  assert(
    performanceReads.length === expectedReadCount,
    `${label} asset performance GET count mismatch: expected ${expectedReadCount}, got ${JSON.stringify(requests)}`
  );
  const unsafePerformanceRequests = requests.filter((request) => request.method !== "GET");
  assert(
    unsafePerformanceRequests.length === 0,
    `${label} asset performance endpoint must stay GET-only: ${JSON.stringify(unsafePerformanceRequests)}`
  );
  assert(
    !requests.some((request) => request.url.includes("/performance/refresh")),
    `${label} asset performance UI must not request refresh routes: ${JSON.stringify(requests)}`
  );
}

function assertPerformanceSnapshotRequestsReadOnly(requests, expectedReadCount, label) {
  const performanceSnapshotReads = requests.filter(
    (request) => request.method === "GET" && request.url.endsWith(`/api/stores/${storeId}/performance`)
  );
  assert(
    performanceSnapshotReads.length === expectedReadCount,
    `${label} performance snapshot endpoint GET count mismatch: expected ${expectedReadCount}, got ${JSON.stringify(
      requests
    )}`
  );
  const unsafePerformanceSnapshotRequests = requests.filter((request) => request.method !== "GET");
  assert(
    unsafePerformanceSnapshotRequests.length === 0,
    `${label} performance snapshot endpoint must stay GET-only: ${JSON.stringify(unsafePerformanceSnapshotRequests)}`
  );
  assert(
    !requests.some((request) => request.url.includes("/performance/refresh")),
    `${label} performance snapshot UI must not request refresh routes: ${JSON.stringify(requests)}`
  );
}

async function assertAssetWorkspacePanelIsReadOnly(page, expectedDraftCount, label, expectedAssets = []) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel`);
  await waitForAssetDraftCount(assetPanel, expectedDraftCount, label);

  const availability = await assetPanel.getAttribute("data-asset-workspace-availability");
  const availabilityReconciled = await assetPanel.getAttribute("data-asset-workspace-availability-reconciled");
  const draftCountText = await assetPanel.getAttribute("data-asset-draft-count");
  const draftCountsReconciled = await assetPanel.getAttribute("data-asset-draft-counts-reconciled");
  const visibleAssetCount = Number(await assetPanel.getAttribute("data-visible-asset-count"));
  const hiddenAssetCount = Number(await assetPanel.getAttribute("data-hidden-asset-count"));
  const rowCountsReconciled = await assetPanel.getAttribute("data-asset-row-counts-reconciled");
  const externalWriteAllowed = await assetPanel.getAttribute("data-external-write-allowed");
  const draftCount = Number(draftCountText);
  const expectedAvailability = expectedDraftCount > 0 ? "ready" : "empty";
  assert(
    Number.isInteger(draftCount) && draftCount === expectedDraftCount,
    `${label} asset workspace draft count mismatch: expected ${expectedDraftCount}, got ${
      draftCountText ?? "missing"
    }`
  );
  assert(
    draftCountsReconciled === "true",
    `${label} asset workspace draft count reconciliation marker must be true, got ${
      draftCountsReconciled ?? "missing"
    }`
  );
  assert(
    rowCountsReconciled === "true",
    `${label} asset workspace row count reconciliation marker must be true, got ${
      rowCountsReconciled ?? "missing"
    }`
  );
  assert(
    visibleAssetCount + hiddenAssetCount === draftCount,
    `${label} asset workspace root row counts must reconcile: visible ${visibleAssetCount} + hidden ${hiddenAssetCount} != ${draftCount}`
  );
  const draftCountRow = assetPanel.locator("[data-asset-draft-count-row='true']");
  await expectVisible(draftCountRow, `${label} visible asset workspace draft count row`);
  assert(
    (await draftCountRow.getAttribute("data-asset-draft-count-row-value")) === String(expectedDraftCount),
    `${label} visible asset workspace draft count row value mismatch`
  );
  await expectVisible(draftCountRow.getByText(String(expectedDraftCount)), `${label} visible asset workspace draft count`);
  assert(
    availability === expectedAvailability,
    `${label} asset workspace availability mismatch: expected ${expectedAvailability}, got ${
      availability ?? "missing"
    }`
  );
  assert(
    availabilityReconciled === "true",
    `${label} asset workspace availability reconciliation marker must be true, got ${
      availabilityReconciled ?? "missing"
    }`
  );
  const availabilityRow = assetPanel.locator("[data-asset-workspace-availability-row='true']");
  await expectVisible(availabilityRow, `${label} visible asset workspace availability row`);
  assert(
    (await availabilityRow.getAttribute("data-asset-workspace-availability-row-state")) === expectedAvailability,
    `${label} visible asset workspace availability row state mismatch`
  );
  await expectVisible(availabilityRow.getByText(expectedAvailability), `${label} visible asset workspace availability state`);
  assert(
    externalWriteAllowed === "false",
    `${label} asset workspace must clamp external writes to false, got ${externalWriteAllowed ?? "missing"}`
  );
  await expectVisible(page.getByText("Read-only asset workspace"), `${label} asset workspace read-only label`);
  await expectVisible(page.getByText("wordpress_draft_creation"), `${label} blocked WordPress draft capability`);

  const unsafeInteractiveSelector = ["a", "form", "input", "select", "textarea", "[href]", "[role='link']"].join(", ");
  const unsafeInteractiveCount = await assetPanel.locator(unsafeInteractiveSelector).count();
  assert(unsafeInteractiveCount === 0, `${label} asset workspace panel must not render unsafe controls or navigation`);
  const buttonNames = await assetPanel.locator("button").evaluateAll((buttons) =>
    buttons.map((button) => (button.textContent ?? "").trim())
  );
  for (const buttonName of buttonNames) {
    assert(
      buttonName === "Review local draft" || buttonName === "审核本地草稿",
      `${label} asset workspace exposes unsafe button: ${buttonName}`
    );
  }
  await assertAssetEditorUiGate(assetPanel, label);

  const assetPanelText = ((await assetPanel.textContent()) ?? "").toLowerCase();
  for (const forbidden of ["connect", "credential", "oauth", "woocommerce write"]) {
    assert(!assetPanelText.includes(forbidden), `${label} asset workspace exposes unsafe copy: ${forbidden}`);
  }

  for (const expectedAsset of expectedAssets) {
    const row = assetPanel.locator(`[data-asset-id='${expectedAsset.id}']`);
    const rowCount = await row.count();
    assert(rowCount === 1, `${label} asset row ${expectedAsset.id} must render exactly once`);
    const reviewState = await row.getAttribute("data-asset-review-state");
    const contentBlockCount = await row.getAttribute("data-asset-content-block-count");
    const contentBlockTypes = await row.getAttribute("data-asset-content-block-types");
    const claimCount = await row.getAttribute("data-asset-claim-count");
    const rowClaimDetailCount = await row.getAttribute("data-asset-row-claim-detail-count");
    const rowClaimCountsReconciled = await row.getAttribute("data-asset-row-claim-counts-reconciled");
    const qaCheckCount = await row.getAttribute("data-asset-qa-check-count");
    const qaPendingCount = await row.getAttribute("data-asset-qa-pending-count");
    assert(
      reviewState === expectedAsset.reviewState,
      `${label} asset row ${expectedAsset.id} review state mismatch: expected ${expectedAsset.reviewState}, got ${
        reviewState ?? "missing"
      }`
    );
    assert(
      contentBlockCount === String(expectedAsset.contentBlockCount),
      `${label} asset row ${expectedAsset.id} content block count mismatch: expected ${
        expectedAsset.contentBlockCount
      }, got ${contentBlockCount ?? "missing"}`
    );
    if (expectedAsset.contentBlockTypes) {
      assert(
        contentBlockTypes === expectedAsset.contentBlockTypes.join(","),
        `${label} asset row ${expectedAsset.id} content block type mismatch: expected ${expectedAsset.contentBlockTypes.join(
          ","
        )}, got ${contentBlockTypes ?? "missing"}`
      );
      const expectedContentBlockTypeDistribution = expectedAsset.contentBlockTypes.reduce((counts, blockType) => {
        counts[blockType] = (counts[blockType] ?? 0) + 1;
        return counts;
      }, {});
      const expectedContentBlockTypeEntries = Object.entries(expectedContentBlockTypeDistribution).sort(
        ([left], [right]) => left.localeCompare(right)
      );
      const rowContentBlockCount = Number(await row.getAttribute("data-asset-row-content-block-count"));
      const rowContentBlockCountsReconciled = await row.getAttribute("data-asset-row-content-block-counts-reconciled");
      const rowContentBlockTypeCount = Number(await row.getAttribute("data-asset-row-content-block-type-count"));
      const rowContentBlockTypeTotal = Number(await row.getAttribute("data-asset-row-content-block-type-total-count"));
      const rowContentBlockTypeReconciled = await row.getAttribute(
        "data-asset-row-content-block-type-counts-reconciled"
      );
      const rowContentBlockTypeRows = await row
        .locator("[data-asset-row-content-block-type-row='true']")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            count: Number(element.getAttribute("data-asset-row-content-block-type-row-count")),
            text: element.textContent ?? "",
            type: element.getAttribute("data-asset-row-content-block-type-key")
          }))
        );
      assert(
        rowContentBlockCount === expectedAsset.contentBlockCount,
        `${label} asset row ${expectedAsset.id} content block count mismatch: expected ${
          expectedAsset.contentBlockCount
        }, got ${rowContentBlockCount}`
      );
      assert(
        rowContentBlockCountsReconciled === "true",
        `${label} asset row ${expectedAsset.id} content block count reconciliation marker must be true, got ${
          rowContentBlockCountsReconciled ?? "missing"
        }`
      );
      assert(
        rowContentBlockTypeCount === expectedContentBlockTypeEntries.length,
        `${label} asset row ${expectedAsset.id} content block type count mismatch: expected ${
          expectedContentBlockTypeEntries.length
        }, got ${rowContentBlockTypeCount}`
      );
      assert(
        rowContentBlockTypeTotal === expectedAsset.contentBlockCount,
        `${label} asset row ${expectedAsset.id} content block type total mismatch: expected ${
          expectedAsset.contentBlockCount
        }, got ${rowContentBlockTypeTotal}`
      );
      assert(
        rowContentBlockTypeReconciled === "true",
        `${label} asset row ${expectedAsset.id} content block type reconciliation marker must be true, got ${
          rowContentBlockTypeReconciled ?? "missing"
        }`
      );
      assert(
        rowContentBlockTypeRows.length === expectedContentBlockTypeEntries.length,
        `${label} asset row ${expectedAsset.id} content block type row count mismatch: expected ${
          expectedContentBlockTypeEntries.length
        }, got ${rowContentBlockTypeRows.length}`
      );
      assert(
        rowContentBlockTypeRows.reduce((sum, typeRow) => sum + typeRow.count, 0) === expectedAsset.contentBlockCount,
        `${label} asset row ${expectedAsset.id} content block type rows must reconcile with block count`
      );
      for (const [blockType, count] of expectedContentBlockTypeEntries) {
        assert(
          rowContentBlockTypeRows.some(
            (typeRow) => typeRow.type === blockType && typeRow.count === count && typeRow.text.includes(`${blockType} ${count}`)
          ),
          `${label} asset row ${expectedAsset.id} missing content block type distribution row ${blockType}:${count}`
        );
      }
    }
    if (expectedAsset.qaCheckCount !== undefined) {
      const expectedQaReadinessState =
        expectedAsset.qaCheckCount === 0
          ? "not_applicable"
          : expectedAsset.qaPendingCount > 0
            ? "pending_qa"
            : "qa_clear";
      const rowQaReadinessState = await row.getAttribute("data-asset-row-qa-readiness-state");
      const rowQaReadinessPendingCount = Number(
        await row.getAttribute("data-asset-row-qa-readiness-pending-count")
      );
      const rowQaReadinessTotalCount = Number(await row.getAttribute("data-asset-row-qa-readiness-total-count"));
      const rowQaReadinessCountsReconciled = await row.getAttribute("data-asset-row-qa-readiness-counts-reconciled");
      assert(
        qaCheckCount === String(expectedAsset.qaCheckCount),
        `${label} asset row ${expectedAsset.id} QA check count mismatch: expected ${expectedAsset.qaCheckCount}, got ${
          qaCheckCount ?? "missing"
        }`
      );
      assert(
        qaPendingCount === String(expectedAsset.qaPendingCount),
        `${label} asset row ${expectedAsset.id} QA pending count mismatch: expected ${
          expectedAsset.qaPendingCount
        }, got ${qaPendingCount ?? "missing"}`
      );
      assert(
        rowQaReadinessState === expectedQaReadinessState,
        `${label} asset row ${expectedAsset.id} QA readiness state mismatch: expected ${expectedQaReadinessState}, got ${
          rowQaReadinessState ?? "missing"
        }`
      );
      assert(
        rowQaReadinessPendingCount === expectedAsset.qaPendingCount,
        `${label} asset row ${expectedAsset.id} QA readiness pending count mismatch: expected ${
          expectedAsset.qaPendingCount
        }, got ${rowQaReadinessPendingCount}`
      );
      assert(
        rowQaReadinessTotalCount === expectedAsset.qaCheckCount,
        `${label} asset row ${expectedAsset.id} QA readiness total count mismatch: expected ${
          expectedAsset.qaCheckCount
        }, got ${rowQaReadinessTotalCount}`
      );
      assert(
        rowQaReadinessCountsReconciled === "true",
        `${label} asset row ${expectedAsset.id} QA readiness reconciliation marker must be true, got ${
          rowQaReadinessCountsReconciled ?? "missing"
        }`
      );
      const qaReadinessRow = row.locator("[data-asset-row-qa-readiness='true']");
      await expectVisible(qaReadinessRow, `${label} asset row ${expectedAsset.id} QA readiness summary`);
      const qaReadinessText = (await qaReadinessRow.textContent()) ?? "";
      assert(
        qaReadinessText.includes(expectedQaReadinessState) &&
          qaReadinessText.includes(`${expectedAsset.qaPendingCount}/${expectedAsset.qaCheckCount}`),
        `${label} asset row ${expectedAsset.id} QA readiness summary mismatch: ${qaReadinessText}`
      );
    }
    if (expectedAsset.blockedCapabilities) {
      const rowBlockedCapabilityCount = Number(await row.getAttribute("data-asset-row-blocked-capability-count"));
      const rowBlockedCapabilityCountsReconciled = await row.getAttribute(
        "data-asset-row-blocked-capability-counts-reconciled"
      );
      const rowBlockedCapabilityRows = await row
        .locator("[data-asset-row-blocked-capability='true']")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            key: element.getAttribute("data-asset-row-blocked-capability-key"),
            text: element.textContent ?? ""
          }))
        );
      assert(
        rowBlockedCapabilityCount === expectedAsset.blockedCapabilities.length,
        `${label} asset row ${expectedAsset.id} blocked capability count mismatch: expected ${
          expectedAsset.blockedCapabilities.length
        }, got ${rowBlockedCapabilityCount}`
      );
      assert(
        rowBlockedCapabilityRows.length === expectedAsset.blockedCapabilities.length,
        `${label} asset row ${expectedAsset.id} blocked capability row count mismatch: expected ${
          expectedAsset.blockedCapabilities.length
        }, got ${rowBlockedCapabilityRows.length}`
      );
      assert(
        rowBlockedCapabilityCountsReconciled === "true",
        `${label} asset row ${expectedAsset.id} blocked capability reconciliation marker must be true, got ${
          rowBlockedCapabilityCountsReconciled ?? "missing"
        }`
      );
      for (const expectedCapability of expectedAsset.blockedCapabilities) {
        assert(
          rowBlockedCapabilityRows.some(
            (capability) => capability.key === expectedCapability && capability.text.includes(expectedCapability)
          ),
          `${label} asset row ${expectedAsset.id} missing blocked capability ${expectedCapability}`
        );
      }
    }
    if (expectedAsset.claimCount !== undefined) {
      assert(
        claimCount === String(expectedAsset.claimCount),
        `${label} asset row ${expectedAsset.id} claim count mismatch: expected ${expectedAsset.claimCount}, got ${
          claimCount ?? "missing"
        }`
      );
      assert(
        rowClaimDetailCount === String(expectedAsset.claimCount),
        `${label} asset row ${expectedAsset.id} claim detail diagnostic mismatch: expected ${
          expectedAsset.claimCount
        }, got ${rowClaimDetailCount ?? "missing"}`
      );
      assert(
        rowClaimCountsReconciled === "true",
        `${label} asset row ${expectedAsset.id} claim reconciliation marker must be true, got ${
          rowClaimCountsReconciled ?? "missing"
        }`
      );
    }
    const rowText = (await row.textContent()) ?? "";
    assert(rowText.includes(expectedAsset.title), `${label} asset row ${expectedAsset.id} must show title`);
    if (expectedAsset.qaCheckCount !== undefined) {
      assert(
        rowText.includes(`qa ${expectedAsset.qaPendingCount}/${expectedAsset.qaCheckCount} pending`),
        `${label} asset row ${expectedAsset.id} must show QA pending summary`
      );
    }
    if (expectedAsset.qaDetails) {
      const qaDetailRows = await row.locator("[data-asset-qa-detail]").evaluateAll((elements) =>
        elements.map((element) => ({
          key: element.getAttribute("data-asset-qa-key"),
          status: element.getAttribute("data-asset-qa-status"),
          text: element.textContent ?? ""
        }))
      );
      assert(
        qaDetailRows.length === expectedAsset.qaDetails.length,
        `${label} asset row ${expectedAsset.id} QA detail count mismatch: expected ${
          expectedAsset.qaDetails.length
        }, got ${qaDetailRows.length}`
      );
      const rowQaDetailCount = Number(await row.getAttribute("data-asset-row-qa-detail-count"));
      const rowQaPendingDetailCount = Number(await row.getAttribute("data-asset-row-qa-pending-detail-count"));
      const rowQaCountsReconciled = await row.getAttribute("data-asset-row-qa-counts-reconciled");
      const rowQaPendingCountsReconciled = await row.getAttribute("data-asset-row-qa-pending-counts-reconciled");
      const expectedPendingQaDetails = expectedAsset.qaDetails.filter((detail) => detail.status === "pending").length;
      assert(
        rowQaDetailCount === expectedAsset.qaDetails.length,
        `${label} asset row ${expectedAsset.id} QA detail diagnostic mismatch: expected ${
          expectedAsset.qaDetails.length
        }, got ${rowQaDetailCount}`
      );
      assert(
        rowQaPendingDetailCount === expectedPendingQaDetails,
        `${label} asset row ${expectedAsset.id} QA pending detail diagnostic mismatch: expected ${
          expectedPendingQaDetails
        }, got ${rowQaPendingDetailCount}`
      );
      assert(
        rowQaCountsReconciled === "true",
        `${label} asset row ${expectedAsset.id} QA count reconciliation marker must be true, got ${
          rowQaCountsReconciled ?? "missing"
        }`
      );
      assert(
        rowQaPendingCountsReconciled === "true",
        `${label} asset row ${expectedAsset.id} QA pending count reconciliation marker must be true, got ${
          rowQaPendingCountsReconciled ?? "missing"
        }`
      );
      for (const expectedQaDetail of expectedAsset.qaDetails) {
        assert(
          qaDetailRows.some(
            (detail) =>
              detail.key === expectedQaDetail.key &&
              detail.status === expectedQaDetail.status &&
              detail.text.includes(`${expectedQaDetail.key}:${expectedQaDetail.status}`)
          ),
          `${label} asset row ${expectedAsset.id} missing QA detail ${expectedQaDetail.key}:${expectedQaDetail.status}`
        );
      }
      const expectedQaStatusDistribution = expectedAsset.qaDetails.reduce((counts, detail) => {
        counts[detail.status] = (counts[detail.status] ?? 0) + 1;
        return counts;
      }, {});
      const expectedQaStatusEntries = Object.entries(expectedQaStatusDistribution).sort(([left], [right]) =>
        left.localeCompare(right)
      );
      const rowQaStatusCount = Number(await row.getAttribute("data-asset-row-qa-status-count"));
      const rowQaStatusTotal = Number(await row.getAttribute("data-asset-row-qa-status-total-count"));
      const rowQaStatusReconciled = await row.getAttribute("data-asset-row-qa-status-counts-reconciled");
      const rowQaStatusRows = await row.locator("[data-asset-row-qa-status-row='true']").evaluateAll((elements) =>
        elements.map((element) => ({
          count: Number(element.getAttribute("data-asset-row-qa-status-row-count")),
          status: element.getAttribute("data-asset-row-qa-status-key"),
          text: element.textContent ?? ""
        }))
      );
      assert(
        rowQaStatusCount === expectedQaStatusEntries.length,
        `${label} asset row ${expectedAsset.id} QA status count mismatch: expected ${
          expectedQaStatusEntries.length
        }, got ${rowQaStatusCount}`
      );
      assert(
        rowQaStatusTotal === expectedAsset.qaDetails.length,
        `${label} asset row ${expectedAsset.id} QA status total mismatch: expected ${
          expectedAsset.qaDetails.length
        }, got ${rowQaStatusTotal}`
      );
      assert(
        rowQaStatusReconciled === "true",
        `${label} asset row ${expectedAsset.id} QA status reconciliation marker must be true, got ${
          rowQaStatusReconciled ?? "missing"
        }`
      );
      assert(
        rowQaStatusRows.length === expectedQaStatusEntries.length,
        `${label} asset row ${expectedAsset.id} QA status row count mismatch: expected ${
          expectedQaStatusEntries.length
        }, got ${rowQaStatusRows.length}`
      );
      assert(
        rowQaStatusRows.reduce((sum, statusRow) => sum + statusRow.count, 0) === expectedAsset.qaDetails.length,
        `${label} asset row ${expectedAsset.id} QA status rows must reconcile with detail count`
      );
      for (const [status, count] of expectedQaStatusEntries) {
        assert(
          rowQaStatusRows.some(
            (statusRow) => statusRow.status === status && statusRow.count === count && statusRow.text.includes(`${status} ${count}`)
          ),
          `${label} asset row ${expectedAsset.id} missing QA status distribution row ${status}:${count}`
        );
      }
      const serializedQaDetails = JSON.stringify(qaDetailRows);
      for (const forbidden of ["metadata", "credential", "token", "secret", "password", "api_key", "published"]) {
        assert(
          !serializedQaDetails.toLowerCase().includes(forbidden),
          `${label} asset row ${expectedAsset.id} QA detail leaked unsafe copy: ${forbidden}`
        );
      }
    }
    if (expectedAsset.claims) {
      const claimRows = await row.locator("[data-asset-claim-detail]").evaluateAll((elements) =>
        elements.map((element) => ({
          id: element.getAttribute("data-asset-claim-id"),
          source: element.getAttribute("data-asset-claim-source"),
          text: element.textContent ?? ""
        }))
      );
      assert(
        claimRows.length === expectedAsset.claims.length,
        `${label} asset row ${expectedAsset.id} claim detail count mismatch: expected ${
          expectedAsset.claims.length
        }, got ${claimRows.length}`
      );
      for (const expectedClaim of expectedAsset.claims) {
        assert(
          claimRows.some(
            (claim) =>
              claim.id === expectedClaim.id &&
              claim.source === expectedClaim.source &&
              claim.text.includes(expectedClaim.text)
          ),
          `${label} asset row ${expectedAsset.id} missing claim detail ${expectedClaim.id}`
        );
      }
      const expectedClaimSourceDistribution = expectedAsset.claims.reduce((counts, claim) => {
        counts[claim.source] = (counts[claim.source] ?? 0) + 1;
        return counts;
      }, {});
      const expectedClaimSourceEntries = Object.entries(expectedClaimSourceDistribution).sort(([left], [right]) =>
        left.localeCompare(right)
      );
      const rowClaimSourceCount = Number(await row.getAttribute("data-asset-row-claim-source-count"));
      const rowClaimSourceTotal = Number(await row.getAttribute("data-asset-row-claim-source-total-count"));
      const rowClaimSourceReconciled = await row.getAttribute("data-asset-row-claim-source-counts-reconciled");
      const rowClaimSourceRows = await row.locator("[data-asset-row-claim-source-row='true']").evaluateAll((elements) =>
        elements.map((element) => ({
          count: Number(element.getAttribute("data-asset-row-claim-source-row-count")),
          source: element.getAttribute("data-asset-row-claim-source-key"),
          text: element.textContent ?? ""
        }))
      );
      assert(
        rowClaimSourceCount === expectedClaimSourceEntries.length,
        `${label} asset row ${expectedAsset.id} claim source count mismatch: expected ${
          expectedClaimSourceEntries.length
        }, got ${rowClaimSourceCount}`
      );
      assert(
        rowClaimSourceTotal === expectedAsset.claims.length,
        `${label} asset row ${expectedAsset.id} claim source total mismatch: expected ${
          expectedAsset.claims.length
        }, got ${rowClaimSourceTotal}`
      );
      assert(
        rowClaimSourceReconciled === "true",
        `${label} asset row ${expectedAsset.id} claim source reconciliation marker must be true, got ${
          rowClaimSourceReconciled ?? "missing"
        }`
      );
      assert(
        rowClaimSourceRows.length === expectedClaimSourceEntries.length,
        `${label} asset row ${expectedAsset.id} claim source row count mismatch: expected ${
          expectedClaimSourceEntries.length
        }, got ${rowClaimSourceRows.length}`
      );
      assert(
        rowClaimSourceRows.reduce((sum, sourceRow) => sum + sourceRow.count, 0) === expectedAsset.claims.length,
        `${label} asset row ${expectedAsset.id} claim source rows must reconcile with detail count`
      );
      for (const [source, count] of expectedClaimSourceEntries) {
        assert(
          rowClaimSourceRows.some(
            (sourceRow) => sourceRow.source === source && sourceRow.count === count && sourceRow.text.includes(`${source} ${count}`)
          ),
          `${label} asset row ${expectedAsset.id} missing claim source distribution row ${source}:${count}`
        );
      }
      const serializedClaims = JSON.stringify(claimRows);
      for (const forbidden of ["metadata", "credential", "token", "secret", "password", "api_key", "published"]) {
        assert(
          !serializedClaims.toLowerCase().includes(forbidden),
          `${label} asset row ${expectedAsset.id} claim detail leaked unsafe copy: ${forbidden}`
        );
      }
    }
    for (const contentBlockType of expectedAsset.contentBlockTypes ?? []) {
      assert(
        rowText.includes(contentBlockType),
        `${label} asset row ${expectedAsset.id} must show content block type ${contentBlockType}`
      );
    }
  }
}

async function waitForAssetDraftCount(assetPanel, expectedDraftCount, label) {
  const deadline = Date.now() + 10_000;
  let lastCount = "missing";

  while (Date.now() < deadline) {
    lastCount = (await assetPanel.getAttribute("data-asset-draft-count")) ?? "missing";
    if (lastCount === String(expectedDraftCount)) return;
    await delay(100);
  }

  throw new Error(`${label} asset workspace draft count did not reach ${expectedDraftCount}; last ${lastCount}`);
}

async function assertAssetWorkspacePanelUnavailable(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel`);
  const availability = await assetPanel.getAttribute("data-asset-workspace-availability");
  const availabilityReconciled = await assetPanel.getAttribute("data-asset-workspace-availability-reconciled");
  const draftCountsReconciled = await assetPanel.getAttribute("data-asset-draft-counts-reconciled");
  const visibleAssetCount = Number(await assetPanel.getAttribute("data-visible-asset-count"));
  const hiddenAssetCount = Number(await assetPanel.getAttribute("data-hidden-asset-count"));
  const rowCountsReconciled = await assetPanel.getAttribute("data-asset-row-counts-reconciled");
  const externalWriteAllowed = await assetPanel.getAttribute("data-external-write-allowed");
  assert(
    availability === "unavailable",
    `${label} asset workspace availability mismatch: expected unavailable, got ${availability ?? "missing"}`
  );
  assert(
    availabilityReconciled === "true",
    `${label} unavailable asset workspace availability reconciliation marker must be true, got ${
      availabilityReconciled ?? "missing"
    }`
  );
  assert(
    draftCountsReconciled === "true",
    `${label} unavailable asset workspace draft count reconciliation marker must be true, got ${
      draftCountsReconciled ?? "missing"
    }`
  );
  assert(
    rowCountsReconciled === "true",
    `${label} unavailable asset workspace row count reconciliation marker must be true, got ${
      rowCountsReconciled ?? "missing"
    }`
  );
  assert(
    visibleAssetCount === 0 && hiddenAssetCount === 0,
    `${label} unavailable asset workspace row counts must both be 0: visible ${visibleAssetCount}, hidden ${hiddenAssetCount}`
  );
  const draftCountRow = assetPanel.locator("[data-asset-draft-count-row='true']");
  await expectVisible(draftCountRow, `${label} unavailable visible asset workspace draft count row`);
  assert(
    (await draftCountRow.getAttribute("data-asset-draft-count-row-value")) === "0",
    `${label} unavailable visible asset workspace draft count row value mismatch`
  );
  const availabilityRow = assetPanel.locator("[data-asset-workspace-availability-row='true']");
  await expectVisible(availabilityRow, `${label} unavailable visible asset workspace availability row`);
  assert(
    (await availabilityRow.getAttribute("data-asset-workspace-availability-row-state")) === "unavailable",
    `${label} unavailable visible asset workspace availability row state mismatch`
  );
  await expectVisible(availabilityRow.getByText("unavailable"), `${label} unavailable visible asset workspace availability state`);
  assert(
    externalWriteAllowed === "false",
    `${label} unavailable asset workspace must clamp external writes to false, got ${externalWriteAllowed ?? "missing"}`
  );
  await expectVisible(page.getByText("Asset workspace unavailable"), `${label} unavailable asset copy`);
  await assertAssetEditorUiGate(assetPanel, label);
}

async function assertAssetEditorUiGate(assetPanel, label) {
  const editorControlSelector = [
    "a",
    "form",
    "input",
    "select",
    "textarea",
    "[contenteditable='true']",
    "[href]",
    "[role='button']",
    "[role='link']"
  ].join(", ");
  const editorControlCount = await assetPanel.locator(editorControlSelector).count();
  assert(editorControlCount === 0, `${label} asset editor gate must expose no controls or navigation`);

  const credentialInputSelector = [
    "input[type='password']",
    "input[name*='token' i]",
    "input[name*='secret' i]",
    "input[name*='api' i]",
    "input[name*='oauth' i]",
    "input[name*='credential' i]",
    "input[placeholder*='token' i]",
    "input[placeholder*='secret' i]",
    "input[placeholder*='api' i]",
    "input[placeholder*='oauth' i]",
    "input[placeholder*='credential' i]"
  ].join(", ");
  const credentialInputCount = await assetPanel.locator(credentialInputSelector).count();
  assert(credentialInputCount === 0, `${label} asset editor gate must expose no credential-like inputs`);

  const panelText = ((await assetPanel.textContent()) ?? "").toLowerCase();
  const forbiddenActionCopy = [
    /\bsave\b/,
    /\bsync\b/,
    /\bconnect\b/,
    /\boauth\b/,
    /\bcredential\b/,
    /\bapply\b/,
    /\bautopilot\b/,
    /\bedit asset\b/,
    /\bopen editor\b/,
    /\bcreate wordpress draft\b/,
    /\bpublish\b/
  ];
  for (const pattern of forbiddenActionCopy) {
    assert(!pattern.test(panelText), `${label} asset editor gate exposes unsafe action copy: ${pattern}`);
  }
}

async function assertLocalAssetEditorSaveState(editor, expectedState, label) {
  const editorSaveState = await editor.getAttribute("data-asset-editor-save-state");
  assert(
    editorSaveState === expectedState,
    `${label} editor save state mismatch: expected ${expectedState}, got ${editorSaveState ?? "missing"}`
  );
  const feedback = editor.locator("[data-asset-editor-save-feedback='true']");
  await expectVisible(feedback, `${label} editor save feedback diagnostics`);
  const feedbackState = await feedback.getAttribute("data-asset-editor-save-state");
  assert(
    feedbackState === expectedState,
    `${label} editor save feedback state mismatch: expected ${expectedState}, got ${feedbackState ?? "missing"}`
  );
}

async function assertLocalAssetEditorSourceTaskContext(editor, expectedSourceTaskId, expectedSourceTaskStatus, label) {
  const sourceTaskId = await editor.getAttribute("data-asset-editor-source-task-id");
  const sourceTaskStatus = await editor.getAttribute("data-asset-editor-source-task-status");
  assert(
    sourceTaskId === expectedSourceTaskId,
    `${label} editor source task id mismatch: expected ${expectedSourceTaskId}, got ${sourceTaskId ?? "missing"}`
  );
  assert(
    sourceTaskStatus === expectedSourceTaskStatus,
    `${label} editor source task status mismatch: expected ${expectedSourceTaskStatus}, got ${
      sourceTaskStatus ?? "missing"
    }`
  );
  const sourceTaskSummary = editor.locator("[data-asset-editor-source-task-summary='true']");
  await expectVisible(sourceTaskSummary, `${label} visible editor source task summary`);
  assert(
    (await sourceTaskSummary.getAttribute("data-asset-editor-source-task-id")) === expectedSourceTaskId,
    `${label} visible editor source task summary id mismatch`
  );
  assert(
    (await sourceTaskSummary.getAttribute("data-asset-editor-source-task-status")) === expectedSourceTaskStatus,
    `${label} visible editor source task summary status mismatch`
  );
  const summaryText = (await sourceTaskSummary.textContent()) ?? "";
  assert(
    summaryText.includes(expectedSourceTaskId) && summaryText.includes(expectedSourceTaskStatus),
    `${label} visible editor source task summary missing id/status copy`
  );
}

async function assertLocalAssetEditorAssetTypeContext(editor, expectedAssetType, label) {
  const assetType = await editor.getAttribute("data-asset-editor-asset-type");
  assert(
    assetType === expectedAssetType,
    `${label} editor asset type mismatch: expected ${expectedAssetType}, got ${assetType ?? "missing"}`
  );
  const assetTypeSummary = editor.locator("[data-asset-editor-asset-type-summary='true']");
  await expectVisible(assetTypeSummary, `${label} visible editor asset type summary`);
  assert(
    (await assetTypeSummary.getAttribute("data-asset-editor-asset-type")) === expectedAssetType,
    `${label} visible editor asset type summary mismatch`
  );
  const summaryText = (await assetTypeSummary.textContent()) ?? "";
  assert(summaryText.includes(expectedAssetType), `${label} visible editor asset type summary missing ${expectedAssetType}`);
}

async function assertLocalAssetEditorReviewStateContext(editor, expectedReviewState, label) {
  const reviewState = await editor.getAttribute("data-asset-editor-review-state");
  assert(
    reviewState === expectedReviewState,
    `${label} editor review state mismatch: expected ${expectedReviewState}, got ${reviewState ?? "missing"}`
  );
  const reviewStateSummary = editor.locator("[data-asset-editor-review-state-summary='true']");
  await expectVisible(reviewStateSummary, `${label} visible editor review-state summary`);
  assert(
    (await reviewStateSummary.getAttribute("data-asset-editor-review-state")) === expectedReviewState,
    `${label} visible editor review-state summary mismatch`
  );
  const summaryText = (await reviewStateSummary.textContent()) ?? "";
  assert(
    summaryText.includes(expectedReviewState),
    `${label} visible editor review-state summary missing ${expectedReviewState}`
  );
}

async function assertLocalAssetEditorEvidenceSummary(editor, expectedEvidenceCount, label) {
  const evidenceCount = await editor.getAttribute("data-asset-editor-evidence-count");
  assert(
    evidenceCount === String(expectedEvidenceCount),
    `${label} editor evidence count mismatch: expected ${expectedEvidenceCount}, got ${evidenceCount ?? "missing"}`
  );
  const evidenceSummary = editor.locator("[data-asset-editor-evidence-summary='true']");
  await expectVisible(evidenceSummary, `${label} visible editor evidence summary`);
  assert(
    (await evidenceSummary.getAttribute("data-asset-editor-evidence-count")) === String(expectedEvidenceCount),
    `${label} visible editor evidence summary count mismatch`
  );
  const summaryText = (await evidenceSummary.textContent()) ?? "";
  assert(
    summaryText.includes(`${expectedEvidenceCount} claims`),
    `${label} visible editor evidence summary missing claim count copy`
  );
}

async function assertLocalAssetEditorWordPressDraftReadiness(editor, expectedReadyCount, expectedTotalCount, label) {
  const readiness = await editor.getAttribute("data-asset-editor-wordpress-draft-readiness");
  const readyCount = await editor.getAttribute("data-asset-editor-wordpress-draft-ready-count");
  const totalCount = await editor.getAttribute("data-asset-editor-wordpress-draft-total-count");
  const countsReconciled = await editor.getAttribute("data-asset-editor-wordpress-draft-readiness-counts-reconciled");
  assert(readiness === "blocked", `${label} editor WordPress draft readiness must stay blocked, got ${readiness}`);
  assert(
    readyCount === String(expectedReadyCount),
    `${label} editor WordPress draft ready count mismatch: expected ${expectedReadyCount}, got ${
      readyCount ?? "missing"
    }`
  );
  assert(
    totalCount === String(expectedTotalCount),
    `${label} editor WordPress draft total count mismatch: expected ${expectedTotalCount}, got ${
      totalCount ?? "missing"
    }`
  );
  assert(
    countsReconciled === "true",
    `${label} editor WordPress draft readiness reconciliation must be true, got ${
      countsReconciled ?? "missing"
    }`
  );
  const readinessSummary = editor.locator("[data-asset-editor-wordpress-draft-readiness='blocked']");
  await expectVisible(readinessSummary, `${label} visible editor WordPress draft readiness summary`);
  assert(
    (await readinessSummary.getAttribute("data-asset-editor-wordpress-draft-ready-count")) ===
      String(expectedReadyCount),
    `${label} visible editor WordPress draft ready count mismatch`
  );
  assert(
    (await readinessSummary.getAttribute("data-asset-editor-wordpress-draft-total-count")) ===
      String(expectedTotalCount),
    `${label} visible editor WordPress draft total count mismatch`
  );
  assert(
    (await readinessSummary.getAttribute("data-asset-editor-wordpress-draft-readiness-counts-reconciled")) === "true",
    `${label} visible editor WordPress draft readiness reconciliation mismatch`
  );
  const summaryText = (await readinessSummary.textContent()) ?? "";
  assert(
    summaryText.includes(`${expectedReadyCount}/${expectedTotalCount} ready`),
    `${label} visible editor WordPress draft readiness missing ready ratio copy`
  );
}

async function assertLocalAssetEditorExternalWriteClamp(editor, label) {
  const externalWriteAllowed = await editor.getAttribute("data-asset-editor-external-write-allowed");
  assert(
    externalWriteAllowed === "false",
    `${label} editor external-write clamp mismatch: expected false, got ${externalWriteAllowed ?? "missing"}`
  );
  const externalWriteSummary = editor.locator("[data-asset-editor-external-write-summary='true']");
  await expectVisible(externalWriteSummary, `${label} visible editor external-write summary`);
  assert(
    (await externalWriteSummary.getAttribute("data-asset-editor-external-write-allowed")) === "false",
    `${label} visible editor external-write summary clamp mismatch`
  );
  const summaryText = ((await externalWriteSummary.textContent()) ?? "").toLowerCase();
  assert(
    summaryText.includes("false") || summaryText.includes("disabled"),
    `${label} visible editor external-write summary missing false/disabled copy`
  );
}

async function assertLocalAssetEditorCommerceWriteClamp(editor, label) {
  const commerceWriteAllowed = await editor.getAttribute("data-asset-editor-commerce-write-allowed");
  assert(
    commerceWriteAllowed === "false",
    `${label} editor commerce-write clamp mismatch: expected false, got ${commerceWriteAllowed ?? "missing"}`
  );
  const commerceWriteSummary = editor.locator("[data-asset-editor-commerce-write-summary='true']");
  await expectVisible(commerceWriteSummary, `${label} visible editor commerce-write summary`);
  assert(
    (await commerceWriteSummary.getAttribute("data-asset-editor-commerce-write-allowed")) === "false",
    `${label} visible editor commerce-write summary clamp mismatch`
  );
  const summaryText = ((await commerceWriteSummary.textContent()) ?? "").toLowerCase();
  assert(
    summaryText.includes("false") || summaryText.includes("disabled"),
    `${label} visible editor commerce-write summary missing false/disabled copy`
  );
}

async function assertLocalAssetEditorCredentialCollectionClamp(editor, label) {
  const credentialCollectionAllowed = await editor.getAttribute(
    "data-asset-editor-credential-collection-allowed"
  );
  assert(
    credentialCollectionAllowed === "false",
    `${label} editor credential-collection clamp mismatch: expected false, got ${
      credentialCollectionAllowed ?? "missing"
    }`
  );
  const credentialCollectionSummary = editor.locator(
    "[data-asset-editor-credential-collection-summary='true']"
  );
  await expectVisible(credentialCollectionSummary, `${label} visible editor credential-collection summary`);
  assert(
    (await credentialCollectionSummary.getAttribute("data-asset-editor-credential-collection-allowed")) === "false",
    `${label} visible editor credential-collection summary clamp mismatch`
  );
  const summaryText = ((await credentialCollectionSummary.textContent()) ?? "").toLowerCase();
  assert(
    summaryText.includes("false") || summaryText.includes("disabled"),
    `${label} visible editor credential-collection summary missing false/disabled copy`
  );
}

async function assertLocalAssetEditorSyncExecutionClamp(editor, label) {
  const syncExecutionAllowed = await editor.getAttribute("data-asset-editor-sync-execution-allowed");
  assert(
    syncExecutionAllowed === "false",
    `${label} editor sync-execution clamp mismatch: expected false, got ${syncExecutionAllowed ?? "missing"}`
  );
  const syncExecutionSummary = editor.locator("[data-asset-editor-sync-execution-summary='true']");
  await expectVisible(syncExecutionSummary, `${label} visible editor sync-execution summary`);
  assert(
    (await syncExecutionSummary.getAttribute("data-asset-editor-sync-execution-allowed")) === "false",
    `${label} visible editor sync-execution summary clamp mismatch`
  );
  const summaryText = ((await syncExecutionSummary.textContent()) ?? "").toLowerCase();
  assert(
    summaryText.includes("false") || summaryText.includes("disabled"),
    `${label} visible editor sync-execution summary missing false/disabled copy`
  );
}

async function assertLocalAssetEditorPublishingClamp(editor, label) {
  const publishingAllowed = await editor.getAttribute("data-asset-editor-publishing-allowed");
  assert(
    publishingAllowed === "false",
    `${label} editor publishing clamp mismatch: expected false, got ${publishingAllowed ?? "missing"}`
  );
  const publishingSummary = editor.locator("[data-asset-editor-publishing-summary='true']");
  await expectVisible(publishingSummary, `${label} visible editor publishing summary`);
  assert(
    (await publishingSummary.getAttribute("data-asset-editor-publishing-allowed")) === "false",
    `${label} visible editor publishing summary clamp mismatch`
  );
  const summaryText = ((await publishingSummary.textContent()) ?? "").toLowerCase();
  assert(
    summaryText.includes("false") || summaryText.includes("disabled"),
    `${label} visible editor publishing summary missing false/disabled copy`
  );
}

async function assertLocalAssetEditorDirtyState(
  editor,
  expectedState,
  label,
  expectedDirtyFieldCount = null,
  expectedDirtyFieldKeys = null
) {
  const dirtyState = await editor.getAttribute("data-asset-editor-dirty-state");
  const dirtyFieldCount = await editor.getAttribute("data-asset-editor-dirty-field-count");
  const dirtyFieldKeys = await editor.getAttribute("data-asset-editor-dirty-field-keys");
  const dirtyFieldKeysReconciled = await editor.getAttribute("data-asset-editor-dirty-field-keys-reconciled");
  assert(
    dirtyState === expectedState,
    `${label} editor dirty state mismatch: expected ${expectedState}, got ${dirtyState ?? "missing"}`
  );
  assert(
    dirtyFieldKeysReconciled === "true",
    `${label} editor dirty field key reconciliation mismatch: expected true, got ${
      dirtyFieldKeysReconciled ?? "missing"
    }`
  );
  if (expectedDirtyFieldCount !== null) {
    assert(
      dirtyFieldCount === String(expectedDirtyFieldCount),
      `${label} editor dirty field count mismatch: expected ${expectedDirtyFieldCount}, got ${
        dirtyFieldCount ?? "missing"
      }`
    );
  }
  if (expectedDirtyFieldKeys !== null) {
    const actualDirtyFieldKeys = dirtyFieldKeys === "none" ? [] : (dirtyFieldKeys ?? "").split(",").filter(Boolean);
    assert(
      JSON.stringify(actualDirtyFieldKeys) === JSON.stringify(expectedDirtyFieldKeys),
      `${label} editor dirty field keys mismatch: expected ${expectedDirtyFieldKeys.join(",") || "none"}, got ${
        dirtyFieldKeys ?? "missing"
      }`
    );
  }
  const dirtySummary = editor.locator("[data-asset-editor-dirty-summary='true']");
  await expectVisible(dirtySummary, `${label} visible editor dirty-state summary row`);
  const visibleDirtyFieldCount = await dirtySummary.getAttribute("data-asset-editor-dirty-summary-field-count");
  const visibleDirtyFieldKeys = await dirtySummary.getAttribute("data-asset-editor-dirty-summary-field-keys");
  const visibleDirtyFieldKeysReconciled = await dirtySummary.getAttribute(
    "data-asset-editor-dirty-summary-field-keys-reconciled"
  );
  assert(
    visibleDirtyFieldKeysReconciled === "true",
    `${label} visible editor dirty field key reconciliation mismatch: expected true, got ${
      visibleDirtyFieldKeysReconciled ?? "missing"
    }`
  );
  if (expectedDirtyFieldCount !== null) {
    assert(
      visibleDirtyFieldCount === String(expectedDirtyFieldCount),
      `${label} visible editor dirty field count mismatch: expected ${expectedDirtyFieldCount}, got ${
        visibleDirtyFieldCount ?? "missing"
      }`
    );
  }
  if (expectedDirtyFieldKeys !== null) {
    const actualVisibleDirtyFieldKeys =
      visibleDirtyFieldKeys === "none" ? [] : (visibleDirtyFieldKeys ?? "").split(",").filter(Boolean);
    assert(
      JSON.stringify(actualVisibleDirtyFieldKeys) === JSON.stringify(expectedDirtyFieldKeys),
      `${label} visible editor dirty field keys mismatch: expected ${
        expectedDirtyFieldKeys.join(",") || "none"
      }, got ${visibleDirtyFieldKeys ?? "missing"}`
    );
  }
  const visibleDirtyState = ((await dirtySummary.locator("strong").textContent()) ?? "").trim();
  assert(
    visibleDirtyState === expectedState,
    `${label} visible editor dirty state mismatch: expected ${expectedState}, got ${visibleDirtyState || "missing"}`
  );
}

async function assertLocalAssetEditorFieldDiagnostics(
  editor,
  { expectedDirtyStates = null, expectedEmpty, expectedFilled, fieldCopy = "Fields", filledCopy = "filled", label }
) {
  const expectedFieldKeys = [
    "title",
    "slug",
    "meta_title",
    "meta_description",
    "structured_section_heading",
    "structured_section",
    "product_grid_notes",
    "faq_question",
    "faq_answer",
    "schema_preview",
    "internal_link_reference",
    "editor_note"
  ];
  const expectedFieldCount = String(expectedFieldKeys.length);
  const fieldCount = await editor.getAttribute("data-asset-editor-field-count");
  const filledFieldCount = await editor.getAttribute("data-asset-editor-filled-field-count");
  const emptyFieldCount = await editor.getAttribute("data-asset-editor-empty-field-count");
  const dirtyFieldCount = await editor.getAttribute("data-asset-editor-dirty-field-count");
  const countsReconciled = await editor.getAttribute("data-asset-editor-field-counts-reconciled");
  const fieldReadinessState = await editor.getAttribute("data-asset-editor-field-readiness-state");
  const expectedReadinessState = expectedEmpty === 0 ? "all_fields_filled" : "incomplete_fields";
  assert(
    fieldCount === expectedFieldCount,
    `${label} editor field count mismatch: expected ${expectedFieldCount}, got ${fieldCount ?? "missing"}`
  );
  assert(
    filledFieldCount === String(expectedFilled),
    `${label} editor filled field count mismatch: expected ${expectedFilled}, got ${filledFieldCount ?? "missing"}`
  );
  assert(
    emptyFieldCount === String(expectedEmpty),
    `${label} editor empty field count mismatch: expected ${expectedEmpty}, got ${emptyFieldCount ?? "missing"}`
  );
  assert(
    countsReconciled === "true",
    `${label} editor field count reconciliation mismatch: expected true, got ${countsReconciled ?? "missing"}`
  );
  assert(
    fieldReadinessState === expectedReadinessState,
    `${label} editor field readiness mismatch: expected ${expectedReadinessState}, got ${
      fieldReadinessState ?? "missing"
    }`
  );
  const fieldSummary = editor.locator("[data-asset-editor-field-summary='true']");
  await expectVisible(fieldSummary, `${label} editor field summary diagnostics`);
  await expectVisible(fieldSummary.getByText(fieldCopy), `${label} visible editor field summary label`);
  const fieldReadinessSummary = fieldSummary.locator("[data-asset-editor-field-readiness='true']");
  await expectVisible(fieldReadinessSummary, `${label} visible editor field readiness summary row`);
  const visibleReadinessFilledCount = await fieldReadinessSummary.getAttribute(
    "data-asset-editor-field-readiness-filled-count"
  );
  const visibleReadinessEmptyCount = await fieldReadinessSummary.getAttribute(
    "data-asset-editor-field-readiness-empty-count"
  );
  const visibleReadinessTotalCount = await fieldReadinessSummary.getAttribute(
    "data-asset-editor-field-readiness-total-count"
  );
  const visibleReadinessCountsReconciled = await fieldReadinessSummary.getAttribute(
    "data-asset-editor-field-readiness-counts-reconciled"
  );
  assert(
    visibleReadinessFilledCount === String(expectedFilled),
    `${label} visible field readiness filled count mismatch: expected ${expectedFilled}, got ${
      visibleReadinessFilledCount ?? "missing"
    }`
  );
  assert(
    visibleReadinessEmptyCount === String(expectedEmpty),
    `${label} visible field readiness empty count mismatch: expected ${expectedEmpty}, got ${
      visibleReadinessEmptyCount ?? "missing"
    }`
  );
  assert(
    visibleReadinessTotalCount === fieldCount,
    `${label} visible field readiness total count mismatch: expected ${fieldCount}, got ${
      visibleReadinessTotalCount ?? "missing"
    }`
  );
  assert(
    visibleReadinessCountsReconciled === "true",
    `${label} visible field readiness count reconciliation mismatch: expected true, got ${
      visibleReadinessCountsReconciled ?? "missing"
    }`
  );
  assert(
    Number(visibleReadinessFilledCount) + Number(visibleReadinessEmptyCount) ===
      Number(visibleReadinessTotalCount),
    `${label} visible field readiness counts must reconcile: ${visibleReadinessFilledCount}/${
      visibleReadinessEmptyCount
    }/${visibleReadinessTotalCount}`
  );
  const visibleReadinessState = ((await fieldReadinessSummary.locator("strong").textContent()) ?? "").trim();
  assert(
    visibleReadinessState === expectedReadinessState,
    `${label} visible editor field readiness mismatch: expected ${expectedReadinessState}, got ${
      visibleReadinessState || "missing"
    }`
  );
  await expectVisible(
    fieldSummary.getByText(`${expectedFilled}/${expectedFieldCount} ${filledCopy}`),
    `${label} visible editor field fill summary`
  );
  const fieldRows = await editor.locator("[data-asset-editor-field='true']").evaluateAll((elements) =>
    elements.map((element) => ({
      dirtyState: element.getAttribute("data-asset-editor-field-dirty-state"),
      key: element.getAttribute("data-asset-editor-field-key"),
      state: element.getAttribute("data-asset-editor-field-state")
    }))
  );
  assert(
    fieldRows.length === expectedFieldKeys.length,
    `${label} editor field row count mismatch: expected ${expectedFieldKeys.length}, got ${fieldRows.length}`
  );
  for (const expectedKey of expectedFieldKeys) {
    const fieldRow = fieldRows.find((row) => row.key === expectedKey);
    assert(fieldRow, `${label} editor missing field diagnostics for ${expectedKey}`);
    assert(
      fieldRow.state === "filled" || fieldRow.state === "empty",
      `${label} editor field ${expectedKey} has invalid fill state: ${fieldRow.state ?? "missing"}`
    );
    assert(
      fieldRow.dirtyState === "clean" || fieldRow.dirtyState === "dirty",
      `${label} editor field ${expectedKey} has invalid dirty state: ${fieldRow.dirtyState ?? "missing"}`
    );
    if (expectedDirtyStates) {
      assert(
        fieldRow.dirtyState === expectedDirtyStates[expectedKey],
        `${label} editor field ${expectedKey} dirty state mismatch: expected ${
          expectedDirtyStates[expectedKey]
        }, got ${fieldRow.dirtyState ?? "missing"}`
      );
    }
  }
  const filledFieldRows = fieldRows.filter((row) => row.state === "filled").length;
  const emptyFieldRows = fieldRows.filter((row) => row.state === "empty").length;
  const dirtyFieldRows = fieldRows.filter((row) => row.dirtyState === "dirty").length;
  assert(
    fieldRows.length === Number(fieldCount),
    `${label} editor field row count must reconcile with field count: expected ${fieldCount}, got ${fieldRows.length}`
  );
  assert(
    filledFieldRows + emptyFieldRows === Number(fieldCount),
    `${label} editor field state totals must reconcile with field count: expected ${fieldCount}, got ${
      filledFieldRows + emptyFieldRows
    }`
  );
  assert(
    filledFieldRows === expectedFilled,
    `${label} editor filled field row mismatch: expected ${expectedFilled}, got ${filledFieldRows}`
  );
  assert(
    emptyFieldRows === expectedEmpty,
    `${label} editor empty field row mismatch: expected ${expectedEmpty}, got ${emptyFieldRows}`
  );
  assert(
    dirtyFieldRows === Number(dirtyFieldCount),
    `${label} editor dirty field rows must reconcile with dirty field count: expected ${dirtyFieldCount}, got ${
      dirtyFieldRows
    }`
  );
}

async function assertLocalAssetEditorClaimLedger(editor, expectedClaims, label) {
  const claimCount = await editor.getAttribute("data-asset-editor-claim-count");
  const claimCountsReconciled = await editor.getAttribute("data-asset-editor-claim-counts-reconciled");
  assert(
    claimCount === String(expectedClaims.length),
    `${label} editor claim count mismatch: expected ${expectedClaims.length}, got ${claimCount ?? "missing"}`
  );
  assert(
    claimCountsReconciled === "true",
    `${label} editor claim count reconciliation marker must be true, got ${claimCountsReconciled ?? "missing"}`
  );
  const claimRows = await editor.locator("[data-asset-editor-claim-detail]").evaluateAll((elements) =>
    elements.map((element) => ({
      id: element.getAttribute("data-asset-editor-claim-id"),
      source: element.getAttribute("data-asset-editor-claim-source"),
      text: element.textContent ?? ""
    }))
  );
  assert(
    claimRows.length === expectedClaims.length,
    `${label} editor claim row count mismatch: expected ${expectedClaims.length}, got ${claimRows.length}`
  );
  for (const expectedClaim of expectedClaims) {
    assert(
      claimRows.some(
        (claim) =>
          claim.id === expectedClaim.id &&
          claim.source === expectedClaim.source &&
          claim.text.includes(expectedClaim.text)
      ),
      `${label} editor missing claim detail ${expectedClaim.id}`
    );
  }
  const serializedClaims = JSON.stringify(claimRows);
  for (const forbidden of ["metadata", "credential", "token", "secret", "password", "api_key", "published"]) {
    assert(
      !serializedClaims.toLowerCase().includes(forbidden),
      `${label} editor claim detail leaked unsafe copy: ${forbidden}`
    );
  }
}

async function assertLocalAssetEditorClaimSourceDistribution(editor, expectedDistribution, label) {
  const expectedEntries = Object.entries(expectedDistribution).sort(([left], [right]) => left.localeCompare(right));
  const expectedTotal = expectedEntries.reduce((sum, [, count]) => sum + count, 0);
  const sourceCount = Number(await editor.getAttribute("data-asset-editor-claim-source-count"));
  const totalCount = Number(await editor.getAttribute("data-asset-editor-claim-source-total-count"));
  const reconciled = await editor.getAttribute("data-asset-editor-claim-source-counts-reconciled");
  const rows = await editor.locator("[data-asset-editor-claim-source-row='true']").evaluateAll((elements) =>
    elements.map((element) => ({
      count: Number(element.getAttribute("data-asset-editor-claim-source-row-count")),
      source: element.getAttribute("data-asset-editor-claim-source-key"),
      text: element.textContent ?? ""
    }))
  );
  assert(
    sourceCount === expectedEntries.length,
    `${label} editor claim source count mismatch: expected ${expectedEntries.length}, got ${sourceCount}`
  );
  assert(
    totalCount === expectedTotal,
    `${label} editor claim source total mismatch: expected ${expectedTotal}, got ${totalCount}`
  );
  assert(reconciled === "true", `${label} editor claim source reconciliation marker must be true`);
  assert(
    rows.length === expectedEntries.length,
    `${label} editor claim source row count mismatch: expected ${expectedEntries.length}, got ${rows.length}`
  );
  assert(
    rows.reduce((sum, row) => sum + row.count, 0) === expectedTotal,
    `${label} editor claim source rows must reconcile with total ${expectedTotal}`
  );
  for (const [source, count] of expectedEntries) {
    assert(
      rows.some((row) => row.source === source && row.count === count && row.text.includes(`${source} ${count}`)),
      `${label} editor missing claim source distribution row ${source}:${count}`
    );
  }
}

async function assertLocalAssetEditorContentBlockTypeDistribution(editor, expectedContentBlockTypes, label) {
  const expectedDistribution = expectedContentBlockTypes.reduce((counts, blockType) => {
    counts[blockType] = (counts[blockType] ?? 0) + 1;
    return counts;
  }, {});
  const expectedEntries = Object.entries(expectedDistribution).sort(([left], [right]) => left.localeCompare(right));
  const expectedTotal = expectedEntries.reduce((sum, [, count]) => sum + count, 0);
  const contentBlockCount = Number(await editor.getAttribute("data-asset-editor-content-block-count"));
  const contentBlockCountsReconciled = await editor.getAttribute("data-asset-editor-content-block-counts-reconciled");
  const typeCount = Number(await editor.getAttribute("data-asset-editor-content-block-type-count"));
  const totalCount = Number(await editor.getAttribute("data-asset-editor-content-block-type-total-count"));
  const reconciled = await editor.getAttribute("data-asset-editor-content-block-type-counts-reconciled");
  const rows = await editor.locator("[data-asset-editor-content-block-type-row='true']").evaluateAll((elements) =>
    elements.map((element) => ({
      count: Number(element.getAttribute("data-asset-editor-content-block-type-row-count")),
      text: element.textContent ?? "",
      type: element.getAttribute("data-asset-editor-content-block-type-key")
    }))
  );
  assert(
    contentBlockCount === expectedTotal,
    `${label} editor content block count mismatch: expected ${expectedTotal}, got ${contentBlockCount}`
  );
  assert(
    contentBlockCountsReconciled === "true",
    `${label} editor content block count reconciliation marker must be true, got ${
      contentBlockCountsReconciled ?? "missing"
    }`
  );
  assert(
    typeCount === expectedEntries.length,
    `${label} editor content block type count mismatch: expected ${expectedEntries.length}, got ${typeCount}`
  );
  assert(
    totalCount === expectedTotal,
    `${label} editor content block type total mismatch: expected ${expectedTotal}, got ${totalCount}`
  );
  assert(reconciled === "true", `${label} editor content block type reconciliation marker must be true`);
  assert(
    rows.length === expectedEntries.length,
    `${label} editor content block type row count mismatch: expected ${expectedEntries.length}, got ${rows.length}`
  );
  assert(
    rows.reduce((sum, row) => sum + row.count, 0) === expectedTotal,
    `${label} editor content block type rows must reconcile with total ${expectedTotal}`
  );
  for (const [blockType, count] of expectedEntries) {
    assert(
      rows.some((row) => row.type === blockType && row.count === count && row.text.includes(`${blockType} ${count}`)),
      `${label} editor missing content block type distribution row ${blockType}:${count}`
    );
  }
}

async function assertLocalAssetEditorCanSave(
  page,
  label,
  {
    entryName = "Review local draft",
    externalWritesCopy = "External writes disabled",
    fieldCopy = "Fields",
    filledCopy = "filled",
    localOnlyCopy = "Local draft only",
    qaChecksCopy = "QA checks",
    qaPendingSuffix = "pending",
    qaReadinessCopy = "QA readiness",
    savedEmptyFieldCount = 9,
    savedFilledFieldCount = 3,
    saveName = "Save local draft",
    saveSuccessCopy = "Local draft saved",
    titleValue = "Updated local camping espresso draft",
    expectedContentBlockTypes = null,
    expectedClaims = null,
    wordpressBlockedCopy = "WordPress draft creation blocked",
    woocommerceBlockedCopy = "WooCommerce writes blocked"
  } = {}
) {
  await clickUnique(page.getByRole("button", { name: entryName }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} local asset editor`);
  await assertLocalAssetEditorSaveState(editor, "idle", `${label} initial`);
  await assertLocalAssetEditorDirtyState(editor, "clean", `${label} initial`, 0, []);
  await assertLocalAssetEditorFieldDiagnostics(editor, {
    expectedDirtyStates: {
      editor_note: "clean",
      faq_answer: "clean",
      faq_question: "clean",
      internal_link_reference: "clean",
      meta_description: "clean",
      meta_title: "clean",
      product_grid_notes: "clean",
      schema_preview: "clean",
      slug: "clean",
      structured_section_heading: "clean",
      structured_section: "clean",
      title: "clean"
    },
    expectedEmpty: 9,
    expectedFilled: 3,
    fieldCopy,
    filledCopy,
    label: `${label} initial`
  });
  await expectVisible(page.getByText(localOnlyCopy), `${label} local-only editor copy`);
  await expectVisible(page.getByText(externalWritesCopy), `${label} external-write disabled editor copy`);
  await expectVisible(page.getByText(wordpressBlockedCopy), `${label} WordPress block editor copy`);
  await expectVisible(page.getByText(woocommerceBlockedCopy), `${label} WooCommerce block editor copy`);
  if (expectedClaims) {
    await assertLocalAssetEditorClaimLedger(editor, expectedClaims, `${label} initial`);
  }
  if (expectedContentBlockTypes) {
    await assertLocalAssetEditorContentBlockTypeDistribution(editor, expectedContentBlockTypes, `${label} initial`);
  }
  const expectedSafetyCapabilities = [
    { copy: externalWritesCopy, key: "external_writes" },
    { copy: wordpressBlockedCopy, key: "wordpress_draft_creation" },
    { copy: woocommerceBlockedCopy, key: "woocommerce_writes" }
  ];
  const safetyPanel = editor.locator("[data-asset-editor-safety='blocked']");
  await expectVisible(safetyPanel, `${label} editor safety diagnostics`);
  const blockedCapabilityCount = await safetyPanel.getAttribute("data-asset-editor-blocked-capability-count");
  const blockedCapabilityCountsReconciled = await safetyPanel.getAttribute(
    "data-asset-editor-blocked-capability-counts-reconciled"
  );
  assert(
    blockedCapabilityCount === String(expectedSafetyCapabilities.length),
    `${label} editor blocked capability count mismatch: expected ${expectedSafetyCapabilities.length}, got ${
      blockedCapabilityCount ?? "missing"
    }`
  );
  assert(
    blockedCapabilityCountsReconciled === "true",
    `${label} editor blocked capability reconciliation marker must be true, got ${
      blockedCapabilityCountsReconciled ?? "missing"
    }`
  );
  const blockedCapabilities = await safetyPanel
    .locator("[data-asset-editor-blocked-capability='true']")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        key: element.getAttribute("data-asset-editor-blocked-capability-key"),
        text: element.textContent ?? ""
      }))
    );
  assert(
    blockedCapabilities.length === expectedSafetyCapabilities.length,
    `${label} editor blocked capability rows mismatch: expected ${
      expectedSafetyCapabilities.length
    }, got ${blockedCapabilities.length}`
  );
  assert(
    blockedCapabilities.length === Number(blockedCapabilityCount),
    `${label} editor blocked capability rows must reconcile with count`
  );
  for (const expectedCapability of expectedSafetyCapabilities) {
    const matchingCapability = blockedCapabilities.find((capability) => capability.key === expectedCapability.key);
    assert(matchingCapability, `${label} editor missing blocked capability key: ${expectedCapability.key}`);
    assert(
      matchingCapability.text.includes(expectedCapability.copy),
      `${label} editor blocked capability ${expectedCapability.key} missing visible safety copy`
    );
  }
  const editorQaCheckCount = await editor.getAttribute("data-asset-editor-qa-check-count");
  const editorQaPendingCount = await editor.getAttribute("data-asset-editor-qa-pending-count");
  const editorQaReadinessState = await editor.getAttribute("data-asset-editor-qa-readiness-state");
  const editorQaReadinessPendingCount = Number(
    await editor.getAttribute("data-asset-editor-qa-readiness-pending-count")
  );
  const editorQaReadinessTotalCount = Number(await editor.getAttribute("data-asset-editor-qa-readiness-total-count"));
  const editorQaReadinessCountsReconciled = await editor.getAttribute(
    "data-asset-editor-qa-readiness-counts-reconciled"
  );
  assert(editorQaCheckCount !== null, `${label} editor must expose QA check count diagnostics`);
  assert(editorQaPendingCount !== null, `${label} editor must expose QA pending count diagnostics`);
  assert(editorQaReadinessState !== null, `${label} editor must expose QA readiness diagnostics`);
  const qaDetailRows = await editor.locator("[data-asset-editor-qa-detail]").evaluateAll((elements) =>
    elements.map((element) => ({
      key: element.getAttribute("data-asset-editor-qa-key"),
      status: element.getAttribute("data-asset-editor-qa-status"),
      text: element.textContent ?? ""
    }))
  );
  assert(qaDetailRows.length > 0, `${label} editor must render read-only QA detail diagnostics`);
  assert(
    editorQaCheckCount === String(qaDetailRows.length),
    `${label} editor QA check count should equal detail rows: expected ${qaDetailRows.length}, got ${editorQaCheckCount}`
  );
  const pendingQaRows = qaDetailRows.filter((detail) => detail.status === "pending").length;
  assert(
    editorQaPendingCount === String(pendingQaRows),
    `${label} editor QA pending count should equal pending detail rows: expected ${pendingQaRows}, got ${editorQaPendingCount}`
  );
  assert(
    editorQaReadinessState === (pendingQaRows > 0 ? "pending_qa" : "qa_clear"),
    `${label} editor QA readiness mismatch: expected ${
      pendingQaRows > 0 ? "pending_qa" : "qa_clear"
    }, got ${editorQaReadinessState}`
  );
  assert(
    editorQaReadinessPendingCount === pendingQaRows,
    `${label} editor QA readiness pending count mismatch: expected ${pendingQaRows}, got ${editorQaReadinessPendingCount}`
  );
  assert(
    editorQaReadinessTotalCount === qaDetailRows.length,
    `${label} editor QA readiness total count mismatch: expected ${qaDetailRows.length}, got ${editorQaReadinessTotalCount}`
  );
  assert(
    editorQaReadinessCountsReconciled === "true",
    `${label} editor QA readiness count reconciliation marker must be true, got ${
      editorQaReadinessCountsReconciled ?? "missing"
    }`
  );
  const editorQaDetailCount = Number(await editor.getAttribute("data-asset-editor-qa-detail-count"));
  const editorQaPendingDetailCount = Number(await editor.getAttribute("data-asset-editor-qa-pending-detail-count"));
  const editorQaCountsReconciled = await editor.getAttribute("data-asset-editor-qa-counts-reconciled");
  const editorQaPendingCountsReconciled = await editor.getAttribute("data-asset-editor-qa-pending-counts-reconciled");
  assert(
    editorQaDetailCount === qaDetailRows.length,
    `${label} editor QA detail count mismatch: expected ${qaDetailRows.length}, got ${editorQaDetailCount}`
  );
  assert(
    editorQaPendingDetailCount === pendingQaRows,
    `${label} editor QA pending detail count mismatch: expected ${pendingQaRows}, got ${editorQaPendingDetailCount}`
  );
  assert(
    editorQaCountsReconciled === "true",
    `${label} editor QA count reconciliation marker must be true, got ${editorQaCountsReconciled ?? "missing"}`
  );
  assert(
    editorQaPendingCountsReconciled === "true",
    `${label} editor QA pending count reconciliation marker must be true, got ${
      editorQaPendingCountsReconciled ?? "missing"
    }`
  );
  const qaSummary = editor.locator("[data-asset-editor-qa-summary='true']");
  await expectVisible(qaSummary, `${label} editor QA aggregate summary`);
  await expectVisible(
    qaSummary.locator("[data-asset-editor-qa-readiness='true']"),
    `${label} editor QA readiness summary row`
  );
  await expectVisible(
    qaSummary.locator("[data-asset-editor-qa-checks='true']"),
    `${label} editor QA checks summary row`
  );
  await expectVisible(qaSummary.getByText(qaReadinessCopy), `${label} visible editor QA readiness label`);
  await expectVisible(qaSummary.getByText(editorQaReadinessState), `${label} visible editor QA readiness state`);
  const qaReadinessRow = qaSummary.locator("[data-asset-editor-qa-readiness='true']");
  assert(
    (await qaReadinessRow.getAttribute("data-asset-editor-qa-readiness-pending-count")) === String(pendingQaRows),
    `${label} visible editor QA readiness summary must expose pending count`
  );
  assert(
    (await qaReadinessRow.getAttribute("data-asset-editor-qa-readiness-total-count")) === String(qaDetailRows.length),
    `${label} visible editor QA readiness summary must expose total count`
  );
  assert(
    (await qaReadinessRow.getAttribute("data-asset-editor-qa-readiness-counts-reconciled")) === "true",
    `${label} visible editor QA readiness summary must expose reconciliation marker`
  );
  await expectVisible(qaSummary.getByText(qaChecksCopy), `${label} visible editor QA checks label`);
  await expectVisible(
    qaSummary.getByText(`${editorQaPendingCount}/${editorQaCheckCount} ${qaPendingSuffix}`),
    `${label} visible editor QA pending summary`
  );
  const expectedQaStatusDistribution = qaDetailRows.reduce((counts, detail) => {
    counts[detail.status] = (counts[detail.status] ?? 0) + 1;
    return counts;
  }, {});
  const expectedQaStatusEntries = Object.entries(expectedQaStatusDistribution).sort(([left], [right]) =>
    String(left).localeCompare(String(right))
  );
  const editorQaStatusCount = Number(await editor.getAttribute("data-asset-editor-qa-status-count"));
  const editorQaStatusTotal = Number(await editor.getAttribute("data-asset-editor-qa-status-total-count"));
  const editorQaStatusReconciled = await editor.getAttribute("data-asset-editor-qa-status-counts-reconciled");
  const editorQaStatusRows = await editor.locator("[data-asset-editor-qa-status-row='true']").evaluateAll((elements) =>
    elements.map((element) => ({
      count: Number(element.getAttribute("data-asset-editor-qa-status-row-count")),
      status: element.getAttribute("data-asset-editor-qa-status-key"),
      text: element.textContent ?? ""
    }))
  );
  assert(
    editorQaStatusCount === expectedQaStatusEntries.length,
    `${label} editor QA status count mismatch: expected ${expectedQaStatusEntries.length}, got ${editorQaStatusCount}`
  );
  assert(
    editorQaStatusTotal === qaDetailRows.length,
    `${label} editor QA status total mismatch: expected ${qaDetailRows.length}, got ${editorQaStatusTotal}`
  );
  assert(
    editorQaStatusReconciled === "true",
    `${label} editor QA status reconciliation marker must be true, got ${editorQaStatusReconciled ?? "missing"}`
  );
  assert(
    editorQaStatusRows.length === expectedQaStatusEntries.length,
    `${label} editor QA status row count mismatch: expected ${expectedQaStatusEntries.length}, got ${
      editorQaStatusRows.length
    }`
  );
  assert(
    editorQaStatusRows.reduce((sum, statusRow) => sum + statusRow.count, 0) === qaDetailRows.length,
    `${label} editor QA status rows must reconcile with QA detail count`
  );
  for (const [status, count] of expectedQaStatusEntries) {
    assert(
      editorQaStatusRows.some(
        (statusRow) => statusRow.status === status && statusRow.count === count && statusRow.text.includes(`${status} ${count}`)
      ),
      `${label} editor missing QA status distribution row ${status}:${count}`
    );
  }
  for (const qaDetail of qaDetailRows) {
    assert(qaDetail.key, `${label} editor QA detail must expose a key diagnostic`);
    assert(qaDetail.status, `${label} editor QA detail must expose a status diagnostic`);
    assert(
      qaDetail.text.includes(`${qaDetail.key}:${qaDetail.status}`),
      `${label} editor QA detail must show safe key/status copy`
    );
  }
  const serializedQaDetails = JSON.stringify(qaDetailRows);
  for (const forbidden of ["metadata", "credential", "token", "secret", "password", "api_key", "published"]) {
    assert(
      !serializedQaDetails.toLowerCase().includes(forbidden),
      `${label} editor QA detail leaked unsafe copy: ${forbidden}`
    );
  }

  const editorText = ((await editor.textContent()) ?? "").toLowerCase();
  for (const pattern of [/\bpublish\b/, /\bsync\b/, /\bconnect\b/, /\boauth\b/, /\bautopilot\b/]) {
    assert(!pattern.test(editorText), `${label} editor exposes unsafe copy: ${pattern}`);
  }
  const forbiddenControls = [
    "a",
    "[href]",
    "[role='link']",
    "input[type='password']",
    "input[name*='token' i]",
    "input[name*='secret' i]",
    "input[name*='api' i]",
    "input[name*='oauth' i]",
    "input[name*='credential' i]"
  ].join(", ");
  const forbiddenControlCount = await editor.locator(forbiddenControls).count();
  assert(forbiddenControlCount === 0, `${label} editor exposes unsafe navigation or credential controls`);

  await editor.locator("input").first().fill(titleValue);
  await editor.locator("textarea").first().fill("Compare portable espresso kits for camp coffee.");
  await editor.locator("[data-asset-editor-section-heading='true'] input").fill("Camping espresso kit comparison");
  await editor.locator("[data-asset-editor-product-grid-notes='true'] textarea").fill("Feature manual brewers, compact grinders, and kettle bundles.");
  await editor.locator("[data-asset-editor-faq-question='true'] input").fill("Can I use a manual espresso maker at camp?");
  await editor.locator("[data-asset-editor-faq-answer='true'] textarea").fill("Yes. Use a compact brewer and preheat the cup.");
  await editor.locator("[data-asset-editor-schema-preview='true'] input").fill("FAQPage");
  await editor.locator("[data-asset-editor-internal-link-reference='true'] input").fill("collection:camping-coffee");
  await assertLocalAssetEditorDirtyState(editor, "dirty", `${label} edited`, 8, [
    "title",
    "meta_description",
    "structured_section_heading",
    "product_grid_notes",
    "faq_question",
    "faq_answer",
    "schema_preview",
    "internal_link_reference"
  ]);
  await assertLocalAssetEditorFieldDiagnostics(editor, {
    expectedDirtyStates: {
      editor_note: "clean",
      faq_answer: "dirty",
      faq_question: "dirty",
      internal_link_reference: "dirty",
      meta_description: "dirty",
      meta_title: "clean",
      product_grid_notes: "dirty",
      schema_preview: "dirty",
      slug: "clean",
      structured_section_heading: "dirty",
      structured_section: "clean",
      title: "dirty"
    },
    expectedEmpty: 2,
    expectedFilled: 10,
    fieldCopy,
    filledCopy,
    label: `${label} edited`
  });
  await clickUnique(editor.getByRole("button", { name: saveName }), `${label} local save button`);
  await expectVisible(page.getByText(saveSuccessCopy), `${label} local save success copy`);
  await assertLocalAssetEditorSaveState(editor, "saved", `${label} saved`);
  await assertLocalAssetEditorDirtyState(editor, "clean", `${label} saved`, 0, []);
  await assertLocalAssetEditorFieldDiagnostics(editor, {
    expectedDirtyStates: {
      editor_note: "clean",
      faq_answer: "clean",
      faq_question: "clean",
      internal_link_reference: "clean",
      meta_description: "clean",
      meta_title: "clean",
      product_grid_notes: "clean",
      schema_preview: "clean",
      slug: "clean",
      structured_section_heading: "clean",
      structured_section: "clean",
      title: "clean"
    },
    expectedEmpty: savedEmptyFieldCount,
    expectedFilled: savedFilledFieldCount,
    fieldCopy,
    filledCopy,
    label: `${label} saved`
  });
  return editor;
}

async function assertLocalAssetEditorFieldReadinessCanBecomeComplete(
  editor,
  label,
  { fieldCopy = "Fields", filledCopy = "filled" } = {}
) {
  await editor.locator("textarea").nth(0).fill("Compare portable espresso kits for camp coffee.");
  await editor.locator("[data-asset-editor-section-heading='true'] input").fill("Camping espresso kit comparison");
  await editor.locator("textarea").nth(1).fill("Local section covers buyer objections and comparisons.");
  await editor.locator("[data-asset-editor-product-grid-notes='true'] textarea").fill("Feature compact grinders, manual brewers, and kettle bundles.");
  await editor.locator("[data-asset-editor-faq-question='true'] input").fill("Can I use this at a campsite?");
  await editor.locator("[data-asset-editor-faq-answer='true'] textarea").fill("Yes. Keep the brewer compact and water hot.");
  await editor.locator("[data-asset-editor-schema-preview='true'] input").fill("FAQPage");
  await editor.locator("[data-asset-editor-internal-link-reference='true'] input").fill("collection:camping-coffee");
  await editor.locator("[data-asset-editor-field-key='editor_note'] textarea").fill("Keep claims grounded in imported evidence.");
  await assertLocalAssetEditorDirtyState(editor, "dirty", `${label} complete`, 9, [
    "meta_description",
    "structured_section_heading",
    "structured_section",
    "product_grid_notes",
    "faq_question",
    "faq_answer",
    "schema_preview",
    "internal_link_reference",
    "editor_note"
  ]);
  await assertLocalAssetEditorFieldDiagnostics(editor, {
    expectedDirtyStates: {
      editor_note: "dirty",
      faq_answer: "dirty",
      faq_question: "dirty",
      internal_link_reference: "dirty",
      meta_description: "dirty",
      meta_title: "clean",
      product_grid_notes: "dirty",
      schema_preview: "dirty",
      slug: "clean",
      structured_section_heading: "dirty",
      structured_section: "dirty",
      title: "clean"
    },
    expectedEmpty: 0,
    expectedFilled: 12,
    fieldCopy,
    filledCopy,
    label: `${label} complete`
  });
}

async function assertLocalAssetEditorSaveFailure(page, label) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} local asset editor`);
  await editor.locator("input").first().fill("Failed local save test");
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} local save button`);
  await expectVisible(page.getByText("Local save failed"), `${label} local save failure copy`);
  await assertLocalAssetEditorSaveState(editor, "failed", `${label} failed`);
  const saveButtonDisabled = await editor.getByRole("button", { name: "Save local draft" }).isDisabled();
  assert(!saveButtonDisabled, `${label} local save button must be re-enabled after failure`);
}

async function assertLocalAssetEditorRetryAfterFailure(page, label) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} local asset editor`);
  await editor.locator("input").first().fill("Recovered local save test");
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} first local save button`);
  await expectVisible(page.getByText("Local save failed"), `${label} local save failure copy`);
  await assertLocalAssetEditorSaveState(editor, "failed", `${label} retry failed`);
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} retry local save button`);
  await expectVisible(page.getByText("Local draft saved"), `${label} local save retry success copy`);
  await assertLocalAssetEditorSaveState(editor, "saved", `${label} retry saved`);
  const failureCopyCount = await page.getByText("Local save failed").count();
  assert(failureCopyCount === 0, `${label} local save failure copy must clear after retry success`);
}

async function assertLocalAssetEditorCloseWithoutWrite(page, label) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} local asset editor`);
  await editor.locator("input").first().fill("Unsaved close-only local title");
  await editor.locator("textarea").first().fill("This local edit should be abandoned without a PATCH.");
  await clickUnique(editor.getByRole("button", { name: "Close" }), `${label} close local editor button`);

  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if ((await page.locator(".asset-editor-panel").count()) === 0) return;
    await delay(50);
  }

  throw new Error(`${label} local asset editor did not close`);
}

async function assertLocalAssetEditorResetLocalChanges(page, label, expectedTitle) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} local asset editor`);
  await assertLocalAssetEditorSaveState(editor, "idle", `${label} initial`);
  await assertLocalAssetEditorDirtyState(editor, "clean", `${label} initial`, 0, []);

  await editor.locator("input").nth(0).fill("Reset-only unsaved local title");
  await editor.locator("input").nth(1).fill("reset-only-unsaved-slug");
  await editor.locator("input").nth(2).fill("Reset-only unsaved meta title");
  await editor.locator("textarea").nth(0).fill("Reset-only unsaved meta description.");
  await editor.locator("[data-asset-editor-section-heading='true'] input").fill("Reset-only unsaved section heading");
  await editor.locator("textarea").nth(1).fill("Reset-only unsaved local section.");
  await editor.locator("[data-asset-editor-product-grid-notes='true'] textarea").fill("Reset-only unsaved product grid notes.");
  await editor.locator("[data-asset-editor-faq-question='true'] input").fill("Reset-only unsaved FAQ question?");
  await editor.locator("[data-asset-editor-faq-answer='true'] textarea").fill("Reset-only unsaved FAQ answer.");
  await editor.locator("[data-asset-editor-schema-preview='true'] input").fill("FAQPage");
  await editor.locator("[data-asset-editor-internal-link-reference='true'] input").fill("collection:reset-only");
  await editor.locator("[data-asset-editor-field-key='editor_note'] textarea").fill("Reset-only unsaved editor note.");
  await assertLocalAssetEditorDirtyState(editor, "dirty", `${label} edited`, 12, [
    "title",
    "slug",
    "meta_title",
    "meta_description",
    "structured_section_heading",
    "structured_section",
    "product_grid_notes",
    "faq_question",
    "faq_answer",
    "schema_preview",
    "internal_link_reference",
    "editor_note"
  ]);
  await assertLocalAssetEditorFieldDiagnostics(editor, {
    expectedDirtyStates: {
      editor_note: "dirty",
      faq_answer: "dirty",
      faq_question: "dirty",
      internal_link_reference: "dirty",
      meta_description: "dirty",
      meta_title: "dirty",
      product_grid_notes: "dirty",
      schema_preview: "dirty",
      slug: "dirty",
      structured_section_heading: "dirty",
      structured_section: "dirty",
      title: "dirty"
    },
    expectedEmpty: 0,
    expectedFilled: 12,
    label: `${label} edited`
  });

  const resetButton = editor.locator("[data-asset-editor-reset-control='true']");
  await expectVisible(resetButton, `${label} reset local changes control`);
  await clickUnique(resetButton, `${label} reset local changes button`);

  const resetTitle = await editor.locator("input").nth(0).inputValue();
  const resetSlug = await editor.locator("input").nth(1).inputValue();
  const resetMetaTitle = await editor.locator("input").nth(2).inputValue();
  const resetMetaDescription = await editor.locator("textarea").nth(0).inputValue();
  const resetSectionHeading = await editor.locator("[data-asset-editor-section-heading='true'] input").inputValue();
  const resetSection = await editor.locator("textarea").nth(1).inputValue();
  const resetProductGridNotes = await editor.locator("[data-asset-editor-product-grid-notes='true'] textarea").inputValue();
  const resetFaqQuestion = await editor.locator("[data-asset-editor-faq-question='true'] input").inputValue();
  const resetFaqAnswer = await editor.locator("[data-asset-editor-faq-answer='true'] textarea").inputValue();
  const resetSchemaPreview = await editor.locator("[data-asset-editor-schema-preview='true'] input").inputValue();
  const resetInternalLinkReference = await editor.locator("[data-asset-editor-internal-link-reference='true'] input").inputValue();
  const resetEditorNote = await editor.locator("[data-asset-editor-field-key='editor_note'] textarea").inputValue();
  assert(resetTitle === expectedTitle, `${label} reset title mismatch: expected ${expectedTitle}, got ${resetTitle}`);
  assert(
    resetSlug === expectedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    `${label} reset slug mismatch: got ${resetSlug}`
  );
  assert(
    resetMetaTitle === expectedTitle,
    `${label} reset meta title mismatch: expected ${expectedTitle}, got ${resetMetaTitle}`
  );
  assert(resetMetaDescription === "", `${label} reset meta description must be empty, got ${resetMetaDescription}`);
  assert(resetSectionHeading === "", `${label} reset section heading must be empty, got ${resetSectionHeading}`);
  assert(resetSection === "", `${label} reset structured section must be empty, got ${resetSection}`);
  assert(
    resetProductGridNotes === "",
    `${label} reset product grid notes must be empty, got ${resetProductGridNotes}`
  );
  assert(resetFaqQuestion === "", `${label} reset FAQ question must be empty, got ${resetFaqQuestion}`);
  assert(resetFaqAnswer === "", `${label} reset FAQ answer must be empty, got ${resetFaqAnswer}`);
  assert(resetSchemaPreview === "", `${label} reset schema preview must be empty, got ${resetSchemaPreview}`);
  assert(
    resetInternalLinkReference === "",
    `${label} reset internal link reference must be empty, got ${resetInternalLinkReference}`
  );
  assert(resetEditorNote === "", `${label} reset editor note must be empty, got ${resetEditorNote}`);
  await assertLocalAssetEditorSaveState(editor, "idle", `${label} reset`);
  await assertLocalAssetEditorDirtyState(editor, "clean", `${label} reset`, 0, []);
  await assertLocalAssetEditorFieldDiagnostics(editor, {
    expectedDirtyStates: {
      editor_note: "clean",
      faq_answer: "clean",
      faq_question: "clean",
      internal_link_reference: "clean",
      meta_description: "clean",
      meta_title: "clean",
      product_grid_notes: "clean",
      schema_preview: "clean",
      slug: "clean",
      structured_section_heading: "clean",
      structured_section: "clean",
      title: "clean"
    },
    expectedEmpty: 9,
    expectedFilled: 3,
    label: `${label} reset`
  });
}

async function assertLocalAssetEditorReopenResetsAfterClose(page, label, expectedTitle) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} first local asset editor`);
  await editor.locator("input").first().fill("Unsaved reopen reset title");
  await editor.locator("textarea").first().fill("This abandoned local edit must not survive reopening.");
  await clickUnique(editor.getByRole("button", { name: "Close" }), `${label} close local editor button`);

  const closeDeadline = Date.now() + 5_000;
  while (Date.now() < closeDeadline) {
    if ((await page.locator(".asset-editor-panel").count()) === 0) break;
    await delay(50);
  }
  assert((await page.locator(".asset-editor-panel").count()) === 0, `${label} local asset editor must close before reopen`);

  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} reopen local draft review entry`);
  const reopenedEditor = page.locator(".asset-editor-panel");
  await expectVisible(reopenedEditor, `${label} reopened local asset editor`);
  const reopenedTitle = await reopenedEditor.locator("input").first().inputValue();
  const reopenedMetaDescription = await reopenedEditor.locator("textarea").first().inputValue();
  assert(
    reopenedTitle === expectedTitle,
    `${label} reopened editor title mismatch: expected ${expectedTitle}, got ${reopenedTitle}`
  );
  assert(
    reopenedMetaDescription === "",
    `${label} reopened editor must discard unsaved meta description, got ${reopenedMetaDescription}`
  );
}

async function assertLocalAssetEditorCloseAfterFailedSaveClearsFeedback(page, label) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} first local asset editor`);
  await editor.locator("input").first().fill("Close failed save title");
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} failing local save button`);
  await expectVisible(page.getByText("Local save failed"), `${label} local save failure copy`);
  await clickUnique(editor.getByRole("button", { name: "Close" }), `${label} close failed editor button`);

  const closeDeadline = Date.now() + 5_000;
  while (Date.now() < closeDeadline) {
    if ((await page.locator(".asset-editor-panel").count()) === 0) break;
    await delay(50);
  }
  assert((await page.locator(".asset-editor-panel").count()) === 0, `${label} failed local asset editor must close`);

  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} reopen failed local editor`);
  await expectVisible(page.locator(".asset-editor-panel"), `${label} reopened failed local editor`);
  const staleFailureCopyCount = await page.getByText("Local save failed").count();
  assert(staleFailureCopyCount === 0, `${label} stale local save failure feedback must clear after close`);
  await expectVisible(
    page.getByText("Only local draft fields are saved."),
    `${label} reopened editor neutral local-only feedback`
  );
}

async function assertLocalAssetEditorCloseAfterSuccessClearsFeedback(page, label, savedTitle) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} first local asset editor`);
  await editor.locator("input").first().fill(savedTitle);
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} successful local save button`);
  await expectVisible(page.getByText("Local draft saved"), `${label} local save success copy`);
  await clickUnique(editor.getByRole("button", { name: "Close" }), `${label} close saved editor button`);

  const closeDeadline = Date.now() + 5_000;
  while (Date.now() < closeDeadline) {
    if ((await page.locator(".asset-editor-panel").count()) === 0) break;
    await delay(50);
  }
  assert((await page.locator(".asset-editor-panel").count()) === 0, `${label} saved local asset editor must close`);

  await expectVisible(page.getByText(savedTitle), `${label} saved asset preview title`);
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} reopen saved local editor`);
  const reopenedEditor = page.locator(".asset-editor-panel");
  await expectVisible(reopenedEditor, `${label} reopened saved local editor`);
  const staleSuccessCopyCount = await page.getByText("Local draft saved").count();
  assert(staleSuccessCopyCount === 0, `${label} stale local save success feedback must clear after close`);
  await expectVisible(
    page.getByText("Only local draft fields are saved."),
    `${label} reopened saved editor neutral local-only feedback`
  );
  const reopenedTitle = await reopenedEditor.locator("input").first().inputValue();
  assert(reopenedTitle === savedTitle, `${label} reopened saved title mismatch: expected ${savedTitle}, got ${reopenedTitle}`);
}

async function assertLocalAssetEditorReopenHasEnabledSaveButton(page, label) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} first local asset editor`);
  await editor.locator("input").first().fill("Pending close local title");
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} pending local save button`);
  await expectVisible(editor.getByRole("button", { name: "Saving local draft" }), `${label} pending local save copy`);
  await assertLocalAssetEditorSaveState(editor, "pending", `${label} pending`);
  await clickUnique(editor.getByRole("button", { name: "Close" }), `${label} close pending editor button`);

  const closeDeadline = Date.now() + 5_000;
  while (Date.now() < closeDeadline) {
    if ((await page.locator(".asset-editor-panel").count()) === 0) break;
    await delay(50);
  }
  assert((await page.locator(".asset-editor-panel").count()) === 0, `${label} pending local asset editor must close`);

  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} reopen pending local editor`);
  const reopenedEditor = page.locator(".asset-editor-panel");
  await expectVisible(reopenedEditor, `${label} reopened pending local editor`);
  const saveButton = reopenedEditor.getByRole("button", { name: "Save local draft" });
  await expectVisible(saveButton, `${label} reopened enabled save button`);
  assert(!(await saveButton.isDisabled()), `${label} reopened save button must be enabled`);
  const stalePendingCount = await reopenedEditor.getByRole("button", { name: "Saving local draft" }).count();
  assert(stalePendingCount === 0, `${label} reopened editor must not show stale pending save state`);
}

async function assertLocalAssetEditorDelayedResponseDoesNotRepaintFeedback(page, label) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} first local asset editor`);
  await editor.locator("input").first().fill("Delayed close local title");
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} delayed local save button`);
  await expectVisible(editor.getByRole("button", { name: "Saving local draft" }), `${label} delayed pending save copy`);
  await assertLocalAssetEditorSaveState(editor, "pending", `${label} delayed pending`);
  await clickUnique(editor.getByRole("button", { name: "Close" }), `${label} close delayed editor button`);

  const closeDeadline = Date.now() + 5_000;
  while (Date.now() < closeDeadline) {
    if ((await page.locator(".asset-editor-panel").count()) === 0) break;
    await delay(50);
  }
  assert((await page.locator(".asset-editor-panel").count()) === 0, `${label} delayed local asset editor must close`);

  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} reopen delayed local editor`);
  const reopenedEditor = page.locator(".asset-editor-panel");
  await expectVisible(reopenedEditor, `${label} reopened delayed local editor`);
  await expectVisible(
    page.getByText("Only local draft fields are saved."),
    `${label} reopened delayed editor neutral local-only feedback`
  );
  await delay(1_200);
  assert(
    (await page.getByText("Local draft saved").count()) === 0,
    `${label} delayed response must not repaint stale success feedback`
  );
  assert(
    (await page.getByText("Local save failed").count()) === 0,
    `${label} delayed response must not repaint stale failure feedback`
  );
  const saveButton = reopenedEditor.getByRole("button", { name: "Save local draft" });
  await expectVisible(saveButton, `${label} delayed reopened enabled save button`);
  assert(!(await saveButton.isDisabled()), `${label} delayed reopened save button must remain enabled`);
}

async function assertLocalAssetEditorCrossAssetFeedbackIsolation(
  page,
  label,
  { firstAssetId, secondAssetId, secondTitle }
) {
  const firstRow = page.locator(`[data-asset-id='${firstAssetId}']`);
  const secondRow = page.locator(`[data-asset-id='${secondAssetId}']`);
  await clickUnique(firstRow.getByRole("button", { name: "Review local draft" }), `${label} first asset review entry`);
  const firstEditor = page.locator(".asset-editor-panel");
  await expectVisible(firstEditor, `${label} first asset editor`);
  await firstEditor.locator("input").first().fill("First asset delayed save title");
  await clickUnique(firstEditor.getByRole("button", { name: "Save local draft" }), `${label} first asset delayed save`);
  await expectVisible(firstEditor.getByRole("button", { name: "Saving local draft" }), `${label} first asset pending save copy`);

  await clickUnique(secondRow.getByRole("button", { name: "Review local draft" }), `${label} second asset review entry`);
  const secondEditor = page.locator(".asset-editor-panel");
  const switchDeadline = Date.now() + 5_000;
  let secondEditorAssetId = await secondEditor.getAttribute("data-asset-id");
  while (Date.now() < switchDeadline && secondEditorAssetId !== secondAssetId) {
    await delay(50);
    secondEditorAssetId = await secondEditor.getAttribute("data-asset-id");
  }
  await expectVisible(secondEditor, `${label} second asset editor`);
  assert(secondEditorAssetId === secondAssetId, `${label} expected second editor asset ${secondAssetId}, got ${secondEditorAssetId}`);
  let secondEditorTitle = await secondEditor.locator("input").first().inputValue();
  const titleDeadline = Date.now() + 5_000;
  while (Date.now() < titleDeadline && secondEditorTitle !== secondTitle) {
    await delay(50);
    secondEditorTitle = await secondEditor.locator("input").first().inputValue();
  }
  assert(secondEditorTitle === secondTitle, `${label} second editor title mismatch: expected ${secondTitle}, got ${secondEditorTitle}`);
  await expectVisible(
    page.getByText("Only local draft fields are saved."),
    `${label} second asset neutral local-only feedback`
  );

  await delay(1_200);
  assert(
    (await page.getByText("Local draft saved").count()) === 0,
    `${label} first asset delayed success must not repaint second editor feedback`
  );
  assert(
    (await page.getByText("Local save failed").count()) === 0,
    `${label} first asset delayed failure must not repaint second editor feedback`
  );
  const saveButton = secondEditor.getByRole("button", { name: "Save local draft" });
  await expectVisible(saveButton, `${label} second asset enabled save button`);
  assert(!(await saveButton.isDisabled()), `${label} second asset save button must remain enabled`);
}

async function assertLocalAssetEditorSecondAssetSaveIsolation(
  page,
  label,
  { firstAssetId, secondAssetId, secondSavedTitle, secondTitle }
) {
  const firstRow = page.locator(`[data-asset-id='${firstAssetId}']`);
  const secondRow = page.locator(`[data-asset-id='${secondAssetId}']`);
  await clickUnique(firstRow.getByRole("button", { name: "Review local draft" }), `${label} first asset review entry`);
  const firstEditor = page.locator(".asset-editor-panel");
  await expectVisible(firstEditor, `${label} first asset editor`);
  await firstEditor.locator("input").first().fill("First asset delayed save before second save");
  await clickUnique(firstEditor.getByRole("button", { name: "Save local draft" }), `${label} first asset delayed save`);
  await expectVisible(firstEditor.getByRole("button", { name: "Saving local draft" }), `${label} first asset pending save copy`);

  await clickUnique(secondRow.getByRole("button", { name: "Review local draft" }), `${label} second asset review entry`);
  const secondEditor = page.locator(".asset-editor-panel");
  const switchDeadline = Date.now() + 5_000;
  let secondEditorAssetId = await secondEditor.getAttribute("data-asset-id");
  while (Date.now() < switchDeadline && secondEditorAssetId !== secondAssetId) {
    await delay(50);
    secondEditorAssetId = await secondEditor.getAttribute("data-asset-id");
  }
  await expectVisible(secondEditor, `${label} second asset editor`);
  assert(secondEditorAssetId === secondAssetId, `${label} expected second editor asset ${secondAssetId}, got ${secondEditorAssetId}`);
  let secondEditorTitle = await secondEditor.locator("input").first().inputValue();
  const titleDeadline = Date.now() + 5_000;
  while (Date.now() < titleDeadline && secondEditorTitle !== secondTitle) {
    await delay(50);
    secondEditorTitle = await secondEditor.locator("input").first().inputValue();
  }
  assert(secondEditorTitle === secondTitle, `${label} second editor title mismatch: expected ${secondTitle}, got ${secondEditorTitle}`);

  await secondEditor.locator("input").first().fill(secondSavedTitle);
  await clickUnique(secondEditor.getByRole("button", { name: "Save local draft" }), `${label} second asset save button`);
  await expectVisible(page.getByText("Local draft saved"), `${label} second asset local save success copy`);
  const activeEditorAssetId = await secondEditor.getAttribute("data-asset-id");
  assert(activeEditorAssetId === secondAssetId, `${label} second asset must remain selected after save`);
  const activeEditorTitle = await secondEditor.locator("input").first().inputValue();
  assert(
    activeEditorTitle === secondSavedTitle,
    `${label} second editor saved title mismatch: expected ${secondSavedTitle}, got ${activeEditorTitle}`
  );
  assert(
    (await page.getByText("Local save failed").count()) === 0,
    `${label} second asset save must not show stale failure feedback`
  );
}

async function assertLocalAssetEditorSameAssetDoubleSubmitBlocked(page, label) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} local asset editor`);
  await editor.locator("input").first().fill("Double submit local title");
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} first local save button`);
  const pendingButton = editor.getByRole("button", { name: "Saving local draft" });
  await expectVisible(pendingButton, `${label} pending save button`);
  assert(await pendingButton.isDisabled(), `${label} pending save button must be disabled`);
  await pendingButton.click({ force: true });
  await delay(100);
  assert(await pendingButton.isDisabled(), `${label} forced second click must not re-enable pending save button`);
  await expectVisible(page.getByText("Local draft saved"), `${label} local save success copy`);
}

async function assertLocalAssetEditorPendingCloseDoesNotDuplicateRequest(page, label) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} local asset editor`);
  await editor.locator("input").first().fill("Pending close duplicate guard title");
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} pending local save button`);
  await expectVisible(editor.getByRole("button", { name: "Saving local draft" }), `${label} pending local save copy`);
  await clickUnique(editor.getByRole("button", { name: "Close" }), `${label} close pending local editor button`);

  const closeDeadline = Date.now() + 5_000;
  while (Date.now() < closeDeadline) {
    if ((await page.locator(".asset-editor-panel").count()) === 0) break;
    await delay(50);
  }
  assert((await page.locator(".asset-editor-panel").count()) === 0, `${label} pending local editor must close`);
  await delay(700);
  assert((await page.locator(".asset-editor-panel").count()) === 0, `${label} delayed response must not reopen editor`);
}

async function assertLocalAssetEditorPendingCloseReopensNeutralAfterResponse(page, label) {
  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} local draft review entry`);
  const editor = page.locator(".asset-editor-panel");
  await expectVisible(editor, `${label} local asset editor`);
  await editor.locator("input").first().fill("Pending close stale feedback title");
  await clickUnique(editor.getByRole("button", { name: "Save local draft" }), `${label} pending local save button`);
  await expectVisible(editor.getByRole("button", { name: "Saving local draft" }), `${label} pending local save copy`);
  await clickUnique(editor.getByRole("button", { name: "Close" }), `${label} close pending local editor button`);

  const closeDeadline = Date.now() + 5_000;
  while (Date.now() < closeDeadline) {
    if ((await page.locator(".asset-editor-panel").count()) === 0) break;
    await delay(50);
  }
  assert((await page.locator(".asset-editor-panel").count()) === 0, `${label} pending local editor must close`);

  await delay(700);
  assert((await page.locator(".asset-editor-panel").count()) === 0, `${label} delayed response must not reopen editor`);

  await clickUnique(page.getByRole("button", { name: "Review local draft" }).first(), `${label} reopen after resolved save`);
  const reopenedEditor = page.locator(".asset-editor-panel");
  await expectVisible(reopenedEditor, `${label} reopened local asset editor`);
  await expectVisible(
    page.getByText("Only local draft fields are saved."),
    `${label} reopened editor neutral local-only feedback`
  );
  assert(
    (await page.getByText("Local draft saved").count()) === 0,
    `${label} resolved pending close response must not leave stale success feedback`
  );
  assert(
    (await page.getByText("Local save failed").count()) === 0,
    `${label} resolved pending close response must not leave stale failure feedback`
  );
  const saveButton = reopenedEditor.getByRole("button", { name: "Save local draft" });
  await expectVisible(saveButton, `${label} reopened enabled save button`);
  assert(!(await saveButton.isDisabled()), `${label} reopened save button must be enabled`);
  const stalePendingCount = await reopenedEditor.getByRole("button", { name: "Saving local draft" }).count();
  assert(stalePendingCount === 0, `${label} reopened editor must not show stale pending save state`);
}

async function assertEditorControlsStayWithinPanel(editor, label) {
  const panelBox = await editor.boundingBox();
  assert(panelBox, `${label} editor panel must have a bounding box`);
  const controls = await editor.locator("input, textarea, button").all();
  for (const [index, control] of controls.entries()) {
    const box = await control.boundingBox();
    assert(box, `${label} editor control ${index} must have a bounding box`);
    assert(
      box.x >= panelBox.x - 1 && box.x + box.width <= panelBox.x + panelBox.width + 1,
      `${label} editor control ${index} overflows horizontally`
    );
  }
}

async function assertTrackedAssetMetricReconciles(page, expectedDraftCount, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for metric reconciliation`);
  const panelDraftCountText = await assetPanel.getAttribute("data-asset-draft-count");
  const panelDraftCount = Number(panelDraftCountText);
  assert(
    Number.isInteger(panelDraftCount) && panelDraftCount === expectedDraftCount,
    `${label} asset panel draft count mismatch before metric reconciliation: expected ${expectedDraftCount}, got ${
      panelDraftCountText ?? "missing"
    }`
  );

  const metric = page.locator("[data-metric-key='tracked_assets']");
  await expectVisible(metric, `${label} tracked asset summary metric`);
  const metricValueText = await metric.getAttribute("data-metric-value");
  const metricValue = Number(metricValueText);
  assert(
    Number.isInteger(metricValue) && metricValue === panelDraftCount,
    `${label} tracked asset metric mismatch: expected ${panelDraftCount}, got ${metricValueText ?? "missing"}`
  );
  const visibleValue = ((await metric.locator("strong").first().textContent()) ?? "").trim();
  assert(
    visibleValue === String(panelDraftCount),
    `${label} tracked asset visible metric mismatch: expected ${panelDraftCount}, got ${visibleValue || "missing"}`
  );
}

async function assertAssetWorkspaceBlockedCapabilities(page, expectedCapabilities, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for blocked capability diagnostics`);
  const blockedCountText = await assetPanel.getAttribute("data-blocked-capability-count");
  const blockedCount = Number(blockedCountText);
  assert(
    Number.isInteger(blockedCount) && blockedCount === expectedCapabilities.length,
    `${label} blocked capability count mismatch: expected ${expectedCapabilities.length}, got ${
      blockedCountText ?? "missing"
    }`
  );
  const blockedCapabilityCountsReconciled = await assetPanel.getAttribute("data-blocked-capability-counts-reconciled");
  assert(
    blockedCapabilityCountsReconciled === "true",
    `${label} asset workspace blocked capability reconciliation marker must be true, got ${
      blockedCapabilityCountsReconciled ?? "missing"
    }`
  );
  const blockedCapabilityRows = await assetPanel
    .locator("[data-blocked-capability-row='true']")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        key: element.getAttribute("data-blocked-capability-key"),
        text: element.textContent ?? ""
      }))
    );
  assert(
    blockedCapabilityRows.length === expectedCapabilities.length,
    `${label} asset workspace blocked capability row count mismatch: expected ${
      expectedCapabilities.length
    }, got ${blockedCapabilityRows.length}`
  );
  assert(
    blockedCapabilityRows.length === blockedCount,
    `${label} asset workspace blocked capability rows must reconcile with count`
  );
  const panelText = (await assetPanel.textContent()) ?? "";
  for (const capability of expectedCapabilities) {
    assert(
      panelText.includes(capability),
      `${label} asset workspace missing visible blocked capability context: ${capability}`
    );
    assert(
      blockedCapabilityRows.some((row) => row.key === capability && row.text.includes(capability)),
      `${label} asset workspace missing blocked capability row: ${capability}`
    );
  }
}

async function assertAssetWorkspaceOverflow(page, expectedOverflowCount, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for overflow diagnostics`);
  const overflowCountText = await assetPanel.getAttribute("data-asset-overflow-count");
  const overflowCount = Number(overflowCountText);
  assert(
    Number.isInteger(overflowCount) && overflowCount === expectedOverflowCount,
    `${label} asset overflow count mismatch: expected ${expectedOverflowCount}, got ${
      overflowCountText ?? "missing"
    }`
  );
  if (expectedOverflowCount > 0) {
    await expectVisible(
      page.getByText(`${expectedOverflowCount} more asset candidates`),
      `${label} asset overflow indicator`
    );
  }
}

async function assertAssetWorkspaceTypeSummary(page, expectedCounts, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for type summary diagnostics`);
  const summaryRow = assetPanel.locator("[data-asset-type-summary='true']");
  await expectVisible(summaryRow, `${label} asset type summary row`);
  const expectedEntries = Object.entries(expectedCounts);
  const typeCountText = await summaryRow.getAttribute("data-asset-type-count");
  const totalCountText = await summaryRow.getAttribute("data-asset-type-total");
  const typeCountsReconciled = await summaryRow.getAttribute("data-asset-type-counts-reconciled");
  const totalCount = expectedEntries.reduce((sum, [, count]) => sum + count, 0);
  assert(
    Number(typeCountText) === expectedEntries.length,
    `${label} asset type count mismatch: expected ${expectedEntries.length}, got ${typeCountText ?? "missing"}`
  );
  assert(
    Number(totalCountText) === totalCount,
    `${label} asset type total mismatch: expected ${totalCount}, got ${totalCountText ?? "missing"}`
  );
  assert(
    typeCountsReconciled === "true",
    `${label} asset type reconciliation marker must be true, got ${typeCountsReconciled ?? "missing"}`
  );
  const typeRows = await assetPanel.locator("[data-asset-type-row='true']").evaluateAll((elements) =>
    elements.map((element) => ({
      key: element.getAttribute("data-asset-type-key"),
      count: Number(element.getAttribute("data-asset-type-row-count")),
      text: element.textContent ?? ""
    }))
  );
  assert(
    typeRows.length === expectedEntries.length,
    `${label} asset type row count mismatch: expected ${expectedEntries.length}, got ${typeRows.length}`
  );
  assert(
    typeRows.reduce((sum, row) => sum + row.count, 0) === totalCount,
    `${label} asset type row counts must sum to ${totalCount}`
  );
  const summaryText = (await summaryRow.textContent()) ?? "";
  for (const [assetType, count] of expectedEntries) {
    assert(
      summaryText.includes(`${assetType} ${count}`),
      `${label} asset type summary missing ${assetType} ${count}`
    );
    assert(
      typeRows.some((row) => row.key === assetType && row.count === count && row.text.includes(`${assetType} ${count}`)),
      `${label} asset type row missing ${assetType} ${count}`
    );
  }
}

async function assertAssetWorkspaceReviewStateDistribution(page, expectedCounts, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for review-state diagnostics`);
  const summaryRow = assetPanel.locator("[data-asset-review-state-summary='true']");
  await expectVisible(summaryRow, `${label} asset review-state summary row`);
  const expectedEntries = Object.entries(expectedCounts).sort(([left], [right]) => left.localeCompare(right));
  const expectedTotal = expectedEntries.reduce((sum, [, count]) => sum + count, 0);
  const stateCount = Number(await summaryRow.getAttribute("data-asset-review-state-count"));
  const totalCount = Number(await summaryRow.getAttribute("data-asset-review-state-total-count"));
  const reconciled = await summaryRow.getAttribute("data-asset-review-state-counts-reconciled");
  const rows = await assetPanel.locator("[data-asset-review-state-row='true']").evaluateAll((elements) =>
    elements.map((element) => ({
      count: Number(element.getAttribute("data-asset-review-state-row-count")),
      key: element.getAttribute("data-asset-review-state-key"),
      text: element.textContent ?? ""
    }))
  );
  assert(
    stateCount === expectedEntries.length,
    `${label} asset review-state count mismatch: expected ${expectedEntries.length}, got ${stateCount}`
  );
  assert(totalCount === expectedTotal, `${label} asset review-state total mismatch: expected ${expectedTotal}, got ${totalCount}`);
  assert(
    reconciled === "true",
    `${label} asset review-state reconciliation marker must be true, got ${reconciled ?? "missing"}`
  );
  assert(
    rows.length === expectedEntries.length,
    `${label} asset review-state row count mismatch: expected ${expectedEntries.length}, got ${rows.length}`
  );
  assert(
    rows.reduce((sum, row) => sum + row.count, 0) === expectedTotal,
    `${label} asset review-state rows must sum to ${expectedTotal}`
  );
  const summaryText = (await summaryRow.textContent()) ?? "";
  for (const [reviewState, count] of expectedEntries) {
    assert(
      summaryText.includes(`${reviewState} ${count}`),
      `${label} asset review-state summary missing ${reviewState} ${count}`
    );
    assert(
      rows.some((row) => row.key === reviewState && row.count === count && row.text.includes(`${reviewState} ${count}`)),
      `${label} asset review-state row missing ${reviewState} ${count}`
    );
  }
}

async function assertAssetWorkspaceSourceTaskDistribution(page, expectedCounts, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for source task diagnostics`);
  const summaryRow = assetPanel.locator("[data-asset-source-task-summary='true']");
  await expectVisible(summaryRow, `${label} asset source task summary row`);
  const expectedEntries = Object.entries(expectedCounts).sort(([left], [right]) => left.localeCompare(right));
  const expectedTotal = expectedEntries.reduce((sum, [, count]) => sum + count, 0);
  const sourceTaskCount = Number(await summaryRow.getAttribute("data-asset-source-task-count"));
  const totalCount = Number(await summaryRow.getAttribute("data-asset-source-task-total-count"));
  const reconciled = await summaryRow.getAttribute("data-asset-source-task-counts-reconciled");
  const rows = await assetPanel.locator("[data-asset-source-task-row='true']").evaluateAll((elements) =>
    elements.map((element) => ({
      count: Number(element.getAttribute("data-asset-source-task-row-count")),
      id: element.getAttribute("data-asset-source-task-id"),
      text: element.textContent ?? ""
    }))
  );
  assert(
    sourceTaskCount === expectedEntries.length,
    `${label} asset source task count mismatch: expected ${expectedEntries.length}, got ${sourceTaskCount}`
  );
  assert(totalCount === expectedTotal, `${label} asset source task total mismatch: expected ${expectedTotal}, got ${totalCount}`);
  assert(
    reconciled === "true",
    `${label} asset source task reconciliation marker must be true, got ${reconciled ?? "missing"}`
  );
  assert(
    rows.length === expectedEntries.length,
    `${label} asset source task row count mismatch: expected ${expectedEntries.length}, got ${rows.length}`
  );
  assert(
    rows.reduce((sum, row) => sum + row.count, 0) === expectedTotal,
    `${label} asset source task rows must sum to ${expectedTotal}`
  );
  const summaryText = (await summaryRow.textContent()) ?? "";
  for (const [sourceTaskId, count] of expectedEntries) {
    assert(
      summaryText.includes(`${sourceTaskId} ${count}`),
      `${label} asset source task summary missing ${sourceTaskId} ${count}`
    );
    assert(
      rows.some((row) => row.id === sourceTaskId && row.count === count && row.text.includes(`${sourceTaskId} ${count}`)),
      `${label} asset source task row missing ${sourceTaskId} ${count}`
    );
  }
}

async function assertAssetWorkspaceSourceTaskStatusDistribution(page, expectedCounts, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for source task status diagnostics`);
  const summaryRow = assetPanel.locator("[data-asset-source-task-status-summary='true']");
  await expectVisible(summaryRow, `${label} asset source task status summary row`);
  const expectedEntries = Object.entries(expectedCounts).sort(([left], [right]) => left.localeCompare(right));
  const expectedTotal = expectedEntries.reduce((sum, [, count]) => sum + count, 0);
  const statusCount = Number(await summaryRow.getAttribute("data-asset-source-task-status-count"));
  const totalCount = Number(await summaryRow.getAttribute("data-asset-source-task-status-total-count"));
  const reconciled = await summaryRow.getAttribute("data-asset-source-task-status-counts-reconciled");
  const rows = await assetPanel.locator("[data-asset-source-task-status-row='true']").evaluateAll((elements) =>
    elements.map((element) => ({
      count: Number(element.getAttribute("data-asset-source-task-status-row-count")),
      key: element.getAttribute("data-asset-source-task-status-key"),
      text: element.textContent ?? ""
    }))
  );
  assert(
    statusCount === expectedEntries.length,
    `${label} asset source task status count mismatch: expected ${expectedEntries.length}, got ${statusCount}`
  );
  assert(
    totalCount === expectedTotal,
    `${label} asset source task status total mismatch: expected ${expectedTotal}, got ${totalCount}`
  );
  assert(
    reconciled === "true",
    `${label} asset source task status reconciliation marker must be true, got ${reconciled ?? "missing"}`
  );
  assert(
    rows.length === expectedEntries.length,
    `${label} asset source task status row count mismatch: expected ${expectedEntries.length}, got ${rows.length}`
  );
  assert(
    rows.reduce((sum, row) => sum + row.count, 0) === expectedTotal,
    `${label} asset source task status rows must sum to ${expectedTotal}`
  );
  const summaryText = (await summaryRow.textContent()) ?? "";
  for (const [sourceTaskStatus, count] of expectedEntries) {
    assert(
      summaryText.includes(`${sourceTaskStatus} ${count}`),
      `${label} asset source task status summary missing ${sourceTaskStatus} ${count}`
    );
    assert(
      rows.some((row) => row.key === sourceTaskStatus && row.count === count && row.text.includes(`${sourceTaskStatus} ${count}`)),
      `${label} asset source task status row missing ${sourceTaskStatus} ${count}`
    );
  }
}

async function assertAssetWorkspaceQaSummary(page, expectedQaCheckCount, expectedQaPendingCount, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for QA summary diagnostics`);
  const summaryRow = assetPanel.locator("[data-asset-qa-summary='true']");
  await expectVisible(summaryRow, `${label} asset QA summary row`);
  const qaCheckCount = await summaryRow.getAttribute("data-asset-qa-check-count");
  const qaPendingCount = await summaryRow.getAttribute("data-asset-qa-pending-count");
  assert(
    qaCheckCount === String(expectedQaCheckCount),
    `${label} asset QA summary check count mismatch: expected ${expectedQaCheckCount}, got ${
      qaCheckCount ?? "missing"
    }`
  );
  assert(
    qaPendingCount === String(expectedQaPendingCount),
    `${label} asset QA summary pending count mismatch: expected ${expectedQaPendingCount}, got ${
      qaPendingCount ?? "missing"
    }`
  );
  const summaryText = (await summaryRow.textContent()) ?? "";
  assert(
    summaryText.includes(`${expectedQaPendingCount}/${expectedQaCheckCount} pending`),
    `${label} asset QA summary must show pending ratio`
  );
}

async function assertWordPressDraftReadinessSummary(page, expectedReadyCount, expectedTotalCount, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for WordPress draft readiness`);
  const summaryRow = assetPanel.locator("[data-wordpress-draft-readiness='blocked']");
  await expectVisible(summaryRow, `${label} WordPress draft readiness row`);
  const readyCount = await summaryRow.getAttribute("data-wordpress-draft-ready-count");
  const totalCount = await summaryRow.getAttribute("data-wordpress-draft-total-count");
  assert(
    readyCount === String(expectedReadyCount),
    `${label} WordPress draft ready count mismatch: expected ${expectedReadyCount}, got ${
      readyCount ?? "missing"
    }`
  );
  assert(
    totalCount === String(expectedTotalCount),
    `${label} WordPress draft total count mismatch: expected ${expectedTotalCount}, got ${
      totalCount ?? "missing"
    }`
  );
  const summaryText = (await summaryRow.textContent()) ?? "";
  assert(
    summaryText.includes(`${expectedReadyCount}/${expectedTotalCount} ready`),
    `${label} WordPress draft readiness row must show ready ratio`
  );
}

async function assertWordPressDraftReadinessReconciles(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for WordPress draft readiness reconciliation`);
  const summaryRow = assetPanel.locator("[data-wordpress-draft-readiness='blocked']");
  await expectVisible(summaryRow, `${label} WordPress draft readiness reconciliation row`);
  const draftCount = Number(await assetPanel.getAttribute("data-asset-draft-count"));
  const readyCount = Number(await summaryRow.getAttribute("data-wordpress-draft-ready-count"));
  const totalCount = Number(await summaryRow.getAttribute("data-wordpress-draft-total-count"));
  const readinessCountsReconciled = await summaryRow.getAttribute(
    "data-wordpress-draft-readiness-counts-reconciled"
  );
  assert(
    totalCount === draftCount,
    `${label} WordPress draft readiness total mismatch: expected draft count ${draftCount}, got ${totalCount}`
  );
  assert(
    readyCount <= totalCount,
    `${label} WordPress draft ready count must not exceed total: ready ${readyCount}, total ${totalCount}`
  );
  assert(
    readinessCountsReconciled === "true",
    `${label} WordPress draft readiness count reconciliation marker must be true, got ${
      readinessCountsReconciled ?? "missing"
    }`
  );
}

async function assertWordPressDraftReadinessUnavailable(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for unavailable WordPress draft readiness`);
  const readinessRows = await assetPanel.locator("[data-wordpress-draft-readiness]").count();
  assert(readinessRows === 0, `${label} must not render WordPress draft readiness rows when asset workspace is unavailable`);
}

async function assertAssetWorkspaceQaReadiness(
  page,
  expectedReadinessState,
  expectedPendingCount,
  expectedTotalCount,
  label
) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for QA readiness diagnostics`);
  const readinessState = await assetPanel.getAttribute("data-asset-qa-readiness-state");
  const readinessPendingCount = Number(await assetPanel.getAttribute("data-asset-qa-readiness-pending-count"));
  const readinessTotalCount = Number(await assetPanel.getAttribute("data-asset-qa-readiness-total-count"));
  const readinessCountsReconciled = await assetPanel.getAttribute("data-asset-qa-readiness-counts-reconciled");
  assert(
    readinessState === expectedReadinessState,
    `${label} QA readiness state mismatch: expected ${expectedReadinessState}, got ${readinessState ?? "missing"}`
  );
  assert(
    readinessPendingCount === expectedPendingCount && readinessTotalCount === expectedTotalCount,
    `${label} QA readiness counts mismatch: expected ${expectedPendingCount}/${expectedTotalCount}, got ${readinessPendingCount}/${readinessTotalCount}`
  );
  assert(
    readinessCountsReconciled === "true",
    `${label} QA readiness count reconciliation marker must be true, got ${
      readinessCountsReconciled ?? "missing"
    }`
  );
  const readinessRow = assetPanel.locator("[data-asset-qa-readiness='true']");
  await expectVisible(readinessRow, `${label} asset QA readiness row`);
  await expectVisible(page.getByText(expectedReadinessState), `${label} asset QA readiness visible state`);
}

async function assertAssetWorkspaceNoQaChecks(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for no-QA diagnostics`);
  const readinessState = await assetPanel.getAttribute("data-asset-qa-readiness-state");
  const readinessPendingCount = Number(await assetPanel.getAttribute("data-asset-qa-readiness-pending-count"));
  const readinessTotalCount = Number(await assetPanel.getAttribute("data-asset-qa-readiness-total-count"));
  const readinessCountsReconciled = await assetPanel.getAttribute("data-asset-qa-readiness-counts-reconciled");
  assert(
    readinessState === "not_applicable",
    `${label} no-QA readiness state mismatch: expected not_applicable, got ${readinessState ?? "missing"}`
  );
  assert(
    readinessPendingCount === 0 && readinessTotalCount === 0,
    `${label} no-QA readiness counts must be 0/0, got ${readinessPendingCount}/${readinessTotalCount}`
  );
  assert(
    readinessCountsReconciled === "true",
    `${label} no-QA readiness count reconciliation marker must be true, got ${
      readinessCountsReconciled ?? "missing"
    }`
  );
  const qaSummaryCount = await assetPanel.locator("[data-asset-qa-summary='true']").count();
  const qaReadinessRowCount = await assetPanel.locator("[data-asset-qa-readiness='true']").count();
  assert(qaSummaryCount === 0, `${label} must not render QA summary when no QA checks exist`);
  assert(qaReadinessRowCount === 0, `${label} must not render QA readiness row when no QA checks exist`);
}

async function assertAssetWorkspaceUnavailableQaReadiness(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for unavailable QA diagnostics`);
  const readinessState = await assetPanel.getAttribute("data-asset-qa-readiness-state");
  const readinessPendingCount = Number(await assetPanel.getAttribute("data-asset-qa-readiness-pending-count"));
  const readinessTotalCount = Number(await assetPanel.getAttribute("data-asset-qa-readiness-total-count"));
  const readinessCountsReconciled = await assetPanel.getAttribute("data-asset-qa-readiness-counts-reconciled");
  assert(
    readinessState === "unavailable",
    `${label} unavailable QA readiness mismatch: expected unavailable, got ${readinessState ?? "missing"}`
  );
  assert(
    readinessPendingCount === 0 && readinessTotalCount === 0,
    `${label} unavailable QA readiness counts must be 0/0, got ${readinessPendingCount}/${readinessTotalCount}`
  );
  assert(
    readinessCountsReconciled === "true",
    `${label} unavailable QA readiness count reconciliation marker must be true, got ${
      readinessCountsReconciled ?? "missing"
    }`
  );
  const qaSummaryCount = await assetPanel.locator("[data-asset-qa-summary='true']").count();
  const qaReadinessRowCount = await assetPanel.locator("[data-asset-qa-readiness='true']").count();
  assert(qaSummaryCount === 0, `${label} must not render QA summary when asset workspace is unavailable`);
  assert(qaReadinessRowCount === 0, `${label} must not render QA readiness row when asset workspace is unavailable`);
}

async function assertAssetExternalWriteClampReconciles(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for external write clamp`);
  const externalWriteAllowed = await assetPanel.getAttribute("data-external-write-allowed");
  const externalWriteClampReconciled = await assetPanel.getAttribute("data-external-write-clamp-reconciled");
  assert(
    externalWriteAllowed === "false",
    `${label} external write clamp mismatch: expected false, got ${externalWriteAllowed ?? "missing"}`
  );
  assert(
    externalWriteClampReconciled === "true",
    `${label} external write clamp reconciliation marker must be true, got ${
      externalWriteClampReconciled ?? "missing"
    }`
  );
  await expectVisible(page.getByText("External writes"), `${label} external writes label`);
  const externalWriteRow = assetPanel.locator("[data-external-write-row='true']");
  await expectVisible(externalWriteRow, `${label} visible external-write row diagnostic`);
  assert(
    (await externalWriteRow.getAttribute("data-external-write-row-value")) === "false",
    `${label} external write row value must be false`
  );
  await expectVisible(externalWriteRow.getByText("false"), `${label} external writes visible false`);
}

async function assertAssetWorkspaceQaAggregateReconciles(page, hiddenQaCheckCount, hiddenQaPendingCount, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for QA aggregate reconciliation`);
  const summaryRow = assetPanel.locator("[data-asset-qa-summary='true']");
  const rootQaCheckCount = Number(await assetPanel.getAttribute("data-asset-qa-check-count"));
  const rootQaPendingCount = Number(await assetPanel.getAttribute("data-asset-qa-pending-count"));
  const rootVisibleQaCheckCount = Number(await assetPanel.getAttribute("data-visible-asset-qa-check-count"));
  const rootHiddenQaCheckCount = Number(await assetPanel.getAttribute("data-hidden-asset-qa-check-count"));
  const rootVisibleQaPendingCount = Number(await assetPanel.getAttribute("data-visible-asset-qa-pending-count"));
  const rootHiddenQaPendingCount = Number(await assetPanel.getAttribute("data-hidden-asset-qa-pending-count"));
  const qaCountsReconciled = await assetPanel.getAttribute("data-asset-qa-counts-reconciled");
  const summaryQaCheckCount = Number(await summaryRow.getAttribute("data-asset-qa-check-count"));
  const summaryQaPendingCount = Number(await summaryRow.getAttribute("data-asset-qa-pending-count"));
  const visibleRows = await assetPanel.locator("[data-asset-id]").all();
  let visibleQaCheckCount = 0;
  let visibleQaPendingCount = 0;
  for (const row of visibleRows) {
    visibleQaCheckCount += Number(await row.getAttribute("data-asset-qa-check-count"));
    visibleQaPendingCount += Number(await row.getAttribute("data-asset-qa-pending-count"));
  }
  assert(
    visibleQaCheckCount + hiddenQaCheckCount === summaryQaCheckCount,
    `${label} QA aggregate check count mismatch: visible ${visibleQaCheckCount} + hidden ${hiddenQaCheckCount} != summary ${summaryQaCheckCount}`
  );
  assert(
    visibleQaPendingCount + hiddenQaPendingCount === summaryQaPendingCount,
    `${label} QA aggregate pending count mismatch: visible ${visibleQaPendingCount} + hidden ${hiddenQaPendingCount} != summary ${summaryQaPendingCount}`
  );
  assert(
    qaCountsReconciled === "true",
    `${label} QA aggregate reconciliation marker must be true, got ${qaCountsReconciled ?? "missing"}`
  );
  assert(
    rootQaCheckCount === summaryQaCheckCount && rootQaPendingCount === summaryQaPendingCount,
    `${label} QA root and summary counts mismatch: root ${rootQaPendingCount}/${rootQaCheckCount}, summary ${summaryQaPendingCount}/${summaryQaCheckCount}`
  );
  assert(
    rootVisibleQaCheckCount === visibleQaCheckCount && rootHiddenQaCheckCount === hiddenQaCheckCount,
    `${label} QA root check aggregates mismatch: root visible ${rootVisibleQaCheckCount}, actual visible ${visibleQaCheckCount}, root hidden ${rootHiddenQaCheckCount}, expected hidden ${hiddenQaCheckCount}`
  );
  assert(
    rootVisibleQaPendingCount === visibleQaPendingCount && rootHiddenQaPendingCount === hiddenQaPendingCount,
    `${label} QA root pending aggregates mismatch: root visible ${rootVisibleQaPendingCount}, actual visible ${visibleQaPendingCount}, root hidden ${rootHiddenQaPendingCount}, expected hidden ${hiddenQaPendingCount}`
  );
  assert(
    rootVisibleQaCheckCount + rootHiddenQaCheckCount === rootQaCheckCount &&
      rootVisibleQaPendingCount + rootHiddenQaPendingCount === rootQaPendingCount,
    `${label} QA root aggregate totals do not reconcile`
  );
}

async function assertAssetWorkspaceRowAggregateReconciles(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for row aggregate diagnostics`);
  const miniList = assetPanel.locator("[data-asset-row-aggregate='true']");
  await expectVisible(miniList, `${label} asset row aggregate list`);
  const draftCount = Number(await assetPanel.getAttribute("data-asset-draft-count"));
  const overflowCount = Number(await assetPanel.getAttribute("data-asset-overflow-count"));
  const rootVisibleCount = Number(await assetPanel.getAttribute("data-visible-asset-count"));
  const rootHiddenCount = Number(await assetPanel.getAttribute("data-hidden-asset-count"));
  const rowCountsReconciled = await assetPanel.getAttribute("data-asset-row-counts-reconciled");
  const visibleCount = Number(await miniList.getAttribute("data-visible-asset-count"));
  const actualVisibleRows = await miniList.locator("[data-asset-id]").count();
  assert(
    rowCountsReconciled === "true",
    `${label} asset row aggregate reconciliation marker must be true, got ${rowCountsReconciled ?? "missing"}`
  );
  assert(
    rootVisibleCount === visibleCount && rootHiddenCount === overflowCount,
    `${label} root asset row counts mismatch: root visible ${rootVisibleCount}, row visible ${visibleCount}, root hidden ${rootHiddenCount}, overflow ${overflowCount}`
  );
  assert(
    Number.isInteger(visibleCount) && visibleCount === actualVisibleRows,
    `${label} visible asset row count mismatch: expected DOM ${actualVisibleRows}, got ${visibleCount}`
  );
  assert(
    visibleCount + overflowCount === draftCount,
    `${label} asset row aggregate mismatch: visible ${visibleCount} + overflow ${overflowCount} != draft ${draftCount}`
  );
}

async function assertAssetWorkspaceContentBlockAggregateReconciles(
  page,
  expectedTotal,
  expectedVisible,
  expectedHidden,
  label
) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for content block aggregate diagnostics`);
  const totalContentBlockCount = Number(await assetPanel.getAttribute("data-asset-workspace-content-block-count"));
  const visibleContentBlockCount = Number(await assetPanel.getAttribute("data-visible-asset-content-block-count"));
  const hiddenContentBlockCount = Number(await assetPanel.getAttribute("data-hidden-asset-content-block-count"));
  const reconciled = await assetPanel.getAttribute("data-asset-workspace-content-block-counts-reconciled");
  const visibleRows = await assetPanel.locator("[data-asset-id]").all();
  let actualVisibleContentBlockCount = 0;
  for (const row of visibleRows) {
    actualVisibleContentBlockCount += Number(await row.getAttribute("data-asset-content-block-count"));
  }
  assert(
    totalContentBlockCount === expectedTotal,
    `${label} content block total mismatch: expected ${expectedTotal}, got ${totalContentBlockCount}`
  );
  assert(
    visibleContentBlockCount === expectedVisible && hiddenContentBlockCount === expectedHidden,
    `${label} content block visible/hidden mismatch: expected ${expectedVisible}/${expectedHidden}, got ${visibleContentBlockCount}/${hiddenContentBlockCount}`
  );
  assert(
    visibleContentBlockCount === actualVisibleContentBlockCount,
    `${label} visible content block aggregate mismatch: expected DOM ${actualVisibleContentBlockCount}, got ${visibleContentBlockCount}`
  );
  assert(
    visibleContentBlockCount + hiddenContentBlockCount === totalContentBlockCount,
    `${label} content block aggregate does not reconcile`
  );
  assert(
    reconciled === "true",
    `${label} content block aggregate reconciliation marker must be true, got ${reconciled ?? "missing"}`
  );
}

async function assertAssetWorkspaceContentBlockTypeDistribution(page, expectedDistribution, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for content block type diagnostics`);
  const expectedEntries = Object.entries(expectedDistribution).sort(([left], [right]) => left.localeCompare(right));
  const expectedTotal = expectedEntries.reduce((sum, [, count]) => sum + count, 0);
  const typeCount = Number(await assetPanel.getAttribute("data-asset-workspace-content-block-type-count"));
  const totalCount = Number(await assetPanel.getAttribute("data-asset-workspace-content-block-type-total-count"));
  const reconciled = await assetPanel.getAttribute("data-asset-workspace-content-block-type-counts-reconciled");
  const rows = await assetPanel
    .locator("[data-asset-workspace-content-block-type-row='true']")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        count: Number(element.getAttribute("data-asset-workspace-content-block-type-row-count")),
        text: element.textContent ?? "",
        type: element.getAttribute("data-asset-workspace-content-block-type-key")
      }))
    );
  assert(
    typeCount === expectedEntries.length,
    `${label} content block type count mismatch: expected ${expectedEntries.length}, got ${typeCount}`
  );
  assert(totalCount === expectedTotal, `${label} content block type total mismatch: expected ${expectedTotal}, got ${totalCount}`);
  assert(
    reconciled === "true",
    `${label} content block type reconciliation marker must be true, got ${reconciled ?? "missing"}`
  );
  assert(
    rows.length === expectedEntries.length,
    `${label} content block type row count mismatch: expected ${expectedEntries.length}, got ${rows.length}`
  );
  assert(
    rows.reduce((sum, row) => sum + row.count, 0) === expectedTotal,
    `${label} content block type rows must sum to ${expectedTotal}`
  );
  for (const [blockType, count] of expectedEntries) {
    assert(
      rows.some((row) => row.type === blockType && row.count === count && row.text.includes(`${blockType} ${count}`)),
      `${label} missing content block type row ${blockType}:${count}`
    );
  }
}

async function assertAssetWorkspaceClaimAggregateReconciles(page, expectedTotal, expectedVisible, expectedHidden, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for claim aggregate diagnostics`);
  const totalClaimCount = Number(await assetPanel.getAttribute("data-asset-claim-count"));
  const visibleClaimCount = Number(await assetPanel.getAttribute("data-visible-asset-claim-count"));
  const hiddenClaimCount = Number(await assetPanel.getAttribute("data-hidden-asset-claim-count"));
  const reconciled = await assetPanel.getAttribute("data-asset-claim-counts-reconciled");
  const visibleRows = await assetPanel.locator("[data-asset-id]").all();
  let actualVisibleClaimCount = 0;
  for (const row of visibleRows) {
    actualVisibleClaimCount += Number(await row.getAttribute("data-asset-claim-count"));
  }
  assert(totalClaimCount === expectedTotal, `${label} total claim count mismatch: expected ${expectedTotal}, got ${totalClaimCount}`);
  assert(
    visibleClaimCount === expectedVisible,
    `${label} visible claim count mismatch: expected ${expectedVisible}, got ${visibleClaimCount}`
  );
  assert(
    hiddenClaimCount === expectedHidden,
    `${label} hidden claim count mismatch: expected ${expectedHidden}, got ${hiddenClaimCount}`
  );
  assert(
    actualVisibleClaimCount === visibleClaimCount,
    `${label} visible claim rows must reconcile with visible claim count: expected ${visibleClaimCount}, got ${actualVisibleClaimCount}`
  );
  assert(reconciled === "true", `${label} claim count reconciliation marker must be true, got ${reconciled ?? "missing"}`);
  assert(
    visibleClaimCount + hiddenClaimCount === totalClaimCount,
    `${label} visible plus hidden claims must equal total claims`
  );
}

async function assertAssetWorkspaceClaimSourceDistribution(page, expectedDistribution, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for claim source diagnostics`);
  const expectedEntries = Object.entries(expectedDistribution).sort(([left], [right]) => left.localeCompare(right));
  const expectedTotal = expectedEntries.reduce((sum, [, count]) => sum + count, 0);
  const sourceCount = Number(await assetPanel.getAttribute("data-asset-claim-source-count"));
  const totalCount = Number(await assetPanel.getAttribute("data-asset-claim-source-total-count"));
  const reconciled = await assetPanel.getAttribute("data-asset-claim-source-counts-reconciled");
  const rows = await assetPanel.locator("[data-asset-claim-source-row='true']").evaluateAll((elements) =>
    elements.map((element) => ({
      count: Number(element.getAttribute("data-asset-claim-source-row-count")),
      source: element.getAttribute("data-asset-claim-source-key"),
      text: element.textContent ?? ""
    }))
  );
  assert(
    sourceCount === expectedEntries.length,
    `${label} claim source count mismatch: expected ${expectedEntries.length}, got ${sourceCount}`
  );
  assert(totalCount === expectedTotal, `${label} claim source total mismatch: expected ${expectedTotal}, got ${totalCount}`);
  assert(reconciled === "true", `${label} claim source reconciliation marker must be true`);
  assert(
    rows.length === expectedEntries.length,
    `${label} claim source row count mismatch: expected ${expectedEntries.length}, got ${rows.length}`
  );
  assert(
    rows.reduce((sum, row) => sum + row.count, 0) === expectedTotal,
    `${label} claim source rows must reconcile with total ${expectedTotal}`
  );
  for (const [source, count] of expectedEntries) {
    assert(
      rows.some((row) => row.source === source && row.count === count && row.text.includes(`${source} ${count}`)),
      `${label} missing claim source distribution row ${source}:${count}`
    );
  }
}

async function assertImportedPreviewState(page, expectedAvailability, expectedWarningCount, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const availability = await importedPanel.getAttribute("data-preview-availability");
  assert(
    availability === expectedAvailability,
    `${label} imported preview availability mismatch: expected ${expectedAvailability}, got ${availability ?? "missing"}`
  );

  const warningCountText = await importedPanel.getAttribute("data-warning-count");
  const warningCount = Number(warningCountText);
  assert(
    Number.isFinite(warningCount) && warningCount === expectedWarningCount,
    `${label} imported preview warning count mismatch: expected ${expectedWarningCount}, got ${warningCountText ?? "missing"}`
  );
}

async function assertImportedPreviewSectionCounts(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  await expectVisible(importedPanel, `${label} imported preview panel`);

  const sectionCountText = await importedPanel.getAttribute("data-section-count");
  const availableCountText = await importedPanel.getAttribute("data-available-section-count");
  const emptyCountText = await importedPanel.getAttribute("data-empty-section-count");
  const unavailableCountText = await importedPanel.getAttribute("data-unavailable-section-count");
  const reconciled = await importedPanel.getAttribute("data-section-counts-reconciled");
  const sectionCount = Number(sectionCountText);
  const availableCount = Number(availableCountText);
  const emptyCount = Number(emptyCountText);
  const unavailableCount = Number(unavailableCountText);

  assert(
    Number.isInteger(sectionCount) && sectionCount === expectedValues.sectionCount,
    `${label} imported preview section count mismatch: expected ${expectedValues.sectionCount}, got ${sectionCountText ?? "missing"}`
  );
  assert(
    Number.isInteger(availableCount) && availableCount === expectedValues.availableCount,
    `${label} imported preview available section count mismatch: expected ${expectedValues.availableCount}, got ${
      availableCountText ?? "missing"
    }`
  );
  assert(
    Number.isInteger(emptyCount) && emptyCount === expectedValues.emptyCount,
    `${label} imported preview empty section count mismatch: expected ${expectedValues.emptyCount}, got ${
      emptyCountText ?? "missing"
    }`
  );
  assert(
    Number.isInteger(unavailableCount) && unavailableCount === expectedValues.unavailableCount,
    `${label} imported preview unavailable section count mismatch: expected ${expectedValues.unavailableCount}, got ${
      unavailableCountText ?? "missing"
    }`
  );
  assert(
    availableCount + emptyCount + unavailableCount === sectionCount,
    `${label} imported preview section counts must reconcile: available ${availableCountText}, empty ${emptyCountText}, unavailable ${unavailableCountText}, section ${sectionCountText}`
  );
  assert(
    reconciled === "true",
    `${label} imported preview data-section-counts-reconciled mismatch: expected true, got ${reconciled ?? "missing"}`
  );
}

async function assertImportedPreviewSectionHealth(page, expectedStates, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const healthRows = importedPanel.locator("[data-section-health-key]");
  const actualCount = await healthRows.count();
  const expectedKeys = Object.keys(expectedStates).sort();

  assert(
    actualCount === expectedKeys.length,
    `${label} imported preview section health row count mismatch: expected ${expectedKeys.length}, got ${actualCount}`
  );

  for (const [sectionKey, expectedState] of Object.entries(expectedStates)) {
    const healthRow = importedPanel.locator(`[data-section-health-key='${sectionKey}']`);
    const healthRowCount = await healthRow.count();
    assert(
      healthRowCount === 1,
      `${label} imported preview section health ${sectionKey} must render exactly once`
    );

    const actualState = await healthRow.getAttribute("data-section-health-state");
    assert(
      actualState === expectedState,
      `${label} imported preview section health ${sectionKey} mismatch: expected ${expectedState}, got ${
        actualState ?? "missing"
      }`
    );

    const healthText = ((await healthRow.textContent()) ?? "").toLowerCase();
    assert(
      healthText.includes(expectedState),
      `${label} imported preview section health ${sectionKey} must show ${expectedState} text`
    );
  }
}

async function assertImportedPreviewSectionHealthCounts(page, expectedCounts, label) {
  const importedPanel = page.locator(".imported-preview-panel");

  for (const [sectionKey, expectedCount] of Object.entries(expectedCounts)) {
    const healthRow = importedPanel.locator(`[data-section-health-key='${sectionKey}']`);
    const healthRowCount = await healthRow.count();
    assert(
      healthRowCount === 1,
      `${label} imported preview section health ${sectionKey} must render exactly once`
    );

    const countText = await healthRow.getAttribute("data-section-health-count");
    const actualCount = Number(countText);
    assert(
      Number.isInteger(actualCount) && actualCount === expectedCount,
      `${label} imported preview section health ${sectionKey} count mismatch: expected ${expectedCount}, got ${
        countText ?? "missing"
      }`
    );

    const healthText = ((await healthRow.textContent()) ?? "").toLowerCase();
    assert(
      healthText.includes(String(expectedCount)),
      `${label} imported preview section health ${sectionKey} must show count ${expectedCount}`
    );
  }
}

async function assertImportedPreviewSectionHealthSources(page, expectedSources, label) {
  const importedPanel = page.locator(".imported-preview-panel");

  for (const [sectionKey, expectedSource] of Object.entries(expectedSources)) {
    const healthRow = importedPanel.locator(`[data-section-health-key='${sectionKey}']`);
    const healthRowCount = await healthRow.count();
    assert(
      healthRowCount === 1,
      `${label} imported preview section health ${sectionKey} must render exactly once`
    );

    const actualSource = await healthRow.getAttribute("data-section-health-source");
    assert(
      actualSource === expectedSource,
      `${label} imported preview section health ${sectionKey} source mismatch: expected ${expectedSource}, got ${
        actualSource ?? "missing"
      }`
    );

    const healthText = ((await healthRow.textContent()) ?? "").toLowerCase();
    assert(
      healthText.includes(expectedSource.toLowerCase()),
      `${label} imported preview section health ${sectionKey} must show source ${expectedSource}`
    );
  }
}

async function assertImportedPreviewSectionHealthSummary(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const summary = importedPanel.locator("[data-section-health-summary]");
  const summaryCount = await summary.count();
  assert(summaryCount === 1, `${label} imported preview section health summary must render exactly once`);

  const summaryState = await summary.getAttribute("data-section-health-summary");
  const availableText = await summary.getAttribute("data-section-health-available");
  const emptyText = await summary.getAttribute("data-section-health-empty");
  const unavailableText = await summary.getAttribute("data-section-health-unavailable");
  const available = Number(availableText);
  const empty = Number(emptyText);
  const unavailable = Number(unavailableText);
  assert(
    summaryState === expectedValues.state,
    `${label} imported preview section health summary state mismatch: expected ${expectedValues.state}, got ${
      summaryState ?? "missing"
    }`
  );
  assert(
    Number.isInteger(available) && available === expectedValues.available,
    `${label} imported preview section health summary available mismatch: expected ${expectedValues.available}, got ${
      availableText ?? "missing"
    }`
  );
  assert(
    Number.isInteger(empty) && empty === expectedValues.empty,
    `${label} imported preview section health summary empty mismatch: expected ${expectedValues.empty}, got ${
      emptyText ?? "missing"
    }`
  );
  assert(
    Number.isInteger(unavailable) && unavailable === expectedValues.unavailable,
    `${label} imported preview section health summary unavailable mismatch: expected ${expectedValues.unavailable}, got ${
      unavailableText ?? "missing"
    }`
  );

  const summaryText = ((await summary.textContent()) ?? "").toLowerCase();
  assert(
    summaryText.includes(`${expectedValues.available} available`) &&
      summaryText.includes(`${expectedValues.empty} empty`) &&
      summaryText.includes(`${expectedValues.unavailable} unavailable`),
    `${label} imported preview section health summary must show available, empty, and unavailable counts`
  );
}

async function assertImportedPreviewSectionHealthSummaryColor(page, expectedColor, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const summaryValue = await importedPanel.locator("[data-section-health-summary]").getAttribute("data-section-health-summary");
  const actualColor = await importedPanel.locator("[data-section-health-summary] strong").evaluate((element) => {
    return getComputedStyle(element).color;
  });

  assert(
    actualColor === expectedColor,
    `${label} imported preview section health summary color mismatch for ${summaryValue ?? "missing"}: expected ${expectedColor}, got ${actualColor}`
  );
}

async function assertImportedActionMixSummary(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const summary = importedPanel.locator("[data-action-mix-state]");
  const summaryCount = await summary.count();
  assert(summaryCount === 1, `${label} imported action mix summary must render exactly once`);

  const state = await summary.getAttribute("data-action-mix-state");
  const totalText = await summary.getAttribute("data-action-mix-total");
  const topKey = await summary.getAttribute("data-action-mix-top-key");
  const topCountText = await summary.getAttribute("data-action-mix-top-count");
  const topShareText = await summary.getAttribute("data-action-mix-top-share");
  const total = Number(totalText);
  const topCount = Number(topCountText);
  const topShare = Number(topShareText);
  assert(
    state === expectedValues.state,
    `${label} imported action mix state mismatch: expected ${expectedValues.state}, got ${state ?? "missing"}`
  );
  assert(
    Number.isInteger(total) && total === expectedValues.total,
    `${label} imported action mix total mismatch: expected ${expectedValues.total}, got ${totalText ?? "missing"}`
  );
  assert(
    topKey === expectedValues.topKey,
    `${label} imported action mix top key mismatch: expected ${expectedValues.topKey}, got ${topKey ?? "missing"}`
  );
  assert(
    Number.isInteger(topCount) && topCount === expectedValues.topCount,
    `${label} imported action mix top count mismatch: expected ${expectedValues.topCount}, got ${
      topCountText ?? "missing"
    }`
  );
  assert(
    Number.isInteger(topShare) && topShare === expectedValues.topShare,
    `${label} imported action mix top share mismatch: expected ${expectedValues.topShare}, got ${
      topShareText ?? "missing"
    }`
  );

  const summaryText = ((await summary.textContent()) ?? "").toLowerCase();
  assert(summaryText.includes("action mix"), `${label} imported action mix summary must show its label`);
  assert(
    summaryText.includes(expectedValues.state),
    `${label} imported action mix summary must show state ${expectedValues.state}`
  );
  assert(
    summaryText.includes(String(expectedValues.topCount)),
    `${label} imported action mix summary must show top count ${expectedValues.topCount}`
  );
}

async function assertImportedActionMixSummaryColor(page, expectedColor, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const summaryValue = await importedPanel.locator("[data-action-mix-state]").getAttribute("data-action-mix-state");
  const actualColor = await importedPanel.locator("[data-action-mix-state] strong").evaluate((element) => {
    return getComputedStyle(element).color;
  });

  assert(
    actualColor === expectedColor,
    `${label} imported action mix summary color mismatch for ${summaryValue ?? "missing"}: expected ${expectedColor}, got ${actualColor}`
  );
}

async function assertImportedActionMixRows(page, expectedRows, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const summary = importedPanel.locator("[data-action-mix-state]");
  const list = importedPanel.locator(".action-mix-list");
  const listCount = await list.count();
  assert(listCount === 1, `${label} imported action mix list must render exactly once`);

  const summaryTotalText = await summary.getAttribute("data-action-mix-total");
  const summaryTopKey = await summary.getAttribute("data-action-mix-top-key");
  const summaryTopCountText = await summary.getAttribute("data-action-mix-top-count");
  const summaryTopShareText = await summary.getAttribute("data-action-mix-top-share");
  const listTotalText = await list.getAttribute("data-action-mix-total");
  const listRowCountText = await list.getAttribute("data-action-mix-row-count");
  const listTopKey = await list.getAttribute("data-action-mix-top-key");
  const listTopCountText = await list.getAttribute("data-action-mix-top-count");
  const listTopShareText = await list.getAttribute("data-action-mix-top-share");
  const summaryTotal = Number(summaryTotalText);
  const summaryTopCount = Number(summaryTopCountText);
  const summaryTopShare = Number(summaryTopShareText);
  const listTotal = Number(listTotalText);
  const listRowCount = Number(listRowCountText);
  const listTopCount = Number(listTopCountText);
  const listTopShare = Number(listTopShareText);
  const rowElements = list.locator("[data-action-mix-key]");
  const actualRowCount = await rowElements.count();
  const expectedRowCount = Object.keys(expectedRows).length;
  const actionKeysInDomOrder = await rowElements.evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute("data-action-mix-key"))
      .filter((key) => typeof key === "string" && key.length > 0)
  );

  assert(
    Number.isInteger(summaryTotal),
    `${label} imported action mix summary total must be numeric, got ${summaryTotalText ?? "missing"}`
  );
  assert(
    Number.isInteger(listTotal) && listTotal === summaryTotal,
    `${label} imported action mix list total mismatch: expected ${summaryTotal}, got ${listTotalText ?? "missing"}`
  );
  assert(
    Number.isInteger(listRowCount) && listRowCount === actualRowCount,
    `${label} imported action mix list row count mismatch: expected ${actualRowCount}, got ${
      listRowCountText ?? "missing"
    }`
  );
  assert(
    listTopKey === summaryTopKey,
    `${label} imported action mix list top key mismatch: expected ${summaryTopKey ?? "missing"}, got ${
      listTopKey ?? "missing"
    }`
  );
  assert(
    Number.isInteger(listTopCount) && listTopCount === summaryTopCount,
    `${label} imported action mix list top count mismatch: expected ${summaryTopCountText ?? "missing"}, got ${
      listTopCountText ?? "missing"
    }`
  );
  assert(
    Number.isInteger(listTopShare) && listTopShare === summaryTopShare,
    `${label} imported action mix list top share mismatch: expected ${summaryTopShareText ?? "missing"}, got ${
      listTopShareText ?? "missing"
    }`
  );
  assert(
    actualRowCount === expectedRowCount,
    `${label} imported action mix row count mismatch: expected ${expectedRowCount}, got ${actualRowCount}`
  );

  let aggregateCount = 0;
  let reconciledTopKey = "none";
  let reconciledTopCount = 0;
  for (const actionKey of actionKeysInDomOrder) {
    const expectedRow = expectedRows[actionKey];
    assert(expectedRow, `${label} imported action mix row ${actionKey} must be covered by expected rows`);
    const row = importedPanel.locator(`[data-action-mix-key='${actionKey}']`);
    const rowCount = await row.count();
    assert(rowCount === 1, `${label} imported action mix row ${actionKey} must render exactly once`);

    const countText = await row.getAttribute("data-action-mix-count");
    const shareText = await row.getAttribute("data-action-mix-share");
    const totalText = await row.getAttribute("data-action-mix-total");
    const actualCount = Number(countText);
    const actualShare = Number(shareText);
    const actualTotal = Number(totalText);
    const rowState = await row.getAttribute("data-action-mix-row-state");
    const rowText = ((await row.textContent()) ?? "").toLowerCase();
    const actualColor = await row.locator("strong").evaluate((element) => getComputedStyle(element).color);
    const expectedState = expectedRow.count > 0 ? "active" : "empty";
    const expectedColor = expectedState === "active" ? "rgb(27, 27, 29)" : "rgb(107, 107, 114)";
    const expectedShare = calculateImportedSharePercent(actualCount, summaryTotal);
    aggregateCount += actualCount;
    if (actualCount > reconciledTopCount) {
      reconciledTopKey = actionKey;
      reconciledTopCount = actualCount;
    }
    assert(
      countText === String(expectedRow.count),
      `${label} imported action mix row ${actionKey} count mismatch: expected ${expectedRow.count}, got ${
        countText ?? "missing"
      }`
    );
    assert(
      shareText === String(expectedRow.share),
      `${label} imported action mix row ${actionKey} share mismatch: expected ${expectedRow.share}, got ${
        shareText ?? "missing"
      }`
    );
    assert(
      Number.isInteger(actualShare) && actualShare === expectedShare,
      `${label} imported action mix row ${actionKey} share must reconcile with summary total ${summaryTotal}: expected ${expectedShare}, got ${
        shareText ?? "missing"
      }`
    );
    assert(
      totalText === String(expectedRow.total),
      `${label} imported action mix row ${actionKey} total mismatch: expected ${expectedRow.total}, got ${
        totalText ?? "missing"
      }`
    );
    assert(
      Number.isInteger(actualTotal) && actualTotal === summaryTotal,
      `${label} imported action mix row ${actionKey} total must match summary total ${summaryTotal}, got ${
        totalText ?? "missing"
      }`
    );
    assert(
      rowState === expectedState,
      `${label} imported action mix row ${actionKey} state mismatch: expected ${expectedState}, got ${
        rowState ?? "missing"
      }`
    );
    assert(
      actualColor === expectedColor,
      `${label} imported action mix row ${actionKey} color mismatch: expected ${expectedColor}, got ${actualColor}`
    );
    assert(
      rowText.includes(String(expectedRow.count)) && rowText.includes(`${expectedRow.share}%`),
      `${label} imported action mix row ${actionKey} must show count ${expectedRow.count} and share ${expectedRow.share}%`
    );
  }
  assert(
    aggregateCount === summaryTotal,
    `${label} imported action mix row aggregate mismatch: expected ${summaryTotal}, got ${aggregateCount}`
  );
  const reconciledTopShare = calculateImportedSharePercent(reconciledTopCount, summaryTotal);
  assert(
    summaryTopKey === reconciledTopKey,
    `${label} imported action mix summary top key must reconcile to row counts: expected ${reconciledTopKey}, got ${
      summaryTopKey ?? "missing"
    }`
  );
  assert(
    Number.isInteger(summaryTopCount) && summaryTopCount === reconciledTopCount,
    `${label} imported action mix summary top count must reconcile to row counts: expected ${reconciledTopCount}, got ${
      summaryTopCountText ?? "missing"
    }`
  );
  assert(
    Number.isInteger(summaryTopShare) && summaryTopShare === reconciledTopShare,
    `${label} imported action mix summary top share must reconcile to row counts: expected ${reconciledTopShare}, got ${
      summaryTopShareText ?? "missing"
    }`
  );
}

async function assertImportedPreviewEmptyState(page, expectedKey, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const emptyState = importedPanel.locator("[data-empty-state-key]");
  const emptyStateCount = await emptyState.count();
  assert(emptyStateCount === 1, `${label} imported preview empty state must render exactly once`);

  const emptyStateKey = await emptyState.getAttribute("data-empty-state-key");
  assert(
    emptyStateKey === expectedKey,
    `${label} imported preview empty state key mismatch: expected ${expectedKey}, got ${emptyStateKey ?? "missing"}`
  );
}

async function assertImportedPreviewWarningKeys(page, expectedKeys, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const actualKeys = await importedPanel.locator("[data-warning-key]").evaluateAll((nodes) =>
    nodes
      .map((node) => node.getAttribute("data-warning-key"))
      .filter((key) => typeof key === "string" && key.length > 0)
      .sort()
  );
  const sortedExpectedKeys = [...expectedKeys].sort();
  assert(
    JSON.stringify(actualKeys) === JSON.stringify(sortedExpectedKeys),
    `${label} imported preview warning keys mismatch: expected ${sortedExpectedKeys.join(", ")}, got ${actualKeys.join(", ")}`
  );
}

async function assertImportedPreviewItemKinds(page, expectedCounts, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  for (const [kind, expectedCount] of Object.entries(expectedCounts)) {
    const items = importedPanel.locator(`[data-preview-kind='${kind}']`);
    const actualCount = await items.count();
    assert(
      actualCount === expectedCount,
      `${label} imported preview kind ${kind} count mismatch: expected ${expectedCount}, got ${actualCount}`
    );

    for (let index = 0; index < actualCount; index += 1) {
      const previewId = await items.nth(index).getAttribute("data-preview-id");
      assert(
        typeof previewId === "string" && previewId.length > 0,
        `${label} imported preview kind ${kind} item ${index} must expose a stable data-preview-id`
      );
    }
  }
}

async function assertImportedPreviewMetricValues(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  for (const [metricKey, expectedValue] of Object.entries(expectedValues)) {
    const metric = importedPanel.locator(`[data-metric-key='${metricKey}']`);
    const metricCount = await metric.count();
    assert(metricCount === 1, `${label} imported preview metric ${metricKey} must render exactly once`);

    const metricValueText = ((await metric.locator("strong").textContent()) ?? "").trim();
    const metricValue = Number(metricValueText);
    assert(
      Number.isFinite(metricValue) && metricValue === expectedValue,
      `${label} imported preview metric ${metricKey} value mismatch: expected ${expectedValue}, got ${metricValueText}`
    );
  }
}

async function assertImportedPreviewMetricTexts(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  for (const [metricKey, expectedValue] of Object.entries(expectedValues)) {
    const metric = importedPanel.locator(`[data-metric-key='${metricKey}']`);
    const metricCount = await metric.count();
    assert(metricCount === 1, `${label} imported preview metric ${metricKey} must render exactly once`);

    const metricValueText = ((await metric.locator("strong").textContent()) ?? "").trim();
    assert(
      metricValueText === expectedValue,
      `${label} imported preview metric ${metricKey} text mismatch: expected ${expectedValue}, got ${metricValueText}`
    );
  }
}

const importedActionShareMetricKeys = [
  "buying_guide_gap_opportunity_share",
  "buying_guide_gap_task_share",
  "collection_page_opportunity_share",
  "collection_page_task_share",
  "ctr_refresh_opportunity_share",
  "ctr_refresh_task_share",
  "product_seo_opportunity_share",
  "product_seo_task_share",
  "ranking_push_opportunity_share",
  "ranking_push_task_share"
];

function calculateImportedSharePercent(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

async function assertImportedPreviewMetricShareDiagnostics(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  for (const metricKey of importedActionShareMetricKeys) {
    assert(
      Object.prototype.hasOwnProperty.call(expectedValues, metricKey),
      `${label} imported preview action share metric ${metricKey} must be covered by browser diagnostics`
    );
  }

  for (const [metricKey, expectedValue] of Object.entries(expectedValues)) {
    const metric = importedPanel.locator(`[data-metric-key='${metricKey}']`);
    const metricCount = await metric.count();
    assert(metricCount === 1, `${label} imported preview share metric ${metricKey} must render exactly once`);

    const countText = (await metric.getAttribute("data-share-count")) ?? "";
    const totalText = (await metric.getAttribute("data-share-total")) ?? "";
    const percentText = (await metric.getAttribute("data-share-percent")) ?? "";
    const metricValueText = ((await metric.locator("strong").textContent()) ?? "").trim();
    const countValue = Number(countText);
    const totalValue = Number(totalText);
    const percentValue = Number(percentText);
    assert(
      countText === String(expectedValue.count),
      `${label} imported preview share metric ${metricKey} count mismatch: expected ${expectedValue.count}, got ${countText}`
    );
    assert(
      totalText === String(expectedValue.total),
      `${label} imported preview share metric ${metricKey} total mismatch: expected ${expectedValue.total}, got ${totalText}`
    );
    assert(
      percentText === String(expectedValue.percent),
      `${label} imported preview share metric ${metricKey} percent mismatch: expected ${expectedValue.percent}, got ${percentText}`
    );
    assert(
      Number.isFinite(countValue) && Number.isFinite(totalValue) && Number.isFinite(percentValue),
      `${label} imported preview share metric ${metricKey} must expose numeric count, total, and percent diagnostics`
    );
    assert(
      calculateImportedSharePercent(countValue, totalValue) === percentValue,
      `${label} imported preview share metric ${metricKey} percent must reconcile with count ${countText} and total ${totalText}`
    );
    assert(
      metricValueText === `${percentValue}%`,
      `${label} imported preview share metric ${metricKey} visible text must match raw percent ${percentText}`
    );
    if (importedActionShareMetricKeys.includes(metricKey)) {
      const shareScope = (await metric.getAttribute("data-share-scope")) ?? "";
      assert(
        shareScope === "action",
        `${label} imported preview action share metric ${metricKey} must expose data-share-scope=action`
      );
    }
  }
}

async function assertImportedPreviewOverflowValues(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  for (const [overflowKey, expectedValue] of Object.entries(expectedValues)) {
    const overflow = importedPanel.locator(`[data-overflow-key='${overflowKey}']`);
    const overflowCount = await overflow.count();

    if (expectedValue === 0) {
      assert(overflowCount === 0, `${label} imported preview overflow ${overflowKey} must not render`);
      continue;
    }

    assert(overflowCount === 1, `${label} imported preview overflow ${overflowKey} must render exactly once`);
    const overflowValueText = (await overflow.getAttribute("data-overflow-count")) ?? "";
    const overflowValue = Number(overflowValueText);
    assert(
      Number.isFinite(overflowValue) && overflowValue === expectedValue,
      `${label} imported preview overflow ${overflowKey} value mismatch: expected ${expectedValue}, got ${overflowValueText}`
    );
  }
}

async function assertImportedPreviewReferenceValues(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  for (const [referenceKind, expectedReferences] of Object.entries(expectedValues)) {
    const references = importedPanel.locator(`[data-reference-kind='${referenceKind}']`);
    const actualCount = await references.count();
    assert(
      actualCount === expectedReferences.length,
      `${label} imported preview reference ${referenceKind} count mismatch: expected ${expectedReferences.length}, got ${actualCount}`
    );

    const actualReferences = await references.evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.getAttribute("href"),
        text: (node.textContent ?? "").trim(),
        value: node.getAttribute("data-reference-value") ?? ""
      }))
    );
    const actualValues = actualReferences.map((reference) => reference.value).sort();
    const sortedExpectedReferences = [...expectedReferences].sort();
    assert(
      JSON.stringify(actualValues) === JSON.stringify(sortedExpectedReferences),
      `${label} imported preview reference ${referenceKind} values mismatch: expected ${sortedExpectedReferences.join(", ")}, got ${actualValues.join(", ")}`
    );

    for (const reference of actualReferences) {
      assert(
        reference.value.length > 0 && reference.text.includes(reference.value),
        `${label} imported preview reference ${referenceKind} must expose safe reference text matching its data-reference-value`
      );
      assert(
        reference.href === null,
        `${label} imported preview reference ${referenceKind} must not expose href navigation`
      );
    }
  }
}

async function assertImportedPreviewSourceValues(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  for (const [sourceKind, expectedSources] of Object.entries(expectedValues)) {
    const sources = importedPanel.locator(`[data-source-kind='${sourceKind}']`);
    const actualCount = await sources.count();
    assert(
      actualCount === expectedSources.length,
      `${label} imported preview source ${sourceKind} count mismatch: expected ${expectedSources.length}, got ${actualCount}`
    );

    const actualSources = await sources.evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: (node.textContent ?? "").trim(),
        value: node.getAttribute("data-source-value") ?? ""
      }))
    );
    const actualValues = actualSources.map((source) => source.value).sort();
    const sortedExpectedSources = [...expectedSources].sort();
    assert(
      JSON.stringify(actualValues) === JSON.stringify(sortedExpectedSources),
      `${label} imported preview source ${sourceKind} values mismatch: expected ${sortedExpectedSources.join(", ")}, got ${actualValues.join(", ")}`
    );

    for (const source of actualSources) {
      assert(
        source.value.length > 0 && source.text.includes(source.value),
        `${label} imported preview source ${sourceKind} must expose safe source text matching its data-source-value`
      );
    }
  }
}

async function assertImportedTaskPreviewSafetyValues(page, expectedCount, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const safetyRows = importedPanel.locator("[data-task-preview-safety='recommend_only']");
  const actualCount = await safetyRows.count();
  assert(
    actualCount === expectedCount,
    `${label} imported task preview safety row count mismatch: expected ${expectedCount}, got ${actualCount}`
  );

  for (let index = 0; index < actualCount; index += 1) {
    const row = safetyRows.nth(index);
    const automationLevel = await row.getAttribute("data-automation-level");
    const taskStatus = await row.getAttribute("data-task-status");
    const trafscoreText = await row.getAttribute("data-trafscore");
    const evidenceCountText = await row.getAttribute("data-evidence-count");
    const href = await row.getAttribute("href");
    const rowText = ((await row.textContent()) ?? "").trim();

    assert(
      automationLevel === "recommend_only",
      `${label} imported task preview ${index} automation level mismatch: expected recommend_only, got ${automationLevel ?? "missing"}`
    );
    assert(
      taskStatus === "new",
      `${label} imported task preview ${index} status mismatch: expected new, got ${taskStatus ?? "missing"}`
    );

    const trafscore = Number(trafscoreText);
    assert(
      Number.isFinite(trafscore) && trafscore > 0,
      `${label} imported task preview ${index} must expose a positive numeric data-trafscore`
    );

    const evidenceCount = Number(evidenceCountText);
    assert(
      Number.isInteger(evidenceCount) && evidenceCount > 0,
      `${label} imported task preview ${index} must expose a positive integer data-evidence-count`
    );
    assert(rowText.includes("recommend_only"), `${label} imported task preview ${index} must show recommend_only safety text`);
    assert(
      href === null,
      `${label} imported task preview ${index} safety row must not expose href navigation`
    );
  }
}

async function assertImportedOpportunityPreviewDiagnosticValues(page, expectedCount, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const diagnosticCards = importedPanel.locator("[data-opportunity-preview-safety='read_only']");
  const actualCount = await diagnosticCards.count();
  assert(
    actualCount === expectedCount,
    `${label} imported opportunity diagnostic card count mismatch: expected ${expectedCount}, got ${actualCount}`
  );

  const allowedTypes = new Set([
    "buying_guide_gap",
    "collection_page_gap",
    "high_impression_low_ctr",
    "product_seo",
    "ranking_push"
  ]);
  for (let index = 0; index < actualCount; index += 1) {
    const card = diagnosticCards.nth(index);
    const opportunityType = await card.getAttribute("data-opportunity-type");
    const ruleId = await card.getAttribute("data-rule-id");
    const confidenceText = await card.getAttribute("data-confidence");
    const trafscoreText = await card.getAttribute("data-trafscore");
    const href = await card.getAttribute("href");

    assert(
      typeof opportunityType === "string" && allowedTypes.has(opportunityType),
      `${label} imported opportunity ${index} must expose a safe data-opportunity-type`
    );
    assert(
      ruleId === opportunityType,
      `${label} imported opportunity ${index} rule marker mismatch: expected ${opportunityType}, got ${ruleId ?? "missing"}`
    );

    const confidence = Number(confidenceText);
    assert(
      Number.isFinite(confidence) && confidence >= 0 && confidence <= 1,
      `${label} imported opportunity ${index} must expose confidence between 0 and 1`
    );

    const trafscore = Number(trafscoreText);
    assert(
      Number.isFinite(trafscore) && trafscore > 0,
      `${label} imported opportunity ${index} must expose a positive numeric data-trafscore`
    );
    assert(
      href === null,
      `${label} imported opportunity ${index} diagnostic card must not expose href navigation`
    );
  }
}

async function assertImportedQueryClusterDiagnosticValues(page, expectedCount, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const diagnosticCards = importedPanel.locator("[data-query-cluster-diagnostics='imported_gsc']");
  const actualCount = await diagnosticCards.count();
  assert(
    actualCount === expectedCount,
    `${label} imported query cluster diagnostic card count mismatch: expected ${expectedCount}, got ${actualCount}`
  );

  for (let index = 0; index < actualCount; index += 1) {
    const card = diagnosticCards.nth(index);
    const primaryQuery = await card.getAttribute("data-primary-query");
    const queryCountText = await card.getAttribute("data-query-count");
    const impressionsText = await card.getAttribute("data-impressions");
    const clicksText = await card.getAttribute("data-clicks");
    const ctrText = await card.getAttribute("data-ctr");
    const positionText = await card.getAttribute("data-position");
    const topPageCountText = await card.getAttribute("data-top-page-count");
    const href = await card.getAttribute("href");
    const cardText = ((await card.textContent()) ?? "").trim();

    assert(
      typeof primaryQuery === "string" && primaryQuery.length > 0 && cardText.includes(primaryQuery),
      `${label} imported query cluster ${index} must expose a visible primary query marker`
    );

    const queryCount = Number(queryCountText);
    assert(
      Number.isInteger(queryCount) && queryCount > 0,
      `${label} imported query cluster ${index} must expose a positive integer data-query-count`
    );

    const impressions = Number(impressionsText);
    assert(
      Number.isInteger(impressions) && impressions > 0,
      `${label} imported query cluster ${index} must expose positive integer impressions`
    );

    const clicks = Number(clicksText);
    assert(
      Number.isInteger(clicks) && clicks > 0,
      `${label} imported query cluster ${index} must expose positive integer clicks`
    );

    const ctr = Number(ctrText);
    assert(
      Number.isFinite(ctr) && ctr > 0 && ctr <= 1,
      `${label} imported query cluster ${index} must expose CTR between 0 and 1`
    );

    const position = Number(positionText);
    assert(
      Number.isFinite(position) && position > 0,
      `${label} imported query cluster ${index} must expose positive average position`
    );

    const topPageCount = Number(topPageCountText);
    assert(
      Number.isInteger(topPageCount) && topPageCount > 0,
      `${label} imported query cluster ${index} must expose positive top-page count`
    );
    assert(
      href === null,
      `${label} imported query cluster ${index} diagnostic card must not expose href navigation`
    );
  }
}

async function assertImportedQueryRowDiagnosticValues(page, expectedCount, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const diagnosticCards = importedPanel.locator("[data-query-row-diagnostics='imported_gsc']");
  const actualCount = await diagnosticCards.count();
  assert(
    actualCount === expectedCount,
    `${label} imported query row diagnostic card count mismatch: expected ${expectedCount}, got ${actualCount}`
  );

  for (let index = 0; index < actualCount; index += 1) {
    const card = diagnosticCards.nth(index);
    const query = await card.getAttribute("data-query");
    const windowLabel = await card.getAttribute("data-window");
    const impressionsText = await card.getAttribute("data-impressions");
    const clicksText = await card.getAttribute("data-clicks");
    const ctrText = await card.getAttribute("data-ctr");
    const positionText = await card.getAttribute("data-position");
    const evidenceCountText = await card.getAttribute("data-evidence-count");
    const href = await card.getAttribute("href");
    const cardText = ((await card.textContent()) ?? "").trim();

    assert(
      typeof query === "string" && query.length > 0 && cardText.includes(query),
      `${label} imported query row ${index} must expose a visible query marker`
    );
    assert(
      windowLabel === "28d" && cardText.includes("window 28d"),
      `${label} imported query row ${index} must expose the imported GSC window marker`
    );

    const impressions = Number(impressionsText);
    assert(
      Number.isInteger(impressions) && impressions > 0,
      `${label} imported query row ${index} must expose positive integer impressions`
    );

    const clicks = Number(clicksText);
    assert(
      Number.isInteger(clicks) && clicks > 0,
      `${label} imported query row ${index} must expose positive integer clicks`
    );

    const ctr = Number(ctrText);
    assert(
      Number.isFinite(ctr) && ctr > 0 && ctr <= 1,
      `${label} imported query row ${index} must expose CTR between 0 and 1`
    );

    const position = Number(positionText);
    assert(
      Number.isFinite(position) && position > 0,
      `${label} imported query row ${index} must expose positive average position`
    );

    const evidenceCount = Number(evidenceCountText);
    assert(
      Number.isInteger(evidenceCount) && evidenceCount > 0,
      `${label} imported query row ${index} must expose positive evidence count`
    );
    assert(
      href === null,
      `${label} imported query row ${index} diagnostic card must not expose href navigation`
    );
  }
}

async function assertImportedCatalogCardDiagnosticValues(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  for (const [catalogKind, expectedTitles] of Object.entries(expectedValues)) {
    const cards = importedPanel.locator(`[data-catalog-kind='${catalogKind}']`);
    const actualCount = await cards.count();
    assert(
      actualCount === expectedTitles.length,
      `${label} imported catalog ${catalogKind} card count mismatch: expected ${expectedTitles.length}, got ${actualCount}`
    );

    const actualCards = await cards.evaluateAll((nodes) =>
      nodes.map((node) => ({
        hasDisplayUrl: node.getAttribute("data-has-display-url") ?? "",
        href: node.getAttribute("href"),
        source: node.getAttribute("data-catalog-source") ?? "",
        text: (node.textContent ?? "").trim(),
        title: node.getAttribute("data-catalog-title") ?? ""
      }))
    );
    const actualTitles = actualCards.map((card) => card.title).sort();
    const sortedExpectedTitles = [...expectedTitles].sort();
    assert(
      JSON.stringify(actualTitles) === JSON.stringify(sortedExpectedTitles),
      `${label} imported catalog ${catalogKind} titles mismatch: expected ${sortedExpectedTitles.join(", ")}, got ${actualTitles.join(", ")}`
    );

    const expectedSource = catalogKind === "product" ? "WooCommerce" : "WordPress";
    for (const card of actualCards) {
      assert(
        card.source === expectedSource,
        `${label} imported catalog ${catalogKind} source mismatch: expected ${expectedSource}, got ${card.source || "missing"}`
      );
      assert(
        card.hasDisplayUrl === "true" && card.text.includes(card.title),
        `${label} imported catalog ${catalogKind} must expose safe title text and a display URL marker`
      );
      assert(card.href === null, `${label} imported catalog ${catalogKind} card must not expose href navigation`);
    }
  }
}

async function assertImportedVisibleRailCounts(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const previewList = importedPanel.locator(".imported-preview-list");
  const previewListCount = await previewList.count();
  assert(previewListCount === 1, `${label} imported preview list must render exactly once`);

  for (const [attributeName, expectedValue] of Object.entries(expectedValues)) {
    const countText = await previewList.getAttribute(attributeName);
    const count = Number(countText);
    assert(
      Number.isInteger(count) && count === expectedValue,
      `${label} imported preview list ${attributeName} mismatch: expected ${expectedValue}, got ${countText ?? "missing"}`
    );
  }
}

async function assertImportedTotalRailCounts(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const previewList = importedPanel.locator(".imported-preview-list");
  const previewListCount = await previewList.count();
  assert(previewListCount === 1, `${label} imported preview list must render exactly once`);

  for (const [attributeName, expectedValue] of Object.entries(expectedValues)) {
    const countText = await previewList.getAttribute(attributeName);
    const count = Number(countText);
    assert(
      Number.isInteger(count) && count === expectedValue,
      `${label} imported preview list ${attributeName} mismatch: expected ${expectedValue}, got ${countText ?? "missing"}`
    );
  }
}

async function assertImportedHiddenRailCounts(page, expectedValues, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const previewList = importedPanel.locator(".imported-preview-list");
  const previewListCount = await previewList.count();
  assert(previewListCount === 1, `${label} imported preview list must render exactly once`);

  for (const [attributeName, expectedValue] of Object.entries(expectedValues)) {
    const countText = await previewList.getAttribute(attributeName);
    const count = Number(countText);
    assert(
      Number.isInteger(count) && count === expectedValue,
      `${label} imported preview list ${attributeName} mismatch: expected ${expectedValue}, got ${countText ?? "missing"}`
    );
  }
}

async function assertImportedRailCountReconciliation(page, railKeys, label) {
  const importedPanel = page.locator(".imported-preview-panel");
  const previewList = importedPanel.locator(".imported-preview-list");
  const previewListCount = await previewList.count();
  assert(previewListCount === 1, `${label} imported preview list must render exactly once`);

  const reconciled = await previewList.getAttribute("data-rail-counts-reconciled");
  assert(
    reconciled === "true",
    `${label} imported preview list data-rail-counts-reconciled mismatch: expected true, got ${reconciled ?? "missing"}`
  );

  for (const railKey of railKeys) {
    const totalText = await previewList.getAttribute(`data-total-${railKey}`);
    const visibleText = await previewList.getAttribute(`data-visible-${railKey}`);
    const hiddenText = await previewList.getAttribute(`data-hidden-${railKey}`);
    const total = Number(totalText);
    const visible = Number(visibleText);
    const hidden = Number(hiddenText);

    assert(
      Number.isInteger(total) && Number.isInteger(visible) && Number.isInteger(hidden),
      `${label} imported preview rail ${railKey} count markers must be integers`
    );
    assert(
      Math.max(total - visible, 0) === hidden,
      `${label} imported preview rail ${railKey} mismatch: total ${totalText}, visible ${visibleText}, hidden ${hiddenText}`
    );
  }
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
    const assetWorkspaceRequests = [];
    const performanceSnapshotRequests = [];

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
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        assetWorkspaceRequests.push({ method: request.method(), url });
      }
      if (url.includes(`/api/stores/${storeId}/performance`)) {
        performanceSnapshotRequests.push({ method: request.method(), url });
      }
    });

    await page.goto(webUrl);
    await clickUnique(page.getByRole("button", { name: "EN" }), "language switcher");
    await expectVisible(page.getByText("read-only imported previews"), "read-only imported preview badge");
    await expectVisible(page.getByText("Graph-linked clusters"), "graph-linked cluster metric");
    await expectVisible(page.getByText("Query rows"), "imported query row count metric");
    await expectVisible(page.getByText("Catalog products"), "imported catalog product count metric");
    await expectVisible(page.getByText("Catalog pages"), "imported catalog page count metric");
    await expectVisible(page.getByText("CTR refresh opportunities"), "imported CTR refresh opportunity summary metric");
    await expectVisible(page.getByText("CTR refresh task previews"), "imported CTR refresh task summary metric");
    await expectVisible(page.getByText("CTR refresh opportunity share"), "imported CTR refresh opportunity share metric");
    await expectVisible(page.getByText("CTR refresh task share"), "imported CTR refresh task share metric");
    await expectVisible(page.getByText("Collection page opportunities"), "imported collection page opportunity summary metric");
    await expectVisible(page.getByText("Collection page task previews"), "imported collection page task summary metric");
    await expectVisible(page.getByText("Collection page opportunity share"), "imported collection page opportunity share metric");
    await expectVisible(page.getByText("Collection page task share"), "imported collection page task share metric");
    await expectVisible(page.getByText("Buying guide opportunities"), "imported buying guide opportunity summary metric");
    await expectVisible(page.getByText("Buying guide task previews"), "imported buying guide task summary metric");
    await expectVisible(page.getByText("Buying guide gap opportunities"), "imported buying guide gap opportunity rule summary metric");
    await expectVisible(page.getByText("Buying guide gap task previews"), "imported buying guide gap task rule summary metric");
    await expectVisible(page.getByText("Buying guide gap opportunity share"), "imported buying guide gap opportunity share metric");
    await expectVisible(page.getByText("Buying guide gap task share"), "imported buying guide gap task share metric");
    await expectVisible(page.getByText("Ranking push opportunities"), "imported ranking push opportunity summary metric");
    await expectVisible(page.getByText("Ranking push task previews"), "imported ranking push task summary metric");
    await expectVisible(page.getByText("Ranking push opportunity share"), "imported ranking push opportunity share metric");
    await expectVisible(page.getByText("Ranking push task share"), "imported ranking push task share metric");
    await expectVisible(page.getByText("Recommend-only task previews"), "imported recommend-only task summary metric");
    await expectVisible(page.getByText("Recommend-only task share"), "imported recommend-only task share metric");
    await expectVisible(page.getByText("New task previews"), "imported new task summary metric");
    await expectVisible(page.getByText("New task share"), "imported new task share metric");
    await expectVisible(page.getByText("New opportunity previews"), "imported new opportunity summary metric");
    await expectVisible(page.getByText("New opportunity share"), "imported new opportunity share metric");
    await expectVisible(page.getByText("Product SEO opportunities"), "imported product SEO opportunity summary metric");
    await expectVisible(page.getByText("Product SEO task previews"), "imported product SEO task summary metric");
    await expectVisible(page.getByText("Product SEO opportunity share"), "imported product SEO opportunity share metric");
    await expectVisible(page.getByText("Product SEO task share"), "imported product SEO task share metric");
    await expectVisible(page.getByText("portable espresso maker camping"), "imported query cluster");
    await expectVisible(page.getByText("Query row / Imported GSC"), "imported query row friendly source label");
    await expectVisible(page.getByText("evidence 1 row / Imported GSC"), "imported query row evidence summary label");
    await expectVisible(page.getByText("1,200 impressions / 24 clicks"), "imported query row formatted count labels");
    await expectVisible(page.getByText("CTR 2.00%"), "imported query row formatted CTR label");
    await expectVisible(page.getByText("avg position 4.8"), "imported query row formatted position label");
    await expectVisible(page.getByText("window 28d"), "imported query row window label");
    await expectVisible(page.getByText("page example.com/camping-espresso"), "imported query row page reference label");
    await expectVisible(page.getByText("Trail Brew Portable Espresso Maker"), "imported product row");
    await expectVisible(page.getByText("Camping Espresso Collection"), "imported page row");
    await expectVisible(page.getByText("1 more catalog products"), "catalog product overflow indicator");
    await expectVisible(page.getByText("1 more catalog pages"), "catalog page overflow indicator");
    await expectVisible(page.getByText("2 more query clusters"), "query cluster overflow indicator");
    await expectVisible(page.getByText("3 more query rows"), "query row overflow indicator");
    await expectVisible(page.getByText("2 more opportunity previews"), "opportunity preview overflow indicator");
    await expectVisible(page.getByText("2 more task previews"), "task preview overflow indicator");
    await expectVisible(page.getByText("recommend_only"), "recommend-only imported task preview");
    await assertPerformanceSnapshotPanelIsReadOnly(page, "initial");
    await assertAssetWorkspacePanelIsReadOnly(page, 0, "initial");
    await assertTrackedAssetMetricReconciles(page, 0, "initial");
    await assertAssetWorkspaceBlockedCapabilities(
      page,
      ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
      "initial"
    );

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
    assert(
      assetWorkspaceRequests.some(
        (request) => request.method === "GET" && request.url.endsWith(`/api/stores/${storeId}/assets`)
      ),
      "Asset workspace endpoint was not read with GET"
    );
    const unsafeAssetRequests = assetWorkspaceRequests.filter((request) => request.method !== "GET");
    assert(
      unsafeAssetRequests.length === 0,
      `Asset workspace endpoint must stay read-only in UI loading: ${JSON.stringify(unsafeAssetRequests)}`
    );
    assertPerformanceSnapshotRequestsReadOnly(performanceSnapshotRequests, 1, "initial");

    const emptyPerformancePage = await context.newPage();
    const emptyPerformanceRequests = [];
    emptyPerformancePage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/performance`)) {
        emptyPerformanceRequests.push({ method: request.method(), url });
      }
    });
    await emptyPerformancePage.route(`**/api/stores/${storeId}/performance`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/performance`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            blocked_capabilities: ["real_gsc_oauth", "wordpress_writes", "woocommerce_writes", "live_publish"],
            external_write_allowed: false,
            mode: "performance_snapshots",
            safety_scope: "local_imported_gsc_only",
            snapshots: [],
            store_id: storeId,
            summary: { clicks: 0, ctr: 0, impressions: 0, position: 0, snapshot_count: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await emptyPerformancePage.goto(webUrl);
    await clickUnique(emptyPerformancePage.getByRole("button", { name: "EN" }), "empty performance language switcher");
    await assertPerformanceSnapshotEmptyStateIsReadOnly(
      emptyPerformancePage,
      "empty performance",
      "empty",
      "no_imported_gsc_snapshot",
      "No imported GSC snapshot yet"
    );
    assertPerformanceSnapshotRequestsReadOnly(emptyPerformanceRequests, 1, "empty performance");
    await emptyPerformancePage.close();

    const unavailablePerformancePage = await context.newPage();
    const unavailablePerformanceRequests = [];
    unavailablePerformancePage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/performance`)) {
        unavailablePerformanceRequests.push({ method: request.method(), url });
      }
    });
    await unavailablePerformancePage.route(`**/api/stores/${storeId}/performance`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/performance`)) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });
    await unavailablePerformancePage.goto(webUrl);
    await clickUnique(
      unavailablePerformancePage.getByRole("button", { name: "EN" }),
      "unavailable performance language switcher"
    );
    await assertPerformanceSnapshotEmptyStateIsReadOnly(
      unavailablePerformancePage,
      "unavailable performance",
      "unavailable",
      "performance_snapshots_unavailable",
      "Performance snapshots unavailable"
    );
    assertPerformanceSnapshotRequestsReadOnly(unavailablePerformanceRequests, 1, "unavailable performance");
    await unavailablePerformancePage.close();

    const populatedAssetPage = await context.newPage();
    const populatedAssetRequests = [];
    const populatedAssetPerformanceRequests = [];
    populatedAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        populatedAssetRequests.push({ method: request.method(), url });
      }
      if (url.includes(`/api/stores/${storeId}/assets/`) && url.includes("/performance")) {
        populatedAssetPerformanceRequests.push({ method: request.method(), url });
      }
    });
    await populatedAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                claim_ledger: [
                  {
                    id: "claim_ctr_gap",
                    source: "gsc_import",
                    text: "Imported GSC row shows low CTR on camping espresso queries."
                  },
                  {
                    id: "token-secret-claim",
                    metadata: { password: "unsafe-password" },
                    source: "secret_source",
                    text: "token-secret-password"
                  }
                ],
                content_blocks: [{ type: "answer_summary" }, { type: "metadata_only" }, { type: "faq" }],
                external_write_allowed: false,
                id: "asset_task_002",
                qa_checks: [
                  { key: "seo", status: "pending" },
                  { key: "geo", status: "pending" },
                  { key: "factual_grounding", status: "passed" }
                ],
                review_state: "draft_candidate",
                source_task_id: "task_002",
                source_task_status: "approved",
                title: "Create camping portable espresso collection page"
              },
              {
                asset_type: "buying_guide",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }, { type: "faq" }],
                external_write_allowed: false,
                id: "asset_task_003",
                qa_checks: [{ key: "schema", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_003",
                source_task_status: "approved",
                title: "Draft camping espresso buying guide"
              },
              {
                asset_type: "product_seo",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                claim_ledger: [
                  {
                    id: "claim_product_metadata",
                    source: "local_evidence",
                    text: "Product SEO draft should keep claims grounded in imported product data."
                  }
                ],
                content_blocks: [{ type: "metadata_only" }],
                external_write_allowed: false,
                id: "asset_task_004",
                qa_checks: [{ key: "metadata", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_004",
                source_task_status: "approved",
                title: "Refresh portable espresso product SEO"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 3, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await populatedAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_002`, async (route) => {
      if (route.request().method() === "PATCH") {
        const payload = route.request().postDataJSON();
        assert(payload.title === "Updated local camping espresso draft", "Local asset PATCH must send edited title");
        assert(payload.meta_description === "Compare portable espresso kits for camp coffee.", "Local asset PATCH must send edited meta description");
        assert(Array.isArray(payload.content_blocks), "Local asset PATCH must send local content blocks");
        assert(
          payload.content_blocks.some(
            (block) => block?.type === "section" && block?.heading === "Camping espresso kit comparison"
          ),
          "Local asset PATCH must send edited structured section heading"
        );
        assert(
          payload.content_blocks.some(
            (block) =>
              block?.type === "product_grid_notes" &&
              block?.body === "Feature manual brewers, compact grinders, and kettle bundles."
          ),
          "Local asset PATCH must send product grid notes as a safe content block"
        );
        assert(Array.isArray(payload.faq_items), "Local asset PATCH must send local FAQ draft items");
        assert(
          payload.faq_items[0]?.question === "Can I use a manual espresso maker at camp?",
          "Local asset PATCH must send edited FAQ question"
        );
        assert(
          payload.faq_items[0]?.answer === "Yes. Use a compact brewer and preheat the cup.",
          "Local asset PATCH must send edited FAQ answer"
        );
        assert(payload.schema_json?.["@type"] === "FAQPage", "Local asset PATCH must send local schema preview");
        assert(Array.isArray(payload.internal_links), "Local asset PATCH must send local internal link references");
        assert(
          payload.internal_links[0] === "collection:camping-coffee",
          "Local asset PATCH must send edited internal link reference"
        );
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              claim_ledger: [
                {
                  id: "claim_ctr_gap",
                  source: "gsc_import",
                  text: "Imported GSC row shows low CTR on camping espresso queries."
                },
                {
                  id: "claim_2",
                  source: "local_evidence",
                  text: "Local claim requires review"
                }
              ],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_002",
              qa_checks: [
                { key: "seo", status: "pending" },
                { key: "geo", status: "pending" }
              ],
              review_state: "draft_candidate",
              source_task_id: "task_002",
              source_task_status: "approved",
              title: "Updated local camping espresso draft"
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await populatedAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_002/performance`, async (route) => {
      if (
        route.request().method() === "GET" &&
        route.request().url().endsWith(`/api/stores/${storeId}/assets/asset_task_002/performance`)
      ) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset_id: "asset_task_002",
            asset_title: "Create camping portable espresso collection page",
            blocked_capabilities: ["real_gsc_oauth", "wordpress_writes", "woocommerce_writes", "live_publish"],
            external_write_allowed: false,
            match_scope: "local_asset_query_page_tokens",
            mode: "asset_performance_snapshots",
            safety_scope: "local_imported_gsc_only",
            snapshots: [
              {
                asset_id: "asset_task_002",
                clicks: 24,
                ctr: 0.02,
                external_write_allowed: false,
                id: "asset_perf_task_002",
                impressions: 1200,
                match_scope: "local_asset_query_page_tokens",
                page_count: 1,
                position: 4.8,
                query_count: 1,
                source: "imported_gsc_csv",
                window: "28d"
              }
            ],
            store_id: storeId,
            summary: { clicks: 24, ctr: 0.02, impressions: 1200, matching_rows: 1, position: 4.8, snapshot_count: 1 }
          })
        });
        return;
      }

      await route.continue();
    });
    await populatedAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_003/performance`, async (route) => {
      if (
        route.request().method() === "GET" &&
        route.request().url().endsWith(`/api/stores/${storeId}/assets/asset_task_003/performance`)
      ) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset_id: "asset_task_003",
            asset_title: "Draft camping espresso buying guide",
            blocked_capabilities: ["real_gsc_oauth", "wordpress_writes", "woocommerce_writes", "live_publish"],
            external_write_allowed: false,
            match_scope: "local_asset_query_page_tokens",
            mode: "asset_performance_snapshots",
            safety_scope: "local_imported_gsc_only",
            snapshots: [],
            store_id: storeId,
            summary: { clicks: 0, ctr: 0, impressions: 0, matching_rows: 0, position: 0, snapshot_count: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await populatedAssetPage.goto(webUrl);
    await clickUnique(populatedAssetPage.getByRole("button", { name: "EN" }), "populated asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(populatedAssetPage, 3, "populated asset workspace", [
      {
        contentBlockCount: 3,
        contentBlockTypes: ["answer_summary", "metadata_only", "faq"],
        claimCount: 2,
        blockedCapabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
        claims: [
          {
            id: "claim_ctr_gap",
            source: "gsc_import",
            text: "Imported GSC row shows low CTR on camping espresso queries."
          },
          { id: "claim_2", source: "local_evidence", text: "Local claim requires review" }
        ],
        id: "asset_task_002",
        qaDetails: [
          { key: "seo", status: "pending" },
          { key: "geo", status: "pending" },
          { key: "factual_grounding", status: "passed" }
        ],
        qaCheckCount: 3,
        qaPendingCount: 2,
        reviewState: "draft_candidate",
        title: "Create camping portable espresso collection page"
      },
      {
        contentBlockCount: 2,
        contentBlockTypes: ["answer_summary", "faq"],
        blockedCapabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
        id: "asset_task_003",
        qaDetails: [{ key: "schema", status: "pending" }],
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Draft camping espresso buying guide"
      }
    ]);
    await assertTrackedAssetMetricReconciles(populatedAssetPage, 3, "populated asset workspace");
    await assertAssetWorkspaceBlockedCapabilities(
      populatedAssetPage,
      ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
      "populated asset workspace"
    );
    await assertAssetWorkspaceOverflow(populatedAssetPage, 1, "populated asset workspace");
    await assertAssetWorkspaceTypeSummary(
      populatedAssetPage,
      { buying_guide: 1, collection_page: 1, product_seo: 1 },
      "populated asset workspace"
    );
    await assertAssetWorkspaceReviewStateDistribution(
      populatedAssetPage,
      { draft_candidate: 3 },
      "populated asset workspace"
    );
    await assertAssetWorkspaceSourceTaskDistribution(
      populatedAssetPage,
      { task_002: 1, task_003: 1, task_004: 1 },
      "populated asset workspace"
    );
    await assertAssetWorkspaceSourceTaskStatusDistribution(
      populatedAssetPage,
      { approved: 3 },
      "populated asset workspace"
    );
    await assertAssetWorkspaceQaSummary(populatedAssetPage, 5, 4, "populated asset workspace");
    await assertWordPressDraftReadinessSummary(populatedAssetPage, 0, 3, "populated asset workspace");
    await assertWordPressDraftReadinessReconciles(populatedAssetPage, "populated asset workspace");
    await assertAssetExternalWriteClampReconciles(populatedAssetPage, "populated asset workspace");
    await assertAssetWorkspaceQaReadiness(populatedAssetPage, "pending_qa", 4, 5, "populated asset workspace");
    await assertAssetWorkspaceQaAggregateReconciles(populatedAssetPage, 1, 1, "populated asset workspace");
    await assertAssetWorkspaceRowAggregateReconciles(populatedAssetPage, "populated asset workspace");
    await assertAssetWorkspaceContentBlockAggregateReconciles(populatedAssetPage, 6, 5, 1, "populated asset workspace");
    await assertAssetWorkspaceContentBlockTypeDistribution(
      populatedAssetPage,
      { answer_summary: 2, faq: 2, metadata_only: 2 },
      "populated asset workspace"
    );
    await assertAssetWorkspaceClaimAggregateReconciles(populatedAssetPage, 3, 2, 1, "populated asset workspace");
    await assertAssetWorkspaceClaimSourceDistribution(
      populatedAssetPage,
      { gsc_import: 1, local_evidence: 2 },
      "populated asset workspace"
    );
    const populatedEditor = await assertLocalAssetEditorCanSave(populatedAssetPage, "populated asset workspace", {
      expectedContentBlockTypes: ["answer_summary", "metadata_only", "faq"],
      expectedClaims: [
        {
          id: "claim_ctr_gap",
          source: "gsc_import",
          text: "Imported GSC row shows low CTR on camping espresso queries."
        },
        { id: "claim_2", source: "local_evidence", text: "Local claim requires review" }
      ]
    });
    await assertLocalAssetEditorSourceTaskContext(
      populatedEditor,
      "task_002",
      "approved",
      "populated asset workspace"
    );
    await assertLocalAssetEditorAssetTypeContext(populatedEditor, "collection_page", "populated asset workspace");
    await assertLocalAssetEditorReviewStateContext(populatedEditor, "draft_candidate", "populated asset workspace");
    await assertLocalAssetEditorEvidenceSummary(populatedEditor, 2, "populated asset workspace");
    await assertLocalAssetEditorWordPressDraftReadiness(populatedEditor, 0, 1, "populated asset workspace");
    await assertLocalAssetEditorExternalWriteClamp(populatedEditor, "populated asset workspace");
    await assertLocalAssetEditorCommerceWriteClamp(populatedEditor, "populated asset workspace");
    await assertLocalAssetEditorCredentialCollectionClamp(populatedEditor, "populated asset workspace");
    await assertLocalAssetEditorSyncExecutionClamp(populatedEditor, "populated asset workspace");
    await assertLocalAssetEditorPublishingClamp(populatedEditor, "populated asset workspace");
    await assertLocalAssetEditorClaimSourceDistribution(
      populatedEditor,
      { gsc_import: 1, local_evidence: 1 },
      "populated asset workspace"
    );
    await assertLocalAssetEditorFieldReadinessCanBecomeComplete(populatedEditor, "populated asset workspace");
    await assertAssetPerformancePanelIsReadOnly(populatedAssetPage, "populated asset workspace", "asset_task_002", {
      clicks: "24",
      coverage: "1 queries / 1 pages",
      ctr: "2.00%",
      evidence_count: "1",
      impressions: "1,200",
      page_count: "1",
      position: "4.8",
      query_count: "1",
      snapshot_id: "asset_perf_task_002",
      source: "Imported GSC",
      window: "28d"
    });
    await assertEditorControlsStayWithinPanel(populatedEditor, "populated asset workspace");
    await populatedAssetPage.screenshot({ fullPage: true, path: desktopAssetEditorScreenshotPath });
    assertScreenshotArtifact(desktopAssetEditorScreenshotPath, "desktop English local asset editor");
    await clickUnique(populatedEditor.getByRole("button", { name: "Close" }), "populated asset close editor button");
    await clickUnique(
      populatedAssetPage.locator("[data-asset-id='asset_task_003']").getByRole("button", { name: "Review local draft" }),
      "populated asset empty performance review entry"
    );
    await assertAssetPerformanceEmptyStateIsReadOnly(
      populatedAssetPage,
      "populated asset workspace empty performance",
      "asset_task_003",
      "empty",
      "no_imported_asset_performance_comparison"
    );
    const localAssetPatchRequests = populatedAssetRequests.filter(
      (request) => request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_002`)
    );
    assert(
      localAssetPatchRequests.length === 1,
      `Local asset editor must issue exactly one safe asset PATCH, got ${JSON.stringify(populatedAssetRequests)}`
    );
    const unsafePopulatedAssetRequests = populatedAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_002`))
    );
    assert(
      unsafePopulatedAssetRequests.length === 0,
      `Local asset editor issued unsafe asset requests: ${JSON.stringify(unsafePopulatedAssetRequests)}`
    );
    assertAssetPerformanceRequestsReadOnly(
      populatedAssetPerformanceRequests,
      1,
      "populated asset workspace",
      "asset_task_002"
    );
    assertAssetPerformanceRequestsReadOnly(
      populatedAssetPerformanceRequests,
      1,
      "populated asset empty performance",
      "asset_task_003"
    );
    await populatedAssetPage.close();

    const unavailableAssetPerformancePage = await context.newPage();
    const unavailableAssetPerformanceRequests = [];
    unavailableAssetPerformancePage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets/asset_task_unavailable/performance`)) {
        unavailableAssetPerformanceRequests.push({ method: request.method(), url });
      }
    });
    await unavailableAssetPerformancePage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_unavailable",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_unavailable",
                title: "Unavailable asset performance candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await unavailableAssetPerformancePage.route(
      `**/api/stores/${storeId}/assets/asset_task_unavailable/performance`,
      async (route) => {
        if (
          route.request().method() === "GET" &&
          route.request().url().endsWith(`/api/stores/${storeId}/assets/asset_task_unavailable/performance`)
        ) {
          await route.fulfill({
            contentType: "application/json",
            status: 500,
            body: JSON.stringify({ detail: "asset performance unavailable" })
          });
          return;
        }

        await route.continue();
      }
    );
    await unavailableAssetPerformancePage.goto(webUrl);
    await clickUnique(
      unavailableAssetPerformancePage.getByRole("button", { name: "EN" }),
      "unavailable asset performance language switcher"
    );
    await assertAssetWorkspacePanelIsReadOnly(unavailableAssetPerformancePage, 1, "unavailable asset performance workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_unavailable",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Unavailable asset performance candidate"
      }
    ]);
    await clickUnique(
      unavailableAssetPerformancePage.getByRole("button", { name: "Review local draft" }),
      "unavailable asset performance review entry"
    );
    await assertAssetPerformanceEmptyStateIsReadOnly(
      unavailableAssetPerformancePage,
      "unavailable asset performance workspace",
      "asset_task_unavailable",
      "unavailable",
      "asset_performance_comparison_unavailable"
    );
    assertAssetPerformanceRequestsReadOnly(
      unavailableAssetPerformanceRequests,
      1,
      "unavailable asset performance workspace",
      "asset_task_unavailable"
    );
    await unavailableAssetPerformancePage.close();

    const mobileAssetPage = await context.newPage();
    await mobileAssetPage.setViewportSize({ height: 844, width: 390 });
    const mobileAssetRequests = [];
    mobileAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        mobileAssetRequests.push({ method: request.method(), url });
      }
    });
    await mobileAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_mobile",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_mobile",
                title:
                  "Very long local camping espresso collection draft title that should wrap inside the mobile editor panel"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await mobileAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_mobile`, async (route) => {
      if (route.request().method() === "PATCH") {
        const payload = route.request().postDataJSON();
        assert(payload.title === "移动端本地草稿保存验证标题", "Mobile asset PATCH must send edited Chinese title");
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_mobile",
              qa_checks: [{ key: "seo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_mobile",
              title: "移动端本地草稿保存验证标题"
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await mobileAssetPage.goto(webUrl);
    await assertAssetWorkspacePanelIsReadOnly(mobileAssetPage, 1, "mobile Chinese asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_mobile",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title:
          "Very long local camping espresso collection draft title that should wrap inside the mobile editor panel"
      }
    ]);
    const mobileEditor = await assertLocalAssetEditorCanSave(mobileAssetPage, "mobile Chinese asset workspace", {
      entryName: "审核本地草稿",
      externalWritesCopy: "外部写入已关闭",
      fieldCopy: "字段",
      filledCopy: "已填写",
      localOnlyCopy: "仅本地草稿",
      qaChecksCopy: "QA 检查",
      qaPendingSuffix: "待处理",
      qaReadinessCopy: "QA 就绪状态",
      savedEmptyFieldCount: 10,
      savedFilledFieldCount: 2,
      saveName: "保存本地草稿",
      saveSuccessCopy: "本地草稿已保存",
      titleValue: "移动端本地草稿保存验证标题",
      wordpressBlockedCopy: "WordPress 草稿创建已阻止",
      woocommerceBlockedCopy: "WooCommerce 写入已阻止"
    });
    await assertEditorControlsStayWithinPanel(mobileEditor, "mobile Chinese asset workspace");
    await mobileAssetPage.screenshot({ fullPage: true, path: mobileAssetEditorScreenshotPath });
    assertScreenshotArtifact(mobileAssetEditorScreenshotPath, "mobile Chinese local asset editor");
    const mobileAssetPatchRequests = mobileAssetRequests.filter(
      (request) => request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_mobile`)
    );
    assert(
      mobileAssetPatchRequests.length === 1,
      `Mobile local asset editor must issue exactly one safe asset PATCH, got ${JSON.stringify(mobileAssetRequests)}`
    );
    await mobileAssetPage.close();

    const failedSaveAssetPage = await context.newPage();
    const failedSaveAssetRequests = [];
    failedSaveAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        failedSaveAssetRequests.push({ method: request.method(), url });
      }
    });
    await failedSaveAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_failed_save",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_failed_save",
                title: "Local asset patch failure candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await failedSaveAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_failed_save`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          contentType: "application/json",
          status: 500,
          body: JSON.stringify({ detail: "local save fixture failure" })
        });
        return;
      }

      await route.continue();
    });
    await failedSaveAssetPage.goto(webUrl);
    await clickUnique(failedSaveAssetPage.getByRole("button", { name: "EN" }), "failed save asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(failedSaveAssetPage, 1, "failed save asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_failed_save",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Local asset patch failure candidate"
      }
    ]);
    await assertLocalAssetEditorSaveFailure(failedSaveAssetPage, "failed save asset workspace");
    const failedSavePatchRequests = failedSaveAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_failed_save`)
    );
    assert(
      failedSavePatchRequests.length === 1,
      `Failed local save should issue exactly one local PATCH, got ${JSON.stringify(failedSaveAssetRequests)}`
    );
    const unsafeFailedSaveRequests = failedSaveAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_failed_save`))
    );
    assert(
      unsafeFailedSaveRequests.length === 0,
      `Failed local save issued unsafe requests: ${JSON.stringify(unsafeFailedSaveRequests)}`
    );
    await failedSaveAssetPage.close();

    const retrySaveAssetPage = await context.newPage();
    const retrySaveAssetRequests = [];
    let retrySavePatchAttempts = 0;
    retrySaveAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        retrySaveAssetRequests.push({ method: request.method(), url });
      }
    });
    await retrySaveAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_retry_save",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_retry_save",
                title: "Retry patch recovery candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await retrySaveAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_retry_save`, async (route) => {
      if (route.request().method() === "PATCH") {
        retrySavePatchAttempts += 1;
        if (retrySavePatchAttempts === 1) {
          await route.fulfill({
            contentType: "application/json",
            status: 500,
            body: JSON.stringify({ detail: "first local save fixture failure" })
          });
          return;
        }

        const payload = route.request().postDataJSON();
        assert(payload.title === "Recovered local save test", "Retry asset PATCH must send the edited title");
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_retry_save",
              qa_checks: [{ key: "seo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_retry_save",
              title: "Recovered local save test"
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await retrySaveAssetPage.goto(webUrl);
    await clickUnique(retrySaveAssetPage.getByRole("button", { name: "EN" }), "retry save asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(retrySaveAssetPage, 1, "retry save asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_retry_save",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Retry patch recovery candidate"
      }
    ]);
    await assertLocalAssetEditorRetryAfterFailure(retrySaveAssetPage, "retry save asset workspace");
    const retrySavePatchRequests = retrySaveAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_retry_save`)
    );
    assert(
      retrySavePatchRequests.length === 2,
      `Retry local save should issue exactly two local PATCH requests, got ${JSON.stringify(retrySaveAssetRequests)}`
    );
    const unsafeRetrySaveRequests = retrySaveAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_retry_save`))
    );
    assert(
      unsafeRetrySaveRequests.length === 0,
      `Retry local save issued unsafe requests: ${JSON.stringify(unsafeRetrySaveRequests)}`
    );
    await retrySaveAssetPage.close();

    const closeOnlyAssetPage = await context.newPage();
    const closeOnlyAssetRequests = [];
    closeOnlyAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        closeOnlyAssetRequests.push({ method: request.method(), url });
      }
    });
    await closeOnlyAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_close_only",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_close_only",
                title: "Close-only local draft candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await closeOnlyAssetPage.goto(webUrl);
    await clickUnique(closeOnlyAssetPage.getByRole("button", { name: "EN" }), "close-only asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(closeOnlyAssetPage, 1, "close-only asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_close_only",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Close-only local draft candidate"
      }
    ]);
    await assertLocalAssetEditorCloseWithoutWrite(closeOnlyAssetPage, "close-only asset workspace");
    const closeOnlyWriteRequests = closeOnlyAssetRequests.filter((request) => request.method !== "GET");
    assert(
      closeOnlyWriteRequests.length === 0,
      `Closing local editor issued unsafe asset write requests: ${JSON.stringify(closeOnlyWriteRequests)}`
    );
    await closeOnlyAssetPage.close();

    const resetLocalAssetPage = await context.newPage();
    const resetLocalAssetRequests = [];
    const resetLocalAssetTitle = "Reset local draft candidate";
    resetLocalAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        resetLocalAssetRequests.push({ method: request.method(), url });
      }
    });
    await resetLocalAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_reset_local",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_reset_local",
                title: resetLocalAssetTitle
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await resetLocalAssetPage.goto(webUrl);
    await clickUnique(resetLocalAssetPage.getByRole("button", { name: "EN" }), "reset local asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(resetLocalAssetPage, 1, "reset local asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_reset_local",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: resetLocalAssetTitle
      }
    ]);
    await assertLocalAssetEditorResetLocalChanges(
      resetLocalAssetPage,
      "reset local asset workspace",
      resetLocalAssetTitle
    );
    const resetLocalWriteRequests = resetLocalAssetRequests.filter((request) => request.method !== "GET");
    assert(
      resetLocalWriteRequests.length === 0,
      `Resetting local editor changes issued unsafe asset write requests: ${JSON.stringify(resetLocalWriteRequests)}`
    );
    await resetLocalAssetPage.close();

    const reopenResetAssetPage = await context.newPage();
    const reopenResetAssetRequests = [];
    const reopenResetAssetTitle = "Reopen reset local draft candidate";
    reopenResetAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        reopenResetAssetRequests.push({ method: request.method(), url });
      }
    });
    await reopenResetAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_reopen_reset",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_reopen_reset",
                title: reopenResetAssetTitle
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await reopenResetAssetPage.goto(webUrl);
    await clickUnique(reopenResetAssetPage.getByRole("button", { name: "EN" }), "reopen reset asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(reopenResetAssetPage, 1, "reopen reset asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_reopen_reset",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: reopenResetAssetTitle
      }
    ]);
    await assertLocalAssetEditorReopenResetsAfterClose(
      reopenResetAssetPage,
      "reopen reset asset workspace",
      reopenResetAssetTitle
    );
    const reopenResetWriteRequests = reopenResetAssetRequests.filter((request) => request.method !== "GET");
    assert(
      reopenResetWriteRequests.length === 0,
      `Reopening local editor after close issued unsafe asset write requests: ${JSON.stringify(reopenResetWriteRequests)}`
    );
    await reopenResetAssetPage.close();

    const closeFailedAssetPage = await context.newPage();
    const closeFailedAssetRequests = [];
    closeFailedAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        closeFailedAssetRequests.push({ method: request.method(), url });
      }
    });
    await closeFailedAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_close_failed",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_close_failed",
                title: "Close failed patch candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await closeFailedAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_close_failed`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          contentType: "application/json",
          status: 500,
          body: JSON.stringify({ detail: "close failed local save fixture failure" })
        });
        return;
      }

      await route.continue();
    });
    await closeFailedAssetPage.goto(webUrl);
    await clickUnique(closeFailedAssetPage.getByRole("button", { name: "EN" }), "close failed asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(closeFailedAssetPage, 1, "close failed asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_close_failed",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Close failed patch candidate"
      }
    ]);
    await assertLocalAssetEditorCloseAfterFailedSaveClearsFeedback(
      closeFailedAssetPage,
      "close failed asset workspace"
    );
    const closeFailedPatchRequests = closeFailedAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_close_failed`)
    );
    assert(
      closeFailedPatchRequests.length === 1,
      `Close-after-failed-save should issue exactly one local PATCH, got ${JSON.stringify(closeFailedAssetRequests)}`
    );
    const unsafeCloseFailedRequests = closeFailedAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_close_failed`))
    );
    assert(
      unsafeCloseFailedRequests.length === 0,
      `Close-after-failed-save issued unsafe requests: ${JSON.stringify(unsafeCloseFailedRequests)}`
    );
    await closeFailedAssetPage.close();

    const closeSuccessAssetPage = await context.newPage();
    const closeSuccessAssetRequests = [];
    const closeSuccessSavedTitle = "Close success saved local title";
    closeSuccessAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        closeSuccessAssetRequests.push({ method: request.method(), url });
      }
    });
    await closeSuccessAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_close_success",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_close_success",
                title: "Close success candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await closeSuccessAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_close_success`, async (route) => {
      if (route.request().method() === "PATCH") {
        const payload = route.request().postDataJSON();
        assert(payload.title === closeSuccessSavedTitle, "Close-success asset PATCH must send edited title");
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_close_success",
              qa_checks: [{ key: "seo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_close_success",
              title: closeSuccessSavedTitle
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await closeSuccessAssetPage.goto(webUrl);
    await clickUnique(closeSuccessAssetPage.getByRole("button", { name: "EN" }), "close success asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(closeSuccessAssetPage, 1, "close success asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_close_success",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Close success candidate"
      }
    ]);
    await assertLocalAssetEditorCloseAfterSuccessClearsFeedback(
      closeSuccessAssetPage,
      "close success asset workspace",
      closeSuccessSavedTitle
    );
    const closeSuccessPatchRequests = closeSuccessAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_close_success`)
    );
    assert(
      closeSuccessPatchRequests.length === 1,
      `Close-after-success should issue exactly one local PATCH, got ${JSON.stringify(closeSuccessAssetRequests)}`
    );
    const unsafeCloseSuccessRequests = closeSuccessAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_close_success`))
    );
    assert(
      unsafeCloseSuccessRequests.length === 0,
      `Close-after-success issued unsafe requests: ${JSON.stringify(unsafeCloseSuccessRequests)}`
    );
    await closeSuccessAssetPage.close();

    const reopenButtonAssetPage = await context.newPage();
    const reopenButtonAssetRequests = [];
    reopenButtonAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        reopenButtonAssetRequests.push({ method: request.method(), url });
      }
    });
    await reopenButtonAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_reopen_button",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_reopen_button",
                title: "Reopen button state candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await reopenButtonAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_reopen_button`, async (route) => {
      if (route.request().method() === "PATCH") {
        await delay(1_000);
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_reopen_button",
              qa_checks: [{ key: "seo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_reopen_button",
              title: "Pending close local title"
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await reopenButtonAssetPage.goto(webUrl);
    await clickUnique(reopenButtonAssetPage.getByRole("button", { name: "EN" }), "reopen button asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(reopenButtonAssetPage, 1, "reopen button asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_reopen_button",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Reopen button state candidate"
      }
    ]);
    await assertLocalAssetEditorReopenHasEnabledSaveButton(reopenButtonAssetPage, "reopen button asset workspace");
    const reopenButtonPatchRequests = reopenButtonAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_reopen_button`)
    );
    assert(
      reopenButtonPatchRequests.length === 1,
      `Reopen button state should issue exactly one local PATCH, got ${JSON.stringify(reopenButtonAssetRequests)}`
    );
    const unsafeReopenButtonRequests = reopenButtonAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_reopen_button`))
    );
    assert(
      unsafeReopenButtonRequests.length === 0,
      `Reopen button state issued unsafe requests: ${JSON.stringify(unsafeReopenButtonRequests)}`
    );
    await reopenButtonAssetPage.close();

    const delayedResponseAssetPage = await context.newPage();
    const delayedResponseAssetRequests = [];
    delayedResponseAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        delayedResponseAssetRequests.push({ method: request.method(), url });
      }
    });
    await delayedResponseAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_delayed_response",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_delayed_response",
                title: "Delayed response candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await delayedResponseAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_delayed_response`, async (route) => {
      if (route.request().method() === "PATCH") {
        await delay(500);
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_delayed_response",
              qa_checks: [{ key: "seo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_delayed_response",
              title: "Delayed close local title"
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await delayedResponseAssetPage.goto(webUrl);
    await clickUnique(delayedResponseAssetPage.getByRole("button", { name: "EN" }), "delayed response asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(delayedResponseAssetPage, 1, "delayed response asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_delayed_response",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Delayed response candidate"
      }
    ]);
    await assertLocalAssetEditorDelayedResponseDoesNotRepaintFeedback(
      delayedResponseAssetPage,
      "delayed response asset workspace"
    );
    const delayedResponsePatchRequests = delayedResponseAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_delayed_response`)
    );
    assert(
      delayedResponsePatchRequests.length === 1,
      `Delayed response should issue exactly one local PATCH, got ${JSON.stringify(delayedResponseAssetRequests)}`
    );
    const unsafeDelayedResponseRequests = delayedResponseAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_delayed_response`))
    );
    assert(
      unsafeDelayedResponseRequests.length === 0,
      `Delayed response issued unsafe requests: ${JSON.stringify(unsafeDelayedResponseRequests)}`
    );
    await delayedResponseAssetPage.close();

    const delayedFailureAssetPage = await context.newPage();
    const delayedFailureAssetRequests = [];
    delayedFailureAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        delayedFailureAssetRequests.push({ method: request.method(), url });
      }
    });
    await delayedFailureAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_delayed_failure",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_delayed_failure",
                title: "Delayed failure candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await delayedFailureAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_delayed_failure`, async (route) => {
      if (route.request().method() === "PATCH") {
        await delay(500);
        await route.fulfill({
          contentType: "application/json",
          status: 500,
          body: JSON.stringify({ detail: "delayed local save failure fixture" })
        });
        return;
      }

      await route.continue();
    });
    await delayedFailureAssetPage.goto(webUrl);
    await clickUnique(delayedFailureAssetPage.getByRole("button", { name: "EN" }), "delayed failure asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(delayedFailureAssetPage, 1, "delayed failure asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_delayed_failure",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Delayed failure candidate"
      }
    ]);
    await assertLocalAssetEditorDelayedResponseDoesNotRepaintFeedback(
      delayedFailureAssetPage,
      "delayed failure asset workspace"
    );
    const delayedFailurePatchRequests = delayedFailureAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_delayed_failure`)
    );
    assert(
      delayedFailurePatchRequests.length === 1,
      `Delayed failure should issue exactly one local PATCH, got ${JSON.stringify(delayedFailureAssetRequests)}`
    );
    const unsafeDelayedFailureRequests = delayedFailureAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_delayed_failure`))
    );
    assert(
      unsafeDelayedFailureRequests.length === 0,
      `Delayed failure issued unsafe requests: ${JSON.stringify(unsafeDelayedFailureRequests)}`
    );
    await delayedFailureAssetPage.close();

    const crossAssetPage = await context.newPage();
    const crossAssetRequests = [];
    crossAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        crossAssetRequests.push({ method: request.method(), url });
      }
    });
    await crossAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_cross_first",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_cross_first",
                title: "Cross asset first candidate"
              },
              {
                asset_type: "buying_guide",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "faq" }],
                external_write_allowed: false,
                id: "asset_task_cross_second",
                qa_checks: [{ key: "geo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_cross_second",
                title: "Cross asset second candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 2, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await crossAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_cross_first`, async (route) => {
      if (route.request().method() === "PATCH") {
        await delay(500);
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_cross_first",
              qa_checks: [{ key: "seo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_cross_first",
              title: "First asset delayed save title"
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await crossAssetPage.goto(webUrl);
    await clickUnique(crossAssetPage.getByRole("button", { name: "EN" }), "cross asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(crossAssetPage, 2, "cross asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_cross_first",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Cross asset first candidate"
      },
      {
        contentBlockCount: 1,
        contentBlockTypes: ["faq"],
        id: "asset_task_cross_second",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Cross asset second candidate"
      }
    ]);
    await assertLocalAssetEditorCrossAssetFeedbackIsolation(crossAssetPage, "cross asset workspace", {
      firstAssetId: "asset_task_cross_first",
      secondAssetId: "asset_task_cross_second",
      secondTitle: "Cross asset second candidate"
    });
    const crossAssetPatchRequests = crossAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_cross_first`)
    );
    assert(
      crossAssetPatchRequests.length === 1,
      `Cross-asset isolation should issue exactly one local PATCH, got ${JSON.stringify(crossAssetRequests)}`
    );
    const unsafeCrossAssetRequests = crossAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_cross_first`))
    );
    assert(
      unsafeCrossAssetRequests.length === 0,
      `Cross-asset isolation issued unsafe requests: ${JSON.stringify(unsafeCrossAssetRequests)}`
    );
    await crossAssetPage.close();

    const secondAssetSavePage = await context.newPage();
    const secondAssetSaveRequests = [];
    const secondAssetSavedTitle = "Second asset isolated local save title";
    secondAssetSavePage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        secondAssetSaveRequests.push({ method: request.method(), url });
      }
    });
    await secondAssetSavePage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_second_save_first",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_second_save_first",
                title: "Isolation first candidate"
              },
              {
                asset_type: "buying_guide",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "faq" }],
                external_write_allowed: false,
                id: "asset_task_second_save_second",
                qa_checks: [{ key: "geo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_second_save_second",
                title: "Isolation target candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 2, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await secondAssetSavePage.route(`**/api/stores/${storeId}/assets/asset_task_second_save_first`, async (route) => {
      if (route.request().method() === "PATCH") {
        await delay(500);
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_second_save_first",
              qa_checks: [{ key: "seo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_second_save_first",
              title: "First asset delayed save before second save"
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await secondAssetSavePage.route(`**/api/stores/${storeId}/assets/asset_task_second_save_second`, async (route) => {
      if (route.request().method() === "PATCH") {
        const payload = route.request().postDataJSON();
        assert(payload.title === secondAssetSavedTitle, "Second asset PATCH must send edited second asset title");
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "buying_guide",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_second_save_second",
              qa_checks: [{ key: "geo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_second_save_second",
              title: secondAssetSavedTitle
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await secondAssetSavePage.goto(webUrl);
    await clickUnique(secondAssetSavePage.getByRole("button", { name: "EN" }), "second asset save language switcher");
    await assertAssetWorkspacePanelIsReadOnly(secondAssetSavePage, 2, "second asset save workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_second_save_first",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Isolation first candidate"
      },
      {
        contentBlockCount: 1,
        contentBlockTypes: ["faq"],
        id: "asset_task_second_save_second",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Isolation target candidate"
      }
    ]);
    await assertLocalAssetEditorSecondAssetSaveIsolation(secondAssetSavePage, "second asset save workspace", {
      firstAssetId: "asset_task_second_save_first",
      secondAssetId: "asset_task_second_save_second",
      secondSavedTitle: secondAssetSavedTitle,
      secondTitle: "Isolation target candidate"
    });
    const secondAssetFirstPatchRequests = secondAssetSaveRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_second_save_first`)
    );
    const secondAssetSecondPatchRequests = secondAssetSaveRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_second_save_second`)
    );
    assert(
      secondAssetFirstPatchRequests.length === 1,
      `Second-asset isolation should issue one first asset PATCH, got ${JSON.stringify(secondAssetSaveRequests)}`
    );
    assert(
      secondAssetSecondPatchRequests.length === 1,
      `Second-asset isolation should issue one second asset PATCH, got ${JSON.stringify(secondAssetSaveRequests)}`
    );
    const unsafeSecondAssetSaveRequests = secondAssetSaveRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(
          request.method === "PATCH" &&
          (request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_second_save_first`) ||
            request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_second_save_second`))
        )
    );
    assert(
      unsafeSecondAssetSaveRequests.length === 0,
      `Second-asset isolation issued unsafe requests: ${JSON.stringify(unsafeSecondAssetSaveRequests)}`
    );
    await secondAssetSavePage.close();

    const doubleSubmitAssetPage = await context.newPage();
    const doubleSubmitAssetRequests = [];
    doubleSubmitAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        doubleSubmitAssetRequests.push({ method: request.method(), url });
      }
    });
    await doubleSubmitAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_double_submit",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_double_submit",
                title: "Double submit candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await doubleSubmitAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_double_submit`, async (route) => {
      if (route.request().method() === "PATCH") {
        await delay(500);
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_double_submit",
              qa_checks: [{ key: "seo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_double_submit",
              title: "Double submit local title"
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await doubleSubmitAssetPage.goto(webUrl);
    await clickUnique(doubleSubmitAssetPage.getByRole("button", { name: "EN" }), "double submit asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(doubleSubmitAssetPage, 1, "double submit asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_double_submit",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Double submit candidate"
      }
    ]);
    await assertLocalAssetEditorSameAssetDoubleSubmitBlocked(doubleSubmitAssetPage, "double submit asset workspace");
    const doubleSubmitPatchRequests = doubleSubmitAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_double_submit`)
    );
    assert(
      doubleSubmitPatchRequests.length === 1,
      `Double-submit guard should issue exactly one local PATCH, got ${JSON.stringify(doubleSubmitAssetRequests)}`
    );
    const unsafeDoubleSubmitRequests = doubleSubmitAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_double_submit`))
    );
    assert(
      unsafeDoubleSubmitRequests.length === 0,
      `Double-submit guard issued unsafe requests: ${JSON.stringify(unsafeDoubleSubmitRequests)}`
    );
    await doubleSubmitAssetPage.close();

    const pendingCloseAssetPage = await context.newPage();
    const pendingCloseAssetRequests = [];
    pendingCloseAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        pendingCloseAssetRequests.push({ method: request.method(), url });
      }
    });
    await pendingCloseAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_pending_close",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_pending_close",
                title: "Pending close candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await pendingCloseAssetPage.route(`**/api/stores/${storeId}/assets/asset_task_pending_close`, async (route) => {
      if (route.request().method() === "PATCH") {
        await delay(500);
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            asset: {
              asset_type: "collection_page",
              blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
              content_blocks: [{ type: "section" }],
              external_write_allowed: false,
              id: "asset_task_pending_close",
              qa_checks: [{ key: "seo", status: "pending" }],
              review_state: "draft_candidate",
              source_task_id: "task_pending_close",
              title: "Pending close duplicate guard title"
            },
            mode: "asset_draft_workspace",
            store_id: storeId
          })
        });
        return;
      }

      await route.continue();
    });
    await pendingCloseAssetPage.goto(webUrl);
    await clickUnique(pendingCloseAssetPage.getByRole("button", { name: "EN" }), "pending close asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(pendingCloseAssetPage, 1, "pending close asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_pending_close",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Pending close candidate"
      }
    ]);
    await assertLocalAssetEditorPendingCloseDoesNotDuplicateRequest(pendingCloseAssetPage, "pending close asset workspace");
    const pendingClosePatchRequests = pendingCloseAssetRequests.filter(
      (request) =>
        request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_pending_close`)
    );
    assert(
      pendingClosePatchRequests.length === 1,
      `Pending close should issue exactly one local PATCH, got ${JSON.stringify(pendingCloseAssetRequests)}`
    );
    const unsafePendingCloseRequests = pendingCloseAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(request.method === "PATCH" && request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_pending_close`))
    );
    assert(
      unsafePendingCloseRequests.length === 0,
      `Pending close issued unsafe requests: ${JSON.stringify(unsafePendingCloseRequests)}`
    );
    await pendingCloseAssetPage.close();

    const pendingCloseStaleAssetPage = await context.newPage();
    const pendingCloseStaleAssetRequests = [];
    pendingCloseStaleAssetPage.on("request", (request) => {
      const url = request.url();
      if (url.includes(`/api/stores/${storeId}/assets`)) {
        pendingCloseStaleAssetRequests.push({ method: request.method(), url });
      }
    });
    await pendingCloseStaleAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_pending_close_stale",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_pending_close_stale",
                title: "Pending close stale feedback candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await pendingCloseStaleAssetPage.route(
      `**/api/stores/${storeId}/assets/asset_task_pending_close_stale`,
      async (route) => {
        if (route.request().method() === "PATCH") {
          await delay(500);
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              asset: {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "section" }],
                external_write_allowed: false,
                id: "asset_task_pending_close_stale",
                qa_checks: [{ key: "seo", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_pending_close_stale",
                title: "Pending close stale feedback title"
              },
              mode: "asset_draft_workspace",
              store_id: storeId
            })
          });
          return;
        }

        await route.continue();
      }
    );
    await pendingCloseStaleAssetPage.goto(webUrl);
    await clickUnique(
      pendingCloseStaleAssetPage.getByRole("button", { name: "EN" }),
      "pending close stale asset language switcher"
    );
    await assertAssetWorkspacePanelIsReadOnly(pendingCloseStaleAssetPage, 1, "pending close stale asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_pending_close_stale",
        qaCheckCount: 1,
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "Pending close stale feedback candidate"
      }
    ]);
    await assertLocalAssetEditorPendingCloseReopensNeutralAfterResponse(
      pendingCloseStaleAssetPage,
      "pending close stale asset workspace"
    );
    const pendingCloseStalePatchRequests = pendingCloseStaleAssetRequests.filter(
      (request) =>
        request.method === "PATCH" &&
        request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_pending_close_stale`)
    );
    assert(
      pendingCloseStalePatchRequests.length === 1,
      `Pending close stale feedback should issue exactly one local PATCH, got ${JSON.stringify(
        pendingCloseStaleAssetRequests
      )}`
    );
    const unsafePendingCloseStaleRequests = pendingCloseStaleAssetRequests.filter(
      (request) =>
        request.method !== "GET" &&
        !(
          request.method === "PATCH" &&
          request.url.endsWith(`/api/stores/${storeId}/assets/asset_task_pending_close_stale`)
        )
    );
    assert(
      unsafePendingCloseStaleRequests.length === 0,
      `Pending close stale feedback issued unsafe requests: ${JSON.stringify(unsafePendingCloseStaleRequests)}`
    );
    await pendingCloseStaleAssetPage.close();

    const qaClearAssetPage = await context.newPage();
    await qaClearAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "answer_summary" }],
                external_write_allowed: false,
                id: "asset_task_qa_clear",
                qa_checks: [
                  { key: "seo", status: "passed" },
                  { key: "geo", status: "passed" },
                  {
                    credential_hint: "token-password-secret",
                    key: "oauth_token",
                    metadata: { api_key: "unsafe-api-key" },
                    status: "published"
                  }
                ],
                review_state: "draft_candidate",
                source_task_id: "task_qa_clear",
                title: "QA clear collection page"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await qaClearAssetPage.goto(webUrl);
    await clickUnique(qaClearAssetPage.getByRole("button", { name: "EN" }), "QA clear asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(qaClearAssetPage, 1, "QA clear asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["answer_summary"],
        id: "asset_task_qa_clear",
        qaCheckCount: 3,
        qaDetails: [
          { key: "seo", status: "passed" },
          { key: "geo", status: "passed" },
          { key: "local_review", status: "pending" }
        ],
        qaPendingCount: 1,
        reviewState: "draft_candidate",
        title: "QA clear collection page"
      }
    ]);
    await assertAssetWorkspaceQaSummary(qaClearAssetPage, 3, 1, "QA clamped asset workspace");
    await assertAssetWorkspaceQaReadiness(qaClearAssetPage, "pending_qa", 1, 3, "QA clamped asset workspace");
    await qaClearAssetPage.close();

    const noQaAssetPage = await context.newPage();
    await noQaAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "product_seo",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "metadata_only" }],
                external_write_allowed: false,
                id: "asset_task_no_qa",
                review_state: "draft_candidate",
                source_task_id: "task_no_qa",
                title: "No QA product SEO candidate"
              }
            ],
            blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
            external_write_allowed: false,
            mode: "asset_draft_workspace",
            store_id: storeId,
            summary: { asset_drafts: 1, ready_for_wordpress_draft: 0 }
          })
        });
        return;
      }

      await route.continue();
    });
    await noQaAssetPage.goto(webUrl);
    await clickUnique(noQaAssetPage.getByRole("button", { name: "EN" }), "No-QA asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(noQaAssetPage, 1, "No-QA asset workspace", [
      {
        contentBlockCount: 1,
        contentBlockTypes: ["metadata_only"],
        id: "asset_task_no_qa",
        reviewState: "draft_candidate",
        title: "No QA product SEO candidate"
      }
    ]);
    await assertAssetWorkspaceNoQaChecks(noQaAssetPage, "No-QA asset workspace");
    await noQaAssetPage.close();

    const assetFailurePage = await context.newPage();
    await assetFailurePage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });
    await assetFailurePage.goto(webUrl);
    await clickUnique(assetFailurePage.getByRole("button", { name: "EN" }), "asset failure language switcher");
    await expectVisible(assetFailurePage.getByText("Demo API connected"), "asset failure API board remains connected");
    await expectVisible(assetFailurePage.getByText("read-only imported previews"), "asset failure imported preview remains available");
    await assertAssetWorkspacePanelUnavailable(assetFailurePage, "asset-only failure");
    await assertTrackedAssetMetricReconciles(assetFailurePage, 0, "asset-only failure");
    await assertAssetWorkspaceBlockedCapabilities(assetFailurePage, ["asset_workspace_unavailable"], "asset-only failure");
    await assertAssetWorkspaceUnavailableQaReadiness(assetFailurePage, "asset-only failure");
    await assertWordPressDraftReadinessUnavailable(assetFailurePage, "asset-only failure");
    await assertAssetExternalWriteClampReconciles(assetFailurePage, "asset-only failure");
    await assetFailurePage.close();

    await assertImportedPreviewPanelIsReadOnly(page, "initial");
    await assertImportedPreviewState(page, "ready", 0, "initial");
    await assertImportedPreviewSectionCounts(
      page,
      { availableCount: 6, emptyCount: 0, sectionCount: 6, unavailableCount: 0 },
      "initial"
    );
    await assertImportedPreviewSectionHealthSummary(
      page,
      { available: 6, empty: 0, state: "ready", unavailable: 0 },
      "initial"
    );
    await assertImportedPreviewSectionHealthSummaryColor(page, "rgb(27, 27, 29)", "initial");
    await assertImportedPreviewSectionHealth(
      page,
      {
        graph_clusters: "available",
        opportunities: "available",
        pages: "available",
        products: "available",
        query_rows: "available",
        task_previews: "available"
      },
      "initial"
    );
    await assertImportedPreviewSectionHealthCounts(
      page,
      {
        graph_clusters: 4,
        opportunities: 4,
        pages: 3,
        products: 3,
        query_rows: 5,
        task_previews: 4
      },
      "initial"
    );
    await assertImportedPreviewSectionHealthSources(
      page,
      {
        graph_clusters: "Imported graph",
        opportunities: "Opportunity previews",
        pages: "WordPress import",
        products: "WooCommerce import",
        query_rows: "GSC CSV",
        task_previews: "Task previews"
      },
      "initial"
    );
    await assertImportedPreviewWarningKeys(page, [], "initial");
    await assertImportedPreviewMetricValues(
      page,
      {
        catalog_pages: 3,
        catalog_products: 3,
        graph_clusters: 4,
        matched_pages: 3,
        matched_products: 5,
        buying_guide_gap_opportunities: 1,
        buying_guide_gap_task_previews: 1,
        buying_guide_opportunities: 1,
        buying_guide_task_previews: 1,
        collection_page_opportunities: 0,
        collection_page_task_previews: 0,
        ctr_refresh_opportunities: 3,
        ctr_refresh_task_previews: 3,
        ranking_push_opportunities: 0,
        ranking_push_task_previews: 0,
        recommend_only_task_previews: 4,
        new_task_previews: 4,
        new_opportunity_previews: 4,
        opportunity_previews: 4,
        product_seo_opportunities: 0,
        product_seo_task_previews: 0,
        query_rows: 5,
        task_previews: 4
      },
      "initial"
    );
    await assertImportedPreviewMetricTexts(
      page,
      {
        buying_guide_gap_opportunity_share: "25%",
        buying_guide_gap_task_share: "25%",
        collection_page_opportunity_share: "0%",
        collection_page_task_share: "0%",
        ctr_refresh_opportunity_share: "75%",
        ctr_refresh_task_share: "75%",
        new_task_share: "100%",
        new_opportunity_share: "100%",
        product_seo_opportunity_share: "0%",
        product_seo_task_share: "0%",
        ranking_push_opportunity_share: "0%",
        ranking_push_task_share: "0%",
        recommend_only_task_share: "100%"
      },
      "initial"
    );
    await assertImportedPreviewMetricShareDiagnostics(
      page,
      {
        buying_guide_gap_opportunity_share: { count: 1, percent: 25, total: 4 },
        buying_guide_gap_task_share: { count: 1, percent: 25, total: 4 },
        collection_page_opportunity_share: { count: 0, percent: 0, total: 4 },
        collection_page_task_share: { count: 0, percent: 0, total: 4 },
        ctr_refresh_opportunity_share: { count: 3, percent: 75, total: 4 },
        ctr_refresh_task_share: { count: 3, percent: 75, total: 4 },
        new_task_share: { count: 4, percent: 100, total: 4 },
        new_opportunity_share: { count: 4, percent: 100, total: 4 },
        product_seo_opportunity_share: { count: 0, percent: 0, total: 4 },
        product_seo_task_share: { count: 0, percent: 0, total: 4 },
        ranking_push_opportunity_share: { count: 0, percent: 0, total: 4 },
        ranking_push_task_share: { count: 0, percent: 0, total: 4 },
        recommend_only_task_share: { count: 4, percent: 100, total: 4 }
      },
      "initial"
    );
    await assertImportedActionMixSummary(
      page,
      { state: "concentrated", total: 8, topKey: "ctr_refresh", topCount: 6, topShare: 75 },
      "initial"
    );
    await assertImportedActionMixSummaryColor(page, "rgb(97, 32, 238)", "initial");
    await assertImportedActionMixRows(
      page,
      {
        buying_guide_gap: { count: 2, share: 25, total: 8 },
        collection_page: { count: 0, share: 0, total: 8 },
        ctr_refresh: { count: 6, share: 75, total: 8 },
        product_seo: { count: 0, share: 0, total: 8 },
        ranking_push: { count: 0, share: 0, total: 8 }
      },
      "initial"
    );
    await assertImportedPreviewOverflowValues(
      page,
      {
        catalog_pages: 1,
        catalog_products: 1,
        opportunity_previews: 2,
        query_clusters: 2,
        query_rows: 3,
        task_previews: 2
      },
      "initial"
    );
    await assertImportedPreviewItemKinds(
      page,
      {
        cluster: 2,
        opportunity: 2,
        page: 2,
        product: 2,
        query_row: 2,
        task_preview: 2
      },
      "initial"
    );
    await assertImportedPreviewReferenceValues(
      page,
      {
        page_display_url: ["example.com/camping-espresso", "example.com/camping-pour-over"],
        product_display_url: [
          "example.com/product/camp-kettle-pour-over-kit",
          "example.com/product/trail-brew-portable-espresso-maker"
        ],
        query_page: ["example.com/camping-espresso", "example.com/camping-pour-over"]
      },
      "initial"
    );
    await assertImportedPreviewSourceValues(
      page,
      {
        page_source: ["WordPress", "WordPress"],
        product_source: ["WooCommerce", "WooCommerce"],
        query_row_source: ["Imported GSC", "Imported GSC"]
      },
      "initial"
    );
    await assertImportedTaskPreviewSafetyValues(page, 2, "initial");
    await assertImportedOpportunityPreviewDiagnosticValues(page, 2, "initial");
    await assertImportedQueryClusterDiagnosticValues(page, 2, "initial");
    await assertImportedQueryRowDiagnosticValues(page, 2, "initial");
    await assertImportedCatalogCardDiagnosticValues(
      page,
      {
        page: ["Camping Espresso Collection", "Camping Pour Over Guide"],
        product: ["Camp Kettle Pour Over Kit", "Trail Brew Portable Espresso Maker"]
      },
      "initial"
    );
    await assertImportedVisibleRailCounts(
      page,
      {
        "data-visible-clusters": 2,
        "data-visible-opportunities": 2,
        "data-visible-pages": 2,
        "data-visible-products": 2,
        "data-visible-query-rows": 2,
        "data-visible-task-previews": 2
      },
      "initial"
    );
    await assertImportedTotalRailCounts(
      page,
      {
        "data-total-clusters": 4,
        "data-total-opportunities": 4,
        "data-total-pages": 3,
        "data-total-products": 3,
        "data-total-query-rows": 5,
        "data-total-task-previews": 4
      },
      "initial"
    );
    await assertImportedHiddenRailCounts(
      page,
      {
        "data-hidden-clusters": 2,
        "data-hidden-opportunities": 2,
        "data-hidden-pages": 1,
        "data-hidden-products": 1,
        "data-hidden-query-rows": 3,
        "data-hidden-task-previews": 2
      },
      "initial"
    );
    await assertImportedRailCountReconciliation(
      page,
      ["clusters", "opportunities", "pages", "products", "query-rows", "task-previews"],
      "initial"
    );

    const balancedMixPage = await context.newPage();
    await balancedMixPage.route("**/api/stores/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/imported-opportunities")) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            mode: "imported_opportunities",
            opportunities: [],
            store_id: storeId,
            summary: {
              by_rule: { buying_guide_gap: 1 },
              by_status: { new: 5 },
              by_task_type: {
                buying_guide: 0,
                collection_page: 1,
                ctr_refresh: 1,
                product_seo: 1,
                ranking_push: 1
              }
            }
          })
        });
        return;
      }
      if (url.endsWith("/imported-tasks")) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            mode: "imported_tasks",
            store_id: storeId,
            summary: {
              by_automation_level: { recommend_only: 5 },
              by_category: {
                buying_guide: 1,
                collection_page: 1,
                ctr_refresh: 1,
                product_seo: 1,
                ranking_push: 1
              },
              by_rule: { buying_guide_gap: 1 },
              by_status: { new: 5 }
            },
            tasks: []
          })
        });
        return;
      }

      await route.continue();
    });
    await balancedMixPage.goto(webUrl);
    await clickUnique(balancedMixPage.getByRole("button", { name: "EN" }), "balanced mix language switcher");
    await assertImportedActionMixSummary(
      balancedMixPage,
      { state: "balanced", total: 10, topKey: "ctr_refresh", topCount: 2, topShare: 20 },
      "balanced mix"
    );
    await assertImportedActionMixSummaryColor(balancedMixPage, "rgb(27, 27, 29)", "balanced mix");
    await assertImportedActionMixRows(
      balancedMixPage,
      {
        buying_guide_gap: { count: 2, share: 20, total: 10 },
        collection_page: { count: 2, share: 20, total: 10 },
        ctr_refresh: { count: 2, share: 20, total: 10 },
        product_seo: { count: 2, share: 20, total: 10 },
        ranking_push: { count: 2, share: 20, total: 10 }
      },
      "balanced mix"
    );
    await balancedMixPage.close();

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
    await expectVisible(resilientPage.getByText("6 imported sections unavailable"), "resilient imported unavailable count");
    await expectVisible(resilientPage.getByText("Graph reads unavailable"), "resilient graph unavailable message");
    await expectVisible(resilientPage.getByText("Query rows unavailable"), "resilient query rows unavailable message");
    await expectVisible(resilientPage.getByText("Catalog reads unavailable"), "resilient catalog unavailable message");
    await expectVisible(
      resilientPage.getByText("Opportunity previews unavailable"),
      "resilient opportunity unavailable message"
    );
    await expectVisible(resilientPage.getByText("Task previews unavailable"), "resilient task unavailable message");
    await assertImportedPreviewPanelIsReadOnly(resilientPage, "resilient fallback");
    await assertImportedPreviewState(resilientPage, "unavailable", 5, "resilient fallback");
    await assertImportedPreviewSectionCounts(
      resilientPage,
      { availableCount: 0, emptyCount: 0, sectionCount: 6, unavailableCount: 6 },
      "resilient fallback"
    );
    await assertImportedPreviewSectionHealthSummary(
      resilientPage,
      { available: 0, empty: 0, state: "degraded", unavailable: 6 },
      "resilient fallback"
    );
    await assertImportedPreviewSectionHealthSummaryColor(resilientPage, "rgb(239, 68, 68)", "resilient fallback");
    await assertImportedPreviewSectionHealth(
      resilientPage,
      {
        graph_clusters: "unavailable",
        opportunities: "unavailable",
        pages: "unavailable",
        products: "unavailable",
        query_rows: "unavailable",
        task_previews: "unavailable"
      },
      "resilient fallback"
    );
    await assertImportedPreviewSectionHealthCounts(
      resilientPage,
      {
        graph_clusters: 0,
        opportunities: 0,
        pages: 0,
        products: 0,
        query_rows: 0,
        task_previews: 0
      },
      "resilient fallback"
    );
    await assertImportedPreviewSectionHealthSources(
      resilientPage,
      {
        graph_clusters: "Imported graph",
        opportunities: "Opportunity previews",
        pages: "WordPress import",
        products: "WooCommerce import",
        query_rows: "GSC CSV",
        task_previews: "Task previews"
      },
      "resilient fallback"
    );
    await assertImportedPreviewMetricValues(
      resilientPage,
      {
        catalog_pages: 0,
        catalog_products: 0,
        graph_clusters: 0,
        matched_pages: 0,
        matched_products: 0,
        buying_guide_gap_opportunities: 0,
        buying_guide_gap_task_previews: 0,
        buying_guide_opportunities: 0,
        buying_guide_task_previews: 0,
        collection_page_opportunities: 0,
        collection_page_task_previews: 0,
        ctr_refresh_opportunities: 0,
        ctr_refresh_task_previews: 0,
        ranking_push_opportunities: 0,
        ranking_push_task_previews: 0,
        recommend_only_task_previews: 0,
        new_task_previews: 0,
        new_opportunity_previews: 0,
        opportunity_previews: 0,
        product_seo_opportunities: 0,
        product_seo_task_previews: 0,
        query_rows: 0,
        task_previews: 0
      },
      "resilient fallback"
    );
    await assertImportedPreviewMetricTexts(
      resilientPage,
      {
        buying_guide_gap_opportunity_share: "0%",
        buying_guide_gap_task_share: "0%",
        collection_page_opportunity_share: "0%",
        collection_page_task_share: "0%",
        ctr_refresh_opportunity_share: "0%",
        ctr_refresh_task_share: "0%",
        new_task_share: "0%",
        new_opportunity_share: "0%",
        product_seo_opportunity_share: "0%",
        product_seo_task_share: "0%",
        ranking_push_opportunity_share: "0%",
        ranking_push_task_share: "0%",
        recommend_only_task_share: "0%"
      },
      "resilient fallback"
    );
    await assertImportedPreviewMetricShareDiagnostics(
      resilientPage,
      {
        buying_guide_gap_opportunity_share: { count: 0, percent: 0, total: 0 },
        buying_guide_gap_task_share: { count: 0, percent: 0, total: 0 },
        collection_page_opportunity_share: { count: 0, percent: 0, total: 0 },
        collection_page_task_share: { count: 0, percent: 0, total: 0 },
        ctr_refresh_opportunity_share: { count: 0, percent: 0, total: 0 },
        ctr_refresh_task_share: { count: 0, percent: 0, total: 0 },
        new_task_share: { count: 0, percent: 0, total: 0 },
        new_opportunity_share: { count: 0, percent: 0, total: 0 },
        product_seo_opportunity_share: { count: 0, percent: 0, total: 0 },
        product_seo_task_share: { count: 0, percent: 0, total: 0 },
        ranking_push_opportunity_share: { count: 0, percent: 0, total: 0 },
        ranking_push_task_share: { count: 0, percent: 0, total: 0 },
        recommend_only_task_share: { count: 0, percent: 0, total: 0 }
      },
      "resilient fallback"
    );
    await assertImportedActionMixSummary(
      resilientPage,
      { state: "empty", total: 0, topKey: "none", topCount: 0, topShare: 0 },
      "resilient fallback"
    );
    await assertImportedActionMixSummaryColor(resilientPage, "rgb(107, 107, 114)", "resilient fallback");
    await assertImportedActionMixRows(
      resilientPage,
      {
        buying_guide_gap: { count: 0, share: 0, total: 0 },
        collection_page: { count: 0, share: 0, total: 0 },
        ctr_refresh: { count: 0, share: 0, total: 0 },
        product_seo: { count: 0, share: 0, total: 0 },
        ranking_push: { count: 0, share: 0, total: 0 }
      },
      "resilient fallback"
    );
    await assertImportedPreviewOverflowValues(
      resilientPage,
      {
        catalog_pages: 0,
        catalog_products: 0,
        opportunity_previews: 0,
        query_clusters: 0,
        query_rows: 0,
        task_previews: 0
      },
      "resilient fallback"
    );
    await assertImportedPreviewWarningKeys(
      resilientPage,
      ["catalog_unavailable", "graph_unavailable", "opportunities_unavailable", "query_rows_unavailable", "tasks_unavailable"],
      "resilient fallback"
    );
    await resilientPage.close();

    const emptyImportedPage = await context.newPage();
    await emptyImportedPage.route("**/api/stores/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/imported-graph")) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            mode: "imported_graph",
            query_clusters: [],
            store_id: storeId,
            summary: { page_matches: 0, product_matches: 0, query_clusters: 0 }
          })
        });
        return;
      }
      if (url.endsWith("/queries")) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ mode: "csv_import", queries: [], store_id: storeId })
        });
        return;
      }
      if (url.endsWith("/products")) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ mode: "woocommerce_import", products: [], store_id: storeId })
        });
        return;
      }
      if (url.endsWith("/pages")) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ mode: "wordpress_import", pages: [], store_id: storeId })
        });
        return;
      }
      if (url.endsWith("/imported-opportunities")) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ mode: "imported_opportunities", opportunities: [], store_id: storeId, summary: {} })
        });
        return;
      }
      if (url.endsWith("/imported-tasks")) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ mode: "imported_task_previews", store_id: storeId, summary: {}, tasks: [] })
        });
        return;
      }

      await route.continue();
    });
    await emptyImportedPage.goto(webUrl);
    await clickUnique(emptyImportedPage.getByRole("button", { name: "EN" }), "empty imported language switcher");
    await expectVisible(
      emptyImportedPage.getByText("no imported GSC, WooCommerce, or WordPress fixture data yet"),
      "empty imported preview copy"
    );
    await assertImportedPreviewPanelIsReadOnly(emptyImportedPage, "empty imported");
    await assertImportedPreviewState(emptyImportedPage, "empty", 0, "empty imported");
    await assertImportedPreviewSectionCounts(
      emptyImportedPage,
      { availableCount: 0, emptyCount: 6, sectionCount: 6, unavailableCount: 0 },
      "empty imported"
    );
    await assertImportedPreviewSectionHealthSummary(
      emptyImportedPage,
      { available: 0, empty: 6, state: "empty", unavailable: 0 },
      "empty imported"
    );
    await assertImportedPreviewSectionHealthSummaryColor(emptyImportedPage, "rgb(107, 107, 114)", "empty imported");
    await assertImportedPreviewSectionHealth(
      emptyImportedPage,
      {
        graph_clusters: "empty",
        opportunities: "empty",
        pages: "empty",
        products: "empty",
        query_rows: "empty",
        task_previews: "empty"
      },
      "empty imported"
    );
    await assertImportedPreviewSectionHealthCounts(
      emptyImportedPage,
      {
        graph_clusters: 0,
        opportunities: 0,
        pages: 0,
        products: 0,
        query_rows: 0,
        task_previews: 0
      },
      "empty imported"
    );
    await assertImportedPreviewEmptyState(emptyImportedPage, "no_imported_fixtures", "empty imported");
    await assertImportedPreviewWarningKeys(emptyImportedPage, [], "empty imported");
    await assertImportedPreviewMetricValues(
      emptyImportedPage,
      {
        catalog_pages: 0,
        catalog_products: 0,
        graph_clusters: 0,
        matched_pages: 0,
        matched_products: 0,
        buying_guide_gap_opportunities: 0,
        buying_guide_gap_task_previews: 0,
        buying_guide_opportunities: 0,
        buying_guide_task_previews: 0,
        collection_page_opportunities: 0,
        collection_page_task_previews: 0,
        ctr_refresh_opportunities: 0,
        ctr_refresh_task_previews: 0,
        ranking_push_opportunities: 0,
        ranking_push_task_previews: 0,
        recommend_only_task_previews: 0,
        new_task_previews: 0,
        new_opportunity_previews: 0,
        opportunity_previews: 0,
        product_seo_opportunities: 0,
        product_seo_task_previews: 0,
        query_rows: 0,
        task_previews: 0
      },
      "empty imported"
    );
    await assertImportedPreviewMetricTexts(
      emptyImportedPage,
      {
        buying_guide_gap_opportunity_share: "0%",
        buying_guide_gap_task_share: "0%",
        collection_page_opportunity_share: "0%",
        collection_page_task_share: "0%",
        ctr_refresh_opportunity_share: "0%",
        ctr_refresh_task_share: "0%",
        new_task_share: "0%",
        new_opportunity_share: "0%",
        product_seo_opportunity_share: "0%",
        product_seo_task_share: "0%",
        ranking_push_opportunity_share: "0%",
        ranking_push_task_share: "0%",
        recommend_only_task_share: "0%"
      },
      "empty imported"
    );
    await assertImportedPreviewMetricShareDiagnostics(
      emptyImportedPage,
      {
        buying_guide_gap_opportunity_share: { count: 0, percent: 0, total: 0 },
        buying_guide_gap_task_share: { count: 0, percent: 0, total: 0 },
        collection_page_opportunity_share: { count: 0, percent: 0, total: 0 },
        collection_page_task_share: { count: 0, percent: 0, total: 0 },
        ctr_refresh_opportunity_share: { count: 0, percent: 0, total: 0 },
        ctr_refresh_task_share: { count: 0, percent: 0, total: 0 },
        new_task_share: { count: 0, percent: 0, total: 0 },
        new_opportunity_share: { count: 0, percent: 0, total: 0 },
        product_seo_opportunity_share: { count: 0, percent: 0, total: 0 },
        product_seo_task_share: { count: 0, percent: 0, total: 0 },
        ranking_push_opportunity_share: { count: 0, percent: 0, total: 0 },
        ranking_push_task_share: { count: 0, percent: 0, total: 0 },
        recommend_only_task_share: { count: 0, percent: 0, total: 0 }
      },
      "empty imported"
    );
    await assertImportedActionMixSummary(
      emptyImportedPage,
      { state: "empty", total: 0, topKey: "none", topCount: 0, topShare: 0 },
      "empty imported"
    );
    await assertImportedActionMixSummaryColor(emptyImportedPage, "rgb(107, 107, 114)", "empty imported");
    await assertImportedActionMixRows(
      emptyImportedPage,
      {
        buying_guide_gap: { count: 0, share: 0, total: 0 },
        collection_page: { count: 0, share: 0, total: 0 },
        ctr_refresh: { count: 0, share: 0, total: 0 },
        product_seo: { count: 0, share: 0, total: 0 },
        ranking_push: { count: 0, share: 0, total: 0 }
      },
      "empty imported"
    );
    await assertImportedPreviewOverflowValues(
      emptyImportedPage,
      {
        catalog_pages: 0,
        catalog_products: 0,
        opportunity_previews: 0,
        query_clusters: 0,
        query_rows: 0,
        task_previews: 0
      },
      "empty imported"
    );
    await assertImportedPreviewItemKinds(
      emptyImportedPage,
      {
        cluster: 0,
        opportunity: 0,
        page: 0,
        product: 0,
        query_row: 0,
        task_preview: 0
      },
      "empty imported"
    );
    await emptyImportedPage.close();

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
    await expectVisible(catalogFailurePage.getByText("2 imported sections unavailable"), "catalog failure unavailable count");
    await expectVisible(catalogFailurePage.getByText("Catalog reads unavailable"), "catalog failure unavailable message");
    await expectVisible(catalogFailurePage.getByText("Graph-linked clusters"), "catalog failure graph metric");
    await expectVisible(catalogFailurePage.getByText("portable espresso maker camping"), "catalog failure imported query cluster");
    await expectVisible(catalogFailurePage.getByText("recommend_only"), "catalog failure recommend-only task preview");
    await assertImportedPreviewPanelIsReadOnly(catalogFailurePage, "catalog-only failure");
    await assertImportedPreviewState(catalogFailurePage, "ready", 1, "catalog-only failure");
    await assertImportedPreviewSectionCounts(
      catalogFailurePage,
      { availableCount: 4, emptyCount: 0, sectionCount: 6, unavailableCount: 2 },
      "catalog-only failure"
    );
    await assertImportedPreviewSectionHealthSummary(
      catalogFailurePage,
      { available: 4, empty: 0, state: "degraded", unavailable: 2 },
      "catalog-only failure"
    );
    await assertImportedPreviewSectionHealth(
      catalogFailurePage,
      {
        graph_clusters: "available",
        opportunities: "available",
        pages: "unavailable",
        products: "unavailable",
        query_rows: "available",
        task_previews: "available"
      },
      "catalog-only failure"
    );
    await assertImportedPreviewSectionHealthCounts(
      catalogFailurePage,
      {
        graph_clusters: 4,
        opportunities: 4,
        pages: 0,
        products: 0,
        query_rows: 5,
        task_previews: 4
      },
      "catalog-only failure"
    );
    await assertImportedPreviewSectionHealthSources(
      catalogFailurePage,
      {
        graph_clusters: "Imported graph",
        opportunities: "Opportunity previews",
        pages: "WordPress import",
        products: "WooCommerce import",
        query_rows: "GSC CSV",
        task_previews: "Task previews"
      },
      "catalog-only failure"
    );
    await assertImportedPreviewWarningKeys(catalogFailurePage, ["catalog_unavailable"], "catalog-only failure");
    await assertImportedPreviewMetricValues(
      catalogFailurePage,
      {
        catalog_pages: 0,
        catalog_products: 0,
        graph_clusters: 4,
        matched_pages: 3,
        matched_products: 5,
        buying_guide_gap_opportunities: 1,
        buying_guide_gap_task_previews: 1,
        buying_guide_opportunities: 1,
        buying_guide_task_previews: 1,
        collection_page_opportunities: 0,
        collection_page_task_previews: 0,
        ctr_refresh_opportunities: 3,
        ctr_refresh_task_previews: 3,
        ranking_push_opportunities: 0,
        ranking_push_task_previews: 0,
        recommend_only_task_previews: 4,
        new_task_previews: 4,
        new_opportunity_previews: 4,
        opportunity_previews: 4,
        product_seo_opportunities: 0,
        product_seo_task_previews: 0,
        query_rows: 5,
        task_previews: 4
      },
      "catalog-only failure"
    );
    await assertImportedPreviewOverflowValues(
      catalogFailurePage,
      {
        catalog_pages: 0,
        catalog_products: 0,
        opportunity_previews: 2,
        query_clusters: 2,
        query_rows: 3,
        task_previews: 2
      },
      "catalog-only failure"
    );
    await assertImportedPreviewItemKinds(
      catalogFailurePage,
      {
        cluster: 2,
        opportunity: 2,
        page: 0,
        product: 0,
        query_row: 2,
        task_preview: 2
      },
      "catalog-only failure"
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
    await expectVisible(queryRowFailurePage.getByText("1 imported sections unavailable"), "query row failure unavailable count");
    await expectVisible(queryRowFailurePage.getByText("read-only imported previews"), "query row failure imported preview badge");
    await expectVisible(queryRowFailurePage.getByText("Query rows unavailable"), "query row failure unavailable message");
    await expectVisible(queryRowFailurePage.getByText("Graph-linked clusters"), "query row failure graph metric");
    await expectVisible(queryRowFailurePage.getByText("portable espresso maker camping"), "query row failure imported query cluster");
    await expectVisible(queryRowFailurePage.getByText("Trail Brew Portable Espresso Maker"), "query row failure imported product row");
    await assertImportedPreviewPanelIsReadOnly(queryRowFailurePage, "query-row-only failure");
    await assertImportedPreviewState(queryRowFailurePage, "ready", 1, "query-row-only failure");
    await assertImportedPreviewSectionCounts(
      queryRowFailurePage,
      { availableCount: 5, emptyCount: 0, sectionCount: 6, unavailableCount: 1 },
      "query-row-only failure"
    );
    await assertImportedPreviewSectionHealthSummary(
      queryRowFailurePage,
      { available: 5, empty: 0, state: "degraded", unavailable: 1 },
      "query-row-only failure"
    );
    await assertImportedPreviewSectionHealth(
      queryRowFailurePage,
      {
        graph_clusters: "available",
        opportunities: "available",
        pages: "available",
        products: "available",
        query_rows: "unavailable",
        task_previews: "available"
      },
      "query-row-only failure"
    );
    await assertImportedPreviewSectionHealthCounts(
      queryRowFailurePage,
      {
        graph_clusters: 4,
        opportunities: 4,
        pages: 3,
        products: 3,
        query_rows: 0,
        task_previews: 4
      },
      "query-row-only failure"
    );
    await assertImportedPreviewSectionHealthSources(
      queryRowFailurePage,
      {
        graph_clusters: "Imported graph",
        opportunities: "Opportunity previews",
        pages: "WordPress import",
        products: "WooCommerce import",
        query_rows: "GSC CSV",
        task_previews: "Task previews"
      },
      "query-row-only failure"
    );
    await assertImportedPreviewWarningKeys(queryRowFailurePage, ["query_rows_unavailable"], "query-row-only failure");
    await assertImportedPreviewMetricValues(
      queryRowFailurePage,
      {
        catalog_pages: 3,
        catalog_products: 3,
        graph_clusters: 4,
        matched_pages: 3,
        matched_products: 5,
        buying_guide_gap_opportunities: 1,
        buying_guide_gap_task_previews: 1,
        buying_guide_opportunities: 1,
        buying_guide_task_previews: 1,
        collection_page_opportunities: 0,
        collection_page_task_previews: 0,
        ctr_refresh_opportunities: 3,
        ctr_refresh_task_previews: 3,
        ranking_push_opportunities: 0,
        ranking_push_task_previews: 0,
        recommend_only_task_previews: 4,
        new_task_previews: 4,
        new_opportunity_previews: 4,
        opportunity_previews: 4,
        product_seo_opportunities: 0,
        product_seo_task_previews: 0,
        query_rows: 0,
        task_previews: 4
      },
      "query-row-only failure"
    );
    await assertImportedPreviewItemKinds(
      queryRowFailurePage,
      {
        cluster: 2,
        opportunity: 2,
        page: 2,
        product: 2,
        query_row: 0,
        task_preview: 2
      },
      "query-row-only failure"
    );
    await assertImportedPreviewOverflowValues(
      queryRowFailurePage,
      {
        catalog_pages: 1,
        catalog_products: 1,
        opportunity_previews: 2,
        query_clusters: 2,
        query_rows: 0,
        task_previews: 2
      },
      "query-row-only failure"
    );
    await queryRowFailurePage.close();

    const graphFailurePage = await context.newPage();
    await graphFailurePage.route("**/api/stores/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/imported-graph")) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });
    await graphFailurePage.goto(webUrl);
    await clickUnique(graphFailurePage.getByRole("button", { name: "EN" }), "graph failure language switcher");
    await expectVisible(graphFailurePage.getByText("read-only imported previews"), "graph failure imported preview badge");
    await expectVisible(graphFailurePage.getByText("Graph reads unavailable"), "graph failure unavailable message");
    await expectVisible(graphFailurePage.getByText("Query row / Imported GSC"), "graph failure query row preview");
    await expectVisible(graphFailurePage.getByText("Trail Brew Portable Espresso Maker"), "graph failure product preview");
    await expectVisible(graphFailurePage.getByText("recommend_only"), "graph failure task preview");
    await assertImportedPreviewPanelIsReadOnly(graphFailurePage, "graph-only failure");
    await assertImportedPreviewState(graphFailurePage, "ready", 1, "graph-only failure");
    await assertImportedPreviewWarningKeys(graphFailurePage, ["graph_unavailable"], "graph-only failure");
    await assertImportedPreviewMetricValues(
      graphFailurePage,
      {
        catalog_pages: 3,
        catalog_products: 3,
        graph_clusters: 0,
        matched_pages: 0,
        matched_products: 0,
        buying_guide_gap_opportunities: 1,
        buying_guide_gap_task_previews: 1,
        buying_guide_opportunities: 1,
        buying_guide_task_previews: 1,
        collection_page_opportunities: 0,
        collection_page_task_previews: 0,
        ctr_refresh_opportunities: 3,
        ctr_refresh_task_previews: 3,
        ranking_push_opportunities: 0,
        ranking_push_task_previews: 0,
        recommend_only_task_previews: 4,
        new_task_previews: 4,
        new_opportunity_previews: 4,
        opportunity_previews: 4,
        product_seo_opportunities: 0,
        product_seo_task_previews: 0,
        query_rows: 5,
        task_previews: 4
      },
      "graph-only failure"
    );
    await assertImportedPreviewOverflowValues(
      graphFailurePage,
      {
        catalog_pages: 1,
        catalog_products: 1,
        opportunity_previews: 2,
        query_clusters: 0,
        query_rows: 3,
        task_previews: 2
      },
      "graph-only failure"
    );
    await assertImportedPreviewItemKinds(
      graphFailurePage,
      {
        cluster: 0,
        opportunity: 2,
        page: 2,
        product: 2,
        query_row: 2,
        task_preview: 2
      },
      "graph-only failure"
    );
    await graphFailurePage.close();

    const opportunityFailurePage = await context.newPage();
    await opportunityFailurePage.route("**/api/stores/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/imported-opportunities")) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });
    await opportunityFailurePage.goto(webUrl);
    await clickUnique(opportunityFailurePage.getByRole("button", { name: "EN" }), "opportunity failure language switcher");
    await expectVisible(opportunityFailurePage.getByText("read-only imported previews"), "opportunity failure imported preview badge");
    await expectVisible(opportunityFailurePage.getByText("Opportunity previews unavailable"), "opportunity failure unavailable message");
    await expectVisible(opportunityFailurePage.getByText("portable espresso maker camping"), "opportunity failure imported query cluster");
    await expectVisible(opportunityFailurePage.getByText("Trail Brew Portable Espresso Maker"), "opportunity failure product preview");
    await expectVisible(opportunityFailurePage.getByText("recommend_only"), "opportunity failure task preview");
    await assertImportedPreviewPanelIsReadOnly(opportunityFailurePage, "opportunity-only failure");
    await assertImportedPreviewState(opportunityFailurePage, "ready", 1, "opportunity-only failure");
    await assertImportedPreviewWarningKeys(opportunityFailurePage, ["opportunities_unavailable"], "opportunity-only failure");
    await assertImportedPreviewMetricValues(
      opportunityFailurePage,
      {
        catalog_pages: 3,
        catalog_products: 3,
        graph_clusters: 4,
        matched_pages: 3,
        matched_products: 5,
        buying_guide_gap_opportunities: 0,
        buying_guide_gap_task_previews: 1,
        buying_guide_opportunities: 0,
        buying_guide_task_previews: 1,
        collection_page_opportunities: 0,
        collection_page_task_previews: 0,
        ctr_refresh_opportunities: 0,
        ctr_refresh_task_previews: 3,
        ranking_push_opportunities: 0,
        ranking_push_task_previews: 0,
        recommend_only_task_previews: 4,
        new_task_previews: 4,
        new_opportunity_previews: 0,
        opportunity_previews: 0,
        product_seo_opportunities: 0,
        product_seo_task_previews: 0,
        query_rows: 5,
        task_previews: 4
      },
      "opportunity-only failure"
    );
    await assertImportedPreviewMetricTexts(
      opportunityFailurePage,
      {
        buying_guide_gap_opportunity_share: "0%",
        buying_guide_gap_task_share: "25%",
        collection_page_opportunity_share: "0%",
        collection_page_task_share: "0%",
        ctr_refresh_opportunity_share: "0%",
        ctr_refresh_task_share: "75%",
        new_task_share: "100%",
        new_opportunity_share: "0%",
        product_seo_opportunity_share: "0%",
        product_seo_task_share: "0%",
        ranking_push_opportunity_share: "0%",
        ranking_push_task_share: "0%",
        recommend_only_task_share: "100%"
      },
      "opportunity-only failure"
    );
    await assertImportedPreviewMetricShareDiagnostics(
      opportunityFailurePage,
      {
        buying_guide_gap_opportunity_share: { count: 0, percent: 0, total: 0 },
        buying_guide_gap_task_share: { count: 1, percent: 25, total: 4 },
        collection_page_opportunity_share: { count: 0, percent: 0, total: 0 },
        collection_page_task_share: { count: 0, percent: 0, total: 4 },
        ctr_refresh_opportunity_share: { count: 0, percent: 0, total: 0 },
        ctr_refresh_task_share: { count: 3, percent: 75, total: 4 },
        new_task_share: { count: 4, percent: 100, total: 4 },
        new_opportunity_share: { count: 0, percent: 0, total: 0 },
        product_seo_opportunity_share: { count: 0, percent: 0, total: 0 },
        product_seo_task_share: { count: 0, percent: 0, total: 4 },
        ranking_push_opportunity_share: { count: 0, percent: 0, total: 0 },
        ranking_push_task_share: { count: 0, percent: 0, total: 4 },
        recommend_only_task_share: { count: 4, percent: 100, total: 4 }
      },
      "opportunity-only failure"
    );
    await assertImportedActionMixSummary(
      opportunityFailurePage,
      { state: "concentrated", total: 4, topKey: "ctr_refresh", topCount: 3, topShare: 75 },
      "opportunity-only failure"
    );
    await assertImportedActionMixRows(
      opportunityFailurePage,
      {
        buying_guide_gap: { count: 1, share: 25, total: 4 },
        collection_page: { count: 0, share: 0, total: 4 },
        ctr_refresh: { count: 3, share: 75, total: 4 },
        product_seo: { count: 0, share: 0, total: 4 },
        ranking_push: { count: 0, share: 0, total: 4 }
      },
      "opportunity-only failure"
    );
    await assertImportedPreviewItemKinds(
      opportunityFailurePage,
      {
        cluster: 2,
        opportunity: 0,
        page: 2,
        product: 2,
        query_row: 2,
        task_preview: 2
      },
      "opportunity-only failure"
    );
    await assertImportedPreviewOverflowValues(
      opportunityFailurePage,
      {
        catalog_pages: 1,
        catalog_products: 1,
        opportunity_previews: 0,
        query_clusters: 2,
        query_rows: 3,
        task_previews: 2
      },
      "opportunity-only failure"
    );
    await opportunityFailurePage.close();

    const taskFailurePage = await context.newPage();
    await taskFailurePage.route("**/api/stores/**", async (route) => {
      const url = route.request().url();
      if (url.endsWith("/imported-tasks")) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });
    await taskFailurePage.goto(webUrl);
    await clickUnique(taskFailurePage.getByRole("button", { name: "EN" }), "task failure language switcher");
    await expectVisible(taskFailurePage.getByText("read-only imported previews"), "task failure imported preview badge");
    await expectVisible(taskFailurePage.getByText("Task previews unavailable"), "task failure unavailable message");
    await expectVisible(taskFailurePage.getByText("portable espresso maker camping"), "task failure imported query cluster");
    await expectVisible(taskFailurePage.getByText("Trail Brew Portable Espresso Maker"), "task failure product preview");
    await expectVisible(
      taskFailurePage.getByText("Improve CTR for portable espresso maker camping"),
      "task failure opportunity preview"
    );
    await assertImportedPreviewPanelIsReadOnly(taskFailurePage, "task-only failure");
    await assertImportedPreviewState(taskFailurePage, "ready", 1, "task-only failure");
    await assertImportedPreviewWarningKeys(taskFailurePage, ["tasks_unavailable"], "task-only failure");
    await assertImportedPreviewMetricValues(
      taskFailurePage,
      {
        catalog_pages: 3,
        catalog_products: 3,
        graph_clusters: 4,
        matched_pages: 3,
        matched_products: 5,
        buying_guide_gap_opportunities: 1,
        buying_guide_gap_task_previews: 0,
        buying_guide_opportunities: 1,
        buying_guide_task_previews: 0,
        collection_page_opportunities: 0,
        collection_page_task_previews: 0,
        ctr_refresh_opportunities: 3,
        ctr_refresh_task_previews: 0,
        ranking_push_opportunities: 0,
        ranking_push_task_previews: 0,
        recommend_only_task_previews: 0,
        new_task_previews: 0,
        new_opportunity_previews: 4,
        opportunity_previews: 4,
        product_seo_opportunities: 0,
        product_seo_task_previews: 0,
        query_rows: 5,
        task_previews: 0
      },
      "task-only failure"
    );
    await assertImportedPreviewMetricTexts(
      taskFailurePage,
      {
        buying_guide_gap_opportunity_share: "25%",
        buying_guide_gap_task_share: "0%",
        collection_page_opportunity_share: "0%",
        collection_page_task_share: "0%",
        ctr_refresh_opportunity_share: "75%",
        ctr_refresh_task_share: "0%",
        new_task_share: "0%",
        new_opportunity_share: "100%",
        product_seo_opportunity_share: "0%",
        product_seo_task_share: "0%",
        ranking_push_opportunity_share: "0%",
        ranking_push_task_share: "0%",
        recommend_only_task_share: "0%"
      },
      "task-only failure"
    );
    await assertImportedPreviewMetricShareDiagnostics(
      taskFailurePage,
      {
        buying_guide_gap_opportunity_share: { count: 1, percent: 25, total: 4 },
        buying_guide_gap_task_share: { count: 0, percent: 0, total: 0 },
        collection_page_opportunity_share: { count: 0, percent: 0, total: 4 },
        collection_page_task_share: { count: 0, percent: 0, total: 0 },
        ctr_refresh_opportunity_share: { count: 3, percent: 75, total: 4 },
        ctr_refresh_task_share: { count: 0, percent: 0, total: 0 },
        new_task_share: { count: 0, percent: 0, total: 0 },
        new_opportunity_share: { count: 4, percent: 100, total: 4 },
        product_seo_opportunity_share: { count: 0, percent: 0, total: 4 },
        product_seo_task_share: { count: 0, percent: 0, total: 0 },
        ranking_push_opportunity_share: { count: 0, percent: 0, total: 4 },
        ranking_push_task_share: { count: 0, percent: 0, total: 0 },
        recommend_only_task_share: { count: 0, percent: 0, total: 0 }
      },
      "task-only failure"
    );
    await assertImportedActionMixSummary(
      taskFailurePage,
      { state: "concentrated", total: 4, topKey: "ctr_refresh", topCount: 3, topShare: 75 },
      "task-only failure"
    );
    await assertImportedActionMixRows(
      taskFailurePage,
      {
        buying_guide_gap: { count: 1, share: 25, total: 4 },
        collection_page: { count: 0, share: 0, total: 4 },
        ctr_refresh: { count: 3, share: 75, total: 4 },
        product_seo: { count: 0, share: 0, total: 4 },
        ranking_push: { count: 0, share: 0, total: 4 }
      },
      "task-only failure"
    );
    await assertImportedPreviewItemKinds(
      taskFailurePage,
      {
        cluster: 2,
        opportunity: 2,
        page: 2,
        product: 2,
        query_row: 2,
        task_preview: 0
      },
      "task-only failure"
    );
    await assertImportedPreviewOverflowValues(
      taskFailurePage,
      {
        catalog_pages: 1,
        catalog_products: 1,
        opportunity_previews: 2,
        query_clusters: 2,
        query_rows: 3,
        task_previews: 0
      },
      "task-only failure"
    );
    await taskFailurePage.close();

    const derivedFailurePage = await context.newPage();
    await derivedFailurePage.route("**/api/stores/**", async (route) => {
      const url = route.request().url();
      if (
        url.endsWith("/imported-graph") ||
        url.endsWith("/queries") ||
        url.endsWith("/imported-opportunities") ||
        url.endsWith("/imported-tasks")
      ) {
        await route.abort("failed");
        return;
      }

      await route.continue();
    });
    await derivedFailurePage.goto(webUrl);
    await clickUnique(derivedFailurePage.getByRole("button", { name: "EN" }), "derived failure language switcher");
    await expectVisible(derivedFailurePage.getByText("read-only imported previews"), "derived failure imported preview badge");
    await expectVisible(derivedFailurePage.getByText("4 imported sections unavailable"), "derived failure unavailable count");
    await expectVisible(derivedFailurePage.getByText("Graph reads unavailable"), "derived failure graph unavailable message");
    await expectVisible(derivedFailurePage.getByText("Query rows unavailable"), "derived failure query rows unavailable message");
    await expectVisible(
      derivedFailurePage.getByText("Opportunity previews unavailable"),
      "derived failure opportunity unavailable message"
    );
    await expectVisible(derivedFailurePage.getByText("Task previews unavailable"), "derived failure task unavailable message");
    await expectVisible(derivedFailurePage.getByText("Trail Brew Portable Espresso Maker"), "derived failure product preview");
    await expectVisible(derivedFailurePage.getByText("Camping Espresso Collection"), "derived failure page preview");
    assert(
      (await derivedFailurePage.getByText("Imported previews unavailable").count()) === 0,
      "Derived preview failures must not hide successful catalog reads behind the global unavailable state"
    );
    await assertImportedPreviewPanelIsReadOnly(derivedFailurePage, "derived-read failure");
    await assertImportedPreviewState(derivedFailurePage, "ready", 4, "derived-read failure");
    await assertImportedPreviewWarningKeys(
      derivedFailurePage,
      ["graph_unavailable", "opportunities_unavailable", "query_rows_unavailable", "tasks_unavailable"],
      "derived-read failure"
    );
    await assertImportedPreviewMetricValues(
      derivedFailurePage,
      {
        catalog_pages: 3,
        catalog_products: 3,
        graph_clusters: 0,
        matched_pages: 0,
        matched_products: 0,
        buying_guide_gap_opportunities: 0,
        buying_guide_gap_task_previews: 0,
        buying_guide_opportunities: 0,
        buying_guide_task_previews: 0,
        collection_page_opportunities: 0,
        collection_page_task_previews: 0,
        ctr_refresh_opportunities: 0,
        ctr_refresh_task_previews: 0,
        ranking_push_opportunities: 0,
        ranking_push_task_previews: 0,
        recommend_only_task_previews: 0,
        new_task_previews: 0,
        new_opportunity_previews: 0,
        opportunity_previews: 0,
        product_seo_opportunities: 0,
        product_seo_task_previews: 0,
        query_rows: 0,
        task_previews: 0
      },
      "derived-read failure"
    );
    await assertImportedPreviewOverflowValues(
      derivedFailurePage,
      {
        catalog_pages: 1,
        catalog_products: 1,
        opportunity_previews: 0,
        query_clusters: 0,
        query_rows: 0,
        task_previews: 0
      },
      "derived-read failure"
    );
    await assertImportedPreviewItemKinds(
      derivedFailurePage,
      {
        cluster: 0,
        opportunity: 0,
        page: 2,
        product: 2,
        query_row: 0,
        task_preview: 0
      },
      "derived-read failure"
    );
    await derivedFailurePage.close();

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
