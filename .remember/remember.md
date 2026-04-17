# Handoff

## State (verified 2026-04-18)

**Rebrand complete.** Both repos renamed from Checkit → CheckApp. Platform side done:
- GitHub: `sharonds/checkapp` (auto-redirects from old `checkit` + `article-checker` URLs)
- Local dir: `~/checkapp`
- Branch: `main`

## Repo state

- Latest commit on main: `d1c87bb rebrand: rename checkit → CheckApp (full) (#10)`
- `package.json`: `name` is `checkapp`, `bin` is `checkapp`
- MCP server: `checkapp`
- Config dir: `~/.checkapp/` (migrates from legacy `~/.checkit/` or `~/.article-checker/` automatically on first run — see `src/config.ts`)
- Dashboard db migration same pattern (see `dashboard/src/lib/db.ts`)
- Env var `CHECKAPP_DB` accepted; legacy `ARTICLE_CHECKER_DB` also accepted for backwards compat
- 160 CLI tests + 20 dashboard tests pass
- 4 binaries build: `dist/checkapp-{mac-arm64,mac-x64,linux-x64,win-x64.exe}`

## Cross-repo

The marketing landing page lives at `~/checkapp-landing` (repo `sharonds/checkapp-landing`, deployed at `checkapp.xyz`). Phase 7 planning + execution happens there, not here.

## Next

Start a **fresh session** to preserve context budget. Choose one:

**Path A: Phase 7 implementation plan (recommended)**
Read `~/checkapp-landing/docs/superpowers/roadmap/2026-04-17-phase7-research-backed-editor.md`, then write a 30-task implementation plan at `~/checkapp-landing/docs/superpowers/plans/2026-04-18-phase7-implementation.md`. Use `superpowers:writing-plans`. Do NOT execute — just plan.

**Path B: Execute Phase 7**
After the plan is written, execute with `superpowers:subagent-driven-development`. Options-per-category provider picker first, then 5 new skills, then upgrades to existing skills.

## Phase 7 scope (short list)

1. Options-per-category provider picker UI (Settings)
2. Grammar & Style skill (LanguageTool default, Sapling / LLM fallback)
3. Academic Citations skill (Semantic Scholar — free, no key)
4. Self-plagiarism skill (Cloudflare Vectorize / Pinecone / Upstash Vector)
5. Deep Fact-Check upgrade (Exa Deep Reasoning / Parallel Task — existing skill)
6. Claim-level proof drill-down UI in dashboard reports
7. Evidence + rewrite + citation attached to every flagged finding
8. Cost tracker per skill per provider

## Context lessons from this session

- **Don't run `sed` across `docs/superpowers/plans/*.md`** — they're historical artifacts. If rebranding again in the future, exclude that directory. The landing repo has 2 annotated "corrupted historical" files because of this.
- **Extension filters matter for `grep -rl`** — `.txt` files like `llms.txt` were missed by earlier sed because include list was `.md/.ts/.tsx/.json`. Add `--include="*.txt"` next time.
- **Dashboard tests use `ARTICLE_CHECKER_DB` env var** historically. `getDb()` now accepts both that and `CHECKAPP_DB` for backwards compat — don't remove the fallback.
- **Config dir migration is 3-generation**: `~/.article-checker` → `~/.checkit` → `~/.checkapp`. The `LEGACY_DIRS` array in both `src/config.ts` and `dashboard/src/lib/db.ts` handles both legacy paths.

## Fresh session boot prompt

```
Read ~/checkapp-landing/docs/superpowers/roadmap/2026-04-17-phase7-research-backed-editor.md and ~/checkapp-landing/AGENTS.md and ~/checkapp-landing/.remember/remember.md, then write a ~30-task implementation plan at ~/checkapp-landing/docs/superpowers/plans/2026-04-18-phase7-implementation.md using superpowers:writing-plans. Do NOT execute — just plan. Ask me any clarifying questions before writing.
```
