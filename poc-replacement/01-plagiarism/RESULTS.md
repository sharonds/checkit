# POC 1 Results — Plagiarism (Copyscape vs Gemini grounding)

**Run date:** 2026-04-22
**Corpus:** 10 articles — 3 heavy (>40% verbatim), 3 light (1–3 verbatim/near-verbatim), 2 paraphrased, 2 original
**Total sentences:** 75 (23 plagiarised ground-truth positives)

---

## Corpus Description

| ID | Title | Severity | Plagiarised sents | Total sents |
|---|---|---|---|---|
| 01-heavy-photosynthesis | The Science of Photosynthesis | heavy | 5/9 (56%) | 9 |
| 02-heavy-water-cycle | The Water Cycle Explained | heavy | 6/9 (67%) | 9 |
| 03-heavy-dna | DNA: The Blueprint of Life | heavy | 6/9 (67%) | 9 |
| 04-light-climate-change | Why Climate Change Demands Urgent Action | light | 2/7 (29%) | 7 |
| 05-light-amazon-river | The Amazon: World's Most Powerful River | light | 2/6 (33%) | 6 |
| 06-light-plate-tectonics | Plate Tectonics: The Engine Beneath Our Feet | light | 2/6 (33%) | 6 |
| 07-paraphrased-volcano | Living with Volcanoes | none | 0/6 | 6 |
| 08-paraphrased-ocean-currents | How Ocean Currents Control Our Climate | none | 0/6 | 6 |
| 09-original-indoor-plants | Choosing Indoor Plants for Your Space | none | 0/9 | 9 |
| 10-original-meeting-agendas | Writing Meeting Agendas | none | 0/8 | 8 |

All ground-truth labels set before running any engine. Sources: Wikipedia (CC BY-SA 4.0).

---

## Engine Scores

### Sentence-level (primary metric per ANNOTATION-GUIDELINES.md)

| Metric | Copyscape | Gemini grounding |
|---|---|---|
| TP | 21 | 23 |
| FP | 0 | 0 |
| TN | 52 | 52 |
| FN | 2 | 0 |
| **Accuracy** | **97.3%** | **100.0%** |
| **Precision** | **100.0%** | **100.0%** |
| **Recall** | **91.3%** | **100.0%** |
| **F1** | **95.5%** | **100.0%** |

### Article-level (secondary metric)

| Engine | Correct | Accuracy |
|---|---|---|
| Copyscape | 9/10 | 90.0% |
| Gemini grounding | 10/10 | **100.0%** |

### Source-URL attribution (Gemini only)

- Gemini identified the correct source URL for **100% of sentences it correctly flagged**
- Avg source-URL match rate across all articles: 60% (artifacts to 0 for clean articles where no URLs are expected — the meaningful rate is 100% of flagged-true-positives)

---

## Per-Engine Results

### Copyscape

| Article | Similarity | Correct verdict | Sentence recall |
|---|---|---|---|
| 01-heavy-photosynthesis | 65% | ✅ | 5/5 (100%) |
| 02-heavy-water-cycle | 76% | ✅ | 6/6 (100%) |
| 03-heavy-dna | 65% | ✅ | 6/6 (100%) |
| 04-light-climate-change | 34% | ✅ | 2/2 (100%) |
| 05-light-amazon-river | 58% | ✅ | 2/2 (100%) |
| **06-light-plate-tectonics** | **0%** | **❌** | **0/2 (0%)** |
| 07-paraphrased-volcano | 0% | ✅ | n/a |
| 08-paraphrased-ocean-currents | 0% | ✅ | n/a |
| 09-original-indoor-plants | 0% | ✅ | n/a |
| 10-original-meeting-agendas | 0% | ✅ | n/a |

**Copyscape false positives: 0.** No paraphrased or original article was flagged.

### Gemini grounding

| Article | Similarity | Correct verdict | Sentence recall | Source URL |
|---|---|---|---|---|
| 01-heavy-photosynthesis | 73% | ✅ | 5/5 (100%) | 100% |
| 02-heavy-water-cycle | 77% | ✅ | 6/6 (100%) | 100% |
| 03-heavy-dna | 73% | ✅ | 6/6 (100%) | 100% |
| 04-light-climate-change | 35% | ✅ | 2/2 (100%) | 100% |
| 05-light-amazon-river | 51% | ✅ | 2/2 (100%) | 100% |
| 06-light-plate-tectonics | 39% | ✅ | 2/2 (100%) | 100% |
| 07-paraphrased-volcano | 0% | ✅ | n/a | n/a |
| 08-paraphrased-ocean-currents | 0% | ✅ | n/a | n/a |
| 09-original-indoor-plants | 0% | ✅ | n/a | n/a |
| 10-original-meeting-agendas | 0% | ✅ | n/a | n/a |

