#!/usr/bin/env bun
/**
 * Sanity check: verify OpenAI API key works with gpt-5.4-mini.
 * Does one judge-style structured-JSON call.
 */
import { existsSync, readFileSync } from "fs";
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

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error("✗ OPENAI_API_KEY missing");
  process.exit(1);
}

const MODEL = "gpt-5.4-mini";
const t0 = Date.now();

console.log(`Testing ${MODEL} with a judge-style prompt...`);

const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: `You are a judge comparing two AI outputs. Rate each on a 1-5 scale for "specificity".

Output A: "The article is good but could be more specific."
Output B: "The article's second paragraph repeats the claim 'our product saves time' four times without citing data; replace with the specific metric from the case study (38% reduction)."

Return ONLY valid JSON: {"A": <1-5>, "B": <1-5>, "better": "A"|"B"|"tie"}`,
      },
    ],
  }),
});

if (!res.ok) {
  const body = await res.text();
  console.error(`✗ HTTP ${res.status}: ${body.slice(0, 300)}`);
  process.exit(1);
}

const data = await res.json();
const text = data.choices?.[0]?.message?.content ?? "";
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`✅ ${elapsed}s | Model responded`);
console.log(`   Raw: ${text}`);

const usage = data.usage;
if (usage) {
  console.log(`   Tokens: ${usage.prompt_tokens} in + ${usage.completion_tokens} out = ${usage.total_tokens}`);
  // gpt-5.4-mini: $0.75/MTok in, $4.50/MTok out
  const cost = (usage.prompt_tokens * 0.75 + usage.completion_tokens * 4.50) / 1_000_000;
  console.log(`   Cost: $${cost.toFixed(6)}`);
}

// Attempt JSON parse
try {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned);
  console.log(`✅ JSON parsed: A=${parsed.A}, B=${parsed.B}, better=${parsed.better}`);
} catch (e) {
  console.log(`⚠️  JSON parse failed: ${String(e).slice(0, 100)}`);
}
