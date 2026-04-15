import { jsonWithCors } from "@/lib/cors";
import { getMaskedConfig, writeAppConfig, getApiKeyStatus } from "@/lib/config";

export async function GET() {
  try {
    return jsonWithCors({ config: getMaskedConfig(), apiKeys: getApiKeyStatus() });
  } catch (err) {
    return jsonWithCors({ error: "Failed to read config" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    writeAppConfig(body);
    return jsonWithCors({ ok: true });
  } catch (err) {
    return jsonWithCors({ error: "Failed to update config" }, { status: 500 });
  }
}
