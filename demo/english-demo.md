# Demo Article — English (Vitamin D)

This file documents a demo article for testing article-checker's passage detection.
Sentences marked **[COPIED]** were taken verbatim from the sources listed below.

---

## Source URLs used for copied passages

| Source | URL |
|--------|-----|
| Wikipedia — Vitamin D | https://en.wikipedia.org/wiki/Vitamin_D |
| Healthline — Vitamin D deficiency | https://www.healthline.com/nutrition/vitamin-d-deficiency-symptoms |

---

## Demo article text

*(Paste this into a Google Doc, make it publicly accessible, then run:*
*`article-checker <your-doc-url>`)*

---

**The Essential Guide to Vitamin D**

Vitamin D is one of the most important nutrients for overall health, yet millions of people worldwide don't get enough of it. This fat-soluble vitamin plays a critical role in bone health, immune function, and much more.

**What is Vitamin D?**

Vitamin D is a group of fat-soluble secosteroids responsible for increasing intestinal absorption of calcium, magnesium, and phosphate, and multiple other biological effects. In humans, the most important compounds in this group are vitamin D3 (also known as cholecalciferol) and vitamin D2 (ergocalciferol). The major natural source of the vitamin is synthesis of cholecalciferol in the lower layers of the epidermis through a chemical reaction that is dependent on sun exposure (specifically UVB radiation).

Beyond sunshine, you can also obtain vitamin D from certain foods such as fatty fish, egg yolks, and fortified dairy products.

**Why Vitamin D Matters**

Getting enough vitamin D is important for normal growth and development of bones and teeth, as well as improved resistance against certain diseases. Vitamin D has several important functions in the human body. Perhaps the most vital function of vitamin D is regulating the absorption of calcium and phosphorus and facilitating normal immune system function.

Vitamin D deficiency is incredibly common. Many people don't realize they have it until they develop symptoms. Symptoms of vitamin D deficiency can include getting sick or infected often, fatigue and tiredness, bone and back pain, and hair loss.

**Sources and Recommendations**

The recommended daily intake of vitamin D varies by age and health status. Most adults need 600 to 800 IU per day, though some experts recommend higher amounts for optimal health.

Foods high in vitamin D include salmon, herring and sardines, cod liver oil, canned tuna, egg yolks, and mushrooms.

**Conclusion**

Vitamin D is an essential nutrient that many people are lacking. Getting enough sun exposure, eating vitamin D-rich foods, and taking supplements when needed can help you maintain optimal levels and support your overall health.

---

## Expected tool output

When you run article-checker on this article, you should see:

- Copyscape reports **similarity matches** to the Wikipedia article and/or Healthline
- Under each matched source, the tool shows the **exact copied sentences**, e.g.:

```
2. en.wikipedia.org/wiki/Vitamin_D   42 words
   ↳ "Vitamin D is a group of fat-soluble secosteroids responsible for
      increasing intestinal absorption of calcium, magnesium, and phosphate…"
   ↳ "The major natural source of the vitamin is synthesis of cholecalciferol
      in the lower layers of the epidermis through a chemical reaction…"
```

## Why this is useful

This demo shows that article-checker doesn't just say "89 words matched at Wikipedia."
It shows **which sentences** were copied, giving editors actionable evidence to rewrite
specific passages rather than hunting through the whole article.
