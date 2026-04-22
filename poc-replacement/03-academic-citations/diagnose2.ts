#!/usr/bin/env bun
/**
 * Diagnostic v2: retry the specific claims that timed out in the POC 3 run.
 * If they complete in < 90s cleanly, the POC timeouts were transient API latency.
 * If they consistently slow, the issue is claim-specific.
 */
import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnv() {
  const candidates = ["../.env", "../../.env", "../../../.env", "../../../../.env", "../../../../../.env"];
  for (const p of candidates) {
    const full = join(import.meta.dir, p);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
    return;
  }
}
loadEnv();
const KEY = process.env.GEMINI_API_KEY!;
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-3.1-pro-preview";

async function grounded(prompt: string, thinking: "low" | "high", timeoutMs = 240_000) {
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/models/${MODEL}:generateContent?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.1, thinkingConfig: { thinkingLevel: thinking } },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, timeMs: Date.now() - t0, searchCount: 0, papers: 0, error: `HTTP ${res.status}` };
    const data = await res.json();
    type GData = { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; groundingMetadata?: { webSearchQueries?: string[] } }> };
    const parts = (data as GData)?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => !p.thought && p.text).map((p) => p.text!).join("");
    const searches = (data as GData)?.candidates?.[0]?.groundingMetadata?.webSearchQueries?.length ?? 0;
    let papers = 0;
    try {
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const parsed = JSON.parse(cleaned);
      papers = parsed.citations?.length ?? 0;
    } catch { /* parse failed */ }
    return { ok: true, timeMs: Date.now() - t0, searchCount: searches, papers, chars: text.length };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, timeMs: Date.now() - t0, searchCount: 0, papers: 0, error: String(e) };
  }
}

const timedOutClaims = [
  { id: "M2", claim: "Statin therapy reduces major vascular events in high-risk populations regardless of baseline LDL cholesterol levels." },
  { id: "M4", claim: "Physical activity in midlife and later life is associated with reduced risk of dementia and cognitive decline." },
  { id: "S3", claim: "Base editing can introduce point mutations in DNA without creating double-strand breaks, offering higher precision than traditional CRISPR-Cas9." },
  { id: "F1", claim: "The Federal Reserve's large-scale asset purchase programs (quantitative easing) reduced longer-term interest rates during the 2008-2014 period." },
];

console.log("Testing the 4 claims that timed out in POC 3 run:\n");

for (const t of timedOutClaims) {
  const prompt = `Find 5 peer-reviewed academic papers that support this claim.\n\nClaim: "${t.claim}"\n\nReturn ONLY valid JSON (no markdown fences):\n{\n  "citations": [\n    {\n      "title": "<full paper title>",\n      "authors": "<authors as single string>",\n      "year": <integer year>,\n      "doi": "<DOI if known>",\n      "url": "<direct URL to paper>",\n      "relevance": "high" | "medium" | "low"\n    }\n  ]\n}\n\nReturn only peer-reviewed journal articles, conference papers, or formal meta-analyses.\nOrder from highest relevance to lowest. If fewer than 5 qualified papers exist, return fewer.`;
  process.stdout.write(`[${t.id}] running... `);
  const r = await grounded(prompt, "high");
  if (r.ok) {
    console.log(`✅ ${(r.timeMs / 1000).toFixed(1)}s | ${r.searchCount} searches | ${r.papers} papers returned`);
  } else {
    console.log(`❌ ${(r.timeMs / 1000).toFixed(1)}s | ${r.error}`);
  }
}
