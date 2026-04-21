import { openDb, type DeepAuditStatus } from "../src/db.ts";

const WEEK_MS = 7 * 24 * 60 * 60_000;

interface DeepAuditRow {
  id: number;
  status: DeepAuditStatus;
  started_at: number;
  completed_at: number | null;
  error_message: string | null;
  cost_estimate_usd: number;
}

const db = openDb(process.env.CHECKAPP_DB_PATH);

try {
  const audits = db.query<DeepAuditRow, []>(`
    SELECT
      id,
      status,
      started_at,
      completed_at,
      error_message,
      cost_estimate_usd
    FROM deep_audits
    ORDER BY started_at ASC, id ASC
  `).all();

  const statusCounts = countByStatus(audits);
  const failureCounts = countFailureCategories(audits);
  const totalFailures = Object.values(failureCounts).reduce((sum, count) => sum + count, 0);
  const completionDurations = audits
    .filter((audit) => audit.completed_at !== null && audit.completed_at >= audit.started_at)
    .map((audit) => audit.completed_at! - audit.started_at);
  const weeklyCost = audits
    .filter((audit) => audit.started_at >= Date.now() - WEEK_MS)
    .reduce((sum, audit) => sum + audit.cost_estimate_usd, 0);

  console.log(`Total audits: ${audits.length}`);
  console.log(`Status counts: pending=${statusCounts.pending} in_progress=${statusCounts.in_progress} completed=${statusCounts.completed} failed=${statusCounts.failed} stale=${statusCounts.stale}`);
  console.log(`Median completion time: ${formatDuration(median(completionDurations))}`);
  console.log(`Weekly cost estimate: $${weeklyCost.toFixed(2)}`);
  console.log("Failure rate by category:");

  if (totalFailures === 0) {
    console.log("- none");
  } else {
    for (const [category, count] of Object.entries(failureCounts).sort((a, b) => b[1] - a[1])) {
      const rate = (count / totalFailures) * 100;
      console.log(`- ${category}: ${count} (${rate.toFixed(1)}%)`);
    }
  }
} finally {
  db.close();
}

function countByStatus(audits: DeepAuditRow[]) {
  return audits.reduce<Record<DeepAuditStatus, number>>((counts, audit) => {
    counts[audit.status] += 1;
    return counts;
  }, {
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
    stale: 0,
  });
}

function countFailureCategories(audits: DeepAuditRow[]) {
  const counts: Record<string, number> = {};
  for (const audit of audits) {
    const category = failureCategory(audit);
    if (!category) continue;
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}

function failureCategory(audit: DeepAuditRow): string | null {
  const error = audit.error_message?.toLowerCase() ?? "";

  if (audit.status === "stale" || error.includes("stale threshold")) {
    return "stale";
  }
  if (audit.status !== "failed") {
    return null;
  }
  if (error.includes("was not found")) {
    return "interaction_not_found";
  }
  if (error.includes("create interaction") || error.includes("could not be started")) {
    return "creation_error";
  }
  if (error.includes("api key")) {
    return "configuration";
  }
  if (error.includes("failed")) {
    return "interaction_failed";
  }
  return "other";
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[midpoint];
  }
  return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "n/a";
  return `${(durationMs / 60_000).toFixed(1)} min`;
}
