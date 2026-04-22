#!/usr/bin/env bun
/**
 * POC 2 — AI Detection: Copyscape AI detector vs Gemini
 *
 * Framing: "prove unsuitable" experiment. LLMs are not trained to detect LLM output;
 * statistical classifiers use perplexity and burstiness features that general LLMs
 * don't have direct access to. We expect Gemini to underperform.
 *
 * Usage:
 *   bun poc-replacement/02-ai-detection/run.ts
 *
 * Env: COPYSCAPE_USER, COPYSCAPE_KEY, GEMINI_API_KEY
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  CORPUS,
  COPYSCAPE_AI_COST_PER_CHECK_USD,
  GEMINI_COST_PER_CALL_USD,
  type AIDetectionTestCase,
} from "./corpus.ts";
import { callLlm, parseJson } from "../lib/gemini.ts";
import {
  computeConfusionMatrix,
  precisionRecall,
  printConfusionMatrix,
  spearman,
  fmtPct,
  type BinaryResult,
} from "../lib/scoring.ts";

// ── Env ───────────────────────────────────────────────────────────────────────

function loadEnv() {
  const candidates = [
    join(import.meta.dir, "../.env"),
    join(import.meta.dir, "../../.env"),
    join(import.meta.dir, "../../../.env"),
    join(import.meta.dir, "../../../../.env"),
    join(import.meta.dir, "../../../../../.env"),
  ];
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
    return;
  }
}
loadEnv();

const COPYSCAPE_USER = process.env.COPYSCAPE_USER;
const COPYSCAPE_KEY = process.env.COPYSCAPE_KEY;
if (!COPYSCAPE_USER || !COPYSCAPE_KEY) {
  console.error("✗ COPYSCAPE_USER or COPYSCAPE_KEY missing");
  process.exit(1);
}

// ── Copyscape AI detector ─────────────────────────────────────────────────────

interface CopyscapeAiResult {
  aiScore: number; // 0–1
  aiPct: number;   // 0–100
  verdict: "human" | "mixed" | "ai";
  error?: string;
  timeMs: number;
  costUsd: number;
}

async function runCopyscapeAi(text: string): Promise<CopyscapeAiResult> {
  const t0 = Date.now();
  const body = new URLSearchParams({
    u: COPYSCAPE_USER!,
    k: COPYSCAPE_KEY!,
    o: "aicheck",
    e: "UTF-8",
    f: "xml",
    t: text,
  });

  let xml = "";
  try {
    const res = await fetch("https://www.copyscape.com/api/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      return { aiScore: 0, aiPct: 0, verdict: "human", error: `HTTP ${res.status}`, timeMs: Date.now() - t0, costUsd: COPYSCAPE_AI_COST_PER_CHECK_USD };
    }
    xml = await res.text();
  } catch (e) {
    return { aiScore: 0, aiPct: 0, verdict: "human", error: String(e), timeMs: Date.now() - t0, costUsd: COPYSCAPE_AI_COST_PER_CHECK_USD };
  }

  const errorMatch = xml.match(/<error>([\s\S]*?)<\/error>/);
  if (errorMatch) {
    return { aiScore: 0, aiPct: 0, verdict: "human", error: `Copyscape: ${errorMatch[1].trim()}`, timeMs: Date.now() - t0, costUsd: COPYSCAPE_AI_COST_PER_CHECK_USD };
  }

  const globalScore = parseFloat(xml.match(/<aiscore>([\d.]+)<\/aiscore>/)?.[1] ?? "0");
  const aiPct = Math.round(globalScore * 100);
  const verdict: "human" | "mixed" | "ai" = aiPct >= 70 ? "ai" : aiPct >= 30 ? "mixed" : "human";

  return { aiScore: globalScore, aiPct, verdict, timeMs: Date.now() - t0, costUsd: COPYSCAPE_AI_COST_PER_CHECK_USD };
}

// ── Gemini AI detector ────────────────────────────────────────────────────────

interface GeminiAiResult {
  aiProbability: number; // 0–100
  confidence: "low" | "medium" | "high";
  reasoning: string;
  error?: string;
  timeMs: number;
  costUsd: number;
}

async function runGeminiAi(text: string): Promise<GeminiAiResult> {
  const t0 = Date.now();

  const prompt = `Analyze the following text and estimate the probability that it was AI-generated.

Consider patterns like:
- Vocabulary variety (repetitive / formulaic phrasing is AI-like)
- Sentence structure uniformity (overly balanced parallel structures)
- Common AI phrases ("it is important to note", "in today's world", "in conclusion")
- Hedging language ("may", "might", "can be", "tends to")
- Lack of specific personal details, names, places, dates
- Generic vs. idiosyncratic tone

Text to analyze:
"""
${text}
"""

Return ONLY valid JSON (no markdown fences):
{
  "aiProbability": <integer 0-100, your estimated probability the text was AI-generated>,
  "confidence": "low" | "medium" | "high",
  "reasoning": "<one sentence explaining your estimate, citing specific features>"
}`;

  try {
    const raw = await callLlm(prompt);
    let parsed: { aiProbability: number; confidence: string; reasoning: string };
    try {
      parsed = parseJson(raw);
    } catch {
      return { aiProbability: 50, confidence: "low", reasoning: raw.slice(0, 200), error: "JSON parse failed", timeMs: Date.now() - t0, costUsd: GEMINI_COST_PER_CALL_USD };
    }
    return {
      aiProbability: parsed.aiProbability ?? 50,
      confidence: (parsed.confidence ?? "low") as "low" | "medium" | "high",
      reasoning: parsed.reasoning ?? "",
      timeMs: Date.now() - t0,
      costUsd: GEMINI_COST_PER_CALL_USD,
    };
  } catch (e) {
    return { aiProbability: 50, confidence: "low", reasoning: "", error: String(e), timeMs: Date.now() - t0, costUsd: GEMINI_COST_PER_CALL_USD };
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

interface SampleScore {
  id: string;
  label: "AI" | "HUMAN";
  aiWordPercentage: number;
  provenance: AIDetectionTestCase["provenance"];
  copyscape: CopyscapeAiResult;
  copyscapePredicted: "AI" | "HUMAN";
  copyscapeCorrect: boolean;
  gemini: GeminiAiResult;
  geminiPredicted: "AI" | "HUMAN";
  geminiCorrect: boolean;
}

function toBinaryResult(predicted: "AI" | "HUMAN", actual: "AI" | "HUMAN"): BinaryResult {
  return {
    predicted: predicted === "AI" ? "positive" : "negative",
    actual: actual === "AI" ? "positive" : "negative",
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const FILTER = process.env.FILTER;
const selectedCorpus = FILTER
  ? CORPUS.filter((c) => FILTER.split(",").some((f) => c.id.includes(f.trim())))
  : CORPUS;

const LINE = "─".repeat(72);
console.log(`\n${"═".repeat(72)}`);
console.log(`  POC 2 — AI Detection: Copyscape vs Gemini`);
console.log(`${"═".repeat(72)}`);
console.log(`  Corpus   : ${selectedCorpus.length} samples${FILTER ? ` (filter: ${FILTER})` : ""}`);
console.log(`  Framing  : "prove unsuitable" — expect Gemini to underperform on its own output`);
console.log(`  Started  : ${new Date().toISOString()}\n`);

const scores: SampleScore[] = [];
let totalCopyscapeCost = 0;
let totalGeminiCost = 0;

for (const sample of selectedCorpus) {
  console.log(`\n${LINE}`);
  console.log(`  [${sample.id}]`);
  console.log(`  GT: ${sample.label} (${sample.aiWordPercentage}% AI-written, ${sample.provenance})`);

  process.stdout.write("  Running Copyscape AI + Gemini in parallel...");
  const [cs, gem] = await Promise.all([
    runCopyscapeAi(sample.content),
    runGeminiAi(sample.content),
  ]);
  console.log(` done (${(cs.timeMs / 1000).toFixed(1)}s / ${(gem.timeMs / 1000).toFixed(1)}s)`);

  totalCopyscapeCost += cs.costUsd;
  totalGeminiCost += gem.costUsd;

  if (cs.error) console.log(`  Copyscape error: ${cs.error}`);
  if (gem.error) console.log(`  Gemini error: ${gem.error}`);

  const copyscapePredicted = cs.aiPct > 50 ? "AI" : "HUMAN";
  const geminiPredicted = gem.aiProbability > 50 ? "AI" : "HUMAN";
  const copyscapeCorrect = copyscapePredicted === sample.label;
  const geminiCorrect = geminiPredicted === sample.label;

  console.log(`  Copyscape : ${cs.aiPct}% AI → predicted ${copyscapePredicted} ${copyscapeCorrect ? "✅" : "❌"} (verdict: ${cs.verdict})`);
  console.log(`  Gemini    : ${gem.aiProbability}% AI → predicted ${geminiPredicted} ${geminiCorrect ? "✅" : "❌"} (conf: ${gem.confidence})`);
  if (gem.reasoning) console.log(`    reason: ${gem.reasoning.slice(0, 120)}`);

  scores.push({
    id: sample.id,
    label: sample.label,
    aiWordPercentage: sample.aiWordPercentage,
    provenance: sample.provenance,
    copyscape: cs,
    copyscapePredicted,
    copyscapeCorrect,
    gemini: gem,
    geminiPredicted,
    geminiCorrect,
  });
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

console.log(`\n\n${"═".repeat(72)}`);
console.log(`  AGGREGATE RESULTS — ${selectedCorpus.length} samples`);
console.log(`${"═".repeat(72)}`);

const csBinary = scores.map((s) => toBinaryResult(s.copyscapePredicted, s.label));
const gemBinary = scores.map((s) => toBinaryResult(s.geminiPredicted, s.label));

const csCm = computeConfusionMatrix(csBinary);
const gemCm = computeConfusionMatrix(gemBinary);
const csPrf = precisionRecall(csCm);
const gemPrf = precisionRecall(gemCm);

printConfusionMatrix("Copyscape AI detector", csCm, csPrf);
printConfusionMatrix("Gemini (prompt-based)", gemCm, gemPrf);

// Spearman calibration: engine probability vs actual aiWordPercentage
const actualPct = scores.map((s) => s.aiWordPercentage);
const csPct = scores.map((s) => s.copyscape.aiPct);
const gemPct = scores.map((s) => s.gemini.aiProbability);
const csSpearman = spearman(csPct, actualPct);
const gemSpearman = spearman(gemPct, actualPct);

console.log(`\n  Calibration (Spearman correlation with actual AI word %)`);
console.log(`  Copyscape: ${csSpearman.toFixed(3)}`);
console.log(`  Gemini   : ${gemSpearman.toFixed(3)}`);

// Per-provenance accuracy
console.log(`\n  Accuracy by provenance type:`);
const provenances: AIDetectionTestCase["provenance"][] = ["pure-human", "pure-ai", "ai-then-edited", "human-then-polished"];
for (const prov of provenances) {
  const subset = scores.filter((s) => s.provenance === prov);
  if (subset.length === 0) continue;
  const csRight = subset.filter((s) => s.copyscapeCorrect).length;
  const gemRight = subset.filter((s) => s.geminiCorrect).length;
  console.log(`  ${prov.padEnd(22)} CS: ${csRight}/${subset.length} | Gem: ${gemRight}/${subset.length}`);
}

console.log(`\n  Cost`);
console.log(`  Copyscape : $${totalCopyscapeCost.toFixed(4)} ($${COPYSCAPE_AI_COST_PER_CHECK_USD}/check × ${selectedCorpus.length})`);
console.log(`  Gemini    : $${totalGeminiCost.toFixed(4)} (~$${GEMINI_COST_PER_CALL_USD}/call × ${selectedCorpus.length})`);

// ── Save results ──────────────────────────────────────────────────────────────

const outFile = join(import.meta.dir, `results-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  corpus: selectedCorpus.map((c) => ({ id: c.id, label: c.label, provenance: c.provenance, aiWordPercentage: c.aiWordPercentage })),
  aggregate: {
    copyscape: { cm: csCm, prf: csPrf, spearman: csSpearman, totalCost: totalCopyscapeCost },
    gemini: { cm: gemCm, prf: gemPrf, spearman: gemSpearman, totalCost: totalGeminiCost },
  },
  perSample: scores,
}, null, 2));
console.log(`\n  Results saved → ${outFile}\n`);
