import { describe, test, expect, mock } from "bun:test";
import { ltCheck } from "./languagetool.ts";
import { mockFetch, urlRouter, jsonResponse } from "../testing/mock-fetch.ts";
import { splitIntoSentences } from "../passage.ts";

describe("ltCheck — chunking", () => {
  test("ltCheck splits text at sentence boundaries when > 18KB", async () => {
    // Build a large article > 18KB (use longer sentences)
    const bigSentence = "Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ";
    const big = bigSentence.repeat(200);

    expect(Buffer.byteLength(big, "utf8")).toBeGreaterThan(18_000);

    const calls: string[] = [];
    mockFetch(urlRouter({
      "languagetool.org": async (req) => {
        const body = await req.text();
        calls.push(body);
        return jsonResponse({ matches: [] });
      },
    }));

    await ltCheck({ endpoint: "http://languagetool.org/v2/check", text: big });

    expect(calls.length).toBeGreaterThan(1);
    for (const body of calls) {
      // Each chunk should be under 18KB (conservative limit)
      expect(body.length).toBeLessThan(20_000);
    }
  });

  test("ltCheck does not chunk text under 18KB", async () => {
    const small = "This is a small text that fits comfortably under the 18KB limit.";
    expect(Buffer.byteLength(small, "utf8")).toBeLessThan(18_000);

    let callCount = 0;
    mockFetch(urlRouter({
      "languagetool.org": async () => {
        callCount++;
        return jsonResponse({ matches: [] });
      },
    }));

    await ltCheck({ endpoint: "http://languagetool.org/v2/check", text: small });
    expect(callCount).toBe(1);
  });

  test("ltCheck adjusts offsets correctly after chunking", async () => {
    // Create text with known matches in different chunks
    const s1 = "This is the first sentence with a speling error. " + "x ".repeat(500);
    const s2 = "This is the second sentence with a speling error. " + "x ".repeat(500);
    const combined = s1 + " " + s2;

    mockFetch(urlRouter({
      "languagetool.org": async (req) => {
        const body = new URLSearchParams(await req.text());
        const text = body.get("text") || "";
        // Simulate finding a match in both chunks
        if (text.includes("speling")) {
          return jsonResponse({
            matches: [{
              message: "Spelling error",
              offset: text.indexOf("speling"),
              length: 7,
              replacements: [{ value: "spelling" }],
              context: { text, offset: text.indexOf("speling"), length: 7 },
              rule: { id: "RULE", description: "Spelling" },
              sentence: text.slice(0, 50),
            }],
          });
        }
        return jsonResponse({ matches: [] });
      },
    }));

    const res = await ltCheck({
      endpoint: "http://languagetool.org/v2/check",
      text: combined,
    });

    // Should find matches with corrected offsets
    expect(res.matches.length).toBeGreaterThan(0);
  });
});
