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
| Copyscape (AI detection) | TBD | — | POC 2 — expected to lose |
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
| 1 — Plagiarism | 10+10 calls | ~$0.10 + ~$0.38 | **$0.48** |
| 2 — AI Detection | — | — | — |
| 3 — Academic Citations | — | — | — |
| 4 — LLM Skills Swap | — | — | — |
| **Total** | | | **$0.48 / $15.00 budget** |

---

## POC 1 — Plagiarism (Copyscape vs Gemini grounding)

**Status:** Complete. Verdict: **augment**
**Run date:** 2026-04-22

| Metric | Copyscape | Gemini |
|---|---|---|
| Sentence-level accuracy | 97.3% | **100.0%** |
| Sentence-level recall | 91.3% | **100.0%** |
| Sentence-level precision | 100.0% | 100.0% |
| Article-level accuracy | 90.0% | **100.0%** |
| False positives | 0 | 0 |
| Cost/article | **$0.010** | $0.038 (3.8×) |
| Avg time/article | **~1.4s** | ~42.5s |

**Key finding:** Gemini caught near-verbatim plagiarism (introductory clause added to Wikipedia
text) that Copyscape returned 0% on. Both engines had zero false positives on paraphrased or
original content.

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

**Status:** Not started.

_Results will be filled in after `bun poc-replacement/02-ai-detection/run.ts` completes._

Corpus: 20 samples (5 pure human, 5 pure AI, 5 AI-then-edited, 5 human-then-polished).
Scoring: binary AI/HUMAN classification + Spearman calibration.
See: `02-ai-detection/RESULTS.md`

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
