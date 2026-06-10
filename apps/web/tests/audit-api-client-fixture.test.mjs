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

const adapter = await loadModule("lib/view-model-adapters.ts");

const auditPayload = {
  audit_logs: [
    {
      action: "performance.refresh_previewed",
      actor: "system",
      external_write_allowed: true,
      id: "audit_perf_refresh_preview",
      metadata: {
        credential_hint: "token-password-secret",
        external_write_allowed: true,
        source: "live_gsc",
        status: "queued",
        would_call_external_gsc: true
      },
      safety_scope: "local_tracking_preview_only",
      target_id: "performance_refresh_preview",
      target_type: "performance"
    }
  ],
  mode: "audit_logs",
  store_id: "store-demo-outdoor-coffee"
};

const evidenceRows = adapter.mapApiAuditLogsToEvidenceRows(auditPayload);
const auditPreviews = adapter.mapApiAuditLogsToPreviews(auditPayload);

assert(evidenceRows.length === 1, "Audit evidence mapper should keep one performance refresh preview event");
assert(evidenceRows[0].type === "audit", "Performance refresh preview audit evidence must stay audit-typed");
assert(
  evidenceRows[0].metric === "Performance refresh preview",
  "Performance refresh preview audit evidence should use safe display copy"
);
assert(
  evidenceRows[0].reason === "local_tracking_preview_only",
  "Performance refresh preview audit evidence should preserve the safe local preview scope"
);

assert(auditPreviews.length === 1, "Audit preview mapper should keep one performance refresh preview event");
assert(
  auditPreviews[0].eventKind === "performance_refresh_preview",
  "Audit preview should classify performance refresh preview events"
);
assert(
  auditPreviews[0].displayAction === "Performance refresh preview",
  "Audit preview should expose safe display action copy"
);
assert(auditPreviews[0].externalWriteAllowed === false, "Audit preview must clamp external writes");
assert(
  auditPreviews[0].safetyScope === "local_tracking_preview_only",
  "Audit preview should preserve the safe local preview scope"
);

const serializedAuditModels = JSON.stringify({ auditPreviews, evidenceRows });
for (const forbidden of [
  "token-password-secret",
  "credential_hint",
  "metadata",
  "live_gsc",
  "queued",
  "external_write_allowed",
  "would_call_external_gsc"
]) {
  assert(!serializedAuditModels.includes(forbidden), `Audit frontend mapping leaked raw audit metadata: ${forbidden}`);
}

console.log("Audit API client fixture contract passed");
