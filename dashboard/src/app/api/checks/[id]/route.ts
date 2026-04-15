import { jsonWithCors } from "@/lib/cors";
import { getCheckById, getTagsForCheck } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const check = getCheckById(Number(id));
    if (!check) return jsonWithCors({ error: "Not found" }, { status: 404 });
    const tags = getTagsForCheck(check.id!);
    return jsonWithCors({
      ...check,
      results: JSON.parse(check.resultsJson),
      tags,
    });
  } catch (err) {
    return jsonWithCors({ error: "Failed to fetch check" }, { status: 500 });
  }
}
