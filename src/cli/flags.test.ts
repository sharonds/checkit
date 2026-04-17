import { describe, test, expect } from "bun:test";
import { resolveProvider } from "../providers/resolve.ts";
import type { Config } from "../config.ts";

/**
 * Unit-tests the key-resolution logic used by --deep-fact-check.
 * We don't spin up the CLI; we just exercise the same resolve path.
 */
describe("--deep-fact-check apiKey resolution", () => {
  const base: Config = {
    copyscapeUser: "", copyscapeKey: "",
    skills: { plagiarism: false, aiDetection: false, seo: false, factCheck: true, tone: false, legal: false, summary: false, brief: false, purpose: false },
  };

  test("uses providers['fact-check'].apiKey when set", () => {
    const cfg = { ...base, providers: { "fact-check": { provider: "exa-search" as const, apiKey: "new-key" } } };
    const r = resolveProvider(cfg as Config, "fact-check");
    expect(r?.apiKey).toBe("new-key");
  });

  test("falls back to legacy config.exaApiKey", () => {
    const cfg = { ...base, exaApiKey: "legacy-key" } as Config;
    const r = resolveProvider(cfg, "fact-check");
    expect(r?.apiKey).toBe("legacy-key");
  });

  test("returns null when neither present — CLI will exit 1", () => {
    expect(resolveProvider(base, "fact-check")).toBeNull();
  });
});
