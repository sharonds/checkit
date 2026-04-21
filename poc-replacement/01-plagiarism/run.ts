#!/usr/bin/env bun
/**
 * POC 1 — Plagiarism: Copyscape vs Gemini grounding
 *
 * For each test article in the corpus:
 *   1. Run Copyscape (csearch API) — records similarity %, matched URLs
 *   2. Run Gemini grounded — asks for sentence-level plagiarism detection
 *   3. Score both at sentence level and article level vs ground truth
 *
 * Usage:
 *   bun poc-replacement/01-plagiarism/run.ts
 *
 * Required env vars: COPYSCAPE_USER, COPYSCAPE_KEY, GEMINI_API_KEY
 * (loaded from root .env automatically)
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  CORPUS,
  COPYSCAPE_COST_PER_SEARCH_USD,
  type PlagiarismTestCase,
  type SentenceLabel,
} from "./corpus.ts";
import { callLlmGrounded, parseJson } from "../lib/gemini.ts";
import {
  computeConfusionMatrix,
  precisionRecall,
  printConfusionMatrix,
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

// ── Types ─────────────────────────────────────────────────────────────────────

interface CopyscapeMatch {
  url: string;
  title: string;
  wordsMatched: number;
  percentMatched: number;
  snippet: string;
}

interface CopyscapeResult {
  similarityPct: number;
  matches: CopyscapeMatch[];
  error?: string;
  timeMs: number;
  costUsd: number;
}

interface GeminiSentenceResult {
  sentence: string;
  isPlagiarized: boolean;
  confidence: "high" | "medium" | "low";
  sourceUrl?: string;
}

interface GeminiResult {
  overallSimilarity: number; // 0–100
  isPlagiarized: boolean;
  copiedSentences: GeminiSentenceResult[];
  rawText: string;
  sources: string[];
  searchQueries: string[];
  timeMs: number;
  costUsd: number;
  error?: string;
}

interface ArticleScore {
  id: string;
  groundTruth: {
    severity: "none" | "light" | "heavy";
    plagiarizedSentenceCount: number;
    totalSentences: number;
    plagiarizedPct: number;
  };
  copyscape: CopyscapeResult & {
    sentenceLevelBinaryResults: BinaryResult[];
    articleLevelCorrect: boolean;
  };
  gemini: GeminiResult & {
    sentenceLevelBinaryResults: BinaryResult[];
    sourceUrlMatchRate: number; // of correctly-flagged sentences, % with correct URL
    articleLevelCorrect: boolean;
  };
}

// ── Copyscape client ─────────────────────────────────────────────────────────

async function runCopyscape(text: string): Promise<CopyscapeResult> {
  const t0 = Date.now();
  const body = new URLSearchParams({
    u: COPYSCAPE_USER!,
    k: COPYSCAPE_KEY!,
    o: "csearch",
    e: "UTF-8",
    c: "10",
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
      return { similarityPct: 0, matches: [], error: `HTTP ${res.status}`, timeMs: Date.now() - t0, costUsd: COPYSCAPE_COST_PER_SEARCH_USD };
    }
    xml = await res.text();
  } catch (e) {
    return { similarityPct: 0, matches: [], error: String(e), timeMs: Date.now() - t0, costUsd: COPYSCAPE_COST_PER_SEARCH_USD };
  }

  const errorMatch = xml.match(/<error>([\s\S]*?)<\/error>/);
  if (errorMatch) {
    return { similarityPct: 0, matches: [], error: `Copyscape: ${errorMatch[1].trim()}`, timeMs: Date.now() - t0, costUsd: COPYSCAPE_COST_PER_SEARCH_USD };
  }

  const queryWords = parseInt(xml.match(/<querywords>(\d+)<\/querywords>/)?.[1] ?? "0");
  const allPct = parseInt(xml.match(/<allpercentmatched>(\d+)<\/allpercentmatched>/)?.[1] ?? "0");
  const allWords = parseInt(xml.match(/<allwordsmatched>(\d+)<\/allwordsmatched>/)?.[1] ?? "0");

  const matches: CopyscapeMatch[] = [];
  for (const block of [...xml.matchAll(/<result>([\s\S]*?)<\/result>/g)]) {
    const inner = block[1];
    const url = inner.match(/<url>(.*?)<\/url>/)?.[1]?.trim() ?? "";
    const title = inner.match(/<title>(.*?)<\/title>/)?.[1]?.trim() ?? url;
    const wordsMatched = parseInt(inner.match(/<wordsmatched>(\d+)<\/wordsmatched>/)?.[1] ?? "0");
    const pct = parseInt(inner.match(/<percentmatched>(\d+)<\/percentmatched>/)?.[1] ?? "0");
    let snippet = inner.match(/<htmlsnippet>([\s\S]*?)<\/htmlsnippet>/)?.[1]?.trim() ?? "";
    let prev = "";
    while (prev !== snippet) { prev = snippet; snippet = snippet.replace(/<[^>]*>/g, ""); }
    matches.push({ url, title, wordsMatched, percentMatched: pct, snippet });
  }

  const similarityPct = allPct > 0 ? allPct : queryWords > 0 ? Math.round((allWords / queryWords) * 100) : 0;
  return { similarityPct, matches, timeMs: Date.now() - t0, costUsd: COPYSCAPE_COST_PER_SEARCH_USD };
}

// ── Gemini grounded plagiarism detection ─────────────────────────────────────

async function runGemini(content: string): Promise<GeminiResult> {
  const t0 = Date.now();
  // Gemini grounding cost: ~$0.035 grounding + model cost per call
  const COST_PER_CALL = 0.038;

  const prompt = `You are a plagiarism detection engine. Analyze the following text and determine if any sentences were copied verbatim or near-verbatim from existing web sources.

For each sentence that appears to be verbatim or near-verbatim copied from the web, identify the source URL if found.

Text to analyze:
"""
${content}
"""

Return ONLY valid JSON (no markdown fences), in this exact format:
{
  "overallSimilarity": <0-100, estimated % of words that appear verbatim online>,
  "isPlagiarized": <true if any verbatim/near-verbatim copying detected>,
  "copiedSentences": [
    {
      "sentence": "<exact sentence text>",
      "isPlagiarized": true,
      "confidence": "high|medium|low",
      "sourceUrl": "<URL where this text was found, if identified>"
    }
  ]
}

Only include sentences in copiedSentences that you believe are plagiarized. Omit original sentences entirely.`;

  try {
    const { text, sources, searchQueries } = await callLlmGrounded(prompt);
    let parsed: { overallSimilarity: number; isPlagiarized: boolean; copiedSentences: GeminiSentenceResult[] };
    try {
      parsed = parseJson(text);
    } catch {
      return {
        overallSimilarity: 0, isPlagiarized: false, copiedSentences: [],
        rawText: text, sources: sources.map(s => s.uri), searchQueries,
        timeMs: Date.now() - t0, costUsd: COST_PER_CALL,
        error: `JSON parse failed: ${text.slice(0, 100)}`,
      };
    }
    return {
      overallSimilarity: parsed.overallSimilarity ?? 0,
      isPlagiarized: parsed.isPlagiarized ?? false,
      copiedSentences: parsed.copiedSentences ?? [],
      rawText: text,
      sources: sources.map(s => s.uri),
      searchQueries,
      timeMs: Date.now() - t0,
      costUsd: COST_PER_CALL,
    };
  } catch (e) {
    return {
      overallSimilarity: 0, isPlagiarized: false, copiedSentences: [],
      rawText: "", sources: [], searchQueries: [],
      timeMs: Date.now() - t0, costUsd: COST_PER_CALL,
      error: String(e),
    };
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function isPlagiarizedLabel(s: SentenceLabel): boolean {
  return s.status === "verbatim" || s.status === "near-verbatim";
}

/** Score Copyscape against sentence-level ground truth.
 *  Copyscape doesn't return per-sentence data. We approximate:
 *  - If a match URL matches a sentence's sourceUrl → all sentences from that source are "detected"
 *  - Sentences from unmatched sources (or original) → "not detected"
 */
