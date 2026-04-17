export interface BackoffOpts {
  maxRetries?: number;
  baseDelayMs?: number;
  init?: RequestInit;
}

export async function fetchWithBackoff(url: string, opts: BackoffOpts = {}): Promise<Response> {
  const max = opts.maxRetries ?? 3;
  const base = opts.baseDelayMs ?? 500;
  let last: Response | null = null;
  for (let attempt = 0; attempt <= max; attempt++) {
    const res = await fetch(url, opts.init);
    last = res;
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt === max) return res;
    const retryAfterRaw = res.headers.get("Retry-After");
    const retryAfter = retryAfterRaw === null ? NaN : Number(retryAfterRaw);
    const delay = Number.isFinite(retryAfter) && retryAfter >= 0
      ? retryAfter * 1000
      : base * Math.pow(2, attempt) + Math.random() * base;
    await new Promise((r) => setTimeout(r, delay));
  }
  return last!;
}
