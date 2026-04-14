import type { SkillResult } from "./skills/types.ts";
import type { CheckRecord } from "./db.ts";

const VERDICT_COLOR: Record<string, string> = {
  pass: "#16a34a",
  warn: "#d97706",
  fail: "#dc2626",
};

const VERDICT_BG: Record<string, string> = {
  pass: "#f0fdf4",
  warn: "#fffbeb",
  fail: "#fef2f2",
};

const VERDICT_BORDER: Record<string, string> = {
  pass: "#bbf7d0",
  warn: "#fde68a",
  fail: "#fecaca",
};

const SEVERITY_ICON: Record<string, string> = {
  warn: "⚠️",
  error: "❌",
};

const ENGINE_LABEL: Record<string, { label: string; color: string }> = {
  "plagiarism": { label: "Copyscape", color: "#0078D4" },
  "ai-detection": { label: "Copyscape", color: "#0078D4" },
  "seo": { label: "Offline", color: "#6b7280" },
  "fact-check": { label: "Exa AI", color: "#7c3aed" },
  "tone": { label: "MiniMax", color: "#0891b2" },
  "legal": { label: "MiniMax", color: "#0891b2" },
};

function scoreBar(score: number, verdict: string): string {
  const color = VERDICT_COLOR[verdict] ?? "#6b7280";
  return `<div style="background:#e5e7eb;border-radius:4px;height:6px;width:100%;margin-top:10px">
    <div style="background:${color};border-radius:4px;height:6px;width:${score}%;transition:width 0.3s"></div>
  </div>`;
}

function engineBadge(skillId: string): string {
  const eng = ENGINE_LABEL[skillId];
  if (!eng) return "";
  return `<span style="font-size:11px;font-weight:500;color:${eng.color};background:${eng.color}18;padding:2px 8px;border-radius:10px;border:1px solid ${eng.color}44">${eng.label}</span>`;
}

function skillCard(r: SkillResult): string {
  const color = VERDICT_COLOR[r.verdict] ?? "#6b7280";
  const bg = VERDICT_BG[r.verdict] ?? "#f9fafb";
  const border = VERDICT_BORDER[r.verdict] ?? "#e5e7eb";

  const badge = `<span style="background:${color};color:#fff;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;letter-spacing:0.04em">${r.verdict.toUpperCase()}</span>`;

  // Only show warn and error findings — info is noise when skills run
  const visibleFindings = r.findings.filter((f) => f.severity === "warn" || f.severity === "error");
  const findingsHtml = visibleFindings.length === 0 ? "" : `
    <ul style="margin:12px 0 0 0;padding:0;list-style:none">
      ${visibleFindings.map((f) => `
        <li style="margin-bottom:8px;padding:8px 12px;background:#fff;border-radius:6px;border:1px solid #f3f4f6;font-size:13px;color:#374151;line-height:1.5">
          <span style="margin-right:5px">${SEVERITY_ICON[f.severity] ?? ""}</span>${escapeHtml(f.text)}
          ${f.quote ? `<div style="margin-top:4px;padding:4px 8px;background:#f9fafb;border-left:3px solid #d1d5db;border-radius:2px;font-style:italic;font-size:12px;color:#6b7280">"${escapeHtml(f.quote.slice(0, 140))}${f.quote.length > 140 ? "…" : ""}"</div>` : ""}
        </li>`).join("")}
    </ul>`;

  return `<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:20px;margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <span style="font-weight:700;font-size:15px;color:#111827">${escapeHtml(r.name)}</span>
        <span style="margin-left:8px">${engineBadge(r.skillId)}</span>
      </div>
      <span style="display:flex;align-items:center;gap:10px;flex-shrink:0;margin-left:16px">
        <span style="font-size:22px;font-weight:800;color:${color}">${r.score}</span>
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

function overallBanner(score: number, verdict: string, wordCount: number, costUsd: number, now: string): string {
  const color = VERDICT_COLOR[verdict] ?? "#6b7280";
  const label = verdict === "pass" ? "Ready to publish" : verdict === "warn" ? "Needs attention" : "Do not publish";
  const labelBg = verdict === "pass" ? "#dcfce7" : verdict === "warn" ? "#fef3c7" : "#fee2e2";

  return `<div style="background:#111827;color:#fff;border-radius:12px;padding:24px 28px;margin-bottom:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:11px;letter-spacing:0.08em;color:#9ca3af;text-transform:uppercase;margin-bottom:6px">Article Checker</div>
        <div style="font-size:32px;font-weight:800;color:${color};line-height:1">${score}<span style="font-size:16px;color:#9ca3af;font-weight:400">/100</span></div>
        <div style="margin-top:6px"><span style="background:${labelBg};color:${color};font-size:12px;font-weight:700;padding:3px 10px;border-radius:10px">${label}</span></div>
      </div>
      <div style="text-align:right;font-size:13px;color:#9ca3af;line-height:2">
        <div>${wordCount.toLocaleString()} words</div>
        <div>$${costUsd.toFixed(3)} API cost</div>
        <div>${now}</div>
      </div>
    </div>
  </div>`;
}

export function generateReport(record: Omit<CheckRecord, "id" | "createdAt"> & { createdAt?: string }): string {
  const overallScore = record.results.length > 0
    ? Math.round(record.results.reduce((s, r) => s + r.score, 0) / record.results.length)
    : 0;
  const overallVerdict = record.results.some((r) => r.verdict === "fail") ? "fail"
    : record.results.some((r) => r.verdict === "warn") ? "warn" : "pass";

  const now = record.createdAt ?? new Date().toISOString().replace("T", " ").slice(0, 16);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Article Checker — ${escapeHtml(record.source)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; margin: 0; padding: 28px 16px; color: #111827; }
    .container { max-width: 780px; margin: 0 auto; }
    .source { font-size: 13px; color: #6b7280; margin-bottom: 14px; word-break: break-all; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    .footer a { color: #9ca3af; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    ${overallBanner(overallScore, overallVerdict, record.wordCount, record.totalCostUsd, now)}
    <div class="source">${escapeHtml(record.source)}</div>
    ${record.results.map(skillCard).join("")}
    <div class="footer">
      Built with <a href="https://github.com/sharonds/article-checker">Article Checker</a>
      &nbsp;·&nbsp; Plagiarism &amp; AI Detection by <a href="https://copyscape.com">Copyscape</a>
      &nbsp;·&nbsp; Fact Check by <a href="https://exa.ai">Exa AI</a>
      &nbsp;·&nbsp; AI analysis by <a href="https://platform.minimax.io">MiniMax</a>
    </div>
  </div>
</body>
</html>`;
}