**Gemini false positives: 0.** No paraphrased or original article was flagged.

---

## Specific Failure Modes

### Copyscape miss — article 06 (plate tectonics, near-verbatim)

Corpus labels for the two missed sentences:
```
"According to the theory of plate tectonics, Earth's lithosphere comprises a number
of large tectonic plates, which have been slowly moving since 3–4 billion years ago."
→ status: near-verbatim (added introductory clause)

"Earth's outer shell is fractured into seven or eight major plates (depending on how
they are defined) and many minor plates or platelets."
→ status: near-verbatim (minor structural change from Wikipedia)
```

Copyscape returned **0% similarity / 0 matches** on this article. The near-verbatim
rewording (adding "According to the theory of plate tectonics," as a prefix, and small
phrasing shifts) was sufficient to evade Copyscape's string-matching approach.

**Architectural implication:** An author can evade Copyscape detection with minimal effort
— a single introductory clause or minor word-swap renders the text invisible. Gemini's
semantic approach is not fooled by this.

### Gemini JSON parse errors (4 non-plagiarised articles)

Articles 07, 08, 09, 10 all triggered a `JSON parse failed` error from Gemini. The output was
truncated: Gemini returned `{ "overallSimilarity": 0, "isPlagiarized": false, "copiedSentences":` 
without completing the empty array. This appears to be a model behaviour when the 
`copiedSentences` array is empty — it truncates rather than completing `[]`.

**Impact on scores:** None — the runner defaulted to `isPlagiarized: false` on parse failure,
which was the correct answer. But this is a reliability concern: if a non-plagiarised article
were to produce a parse error that defaulted to the wrong value, we'd get a false positive.

**Fix for production:** Handle the truncated pattern explicitly:
```typescript
if (raw.includes('"isPlagiarized": false') && raw.includes('"copiedSentences":')) {
  return { ...defaults, isPlagiarized: false, copiedSentences: [] };
}
```

---

## Cost Comparison

| | Per article | Per 100 articles | Per 1,000 articles |
|---|---|---|---|
| Copyscape | $0.01 | $1.00 | $10.00 |
| Gemini grounding | ~$0.038 | ~$3.80 | ~$38.00 |
| **Ratio** | **3.8×** | **3.8×** | **3.8×** |

**Acceptance criterion:** Replace if Gemini ≤ $0.02/search (2× Copyscape).
Gemini at $0.038/call **exceeds the cost threshold** (3.8× vs 2× required). This alone
rules out the **replace** verdict.

---

## Timing

| Engine | Avg per article |
|---|---|
| Copyscape | ~1.4s |
| Gemini grounding | ~42.5s |

Gemini takes ~30× longer per article. Copyscape is near-instant.

---

## Verdict

### **augment**

**Reasoning:**

Gemini catches near-verbatim plagiarism that Copyscape misses (article 06: 0% detected by
Copyscape, 100% by Gemini). This is a real and exploitable gap — the near-verbatim sentences
only had an introductory clause added, which is trivially easy for a plagiarist.

However:
- Gemini at $0.038/call is **3.8× the cost** of Copyscape ($0.01/call), failing the
  ≤ 2× replacement criterion by a wide margin
- Gemini takes ~42s vs Copyscape's ~1s
- Both engines have **zero false positives** — neither flags paraphrased or original content

**Recommended hybrid:** Use Copyscape as primary. When Copyscape returns 0% similarity
(or < 10%) on an article that exhibits other risk signals (e.g., topic-specific Wikipedia-like
encyclopedic tone), trigger a secondary Gemini grounded check. This would add ~$0.038 only
on borderline cases rather than all articles.

**Explicit rejection of replace:** Gemini does not replace Copyscape because:
1. Cost exceeds criterion (3.8× vs ≤ 2×)
2. Response time exceeds criterion (42s vs ~1s)

**The near-verbatim gap is real and worth addressing.** An article that eases through
Copyscape detection with a single added clause is a known attack vector.

---

## Ground Truth Corrections

None. All 10 article labels held after running both engines. No engine identified a
ground-truth error (unlike the fact-check POC where Engine B caught 7 author errors).

---

## Raw Data

Results JSON: `poc-replacement/01-plagiarism/results-1776810295832.json`
