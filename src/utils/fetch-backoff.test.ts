import { describe, test, expect } from "bun:test";
import { fetchWithBackoff } from "./fetch-backoff.ts";
import { mockFetch, jsonResponse } from "../testing/mock-fetch.ts";

describe("fetchWithBackoff", () => {
  test("retries on 429 with exponential backoff", async () => {
    let calls = 0;
    mockFetch(async () => {
      calls++;
      if (calls < 3) return new Response("rate limited", { status: 429, headers: { "Retry-After": "0" } });
      return jsonResponse({ ok: true });
    });
    const res = await fetchWithBackoff("https://x.example", { maxRetries: 3, baseDelayMs: 1 });
    expect(res.status).toBe(200);
    expect(calls).toBe(3);
  });
  test("gives up after maxRetries and returns last response", async () => {
    mockFetch(async () => new Response("still limited", { status: 429 }));
    const res = await fetchWithBackoff("https://x.example", { maxRetries: 2, baseDelayMs: 1 });
    expect(res.status).toBe(429);
  });
  test("does not retry on 2xx", async () => {
    let calls = 0;
    mockFetch(async () => { calls++; return jsonResponse({ ok: true }); });
    const res = await fetchWithBackoff("https://x.example", { maxRetries: 3, baseDelayMs: 1 });
    expect(calls).toBe(1);
    expect(res.status).toBe(200);
  });
  test("does not retry on 4xx other than 429", async () => {
    let calls = 0;
    mockFetch(async () => { calls++; return new Response("bad", { status: 400 }); });
    const res = await fetchWithBackoff("https://x.example", { maxRetries: 3, baseDelayMs: 1 });
    expect(calls).toBe(1);
    expect(res.status).toBe(400);
  });
  test("retries on 5xx", async () => {
    let calls = 0;
    mockFetch(async () => {
      calls++;
      if (calls < 2) return new Response("server down", { status: 503 });
      return jsonResponse({ ok: true });
    });
    const res = await fetchWithBackoff("https://x.example", { maxRetries: 3, baseDelayMs: 1 });
    expect(calls).toBe(2);
    expect(res.status).toBe(200);
  });
});
