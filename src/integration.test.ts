import { describe, expect, it, mock } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Config } from "./config.ts";
import { runCheckHeadless } from "./checker.ts";
import { createSchema, getDeepAudit, openDb } from "./db.ts";
import { FactCheckDeepResearchSkill } from "./skills/factcheck-deep-research.ts";
import { jsonResponse, mockFetch, urlRouter } from "./testing/mock-fetch.ts";

const ARTICLE = `
OpenAI announced GPT-4 in March 2023. The Apollo 11 Moon landing happened in 1969.
The Hubble Space Telescope launched in 1990. The human body has 206 bones in adulthood.
`.trim();

function buildConfig(overrides: Partial<Config> = {}): Config {
  return {
    copyscapeUser: "",
    copyscapeKey: "",
    exaApiKey: "exa-key",
    minimaxApiKey: "minimax-key",
    geminiApiKey: process.env.GEMINI_API_KEY,
    factCheckTier: "basic",
    factCheckTierFlag: false,
    skills: {
      plagiarism: false,
      aiDetection: false,
      seo: false,
      factCheck: true,
      tone: false,
      legal: false,
      summary: false,
      brief: false,
      purpose: false,
      grammar: false,
      academic: false,
      selfPlagiarism: false,
    },
    ...overrides,
  };
}

let exaSearchHandler: ((q: string, opts: unknown) => Promise<any>) | null = null;
mock.module("exa-js", () => ({
  default: class MockExa {
    constructor(_key: string) {}
    async search(q: string, opts: unknown) {
      if (!exaSearchHandler) {
        throw new Error("No exaSearchHandler set for integration test");
      }
      return exaSearchHandler(q, opts);
    }
  },
}));

describe("multi-tier fact-check integration", () => {
  it("basic tier completes synchronously and returns fact-check findings", async () => {
    let llmCallCount = 0;
    exaSearchHandler = async () => ({
      results: [{
        url: "https://example.com/history/apollo-11",
        title: "Apollo 11 history",
        publishedDate: "2024-01-01",
        highlights: ["Apollo 11 landed on the Moon in 1969."],
        text: "Apollo 11 landed on the Moon in 1969. NASA launched the Hubble Space Telescope in 1990.",
      }],
    });

    mockFetch(urlRouter({
      "api.minimax.io": async () => {
        llmCallCount++;
        if (llmCallCount === 1) {
          return jsonResponse({
            id: "msg_extract",
            type: "message",
            role: "assistant",
            model: "MiniMax-M2.7",
            content: [{
              type: "text",
              text: JSON.stringify([
                "The Apollo 11 Moon landing happened in 1969.",
                "The Hubble Space Telescope launched in 1990.",
              ]),
            }],
            stop_reason: "end_turn",
            usage: { input_tokens: 10, output_tokens: 10 },
          });
        }

        return jsonResponse({
          id: `msg_assess_${llmCallCount}`,
          type: "message",
          role: "assistant",
          model: "MiniMax-M2.7",
          content: [{
            type: "text",
            text: JSON.stringify({
              supported: true,
              note: "Primary and reference sources align with the claim.",
              claimType: "general",
            }),
          }],
          stop_reason: "end_turn",
          usage: { input_tokens: 10, output_tokens: 10 },
        });
      },
    }));

    const result = await runCheckHeadless("integration-basic", {
      text: ARTICLE,
      config: buildConfig(),
      dbPath: ":memory:",
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].skillId).toBe("fact-check");
    expect(result.results[0].provider).toBe("exa-search");
    expect(result.results[0].findings.length).toBeGreaterThan(0);
  });

  const geminiIt = process.env.GEMINI_API_KEY ? it : it.skip;

  geminiIt("standard tier completes synchronously with the grounded provider", async () => {
    mockFetch(urlRouter({
      "api.minimax.io": async () => jsonResponse({
        id: "msg_extract_grounded",
        type: "message",
        role: "assistant",
        model: "MiniMax-M2.7",
        content: [{
          type: "text",
          text: JSON.stringify([
            "OpenAI announced GPT-4 in March 2023.",
          ]),
        }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 10 },
      }),
      "generativelanguage.googleapis.com": async () => jsonResponse({
        candidates: [{
          content: {
            parts: [
              { thought: true, text: "private reasoning" },
              { text: "Grounded assessment:\n```json\n{\"supported\":true,\"note\":\"OpenAI's March 2023 launch materials align with the claim.\"}\n```" },
            ],
          },
          groundingMetadata: {
            webSearchQueries: ["OpenAI GPT-4 March 2023 announcement"],
            groundingChunks: [
              { web: { uri: "https://openai.com/index/gpt-4-research/", title: "GPT-4 research" } },
            ],
            groundingSupports: [
              { groundingChunkIndices: [0], segment: { text: "GPT-4 was announced in March 2023." } },
            ],
          },
        }],
      }),
    }));

    const result = await runCheckHeadless("integration-standard", {
      text: ARTICLE,
      config: buildConfig({
        factCheckTierFlag: true,
        factCheckTier: "standard",
      }),
      dbPath: ":memory:",
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].skillId).toBe("fact-check-grounded");
    expect(result.results[0].provider).toBe("gemini-grounded");
    expect(result.results[0].findings.length).toBeGreaterThan(0);
  });

  geminiIt("premium tier initiates an async deep audit and returns an interaction id", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "checkapp-integration-"));
    const dbPath = join(tempDir, "history.db");
    const db = openDb(dbPath);
    createSchema(db);
    mockFetch(urlRouter({
      "generativelanguage.googleapis.com": async () => jsonResponse({ id: "int-premium" }),
    }));

    try {
      const result = await new FactCheckDeepResearchSkill({ db, dbPath }).initiate(
        ARTICLE,
        "content_hash",
        "integration-article",
        buildConfig({
          geminiApiKey: process.env.GEMINI_API_KEY,
          factCheckTierFlag: true,
          factCheckTier: "premium",
        }),
        "cli",
      );

      expect(result.interactionId).toBe("int-premium");
      expect(result.status).toBe("in_progress");
      expect(result.estimatedCompletion).toBeGreaterThan(Date.now());

      const persisted = getDeepAudit(db, "int-premium");
      expect(persisted?.status).toBe("in_progress");
      expect(persisted?.interactionId).toBe("int-premium");
    } finally {
      db.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
