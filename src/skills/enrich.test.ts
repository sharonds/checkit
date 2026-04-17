import { describe, test, expect } from "bun:test";
import { enrichFindings } from "./enrich.ts";
import type { SkillResult } from "./types.ts";

describe("enrichFindings", () => {
  test("merges citations onto matching fact-check finding by quoted claim", () => {
    const fact: SkillResult = {
      skillId: "fact-check", name: "F", score: 80, verdict: "warn", summary: "", costUsd: 0,
      findings: [
        { severity: "warn", text: `Unverified: "1B people are deficient" — note`, sources: [{ url: "https://s.com" }] },
      ],
    };
    const academic: SkillResult = {
      skillId: "academic", name: "A", score: 100, verdict: "pass", summary: "", costUsd: 0,
      findings: [
        { severity: "info", text: `Citations for: "1B people are deficient"`, citations: [{ title: "Holick 2017", doi: "10.1/x" }] },
      ],
    };
    const out = enrichFindings([fact, academic]);
    expect(out[0].findings[0].citations?.[0].doi).toBe("10.1/x");
    expect(out[0].findings[0].sources?.[0].url).toBe("https://s.com");
  });

  test("no-op when fact-check missing", () => {
    const academic: SkillResult = {
      skillId: "academic", name: "A", score: 100, verdict: "pass", summary: "", costUsd: 0,
      findings: [{ severity: "info", text: `Citations for: "x"`, citations: [{ title: "t" }] }],
    };
    const out = enrichFindings([academic]);
    expect(out).toEqual([academic]);
  });

  test("no-op when academic finding has no citations", () => {
    const fact: SkillResult = {
      skillId: "fact-check", name: "F", score: 80, verdict: "warn", summary: "", costUsd: 0,
      findings: [{ severity: "warn", text: `Unverified: "x" — note` }],
    };
    const academic: SkillResult = {
      skillId: "academic", name: "A", score: 100, verdict: "warn", summary: "", costUsd: 0,
      findings: [{ severity: "info", text: `Citations for: "x"`, citations: undefined }],
    };
    const out = enrichFindings([fact, academic]);
    expect(out[0].findings[0].citations).toBeUndefined();
  });

  test("whitespace-normalized matching (extra spaces + case differences)", () => {
    const fact: SkillResult = {
      skillId: "fact-check", name: "F", score: 80, verdict: "warn", summary: "", costUsd: 0,
      findings: [{ severity: "warn", text: `Unverified: "The   Study  Shows" — note` }],
    };
    const academic: SkillResult = {
      skillId: "academic", name: "A", score: 100, verdict: "pass", summary: "", costUsd: 0,
      findings: [{ severity: "info", text: `Citations for: "the study shows"`, citations: [{ title: "t", doi: "10.1/y" }] }],
    };
    const out = enrichFindings([fact, academic]);
    expect(out[0].findings[0].citations?.[0].doi).toBe("10.1/y");
  });
});
