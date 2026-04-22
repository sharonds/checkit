#!/usr/bin/env bun
/**
 * Diagnostic: why is Gemini grounded timing out in POC 3?
 *
 * Tests hypotheses progressively:
 *   T1: simple grounded call — baseline latency
 *   T2: ask for 1 paper — is it just the quantity?
 *   T3: ask for 3 papers — half the POC 3 quantity
 *   T4: ask for 5 papers — full POC 3 scope
 *   T5: short claim — was the claim length the issue?
 *   T6: thinkingLevel "low" instead of "high" — is thinking the bottleneck?
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

function loadEnv() {
  const candidates = [
    join(import.meta.dir, "../.env"),
    join(import.meta.dir, "../../.env"),
    join(import.meta.dir, "../../../.env"),
    join(import.meta.dir, "../../../../.env"),
    join(import.meta.dir, "../../../../../.env"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
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

async function groundedCall(prompt: string, thinking: "low" | "medium" | "high", timeoutMs = 180_000): Promise<{ ok: boolean; timeMs: number; chars: number; searchCount: number; error?: string }> {
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
    if (!res.ok) return { ok: false, timeMs: Date.now() - t0, chars: 0, searchCount: 0, error: `HTTP ${res.status}` };
    const data = await res.json();
    type GData = { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> }; groundingMetadata?: { webSearchQueries?: string[] } }> };
    const parts = (data as GData)?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => !p.thought && p.text).map((p) => p.text!).join("");
    const searches = (data as GData)?.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [];
    return { ok: true, timeMs: Date.now() - t0, chars: text.length, searchCount: searches.length };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, timeMs: Date.now() - t0, chars: 0, searchCount: 0, error: String(e) };
  }
}

const claim = "SGLT2 inhibitors reduce cardiovascular death and hospitalization for heart failure in patients with type 2 diabetes.";
const shortClaim = "Vitamin D reduces respiratory infections.";

const tests = [
  {
    name: "T1 simple grounded (baseline)",
    prompt: "What is the capital of France? Cite one source.",
    thinking: "low" as const,
  },
  {
    name: "T2 ask for 1 paper, short claim, LOW thinking",
    prompt: `Find 1 peer-reviewed paper that supports: "${shortClaim}". Return JSON: {"citations":[{"title","authors","year","doi","url"}]}`,
    thinking: "low" as const,
  },
  {
    name: "T3 ask for 5 papers, short claim, LOW thinking",
    prompt: `Find 5 peer-reviewed papers that support: "${shortClaim}". Return JSON: {"citations":[{"title","authors","year","doi","url"}]}`,
    thinking: "low" as const,
  },
  {
    name: "T4 ask for 5 papers, short claim, HIGH thinking",
    prompt: `Find 5 peer-reviewed papers that support: "${shortClaim}". Return JSON: {"citations":[{"title","authors","year","doi","url"}]}`,
    thinking: "high" as const,
  },
  {
    name: "T5 full POC 3 prompt (long claim + 5 papers + HIGH)",
    prompt: `Find 5 peer-reviewed academic papers that support this claim.\n\nClaim: "${claim}"\n\nReturn ONLY valid JSON (no markdown fences):\n{\n  "citations": [\n    {\n      "title": "<full paper title>",\n      "authors": "<authors as single string>",\n      "year": <integer year>,\n      "doi": "<DOI if known>",\n      "url": "<direct URL to paper>",\n      "relevance": "high" | "medium" | "low"\n    }\n  ]\n}\n\nReturn only peer-reviewed journal articles, conference papers, or formal meta-analyses.\nOrder from highest relevance to lowest. If fewer than 5 qualified papers exist, return fewer.`,
    thinking: "high" as const,
  },
  {
    name: "T6 full POC 3 prompt but LOW thinking",
    prompt: `Find 5 peer-reviewed academic papers that support this claim.\n\nClaim: "${claim}"\n\nReturn ONLY valid JSON (no markdown fences):\n{\n  "citations": [\n    {\n      "title": "<full paper title>",\n      "authors": "<authors as single string>",\n      "year": <integer year>,\n      "doi": "<DOI if known>",\n      "url": "<direct URL to paper>"\n    }\n  ]\n}`,
    thinking: "low" as const,
  },
];

console.log(`Diagnostic: ${tests.length} tests`);
for (const t of tests) {
  process.stdout.write(`\n${t.name}\n  running (thinking=${t.thinking})... `);
  const r = await groundedCall(t.prompt, t.thinking);
  if (r.ok) {
    console.log(`✅ ${(r.timeMs / 1000).toFixed(1)}s | ${r.chars} chars | ${r.searchCount} searches`);
  } else {
    console.log(`❌ ${(r.timeMs / 1000).toFixed(1)}s | ${r.error}`);
  }
}
