import { fetchWithBackoff } from "../utils/fetch-backoff.ts";

export interface SSPaper {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  authors: Array<{ name: string }>;
  externalIds?: { DOI?: string };
  url?: string;
}

interface SSResponse { data?: SSPaper[]; }

/**
 * Search Semantic Scholar for papers matching a query.
 *
 * Unauthenticated rate limit: 100 requests per 5 minutes.
 * fetchWithBackoff handles 429 gracefully.
 *
 * Returns up to `limit` papers (default 3). Returns empty array on error
 * or no matches — caller treats zero citations as a warn (no academic
 * support for this claim), not a hard failure.
 */
export async function ssSearch(query: string, limit = 3): Promise<SSPaper[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", "title,abstract,year,authors,externalIds,url");
  try {
    const res = await fetchWithBackoff(url.toString(), { maxRetries: 3, baseDelayMs: 1000 });
    if (!res.ok) return [];
    const json = (await res.json()) as SSResponse;
    return json.data ?? [];
  } catch {
    return [];
  }
}
