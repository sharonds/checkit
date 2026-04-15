import { describe, it, expect } from "bun:test";
import { runCheckHeadless } from "./checker.ts";
import { readConfig } from "./config.ts";

describe("runCheckHeadless", () => {
  it("returns results with correct structure", async () => {
    const config = readConfig();
    config.skills = {
      plagiarism: false,
      aiDetection: false,
      seo: true,
      factCheck: false,
      tone: false,
      legal: false,
      summary: false,
      brief: false,
    };

    const result = await runCheckHeadless("test-input", {
      text: "This is a test article about TypeScript development. It has enough words to be meaningful for SEO analysis but not too many to slow down the test.",
      config,
      dbPath: ":memory:",
    });

    expect(result.id).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.results).toHaveLength(1); // only SEO enabled
    expect(result.results[0].skillId).toBe("seo");
    expect(result.results[0].score).toBeGreaterThanOrEqual(0);
    expect(result.results[0].score).toBeLessThanOrEqual(100);
  });

  it("returns empty results when no skills enabled", async () => {
    const config = readConfig();
    config.skills = {
      plagiarism: false,
      aiDetection: false,
      seo: false,
      factCheck: false,
      tone: false,
      legal: false,
      summary: false,
      brief: false,
    };

    const result = await runCheckHeadless("test-input", {
      text: "Some text",
      config,
      dbPath: ":memory:",
    });

    expect(result.results).toHaveLength(0);
    expect(result.totalCostUsd).toBe(0);
  });

  it("saves check to DB and returns a valid id", async () => {
    const config = readConfig();
    config.skills = {
      plagiarism: false,
      aiDetection: false,
      seo: true,
      factCheck: false,
      tone: false,
      legal: false,
      summary: false,
      brief: false,
    };

    const result = await runCheckHeadless("db-test-source", {
      text: "# Test Heading\n\nA longer paragraph with several sentences. This helps the SEO check produce a more realistic result. We want to verify that the database insert works correctly.",
      config,
      dbPath: ":memory:",
    });

    expect(result.id).toBeGreaterThan(0);
    expect(result.source).toBe("db-test-source");
    expect(result.totalCostUsd).toBe(0); // SEO is free
  });
});
