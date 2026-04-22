/**
 * POC 3 — Academic Citations test corpus
 *
 * 10 scientific/medical/financial claims with pre-identified gold citations.
 * Gold citations were selected before running any engine, using Google Scholar
 * / PubMed / SSRN to identify widely-accepted supporting papers.
 *
 * Per ANNOTATION-GUIDELINES.md, scoring uses TWO independent metrics:
 *   - Exact-gold Recall@k: did the engine return the specific pre-identified paper?
 *   - Acceptable-support Recall@k: did the engine return ANY peer-reviewed paper
 *     that supports the claim at ≥ medium relevance?
 *
 * Cost constants:
 */
export const SS_COST_PER_SEARCH_USD = 0.0;  // Semantic Scholar free tier (100 req/5min)
export const GEMINI_GROUNDED_COST_USD = 0.038; // grounding + thinking

export interface GoldCitation {
  title: string;
  authors: string;
  year: number;
  doi?: string;
  url?: string;
}

export interface CitationTestCase {
  id: string;
  claim: string;
  claimType: "medical" | "scientific" | "financial";
  goldCitations: GoldCitation[];
}

export const CORPUS: CitationTestCase[] = [

  // ── Medical (4) ───────────────────────────────────────────────────────────

  {
    id: "M1-vitamin-d-respiratory",
    claim: "Vitamin D supplementation reduces the risk of acute respiratory tract infections, particularly in individuals who are deficient.",
    claimType: "medical",
    goldCitations: [
      {
        title: "Vitamin D supplementation to prevent acute respiratory tract infections: systematic review and meta-analysis of individual participant data",
        authors: "Martineau AR, Jolliffe DA, Hooper RL, et al.",
        year: 2017,
        doi: "10.1136/bmj.i6583",
        url: "https://www.bmj.com/content/356/bmj.i6583",
      },
    ],
  },

  {
    id: "M2-statins-cardiovascular",
    claim: "Statin therapy reduces major vascular events in high-risk populations regardless of baseline LDL cholesterol levels.",
    claimType: "medical",
    goldCitations: [
      {
        title: "Efficacy and safety of more intensive lowering of LDL cholesterol: a meta-analysis of data from 170,000 participants in 26 randomised trials",
        authors: "Cholesterol Treatment Trialists' (CTT) Collaboration, Baigent C, Blackwell L, et al.",
        year: 2010,
        doi: "10.1016/S0140-6736(10)61350-5",
        url: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(10)61350-5/",
      },
    ],
  },

  {
    id: "M3-sglt2-heart-failure",
    claim: "SGLT2 inhibitors reduce cardiovascular death and hospitalization for heart failure in patients with type 2 diabetes.",
    claimType: "medical",
    goldCitations: [
      {
        title: "Empagliflozin, Cardiovascular Outcomes, and Mortality in Type 2 Diabetes",
        authors: "Zinman B, Wanner C, Lachin JM, et al.",
        year: 2015,
        doi: "10.1056/NEJMoa1504720",
        url: "https://www.nejm.org/doi/full/10.1056/NEJMoa1504720",
      },
    ],
  },

  {
    id: "M4-exercise-dementia",
    claim: "Physical activity in midlife and later life is associated with reduced risk of dementia and cognitive decline.",
    claimType: "medical",
    goldCitations: [
      {
        title: "Dementia prevention, intervention, and care: 2020 report of the Lancet Commission",
        authors: "Livingston G, Huntley J, Sommerlad A, et al.",
        year: 2020,
        doi: "10.1016/S0140-6736(20)30367-6",
        url: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(20)30367-6/",
      },
    ],
  },

  // ── Scientific (3) ────────────────────────────────────────────────────────

  {
    id: "S1-permafrost-methane",
    claim: "Thawing of Arctic permafrost releases greenhouse gases in a positive feedback loop that amplifies climate warming.",
    claimType: "scientific",
    goldCitations: [
      {
        title: "Climate change and the permafrost carbon feedback",
        authors: "Schuur EAG, McGuire AD, Schädel C, et al.",
        year: 2015,
        doi: "10.1038/nature14338",
        url: "https://www.nature.com/articles/nature14338",
      },
    ],
  },

  {
    id: "S2-mrna-vaccine-efficacy",
    claim: "The BNT162b2 mRNA COVID-19 vaccine demonstrated approximately 95% efficacy against symptomatic COVID-19 in its pivotal phase 3 trial.",
    claimType: "scientific",
    goldCitations: [
      {
        title: "Safety and Efficacy of the BNT162b2 mRNA Covid-19 Vaccine",
        authors: "Polack FP, Thomas SJ, Kitchin N, et al.",
        year: 2020,
        doi: "10.1056/NEJMoa2034577",
        url: "https://www.nejm.org/doi/full/10.1056/NEJMoa2034577",
      },
    ],
  },

  {
    id: "S3-crispr-base-editing",
    claim: "Base editing can introduce point mutations in DNA without creating double-strand breaks, offering higher precision than traditional CRISPR-Cas9.",
    claimType: "scientific",
    goldCitations: [
      {
        title: "Programmable editing of a target base in genomic DNA without double-stranded DNA cleavage",
        authors: "Komor AC, Kim YB, Packer MS, Zuris JA, Liu DR",
        year: 2016,
        doi: "10.1038/nature17946",
        url: "https://www.nature.com/articles/nature17946",
      },
    ],
  },

  // ── Financial (3) ─────────────────────────────────────────────────────────

  {
    id: "F1-qe-long-rates",
    claim: "The Federal Reserve's large-scale asset purchase programs (quantitative easing) reduced longer-term interest rates during the 2008-2014 period.",
    claimType: "financial",
    goldCitations: [
      {
        title: "The Financial Market Effects of the Federal Reserve's Large-Scale Asset Purchases",
        authors: "Gagnon J, Raskin M, Remache J, Sack B",
        year: 2011,
        doi: "10.1111/j.1468-0327.2011.00265.x",
        url: "https://www.ijcb.org/journal/ijcb11q1a1.htm",
      },
    ],
  },

  {
    id: "F2-minimum-wage-employment",
    claim: "Modest increases in the minimum wage have small or negligible effects on overall employment levels.",
    claimType: "financial",
    goldCitations: [
      {
        title: "Minimum Wages and Employment: A Case Study of the Fast-Food Industry in New Jersey and Pennsylvania",
        authors: "Card D, Krueger AB",
        year: 1994,
        url: "https://www.aeaweb.org/articles?id=10.1257/aer.90.5.1397",
      },
    ],
  },

  {
    id: "F3-central-bank-independence",
    claim: "Greater central bank independence is empirically associated with lower average inflation rates across industrialized economies.",
    claimType: "financial",
    goldCitations: [
      {
        title: "Central Bank Independence and Macroeconomic Performance: Some Comparative Evidence",
        authors: "Alesina A, Summers LH",
        year: 1993,
        doi: "10.2307/2077833",
        url: "https://www.jstor.org/stable/2077833",
      },
    ],
  },
];

export function corpusStats() {
  const byType: Record<string, number> = {};
  for (const c of CORPUS) byType[c.claimType] = (byType[c.claimType] ?? 0) + 1;
  return { total: CORPUS.length, byType };
}
