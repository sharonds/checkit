# POC 2 Results — AI Detection (Copyscape AI detector vs Gemini prompt-based)

**Run date:** 2026-04-22
**Corpus:** 20 samples — 10 AI / 10 HUMAN, balanced across 4 provenance types
**Framing:** "prove unsuitable" experiment — prior expected Gemini to underperform on LLM-detection

---

## Headline numbers

| Metric | Copyscape | Gemini |
|---|---|---|
| TP | 10 | 6 |
| FP | **2** | 0 |
| TN | 8 | 10 |
| FN | 0 | **4** |
| **Accuracy** | **90.0%** | 80.0% |
| **Precision** | 83.3% | **100.0%** |
| **Recall** | **100.0%** | 60.0% |
| **F1** | **90.9%** | 75.0% |
| **Spearman (score vs actual AI %)** | **0.896** | 0.747 |
| Cost total (20 samples) | $0.200 | **$0.060** |
| Cost/sample | $0.010 | **$0.003** |
| Avg time/sample | ~2.2s | ~14s (one 283s outlier) |

---

## Corpus breakdown

| Provenance | Label | n | Copyscape correct | Gemini correct |
|---|---|---|---|---|
| pure-human | HUMAN | 5 | **5/5** | **5/5** |
| pure-ai | AI | 5 | **5/5** | **5/5** |
| ai-then-edited | AI | 5 | **5/5** | 1/5 ❌ |
| human-then-polished | HUMAN | 5 | 3/5 ❌ | **5/5** |

**The two engines have complementary failure modes on mixed-provenance content.**

---

## The key finding: complementary failure modes

### Gemini's weakness: AI-then-edited content (4/5 wrong)

Gemini missed every AI sample that had been lightly human-edited (added anecdotes,
personal details, casual register). Its reasoning on these cases consistently cited
"highly specific personal anecdotes" and "idiomatic phrasing" as evidence of HUMAN origin
— even though 80–85% of each sample was AI-generated.

Examples of Gemini's wrong verdicts:
- `M2-cooking` (80% AI): Gemini said **15% AI** — "features personal anecdotes... without typical AI hedging"
- `M3-hiking` (80% AI): Gemini said **10% AI** — "highly specific personal anecdotes (Mount Tamalpais, cheese sandwich loadout) and niche domain terms"
- `M4-budget` (82% AI): Gemini said **15% AI** — "specific personal anecdotes, conversational idioms"
- `M5-learning` (83% AI): Gemini said **10% AI** — "specific personal anecdotes (studying Italian and Hebrew)"

Copyscape caught all of these (95–99% AI scores) — its statistical/perplexity-based
signal is not fooled by the addition of personal details when the underlying prose
structure remains formulaic.

**Exploitable implication:** An author could bypass Gemini's detection by sprinkling
a few specific personal details into AI-generated text. Copyscape's approach is robust
to this attack.

### Copyscape's weakness: human-then-polished content (2/5 wrong)

Copyscape false-positived on 2 human-written samples that had minor AI polishing
applied to a few sentences:
- `P2-polished-journal-apartment` (82% human): Copyscape said **80% AI** — wrong
- `P5-polished-grandfather` (81% human): Copyscape said **54% AI** — wrong

Gemini correctly classified both as HUMAN (10% and 10% AI respectively), citing the
"highly idiosyncratic metaphors" and "deeply personal" content.

**Implication:** Copyscape's statistical signal can be tricked by applying AI polish
to human prose — the AI-like sentence rhythm propagates through nearby human content
in the perplexity calculation.

---

## Calibration (Spearman correlation with actual AI word %)

| Engine | ρ | Interpretation |
|---|---|---|
| Copyscape | 0.896 | Strong — score tracks actual AI proportion closely |
| Gemini | 0.747 | Moderate — score is informative but less reliable |

Gemini's calibration is weakened by its over-reliance on a single feature (personal
details). Copyscape's per-segment perplexity scoring aggregates more smoothly over
the full text.

---

## Reliability notes

