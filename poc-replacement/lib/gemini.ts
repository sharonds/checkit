/**
 * Shared Gemini client for poc-replacement POCs.
 * Extracted from poc/validate.ts — same model, same retry logic, same auth.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnv() {
  // Try multiple candidates: main repo checkout (poc/ is one level from root),
  // and worktree (poc-replacement/lib/ is five levels from checkapp root).
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

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("✗ GEMINI_API_KEY missing");
  process.exit(1);
}

export const MODEL = "gemini-3.1-pro-preview";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GroundingSource {
  uri: string;
  title: string;
}

function extractText(data: unknown): string {
  type GData = {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    }>;
  };
  const parts = (data as GData)?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text!)
    .join("")
    .trim();
}

/** Plain LLM call — low thinking, no grounding. Use for extraction/classification. */
export async function callLlm(prompt: string): Promise<string> {
  const res = await fetch(
    `${BASE}/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.1,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return extractText(await res.json());
}

export interface GroundedResponse {
  text: string;
  sources: GroundingSource[];
  searchQueries: string[];
}

/** Grounded call — high thinking + Google Search tool. Use for evidence-dependent assessment.
 *  Timeout: default 120s via AbortSignal; configurable via `timeoutMs`. */
export async function callLlmGrounded(
  prompt: string,
  attempt = 1,
  timeoutMs = 120_000
): Promise<GroundedResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(
      `${BASE}/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.1,
            thinkingConfig: { thinkingLevel: "high" },
          },
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    if ((res.status === 500 || res.status === 503) && attempt <= 2) {
      await new Promise((r) => setTimeout(r, 3000));
      return callLlmGrounded(prompt, attempt + 1);
    }
    throw new Error(`Gemini grounded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  const text = extractText(data);

  type GMeta = {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
        webSearchQueries?: string[];
      };
    }>;
  };
  const meta = (data as GMeta)?.candidates?.[0]?.groundingMetadata ?? {};
  const sources: GroundingSource[] = (meta.groundingChunks ?? [])
    .map((c) => ({ uri: c.web?.uri ?? "", title: c.web?.title ?? "" }))
    .filter((s) => s.uri);
  const searchQueries: string[] = meta.webSearchQueries ?? [];

  return { text, sources, searchQueries };
}

/** Strip markdown fences and parse JSON. */
export function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}
