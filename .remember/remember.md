# Handoff

## State

**Checkit v1.0 shipped** (renamed from article-checker). App is at `~/checkit`, GitHub is `sharonds/checkit`. PR #9 merged the rebrand into main.

Latest main SHA: see `git log --oneline main | head -1`.

**Config migration active:** first CLI launch moves `~/.article-checker/` → `~/.checkit/` once (idempotent). Binaries emit as `dist/checkit-{mac-arm64,mac-x64,linux-x64,win-x64.exe}`.

**Domain (planned, not yet live):** `checkit.cc`. Old `articlechecker.dev` references are fully gone from the tree.

## Tests

160/160 pass (`bun test src/*.test.ts src/skills/*.test.ts`). 20 pre-existing dashboard React-import failures are unrelated and exist on a clean main.

## Next

- **Landing is live (preview URL):** `https://checkit-landing-jzalu89yv-sharons-projects-fca19fb6.vercel.app`. Repo at `sharonds/checkit-landing`. Next steps: (a) point domain `checkit.cc` at Vercel (`vercel domains add checkit.cc` + DNS A-record `76.76.21.21`), (b) add `NEXT_PUBLIC_WEB3FORMS_KEY` to Preview env via dashboard.
- **Lighthouse on landing:** run on the live URL. Target Perf ≥ 85, A11y ≥ 95, BP/SEO = 100. If Perf drops under 85, consider `next/dynamic` on `DashboardWalkthrough` (big framer-motion + 4 images below fold).
- **Roadmap:** Phase 7 (research-backed editor) + Phase 8 (Checkit Studio) — see `docs/ROADMAP-IDEAS.md`.

## Notes

- MCP server name is `checkit` (was `article-checker`).
- GitHub auto-redirects `sharonds/article-checker` → `sharonds/checkit` for any old clone URLs.
