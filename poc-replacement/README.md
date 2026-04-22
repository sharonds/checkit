# POC Replacement — Gemini vs Other CheckApp APIs

Standalone POC scripts determining whether Gemini can replace or augment the specialised
third-party APIs CheckApp currently uses. Each POC is self-contained: it builds a test corpus,
runs the current implementation against a Gemini-based alternative, scores against ground truth,
and produces a findings report.

**No production code changes here.** This directory produces data only. Integration decisions
are made after reviewing the DECISION-MATRIX.md.

---

## Context

Part of the 3-plan research programme:

- **Plan 1** — Fact-check research (complete). Benchmark: `poc/FINDINGS.md`.
- **Plan 2** — Integrating Engine B (Gemini grounding) as the default fact-checker behind a feature flag.
- **Plan 3 (this)** — POCs for the remaining CheckApp skills: plagiarism, AI detection, citations, LLM skills swap.
- **Gate 4** — Decision to widen Gemini's footprint is gated on `DECISION-MATRIX.md` review.

---

## Directory Structure

```
poc-replacement/
  lib/
    gemini.ts               Shared Gemini client (plain + grounded calls)
    scoring.ts              Binary scoring, confusion matrix, precision/recall
  01-plagiarism/
    corpus.ts               10 test articles with sentence-level ground truth
    run.ts                  Copyscape vs Gemini grounding runner
    RESULTS.md              Findings + verdict
    PROVENANCE.md           Corpus source licensing
  02-ai-detection/
    corpus.ts               20 AI/human samples with provenance labels
    run.ts                  Copyscape AI detector vs Gemini runner
    RESULTS.md              Findings + verdict
  03-academic-citations/
    corpus.ts               10 scientific/medical claims with gold citations
    run.ts                  Semantic Scholar vs Gemini grounding runner
    RESULTS.md              Findings + verdict
  04-llm-skills-swap/
    run.ts                  MiniMax-M2.7 vs Gemini 3.1 Pro on 5 LLM skills
    RESULTS.md              Findings + verdict
  ANNOTATION-GUIDELINES.md  Per-POC rubrics — MUST be read before corpus creation
  FINDINGS.md               Live research log (updated as POCs complete)
  DECISION-MATRIX.md        Synthesis (written after all 4 POCs complete)
```

---

## Running POCs

All POCs require `GEMINI_API_KEY`. Some require additional keys (see per-POC notes below).
Keys are loaded from the root `.env` file automatically.

```bash
# POC 1 — Plagiarism (needs COPYSCAPE_USERNAME + COPYSCAPE_API_KEY)
bun poc-replacement/01-plagiarism/run.ts

# POC 2 — AI Detection (needs COPYSCAPE_USERNAME + COPYSCAPE_API_KEY)
bun poc-replacement/02-ai-detection/run.ts

# POC 3 — Academic Citations (needs SEMANTIC_SCHOLAR_API_KEY)
bun poc-replacement/03-academic-citations/run.ts

# POC 4 — LLM Skills Swap (needs GEMINI_API_KEY + MINIMAX_API_KEY or MINIMAX_GROUP_ID)
bun poc-replacement/04-llm-skills-swap/run.ts
```

---

## Acceptance Criteria per POC

| POC | Replace condition | Keep condition |
|-----|-------------------|----------------|
| 1 Plagiarism | Gemini ≥ 85% accuracy at ≤ 2× Copyscape cost | Accuracy gap > 15% OR cost > 3× |
| 2 AI Detection | Gemini ≥ 90% accuracy AND ≥ Copyscape baseline | Expected to fail — "prove unsuitable" experiment |
| 3 Citations | Gemini equivalent recall at lower cost | Semantic Scholar structured graph has better recall |
| 4 LLM Swap | Gemini mean score ≥ MiniMax on ≥ 4/5 skills, no >1-pt regression | Any skill regression > 1.0 on any dimension |

Verdict options: `keep` / `augment` / `replace` / `reject-as-unsuitable`. See `ANNOTATION-GUIDELINES.md` for scoring rubrics.

---

## Budget

Total research budget: **≤ $15 in API costs** across all 4 POCs (tracked in `FINDINGS.md`).

---

## Prior Work

The fact-check POC is in `poc/`. The methodology there (corpus design, engine comparison,
ground-truth correction process) is the template these replacement POCs follow.
See `poc/FINDINGS.md` for the full methodology and a description of `poc/validate.ts` — the
shared Gemini client patterns were extracted from that file into `lib/gemini.ts`.
