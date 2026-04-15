import { jsonWithCors } from "@/lib/cors";
import { getContexts, upsertContext } from "@/lib/db";

export async function GET() {
  try {
    const all = getContexts();
    return jsonWithCors(all);
  } catch {
    return jsonWithCors({ error: "Failed to fetch contexts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { type, name, content } = (await request.json()) as {
      type: string;
      name: string;
      content: string;
    };
    if (!type || !name) {
      return jsonWithCors(
        { error: "type and name are required" },
        { status: 400 }
      );
    }
    upsertContext(type, name, content ?? "");
    return jsonWithCors({ ok: true });
  } catch {
    return jsonWithCors({ error: "Failed to save context" }, { status: 500 });
  }
}
