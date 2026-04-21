import { readConfig } from "../src/config.ts";
import { openDb, type DeepAuditParentType, type DeepAuditRequestedBy, type DeepAuditStatus } from "../src/db.ts";
import { FactCheckDeepResearchSkill } from "../src/skills/factcheck-deep-research.ts";
import { emitAuditStaleEvent } from "../src/telemetry/audit-events.ts";

const STALE_THRESHOLD_MS = 90 * 60_000;
const STALE_MESSAGE = "Deep Audit exceeded the 90 minute stale threshold.";

interface DeepAuditRow {
  id: number;
  parent_type: DeepAuditParentType;
  parent_key: string;
  interaction_id: string | null;
  status: DeepAuditStatus;
  requested_by: DeepAuditRequestedBy;
  started_at: number;
  completed_at: number | null;
  error_message: string | null;
}

const dbPath = process.env.CHECKAPP_DB_PATH;
const db = openDb(dbPath);

try {
  const config = readConfig();
  const now = Date.now();
  const skill = config.geminiApiKey
    ? new FactCheckDeepResearchSkill({ db, dbPath, now: () => Date.now() })
    : null;

  const summary = {
    scanned: 0,
    pending: 0,
    polled: 0,
    completed: 0,
    failed: 0,
    stale: 0,
    stillInProgress: 0,
    skippedNoGeminiKey: 0,
    missingInteractionId: 0,
    errors: 0,
  };

  for (const audit of listActiveAudits()) {
    summary.scanned++;
    const ageMs = now - audit.started_at;

    if (ageMs > STALE_THRESHOLD_MS) {
      markAuditStale(audit, now, ageMs);
      summary.stale++;
      continue;
    }

    if (audit.status === "pending") {
      summary.pending++;
      continue;
    }

    if (!audit.interaction_id) {
      summary.missingInteractionId++;
      continue;
    }

    if (!skill) {
      summary.skippedNoGeminiKey++;
      continue;
    }

    try {
      summary.polled++;
      await skill.fetchResult(audit.interaction_id, config);
      const refreshed = getAuditById(audit.id) ?? audit;

      if (refreshed.status === "completed") {
        summary.completed++;
      } else if (refreshed.status === "failed") {
        summary.failed++;
      } else {
        summary.stillInProgress++;
      }
    } catch (error) {
      summary.errors++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to reconcile audit ${audit.id}: ${message}`);
    }
  }

  console.log(JSON.stringify({
    staleThresholdMinutes: STALE_THRESHOLD_MS / 60_000,
    ...summary,
  }, null, 2));
} finally {
  db.close();
}

function listActiveAudits(): DeepAuditRow[] {
  return db.query<DeepAuditRow, []>(`
    SELECT
      id,
      parent_type,
      parent_key,
      interaction_id,
      status,
      requested_by,
      started_at,
      completed_at,
      error_message
    FROM deep_audits
    WHERE status IN ('pending', 'in_progress')
    ORDER BY started_at ASC, id ASC
  `).all();
}

function getAuditById(id: number): DeepAuditRow | null {
  return db.query<DeepAuditRow, [number]>(`
    SELECT
      id,
      parent_type,
      parent_key,
      interaction_id,
      status,
      requested_by,
      started_at,
      completed_at,
      error_message
    FROM deep_audits
    WHERE id = ?
    LIMIT 1
  `).get(id) ?? null;
}

function markAuditStale(audit: DeepAuditRow, completedAt: number, ageMs: number) {
  db.run(
    `UPDATE deep_audits
     SET
       status = 'stale',
       completed_at = COALESCE(completed_at, ?),
       error_message = COALESCE(error_message, ?)
     WHERE id = ?`,
    [completedAt, STALE_MESSAGE, audit.id],
  );

  emitAuditStaleEvent({
    provider: "gemini-deep-research",
    auditId: audit.id,
    interactionId: audit.interaction_id,
    parentType: audit.parent_type,
    parentKey: audit.parent_key,
    requestedBy: audit.requested_by,
    ageMs,
    reason: audit.error_message ?? STALE_MESSAGE,
  });
}
