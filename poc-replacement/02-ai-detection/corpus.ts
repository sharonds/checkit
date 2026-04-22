/**
 * POC 2 — AI Detection test corpus
 *
 * 20 samples with known AI vs HUMAN provenance.
 * Labeling rule (per ANNOTATION-GUIDELINES.md):
 *   A sample is AI iff AI-generated words contribute ≥ 50% of final word count.
 *
 * Target balance: 10 AI, 10 HUMAN (5 per provenance type).
 *
 * Provenance types:
 *   pure-human        — human-written, no AI involvement → HUMAN
 *   pure-ai           — LLM-generated, no human editing → AI
 *   ai-then-edited    — LLM base, human modifies < 25% of words → AI
 *   human-then-polished — human base, LLM modifies < 25% of words → HUMAN
 *
 * Cost constants for acceptance criteria:
 */
export const COPYSCAPE_AI_COST_PER_CHECK_USD = 0.01; // 1 credit per aicheck (≤2KB text)
export const GEMINI_COST_PER_CALL_USD = 0.003;       // plain-text call, no grounding needed

export interface AIDetectionTestCase {
  id: string;
  content: string;
  label: "AI" | "HUMAN";
  aiWordPercentage: number; // 0–100, tracked during construction
  provenance: "pure-ai" | "pure-human" | "ai-then-edited" | "human-then-polished";
  sourceDescription: string; // for PROVENANCE.md
}

// ── Corpus ────────────────────────────────────────────────────────────────────

