export type Language = "en" | "he" | "ar" | "zh" | "ja" | "ko" | "other";

const SCRIPTS: Array<{ lang: Language; regex: RegExp }> = [
  { lang: "he", regex: /[\u0590-\u05FF]/g },
  { lang: "ar", regex: /[\u0600-\u06FF]/g },
  { lang: "zh", regex: /[\u4E00-\u9FFF]/g },
  { lang: "ja", regex: /[\u3040-\u309F\u30A0-\u30FF]/g },
  { lang: "ko", regex: /[\uAC00-\uD7AF]/g },
];

export function detectLanguage(text: string): Language {
  const total = text.replace(/\s/g, "").length;
  if (total === 0) return "en";
  for (const { lang, regex } of SCRIPTS) {
    const matches = text.match(regex);
    if (matches && matches.length / total > 0.3) return lang;
  }
  return "en";
}

export function isRtl(lang: Language): boolean {
  return lang === "he" || lang === "ar";
}

export const STOP_WORDS_HE = new Set([
  "של", "את", "הוא", "היא", "זה", "זו", "על", "עם", "מן", "אל",
  "לא", "כי", "אם", "גם", "או", "אך", "רק", "כל", "עוד", "יותר",
  "בין", "לפני", "אחרי", "מאוד", "כמו", "שם", "פה", "כאן", "אבל",
]);
