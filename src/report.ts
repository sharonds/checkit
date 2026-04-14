import type { SkillResult } from "./skills/types.ts";
import type { CheckRecord } from "./db.ts";

const VERDICT_COLOR: Record<string, string> = {
  pass: "#16a34a",
  warn: "#ca8a04",
  fail: "#dc2626",
};

const SEVERITY_COLOR: Record<string, string> = {
  info: "#2563eb",
  warn: "#ca8a04",
  error: "#dc2626",
};

function scoreBar(score: number, verdict: string): string {
  const color = VERDICT_COLOR[verdict] ?? "#6b7280";
  return `<div style="background:#e5e7eb;border-radius:4px;height:8px;width:100%;margin-top:6px">
    <div style="background:${color};border-radius:4px;height:8px;width:${score}%"></div>
  </div>`;
}

function skillCard(r: SkillResult): string {
  const color = VERDICT_COLOR[r.verdict] ?? "#6b7280";
  const badge = `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600">${r.verdict.toUpperCase()}</span>`;
  const findingsHtml = r.findings.length === 0 ? "" : `
    <ul style="margin:12px 0 0 0;padding-left:20px;font-size:13px;color:#374151">
      ${r.findings.map((f) => `
        <li style="margin-bottom:6px">
          <span style="color:${SEVERITY_COLOR[f.severity]};font-weight:600">[${f.severity.toUpperCase()}]</span>
          ${escapeHtml(f.text)}
          ${f.quote ? `<br><em style="color:#6b7280;font-size:12px">"${escapeHtml(f.quote.slice(0, 120))}${f.quote.length > 120 ? "…" : ""}"</em>` : ""}
        </li>`).join("")}
    </ul>`;

  return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:700;font-size:16px;color:#111827">${escapeHtml(r.name)}</span>
      <span style="display:flex;align-items:center;gap:12px">
        <span style="font-size:24px;font-weight:800;color:${color}">${r.score}</span>
        ${badge}
      </span>
    </div>
    ${scoreBar(r.score, r.verdict)}
    <p style="margin:8px 0 0 0;font-size:13px;color:#6b7280">${escapeHtml(r.summary)}</p>
    ${r.error ? `<p style="margin:8px 0 0 0;font-size:12px;color:#dc2626">⚠ ${escapeHtml(r.error)}</p>` : ""}
    ${findingsHtml}
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateReport(record: Omit<CheckRecord, "id" | "createdAt"> & { createdAt?: string }): string {
  const overallScore = record.results.length > 0
    ? Math.round(record.results.reduce((s, r) => s + r.score, 0) / record.results.length)
    : 0;
  const overallVerdict = record.results.some((r) => r.verdict === "fail") ? "fail"
    : record.results.some((r) => r.verdict === "warn") ? "warn" : "pass";

  const now = record.createdAt ?? new Date().toISOString().replace("T", " ").slice(0, 19);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Article Checker — ${escapeHtml(record.source)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 24px; color: #111827; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { background: #111827; color: #fff; border-radius: 8px; padding: 24px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size:12px;color:#9ca3af;margin-bottom:4px">Article Checker Report</div>
      <div style="font-size:20px;font-weight:700;margin-bottom:12px">${escapeHtml(record.source)}</div>
      <div style="display:flex;gap:24px;font-size:13px;color:#d1d5db">
        <span>${record.wordCount.toLocaleString()} words</span>
        <span>${now}</span>
        <span>$${record.totalCostUsd.toFixed(3)} API cost</span>
        <span style="color:${VERDICT_COLOR[overallVerdict]};font-weight:700">Overall: ${overallScore}/100</span>
      </div>
    </div>
    ${record.results.map(skillCard).join("")}
  </div>
</body>
</html>`;
}
