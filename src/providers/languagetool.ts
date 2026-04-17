import { fetchWithBackoff } from "../utils/fetch-backoff.ts";

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

/**
 * POST plain-text to LanguageTool's /v2/check endpoint.
 * Managed tier: 20 req/min, 20KB/request cap. Self-hosted has no cap.
 * Uses fetchWithBackoff to handle 429 gracefully.
 */
export async function ltCheck(opts: LTCheckOpts): Promise<LTResponse> {
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
