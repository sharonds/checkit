import type { Skill, SkillResult, Finding } from "./types.ts";
import type { Config } from "../config.ts";

export interface SeoMetrics {
  wordCount: number;
  wordCountScore: number;
  hasH1: boolean;
  hasH2: boolean;
  avgSentenceWords: number;
  sentenceLengthScore: number;
  fleschKincaid: number;
}

export function computeSeoMetrics(text: string): SeoMetrics {
  const clean = text.replace(/#{1,6}\s/g, "").replace(/[*_`]/g, "");
  const words = clean.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const wordCountScore =
    wordCount >= 800 && wordCount <= 2500 ? 100 :
    wordCount >= 400 && wordCount < 800 ? Math.round((wordCount / 800) * 100) :
    wordCount > 2500 ? 90 :
    Math.round((wordCount / 400) * 60);

  const hasH1 = /^#{1}\s/m.test(text);
  const hasH2 = /^#{2}\s/m.test(text);

  const sentences = clean.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const totalSentenceWords = sentences.reduce((sum, s) => sum + s.split(/\s+/).filter(Boolean).length, 0);
  const avgSentenceWords = sentences.length > 0 ? Math.round(totalSentenceWords / sentences.length) : 0;

  const sentenceLengthScore =
    avgSentenceWords <= 20 ? 100 :
    avgSentenceWords <= 25 ? 80 :
    avgSentenceWords <= 30 ? 60 : 40;

  const fleschKincaid = Math.round(206.835 - 1.015 * avgSentenceWords - 84.6 * 1.5);

  return { wordCount, wordCountScore, hasH1, hasH2, avgSentenceWords, sentenceLengthScore, fleschKincaid };
}

export class SeoSkill implements Skill {
  readonly id = "seo";
  readonly name = "SEO";

  async run(text: string, _config: Config): Promise<SkillResult> {
    const m = computeSeoMetrics(text);
    const findings: Finding[] = [];

    if (!m.hasH1) findings.push({ severity: "warn", text: "No H1 heading detected — add a clear title (# Heading)" });
    if (!m.hasH2) findings.push({ severity: "info", text: "No H2 subheadings — consider breaking content into sections" });
    if (m.wordCount < 800) findings.push({ severity: "warn", text: `Word count is ${m.wordCount} — aim for 800–2500 for most topics` });
    if (m.avgSentenceWords > 25) findings.push({ severity: "warn", text: `Average sentence is ${m.avgSentenceWords} words — aim for ≤20 for readability` });
    if (m.fleschKincaid < 40) findings.push({ severity: "info", text: `Readability score is ${m.fleschKincaid}/100 — text may be difficult to read` });

    const score = Math.round(
      m.wordCountScore * 0.4 +
      m.sentenceLengthScore * 0.3 +
      (m.hasH1 ? 100 : 0) * 0.2 +
      (m.hasH2 ? 100 : 0) * 0.1
    );

    const verdict = score >= 75 ? "pass" : score >= 50 ? "warn" : "fail";
    const summary = `Score ${score}/100 — ${m.wordCount} words, avg ${m.avgSentenceWords}-word sentences`;

    return { skillId: this.id, name: this.name, score, verdict, summary, findings, costUsd: 0 };
  }
}
