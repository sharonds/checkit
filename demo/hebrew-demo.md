# Demo Article — Hebrew (ויטמין D)

This file documents a Hebrew-language demo article for testing article-checker's passage detection.
Sentences marked **[COPIED]** were taken verbatim from the sources listed below.

The passage-matching algorithm in `src/passage.ts` works on any language — it uses
simple substring matching after lowercasing, with no language-specific logic.

---

## Source URLs used for copied passages

| Source | URL |
|--------|-----|
| Wikipedia Hebrew — ויטמין D | https://he.wikipedia.org/wiki/ויטמין_D |
| Wikipedia Hebrew — אוסטאופורוזיס | https://he.wikipedia.org/wiki/אוסטאופורוזיס |

---

## Demo article text

*(Paste this into a Google Doc, make it publicly accessible, then run:*
*`article-checker <your-doc-url>`)*

---

**המדריך המלא לוויטמין D**

ויטמין D הוא אחד החומרים המזינים החשובים ביותר לבריאות כללית, אך מיליוני אנשים ברחבי העולם אינם מקבלים ממנו מספיק. ויטמין מסיס שומן זה ממלא תפקיד קריטי בבריאות העצם, בתפקוד מערכת החיסון ובהרבה יותר.

**מהו ויטמין D?**

ויטמין D הוא קבוצה של סקוסטרואידים מסיסי שומן האחראים להגברת ספיגת הסידן, המגנזיום והפוספט במעיים, וכן להשפעות ביולוגיות מרובות נוספות. אצל בני האדם, התרכובות החשובות ביותר בקבוצה זו הן ויטמין D3 (הידוע גם כ-כולקלציפרול) וויטמין D2 (ארגוקלציפרול). מקור הטבע העיקרי של הוויטמין הוא סינתזה של כולקלציפרול בשכבות התחתונות של האפידרמיס באמצעות תגובה כימית התלויה בחשיפה לשמש (בפרט קרינת UVB).

**מדוע ויטמין D חשוב?**

ויטמין D חיוני לגדילה ולהתפתחות תקינה של עצמות ושיניים, וכן לחיזוק העמידות בפני מחלות מסוימות. אוסטיאופורוזיס היא מחלה של מערכת השלד המאופיינת בירידה בצפיפות רקמת העצם ובהידרדרות המיקרו-מבנה של רקמת העצם, מה שמוביל לשבריריות עצמות מוגברת ולסיכון גבוה יותר לשבר. מחסור בוויטמין D מגביר משמעותית את הסיכון לפתח מצב זה.

תסמיני מחסור בוויטמין D עשויים לכלול עייפות, כאבי עצמות וגב, חולשת שרירים ונפילת שיער.

**מקורות והמלצות**

המנה היומית המומלצת של ויטמין D משתנה לפי גיל ומצב בריאותי. רוב המבוגרים זקוקים ל-600 עד 800 יחידות בינלאומיות ליום.

מזונות עשירים בוויטמין D כוללים סלמון, הרינג, שמן כבד בקלה, ביצים ופטריות.

**מסקנה**

ויטמין D הוא חומר מזין חיוני שאנשים רבים חסרים. חשיפה מספקת לשמש, אכילת מזונות עשירים בוויטמין D ונטילת תוספי תזונה בעת הצורך יכולים לעזור לך לשמור על רמות אופטימליות ולתמוך בבריאותך הכללית.

---

## Expected tool output

When you run article-checker on this Hebrew article, you should see passage evidence
in Hebrew, e.g.:

```
2. he.wikipedia.org/wiki/ויטמין_D   38 words
   ↳ "ויטמין D הוא קבוצה של סקוסטרואידים מסיסי שומן האחראים להגברת ספיגת
      הסידן, המגנזיום והפוספט במעיים…"
```

## Notes on Hebrew support

- The passage matcher is **language-agnostic** — Hebrew works out of the box
- The sentence splitter (`(?<=[.!?])\s+(?=[A-Z])`) triggers on capital Latin letters,
  which means it does NOT split Hebrew sentences (Hebrew has no uppercase)
- Hebrew text is treated as one large block and substring-matched as-is
- This means a single Hebrew sentence copied verbatim will still be caught,
  as long as it is ≥ 8 words long (the `MIN_WORDS` threshold)
- Future improvement: add Hebrew-aware sentence splitting on `׃` or `. ` patterns
