import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getLlmClient } from "../../src/skills/llm.ts";
import type { Config } from "../../src/config.ts";

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

describe("LLM E2E mock hook", () => {
  let saved: Record<string, string | undefined>;
  let originalFetch: typeof fetch;
  let fetchCount: number;

  beforeEach(() => {
    saved = saveEnv();
    originalFetch = global.fetch;
    fetchCount = 0;
    global.fetch = (async () => {
      fetchCount++;
      throw new Error("fetch must not be called in E2E mock mode");
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    restoreEnv(saved);
  });

  it("extract-claim prompts return scenario extractClaims without network", async () => {
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_E2E_SCENARIO = "basic-happy";

    const client = getLlmClient({ minimaxApiKey: "dummy" } as Config);
    expect(client).not.toBeNull();
    expect(client!.provider).toBe("minimax");
    const text = await client!.call("Extract the 4 most specific claims from article");
    expect(text).toContain("Coffee contains caffeine");
    expect(fetchCount).toBe(0);
  });

  it("assess-claim prompts return scenario assessClaim stub", async () => {
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_E2E_SCENARIO = "basic-happy";

    const client = getLlmClient({ geminiApiKey: "dummy", llmProvider: "gemini" } as Config);
    expect(client!.provider).toBe("gemini");
    const text = await client!.call("Is this claim supported by the evidence below?");
    expect(text).toContain("supported");
    expect(text).toContain("claimType");
    expect(fetchCount).toBe(0);
  });

  it("mock works even when scenario omits LLM stubs (falls back to empty JSON)", async () => {
    process.env.CHECKAPP_E2E = "1";
    process.env.CHECKAPP_E2E_SCENARIO = "premium-pending";

    const client = getLlmClient({ minimaxApiKey: "dummy" } as Config);
    const text = await client!.call("prompt");
    expect(text).toBe("{}");
    expect(fetchCount).toBe(0);
  });
});

describe("LLM belt-and-suspenders: assertMocksOnly throws if reached", () => {
  it("blocks live Gemini fetch when E2E=1 but the short-circuit is bypassed", async () => {
    // Bypass the top-level E2E short-circuit by disabling it between client
    // construction and call: we build the client in non-E2E mode, then turn
    // E2E on right before calling. The SDK caller should hit assertMocksOnly.
    const saved = saveEnv();
    try {
      delete process.env.CHECKAPP_E2E;
      const client = getLlmClient({ geminiApiKey: "dummy", llmProvider: "gemini" } as Config);
      process.env.CHECKAPP_E2E = "1";
      delete process.env.CHECKAPP_ALLOW_LIVE_PROVIDERS;

      await expect(client!.call("prompt")).rejects.toThrow(/E2E mode: live provider call to "llm:gemini" blocked/);
    } finally {
      restoreEnv(saved);
    }
  });
});
