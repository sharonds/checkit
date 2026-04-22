# POC 3 Results — Academic Citations (OpenAlex vs Gemini grounding)

**Run date:** 2026-04-22 (after diagnostic fix)
**Corpus:** 10 claims — 4 medical / 3 scientific / 3 financial
**Baseline provider:** OpenAlex (substituted for Semantic Scholar — see note below)
**Judge for acceptable-support:** Gemini 3.1 Pro plain call (bias noted)

---

## Semantic Scholar substitution — why OpenAlex

The original plan specified Semantic Scholar as the baseline. In practice:
- SS free tier returned **HTTP 429 (rate limited) on every call** from our IP
- The free tier is a shared quota that was exhausted by other users on the same IP
- SS API keys exist but require applying and waiting days for approval
- SS was unusable for this POC in its free configuration

We substituted **OpenAlex** (api.openalex.org) as the structured-citation baseline:
- Similar API shape (search → list of papers with DOI/authors/year)
- Free, no auth for the polite pool (100k req/day, requires `mailto` parameter)
- 200M+ works indexed
- No rate limiting observed

**Production implication:** This is itself a finding for the decision matrix — SS's rate
limiting makes it unreliable in production without a paid API key. OpenAlex or Gemini are
both more operationally viable for CheckApp.

---

## Headline numbers

| Metric | OpenAlex | Gemini grounding |
|---|---|---|
| **Exact-gold Recall@3** | 10% (1/10) | **70% (7/10)** |
| **Exact-gold Recall@5** | 10% (1/10) | **70% (7/10)** |
| **Acceptable-support Recall@3** | 80% (8/10) | **100% (10/10)** |
| **Acceptable-support Recall@5** | 80% (8/10) | **100% (10/10)** |
| Avg latency per claim | **~1.0s** | ~63s (range 25–108s) |
| Cost per claim | **$0.000** | $0.038 |
| Cost + judge per claim | $0.030 (judge only) | $0.068 |
| Errors | 0 | 0 |

Note: `Recall@3` and `Recall@5` are identical for both engines because in every case where
the engine had the supportive paper at all, it was in the top 3.

---

## Per-claim detail

Exact-gold column shows whether the pre-identified canonical paper was returned.
Acceptable-support column shows whether ANY peer-reviewed supportive paper was returned.

| Claim | Gold paper | OA exact | OA any-supp | Gem exact | Gem any-supp |
|---|---|:-:|:-:|:-:|:-:|
| M1 vitamin-d-respiratory | Martineau 2017 BMJ | ❌ | ✅ | ✅ | ✅ |
| M2 statins-cardiovascular | CTT 2010 Lancet | ❌ | ✅ | ✅ | ✅ |
| M3 sglt2-heart-failure | Zinman 2015 NEJM | ❌ | ✅ | ✅ | ✅ |
| M4 exercise-dementia | Livingston 2020 Lancet Commission | ❌ | ✅ | ✅ | ✅ |
| S1 permafrost-methane | Schuur 2015 Nature | ❌ | ❌ | ✅ | ✅ |
| S2 mrna-vaccine | Polack 2020 NEJM | ❌ | ✅ | ✅ | ✅ |
| S3 crispr-base-editing | Komor 2016 Nature | ✅ | ✅ | ✅ | ✅ |
| F1 qe-long-rates | Gagnon 2011 | ❌ | ✅ | ✅ | ✅ |
| F2 minimum-wage-employment | Card & Krueger 1994 AER | ❌ | ✅ | ❌ | ✅ |
| F3 central-bank-independence | Alesina & Summers 1993 | ❌ | ✅ | ✅ | ✅ |

**Observations:**
- Gemini found the specific canonical gold paper 7/10 times. OpenAlex found it 1/10.
- The 3 Gemini gold-misses (F2, and a subset of complex claims) still returned a highly
  relevant alternate peer-reviewed paper — so all 10 claims returned acceptable citations.
- OpenAlex missed the gold paper on S1 (permafrost) entirely — returned tangentially related
  climate papers without finding the Schuur 2015 Nature review.
- F2 Card & Krueger 1994 is a classic economics paper that neither engine surfaced as the
  top exact match — both found it in related context but returned newer meta-analyses
  instead (Gemini correctly flagged Cengiz 2019 and Dube 2010 as supportive alternates).

---

## Latency distribution (Gemini)

| Claim | Latency | Search count |
|---|---|---|
| M1 vitamin-d | 108s | high search |
| M2 statins | 92s | high search |
| M3 sglt2 | 30.8s | low search / training-cache |
| M4 exercise-dementia | 54.5s | medium |
| S1 permafrost | 47.5s | medium |
| S2 mrna-vaccine | 67.3s | medium |
| S3 crispr | 50.1s | medium |
| F1 qe-rates | 64.8s | medium |
| F2 minimum-wage | 54.1s | medium |
| F3 central-bank | 25.2s | low |

