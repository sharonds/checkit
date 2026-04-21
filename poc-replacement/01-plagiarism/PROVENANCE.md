# Corpus Provenance — POC 1 Plagiarism

All source passages used in this corpus are from Wikipedia, licensed under
**Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**.

Wikipedia content may be freely reproduced for research and testing purposes under
CC BY-SA 4.0 provided attribution is given. This document serves as that attribution.

---

## Source Articles Used

| Article ID | Title | Source URL | License |
|---|---|---|---|
| 01-heavy-photosynthesis | Photosynthesis | https://en.wikipedia.org/wiki/Photosynthesis | CC BY-SA 4.0 |
| 02-heavy-water-cycle | Water Cycle | https://en.wikipedia.org/wiki/Water_cycle | CC BY-SA 4.0 |
| 03-heavy-dna | DNA | https://en.wikipedia.org/wiki/DNA | CC BY-SA 4.0 |
| 04-light-climate-change | Climate change | https://en.wikipedia.org/wiki/Climate_change | CC BY-SA 4.0 |
| 05-light-amazon-river | Amazon River | https://en.wikipedia.org/wiki/Amazon_River | CC BY-SA 4.0 |
| 06-light-plate-tectonics | Plate tectonics | https://en.wikipedia.org/wiki/Plate_tectonics | CC BY-SA 4.0 |
| 07-paraphrased-volcano | Volcano | https://en.wikipedia.org/wiki/Volcano | CC BY-SA 4.0 |
| 08-paraphrased-ocean-currents | Ocean current | https://en.wikipedia.org/wiki/Ocean_current | CC BY-SA 4.0 |
| 09-original-indoor-plants | — | No source (original) | — |
| 10-original-meeting-agendas | — | No source (original) | — |

---

## Corpus Construction Process

1. Wikipedia article intros were fetched via the Wikipedia MediaWiki API
   (`/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true`) and via
   direct page fetch to confirm exact wording.
2. Test articles were composed by weaving verbatim Wikipedia sentences with original
   filler sentences. Verbatim sentences were copied exactly as they appear in the
   Wikipedia introduction; near-verbatim sentences had minor structural changes
   (e.g., added an introductory clause, dropped pronunciation guides in parentheses).
3. Ground-truth labels were assigned **before** running any engine.
4. Articles 07 and 08 paraphrase Wikipedia ideas but contain no verbatim or near-verbatim
   sentences — they test whether engines produce false positives on paraphrased content.
5. Articles 09 and 10 are entirely original — written fresh with no source material —
   testing false-positive rate on genuinely unique content.

---

## Fair-Use Note

No individual quoted span in the verbatim test sentences exceeds the length of the full
Wikipedia sentences (typically 20–50 words). This usage is consistent with CC BY-SA 4.0
terms and standard academic fair-use practice for research and testing corpora.

---

## Wikipedia Attribution

Text from Wikipedia is used under the Creative Commons Attribution-ShareAlike 4.0
International License. See https://creativecommons.org/licenses/by-sa/4.0/ for full
license terms. Wikipedia contributors retain copyright of their contributions.
