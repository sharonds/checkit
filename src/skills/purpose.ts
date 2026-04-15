import type { Skill, SkillResult, Finding } from "./types.ts";
import type { Config } from "../config.ts";
import { getLlmClient, parseJsonResponse } from "./llm.ts";

export const PURPOSE_TYPES = [
  "product-announcement", "tutorial", "thought-leadership",
  "case-study", "listicle", "news", "user-guide",
] as const;

export type ContentPurpose = typeof PURPOSE_TYPES[number];

export function buildPurposePrompt(articleText: string): string {
  return `Classify this article's content purpose and provide specific recommendations.

ARTICLE:
${articleText.slice(0, 4000)}

PURPOSE TYPES:
- product-announcement: New product/feature launch. Needs CTA, pricing, availability.
- tutorial: How-to guide. Needs numbered steps, code examples, prerequisites.
- thought-leadership: Industry opinion. Needs data points, expert citations, unique angle.
- case-study: Customer story. Needs metrics, before/after, testimonials.
- listicle: Top N list. Needs consistent structure, numbered items.
- news: News/press release. Needs who/what/when/where, quotes, timeliness.
- user-guide: Documentation/reference. Needs headings, examples, completeness.

Reply with ONLY this JSON:
{
  "purpose": "<one of the types above>",
  "confidence": <0.0-1.0>,
  "summary": "<one sentence why this classification>",
  "present": ["<element appropriate for this purpose that IS present>"],
  "missing": ["<element that SHOULD be present but is missing>"],
  "recommendations": ["<specific actionable recommendation>"]
}`;
}

interface PurposeResponse {
  purpose: string;
  confidence: number;
  summary: string;
  present: string[];
  missing: string[];
  recommendations: string[];
}

export class PurposeSkill implements Skill {
  readonly id = "purpose";
  readonly name = "Content Purpose";

  async run(text: string, config: Config): Promise<SkillResult> {
    const llm = getLlmClient(config);
    if (!llm) {
      return {
        skillId: this.id, name: this.name, score: 50, verdict: "warn",
        summary: "Skipped — no LLM key configured",
        findings: [{ severity: "warn", text: "Add MINIMAX_API_KEY, ANTHROPIC_API_KEY, or OPENROUTER_API_KEY" }],
        costUsd: 0,
      };
    }

    const raw = await llm.call(buildPurposePrompt(text), 1024);
    let parsed: PurposeResponse;
    try {
      parsed = parseJsonResponse(raw);
    } catch {
      return {
        skillId: this.id, name: this.name, score: 50, verdict: "warn",
        summary: "Could not parse purpose classification",
        findings: [], costUsd: 0.002,
      };
    }

    const findings: Finding[] = [];
    for (const m of parsed.missing ?? []) {
      findings.push({ severity: "error", text: `Missing for ${parsed.purpose}: ${m}` });
    }
    for (const r of parsed.recommendations ?? []) {
      findings.push({ severity: "warn", text: r });
    }

    const missingCount = (parsed.missing ?? []).length;
    const score = Math.max(0, Math.round(100 - missingCount * 15));
    const verdict = score >= 75 ? "pass" : score >= 50 ? "warn" : "fail";

    return {
      skillId: this.id, name: this.name, score, verdict,
      summary: `${parsed.purpose} (${Math.round(parsed.confidence * 100)}% confidence) — ${parsed.summary}`,
      findings, costUsd: 0.002,
    };
  }
}
