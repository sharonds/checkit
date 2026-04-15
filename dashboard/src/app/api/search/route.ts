import { jsonWithCors } from "@/lib/cors";
import { searchChecks } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const tag = url.searchParams.get("tag") ?? undefined;
    const results = searchChecks(q, tag);
    const parsed = results.map((c) => ({
      ...c,
      results: JSON.parse(c.resultsJson),
    }));
    return jsonWithCors(parsed);
  } catch (err) {
    return jsonWithCors({ error: "Search failed" }, { status: 500 });
  }
}
