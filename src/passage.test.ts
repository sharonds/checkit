import { test, expect } from "bun:test";
import { findMatchingPassages, MIN_WORDS, splitIntoSentences } from "./passage.ts";

test("finds verbatim sentence from article in page content", () => {
  const article =
    "Vitamin D is essential for bone health and immune function. It also supports muscle strength.";
  const page =
    "Research shows that Vitamin D is essential for bone health and immune function, making it a critical nutrient.";

  const matches = findMatchingPassages(article, page);
  expect(matches).toContain(
    "Vitamin D is essential for bone health and immune function."
  );
});

test("returns empty array when no sentences match", () => {
  const article =
    "This article is about completely original content that nobody else has written before.";
  const page =
    "A totally different page about something entirely unrelated to health topics.";

  const matches = findMatchingPassages(article, page);
  expect(matches).toHaveLength(0);
});

test("ignores sentences with fewer than MIN_WORDS words", () => {
  const article = "Short sentence. Also brief. This too is short here only.";
  const page =
    "Short sentence is present. Also brief mention. This too is short here only in context.";

  const matches = findMatchingPassages(article, page);
  // "Short sentence." = 2 words → skip
  // "Also brief." = 2 words → skip
  // "This too is short here only." = 6 words → skip (< MIN_WORDS=8)
  expect(matches).toHaveLength(0);
});

test(`matches a sentence of exactly ${MIN_WORDS} words (boundary)`, () => {
  // Construct a sentence with exactly MIN_WORDS words
  const sentence = "Vitamin D helps the body absorb calcium properly.";
  expect(sentence.split(/\s+/).length).toBe(MIN_WORDS); // guard — fails if MIN_WORDS changes
  const article = sentence;
  const page = `Studies show that ${sentence.toLowerCase()}`;

  const matches = findMatchingPassages(article, page);
  expect(matches).toHaveLength(1);
});

test("matching is case-insensitive", () => {
  const article =
    "VITAMIN D IS ESSENTIAL FOR BONE HEALTH AND IMMUNE FUNCTION IN ADULTS.";
  const page =
    "vitamin d is essential for bone health and immune function in adults.";

  const matches = findMatchingPassages(article, page);
  expect(matches).toHaveLength(1);
});

test("finds multiple matching sentences when several are copied", () => {
  const article =
    "Vitamin D supports calcium absorption in the digestive tract. " +
    "It also regulates phosphorus levels throughout the body. " +
    "This is entirely original content that appears nowhere else.";
  const page =
    "Studies confirm that Vitamin D supports calcium absorption in the digestive tract. " +
    "Furthermore, it also regulates phosphorus levels throughout the body.";

  const matches = findMatchingPassages(article, page);
  expect(matches).toHaveLength(2);
});

test("does not split on abbreviations like U.S. mid-sentence", () => {
  const article =
    "U.S. health authorities recommend daily Vitamin D supplementation for all adults.";
  const page =
    "U.S. health authorities recommend daily Vitamin D supplementation for all adults in studies.";

  const matches = findMatchingPassages(article, page);
  // Must match as one sentence, not split into fragments at "U.S."
  expect(matches).toHaveLength(1);
});

test("matches sentence despite markdown link syntax in page content", () => {
  const article =
    "Vitamin D is essential for bone health and immune function in adults.";
  // Parallel full_content may contain markdown links for hyperlinked text
  const page =
    "[Vitamin D](https://example.com/vitamin-d) is essential for bone health and immune function in adults.";

  const matches = findMatchingPassages(article, page);
  expect(matches).toContain(
    "Vitamin D is essential for bone health and immune function in adults."
  );
});

test("splits Hebrew text into three sentences (not one monolithic block)", () => {
  // Each sentence ≥ 8 words to pass MIN_WORDS.
  const heb =
    "זהו המשפט הראשון של המאמר והוא מכיל מספיק מילים לבדיקה. " +
    "זהו המשפט השני שגם הוא ארוך דיו כדי לעבור את הסף המינימלי! " +
    "והנה המשפט השלישי שמסיים את הפסקה עם מספיק תוכן לבחון?";
  const sentences = splitIntoSentences(heb);
  expect(sentences.length).toBe(3);
  expect(sentences[0]).toContain("המשפט הראשון");
});

test("findMatchingPassages detects a copied Hebrew sentence", () => {
  const copied = "זהו המשפט הראשון של המאמר והוא מכיל מספיק מילים לבדיקה";
  // verify fixture meets MIN_WORDS=8
  expect(copied.split(/\s+/).length).toBeGreaterThanOrEqual(8);

  const article = `${copied}. משפט אחר לגמרי שכולל גם הוא מספיק מילים כדי לעבור את הסף.`;
  const page    = `קצת טקסט אחר שממלא את התחילה. ${copied}. עוד טקסט בסוף העמוד.`;
  const matches = findMatchingPassages(article, page);
  expect(matches.length).toBe(1);
  expect(matches[0]).toContain(copied);
});
