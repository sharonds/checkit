import { describe, it, expect } from "bun:test";
import { buildPurposePrompt, PURPOSE_TYPES } from "./purpose.ts";

describe("buildPurposePrompt", () => {
  it("includes article text", () => {
    expect(buildPurposePrompt("How to set up TypeScript")).toContain("TypeScript");
  });
  it("lists all purpose types", () => {
    const p = buildPurposePrompt("text");
    for (const t of PURPOSE_TYPES) expect(p).toContain(t);
  });
  it("requests JSON with purpose and recommendations", () => {
    const p = buildPurposePrompt("text");
    expect(p).toContain('"purpose"');
    expect(p).toContain('"recommendations"');
    expect(p).toContain('"missing"');
  });
});

describe("PURPOSE_TYPES", () => {
  it("has 7 types", () => {
    expect(PURPOSE_TYPES).toHaveLength(7);
  });
});