function scoreCopyscapeSentences(
  sentences: SentenceLabel[],
  cs: CopyscapeResult
): BinaryResult[] {
  const matchedUrls = new Set(cs.matches.map(m => {
    try { return new URL(m.url).hostname; } catch { return m.url; }
  }));

  return sentences.map((s): BinaryResult => {
    const actual = isPlagiarizedLabel(s) ? "positive" : "negative";
    let predicted: "positive" | "negative" = "negative";

    if (isPlagiarizedLabel(s) && s.sourceUrl) {
      try {
        const host = new URL(s.sourceUrl).hostname;
        if (matchedUrls.has(host)) predicted = "positive";
      } catch { /* skip */ }
    } else if (cs.similarityPct >= 16) {
      // If no source URL to match but Copyscape flagged something, treat all plagiarized
      // sentences as detected (conservative over-credit to Copyscape)
      if (isPlagiarizedLabel(s)) predicted = "positive";
    }

    return { predicted, actual };
  });
}

/** Score Gemini sentence-level output against ground truth. */
function scoreGeminiSentences(
  sentences: SentenceLabel[],
  gemini: GeminiResult
): { results: BinaryResult[]; sourceUrlMatchRate: number } {
  const flaggedSentences = new Set(
    gemini.copiedSentences.map(cs => cs.sentence.trim().slice(0, 60))
  );
  const flaggedWithUrl = new Map(
    gemini.copiedSentences
      .filter(cs => cs.sourceUrl)
      .map(cs => [cs.sentence.trim().slice(0, 60), cs.sourceUrl!])
  );

  const results: BinaryResult[] = sentences.map((s): BinaryResult => {
    const actual = isPlagiarizedLabel(s) ? "positive" : "negative";
    const key = s.sentence.trim().slice(0, 60);
    const predicted: "positive" | "negative" = flaggedSentences.has(key) ? "positive" : "negative";
    return { predicted, actual };
  });

  // Source URL match rate: of sentences Gemini correctly flagged as plagiarized,
  // what fraction did it also identify the correct source URL?
  let correctlyFlagged = 0;
  let correctUrlMatch = 0;
  for (const s of sentences) {
    if (!isPlagiarizedLabel(s) || !s.sourceUrl) continue;
    const key = s.sentence.trim().slice(0, 60);
    if (!flaggedSentences.has(key)) continue;
    correctlyFlagged++;
    const geminiUrl = flaggedWithUrl.get(key);
    if (geminiUrl) {
      try {
        const geminiHost = new URL(geminiUrl).hostname;
        const gtHost = new URL(s.sourceUrl).hostname;
        if (geminiHost.includes(gtHost.split(".").slice(-2).join("."))) correctUrlMatch++;
      } catch { /* skip */ }
    }
  }

  const sourceUrlMatchRate = correctlyFlagged === 0 ? 0 : correctUrlMatch / correctlyFlagged;
  return { results, sourceUrlMatchRate };
}

