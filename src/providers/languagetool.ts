import { fetchWithBackoff } from "../utils/fetch-backoff.ts";
import { splitIntoSentences } from "../passage.ts";

export interface LTMatch {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  context: { text: string; offset: number; length: number };
  rule: {
    id: string;
    description: string;
    category?: { id: string; name: string };
  };
  sentence: string;
}

export interface LTResponse { matches: LTMatch[]; }

export interface LTCheckOpts {
  endpoint: string;
  text: string;
  apiKey?: string;
  language?: string;
}

const LT_CHUNK_SIZE = 18_000; // conservative — leaves room for URL-encoded overhead under 20KB cap

/**
 * POST plain-text to LanguageTool's /v2/check endpoint.
 * Managed tier: 20 req/min, 20KB/request cap. Self-hosted has no cap.
 * Chunks text by sentence boundaries when > 18KB to stay under managed tier cap.
 * Uses fetchWithBackoff to handle 429 gracefully.
 */
export async function ltCheck(opts: LTCheckOpts): Promise<LTResponse> {
  if (Buffer.byteLength(opts.text, "utf8") <= LT_CHUNK_SIZE) {
    return ltCheckOne(opts);
  }

  // Split by sentence, pack into chunks <= LT_CHUNK_SIZE.
  const sentences = splitIntoSentences(opts.text);
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (Buffer.byteLength(cur + " " + s, "utf8") > LT_CHUNK_SIZE && cur) {
      chunks.push(cur);
      cur = s;
    } else {
      cur = cur ? cur + " " + s : s;
    }
  }
  if (cur) chunks.push(cur);

  const results = await Promise.all(
    chunks.map((c, i) => {
      const priorLen = chunks.slice(0, i).reduce((n, ch) => n + ch.length + 1, 0);
      return ltCheckOne({ ...opts, text: c }).then((r) => ({
        ...r,
        matches: r.matches.map((m) => ({ ...m, offset: m.offset + priorLen })),
      }));
    })
  );
  return { matches: results.flatMap((r) => r.matches) };
}

/**
 * POST to LanguageTool without chunking.
 * Internal helper for ltCheck.
 */
async function ltCheckOne(opts: LTCheckOpts): Promise<LTResponse> {
  const body = new URLSearchParams();
  body.set("text", opts.text);
  body.set("language", opts.language ?? "en-US");
  if (opts.apiKey) body.set("apiKey", opts.apiKey);

  const res = await fetchWithBackoff(opts.endpoint, {
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
    maxRetries: 3,
    baseDelayMs: 500,
  });
  if (!res.ok) throw new Error(`LanguageTool ${res.status}: ${await res.text()}`);
  return (await res.json()) as LTResponse;
}
