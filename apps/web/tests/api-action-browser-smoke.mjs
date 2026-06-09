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

async function assertAssetWorkspacePanelIsReadOnly(page, expectedDraftCount, label, expectedAssets = []) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel`);

  const availability = await assetPanel.getAttribute("data-asset-workspace-availability");
  const draftCountText = await assetPanel.getAttribute("data-asset-draft-count");
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
    availability === expectedAvailability,
    `${label} asset workspace availability mismatch: expected ${expectedAvailability}, got ${
      availability ?? "missing"
    }`
  );
  assert(
    externalWriteAllowed === "false",
    `${label} asset workspace must clamp external writes to false, got ${externalWriteAllowed ?? "missing"}`
  );
  await expectVisible(page.getByText("Read-only asset workspace"), `${label} asset workspace read-only label`);
  await expectVisible(page.getByText("wordpress_draft_creation"), `${label} blocked WordPress draft capability`);

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
  const interactiveCount = await assetPanel.locator(interactiveSelector).count();
  assert(interactiveCount === 0, `${label} asset workspace panel must not render interactive controls`);

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
    }
    if (expectedAsset.qaCheckCount !== undefined) {
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
    }
    const rowText = (await row.textContent()) ?? "";
    assert(rowText.includes(expectedAsset.title), `${label} asset row ${expectedAsset.id} must show title`);
    if (expectedAsset.qaCheckCount !== undefined) {
      assert(
        rowText.includes(`qa ${expectedAsset.qaPendingCount}/${expectedAsset.qaCheckCount} pending`),
        `${label} asset row ${expectedAsset.id} must show QA pending summary`
      );
    }
    for (const contentBlockType of expectedAsset.contentBlockTypes ?? []) {
      assert(
        rowText.includes(contentBlockType),
        `${label} asset row ${expectedAsset.id} must show content block type ${contentBlockType}`
      );
    }
  }
}

async function assertAssetWorkspacePanelUnavailable(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel`);
  const availability = await assetPanel.getAttribute("data-asset-workspace-availability");
  const externalWriteAllowed = await assetPanel.getAttribute("data-external-write-allowed");
  assert(
    availability === "unavailable",
    `${label} asset workspace availability mismatch: expected unavailable, got ${availability ?? "missing"}`
  );
  assert(
    externalWriteAllowed === "false",
    `${label} unavailable asset workspace must clamp external writes to false, got ${externalWriteAllowed ?? "missing"}`
  );
  await expectVisible(page.getByText("Asset workspace unavailable"), `${label} unavailable asset copy`);
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
  const panelText = (await assetPanel.textContent()) ?? "";
  for (const capability of expectedCapabilities) {
    assert(
      panelText.includes(capability),
      `${label} asset workspace missing visible blocked capability context: ${capability}`
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
  const totalCount = expectedEntries.reduce((sum, [, count]) => sum + count, 0);
  assert(
    Number(typeCountText) === expectedEntries.length,
    `${label} asset type count mismatch: expected ${expectedEntries.length}, got ${typeCountText ?? "missing"}`
  );
  assert(
    Number(totalCountText) === totalCount,
    `${label} asset type total mismatch: expected ${totalCount}, got ${totalCountText ?? "missing"}`
  );
  const summaryText = (await summaryRow.textContent()) ?? "";
  for (const [assetType, count] of expectedEntries) {
    assert(
      summaryText.includes(`${assetType} ${count}`),
      `${label} asset type summary missing ${assetType} ${count}`
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

async function assertAssetWorkspaceQaReadiness(page, expectedReadinessState, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for QA readiness diagnostics`);
  const readinessState = await assetPanel.getAttribute("data-asset-qa-readiness-state");
  assert(
    readinessState === expectedReadinessState,
    `${label} QA readiness state mismatch: expected ${expectedReadinessState}, got ${readinessState ?? "missing"}`
  );
  const readinessRow = assetPanel.locator("[data-asset-qa-readiness='true']");
  await expectVisible(readinessRow, `${label} asset QA readiness row`);
  await expectVisible(page.getByText(expectedReadinessState), `${label} asset QA readiness visible state`);
}

async function assertAssetWorkspaceNoQaChecks(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for no-QA diagnostics`);
  const readinessState = await assetPanel.getAttribute("data-asset-qa-readiness-state");
  assert(
    readinessState === "not_applicable",
    `${label} no-QA readiness state mismatch: expected not_applicable, got ${readinessState ?? "missing"}`
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
  assert(
    readinessState === "unavailable",
    `${label} unavailable QA readiness mismatch: expected unavailable, got ${readinessState ?? "missing"}`
  );
  const qaSummaryCount = await assetPanel.locator("[data-asset-qa-summary='true']").count();
  const qaReadinessRowCount = await assetPanel.locator("[data-asset-qa-readiness='true']").count();
  assert(qaSummaryCount === 0, `${label} must not render QA summary when asset workspace is unavailable`);
  assert(qaReadinessRowCount === 0, `${label} must not render QA readiness row when asset workspace is unavailable`);
}

async function assertAssetWorkspaceQaAggregateReconciles(page, hiddenQaCheckCount, hiddenQaPendingCount, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for QA aggregate reconciliation`);
  const summaryRow = assetPanel.locator("[data-asset-qa-summary='true']");
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
}

async function assertAssetWorkspaceRowAggregateReconciles(page, label) {
  const assetPanel = page.locator(".asset-workspace-panel");
  await expectVisible(assetPanel, `${label} asset workspace panel for row aggregate diagnostics`);
  const miniList = assetPanel.locator("[data-asset-row-aggregate='true']");
  await expectVisible(miniList, `${label} asset row aggregate list`);
  const draftCount = Number(await assetPanel.getAttribute("data-asset-draft-count"));
  const overflowCount = Number(await assetPanel.getAttribute("data-asset-overflow-count"));
  const visibleCount = Number(await miniList.getAttribute("data-visible-asset-count"));
  const actualVisibleRows = await miniList.locator("[data-asset-id]").count();
  assert(
    Number.isInteger(visibleCount) && visibleCount === actualVisibleRows,
    `${label} visible asset row count mismatch: expected DOM ${actualVisibleRows}, got ${visibleCount}`
  );
  assert(
    visibleCount + overflowCount === draftCount,
    `${label} asset row aggregate mismatch: visible ${visibleCount} + overflow ${overflowCount} != draft ${draftCount}`
  );
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

    const populatedAssetPage = await context.newPage();
    await populatedAssetPage.route(`**/api/stores/${storeId}/assets`, async (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith(`/api/stores/${storeId}/assets`)) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            assets: [
              {
                asset_type: "collection_page",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
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
                title: "Draft camping espresso buying guide"
              },
              {
                asset_type: "product_seo",
                blocked_capabilities: ["wordpress_draft_creation", "wordpress_publish", "woocommerce_writes"],
                content_blocks: [{ type: "metadata_only" }],
                external_write_allowed: false,
                id: "asset_task_004",
                qa_checks: [{ key: "metadata", status: "pending" }],
                review_state: "draft_candidate",
                source_task_id: "task_004",
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
    await populatedAssetPage.goto(webUrl);
    await clickUnique(populatedAssetPage.getByRole("button", { name: "EN" }), "populated asset language switcher");
    await assertAssetWorkspacePanelIsReadOnly(populatedAssetPage, 3, "populated asset workspace", [
      {
        contentBlockCount: 3,
        contentBlockTypes: ["answer_summary", "metadata_only", "faq"],
        id: "asset_task_002",
        qaCheckCount: 3,
        qaPendingCount: 2,
        reviewState: "draft_candidate",
        title: "Create camping portable espresso collection page"
      },
      {
        contentBlockCount: 2,
        contentBlockTypes: ["answer_summary", "faq"],
        id: "asset_task_003",
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
    await assertAssetWorkspaceQaSummary(populatedAssetPage, 5, 4, "populated asset workspace");
    await assertWordPressDraftReadinessSummary(populatedAssetPage, 0, 3, "populated asset workspace");
    await assertAssetWorkspaceQaReadiness(populatedAssetPage, "pending_qa", "populated asset workspace");
    await assertAssetWorkspaceQaAggregateReconciles(populatedAssetPage, 1, 1, "populated asset workspace");
    await assertAssetWorkspaceRowAggregateReconciles(populatedAssetPage, "populated asset workspace");
    await populatedAssetPage.close();

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
                  { key: "geo", status: "passed" }
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
        qaCheckCount: 2,
        qaPendingCount: 0,
        reviewState: "draft_candidate",
        title: "QA clear collection page"
      }
    ]);
    await assertAssetWorkspaceQaSummary(qaClearAssetPage, 2, 0, "QA clear asset workspace");
    await assertAssetWorkspaceQaReadiness(qaClearAssetPage, "qa_clear", "QA clear asset workspace");
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