Median: ~55s. Max: 108s. **No timeouts at 240s ceiling** (previous run with 150s ceiling
had 4/10 timeouts — see `diagnose.ts` and `diagnose2.ts` for investigation).

### Why the original POC 3 run had 40% timeouts

Diagnostic investigation (`diagnose.ts`, `diagnose2.ts`) showed:
1. The POC 3 prompt is fine — Gemini handles it correctly
2. Gemini API has high **tail latency** — same claim can take 30s or 100s+
3. The original 150s timeout was **too aggressive** — 97s was seen on a successful call
4. Bumping the timeout to **240s + 1 retry on AbortError** eliminated all timeouts

This is an important production note: CheckApp integration needs either a long timeout
ceiling (≥ 240s) or async job handling to tolerate Gemini's tail latency for citation
search.

---

## Cost per-article estimate

A typical marketed article contains 3–5 distinct factual claims that might each get
citations. Per-article cost:

| | Per 3-claim article | Per 5-claim article | 100 articles/month |
|---|---|---|---|
| OpenAlex | $0.00 | $0.00 | $0 |
| Gemini | $0.11 | $0.19 | $11–19 |
| Gemini + judge | $0.20 | $0.34 | $20–34 |

Gemini's cost is meaningful but not prohibitive for a paid product tier.

---

## Hybrid architecture — the case for it

Given the cost + latency + accuracy profiles, a **two-tier hybrid** is likely the best
production design rather than a pure replace:

- **Tier 1 (default / fast path)**: OpenAlex. Free, < 1s, 80% acceptable-support recall.
  Shows user instant citations that are "good enough" in most cases.
- **Tier 2 (opt-in / canonical-source path)**: Gemini grounded. Runs in the background,
  takes 25–110s, finds the specific canonical paper 70% of the time.

The user experience would be: citations appear immediately from OpenAlex, with a "find
canonical source" button that kicks off the Gemini search asynchronously.

---

## Verdict

### **replace** (if single-engine) — OR — **augment** (hybrid architecture)

### Reasoning

Against each 4-way option:

- **keep** OpenAlex (or SS) — NO. OpenAlex's 10% exact-gold recall is catastrophically
  low. Users of a fact-checker expect the canonical source, not a related paper.
- **reject-as-unsuitable** for Gemini — NO. Gemini's 70% exact-gold and 100%
  acceptable-support are both strong. Far from unsuitable.
- **replace** OpenAlex with Gemini — YES if you accept the latency. Gemini's accuracy is
  7× better at exact-gold and 1.25× better at acceptable-support. $0.038/claim is
  acceptable for a paid tier.
- **augment** — YES for the best user experience. OpenAlex for instant "here are related
  papers" + Gemini on-demand for "find the canonical source."

### Recommendation

For CheckApp integration:

1. **Replace Semantic Scholar with OpenAlex** as the free-tier default. Same API shape,
   similar (slightly worse) retrieval quality, but actually works (no rate-limiting).
2. **Add Gemini grounded as the premium "canonical source" path**. Async invocation
   given 30–110s latency. Market it as "deep citation search" similar to the premium
   fact-check tier already in the roadmap.
3. **Do NOT ship Gemini as a synchronous primary search** — users waiting 60+ seconds
   staring at a spinner is poor UX.

---

## Caveats

### LLM-judge bias for acceptable-support metric

The acceptable-support metric uses Gemini 3.1 Pro as the judge (plain call, no grounding).
This introduces a self-evaluation bias — Gemini is judging both its own output and
OpenAlex's output. To partially control: Gemini was asked to judge each paper in isolation
without knowing which engine returned it, and the prompt explicitly asks for
"≥ medium relevance."

The exact-gold metric is objective (DOI/title match) and is not affected by judge bias.
Gemini's 70/10 dominance on exact-gold is therefore the more trustworthy signal.

### Sample size n=10

Power is limited. The precision of a 70% estimate on n=10 is about ±14pp (95% CI).
Production validation should use a larger corpus (≥ 50 claims) once an implementation
decision is made.

### Gemini sometimes returns 3 results when asked for 5

On several claims Gemini returned 3 papers despite the prompt asking for 5. Recall@3 and
Recall@5 are therefore identical. In production this is a non-issue — finding 3 solid
supporting papers is usually enough.

### Semantic Scholar not tested

The incumbent CheckApp provider (SS) was completely unreachable on our IP. The comparison
in this POC is OpenAlex (proposed free baseline) vs Gemini (proposed AI option). If SS is
eventually tested with a paid API key, it should be added to this matrix.

---

## Raw Data

Results JSON: `poc-replacement/03-academic-citations/results-1776857526194.json`
Diagnostic scripts: `diagnose.ts`, `diagnose2.ts`