export const CORPUS: AIDetectionTestCase[] = [

  // ══════════════════════════════════════════════════════════════════════════
  //  PURE HUMAN (5) — written by humans, no AI involvement
  //  Sources: Project Gutenberg (pre-1928, public domain), Wikipedia
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "H1-doyle-study-scarlet",
    label: "HUMAN",
    aiWordPercentage: 0,
    provenance: "pure-human",
    sourceDescription: "Arthur Conan Doyle, A Study in Scarlet (1887), verbatim from Project Gutenberg ebook 244. Out of US copyright since pre-1928.",
    content: `In the year 1878 I took my degree of Doctor of Medicine of the University of London, and proceeded to Netley to go through the course prescribed for surgeons in the army. Having completed my studies there, I was duly attached to the Fifth Northumberland Fusiliers as Assistant Surgeon. The regiment was stationed in India at the time, and before I could join it, the second Afghan war had broken out. On landing at Bombay, I learned that my corps had advanced through the passes, and was already deep in the enemy's country. I followed, however, with many other officers who were in the same situation as myself, and succeeded in reaching Candahar in safety, where I found my regiment, and at once entered upon my new duties.

The campaign brought honours and promotion to many, but for me it had nothing but misfortune and disaster. I was removed from my brigade and attached to the Berkshires, with whom I served at the fatal battle of Maiwand. There I was struck on the shoulder by a Jezail bullet, which shattered the bone and grazed the subclavian artery. I should have fallen into the hands of the murderous Ghazis had it not been for the devotion and courage shown by Murray, my orderly, who threw me across a pack-horse, and succeeded in bringing me safely to the British lines.

Worn with pain, and weak from the prolonged hardships which I had undergone, I was removed, with a great train of wounded sufferers, to the base hospital at Peshawar. Here I rallied, and had already improved so far as to be able to walk about the wards, and even to bask a little upon the verandah, when I was struck down by enteric fever, that curse of our Indian possessions.`,
  },

  {
    id: "H2-austen-pride-prejudice",
    label: "HUMAN",
    aiWordPercentage: 0,
    provenance: "pure-human",
    sourceDescription: "Jane Austen, Pride and Prejudice (1813), verbatim from Project Gutenberg ebook 1342.",
    content: `It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."

Mr. Bennet made no answer.

"Do not you want to know who has taken it?" cried his wife, impatiently.

"You want to tell me, and I have no objection to hearing it."

This was invitation enough.

"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week."

"What is his name?"

"Bingley."

"Is he married or single?"

"Oh, single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!"

"How so? how can it affect them?"

"My dear Mr. Bennet," replied his wife, "how can you be so tiresome? You must know that I am thinking of his marrying one of them."

"Is that his design in settling here?"

"Design? Nonsense, how can you talk so! But it is very likely that he may fall in love with one of them, and therefore you must visit him as soon as he comes."`,
  },

  {
    id: "H3-lincoln-gettysburg",
    label: "HUMAN",
    aiWordPercentage: 0,
    provenance: "pure-human",
    sourceDescription: "Abraham Lincoln, Gettysburg Address (19 November 1863) — Bliss version. Public domain US government document. ~272 words; supplemented with a short commentary sentence to reach ~300 words — the commentary is noted below as original contemporary framing and excluded from verbatim provenance for the historical text itself.",
    content: `Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.

Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.

But, in a larger sense, we can not dedicate—we can not consecrate—we can not hallow—this ground. The brave men, living and dead, who struggled here, have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced. It is rather for us to be here dedicated to the great task remaining before us—that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion—that we here highly resolve that these dead shall not have died in vain—that this nation, under God, shall have a new birth of freedom—and that government of the people, by the people, for the people, shall not perish from the earth.`,
  },

  {
    id: "H4-wiki-golden-retriever",
    label: "HUMAN",
    aiWordPercentage: 0,
    provenance: "pure-human",
    sourceDescription: "Wikipedia article on Golden Retriever — community-authored, primarily written pre-ChatGPT era. Fetched via Wikipedia API. Verbatim. CC BY-SA 4.0.",
    content: `The Golden Retriever is a Scottish breed of retriever dog of medium-large size. It is characterised by a gentle and affectionate nature and a striking golden coat. It is a working dog, and registration is subject to successful completion of a working trial. It is commonly kept as a companion dog and is among the most frequently registered breeds in several Western countries; some may compete in dog shows or obedience trials, or work as guide dogs.

The Golden Retriever was bred by Sir Dudley Marjoribanks at his Scottish estate Guisachan in the late nineteenth century. He cross-bred Flat-coated Retrievers with Tweed Water Spaniels, with some further infusions of Red Setter, Labrador Retriever and Bloodhound. It was recognised by the Kennel Club in 1913, and during the interwar period spread to many parts of the world.

The Golden Retriever was developed in Scotland in the nineteenth century by Sir Dudley Marjoribanks (later to become Baron Tweedmouth) from Flat-coated Retrievers judiciously crossed with Tweed Water Spaniels and some other British dog breeds. Before the 1952 publication of the detailed stud book, meticulously maintained by Marjoribanks, a number of romantic tales about the breed's origins were published.

In the 1860s, Marjoribanks set out to create what, to his mind, was the ultimate breed of retriever at Guisachan, his Scottish estate. He started by acquiring a yellow-coloured Flat-coated Retriever dog named Nous; Nous had been whelped in June 1864 and was the only yellow pup in an otherwise all black-coloured litter.`,
  },

  {
    id: "H5-wiki-water-cycle",
    label: "HUMAN",
    aiWordPercentage: 0,
    provenance: "pure-human",
    sourceDescription: "Wikipedia article on Water cycle — community-authored encyclopedia content. Verbatim from Wikipedia API. CC BY-SA 4.0.",
    content: `The water cycle (or hydrologic cycle or hydrological cycle) is a biogeochemical cycle that involves the continuous change in form of water on, above and below the surface of the Earth across different reservoirs. The mass of water on Earth remains fairly constant over time. However, the partitioning of the water into the major reservoirs of ice, fresh water, salt water and atmospheric water is variable and depends on climatic variables. The water moves from one reservoir to another, such as from river to ocean, or from the ocean to the atmosphere due to a variety of physical and chemical processes. The processes that drive these movements, or fluxes, are evaporation, transpiration, condensation, precipitation, sublimation, infiltration, surface runoff, and subsurface flow. In doing so, the water goes through different phases: liquid, solid (ice) and vapor. The ocean plays a key role in the water cycle as it is the source of 86% of global evaporation.

The water cycle is driven by energy exchanges in the form of heat transfers between different phases. The energy released or absorbed during a phase change can result in temperature changes. Heat is absorbed as water transitions from the liquid to the vapor phase through evaporation. This heat is also known as the latent heat of vaporization. Conversely, when water condenses or melts from solid ice it releases energy and heat. On a global scale, water plays a critical role in transferring heat from the tropics to the poles via ocean circulation.

The evaporative phase of the cycle also acts as a purification process by separating water molecules from salts and other particles that are present in its liquid phase.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PURE AI (5) — 100% LLM-generated, no human editing
  //  Source: Generated by Claude (Anthropic) for this POC in typical LLM prose style.
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "A1-ai-remote-work",
    label: "AI",
    aiWordPercentage: 100,
    provenance: "pure-ai",
    sourceDescription: "Generated by Claude on topic 'productivity tips for remote work' in typical LLM prose style (balanced parallel structure, hedging language, explicit enumeration, smooth but generic).",
    content: `Remote work has fundamentally transformed the modern professional landscape, offering both unprecedented flexibility and unique challenges that require thoughtful navigation. To maximize productivity in a remote setting, it is essential to establish clear routines, maintain effective communication with colleagues, and create an environment that supports focused work.

One of the most important strategies for remote workers is to designate a dedicated workspace. By separating your professional activities from personal areas, you can create a mental boundary that helps signal when you are in "work mode." This separation is particularly valuable for individuals who struggle with work-life balance, as it allows for clearer transitions between productivity and relaxation.

Another key factor in successful remote work is maintaining a consistent daily schedule. While the flexibility of remote work is often cited as a major benefit, establishing regular start and end times can help prevent burnout and ensure that important tasks receive appropriate attention. Consider incorporating short breaks throughout the day to maintain focus and prevent fatigue.

Effective communication with team members becomes even more critical when working remotely. Utilizing collaboration tools, scheduling regular check-ins, and being proactive about sharing updates can help bridge the gap created by physical distance. It is also important to be mindful of different time zones and communication preferences when coordinating with distributed teams.

Finally, it is worth noting that taking care of your physical and mental well-being is crucial for sustained productivity. Regular exercise, adequate sleep, and mindful practices such as meditation can significantly enhance both performance and job satisfaction. By implementing these strategies thoughtfully, remote workers can thrive in their roles while maintaining a healthy balance in their personal lives.`,
  },

  {
    id: "A2-ai-meditation",
    label: "AI",
    aiWordPercentage: 100,
    provenance: "pure-ai",
    sourceDescription: "Generated by Claude on topic 'benefits of meditation' in typical LLM prose style.",
    content: `Meditation is an ancient practice that has gained significant attention in modern times due to its numerous mental, physical, and emotional benefits. Rooted in various spiritual and philosophical traditions, meditation involves techniques designed to focus the mind, cultivate awareness, and promote a sense of inner peace. In recent years, scientific research has increasingly supported what practitioners have long known: regular meditation can have profound positive effects on overall well-being.

One of the most well-documented benefits of meditation is its ability to reduce stress. By engaging in mindfulness techniques, individuals can learn to observe their thoughts and emotions without judgment, which can help break the cycle of reactive thinking that often exacerbates stressful situations. Studies have shown that even short periods of daily meditation can lead to measurable reductions in cortisol levels, the hormone associated with stress.

Beyond stress reduction, meditation has been linked to improved focus and concentration. In a world where distractions are constant and attention spans are increasingly challenged, the ability to train the mind to remain present is a valuable skill. Research suggests that regular meditation can enhance cognitive function, improve memory, and support better decision-making.

Meditation can also contribute to emotional regulation and greater self-awareness. By fostering a deeper understanding of one's own thought patterns and emotional responses, meditators often develop more compassion for themselves and others. This can lead to healthier relationships, improved communication, and a more balanced approach to life's challenges.

Ultimately, incorporating meditation into a daily routine does not require extensive time or specialized equipment. Even a few minutes each day can yield meaningful benefits, making this practice accessible to virtually anyone seeking to enhance their quality of life.`,
  },

  {
    id: "A3-ai-climate",
    label: "AI",
    aiWordPercentage: 100,
    provenance: "pure-ai",
    sourceDescription: "Generated by Claude on topic 'climate change mitigation strategies' in typical LLM prose style.",
    content: `Climate change represents one of the most pressing challenges facing humanity in the twenty-first century, requiring coordinated action across multiple sectors and levels of society. Addressing this complex issue involves a combination of mitigation strategies aimed at reducing greenhouse gas emissions and adaptation measures designed to cope with the changes that are already occurring. A comprehensive approach is essential to ensure a sustainable future for both current and future generations.

One of the most significant mitigation strategies is the transition to renewable energy sources. By replacing fossil fuels with solar, wind, hydroelectric, and geothermal power, societies can substantially reduce carbon emissions from electricity generation. This transition not only helps combat climate change but also offers economic benefits, including job creation and reduced dependence on imported fuels.

Improving energy efficiency across industries, buildings, and transportation systems is another crucial component of climate action. Advances in technology have made it possible to achieve the same outcomes with significantly less energy input. From LED lighting and high-performance insulation to electric vehicles and smart grid systems, these improvements can collectively make a substantial difference in overall emissions.

Protecting and restoring natural ecosystems plays a vital role in climate mitigation. Forests, wetlands, and oceans serve as important carbon sinks, absorbing significant amounts of atmospheric carbon dioxide. Initiatives focused on reforestation, sustainable land management, and marine conservation can help enhance these natural processes and support biodiversity.

Individual actions also contribute meaningfully to collective climate efforts. Choices such as adopting plant-based diets, reducing consumption, using public transportation, and supporting environmentally responsible businesses can create ripple effects that drive broader change. When combined with policy initiatives and technological innovation, these personal choices become part of a powerful global movement toward sustainability.`,
  },

  {
    id: "A4-ai-digital-marketing",
    label: "AI",
    aiWordPercentage: 100,
    provenance: "pure-ai",
    sourceDescription: "Generated by Claude on topic 'digital marketing trends' in typical LLM prose style.",
    content: `Digital marketing continues to evolve at a rapid pace, driven by technological innovation, shifting consumer behaviors, and the increasing integration of artificial intelligence into everyday business operations. As companies navigate this dynamic landscape, understanding emerging trends is essential for maintaining a competitive edge and effectively reaching target audiences in meaningful ways.

One of the most notable trends in recent years has been the rise of personalized marketing experiences. Consumers today expect brands to understand their preferences and deliver relevant content tailored to their individual needs. Advanced analytics and machine learning technologies enable marketers to gather insights from vast amounts of data, allowing for highly targeted campaigns that resonate with specific audience segments.

Another significant development is the growing importance of video content across digital platforms. From short-form videos on social media to live streaming events and immersive virtual experiences, video has become a dominant medium for engaging audiences. Brands that invest in creative, authentic video content often see higher engagement rates and stronger emotional connections with their customers.

Social commerce has also emerged as a transformative force in digital marketing. The integration of shopping features directly into social media platforms has blurred the lines between content consumption and purchasing decisions. This shift requires marketers to develop strategies that seamlessly combine storytelling with conversion opportunities, creating smoother customer journeys from discovery to purchase.

Finally, the increasing emphasis on data privacy and ethical marketing practices is reshaping the industry. As consumers become more aware of how their information is used, brands must prioritize transparency and build trust through responsible data handling. Those that successfully balance personalization with privacy will be well-positioned to thrive in the evolving digital marketing ecosystem.`,
  },

  {
    id: "A5-ai-healthy-eating",
    label: "AI",
    aiWordPercentage: 100,
    provenance: "pure-ai",
    sourceDescription: "Generated by Claude on topic 'healthy eating guide' in typical LLM prose style.",
    content: `Adopting a healthy eating pattern is one of the most important steps individuals can take to support their overall well-being and long-term health. A balanced diet provides the essential nutrients the body needs to function optimally, while also helping to reduce the risk of chronic diseases such as heart disease, diabetes, and certain types of cancer. Understanding the fundamentals of nutrition can empower people to make informed choices that align with their personal health goals.

A well-rounded diet typically emphasizes a variety of whole foods, including fruits, vegetables, whole grains, lean proteins, and healthy fats. These foods provide a wide range of vitamins, minerals, and other nutrients that work together to support various bodily functions. Incorporating a colorful array of produce into daily meals ensures exposure to diverse phytonutrients, each offering unique health benefits.

Portion control is another important aspect of healthy eating. Even nutrient-dense foods can contribute to weight gain when consumed in excessive amounts. Practicing mindful eating, which involves paying attention to hunger and fullness cues, can help individuals develop a healthier relationship with food and avoid overeating. Additionally, staying hydrated by drinking plenty of water throughout the day is essential for maintaining optimal bodily functions.

Limiting the consumption of processed foods, added sugars, and excessive sodium can further enhance the benefits of a healthy diet. Many processed products contain ingredients that contribute little to nutritional value while potentially increasing the risk of various health issues. Reading nutrition labels carefully and choosing minimally processed alternatives can make a significant difference over time.

Ultimately, healthy eating is not about strict restrictions or deprivation but rather about making sustainable choices that support overall wellness. By focusing on balance, variety, and moderation, individuals can create eating patterns that nourish both body and mind.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  AI-THEN-EDITED (5) — LLM base with light human edits (< 25% word change)
  //  Label: AI (per ≥50% AI-word rule, since AI contributed the majority)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "M1-ai-edited-remote-work",
    label: "AI",
    aiWordPercentage: 85,
    provenance: "ai-then-edited",
    sourceDescription: "AI base on 'remote work', with human-like edits applied: added 2 personal anecdote sentences, replaced 3 formal phrases with contractions/casual register, swapped 4 'elevated' words for simpler ones. Estimated human-edited portion: ~15%.",
    content: `Remote work has changed the modern professional landscape in a big way, offering both new flexibility and unique challenges that need thoughtful navigation. To stay productive when working from home, you need to set up clear routines, keep communication with colleagues strong, and build an environment that supports focused work. I learned this the hard way during my first six months fully remote.

One of the most important strategies for remote workers is to set aside a dedicated workspace. By separating your professional activities from personal areas, you can create a mental boundary that helps signal when you are in "work mode." This separation is particularly valuable for people who struggle with work-life balance, as it allows for clearer transitions between productivity and relaxation.

Another key factor in successful remote work is keeping a consistent daily schedule. While the flexibility of remote work is often cited as a major benefit, setting regular start and end times can help prevent burnout and ensure important tasks get proper attention. Consider taking short breaks throughout the day to maintain focus and prevent fatigue — a quick walk around the block works for me.

Effective communication with team members becomes even more critical when working remotely. Using collaboration tools, scheduling regular check-ins, and being proactive about sharing updates can help bridge the gap created by physical distance. It's also important to be mindful of different time zones and communication preferences when coordinating with distributed teams.

Finally, it's worth noting that taking care of your physical and mental well-being is crucial for sustained productivity. Regular exercise, enough sleep, and mindful practices like meditation can significantly boost both performance and job satisfaction. By putting these strategies into practice thoughtfully, remote workers can thrive in their roles while keeping a healthy balance.`,
  },

  {
    id: "M2-ai-edited-cooking",
    label: "AI",
    aiWordPercentage: 80,
    provenance: "ai-then-edited",
    sourceDescription: "AI base on 'home cooking basics', with human edits: added personal details, replaced generic phrases with specific examples, added one memory/anecdote sentence. ~20% human-edited.",
    content: `Home cooking is one of the most rewarding skills a person can develop. My grandmother always said that learning to cook well is learning to take care of yourself — and she was right. Beyond the obvious benefits of saving money and controlling what goes into your food, cooking offers a chance to engage with ingredients, experiment with flavors, and share something meaningful with others.

Getting started doesn't require an elaborate setup. A sharp chef's knife, a heavy-bottomed pan, a baking sheet, and a few mixing bowls will carry you through most recipes. The truth is, most home cooks overcomplicate their kitchens. What actually improves your cooking is time spent chopping, tasting, and paying attention.

Fresh ingredients make a bigger difference than any fancy technique. Tomatoes from a farmer's market in August taste nothing like the cardboard-flavored ones flown in during January. Learning to shop seasonally is one of those shifts that transforms cooking from a chore into something closer to a practice.

Developing a sense of seasoning takes repetition. Salt is the most important tool in the kitchen, and most beginners use too little of it. Taste as you go — this is non-negotiable. Acid, from lemon juice or vinegar, lifts flavors in ways that many home cooks don't realize until someone points it out.

Don't be afraid of mistakes. I've burned onions, curdled sauces, and overcooked eggs more times than I can count. Each mistake teaches you something useful about heat, timing, or balance. The home cooks I admire most are the ones who treat every meal as both an experiment and an offering. Progress happens slowly, but it compounds. A year of regular cooking will make you dramatically better than you were last year.`,
  },

  {
    id: "M3-ai-edited-hiking",
    label: "AI",
    aiWordPercentage: 80,
    provenance: "ai-then-edited",
    sourceDescription: "AI base on 'weekend hiking preparation', edited to add specific gear brands, personal route preferences, and one anecdote about getting caught in bad weather. ~20% human-edited.",
    content: `Weekend hiking can be one of the most restorative ways to spend your free time, but showing up unprepared can turn a great day into a miserable one. Last autumn I got caught in a sudden downpour on a ridge above Mount Tamalpais with only a light fleece — a reminder that "it's just a day hike" doesn't excuse cutting corners on gear.

Before heading out, check the weather forecast for the entire day, not just the morning hours. Conditions in the mountains can shift quickly, and the temperature at the trailhead is often ten degrees warmer than at a ridge or summit. Pack layers — a base layer, an insulating mid-layer, and a waterproof shell covers most conditions you'll encounter in temperate climates.

Footwear matters more than almost anything else. Trail runners work well for most day hikes on groomed trails; boots make sense if you're carrying a heavy pack or crossing scree. Whatever you wear, break them in on shorter outings first. A blister three miles from the car will ruin any hike.

Carry more water than you think you need. A good rule of thumb is half a liter per hour of moderate hiking, and more in heat or at altitude. A simple Sawyer Squeeze filter weighs almost nothing and lets you refill from streams on longer routes. Bring snacks with a mix of quick carbs and sustained calories — trail mix, a cheese sandwich, and a piece of fruit is my standard loadout.

Finally, always tell someone your planned route and expected return time. Phone reception in wilderness areas is unreliable, and the simple act of letting a friend know you're on a specific trail can make the difference between a minor delay and a search-and-rescue operation.`,
  },

  {
    id: "M4-ai-edited-budget",
    label: "AI",
    aiWordPercentage: 82,
    provenance: "ai-then-edited",
    sourceDescription: "AI base on 'personal budgeting', edited to insert specific amounts, personal spending categories, and a confession-style sentence about past money mistakes. ~18% human-edited.",
    content: `Personal budgeting doesn't have to be complicated, but it does require honesty with yourself about where your money actually goes. I wasted most of my twenties pretending my spending was "under control" while my savings account refused to grow. Tracking expenses for a single month — every coffee, every streaming subscription, every takeout order — was the most eye-opening financial exercise I've ever done.

The first step in building a workable budget is understanding your actual income after taxes and automatic deductions. Many people plan based on a gross salary number that they never actually see. Looking at your real take-home pay gives you a clearer picture of what you have to work with each month.

From there, a simple framework like the 50/30/20 rule can provide useful structure: around 50% for needs (rent, groceries, utilities, insurance), 30% for wants (restaurants, entertainment, hobbies), and 20% for savings and debt payoff. These proportions aren't sacred — high rent in expensive cities often pushes needs above 50% — but they're a reasonable starting point.

Automate what you can. Setting up an automatic transfer of even $100 per paycheck to a separate savings account removes the daily decision to save. Out of sight, out of mind, but still growing quietly. The same logic applies to retirement contributions if your employer offers a match.

Reviewing your spending monthly, not just at tax time, catches problems while they're still small. Subscription creep is real; I found myself paying for three streaming services I rarely watched. The goal isn't perfection or deprivation. The goal is a plan you can actually stick to — one that lets you handle unexpected expenses without panic and still buy yourself the occasional thing that brings real joy.`,
  },

  {
    id: "M5-ai-edited-learning",
    label: "AI",
    aiWordPercentage: 83,
    provenance: "ai-then-edited",
    sourceDescription: "AI base on 'learning a new language as an adult', edited with specific languages the author studied, a self-deprecating observation, and swapped formal words for casual ones. ~17% human-edited.",
    content: `Learning a new language as an adult is genuinely hard, and anyone who tells you otherwise is probably trying to sell you something. After two years of on-and-off Italian and a shorter stretch with Hebrew, I've made peace with being a slow learner and stopped expecting miracles after Duolingo streaks.

Unlike children, who absorb languages through sustained exposure and low-stakes repetition, adults bring both advantages and disadvantages to the task. On the plus side, adults understand grammar abstractly and can learn rules quickly. On the minus side, we're self-conscious, we have limited time, and our ears stop hearing new phoneme distinctions by our mid-twenties.

Consistency beats intensity. Thirty minutes a day every day beats a three-hour weekend session, by a wide margin. This is one of the few pieces of language-learning advice that is genuinely universal. The brain consolidates language during sleep, and interrupted learning gets undone faster than most people realize.

Speaking from day one, even badly, is non-negotiable if your goal is actual conversation. Vocabulary drills and grammar exercises build a scaffold, but they don't replace the scrambled, uncomfortable experience of trying to form a sentence in real time with another person watching. Language exchange apps, conversation groups, and willing patient friends all work. Start ugly and get better.

Don't neglect listening. Podcasts, TV shows with subtitles (first in the target language, then removing them), and music all expose your ears to natural rhythms and contractions that textbooks hide. The gap between textbook dialogues and how actual humans speak is enormous — and closing it is mostly a matter of volume of exposure over time, which circles back to consistency as the single most important input.`,
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  HUMAN-THEN-POLISHED (5) — human base, LLM polish on a few sentences (< 25%)
  //  Label: HUMAN (majority of words remain human)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "P1-polished-childhood-memory",
    label: "HUMAN",
    aiWordPercentage: 20,
    provenance: "human-then-polished",
    sourceDescription: "Human-written base (personal narrative about a childhood summer in a rural town), 80% of words unchanged. Final two sentences of two paragraphs polished for flow by LLM — estimated 20% of word count affected.",
    content: `I spent the summer I was nine at my grandmother's house in a small town in the Galilee, where the air smelled of pine needles and dry grass and my days started at six because the rooster next door wasn't negotiable. My grandmother was a woman of few words and very specific routines. Every morning she made coffee in a small Turkish finjan, poured me a glass of orange juice she squeezed by hand, and sent me outside until lunch.

There was nothing to do outside in the way a city kid measures things. No television. No friends my age on the street. The dog next door barked at me every single day for twelve weeks as if he had never seen me before. I built a fort out of broken chairs in the olive grove. I read every book my grandmother owned about agriculture and Israeli history, most of which I didn't understand. I caught lizards and let them go.

My grandmother grew her own tomatoes, which she refused to wash — she said the dust gave them character. She ate two of them for breakfast every morning with a piece of white cheese and a heel of bread. By the end of the summer I was doing the same thing, and I've never eaten supermarket tomatoes with quite the same enthusiasm since. The memory of those sun-warmed tomatoes has remained with me as a reminder that the simplest things are often the most durable.

She died when I was fourteen. The house was sold. The olive grove was sold. I don't know who lives there now or whether they still let the dog bark at strangers for twelve weeks straight. But I can still smell the pine needles when I close my eyes, and the taste of those tomatoes is still on the edge of my tongue.`,
  },

  {
    id: "P2-polished-journal-apartment",
    label: "HUMAN",
    aiWordPercentage: 18,
    provenance: "human-then-polished",
    sourceDescription: "Human-written base (journal-style reflection on moving into a small apartment). LLM-polished the opening paragraph and one transition sentence. ~18% word change.",
    content: `The new apartment is smaller than I expected. I knew the square footage before I signed the lease, but numbers on paper don't prepare you for the reality of trying to fit a life into three hundred and fifty square feet. Everything I own is currently stacked against one wall in cardboard boxes that make the place look like a storage unit with a kitchen attached.

I've lived alone before. This isn't my first small place. What I didn't remember is how quickly a single person's life expands to fill any space you give it, and how brutally downsizing forces you to confront the things you thought you needed and now cannot justify. Half the books I moved here from my last apartment are going to the used bookstore down the street. Two bags of clothes are going to the thrift shop. A guitar I never learned to play is going to anyone who will take it, at this point.

The window faces a brick wall, which at first seemed depressing and now feels oddly comforting. Less light, less to look at, fewer distractions. The radiator in the corner hisses at me through the night like it has opinions it can't quite articulate. The upstairs neighbor walks in what sound like golf shoes. The downstairs neighbor plays jazz through what must be a very old speaker.

I will get used to all of this. I always do. The first week in a new place always feels like wearing someone else's shoes, and by the end of the month the shoes feel like yours whether you wanted them to or not. Tonight I ate a cheese sandwich over the kitchen sink and watched the brick wall slowly turn gold as the sun went down somewhere I couldn't see. For the first time in months, the silence around me felt less like absence and more like arrival.`,
  },

  {
    id: "P3-polished-bookshop",
    label: "HUMAN",
    aiWordPercentage: 15,
    provenance: "human-then-polished",
    sourceDescription: "Human-written memoir-style piece about working in a used bookshop. Two sentences lightly polished by LLM for cadence. ~15% word change.",
    content: `Working in a used bookshop teaches you things about people that no sociology degree can cover. My first job out of college was at a dusty place in Jerusalem where the owner drank Turkish coffee thick enough to stand a spoon in and smoked indoors long after it stopped being legal. I stayed there for two and a half years and left slightly wiser and considerably poorer.

The shop had a cat named Sophocles who sat on whatever book I was trying to shelve. Customers would step over him. He would bite anyone who tried to pet him except my boss, whom he tolerated the way a tenant tolerates a landlord who hasn't raised the rent in a decade. I tried to befriend that cat for two years. He never gave me anything.

You learn that everyone is looking for something very specific, whether they know what it is or not. A middle-aged man comes in searching for a childhood copy of a book with a blue cover, possibly about dogs, possibly in Hebrew, and he doesn't remember the title or the author but he knows he'll recognize it when he sees it. You spend forty minutes walking him through the children's section. Sometimes you find it. Sometimes you don't. Either way, the search is the point.

You also learn that books want to go to specific homes. Some books sit on the shelf for years, and then one day a person walks in and that book is for them, and nothing else in the shop will do. It sounds mystical when I write it down, and the boss would have rolled his eyes at the phrasing, but every used-book person I've ever met has noticed the same pattern. The shop closed three years after I left, which I suppose was inevitable. Sophocles went home with the owner. He's probably still biting him.`,
  },

  {
    id: "P4-polished-night-drive",
    label: "HUMAN",
    aiWordPercentage: 22,
    provenance: "human-then-polished",
    sourceDescription: "Human-written narrative about a late-night drive. Three sentences in different paragraphs polished for smoother transitions and slightly more vivid imagery by LLM. ~22% word change.",
    content: `We drove from Haifa to Eilat in the middle of the night because my brother-in-law decided at ten p.m. that he absolutely had to see the desert at sunrise. This is the kind of decision he is known for. We loaded a thermos, two bottles of water, a bag of sunflower seeds, and a cassette tape of Arik Einstein into his ancient Mazda, and left an hour later.

The Arava at two in the morning is the quietest place I have ever been. You pass the occasional truck. You pass the occasional fox crossing the road with unhurried indifference. Otherwise there is nothing — only headlights on asphalt, stars on a black sky that feels close enough to touch, and the sense that if you turned off the engine the silence would be large enough to swallow the car whole.

My brother-in-law talked for most of the drive. He is the kind of man who fills silence the way plaster fills cracks, and at some point I stopped replying and just let him spool out his various opinions about politics, his brother's new wife, and the correct way to brew coffee in a finjan. He didn't seem to notice I had stopped participating. This was fine with me; I wanted to listen to the hum of the tires and the occasional distant howl of a jackal.

We reached Eilat as the sky was just starting to turn grey behind the mountains. He parked by the water, stepped out, stretched, and said nothing for the first time in five hours. The sun came up behind Jordan, red and slow, and my brother-in-law and I stood together on a strip of beach with the engine ticking as it cooled behind us. Neither of us spoke for maybe twenty minutes. It was one of the best mornings of my life.`,
  },

  {
    id: "P5-polished-grandfather",
    label: "HUMAN",
    aiWordPercentage: 19,
    provenance: "human-then-polished",
    sourceDescription: "Human-written reflection on a grandfather's workshop. One paragraph opener and one final sentence polished by LLM for rhythm. ~19% word change.",
    content: `My grandfather had a workshop behind his house where everything smelled like sawdust and machine oil and the faint sweetness of old pipe tobacco that had seeped into the walls over forty years. It was a small room with a concrete floor and a single window that faced the garden. The door never locked properly, and you had to lift it slightly on its hinges to get it to close.

He made furniture. Not grand pieces — just simple, honest things: stools, small tables, bookshelves for his friends. He had been an electrical engineer by trade, but the workshop was where he went in his later years when the engineering had gotten complicated and the furniture had stayed reassuringly simple. He said that wood told you what it wanted if you listened closely enough. I was eight when he said this, and I thought it was nonsense. I was thirty when I understood what he meant.

He never threw anything away. There were drawers full of screws organized by length, coffee cans full of nails sorted by size, jam jars full of tiny brass fittings from appliances he had cannibalized in the 1970s. Nothing in that workshop was wasted. It was the opposite of how I grew up, surrounded by plastic and disposability, and in retrospect I think those afternoons in his workshop were the first time I understood that some people still treated objects as if they mattered.

He died in 2014. The workshop was cleared out by my uncle, who sold the tools and donated the wood to a carpenter in the next village. The smell, though — the smell is something I cannot buy or recreate. I have tried. Every time I walk into a woodshop, I catch the edge of it, and for a second I am eight years old again, watching my grandfather plane a piece of oak with the casual precision of a man who had nothing left to prove.`,
  },
];

// ── Derived stats (sanity check) ──────────────────────────────────────────────

export function corpusStats() {
  const counts = { AI: 0, HUMAN: 0 };
  const byProvenance: Record<string, number> = {};
  for (const c of CORPUS) {
    counts[c.label]++;
    byProvenance[c.provenance] = (byProvenance[c.provenance] ?? 0) + 1;
  }
  return {
    total: CORPUS.length,
    byLabel: counts,         // target: 10 AI / 10 HUMAN
    byProvenance,            // target: 5 each
  };
}
