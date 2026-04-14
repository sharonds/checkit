import { test, expect } from "bun:test";
import { generateReport } from "./report.ts";
import type { SkillResult } from "./skills/types.ts";

const results: SkillResult[] = [
  { skillId: "seo", name: "SEO", score: 85, verdict: "pass", summary: "Good SEO", findings: [], costUsd: 0 },
  { skillId: "plagiarism", name: "Plagiarism", score: 70, verdict: "warn", summary: "33% similarity", findings: [
    { severity: "warn", text: "76 words matched at ynet.co.il", quote: "ויטמין C הוא תרכובת אורגנית..." }
  ], costUsd: 0.09 },
];

test("generateReport returns a string of HTML", () => {
  const html = generateReport({ source: "article.md", wordCount: 800, results, totalCostUsd: 0.09 });
  expect(html).toContain("<!DOCTYPE html>");
  expect(html).toContain("<html");
});

test("report contains skill names", () => {
  const html = generateReport({ source: "article.md", wordCount: 800, results, totalCostUsd: 0.09 });
  expect(html).toContain("SEO");
  expect(html).toContain("Plagiarism");
});

test("report contains the source filename", () => {
  const html = generateReport({ source: "article.md", wordCount: 800, results, totalCostUsd: 0.09 });
  expect(html).toContain("article.md");
});

test("report is self-contained (no external JS scripts)", () => {
  const html = generateReport({ source: "article.md", wordCount: 800, results, totalCostUsd: 0.09 });
  expect(html).not.toMatch(/<script src=/);
});
