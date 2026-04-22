import { describe, expect, test } from "bun:test";
import { createInteraction, extractText, pollUntilComplete } from "./interactions-api.ts";
import { jsonResponse, mockFetch } from "../testing/mock-fetch.ts";

describe("interactions-api", () => {
  test("createInteraction posts to the interactions endpoint and returns the id", async () => {
    let seenUrl = "";
    let seenBody = "";

    mockFetch(async (req) => {
      seenUrl = req.url;
      seenBody = await req.text();
      return jsonResponse({ id: "int-123" }, 201);
    });

    await expect(createInteraction("api-key", { input: "ping" })).resolves.toEqual({ id: "int-123" });
    expect(seenUrl).toBe("https://generativelanguage.googleapis.com/v1beta/interactions?key=api-key");
    expect(JSON.parse(seenBody)).toEqual({ input: "ping" });
  });

  test("pollUntilComplete waits for a completed status transition", async () => {
    let polls = 0;

    mockFetch(async (req) => {
      polls++;
      expect(req.method).toBe("GET");
      if (polls === 1) {
        return jsonResponse({ id: "int-123", status: "running" });
      }
      return jsonResponse({
        id: "int-123",
        status: "completed",
        outputs: [{ text: "finished" }],
      });
    });

    const result = await pollUntilComplete("int-123", "api-key", { pollIntervalMs: 0, maxPolls: 3 });

    expect(result.status).toBe("completed");
    expect(extractText(result)).toBe("finished");
    expect(polls).toBe(2);
  });

  test("extractText returns the first available text output", () => {
    expect(extractText({ id: "int-1", status: "completed" })).toBe("");
    expect(extractText({ id: "int-1", status: "completed", outputs: [{}, { text: "later" }] })).toBe("later");
  });

  test("createInteraction URL-encodes the API key", async () => {
    let seenUrl = "";
    mockFetch(async (req) => {
      seenUrl = req.url;
      return jsonResponse({ id: "int-enc" }, 201);
    });
    await createInteraction("abc+def/ghi", { input: "ping" });
    expect(seenUrl).toContain("%2B");
    expect(seenUrl).toContain("%2F");
    expect(seenUrl).not.toContain("abc+def/ghi");
  });

  test("pollUntilComplete URL-encodes the interaction id and key", async () => {
    let seenUrl = "";
    mockFetch(async (req) => {
      seenUrl = req.url;
      return jsonResponse({ id: "int/with/slash", status: "completed", outputs: [{ text: "x" }] });
    });
    await pollUntilComplete("int/with/slash", "abc+key", { pollIntervalMs: 0, maxPolls: 1 });
    expect(seenUrl).toContain("int%2Fwith%2Fslash");
    expect(seenUrl).toContain("abc%2Bkey");
  });
});
