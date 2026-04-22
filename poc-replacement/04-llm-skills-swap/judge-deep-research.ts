#!/usr/bin/env bun
/**
 * Judge Deep Research legal output vs MiniMax/Gemini/GPT-5.4 legal with-policy
 * outputs for the 01-health article. Uses gpt-5.4-mini as judge.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

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
const JUDGE = "gpt-5.4-mini";

// Load the latest POC 4 results
const files = readdirSync(import.meta.dir).filter((f) => /^results-\d+\.json$/.test(f)).sort();
const latest = files[files.length - 1];
const poc4 = JSON.parse(readFileSync(join(import.meta.dir, latest), "utf8"));

// Load Deep Research output
const drFiles = readdirSync(import.meta.dir).filter((f) => /^deep-research-legal-01-health-\d+\.json$/.test(f)).sort();
const dr = JSON.parse(readFileSync(join(import.meta.dir, drFiles[drFiles.length - 1]), "utf8"));

// Find the 01-health legal outputs (not legal-no-policy) for each provider
type Provider = "minimax" | "gemini" | "openai";
const outputs: Record<Provider, string> = { minimax: "", gemini: "", openai: "" };
for (const o of poc4.outputs) {
  if (o.article === "01-health" && o.skill === "legal") {
    outputs[o.provider as Provider] = o.result.text;
  }
}

async function judge(outputA: string, outputB: string): Promise<{ a: Record<string, number>; b: Record<string, number>; reasoning: string } | null> {
  const prompt = `You are evaluating two AI outputs for a CheckApp "legal" skill — auditing a health/nutrition article against a company legal policy.

Rubric dimensions:
- **risk_specificity** (1-5): Does the output name the specific law/regulation/compliance clause at risk, or just say "consult a lawyer"?
- **severity_calibration** (1-5): Does the severity assessment match the actual legal exposure?
- **actionability** (1-5): Does the output provide specific remediation (which clause to add, which phrase to remove)?

Output A:
"""
${outputA.slice(0, 6000)}
"""

Output B:
"""
${outputB.slice(0, 6000)}
"""

Rate each on each dimension (integer 1-5). Return ONLY valid JSON:
{"A":{"risk_specificity":<1-5>,"severity_calibration":<1-5>,"actionability":<1-5>},"B":{"risk_specificity":<1-5>,"severity_calibration":<1-5>,"actionability":<1-5>},"reasoning":"<one sentence>"}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: JUDGE, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  try {
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return { a: parsed.A, b: parsed.B, reasoning: parsed.reasoning };
  } catch { return null; }
}

console.log("Judging Deep Research vs MiniMax/Gemini/GPT-5.4 on legal with-policy, 01-health...\n");

const providers: Provider[] = ["minimax", "gemini", "openai"];
const results: Array<{ opponent: Provider; drScores: Record<string, number>; opponentScores: Record<string, number>; reasoning: string }> = [];

for (const opp of providers) {
  process.stdout.write(`DR vs ${opp}... `);
  // Randomize position
  const flip = Math.random() < 0.5;
  const [A, B] = flip ? [outputs[opp], dr.output] : [dr.output, outputs[opp]];
  const v = await judge(A, B);
  if (!v) { console.log("judge failed"); continue; }
  const drScores = flip ? v.b : v.a;
  const oppScores = flip ? v.a : v.b;
  const drMean = Object.values(drScores).reduce((x, y) => x + y, 0) / 3;
  const oppMean = Object.values(oppScores).reduce((x, y) => x + y, 0) / 3;
  console.log(`DR=${drMean.toFixed(2)} vs ${opp}=${oppMean.toFixed(2)} ${drMean > oppMean ? "← DR" : oppMean > drMean ? "← " + opp : "(tie)"}`);
  console.log(`  reason: ${v.reasoning.slice(0, 180)}`);
  results.push({ opponent: opp, drScores, opponentScores: oppScores, reasoning: v.reasoning });
}

console.log(`\n${"═".repeat(60)}`);
console.log(`  Aggregate — Deep Research vs each:`);
for (const r of results) {
  const drMean = Object.values(r.drScores).reduce((x, y) => x + y, 0) / 3;
  const oppMean = Object.values(r.opponentScores).reduce((x, y) => x + y, 0) / 3;
  console.log(`  vs ${r.opponent.padEnd(8)} DR=${drMean.toFixed(2)} vs opponent=${oppMean.toFixed(2)}  Δ=${(drMean - oppMean).toFixed(2)}`);
}

const outFile = join(import.meta.dir, `dr-judgement-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify({ timestamp: new Date().toISOString(), judge: JUDGE, drWordCount: dr.output.split(/\s+/).length, drElapsedSec: dr.elapsedSec, drCostUsd: dr.estimatedCostUsd, results }, null, 2));
console.log(`\n  Saved → ${outFile}\n`);