### Gemini timeout (1/20)

`H3-lincoln-gettysburg` triggered a 283-second timeout on the Gemini call. The fallback
defaulted to `aiProbability: 50, confidence: low`, which happens to classify as HUMAN
under the > 50 threshold rule — luckily correct for this sample. In production this
would be a reliability concern: a timeout on an AI sample would be misclassified.

### Gemini over-hedged on short text

Gemini's low-confidence fallback on timeout returns 50%. For any sample where Gemini
times out, the binary threshold at 50% is a coin flip. Any production deployment would
need to handle timeouts explicitly (e.g., re-queue, or treat as "unknown").

---

## Combined-signal analysis

If we merged both engines into a hybrid classifier, what performance would we get?

| Strategy | TP | FP | TN | FN | Accuracy | Recall | Precision |
|---|---|---|---|---|---|---|---|
| Copyscape alone | 10 | 2 | 8 | 0 | 90.0% | 100% | 83.3% |
| Gemini alone | 6 | 0 | 10 | 4 | 80.0% | 60% | 100% |
| **Either says AI (OR)** | 10 | 2 | 8 | 0 | 90.0% | 100% | 83.3% |
| **Both say AI (AND)** | 6 | 0 | 10 | 4 | 80.0% | 60% | 100% |
| **Weighted ensemble** (0.6·CS + 0.4·Gem, threshold 50) | 10 | 2 | 8 | 0 | 90.0% | 100% | 83.3% |

The OR strategy is equivalent to Copyscape alone here — Gemini never caught an AI that
Copyscape missed. The AND strategy is equivalent to Gemini alone here — Copyscape
never flagged a HUMAN that Gemini didn't also.

**The real value of the combined signal is the DISAGREEMENT pattern:**
- Both-AI (6 cases): definitive AI, very high confidence
- Copyscape-AI + Gemini-HUMAN (6 cases): "AI with human polish" — could be either direction
- Copyscape-HUMAN + Gemini-AI (0 cases): never happened
- Both-HUMAN (8 cases): definitive HUMAN

This 4-state signal is more useful to a user than either engine's binary verdict alone.

---

## Cost — surprising reversal from POC 1

Gemini is **3.3× CHEAPER** than Copyscape for AI detection ($0.003 vs $0.010).

This is the opposite of POC 1 (plagiarism), where Gemini's grounding cost pushed it to
3.8× MORE expensive than Copyscape. AI detection doesn't require grounding — it's a
classification task on the text itself — so a plain LLM call suffices.

---

## Verdict

### **augment** (leaning specifically on the ambiguity-detection angle)

### Reasoning against each 4-way option

- **replace** — NO. Gemini's 80% < 90% accuracy threshold, and Copyscape's 90% is the
  baseline to beat. Gemini also fails catastrophically (60% recall) on AI-edited content.
- **reject-as-unsuitable** — NO. Gemini is not systematically misleading; its 100%
  precision on human classification is actually a meaningful safety property.
- **keep** — NO. Gemini's 80% accuracy is above the 70% threshold, and it catches
  something Copyscape misses (the 2 human-polished FPs).
- **augment** — YES. Complementary failure modes argue for using both signals.

### Specifically: how to augment

Do NOT use Gemini as a primary AI detector — its 60% recall on AI-edited content is
too low for that role. Use it as a **secondary signal specifically to flag ambiguity**:

- When Copyscape says ≥70% AI AND Gemini says ≥70% AI → ship "very likely AI" verdict
  to user
- When Copyscape says ≥70% AI AND Gemini says ≤30% AI → ship "AI-generated with
  humanizing edits" verdict — tells the user the structure is AI but the style has
  been personalised
- When Copyscape says 30–70% AND Gemini says ≤20% → ship "likely human with some AI
  polish" — correctly identifies the human-then-polished case where Copyscape
  false-positives on its own

This gives users more actionable information than a single number.

### Explicit rejection of "reject-as-unsuitable"

