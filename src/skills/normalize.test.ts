import { describe, test, expect } from "bun:test";
import { normalizeFinding, normalizeSkillResult } from "./normalize.ts";

describe("normalizeFinding", () => {
  test("defaults missing arrays to undefined (stays absent, not crashing array-map)", () => {
    const old = { severity: "warn" as const, text: "old" };
    const n = normalizeFinding(old);
    expect(n.sources).toBeUndefined();
    expect(n.citations).toBeUndefined();
    expect(n.rewrite).toBeUndefined();
  });
  test("preserves new fields when present", () => {
    const x = normalizeFinding({ severity: "info" as const, text: "new", sources: [{ url: "u" }], rewrite: "r", citations: [{ title: "t" }] });
    expect(x.sources?.[0].url).toBe("u");
    expect(x.rewrite).toBe("r");
    expect(x.citations?.[0].title).toBe("t");
  });
  test("coerces null to undefined so optional-chain checks work in React", () => {
    const x = normalizeFinding({ severity: "warn" as const, text: "x", sources: null as never, citations: null as never });
    expect(x.sources).toBeUndefined();
    expect(x.citations).toBeUndefined();
  });
});

describe("normalizeSkillResult", () => {
  test("normalizes each finding and defaults missing fields", () => {
    const raw = { skillId: "fact-check", name: "Fact Check", score: 80, verdict: "warn", summary: "s", findings: [{ severity: "warn", text: "t" }], costUsd: 0.01 };
    const r = normalizeSkillResult(raw);
    expect(r.findings[0].sources).toBeUndefined();
    expect(r.verdict).toBe("warn");
    expect(r.costUsd).toBe(0.01);
  });
  test("falls back to safe defaults for malformed input", () => {
    const r = normalizeSkillResult({});
    expect(r.skillId).toBe("");
    expect(r.findings).toEqual([]);
    expect(r.verdict).toBe("warn");
    expect(r.costUsd).toBe(0);
  });
});

test("survives nested garbage in findings[] — null, strings, numbers, valid mixed", () => {
  const r = normalizeSkillResult({ findings: [null, "oops", 42, { severity: "warn", text: "ok" }] });
  expect(r.findings).toHaveLength(4);
  expect(r.findings[0].text).toBe("");            // null → fallback
  expect(r.findings[1].text).toBe("");            // string → fallback
  expect(r.findings[2].text).toBe("");            // number → fallback
  expect(r.findings[3].text).toBe("ok");          // valid preserved
  expect(r.findings[3].severity).toBe("warn");
});

test("normalizeFinding returns safe default on null/undefined/primitives", () => {
  expect(normalizeFinding(null).text).toBe("");
  expect(normalizeFinding(undefined).severity).toBe("info");
  expect(normalizeFinding("hi").text).toBe("");
  expect(normalizeFinding(42).severity).toBe("info");
});

test("normalizeFinding rejects unknown severity value", () => {
  const r = normalizeFinding({ severity: "critical", text: "x" });
  expect(r.severity).toBe("info");
});
