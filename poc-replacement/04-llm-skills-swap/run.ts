#!/usr/bin/env bun
/**
 * POC 4 — LLM Skill Swap: MiniMax-M2.7 vs Gemini 3.1 Pro vs GPT-5.4
 *
 * For each of 3 articles × 5 skills:
 *   1. Run each skill with each of 3 providers (MiniMax, Gemini, GPT-5.4)
 *   2. Judge all A/B pairs with gpt-5.4-mini (per-skill rubric, blinded)
 *   3. Cross-pass with Gemini Pro judge on 30% of pairs for bias check
 *
 * Legal also runs in two modes: with policy doc, without policy doc.
 *
 * Env: MINIMAX_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { buildTonePrompt } from "../../src/skills/tone.ts";
import { buildLegalPrompt } from "../../src/skills/legal.ts";
import { buildSummaryPrompt } from "../../src/skills/summary.ts";
import { buildBriefPrompt } from "../../src/skills/brief.ts";
import { buildPurposePrompt } from "../../src/skills/purpose.ts";

// ── Env ───────────────────────────────────────────────────────────────────────

function loadEnv() {
  const paths = ["../.env", "../../.env", "../../../.env", "../../../../.env", "../../../../../.env"];
  for (const p of paths) {
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

const MINIMAX_KEY = process.env.MINIMAX_API_KEY!;
const GEMINI_KEY = process.env.GEMINI_API_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
for (const [k, v] of [["MINIMAX_API_KEY", MINIMAX_KEY], ["GEMINI_API_KEY", GEMINI_KEY], ["OPENAI_API_KEY", OPENAI_KEY]]) {
  if (!v) { console.error(`✗ ${k} missing`); process.exit(1); }
}

// ── Models pinned ─────────────────────────────────────────────────────────────

const MODELS = {
  minimax: "MiniMax-M2.7",
  gemini: "gemini-3.1-pro-preview",
  openai: "gpt-5.4",              // flagship for skill contender
  judge: "gpt-5.4-mini",          // independent judge
} as const;

type ProviderId = "minimax" | "gemini" | "openai";

// ── Provider calls ───────────────────────────────────────────────────────────

interface ProviderResult { text: string; timeMs: number; costUsd: number; error?: string; }

async function callMinimax(prompt: string): Promise<ProviderResult> {
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.minimax.io/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: { Authorization: `Bearer ${MINIMAX_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELS.minimax,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) return { text: "", timeMs: Date.now() - t0, costUsd: 0, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    // MiniMax-M2.7: ~$0.0006/1K input, ~$0.0024/1K output (approximate public pricing)
    const cost = (data.usage?.prompt_tokens ?? 0) * 0.6e-6 + (data.usage?.completion_tokens ?? 0) * 2.4e-6;
    return { text, timeMs: Date.now() - t0, costUsd: cost };
  } catch (e) {
    return { text: "", timeMs: Date.now() - t0, costUsd: 0, error: String(e) };
  }
}

async function callGemini(prompt: string): Promise<ProviderResult> {
  const t0 = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent?key=${GEMINI_KEY}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.1, thinkingConfig: { thinkingLevel: "medium" } },
      }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) return { text: "", timeMs: Date.now() - t0, costUsd: 0, error: `HTTP ${res.status}` };
    const data = await res.json();
    type G = { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
    const parts = (data as G)?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => !p.thought && p.text).map((p) => p.text!).join("");
    const cost = ((data as G)?.usageMetadata?.promptTokenCount ?? 0) * 1.25e-6 + ((data as G)?.usageMetadata?.candidatesTokenCount ?? 0) * 10e-6;
    return { text, timeMs: Date.now() - t0, costUsd: cost };
  } catch (e) {
    return { text: "", timeMs: Date.now() - t0, costUsd: 0, error: String(e) };
  }
}

async function callOpenAI(prompt: string, model = MODELS.openai as string): Promise<ProviderResult> {
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(180_000),
    });
    if (!res.ok) return { text: "", timeMs: Date.now() - t0, costUsd: 0, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    // gpt-5.4: ~$2.50/MTok in, $15/MTok out (frontier).  gpt-5.4-mini: $0.75 / $4.50
    const rates = model.includes("mini") ? { i: 0.75e-6, o: 4.50e-6 } : { i: 2.50e-6, o: 15e-6 };
    const cost = (data.usage?.prompt_tokens ?? 0) * rates.i + (data.usage?.completion_tokens ?? 0) * rates.o;
    return { text, timeMs: Date.now() - t0, costUsd: cost };
  } catch (e) {
    return { text: "", timeMs: Date.now() - t0, costUsd: 0, error: String(e) };
  }
}

const CALLERS: Record<ProviderId, (p: string) => Promise<ProviderResult>> = {
  minimax: callMinimax,
  gemini: callGemini,
  openai: (p) => callOpenAI(p),
};

// ── Per-skill rubric (from ANNOTATION-GUIDELINES.md) ─────────────────────────

type SkillId = "tone" | "legal" | "summary" | "brief" | "purpose";

const RUBRICS: Record<SkillId, { dimensions: Array<{ key: string; desc: string }> }> = {
  tone: {
    dimensions: [
      { key: "specificity", desc: "Does the output quote specific sentences/phrases from the article, or make generic observations?" },
      { key: "voice_guide_alignment", desc: "How well does the output map article language to the brand voice guide dimensions?" },
      { key: "rewrite_quality", desc: "Are there concrete, in-voice rewrite suggestions for flagged sections?" },
    ],
  },
  legal: {
    dimensions: [
      { key: "risk_specificity", desc: "Does the output name the specific law/regulation/compliance clause at risk, or just say 'consult a lawyer'?" },
      { key: "severity_calibration", desc: "Does the severity assessment match the actual legal exposure (low/medium/high)?" },
      { key: "actionability", desc: "Does the output provide specific remediation (which clause to add, which phrase to remove)?" },
    ],
  },
  summary: {
    dimensions: [
      { key: "topic_accuracy", desc: "Does the summary capture the article's specific topic and angle?" },
      { key: "argument_capture", desc: "Does the summary capture the main argument and supporting sub-arguments?" },
      { key: "audience_identification", desc: "Does the summary correctly identify the likely target audience?" },
    ],
  },
  brief: {
    dimensions: [
      { key: "requirement_coverage", desc: "Does the output check every explicit requirement in the brief?" },
      { key: "miss_detection", desc: "Does the output identify requirements the article fails to address?" },
      { key: "alignment_score", desc: "Does the output provide a scored alignment with per-requirement breakdown?" },
    ],
  },
  purpose: {
    dimensions: [
      { key: "type_match", desc: "Does the output correctly identify the article's specific content type?" },
      { key: "recommendations_quality", desc: "Are the recommendations tailored to the identified article type, not generic SEO/writing advice?" },
    ],
  },
};

// ── Judge call ────────────────────────────────────────────────────────────────

interface JudgeVerdict {
  scoresA: Record<string, number>;
  scoresB: Record<string, number>;
  reasoning: string;
  raw: string;
}

async function judgePair(skill: SkillId, articleSlug: string, outputA: string, outputB: string, judgeModel = MODELS.judge as string): Promise<JudgeVerdict> {
  const rubric = RUBRICS[skill];
  const dimLines = rubric.dimensions.map((d) => `- **${d.key}** (1-5): ${d.desc}`).join("\n");
  const schemaA = rubric.dimensions.map((d) => `"${d.key}": <1-5>`).join(", ");
  const prompt = `You are evaluating two AI outputs for a CheckApp "${skill}" skill on article ${articleSlug}.

Rubric dimensions for this skill:
${dimLines}

Output A:
"""
${outputA.slice(0, 3500)}
"""

Output B:
"""
${outputB.slice(0, 3500)}
"""

Rate each output on each dimension (1-5 integer). Return ONLY valid JSON (no markdown):
{"A": { ${schemaA} }, "B": { ${schemaA} }, "reasoning": "<one sentence comparing the outputs>"}`;

  const raw = await callOpenAI(prompt, judgeModel);
  if (raw.error) return { scoresA: {}, scoresB: {}, reasoning: "judge error: " + raw.error, raw: "" };
  try {
    const cleaned = raw.text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return { scoresA: parsed.A ?? {}, scoresB: parsed.B ?? {}, reasoning: parsed.reasoning ?? "", raw: raw.text };
  } catch {
    return { scoresA: {}, scoresB: {}, reasoning: "judge JSON parse failed", raw: raw.text };
  }
}

// ── Corpus ────────────────────────────────────────────────────────────────────

const articleRoot = join(import.meta.dir, "../../poc/articles");
const contextRoot = join(import.meta.dir, "context");

const voiceGuide = readFileSync(join(contextRoot, "voice-guide.md"), "utf8");
const legalPolicy = readFileSync(join(contextRoot, "legal-policy.md"), "utf8");
const contentBrief = readFileSync(join(contextRoot, "content-brief.md"), "utf8");

const ARTICLES = [
  { slug: "01-health", text: readFileSync(join(articleRoot, "01-health.md"), "utf8") },
  { slug: "02-finance", text: readFileSync(join(articleRoot, "02-finance.md"), "utf8") },
  { slug: "03-tech", text: readFileSync(join(articleRoot, "03-tech.md"), "utf8") },
];

function promptFor(skill: SkillId, text: string, legalMode: "with-policy" | "no-policy" = "with-policy"): string {
  switch (skill) {
    case "tone": return buildTonePrompt(text, voiceGuide);
    case "legal": return buildLegalPrompt(text, legalMode === "with-policy" ? legalPolicy : undefined);
    case "summary": return buildSummaryPrompt(text);
    case "brief": return buildBriefPrompt(text, contentBrief);
    case "purpose": return buildPurposePrompt(text);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const LINE = "─".repeat(72);
console.log(`\n${"═".repeat(72)}`);
console.log(`  POC 4 — LLM Skill Swap (3-way)`);
console.log(`${"═".repeat(72)}`);
console.log(`  Providers : ${MODELS.minimax} / ${MODELS.gemini} / ${MODELS.openai}`);
console.log(`  Judge     : ${MODELS.judge}`);
console.log(`  Articles  : ${ARTICLES.map((a) => a.slug).join(", ")}`);
console.log(`  Skills    : tone, legal, summary, brief, purpose`);
console.log(`  Started   : ${new Date().toISOString()}\n`);

interface CellOutput {
  article: string;
  skill: SkillId | "legal-no-policy";
  provider: ProviderId;
  result: ProviderResult;
}

const outputs: CellOutput[] = [];
let totalCost = 0;

const skills: Array<SkillId | "legal-no-policy"> = ["tone", "legal", "legal-no-policy", "summary", "brief", "purpose"];

for (const article of ARTICLES) {
  for (const skill of skills) {
    const actualSkill: SkillId = skill === "legal-no-policy" ? "legal" : skill;
    const mode = skill === "legal-no-policy" ? "no-policy" : "with-policy";
    const prompt = promptFor(actualSkill, article.text, mode);
    console.log(`\n${LINE}\n  [${article.slug}] ${skill}  (${prompt.length} chars prompt)`);
    const [mini, gem, gpt] = await Promise.all([
      CALLERS.minimax(prompt),
      CALLERS.gemini(prompt),
      CALLERS.openai(prompt),
    ]);
    for (const [pid, r] of [["minimax", mini], ["gemini", gem], ["openai", gpt]] as const) {
      totalCost += r.costUsd;
      console.log(`    ${pid.padEnd(8)} ${r.error ? "❌ " + r.error.slice(0, 80) : "✅ " + (r.timeMs / 1000).toFixed(1) + "s / $" + r.costUsd.toFixed(4) + " / " + r.text.length + " chars"}`);
      outputs.push({ article: article.slug, skill, provider: pid, result: r });
    }
  }
}

console.log(`\n\n  Provider calls done. Total cost: $${totalCost.toFixed(4)}. Starting judging...\n`);

// ── Judging: three pairs per cell (minimax-vs-gemini, minimax-vs-gpt, gemini-vs-gpt) ──

interface JudgeRecord {
  article: string;
  skill: string;
  pair: string;  // e.g. "minimax_vs_gemini"
  providerA: ProviderId;
  providerB: ProviderId;
  verdict: JudgeVerdict;
}

const judgments: JudgeRecord[] = [];
let judgeCost = 0;

function getCell(article: string, skill: string, pid: ProviderId) {
  return outputs.find((o) => o.article === article && o.skill === skill && o.provider === pid);
}

const PAIRS: Array<[ProviderId, ProviderId]> = [["minimax", "gemini"], ["minimax", "openai"], ["gemini", "openai"]];

for (const article of ARTICLES) {
  for (const skill of skills) {
    for (const [a, b] of PAIRS) {
      const cellA = getCell(article.slug, skill, a);
      const cellB = getCell(article.slug, skill, b);
      if (!cellA || !cellB || cellA.result.error || cellB.result.error) {
        console.log(`  [${article.slug}] ${skill} ${a}_vs_${b}: SKIP (missing/error)`);
        continue;
      }
      // Randomize A/B assignment so judge can't learn positional bias
      const flip = Math.random() < 0.5;
      const outA = flip ? cellB.result.text : cellA.result.text;
      const outB = flip ? cellA.result.text : cellB.result.text;
      const verdict = await judgePair(skill.replace("legal-no-policy", "legal") as SkillId, article.slug, outA, outB);
      judgeCost += 0.001; // gpt-5.4-mini typical judge call cost

      // Unflip scores to attribute correctly
      const attributed: JudgeVerdict = flip
        ? { scoresA: verdict.scoresB, scoresB: verdict.scoresA, reasoning: verdict.reasoning, raw: verdict.raw }
        : verdict;

      judgments.push({ article: article.slug, skill, pair: `${a}_vs_${b}`, providerA: a, providerB: b, verdict: attributed });
      const meanA = Object.values(attributed.scoresA).reduce((x, y) => x + y, 0) / (Object.values(attributed.scoresA).length || 1);
      const meanB = Object.values(attributed.scoresB).reduce((x, y) => x + y, 0) / (Object.values(attributed.scoresB).length || 1);
      console.log(`  [${article.slug}] ${skill.padEnd(18)} ${a}=${meanA.toFixed(2)} vs ${b}=${meanB.toFixed(2)} ${meanA > meanB ? "← " + a : meanB > meanA ? "← " + b : "(tie)"}`);
    }
  }
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

console.log(`\n\n${"═".repeat(72)}\n  AGGREGATE\n${"═".repeat(72)}`);

function meanScore(scores: Record<string, number>): number {
  const v = Object.values(scores).filter((x) => typeof x === "number");
  return v.length === 0 ? 0 : v.reduce((a, b) => a + b, 0) / v.length;
}

// Per-skill mean score per provider
const skillMeans: Record<string, Record<ProviderId, number[]>> = {};
for (const j of judgments) {
  const s = skillMeans[j.skill] ??= { minimax: [], gemini: [], openai: [] };
  s[j.providerA].push(meanScore(j.verdict.scoresA));
  s[j.providerB].push(meanScore(j.verdict.scoresB));
}

console.log(`\n  Mean score per skill (averaged across judgments — 1-5 scale)`);
console.log(`  Skill                 MiniMax   Gemini   GPT-5.4`);
for (const [skill, byProv] of Object.entries(skillMeans)) {
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  console.log(`  ${skill.padEnd(22)} ${avg(byProv.minimax).toFixed(2).padStart(6)}   ${avg(byProv.gemini).toFixed(2).padStart(6)}   ${avg(byProv.openai).toFixed(2).padStart(6)}`);
}

// Pairwise wins per skill
console.log(`\n  Pairwise wins (count of article-skill cells where provider scored higher)`);
const winCounts: Record<string, Record<string, number>> = {};
for (const j of judgments) {
  const ma = meanScore(j.verdict.scoresA);
  const mb = meanScore(j.verdict.scoresB);
  const wc = winCounts[j.pair] ??= { [j.providerA]: 0, [j.providerB]: 0, tie: 0 };
  if (ma > mb + 0.1) wc[j.providerA]++;
  else if (mb > ma + 0.1) wc[j.providerB]++;
  else wc.tie++;
}
for (const [pair, wc] of Object.entries(winCounts)) {
  const [a, b] = pair.split("_vs_");
  console.log(`  ${pair}: ${a}=${wc[a] ?? 0} / ${b}=${wc[b] ?? 0} / ties=${wc.tie}`);
}

console.log(`\n  Cost`);
console.log(`  Providers: $${totalCost.toFixed(4)}`);
console.log(`  Judge    : $${judgeCost.toFixed(4)}`);
console.log(`  Total    : $${(totalCost + judgeCost).toFixed(4)}`);

// ── Save ──────────────────────────────────────────────────────────────────────

const outFile = join(import.meta.dir, `results-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify({ timestamp: new Date().toISOString(), models: MODELS, outputs, judgments, skillMeans, winCounts, totalCost, judgeCost }, null, 2));
console.log(`\n  Results saved → ${outFile}\n`);
