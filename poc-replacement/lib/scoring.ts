/**
 * Shared scoring helpers for poc-replacement POCs.
 * Used by all four POC runners to compute accuracy, precision, recall, F1.
 */

// ── Binary scoring ─────────────────────────────────────────────────────────────

export type BinaryLabel = "positive" | "negative";

export interface BinaryResult {
  predicted: BinaryLabel;
  actual: BinaryLabel;
}

export type BinaryMatch = "TP" | "FP" | "TN" | "FN";

export function scoreBinary(result: BinaryResult): BinaryMatch {
  const { predicted, actual } = result;
  if (predicted === "positive" && actual === "positive") return "TP";
  if (predicted === "positive" && actual === "negative") return "FP";
  if (predicted === "negative" && actual === "negative") return "TN";
  return "FN";
}

// ── Confusion matrix ───────────────────────────────────────────────────────────

export interface ConfusionMatrix {
  TP: number;
  FP: number;
  TN: number;
  FN: number;
  total: number;
  accuracy: number;
}

export function computeConfusionMatrix(results: BinaryResult[]): ConfusionMatrix {
  let TP = 0, FP = 0, TN = 0, FN = 0;
  for (const r of results) {
    const m = scoreBinary(r);
    if (m === "TP") TP++;
    else if (m === "FP") FP++;
    else if (m === "TN") TN++;
    else FN++;
  }
  const total = results.length;
  const accuracy = total === 0 ? 0 : (TP + TN) / total;
  return { TP, FP, TN, FN, total, accuracy };
}

// ── Precision / Recall / F1 ────────────────────────────────────────────────────

export interface PrecisionRecallF1 {
  precision: number;
  recall: number;
  f1: number;
}

export function precisionRecall(cm: ConfusionMatrix): PrecisionRecallF1 {
  const precision = cm.TP + cm.FP === 0 ? 0 : cm.TP / (cm.TP + cm.FP);
  const recall = cm.TP + cm.FN === 0 ? 0 : cm.TP / (cm.TP + cm.FN);
  const f1 =
    precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

// ── Recall@k ──────────────────────────────────────────────────────────────────

/**
 * Did the engine return a "hit" within its top-k results?
 * Used for citation POC: exact-gold recall@k and acceptable-support recall@k.
 */
export function recallAtK(hitsInTopK: boolean[], k: number): number {
  if (hitsInTopK.length === 0) return 0;
  const hits = hitsInTopK.slice(0, k).filter(Boolean).length;
  return hits / hitsInTopK.length;
}

// ── Spearman rank correlation ──────────────────────────────────────────────────

/**
 * Spearman correlation between two arrays of equal length.
 * Used for AI detection calibration: engine probability vs actual AI word-count %.
 */
export function spearman(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length === 0) return 0;
  const n = xs.length;
  const rank = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return arr.map((v) => sorted.indexOf(v) + 1);
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const dSq = rx.reduce((acc, r, i) => acc + Math.pow(r - ry[i], 2), 0);
  return 1 - (6 * dSq) / (n * (n * n - 1));
}

// ── Pretty-print helpers ───────────────────────────────────────────────────────

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function printConfusionMatrix(label: string, cm: ConfusionMatrix, prf: PrecisionRecallF1) {
  console.log(`\n  ${label}`);
  console.log(`  TP=${cm.TP}  FP=${cm.FP}  TN=${cm.TN}  FN=${cm.FN}  (n=${cm.total})`);
  console.log(`  Accuracy : ${fmtPct(cm.accuracy)}`);
  console.log(`  Precision: ${fmtPct(prf.precision)}`);
  console.log(`  Recall   : ${fmtPct(prf.recall)}`);
  console.log(`  F1       : ${fmtPct(prf.f1)}`);
}
