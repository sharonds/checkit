import type { SkillResult, Finding, Citation } from "./types.ts";

/**
 * Merges academic citations into matching fact-check findings.
 *
 * This makes the Phase 7 four-output contract work on a SINGLE finding:
 * after enrichment, a fact-check finding can carry:
 *   - sources[]  (from B2 Exa highlights)
 *   - citations[] (from B4 Semantic Scholar, merged here)
 *   - rewrite    (not yet applied by this merge — grammar skill produces its own findings)
 *   - claimType  (from B2)
 *
 * Matching is by the quoted claim substring in `finding.text` (both fact-check
 * and academic emit findings with the claim in quotes). Case-insensitive, whitespace-normalized.
 *
 * Mutates the input array in place (fact-check SkillResult is updated); returns same array.
 */
export function enrichFindings(results: SkillResult[]): SkillResult[] {
  const fact = results.find(r => r.skillId === "fact-check");
  const academic = results.find(r => r.skillId === "academic");
  if (!fact || !academic) return results;

  const citationsByClaim = new Map<string, Citation[]>();
  for (const f of academic.findings) {
    const claim = extractQuoted(f.text);
    if (claim && f.citations && f.citations.length > 0) {
      citationsByClaim.set(normalize(claim), f.citations);
    }
  }

  if (citationsByClaim.size === 0) return results;

  fact.findings = fact.findings.map((f): Finding => {
    const claim = extractQuoted(f.text);
    if (!claim) return f;
    const citations = citationsByClaim.get(normalize(claim));
    return citations ? { ...f, citations } : f;
  });

  return results;
}

function extractQuoted(text: string): string | null {
  const m = /"([^"]+)"/.exec(text);
  return m ? m[1] : null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
