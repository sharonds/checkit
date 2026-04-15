import { jsonWithCors } from "@/lib/cors";
import { addTagsToCheck, getTagsForCheck } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { tags } = await request.json() as { tags?: string[] };
    if (!tags?.length) return jsonWithCors({ error: "tags array required" }, { status: 400 });
    addTagsToCheck(Number(id), tags);
    return jsonWithCors({ tags: getTagsForCheck(Number(id)) });
  } catch (err) {
    return jsonWithCors({ error: "Failed to add tags" }, { status: 500 });
  }
}
