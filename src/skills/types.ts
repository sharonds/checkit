import type { Config } from "../config.ts";

export type Verdict = "pass" | "warn" | "fail";
export type Severity = "info" | "warn" | "error";
export type ClaimType = "scientific" | "medical" | "financial" | "general";

export interface Source {
  url: string;
  title?: string;
  publishedDate?: string;
  quote?: string;
  relevanceScore?: number;
}

export interface Citation {
  title: string;
  authors?: string[];
  year?: number;
  doi?: string;
  url?: string;
  abstractSnippet?: string;
  relevanceScore?: number;
}

export interface Finding {
  severity: Severity;
  text: string;
  quote?: string;
  sources?: Source[];
  rewrite?: string;
  citations?: Citation[];
  claimType?: ClaimType;
  confidence?: "high" | "medium" | "low";
}

export interface SkillResult {
  skillId: string;
  name: string;
  score: number;       // 0–100
  verdict: Verdict;
  summary: string;
  findings: Finding[];
  costUsd: number;
  costBreakdown?: Record<string, number>;
  provider?: string;
  error?: string;
}

export interface Skill {
  id: string;
  name: string;
  run(text: string, config: Config): Promise<SkillResult>;
}
