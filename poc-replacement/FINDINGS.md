# POC Replacement — Live Research Log

**Programme:** CheckApp Gemini Replacement POCs (Plan 3)
**Started:** 2026-04-21
**Status:** Infrastructure scaffolded. POC 1 (Plagiarism) not yet started.

---

## TL;DR

_Filled in after all four POCs complete._

| API / Skill | Verdict | Evidence strength | Notes |
|---|---|---|---|
| Copyscape (plagiarism) | **augment** | 10 articles, 75 sentences, 0 FP | POC 1 |
| Copyscape (AI detection) | **augment** | 20 samples, complementary failure modes | POC 2 |
| Semantic Scholar (citations) | TBD | — | POC 3 |
| LLM (tone/legal/summary/brief/purpose) | TBD | — | POC 4 |

Verdict options: `keep` / `augment` / `replace` / `reject-as-unsuitable`

---

## Methodology

These POCs follow the same design principles as the fact-check research in `poc/FINDINGS.md`:

- **Ground truth first.** Each corpus is labelled before running any engine.
- **Per-POC rubric.** Scoring criteria are written in `ANNOTATION-GUIDELINES.md` before
  corpus creation — not retroactively.
- **Asymmetric expectations.** We do not expect Gemini to win every comparison. Some POCs
  are structured as "prove unsuitable" experiments (POC 2).
- **4-way verdicts.** `keep | augment | replace | reject-as-unsuitable` — not binary.
- **Budget.** ≤ $15 total across all four POCs. Actuals tracked below.

### Prior (hypotheses before testing)

| Skill | Hypothesis |
|---|---|
| Plagiarism | Uncertain — Gemini grounding can search for phrases but can't compute granular similarity |
| AI detection | Expected to lose — statistical classifiers beat LLMs on their own output |
| Academic citations | Uncertain — Gemini has breadth; Scholar has structured citation graph |
| Tone / Legal / Summary / Brief / Purpose | Trivial swap — already LLM, just change provider |

---

## Cost Tracker

| POC | API calls | Estimated cost | Actual cost |
|---|---|---|---|
| 1 — Plagiarism (initial+extended) | 16+16 calls | ~$0.16 + ~$0.61 | **$0.77** |
| 2 — AI Detection | 20+20 calls | $0.20 + $0.06 | **$0.26** |
| 3 — Academic Citations | — | — | — |
| 4 — LLM Skills Swap | — | — | — |
| **Total** | | | **$1.03 / $15.00 budget** |

---

## POC 1 — Plagiarism (Copyscape vs Gemini grounding)

**Status:** Complete. Verdict: **augment**
**Initial run:** 2026-04-21 (10 English/Wikipedia articles)
**Extension run:** 2026-04-22 (+3 Hebrew + 2 non-Wikipedia English + 1 Hebrew original)

### Combined results (16 articles, 119 sentences, 43 plagiarised GT positives)

| Metric | Copyscape | Gemini |
|---|---|---|
| Sentence-level accuracy | 98.3% | **100.0%** |
| Sentence-level recall | 95.3% | **100.0%** |
| Sentence-level precision | 100.0% | 100.0% |
| Article-level accuracy (16) | 93.8% (15/16) | **100.0% (16/16)** |
| False positives | 0 | 0 |
| Cost/article | **$0.010** | $0.038 (3.8×) |
| Avg time/article | **~1.4s** | ~42.5s |

**Key findings:**

1. **Near-verbatim gap** — Gemini caught near-verbatim plagiarism (introductory clause added
   to Wikipedia text) that Copyscape returned 0% on. Both engines had zero false positives.

2. **Hebrew parity** — Both engines performed equally well on Hebrew content (he.wikipedia.org
   and idi.org.il). Language is not a differentiator.

3. **Non-Wikipedia coverage is weaker in Copyscape's aggregate score** — On Britannica content
   (heavy plagiarism, 5 verbatim sentences), Copyscape's reported similarity was only 26%
   vs 65% on equivalent Wikipedia content. Copyscape *did* find Britannica in its match list
   (position 8 of 27), but the aggregate similarity % is an unreliable severity signal
   across source sites. Gemini reported a consistent 76% regardless of source site.

