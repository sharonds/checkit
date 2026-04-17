import { test, expect, describe, mock } from "bun:test";
import { extractClaimsPrompt, claimConfidence, formatCitation, FactCheckSkill } from "./factcheck.ts";
import type { Config } from "../config.ts";
import { mockFetch, urlRouter, jsonResponse } from "../testing/mock-fetch.ts";

// Exa SDK captures global.fetch at import time, so mockFetch (installed per-test)
// doesn't intercept it. Mock the Exa class itself to route through a configurable
// handler that the test can set.
let exaSearchHandler: ((q: string) => Promise<any>) | null = null;
mock.module("exa-js", () => ({
  default: class MockExa {
    constructor(_key: string) {}
    async search(q: string, _opts: unknown) {
      if (!exaSearchHandler) throw new Error("exaSearchHandler not set");
      return exaSearchHandler(q);
    }
  },
}));

describe("extractClaimsPrompt", () => {
  test("returns a string containing the article text", () => {
    const prompt = extractClaimsPrompt("Vitamin D prevents cancer.");
    expect(prompt).toContain("Vitamin D prevents cancer");
  });

  test("asks for JSON array output", () => {
    const prompt = extractClaimsPrompt("Some article text.");
    expect(prompt.toLowerCase()).toContain("json");
    expect(prompt).toContain("claims");
  });
});

describe("claimConfidence", () => {
  test("returns high for 3+ sources when supported", () => {
    expect(claimConfidence(3, true)).toBe("high");
  });
  test("returns medium for 1-2 sources when supported", () => {
    expect(claimConfidence(2, true)).toBe("medium");
    expect(claimConfidence(1, true)).toBe("medium");
  });
  test("returns low when unsupported regardless of sources", () => {
    expect(claimConfidence(5, false)).toBe("low");
  });
  test("returns low when inconclusive", () => {
    expect(claimConfidence(3, null)).toBe("low");
  });
  test("returns low for 0 sources", () => {
    expect(claimConfidence(0, true)).toBe("low");
  });
});

describe("formatCitation", () => {
  test("formats URL as plain text domain", () => {
    const cite = formatCitation("https://www.cdc.gov/diabetes/basics/facts.html");
    expect(cite).toBe("cdc.gov");
  });
  test("strips www prefix", () => {
    expect(formatCitation("https://www.example.com/page")).toBe("example.com");
  });
  test("returns raw URL on parse failure", () => {
    expect(formatCitation("not-a-url")).toBe("not-a-url");
  });
});

describe("FactCheckSkill — Phase 7 evidence", () => {
  const cfgBase: Config = {
    copyscapeUser: "", copyscapeKey: "",
    exaApiKey: "exa-key",
    minimaxApiKey: "mm-key",
    skills: {
      plagiarism: false, aiDetection: false, seo: false,
      factCheck: true, tone: false, legal: false,
      summary: false, brief: false, purpose: false,
    },
  };

  // MiniMax uses the Anthropic SDK via /anthropic base URL — responses come back
  // as { content: [{ type: "text", text: "..." }] }. Route handler returns that shape.
  const anthropicContent = (text: string) => jsonResponse({
    id: "msg_1", type: "message", role: "assistant", model: "MiniMax-M2.7",
    content: [{ type: "text", text }],
    stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 },
  });

  test("verified claim finding carries sources[] with url + title + quote", async () => {
    let llmCallCount = 0;
    exaSearchHandler = async () => ({
      results: [{
        url: "https://example.com/study",
        title: "Remote work ergonomics study",
        publishedDate: "2023-05-01",
        highlights: ["73% of remote workers experience back pain"],
      }],
    });
    mockFetch(urlRouter({
      "api.minimax.io": async () => {
        llmCallCount++;
        // First call = extract claims; subsequent = assess
        if (llmCallCount === 1) {
          return anthropicContent("[\"73% of remote workers experience back pain\"]");
        }
        return anthropicContent("{\"supported\":true,\"note\":\"ok\",\"claimType\":\"scientific\"}");
      },
    }));

    const skill = new FactCheckSkill();
    const result = await skill.run("73% of remote workers experience back pain.", cfgBase);

    const withSources = result.findings.find(f => f.sources && f.sources.length > 0);
    expect(withSources).toBeDefined();
    expect(withSources?.sources?.[0].url).toContain("example.com");
    expect(withSources?.sources?.[0].quote).toContain("73%");
    expect(result.provider).toBe("exa-search");
  });

  test("claimType is one of the 4 enum values", async () => {
    let llmCallCount = 0;
    exaSearchHandler = async () => ({
      results: [{ url: "https://s.com", title: "T", highlights: ["e"] }],
    });
    mockFetch(urlRouter({
      "api.minimax.io": async () => {
        llmCallCount++;
        if (llmCallCount === 1) return anthropicContent("[\"a claim\"]");
        return anthropicContent("{\"supported\":true,\"note\":\"n\",\"claimType\":\"medical\"}");
      },
    }));
    const result = await new FactCheckSkill().run("a claim", cfgBase);
    const valid = ["scientific", "medical", "financial", "general"];
    const f = result.findings.find(x => x.claimType);
    expect(f).toBeDefined();
    expect(valid).toContain(f?.claimType);
  });

  test("no provider configured → warn verdict with info finding", async () => {
    const { exaApiKey, ...cfgNoExa } = cfgBase;
    const result = await new FactCheckSkill().run("claim", cfgNoExa as Config);
    expect(result.verdict).toBe("warn");
    expect(result.summary.toLowerCase()).toContain("provider");
  });
});
