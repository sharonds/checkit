import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { FactCheckSkill } from "../../src/skills/factcheck.ts";
import { FactCheckGroundedSkill } from "../../src/skills/factcheck-grounded.ts";
import { FactCheckDeepResearchSkill } from "../../src/skills/factcheck-deep-research.ts";
import { createGeminiCapability } from "../../src/providers/gemini-capability.ts";
import { openDb } from "../../src/db.ts";
import type { Config } from "../../src/config.ts";
import { allocateTempPaths } from "./helpers/temp-paths.ts";

const ENV_KEYS = ["CHECKAPP_E2E", "CHECKAPP_E2E_SCENARIO", "CHECKAPP_ALLOW_LIVE_PROVIDERS"] as const;

function saveEnv() {
  const s: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) s[k] = process.env[k];
  return s;
}
function restoreEnv(s: Record<string, string | undefined>) {
  for (const k of ENV_KEYS) {
    if (s[k] === undefined) delete process.env[k];
    else process.env[k] = s[k];
  }
}

describe("provider mocks — no live HTTP in E2E mode", () => {
  let saved: Record<string, string | undefined>;
  let originalFetch: typeof fetch;
  let fetchCount: number;

  beforeEach(() => {
    saved = saveEnv();
    originalFetch = global.fetch;
    fetchCount = 0;
    global.fetch = (async () => {
      fetchCount++;
      throw new Error("no live HTTP in E2E mock mode");
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    restoreEnv(saved);
  });

  it("Exa (basic tier) returns scenario results without network", async () => {
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_E2E_SCENARIO = "basic-happy";

    const cfg = {
      minimaxApiKey: "dummy",
      exaApiKey: "dummy",
      providers: { "fact-check": { provider: "exa-search", apiKey: "dummy" } },
    } as unknown as Config;

    const result = await new FactCheckSkill().run(
      "Coffee contains caffeine, a stimulant that can improve alertness.",
      cfg,
    );
    expect(result.verdict).not.toBe("skipped");
    expect(fetchCount).toBe(0);
  });

  it("Gemini grounded (standard tier) consumes scenario claims without network", async () => {
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_E2E_SCENARIO = "standard-happy";

    const cfg = {
      geminiApiKey: "dummy",
      llmProvider: "gemini",
      providers: { "fact-check": { provider: "gemini-grounded", apiKey: "dummy" } },
    } as unknown as Config;

    const result = await new FactCheckGroundedSkill().run(
      "Coffee contains caffeine. Heart pumps blood.",
      cfg,
    );
    expect(result.verdict).toBe("pass");
    expect(result.findings.length).toBeGreaterThan(0);
    expect(fetchCount).toBe(0);
  });

  it("Deep Research initiate returns scenario interaction_id without network", async () => {
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_E2E_SCENARIO = "premium-pending";

    const temp = allocateTempPaths();
    try {
      const db = openDb(temp.dbPath);
      try {
        const skill = new FactCheckDeepResearchSkill({ db });
        const result = await skill.initiate(
          "article",
          "content_hash",
          "abc1234567890",
          { geminiApiKey: "dummy" } as Config,
          "mcp",
        );
        expect(result.interactionId).toBe("int_pending_001");
        expect(result.status).toBe("in_progress");
        expect(fetchCount).toBe(0);
      } finally {
        db.close();
      }
    } finally {
      temp.cleanup();
    }
  });

  it("Deep Research fetchResult advances through scenario poll states", async () => {
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_E2E_SCENARIO = "premium-completed";

    const temp = allocateTempPaths();
    try {
      const db = openDb(temp.dbPath);
      try {
        const skill = new FactCheckDeepResearchSkill({ db });
        const init = await skill.initiate(
          "article",
          "content_hash",
          "hash_completed",
          { geminiApiKey: "dummy" } as Config,
          "mcp",
        );
        // First poll -> in_progress
        const poll1 = await skill.fetchResult(init.interactionId!, { geminiApiKey: "dummy" } as Config);
        expect(poll1).toBeNull();
        // Second poll -> completed
        const poll2 = await skill.fetchResult(init.interactionId!, { geminiApiKey: "dummy" } as Config);
        expect(poll2).not.toBeNull();
        expect(poll2!.verdict).toBe("pass");
        expect(poll2!.findings[0]?.text).toContain("Deep Audit Report");
        expect(fetchCount).toBe(0);
      } finally {
        db.close();
      }
    } finally {
      temp.cleanup();
    }
  });

  it("Deep Research fetchResult surfaces failure from scenario", async () => {
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_E2E_SCENARIO = "premium-failed";

    const temp = allocateTempPaths();
    try {
      const db = openDb(temp.dbPath);
      try {
        const skill = new FactCheckDeepResearchSkill({ db });
        const init = await skill.initiate(
          "article",
          "content_hash",
          "hash_failed",
          { geminiApiKey: "dummy" } as Config,
          "mcp",
        );
        const poll = await skill.fetchResult(init.interactionId!, { geminiApiKey: "dummy" } as Config);
        expect(poll).not.toBeNull();
        expect(poll!.verdict).toBe("fail");
        expect(poll!.summary.toLowerCase()).toContain("model unavailable");
        expect(fetchCount).toBe(0);
      } finally {
        db.close();
      }
    } finally {
      temp.cleanup();
    }
  });

  it("capability health check reports all healthy without network", async () => {
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_E2E_SCENARIO = "basic-happy";

    const cap = createGeminiCapability({ apiKey: "dummy" });
    const health = await cap.checkHealth();
    expect(health.pro).toBe(true);
    expect(health.grounding).toBe(true);
    expect(health.deepResearch).toBe(true);
    expect(fetchCount).toBe(0);
  });
});
