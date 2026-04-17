import { jsonWithCors } from "@/lib/cors";
import { readAppConfig, writeAppConfig, getApiKeyStatus } from "@/lib/config";
import { guardLocalMutation } from "@/lib/guard-local";
import { NextRequest } from "next/server";

const SKILL_META = [
  { id: "plagiarism", name: "Plagiarism Check", engine: "Copyscape", requiresKeys: ["copyscape"] },
  { id: "aiDetection", name: "AI Detection", engine: "Copyscape", requiresKeys: ["copyscape"] },
  { id: "seo", name: "SEO Analysis", engine: "Offline", requiresKeys: [] },
  { id: "factCheck", name: "Fact Check", engine: "Exa AI + MiniMax", requiresKeys: ["exa", "minimax"] },
  { id: "tone", name: "Tone of Voice", engine: "MiniMax", requiresKeys: ["minimax"] },
  { id: "legal", name: "Legal Risk", engine: "MiniMax", requiresKeys: ["minimax"] },
  { id: "summary", name: "Content Summary", engine: "MiniMax", requiresKeys: ["minimax"] },
];

export async function GET() {
  try {
    const config = readAppConfig() as Record<string, unknown>;
    const skills = (config.skills ?? {}) as Record<string, boolean>;
    const apiKeys = getApiKeyStatus();
    const result = SKILL_META.map((s) => ({
      ...s,
      enabled: skills[s.id] ?? false,
      keysConfigured: s.requiresKeys.length === 0 || s.requiresKeys.every((k) => apiKeys[k as keyof typeof apiKeys]),
    }));
    return jsonWithCors(result);
  } catch (err) {
    return jsonWithCors({ error: "Failed to fetch skills" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const blocked = guardLocalMutation(req);
  if (blocked) return blocked;
  try {
    const { skillId, enabled } = await req.json() as { skillId: string; enabled: boolean };
    const config = readAppConfig() as Record<string, unknown>;
    const skills = { ...(config.skills as Record<string, boolean> ?? {}) };
    skills[skillId] = enabled;
    writeAppConfig({ skills });
    return jsonWithCors({ ok: true });
  } catch (err) {
    return jsonWithCors({ error: "Failed to toggle skill" }, { status: 500 });
  }
}