The prior expectation was that Gemini would be so uncalibrated it would be useless. In
practice, Gemini's 100% precision on HUMAN classification is useful — it protects
against the Copyscape false-positive failure mode. It is not the primary detector but
it is not useless.

### Caveat: one corpus, n=20

- 20 samples is a meaningful but small sample. With only 5 per provenance type, 1
  misclassification shifts the rate by 20%. Production-scale validation would require
  hundreds of samples.
- All AI samples in this corpus were generated by Claude (one LLM family). A broader
  corpus should test Gemini's detection of Gemini-generated, GPT-generated, and
  Llama-generated text separately.
- The "human-then-polished" category used a specific polish pattern (rewriting 1–2
  sentences for flow). Other polish patterns (grammar-only, tone-only) may yield
  different failure rates.

---

## Ground Truth Corrections

None. All 20 sample labels held after running both engines.

---

## Update (2026-04-22): 3-way with GPT-5.4

Prompted by the POC 4 finding that GPT-5.4 outperforms both MiniMax and Gemini on several
text-classification skills, we added GPT-5.4 as a third AI detector on the same 20-sample
corpus.

### 3-way aggregate

| Metric | Copyscape | Gemini | **GPT-5.4** |
|---|---|---|---|
| Accuracy | 90.0% | 80.0% | **90.0%** (tied with Copyscape) |
| Recall | **100.0%** | 60.0% | 80.0% |
| Precision | 83.3% | **100.0%** | **100.0%** |
| F1 | **90.9%** | 75.0% | 88.9% |
| Spearman calibration | **0.896** | 0.747 | 0.875 |

### Accuracy by provenance (where provider differences matter)

| Provenance (n=5) | Copyscape | Gemini | GPT-5.4 |
|---|---|---|---|
| pure-human | 5/5 | 5/5 | 5/5 |
| pure-ai | 5/5 | 5/5 | 5/5 |
| **ai-then-edited** | **5/5** | 1/5 | 3/5 |
| **human-then-polished** | 3/5 (2 FP) | **5/5** | **5/5** |

### Finding: GPT-5.4 is a strictly better secondary signal than Gemini

GPT-5.4 caught **2 of the 4 AI-edited samples that tricked Gemini** (M2 cooking, M4 budget).
Still missed M3 hiking and M5 learning — samples with the heaviest personal-anecdote
content. But GPT-5.4's failure mode is a **subset** of Gemini's failure mode, with two fewer
misses.

Combined with:
- Same 100% precision on HUMAN content (never FPs)
- 80% recall vs Gemini's 60% (better at catching AI)
- Calibration 0.875 vs 0.747 (probability scores track actual AI % much more reliably)

**Updated hybrid recommendation:** Use Copyscape + **GPT-5.4** (not Gemini) for the 4-state
signal described above:
- Both-AI: definitive AI (6-8 cases)
- CS-AI + GPT-HUMAN: AI-generated with humanizing edits (2 cases with GPT vs 4 with Gemini)
- CS-HUMAN + GPT-AI: never happened in this corpus
- Both-HUMAN: definitive HUMAN

The Copyscape-FP zone (2 cases of human-polished content) is caught by GPT-5.4 same as Gemini.
GPT-5.4 just adds two more AI-edited catches on top.

### Cost comparison

| | Cost/sample |
|---|---|
| Copyscape | $0.010 |
| Gemini | $0.003 |
| **GPT-5.4** | **$0.0025** (for this task) |

GPT-5.4 is actually slightly CHEAPER than Gemini for classification (shorter outputs, no
grounding). The cost objection that would have made GPT-5.4 unviable doesn't apply here.

### Revised verdict

**augment (unchanged)**, but the **secondary signal should be GPT-5.4, not Gemini**.

Full 3-way results JSON: `poc-replacement/02-ai-detection/results-3way-1776861078525.json`

---

## Raw Data

Results JSON: `poc-replacement/02-ai-detection/results-1776847060642.json`
3-way update JSON: `poc-replacement/02-ai-detection/results-3way-1776861078525.json`
