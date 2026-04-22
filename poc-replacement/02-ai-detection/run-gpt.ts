#!/usr/bin/env bun
/**
 * POC 2 supplement — add GPT-5.4 as a third AI detector to compare against
 * Copyscape and Gemini. Loads existing results from the original POC 2 run,
 * runs only GPT-5.4 on the same corpus, prints 3-way aggregate.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { CORPUS, type AIDetectionTestCase } from "./corpus.ts";
import {
  computeConfusionMatrix,
  precisionRecall,
  printConfusionMatrix,
  spearman,
  fmtPct,
  type BinaryResult,
} from "../lib/scoring.ts";

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

const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const MODEL = "gpt-5.4";

interface GptAiResult {
  aiProbability: number;
  confidence: "low" | "medium" | "high";
  reasoning: string;
  timeMs: number;
  costUsd: number;
  error?: string;
}

async function runGpt(text: string): Promise<GptAiResult> {
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
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages: [{ role: "user", content: prompt }] }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) return { aiProbability: 50, confidence: "low", reasoning: "", timeMs: Date.now() - t0, costUsd: 0, error: `HTTP ${res.status}` };
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage;
    const cost = (usage?.prompt_tokens ?? 0) * 2.5e-6 + (usage?.completion_tokens ?? 0) * 15e-6;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      const parsed = JSON.parse(cleaned);
      return { aiProbability: parsed.aiProbability ?? 50, confidence: parsed.confidence ?? "low", reasoning: parsed.reasoning ?? "", timeMs: Date.now() - t0, costUsd: cost };
    } catch {
      return { aiProbability: 50, confidence: "low", reasoning: raw.slice(0, 200), timeMs: Date.now() - t0, costUsd: cost, error: "JSON parse failed" };
    }
  } catch (e) {
    return { aiProbability: 50, confidence: "low", reasoning: "", timeMs: Date.now() - t0, costUsd: 0, error: String(e) };
  }
}

function toBinary(pred: "AI" | "HUMAN", actual: "AI" | "HUMAN"): BinaryResult {
  return { predicted: pred === "AI" ? "positive" : "negative", actual: actual === "AI" ? "positive" : "negative" };
}

// ── Load existing results for Copyscape + Gemini ─────────────────────────────

const files = readdirSync(import.meta.dir).filter((f) => /^results-\d+\.json$/.test(f)).sort();
const latestResults = files[files.length - 1];
if (!latestResults) { console.error("no existing results found"); process.exit(1); }
console.log(`Loading existing results from ${latestResults}`);
const prior = JSON.parse(readFileSync(join(import.meta.dir, latestResults), "utf8"));

interface PriorScore {
  id: string;
  label: "AI" | "HUMAN";
  aiWordPercentage: number;
  provenance: string;
  copyscape: { aiPct: number };
  copyscapePredicted: "AI" | "HUMAN";
  copyscapeCorrect: boolean;
  gemini: { aiProbability: number };
  geminiPredicted: "AI" | "HUMAN";
  geminiCorrect: boolean;
}
const priorScores: PriorScore[] = prior.perSample;

console.log(`\nRunning GPT-5.4 on ${CORPUS.length} samples...\n`);

interface FullScore extends PriorScore {
  gpt: GptAiResult;
  gptPredicted: "AI" | "HUMAN";
  gptCorrect: boolean;
}

const scores: FullScore[] = [];
let gptCost = 0;

for (const sample of CORPUS) {
  const p = priorScores.find((x) => x.id === sample.id);
  if (!p) { console.log(`  [${sample.id}] SKIP (no prior)`); continue; }
  process.stdout.write(`  [${sample.id}] GT=${sample.label} running... `);
  const r = await runGpt(sample.content);
  gptCost += r.costUsd;
  const pred = r.aiProbability > 50 ? "AI" : "HUMAN";
  const correct = pred === sample.label;
  console.log(`${r.aiProbability}% → ${pred} ${correct ? "✅" : "❌"} | CS=${p.copyscapePredicted} ${p.copyscapeCorrect ? "✅" : "❌"} Gem=${p.geminiPredicted} ${p.geminiCorrect ? "✅" : "❌"}`);
  if (r.error) console.log(`    error: ${r.error}`);
  scores.push({ ...p, gpt: r, gptPredicted: pred, gptCorrect: correct });
}

// ── Aggregate 3-way ──────────────────────────────────────────────────────────

console.log(`\n\n${"═".repeat(72)}\n  3-WAY AGGREGATE — ${scores.length} samples\n${"═".repeat(72)}`);

const csBinary = scores.map((s) => toBinary(s.copyscapePredicted, s.label));
const gemBinary = scores.map((s) => toBinary(s.geminiPredicted, s.label));
const gptBinary = scores.map((s) => toBinary(s.gptPredicted, s.label));

const csCm = computeConfusionMatrix(csBinary);
const gemCm = computeConfusionMatrix(gemBinary);
const gptCm = computeConfusionMatrix(gptBinary);

printConfusionMatrix("Copyscape", csCm, precisionRecall(csCm));
printConfusionMatrix("Gemini", gemCm, precisionRecall(gemCm));
printConfusionMatrix("GPT-5.4", gptCm, precisionRecall(gptCm));

const actual = scores.map((s) => s.aiWordPercentage);
const csPct = scores.map((s) => s.copyscape.aiPct);
const gemPct = scores.map((s) => s.gemini.aiProbability);
const gptPct = scores.map((s) => s.gpt.aiProbability);

console.log(`\n  Spearman calibration (vs actual AI word %)`);
console.log(`  Copyscape: ${spearman(csPct, actual).toFixed(3)}`);
console.log(`  Gemini   : ${spearman(gemPct, actual).toFixed(3)}`);
console.log(`  GPT-5.4  : ${spearman(gptPct, actual).toFixed(3)}`);

const provenances = ["pure-human", "pure-ai", "ai-then-edited", "human-then-polished"];
console.log(`\n  Accuracy by provenance type:`);
console.log(`  Provenance             Copyscape  Gemini     GPT-5.4`);
for (const prov of provenances) {
  const subset = scores.filter((s) => s.provenance === prov);
  if (!subset.length) continue;
  const cs = subset.filter((s) => s.copyscapeCorrect).length;
  const gem = subset.filter((s) => s.geminiCorrect).length;
  const gpt = subset.filter((s) => s.gptCorrect).length;
  console.log(`  ${prov.padEnd(22)} ${cs}/${subset.length}        ${gem}/${subset.length}        ${gpt}/${subset.length}`);
}

console.log(`\n  Cost (GPT-5.4 only): $${gptCost.toFixed(4)}`);

const outFile = join(import.meta.dir, `results-3way-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify({ timestamp: new Date().toISOString(), scores, csCm, gemCm, gptCm, gptCost }, null, 2));
console.log(`  Saved → ${outFile}\n`);
