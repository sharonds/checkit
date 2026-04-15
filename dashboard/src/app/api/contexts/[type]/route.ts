import { jsonWithCors } from "@/lib/cors";
import { getContextByType, deleteContextByType } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const ctx = getContextByType(type);
    if (!ctx) {
      return jsonWithCors({ error: "Context not found" }, { status: 404 });
    }
    return jsonWithCors(ctx);
  } catch {
    return jsonWithCors({ error: "Failed to fetch context" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    deleteContextByType(type);
    return jsonWithCors({ ok: true });
  } catch {
    return jsonWithCors(
      { error: "Failed to delete context" },
      { status: 500 }
    );
  }
}
