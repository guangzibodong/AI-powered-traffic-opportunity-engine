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
    permalink: "https://example.com/product/trail-brew-portable-espresso-maker",
    slug: "trail-brew-portable-espresso-maker",
    status: "publish",
    stock_status: "instock"
  },
  {
    attributes: [{ name: "Use case", options: ["Camping", "Manual brew"] }],
    categories: [{ name: "Camping Coffee" }],
    id: 102,
    name: "Camp Kettle Pour Over Kit",
    permalink: "https://example.com/product/camp-kettle-pour-over-kit",
    slug: "camp-kettle-pour-over-kit",
    status: "publish",
    stock_status: "instock"
  },
  {
    attributes: [{ name: "Use case", options: ["Camping", "Cold brew"] }],
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
  const unavailableCountText = await importedPanel.getAttribute("data-unavailable-section-count");
  const reconciled = await importedPanel.getAttribute("data-section-counts-reconciled");
  const sectionCount = Number(sectionCountText);
  const availableCount = Number(availableCountText);
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
    Number.isInteger(unavailableCount) && unavailableCount === expectedValues.unavailableCount,
    `${label} imported preview unavailable section count mismatch: expected ${expectedValues.unavailableCount}, got ${
      unavailableCountText ?? "missing"
    }`
  );
  assert(
    availableCount + unavailableCount === sectionCount,
    `${label} imported preview section counts must reconcile: available ${availableCountText}, unavailable ${unavailableCountText}, section ${sectionCountText}`
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

  const allowedTypes = new Set(["collection_page_gap", "high_impression_low_ctr", "ranking_push"]);
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

    await assertImportedPreviewPanelIsReadOnly(page, "initial");
    await assertImportedPreviewState(page, "ready", 0, "initial");
    await assertImportedPreviewSectionCounts(
      page,
      { availableCount: 6, sectionCount: 6, unavailableCount: 0 },
      "initial"
    );
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
        graph_clusters: 3,
        opportunities: 3,
        pages: 3,
        products: 3,
        query_rows: 4,
        task_previews: 3
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
        graph_clusters: 3,
        matched_pages: 3,
        matched_products: 3,
        opportunity_previews: 3,
        query_rows: 4,
        task_previews: 3
      },
      "initial"
    );
    await assertImportedPreviewOverflowValues(
      page,
      {
        catalog_pages: 1,
        catalog_products: 1,
        opportunity_previews: 1,
        query_clusters: 1,
        query_rows: 2,
        task_previews: 1
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
        "data-total-clusters": 3,
        "data-total-opportunities": 3,
        "data-total-pages": 3,
        "data-total-products": 3,
        "data-total-query-rows": 4,
        "data-total-task-previews": 3
      },
      "initial"
    );
    await assertImportedHiddenRailCounts(
      page,
      {
        "data-hidden-clusters": 1,
        "data-hidden-opportunities": 1,
        "data-hidden-pages": 1,
        "data-hidden-products": 1,
        "data-hidden-query-rows": 2,
        "data-hidden-task-previews": 1
      },
      "initial"
    );
    await assertImportedRailCountReconciliation(
      page,
      ["clusters", "opportunities", "pages", "products", "query-rows", "task-previews"],
      "initial"
    );

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
    await expectVisible(resilientPage.getByText("5 imported sections unavailable"), "resilient imported unavailable count");
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
      { availableCount: 0, sectionCount: 6, unavailableCount: 6 },
      "resilient fallback"
    );
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
        opportunity_previews: 0,
        query_rows: 0,
        task_previews: 0
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
      { availableCount: 6, sectionCount: 6, unavailableCount: 0 },
      "empty imported"
    );
    await assertImportedPreviewSectionHealth(
      emptyImportedPage,
      {
        graph_clusters: "available",
        opportunities: "available",
        pages: "available",
        products: "available",
        query_rows: "available",
        task_previews: "available"
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
        opportunity_previews: 0,
        query_rows: 0,
        task_previews: 0
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
    await expectVisible(catalogFailurePage.getByText("Catalog reads unavailable"), "catalog failure unavailable message");
    await expectVisible(catalogFailurePage.getByText("Graph-linked clusters"), "catalog failure graph metric");
    await expectVisible(catalogFailurePage.getByText("portable espresso maker camping"), "catalog failure imported query cluster");
    await expectVisible(catalogFailurePage.getByText("recommend_only"), "catalog failure recommend-only task preview");
    await assertImportedPreviewPanelIsReadOnly(catalogFailurePage, "catalog-only failure");
    await assertImportedPreviewState(catalogFailurePage, "ready", 1, "catalog-only failure");
    await assertImportedPreviewSectionCounts(
      catalogFailurePage,
      { availableCount: 4, sectionCount: 6, unavailableCount: 2 },
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
        graph_clusters: 3,
        opportunities: 3,
        pages: 0,
        products: 0,
        query_rows: 4,
        task_previews: 3
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
        graph_clusters: 3,
        matched_pages: 3,
        matched_products: 3,
        opportunity_previews: 3,
        query_rows: 4,
        task_previews: 3
      },
      "catalog-only failure"
    );
    await assertImportedPreviewOverflowValues(
      catalogFailurePage,
      {
        catalog_pages: 0,
        catalog_products: 0,
        opportunity_previews: 1,
        query_clusters: 1,
        query_rows: 2,
        task_previews: 1
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
    await expectVisible(queryRowFailurePage.getByText("read-only imported previews"), "query row failure imported preview badge");
    await expectVisible(queryRowFailurePage.getByText("Query rows unavailable"), "query row failure unavailable message");
    await expectVisible(queryRowFailurePage.getByText("Graph-linked clusters"), "query row failure graph metric");
    await expectVisible(queryRowFailurePage.getByText("portable espresso maker camping"), "query row failure imported query cluster");
    await expectVisible(queryRowFailurePage.getByText("Trail Brew Portable Espresso Maker"), "query row failure imported product row");
    await assertImportedPreviewPanelIsReadOnly(queryRowFailurePage, "query-row-only failure");
    await assertImportedPreviewState(queryRowFailurePage, "ready", 1, "query-row-only failure");
    await assertImportedPreviewSectionCounts(
      queryRowFailurePage,
      { availableCount: 5, sectionCount: 6, unavailableCount: 1 },
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
        graph_clusters: 3,
        opportunities: 3,
        pages: 3,
        products: 3,
        query_rows: 0,
        task_previews: 3
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
        opportunity_previews: 1,
        query_clusters: 1,
        query_rows: 0,
        task_previews: 1
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
        opportunity_previews: 3,
        query_rows: 4,
        task_previews: 3
      },
      "graph-only failure"
    );
    await assertImportedPreviewOverflowValues(
      graphFailurePage,
      {
        catalog_pages: 1,
        catalog_products: 1,
        opportunity_previews: 1,
        query_clusters: 0,
        query_rows: 2,
        task_previews: 1
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
        query_clusters: 1,
        query_rows: 2,
        task_previews: 1
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
        opportunity_previews: 1,
        query_clusters: 1,
        query_rows: 2,
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
        opportunity_previews: 0,
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
