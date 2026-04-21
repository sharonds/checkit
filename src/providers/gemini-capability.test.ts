import { afterEach, describe, expect, test } from "bun:test";
import { createGeminiCapability } from "./gemini-capability.ts";
import { jsonResponse, mockFetch, urlRouter } from "../testing/mock-fetch.ts";

const ENV_KEYS = [
  "GEMINI_MODEL_PRO",
  "GEMINI_MODEL_FLASH",
  "GEMINI_MODEL_DEEP_RESEARCH",
  "GEMINI_API_KEY",
] as const;

function snapshotEnv(): Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]])) as Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>;
}

function restoreEnv(snapshot: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>): void {
  for (const key of ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  delete process.env.GEMINI_MODEL_PRO;
  delete process.env.GEMINI_MODEL_FLASH;
  delete process.env.GEMINI_MODEL_DEEP_RESEARCH;
  delete process.env.GEMINI_API_KEY;
});

describe("createGeminiCapability", () => {
  test("uses env-var overrides for model names", () => {
    const env = snapshotEnv();
    process.env.GEMINI_MODEL_PRO = "custom-pro";
    process.env.GEMINI_MODEL_FLASH = "custom-flash";
    process.env.GEMINI_MODEL_DEEP_RESEARCH = "custom-deep";

    const capability = createGeminiCapability({ apiKey: "key" });

    expect(capability.models).toEqual({
      pro: "custom-pro",
      flash: "custom-flash",
      deepResearch: "custom-deep",
    });
    expect(capability.getModel("chat")).toBe("custom-pro");
    expect(capability.getModel("grounded")).toBe("custom-pro");
    expect(capability.getModel("deep-research")).toBe("custom-deep");

    restoreEnv(env);
  });

  test("reports independent health states for pro, grounding, and deep research", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    mockFetch(urlRouter({
      "models/": async (req) => {
        const body = JSON.parse(await req.text()) as { tools?: unknown[] };
        if (body.tools?.length) {
          return jsonResponse({ error: "grounding down" }, 503);
        }
        return jsonResponse({ ok: true });
      },
      "interactions": async () => jsonResponse({ id: "dr-1" }, 201),
    }));

    const capability = createGeminiCapability();
    const health = await capability.checkHealth();

    expect(health.pro).toBe(true);
    expect(health.grounding).toBe(false);
    expect(health.deepResearch).toBe(true);
    expect(typeof health.checkedAt).toBe("string");
  });

  test("caches health results for five minutes", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    let clock = 0;
    let calls = 0;
    mockFetch(urlRouter({
      "models/": async () => {
        calls++;
        return jsonResponse({ ok: true });
      },
      "interactions": async () => {
        calls++;
        return jsonResponse({ id: "dr-1" }, 201);
      },
    }));

    const capability = createGeminiCapability({
      now: () => clock,
    });

    const first = await capability.checkHealth();
    const second = await capability.checkHealth();

    expect(first).toEqual(second);
    expect(calls).toBe(3);

    clock = 5 * 60_000 + 1;
    const third = await capability.checkHealth();

    expect(third.checkedAt).not.toBe(first.checkedAt);
    expect(calls).toBe(6);
  });
});