function articleLevelCorrect(
  groundTruth: ArticleScore["groundTruth"],
  detected: boolean
): boolean {
  const isActuallyPlagiarized = groundTruth.severity !== "none";
  return detected === isActuallyPlagiarized;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const LINE = "─".repeat(72);
console.log(`\n${"═".repeat(72)}`);
console.log(`  POC 1 — Plagiarism: Copyscape vs Gemini grounding`);
console.log(`${"═".repeat(72)}`);
console.log(`  Corpus   : ${CORPUS.length} articles (3 heavy / 3 light / 2 paraphrased / 2 original)`);
console.log(`  Started  : ${new Date().toISOString()}\n`);

const scores: ArticleScore[] = [];
let totalCopyscapeCost = 0;
let totalGeminiCost = 0;

for (const article of CORPUS) {
  console.log(`\n${LINE}`);
  console.log(`  [${article.id}] ${article.title}`);
  console.log(`  Severity : ${article.overallSeverity.toUpperCase()}`);

  const plagSentences = article.sentences.filter(isPlagiarizedLabel);
  const groundTruth = {
    severity: article.overallSeverity,
    plagiarizedSentenceCount: plagSentences.length,
    totalSentences: article.sentences.length,
    plagiarizedPct: (plagSentences.length / article.sentences.length) * 100,
  };
  console.log(`  GT       : ${plagSentences.length}/${article.sentences.length} plagiarised sentences (${groundTruth.plagiarizedPct.toFixed(0)}%)`);

  // Run both engines in parallel
  process.stdout.write("  Running Copyscape + Gemini in parallel...");
  const [cs, gem] = await Promise.all([
    runCopyscape(article.content),
    runGemini(article.content),
  ]);
  console.log(` done (${(cs.timeMs / 1000).toFixed(1)}s / ${(gem.timeMs / 1000).toFixed(1)}s)`);

  totalCopyscapeCost += cs.costUsd;
  totalGeminiCost += gem.costUsd;

  if (cs.error) console.log(`  Copyscape error: ${cs.error}`);
  if (gem.error) console.log(`  Gemini error: ${gem.error}`);

  // Score sentence level
  const csSentBinary = scoreCopyscapeSentences(article.sentences, cs);
  const { results: gemSentBinary, sourceUrlMatchRate } = scoreGeminiSentences(article.sentences, gem);

  const csCm = computeConfusionMatrix(csSentBinary);
  const gemCm = computeConfusionMatrix(gemSentBinary);
  const csPrf = precisionRecall(csCm);
  const gemPrf = precisionRecall(gemCm);

  const csArticleCorrect = articleLevelCorrect(groundTruth, cs.similarityPct >= 16 || cs.matches.length > 0);
  const gemArticleCorrect = articleLevelCorrect(groundTruth, gem.isPlagiarized);

  // Print per-article results
  console.log(`\n  COPYSCAPE — similarity: ${cs.similarityPct}% | matches: ${cs.matches.length}`);
  if (cs.matches.length > 0) {
    for (const m of cs.matches.slice(0, 3)) {
      console.log(`    ↳ ${m.url} (${m.wordsMatched} words / ${m.percentMatched}%)`);
    }
  }
  printConfusionMatrix("  Copyscape sentence-level", csCm, csPrf);
  console.log(`  Article verdict : ${csArticleCorrect ? "✅ correct" : "❌ wrong"}`);

  console.log(`\n  GEMINI — similarity: ${gem.overallSimilarity}% | plagiarized: ${gem.isPlagiarized}`);
  console.log(`  Flagged ${gem.copiedSentences.length} sentences | searches: ${gem.searchQueries.slice(0, 2).join(" | ")}`);
  if (gem.copiedSentences.length > 0) {
    for (const cs2 of gem.copiedSentences.slice(0, 3)) {
      console.log(`    ↳ [${cs2.confidence}] "${cs2.sentence.slice(0, 60)}..." → ${cs2.sourceUrl ?? "no URL"}`);
    }
  }
  printConfusionMatrix("  Gemini sentence-level", gemCm, gemPrf);
  console.log(`  Source URL match rate: ${fmtPct(sourceUrlMatchRate)}`);
  console.log(`  Article verdict : ${gemArticleCorrect ? "✅ correct" : "❌ wrong"}`);

  scores.push({
    id: article.id,
    groundTruth,
    copyscape: { ...cs, sentenceLevelBinaryResults: csSentBinary, articleLevelCorrect: csArticleCorrect },
    gemini: { ...gem, sentenceLevelBinaryResults: gemSentBinary, sourceUrlMatchRate, articleLevelCorrect: gemArticleCorrect },
  });
}

// ── Aggregate scores ──────────────────────────────────────────────────────────

console.log(`\n\n${"═".repeat(72)}`);
console.log(`  AGGREGATE RESULTS — ${CORPUS.length} articles`);
console.log(`${"═".repeat(72)}`);

const allCsBinary: BinaryResult[] = scores.flatMap(s => s.copyscape.sentenceLevelBinaryResults);
const allGemBinary: BinaryResult[] = scores.flatMap(s => s.gemini.sentenceLevelBinaryResults);

const csCmAgg = computeConfusionMatrix(allCsBinary);
const gemCmAgg = computeConfusionMatrix(allGemBinary);
const csPrfAgg = precisionRecall(csCmAgg);
const gemPrfAgg = precisionRecall(gemCmAgg);

const csArticleCorrect = scores.filter(s => s.copyscape.articleLevelCorrect).length;
const gemArticleCorrect = scores.filter(s => s.gemini.articleLevelCorrect).length;
const avgGemUrlMatch = scores.reduce((a, s) => a + s.gemini.sourceUrlMatchRate, 0) / scores.length;

printConfusionMatrix("Copyscape — sentence level (all articles)", csCmAgg, csPrfAgg);
printConfusionMatrix("Gemini    — sentence level (all articles)", gemCmAgg, gemPrfAgg);

console.log(`\n  Article-level accuracy`);
console.log(`  Copyscape: ${csArticleCorrect}/${CORPUS.length} (${fmtPct(csArticleCorrect / CORPUS.length)})`);
console.log(`  Gemini   : ${gemArticleCorrect}/${CORPUS.length} (${fmtPct(gemArticleCorrect / CORPUS.length)})`);
console.log(`\n  Gemini source-URL match rate (avg): ${fmtPct(avgGemUrlMatch)}`);

console.log(`\n  Cost`);
console.log(`  Copyscape : $${totalCopyscapeCost.toFixed(4)} ($${COPYSCAPE_COST_PER_SEARCH_USD}/search × ${CORPUS.length})`);
console.log(`  Gemini    : $${totalGeminiCost.toFixed(4)} (~$0.038/call × ${CORPUS.length})`);
console.log(`  Ratio     : Gemini is ${(totalGeminiCost / totalCopyscapeCost).toFixed(1)}× more expensive`);
console.log(`  Acceptance criterion: replace if Gemini ≤ $${(COPYSCAPE_COST_PER_SEARCH_USD * 2).toFixed(3)}/search (2× Copyscape)`);
console.log(`  Gemini cost per call: $${(totalGeminiCost / CORPUS.length).toFixed(4)} → ${totalGeminiCost / CORPUS.length <= COPYSCAPE_COST_PER_SEARCH_USD * 2 ? "✅ within" : "❌ exceeds"} 2× threshold`);

// ── Save results ──────────────────────────────────────────────────────────────

const resultsDir = join(import.meta.dir);
const outFile = join(resultsDir, `results-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  corpus: CORPUS.map(c => ({ id: c.id, severity: c.overallSeverity, sentences: c.sentences.length })),
  aggregate: {
    copyscape: { cm: csCmAgg, prf: csPrfAgg, articleAccuracy: csArticleCorrect / CORPUS.length, totalCost: totalCopyscapeCost },
    gemini: { cm: gemCmAgg, prf: gemPrfAgg, articleAccuracy: gemArticleCorrect / CORPUS.length, avgSourceUrlMatchRate: avgGemUrlMatch, totalCost: totalGeminiCost },
  },
  perArticle: scores,
}, null, 2));
console.log(`\n  Results saved → ${outFile}\n`);
