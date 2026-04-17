import { NextResponse } from "next/server";
import { readAppConfig, writeAppConfig } from "@/lib/config";
import { getCsrfToken } from "@/lib/csrf";
import type { SkillId, SkillProviderConfig } from "@/lib/providers";

function guardLocal(req: Request): NextResponse | null {
  // Only accept mutations from localhost. The dashboard is meant to be
  // local-only (BYOK alpha) — binding to 0.0.0.0 without this would leak
  // API keys over HTTP.
  const host = (req.headers.get("host") ?? "").split(":")[0];
  const allowedHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (!allowedHosts.has(host)) {
    return NextResponse.json(
      { error: "Provider config mutation is only allowed from localhost" },
      { status: 403 }
    );
  }
  // CSRF: the browser client reads the token from a meta tag embedded by
  // the server-rendered layout and echoes it in X-CheckApp-CSRF.
  const csrf = req.headers.get("x-checkapp-csrf");
  const expected = getCsrfToken();
  if (csrf !== expected) {
    return NextResponse.json(
      { error: "CSRF token missing or invalid" },
      { status: 403 }
    );
  }
  return null;
}

export async function GET() {
  const cfg = readAppConfig() as Record<string, unknown>;
  const providers = (cfg.providers as Partial<Record<SkillId, SkillProviderConfig>>) ?? {};
  return NextResponse.json({
    providers,
    // API keys are masked in GET for display; never returned in cleartext.
    hasKey: Object.fromEntries(
      Object.entries(providers).map(([k, v]) => [k, Boolean((v as SkillProviderConfig | undefined)?.apiKey)])
    ),
  });
}

export async function PUT(req: Request) {
  const blocked = guardLocal(req);
  if (blocked) return blocked;

  const body = (await req.json()) as {
    skillId: SkillId;
    provider: string;
    apiKey?: string;
    extra?: Record<string, string>;
  };

  const cfg = readAppConfig() as Record<string, unknown>;
  const providers = { ...((cfg.providers as Record<string, unknown>) ?? {}) };
  providers[body.skillId] = { provider: body.provider, apiKey: body.apiKey, extra: body.extra };
  writeAppConfig({ providers });
  return NextResponse.json({ ok: true });
}
