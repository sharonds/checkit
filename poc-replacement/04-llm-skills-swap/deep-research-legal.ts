#!/usr/bin/env bun
/**
 * Deep Research Legal on 01-health with legal policy.
 * Single article, single mode (with-policy), ~$1.50 and ~10 min.
 * Uses the legal prompt shape but routes through the Deep Research Interactions API.
 * Output will be judged alongside MiniMax/Gemini/GPT-5.4 legal with-policy outputs.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { buildLegalPrompt } from "../../src/skills/legal.ts";

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

const KEY = process.env.GEMINI_API_KEY!;
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const article = readFileSync(join(import.meta.dir, "../../poc/articles/01-health.md"), "utf8");
const policy = readFileSync(join(import.meta.dir, "context/legal-policy.md"), "utf8");

const legalPrompt = buildLegalPrompt(article, policy);

// Wrap the standard legal prompt in a more research-oriented frame suited to Deep Research
const input = `You are performing a thorough legal and regulatory risk audit of the article below, using the company legal policy provided.

Research and cite the specific laws, regulations, FTC guidance, or FDA warning letter precedents that each flagged risk implicates. Do not limit yourself to high-level categories — name the specific statute, regulation number, or agency precedent where possible.

${legalPrompt}

ADDITIONAL INSTRUCTIONS FOR DEEP RESEARCH:
- For each finding, cite the specific legal source (statute, regulation, FDA/FTC/SEC guidance)
- Identify any risk categories the original prompt missed (e.g. DSHEA for supplements, specific state AG actions, CAN-SPAM if the article includes email capture, etc.)
- Rank findings by severity with justification based on actual enforcement precedent
- Recommend concrete remediation language for each high-severity finding`;

const t0 = Date.now();
console.log(`Submitting Deep Research legal audit for 01-health.md (~10 min)...\n`);

const createRes = await fetch(`${BASE}/interactions?key=${KEY}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input,
    agent: "deep-research-preview-04-2026",
    background: true,
    store: true,
    agent_config: {
      type: "deep-research",
      thinking_summaries: "auto",
      visualization: "off",
    },
  }),
});

if (!createRes.ok) {
  console.error(`✗ Create failed ${createRes.status}: ${(await createRes.text()).slice(0, 300)}`);
  process.exit(1);
}

const created = await createRes.json();
const id: string = created.id;
console.log(`  Deep Research ID: ${id}`);

const POLL_INTERVAL_MS = 15_000;
const MAX_POLLS = 80;
let pollCount = 0;
let data: Record<string, unknown> | null = null;

while (pollCount < MAX_POLLS) {
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  pollCount++;
  process.stdout.write(`\r  polling ${pollCount * 15}s...`);
  const r = await fetch(`${BASE}/interactions/${id}?key=${KEY}`);
  if (!r.ok) continue;
  data = await r.json();
  const status = (data as { status?: string; state?: string })?.status ?? (data as { state?: string })?.state ?? "";
  if (status === "failed") { process.stdout.write("\n"); console.error(`✗ Failed: ${JSON.stringify(data).slice(0, 500)}`); process.exit(1); }
  if (status === "completed" || status === "complete") break;
}

process.stdout.write("\n");
if (!data) { console.error("no data"); process.exit(1); }

function extractText(d: Record<string, unknown>): string {
  type Part = { text?: string };
  if (Array.isArray(d.outputs)) {
    const found = (d.outputs as Array<{ text?: string }>).find((o) => o.text);
    if (found?.text) return found.text;
  }
  if (typeof d.output === "string") return d.output;
  if (Array.isArray(d.candidates)) {
    const cands = d.candidates as Array<{ content?: { parts?: Part[] } }>;
    return cands[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  }
  return JSON.stringify(d, null, 2);
}

const text = extractText(data);
const elapsed = (Date.now() - t0) / 1000;

console.log(`✅ ${elapsed.toFixed(0)}s | ${text.length} chars | ~${text.split(/\s+/).length} words\n`);
console.log(text.slice(0, 1500));
console.log(text.length > 1500 ? "\n[...truncated...]" : "");

const outFile = join(import.meta.dir, `deep-research-legal-01-health-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  interactionId: id,
  article: "01-health",
  mode: "with-policy",
  prompt: input,
  output: text,
  elapsedSec: elapsed,
  estimatedCostUsd: 1.5,
}, null, 2));
console.log(`\n  Saved → ${outFile}\n`);
