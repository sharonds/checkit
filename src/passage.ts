/**
 * Splits article text into sentences and returns those that appear
 * verbatim (case-insensitive) in the given page content.
 * Sentences shorter than MIN_WORDS are skipped to avoid false positives
 * from common short phrases.
 *
 * MIN_WORDS is exported so tests can reference it symbolically — if you
 * change the threshold, tests automatically use the new value.
 */

export const MIN_WORDS = 8;

export function findMatchingPassages(
  articleText: string,
  pageContent: string
): string[] {
  // Strip markdown link syntax from page content: [text](url) → text.
  // Parallel's full_content may contain markdown-formatted hyperlinks.
  const cleanedPage = pageContent.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const pageLower = cleanedPage.toLowerCase();

  return splitIntoSentences(articleText).filter((s) => {
    if (s.split(/\s+/).length < MIN_WORDS) return false;
    // Strip terminal punctuation before searching so a sentence ending in "."
    // still matches when the page uses a comma or continues the sentence further.
    const core = s.replace(/[.!?]+$/, "").toLowerCase();
    return pageLower.includes(core);
  });
}

function splitIntoSentences(text: string): string[] {
  // Only split on sentence-ending punctuation followed by a capital letter.
  // This avoids false splits on abbreviations like "U.S.", "Dr.", "Fig. 1"
  // where a period is followed by a lowercase continuation.
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}
