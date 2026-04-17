import { describe, test, expect, mock, beforeEach } from "bun:test";
import { SkillRegistry } from "./registry.ts";
import { FactCheckSkill } from "./factcheck.ts";
import { AcademicSkill } from "./academic.ts";
import type { Config } from "../config.ts";
import { mockFetch, urlRouter, jsonResponse } from "../testing/mock-fetch.ts";

// Reuse the MockExa + captured handler pattern from B2.
let exaSearchHandler: ((q: string, opts: unknown) => Promise<unknown>) | null = null;

mock.module("exa-js", () => ({
  default: class MockExa {
    constructor(_key: string) {}
    async search(q: string, opts: unknown) {
      if (!exaSearchHandler) throw new Error("No handler");
      return exaSearchHandler(q, opts);
    }
  },
}));

describe("Orchestrator — fact-check + academic enrichment (R8)", () => {
  beforeEach(() => {
    exaSearchHandler = null;
  });

  test("fact-check finding ends up carrying both sources AND citations after enrich", async () => {
    exaSearchHandler = async () => ({
      results: [{ url: "https://exa.com/study", title: "Study", highlights: ["supports claim"] }],
    });

    mockFetch(urlRouter({
      "api.minimax.io": async (req) => {
        const body = await req.text();
        if (body.toLowerCase().includes("extract")) {
          return jsonResponse({ content: [{ type: "text", text: '["73 percent of remote workers experience back pain"]' }] });
        }
        return jsonResponse({ content: [{ type: "text", text: '{"supported":true,"note":"ok","claimType":"scientific"}' }] });
      },
      "api.semanticscholar.org": async () => jsonResponse({
        data: [{ paperId: "p1", title: "Remote work ergonomics", authors: [{ name: "Smith" }], year: 2023, externalIds: { DOI: "10.1/abc" } }],
      }),
    }));

    const cfg: Config = {
      copyscapeUser: "", copyscapeKey: "",
      exaApiKey: "exa-key",
      minimaxApiKey: "mm-key",
      providers: {
        "fact-check": { provider: "exa-search", apiKey: "exa-key" },
        academic: { provider: "semantic-scholar" },
      },
      skills: {
        plagiarism: false, aiDetection: false, seo: false,
        factCheck: true, tone: false, legal: false,
        summary: false, brief: false, purpose: false,
        academic: true,
      },
    };

    const reg = new SkillRegistry([new FactCheckSkill(), new AcademicSkill()]);
    const results = await reg.runAll("73 percent of remote workers experience back pain.", cfg);

    const factResult = results.find(r => r.skillId === "fact-check")!;
    const factFinding = factResult.findings[0];

    expect(factFinding?.sources?.[0]?.url).toContain("exa.com");
    expect(factFinding?.citations?.[0]?.doi).toBe("10.1/abc");
    expect(factFinding?.claimType).toBe("scientific");
  });
});
