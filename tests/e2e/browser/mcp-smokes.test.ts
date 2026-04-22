import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleToolCall, __setMcpServerTestOverrides } from "../../../src/mcp-server.ts";
import { readConfig, writeConfig } from "../../../src/config.ts";
import { openDb } from "../../../src/db.ts";
import { FactCheckDeepResearchSkill } from "../../../src/skills/factcheck-deep-research.ts";
import { allocateTempPaths, type TempPaths } from "../helpers/temp-paths.ts";

// MCP smokes (Task 13). Drives the MCP tool surface in-process — no
// subprocess needed because the MCP tools are plain exported functions.
// Each test sets up temp paths + a scenario, then calls check_article,
// deep_audit_article, get_deep_audit_result directly.

const ENV_KEYS = ["CHECKAPP_E2E", "CHECKAPP_E2E_SCENARIO", "CHECKAPP_CONFIG_PATH", "CHECKAPP_DB_PATH", "CHECKAPP_ALLOW_LIVE_PROVIDERS"] as const;
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

describe("MCP mocked smokes", () => {
  let saved: Record<string, string | undefined>;
  let temp: TempPaths;

  beforeEach(() => {
    saved = saveEnv();
    temp = allocateTempPaths();
    temp.initDbSchema();
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_CONFIG_PATH = temp.configPath;
    process.env.CHECKAPP_DB_PATH = temp.dbPath;
    process.env.CHECKAPP_ALLOW_LIVE_PROVIDERS = "0";

    // Override MCP deps so they use the temp DB. readConfig/writeConfig
    // already honor CHECKAPP_CONFIG_PATH so no override needed there.
    __setMcpServerTestOverrides({
      openDb: () => openDb(temp.dbPath),
      readConfig,
      writeConfig,
      createDeepResearchSkill: () => new FactCheckDeepResearchSkill({ dbPath: temp.dbPath }),
    });
  });

  afterEach(() => {
    // There's no reset helper; simply restore env and clean temp — the next
    // test overrides deps again on its own beforeEach.
    temp.cleanup();
    restoreEnv(saved);
  });

  it("check_article runs basic tier via fixtures and returns a fact-check result", async () => {
    process.env.CHECKAPP_E2E_SCENARIO = "basic-happy";
    temp.writeConfig({
      factCheckTier: "basic",
      factCheckTierFlag: false,
      providers: { "fact-check": { provider: "exa-search", apiKey: "dummy" } },
      minimaxApiKey: "dummy",
      exaApiKey: "dummy",
      skills: { factCheck: true, plagiarism: false, aiDetection: false, seo: false },
    });

    const result = await handleToolCall("check_article", {
      text: "Coffee contains caffeine. Heart pumps blood.",
      source: "mcp-e2e",
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text) as { results: Array<{ skillId: string; provider?: string }> };
    const fc = parsed.results.find((r) => r.skillId === "fact-check");
    expect(fc).toBeDefined();
    expect(fc?.provider).toBe("exa-search");
  });

  it("deep_audit_article (premium-pending) returns the scenario interaction_id with pending status", async () => {
    process.env.CHECKAPP_E2E_SCENARIO = "premium-pending";
    temp.writeConfig({
      geminiApiKey: "dummy",
    });

    const result = await handleToolCall("deep_audit_article", {
      article: "Coffee contains caffeine. Heart pumps blood.",
    });
    const parsed = JSON.parse((result.content[0] as { text: string }).text) as { interactionId: string; status: string };
    expect(parsed.interactionId).toBe("int_pending_001");
    expect(["pending", "in_progress"]).toContain(parsed.status);
  });

  it("get_deep_audit_result polls completed state from fixture", async () => {
    process.env.CHECKAPP_E2E_SCENARIO = "premium-completed";
    temp.writeConfig({ geminiApiKey: "dummy" });

    // Step 1: initiate.
    const initResult = await handleToolCall("deep_audit_article", {
      article: "Coffee contains caffeine. Heart pumps blood.",
    });
    const init = JSON.parse((initResult.content[0] as { text: string }).text) as { interactionId: string };
    expect(init.interactionId).toBe("int_completed_001");

    // Step 2: poll twice — first returns in_progress, second returns completed.
    const poll1 = await handleToolCall("get_deep_audit_result", { interactionId: init.interactionId });
    const poll1Parsed = JSON.parse((poll1.content[0] as { text: string }).text) as { status?: string; verdict?: string };
    expect(poll1Parsed.status ?? poll1Parsed.verdict).toBeDefined();

    const poll2 = await handleToolCall("get_deep_audit_result", { interactionId: init.interactionId });
    const poll2Parsed = JSON.parse((poll2.content[0] as { text: string }).text) as { verdict?: string; findings?: Array<{ text: string }> };
    // Eventually we get a verdict + the Deep Audit Report body.
    const joined = JSON.stringify(poll2Parsed);
    expect(joined).toContain("Deep Audit Report");
  });
});
