import { jsonWithCors } from "@/lib/cors";
import { getAllTags } from "@/lib/db";

export async function GET() {
  try {
    return jsonWithCors(getAllTags());
  } catch (err) {
    return jsonWithCors({ error: "Failed to fetch tags" }, { status: 500 });
  }
}