4. **`.co.il` sites untested** — `ynet`, `mako`, `calcalist`, `themarker` blocked WebFetch.
   Hypothesis: if Copyscape's Israeli news coverage is similar to its Britannica coverage
   (shallow aggregate %), copies from Israeli news could register as borderline rather than
   heavy. Treat as production-monitoring hypothesis, not proven gap.

**Why not replace:** Gemini at $0.038/call is 3.8× Copyscape's $0.01 — exceeds the ≤ 2×
replacement cost criterion. Also 30× slower.

**Recommended hybrid:** Copyscape primary. Gemini secondary check only when Copyscape returns
< 10% similarity on articles showing encyclopedic-style writing. Expected to add <$0.038 per
borderline case rather than all articles.

**Reliability note:** Gemini's JSON output was truncated on 4 clean articles (empty
`copiedSentences` array). Scores were correct because the runner defaulted to
`isPlagiarized: false`, but this is a production concern. Fix: detect truncated pattern
explicitly before full JSON parse.

Full results: `01-plagiarism/RESULTS.md`

---

## POC 2 — AI Detection (Copyscape AI detector vs Gemini)

**Status:** Complete. Verdict: **augment**
**Run date:** 2026-04-22

| Metric | Copyscape | Gemini |
|---|---|---|
| Accuracy | **90.0%** | 80.0% |
| Precision | 83.3% | **100.0%** |
| Recall | **100.0%** | 60.0% |
| F1 | **90.9%** | 75.0% |
| Spearman (score vs actual AI %) | **0.896** | 0.747 |
| Cost/sample | $0.010 | **$0.003** (3.3× cheaper) |

**Key finding — complementary failure modes (not overlapping):**

| Provenance | Copyscape correct | Gemini correct |
|---|---|---|
| pure-human | 5/5 | 5/5 |
| pure-ai | 5/5 | 5/5 |
| ai-then-edited | **5/5** | 1/5 ❌ |
| human-then-polished | 3/5 ❌ | **5/5** |

- **Gemini FNs (4 cases)**: missed every AI sample that had been lightly edited with personal
  anecdotes. It over-weights "specific personal details" as a HUMAN signal, even when 80%+
  of the structure is AI. **Exploitable**: adding a few personal anecdotes bypasses Gemini.
- **Copyscape FPs (2 cases)**: over-flagged human writing that had minor AI polish applied
  to a few sentences. Gemini correctly recognized these as human.

The failure modes are orthogonal, which argues for a **4-state hybrid** signal
(both-AI / CS-only-AI / Gem-only-AI / both-HUMAN) rather than binary replace/keep.

**Cost reversal from POC 1:** Gemini is 3.3× CHEAPER here (no grounding needed for
classification). Opposite of POC 1 where Gemini grounding was 3.8× more expensive.

**Reliability concern:** 1/20 Gemini calls timed out (283s) and fell back to 50%
confidence. Production would need explicit timeout handling.

Full results: `02-ai-detection/RESULTS.md`

---

## POC 3 — Academic Citations (Semantic Scholar vs Gemini grounding)

**Status:** Not started.

_Results will be filled in after `bun poc-replacement/03-academic-citations/run.ts` completes._

Corpus: 10 claims (4 medical, 3 scientific, 3 financial) with gold citations.
Scoring: exact-gold Recall@3/5 and acceptable-support Recall@3/5 (dual metric).
See: `03-academic-citations/RESULTS.md`

---

## POC 4 — LLM Skills Swap (MiniMax-M2.7 vs Gemini 3.1 Pro)

**Status:** Not started.

_Results will be filled in after `bun poc-replacement/04-llm-skills-swap/run.ts` completes._

Skills: Tone, Legal, Summary, Brief, Purpose.
Scoring: per-skill rubric from `ANNOTATION-GUIDELINES.md` + LLM judge (non-Gemini preferred).
See: `04-llm-skills-swap/RESULTS.md`

---

## Synthesis

_Written after all four POCs complete. Will inform Gate 4 decision._

---

## Recommendations

_Written after synthesis. Links to `DECISION-MATRIX.md`._
