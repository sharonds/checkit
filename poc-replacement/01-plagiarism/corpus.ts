/**
 * POC 1 — Plagiarism test corpus
 *
 * 10 articles with sentence-level ground truth, constructed from public-domain
 * Wikipedia content (CC BY-SA 4.0). Article-level severity is derived from
 * sentence labels, not authored independently. See ANNOTATION-GUIDELINES.md.
 *
 * Corpus: 3 heavy (>40% verbatim), 3 light (1-3 verbatim), 2 paraphrased, 2 original.
 *
 * IMPORTANT: Labels were set before running any engine. See PROVENANCE.md for
 * source licensing and construction notes.
 */

// Standard API search: $0.01 per credit, ≤2KB text = 1 credit per search.
// Confirm current pricing at https://www.copyscape.com/api-pricing.php before running.
// Acceptance criterion: replace if Gemini cost ≤ 2× this → ≤ $0.02/search.
export const COPYSCAPE_COST_PER_SEARCH_USD = 0.01;

export interface SentenceLabel {
  sentence: string;
  status: "verbatim" | "near-verbatim" | "paraphrased" | "original";
  sourceUrl?: string; // required for non-original sentences
}

export interface PlagiarismTestCase {
  id: string;
  title: string;
  content: string;
  sentences: SentenceLabel[];
  // Derived from sentence labels — do NOT author independently
  overallSeverity: "none" | "light" | "heavy";
  sourceUrls: string[]; // unique source URLs derived from sentences
}

// ── Corpus ────────────────────────────────────────────────────────────────────

export const CORPUS: PlagiarismTestCase[] = [

  // ── Heavy plagiarism (>40% verbatim/near-verbatim) ────────────────────────

  {
    id: "01-heavy-photosynthesis",
    title: "The Science of Photosynthesis",
    content: [
      "Photosynthesis is a system of biological processes by which photopigment-bearing autotrophic organisms, such as most plants, algae and cyanobacteria, convert light energy — typically from sunlight — into the chemical energy necessary to fuel their metabolism.",
      "This remarkable process underpins nearly all life on Earth.",
      "Photosynthesis plays a critical role in producing and maintaining the oxygen content of the Earth's atmosphere, and it supplies most of the biological energy necessary for complex life on Earth.",
      "Without it, the planet's oxygen levels would plummet within geological timescales.",
      "The term photosynthesis usually refers to oxygenic photosynthesis, a process that releases oxygen as a byproduct of water splitting.",
      "Photosynthetic organisms store the converted chemical energy within the bonds of intracellular organic compounds (complex compounds containing carbon), typically carbohydrates like sugars (mainly glucose, fructose and sucrose), starches, phytoglycogen and cellulose.",
      "These compounds form the nutritional base for nearly all other living organisms on the planet.",
      "When needing to use this stored energy, an organism's cells then metabolize the organic compounds through cellular respiration.",
      "Researchers are now studying how to replicate this mechanism artificially to produce clean fuel.",
    ].join(" "),
    sentences: [
      {
        sentence: "Photosynthesis is a system of biological processes by which photopigment-bearing autotrophic organisms, such as most plants, algae and cyanobacteria, convert light energy — typically from sunlight — into the chemical energy necessary to fuel their metabolism.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Photosynthesis",
      },
      {
        sentence: "This remarkable process underpins nearly all life on Earth.",
        status: "original",
      },
      {
        sentence: "Photosynthesis plays a critical role in producing and maintaining the oxygen content of the Earth's atmosphere, and it supplies most of the biological energy necessary for complex life on Earth.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Photosynthesis",
      },
      {
        sentence: "Without it, the planet's oxygen levels would plummet within geological timescales.",
        status: "original",
      },
      {
        sentence: "The term photosynthesis usually refers to oxygenic photosynthesis, a process that releases oxygen as a byproduct of water splitting.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Photosynthesis",
      },
      {
        sentence: "Photosynthetic organisms store the converted chemical energy within the bonds of intracellular organic compounds (complex compounds containing carbon), typically carbohydrates like sugars (mainly glucose, fructose and sucrose), starches, phytoglycogen and cellulose.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Photosynthesis",
      },
      {
        sentence: "These compounds form the nutritional base for nearly all other living organisms on the planet.",
        status: "original",
      },
      {
        sentence: "When needing to use this stored energy, an organism's cells then metabolize the organic compounds through cellular respiration.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Photosynthesis",
      },
      {
        sentence: "Researchers are now studying how to replicate this mechanism artificially to produce clean fuel.",
        status: "original",
      },
    ],
    // 5 verbatim / 9 total = 55.6% → heavy
    overallSeverity: "heavy",
    sourceUrls: ["https://en.wikipedia.org/wiki/Photosynthesis"],
  },

  {
    id: "02-heavy-water-cycle",
    title: "The Water Cycle Explained",
    content: [
      "The water cycle (or hydrologic cycle or hydrological cycle) is a biogeochemical cycle that involves the continuous change in form of water on, above and below the surface of the Earth across different reservoirs.",
      "The mass of water on Earth remains fairly constant over time.",
      "Yet water is constantly moving between these reservoirs in ways that sustain all life.",
      "The water moves from one reservoir to another, such as from river to ocean, or from the ocean to the atmosphere due to a variety of physical and chemical processes.",
      "The processes that drive these movements, or fluxes, are evaporation, transpiration, condensation, precipitation, sublimation, infiltration, surface runoff, and subsurface flow.",
      "Understanding these fluxes is essential for managing freshwater resources at a global scale.",
      "The ocean plays a key role in the water cycle as it is the source of 86% of global evaporation.",
      "The evaporative phase of the cycle also acts as a purification process by separating water molecules from salts and other particles that are present in its liquid phase.",
      "This natural purification explains why rainwater is fresh even though it evaporates primarily from the salty ocean.",
    ].join(" "),
    sentences: [
      {
        sentence: "The water cycle (or hydrologic cycle or hydrological cycle) is a biogeochemical cycle that involves the continuous change in form of water on, above and below the surface of the Earth across different reservoirs.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Water_cycle",
      },
      {
        sentence: "The mass of water on Earth remains fairly constant over time.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Water_cycle",
      },
      {
        sentence: "Yet water is constantly moving between these reservoirs in ways that sustain all life.",
        status: "original",
      },
      {
        sentence: "The water moves from one reservoir to another, such as from river to ocean, or from the ocean to the atmosphere due to a variety of physical and chemical processes.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Water_cycle",
      },
      {
        sentence: "The processes that drive these movements, or fluxes, are evaporation, transpiration, condensation, precipitation, sublimation, infiltration, surface runoff, and subsurface flow.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Water_cycle",
      },
      {
        sentence: "Understanding these fluxes is essential for managing freshwater resources at a global scale.",
        status: "original",
      },
      {
        sentence: "The ocean plays a key role in the water cycle as it is the source of 86% of global evaporation.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Water_cycle",
      },
      {
        sentence: "The evaporative phase of the cycle also acts as a purification process by separating water molecules from salts and other particles that are present in its liquid phase.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Water_cycle",
      },
      {
        sentence: "This natural purification explains why rainwater is fresh even though it evaporates primarily from the salty ocean.",
        status: "original",
      },
    ],
    // 6 verbatim / 9 total = 66.7% → heavy
    overallSeverity: "heavy",
    sourceUrls: ["https://en.wikipedia.org/wiki/Water_cycle"],
  },

  {
    id: "03-heavy-dna",
    title: "DNA: The Blueprint of Life",
    content: [
      "Deoxyribonucleic acid (DNA) is a polymer composed of two polynucleotide chains that coil around each other to form a double helix.",
      "The polymer carries genetic instructions for the development, functioning, growth and reproduction of all known organisms and many viruses.",
      "This discovery, confirmed structurally by Watson and Crick in 1953, transformed biology, medicine, and forensics.",
      "DNA and ribonucleic acid (RNA) are nucleic acids.",
      "Alongside proteins, lipids and complex carbohydrates (polysaccharides), nucleic acids are one of the four major types of macromolecules that are essential for all known forms of life.",
      "The structure explains how genetic information is stored and replicated with high fidelity.",
      "The nitrogenous bases of the two separate polynucleotide strands are bound together, according to base pairing rules (A with T and C with G), with hydrogen bonds to make double-stranded DNA.",
      "In eukaryotic cells, DNA is organized into long structures called chromosomes.",
      "Humans carry 23 pairs of chromosomes in the nucleus of virtually every cell in the body.",
    ].join(" "),
    sentences: [
      {
        sentence: "Deoxyribonucleic acid (DNA) is a polymer composed of two polynucleotide chains that coil around each other to form a double helix.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/DNA",
      },
      {
        sentence: "The polymer carries genetic instructions for the development, functioning, growth and reproduction of all known organisms and many viruses.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/DNA",
      },
      {
        sentence: "This discovery, confirmed structurally by Watson and Crick in 1953, transformed biology, medicine, and forensics.",
        status: "original",
      },
      {
        sentence: "DNA and ribonucleic acid (RNA) are nucleic acids.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/DNA",
      },
      {
        sentence: "Alongside proteins, lipids and complex carbohydrates (polysaccharides), nucleic acids are one of the four major types of macromolecules that are essential for all known forms of life.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/DNA",
      },
      {
        sentence: "The structure explains how genetic information is stored and replicated with high fidelity.",
        status: "original",
      },
      {
        sentence: "The nitrogenous bases of the two separate polynucleotide strands are bound together, according to base pairing rules (A with T and C with G), with hydrogen bonds to make double-stranded DNA.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/DNA",
      },
      {
        sentence: "In eukaryotic cells, DNA is organized into long structures called chromosomes.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/DNA",
      },
      {
        sentence: "Humans carry 23 pairs of chromosomes in the nucleus of virtually every cell in the body.",
        status: "original",
      },
    ],
    // 6 verbatim / 9 total = 66.7% → heavy
    overallSeverity: "heavy",
    sourceUrls: ["https://en.wikipedia.org/wiki/DNA"],
  },

  // ── Light plagiarism (1–3 verbatim/near-verbatim sentences) ──────────────

  {
    id: "04-light-climate-change",
    title: "Why Climate Change Demands Urgent Action",
    content: [
      "Climate change is reshaping the planet in ways that scientists predicted decades ago but that are now becoming undeniably visible.",
      "The warming is primarily driven by greenhouse gases released through human industrial activity since the eighteenth century.",
      "Earth's atmosphere now has roughly 50% more carbon dioxide, the main gas driving global warming, than it did at the end of the pre-industrial era, reaching levels not seen for millions of years.",
      "The consequences range from rising sea levels and more frequent extreme weather events to shifting agricultural zones and disrupted freshwater supplies.",
      "The World Health Organization calls climate change one of the biggest threats to global health in the 21st century.",
      "Governments and businesses are beginning to respond, but the pace of action still falls short of what the science says is necessary.",
      "Transforming energy systems quickly enough to limit the worst outcomes remains one of the defining challenges of this generation.",
    ].join(" "),
    sentences: [
      {
        sentence: "Climate change is reshaping the planet in ways that scientists predicted decades ago but that are now becoming undeniably visible.",
        status: "original",
      },
      {
        sentence: "The warming is primarily driven by greenhouse gases released through human industrial activity since the eighteenth century.",
        status: "original",
      },
      {
        sentence: "Earth's atmosphere now has roughly 50% more carbon dioxide, the main gas driving global warming, than it did at the end of the pre-industrial era, reaching levels not seen for millions of years.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Climate_change",
      },
      {
        sentence: "The consequences range from rising sea levels and more frequent extreme weather events to shifting agricultural zones and disrupted freshwater supplies.",
        status: "original",
      },
      {
        sentence: "The World Health Organization calls climate change one of the biggest threats to global health in the 21st century.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Climate_change",
      },
      {
        sentence: "Governments and businesses are beginning to respond, but the pace of action still falls short of what the science says is necessary.",
        status: "original",
      },
      {
        sentence: "Transforming energy systems quickly enough to limit the worst outcomes remains one of the defining challenges of this generation.",
        status: "original",
      },
    ],
    // 2 verbatim / 7 total = 28.6% → light
    overallSeverity: "light",
    sourceUrls: ["https://en.wikipedia.org/wiki/Climate_change"],
  },

  {
    id: "05-light-amazon-river",
    title: "The Amazon: World's Most Powerful River",
    content: [
      "South America is home to the most powerful river system on Earth.",
      "The Amazon River in South America is the largest river by discharge volume of water in the world, and the second-longest or longest river system in the world, a title which is disputed with the Nile.",
      "Its enormous basin covers an area larger than the contiguous United States, sustaining the world's largest tropical rainforest.",
      "The Amazon River has an average discharge of about 215,000–230,000 cubic meters per second (7,600,000–8,100,000 cu ft/s)—approximately 6,591–7,570 cubic kilometers (1,581–1,816 cu mi) per year, greater than the next seven largest independent rivers combined.",
      "This freshwater outflow is so massive that it dilutes ocean salinity hundreds of kilometers out to sea.",
      "The river and its surrounding forest support millions of species, many of which have yet to be catalogued by science.",
    ].join(" "),
    sentences: [
      {
        sentence: "South America is home to the most powerful river system on Earth.",
        status: "original",
      },
      {
        sentence: "The Amazon River in South America is the largest river by discharge volume of water in the world, and the second-longest or longest river system in the world, a title which is disputed with the Nile.",
        status: "near-verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Amazon_River",
      },
      {
        sentence: "Its enormous basin covers an area larger than the contiguous United States, sustaining the world's largest tropical rainforest.",
        status: "original",
      },
      {
        sentence: "The Amazon River has an average discharge of about 215,000–230,000 cubic meters per second (7,600,000–8,100,000 cu ft/s)—approximately 6,591–7,570 cubic kilometers (1,581–1,816 cu mi) per year, greater than the next seven largest independent rivers combined.",
        status: "verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Amazon_River",
      },
      {
        sentence: "This freshwater outflow is so massive that it dilutes ocean salinity hundreds of kilometers out to sea.",
        status: "original",
      },
      {
        sentence: "The river and its surrounding forest support millions of species, many of which have yet to be catalogued by science.",
        status: "original",
      },
    ],
    // 1 verbatim + 1 near-verbatim / 6 total = 33.3% → light
    overallSeverity: "light",
    sourceUrls: ["https://en.wikipedia.org/wiki/Amazon_River"],
  },

  {
    id: "06-light-plate-tectonics",
    title: "Plate Tectonics: The Engine Beneath Our Feet",
    content: [
      "The ground beneath your feet is in constant motion, though on timescales too slow for any human to perceive directly.",
      "According to the theory of plate tectonics, Earth's lithosphere comprises a number of large tectonic plates, which have been slowly moving since 3–4 billion years ago.",
      "These plates carry continents and ocean floors on their backs, reshaping the planet over geological time.",
      "Earth's outer shell is fractured into seven or eight major plates (depending on how they are defined) and many minor plates or platelets.",
      "Where plates converge or diverge, the result is earthquakes, volcanoes, mountain ranges, and deep ocean trenches.",
      "The theory gained broad acceptance in the 1960s when evidence from seafloor spreading confirmed that the ocean floors were spreading apart at mid-ocean ridges.",
    ].join(" "),
    sentences: [
      {
        sentence: "The ground beneath your feet is in constant motion, though on timescales too slow for any human to perceive directly.",
        status: "original",
      },
      {
        sentence: "According to the theory of plate tectonics, Earth's lithosphere comprises a number of large tectonic plates, which have been slowly moving since 3–4 billion years ago.",
        status: "near-verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Plate_tectonics",
      },
      {
        sentence: "These plates carry continents and ocean floors on their backs, reshaping the planet over geological time.",
        status: "original",
      },
      {
        sentence: "Earth's outer shell is fractured into seven or eight major plates (depending on how they are defined) and many minor plates or platelets.",
        status: "near-verbatim",
        sourceUrl: "https://en.wikipedia.org/wiki/Plate_tectonics",
      },
      {
        sentence: "Where plates converge or diverge, the result is earthquakes, volcanoes, mountain ranges, and deep ocean trenches.",
        status: "original",
      },
      {
        sentence: "The theory gained broad acceptance in the 1960s when evidence from seafloor spreading confirmed that the ocean floors were spreading apart at mid-ocean ridges.",
        status: "original",
      },
    ],
    // 2 near-verbatim / 6 total = 33.3% → light
    overallSeverity: "light",
    sourceUrls: ["https://en.wikipedia.org/wiki/Plate_tectonics"],
  },

  // ── Paraphrased (0 verbatim, some paraphrased — ideas from source) ─────────

  {
    id: "07-paraphrased-volcano",
    title: "Living with Volcanoes",
    content: [
      "A volcano is essentially a rupture or opening in the surface of a planet through which molten rock, superheated gases, and fine particles are ejected from a reservoir of magma underground.",
      "On Earth, these features cluster where the giant slabs of crust and mantle that cover the planet are pulling apart or pushing against each other.",
      "Because most plate boundaries lie beneath the sea, the majority of Earth's volcanoes are submerged and unseen.",
      "The more destructive eruptions typically occur at collision zones, where one slab dives beneath another and the heat generated as it descends melts rock that then rises toward the surface.",
      "Occasionally, volcanoes form far from any plate boundary, fed by abnormally hot material rising from deep in the mantle — these hotspot volcanoes can create island chains like Hawaii as the overlying plate moves steadily above them.",
      "Scientists categorise volcanoes by activity: those that have erupted within recorded history and remain geologically active, those that have been quiet for thousands of years but retain a magma supply, and those that are considered permanently dormant.",
    ].join(" "),
    sentences: [
      {
        sentence: "A volcano is essentially a rupture or opening in the surface of a planet through which molten rock, superheated gases, and fine particles are ejected from a reservoir of magma underground.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Volcano",
      },
      {
        sentence: "On Earth, these features cluster where the giant slabs of crust and mantle that cover the planet are pulling apart or pushing against each other.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Volcano",
      },
      {
        sentence: "Because most plate boundaries lie beneath the sea, the majority of Earth's volcanoes are submerged and unseen.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Volcano",
      },
      {
        sentence: "The more destructive eruptions typically occur at collision zones, where one slab dives beneath another and the heat generated as it descends melts rock that then rises toward the surface.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Volcano",
      },
      {
        sentence: "Occasionally, volcanoes form far from any plate boundary, fed by abnormally hot material rising from deep in the mantle — these hotspot volcanoes can create island chains like Hawaii as the overlying plate moves steadily above them.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Volcano",
      },
      {
        sentence: "Scientists categorise volcanoes by activity: those that have erupted within recorded history and remain geologically active, those that have been quiet for thousands of years but retain a magma supply, and those that are considered permanently dormant.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Volcano",
      },
    ],
    // 0 verbatim, all paraphrased → none severity (no verbatim/near-verbatim)
    overallSeverity: "none",
    sourceUrls: ["https://en.wikipedia.org/wiki/Volcano"],
  },

  {
    id: "08-paraphrased-ocean-currents",
    title: "How Ocean Currents Control Our Climate",
    content: [
      "The world's oceans are not static bodies of water — they circulate continuously in vast, organised patterns shaped by wind, the planet's rotation, and differences in water temperature and saltiness.",
      "Oceanographers group these movements into three broad types based on their speed and driving force: slow broad drifts dominated by prevailing winds, mid-speed flows, and fast narrow streams with the greatest intensity.",
      "The Gulf Stream is the best-known example of the latter: a powerful northward current that carries warm tropical water along the eastern coast of North America and across the Atlantic toward northwestern Europe.",
      "Without this heat transfer, countries like the United Kingdom and Norway would be far colder than their latitudes would otherwise suggest.",
      "Collectively, all the surface and deep-water currents form a global circulation system that distributes heat, nutrients, and dissolved gases across the entire ocean.",
      "Scientists are concerned that melting ice from the polar regions could disrupt this circulation by adding freshwater that alters the density differences driving it.",
    ].join(" "),
    sentences: [
      {
        sentence: "The world's oceans are not static bodies of water — they circulate continuously in vast, organised patterns shaped by wind, the planet's rotation, and differences in water temperature and saltiness.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Ocean_current",
      },
      {
        sentence: "Oceanographers group these movements into three broad types based on their speed and driving force: slow broad drifts dominated by prevailing winds, mid-speed flows, and fast narrow streams with the greatest intensity.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Ocean_current",
      },
      {
        sentence: "The Gulf Stream is the best-known example of the latter: a powerful northward current that carries warm tropical water along the eastern coast of North America and across the Atlantic toward northwestern Europe.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Ocean_current",
      },
      {
        sentence: "Without this heat transfer, countries like the United Kingdom and Norway would be far colder than their latitudes would otherwise suggest.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Ocean_current",
      },
      {
        sentence: "Collectively, all the surface and deep-water currents form a global circulation system that distributes heat, nutrients, and dissolved gases across the entire ocean.",
        status: "paraphrased",
        sourceUrl: "https://en.wikipedia.org/wiki/Ocean_current",
      },
      {
        sentence: "Scientists are concerned that melting ice from the polar regions could disrupt this circulation by adding freshwater that alters the density differences driving it.",
        status: "original",
      },
    ],
    // 0 verbatim, ideas paraphrased → none severity
    overallSeverity: "none",
    sourceUrls: ["https://en.wikipedia.org/wiki/Ocean_current"],
  },

  // ── Original (no identifiable source) ─────────────────────────────────────

  {
    id: "09-original-indoor-plants",
    title: "Choosing Indoor Plants for Your Space",
    content: [
      "Selecting houseplants can transform a living space, but many first-time plant owners choose based solely on appearance rather than compatibility with their environment.",
      "Before purchasing any plant, assess the natural light levels in your room by observing where sunlight falls throughout the day.",
      "North-facing windows typically receive minimal direct light, making them suitable for shade-tolerant species such as pothos or snake plants.",
      "East and west windows provide moderate indirect light, appropriate for the widest range of common houseplants.",
      "South-facing windows with extended direct sun exposure are ideal for succulents, cacti, and Mediterranean herbs.",
      "Humidity and temperature are equally important considerations that new plant owners often overlook.",
      "Most tropical houseplants prefer consistent warmth above 15°C and struggle near heating vents or draughty windows.",
      "Grouping several plants together creates a microclimate with slightly elevated humidity, which benefits ferns, orchids, and similar moisture-loving species.",
      "Starting with resilient, low-maintenance varieties builds confidence before progressing to more demanding plants.",
    ].join(" "),
    sentences: [
      { sentence: "Selecting houseplants can transform a living space, but many first-time plant owners choose based solely on appearance rather than compatibility with their environment.", status: "original" },
      { sentence: "Before purchasing any plant, assess the natural light levels in your room by observing where sunlight falls throughout the day.", status: "original" },
      { sentence: "North-facing windows typically receive minimal direct light, making them suitable for shade-tolerant species such as pothos or snake plants.", status: "original" },
      { sentence: "East and west windows provide moderate indirect light, appropriate for the widest range of common houseplants.", status: "original" },
      { sentence: "South-facing windows with extended direct sun exposure are ideal for succulents, cacti, and Mediterranean herbs.", status: "original" },
      { sentence: "Humidity and temperature are equally important considerations that new plant owners often overlook.", status: "original" },
      { sentence: "Most tropical houseplants prefer consistent warmth above 15°C and struggle near heating vents or draughty windows.", status: "original" },
      { sentence: "Grouping several plants together creates a microclimate with slightly elevated humidity, which benefits ferns, orchids, and similar moisture-loving species.", status: "original" },
      { sentence: "Starting with resilient, low-maintenance varieties builds confidence before progressing to more demanding plants.", status: "original" },
    ],
    overallSeverity: "none",
    sourceUrls: [],
  },

  {
    id: "10-original-meeting-agendas",
    title: "Writing Meeting Agendas That People Actually Follow",
    content: [
      "A meeting without a clear agenda is little more than an expensive conversation.",
      "Yet most professionals spend their careers attending meetings that lack structure, wandering from topic to topic without resolution.",
      "The most effective agendas share three characteristics: they specify a desired outcome for each item, they allocate realistic time blocks, and they identify who is responsible for leading each section.",
      "Distributing the agenda at least 24 hours in advance allows participants to prepare meaningfully rather than react in real time.",
      "Agenda items should be framed as questions rather than topics — 'Should we change the product launch date?' generates focused discussion in a way that 'Product launch' never will.",
      "Time-boxing each item, even if the estimate proves wrong, creates accountability and signals that the organiser values participants' time.",
      "Ending every meeting with a documented list of decisions made and next actions assigned transforms discussions into durable commitments.",
      "Organisations that take agendas seriously consistently report shorter meetings, higher participation, and better follow-through.",
    ].join(" "),
    sentences: [
      { sentence: "A meeting without a clear agenda is little more than an expensive conversation.", status: "original" },
      { sentence: "Yet most professionals spend their careers attending meetings that lack structure, wandering from topic to topic without resolution.", status: "original" },
      { sentence: "The most effective agendas share three characteristics: they specify a desired outcome for each item, they allocate realistic time blocks, and they identify who is responsible for leading each section.", status: "original" },
      { sentence: "Distributing the agenda at least 24 hours in advance allows participants to prepare meaningfully rather than react in real time.", status: "original" },
      { sentence: "Agenda items should be framed as questions rather than topics — 'Should we change the product launch date?' generates focused discussion in a way that 'Product launch' never will.", status: "original" },
      { sentence: "Time-boxing each item, even if the estimate proves wrong, creates accountability and signals that the organiser values participants' time.", status: "original" },
      { sentence: "Ending every meeting with a documented list of decisions made and next actions assigned transforms discussions into durable commitments.", status: "original" },
      { sentence: "Organisations that take agendas seriously consistently report shorter meetings, higher participation, and better follow-through.", status: "original" },
    ],
    overallSeverity: "none",
    sourceUrls: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  Extension: Hebrew cases + non-Wikipedia English sources
  //  Tests whether both engines handle:
  //    - Hebrew (RTL, different alphabet, less Copyscape coverage?)
  //    - Smaller/non-Wikipedia indexed sources (Britannica, ScienceDaily, IDI)
  //  Note: Direct .co.il news fetches (ynet, mako, calcalist, themarker) failed
  //  via WebFetch (403/404). IDI (idi.org.il) and he.wikipedia.org used instead.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Hebrew: heavy plagiarism from Hebrew Wikipedia ────────────────────────

  {
    id: "11-heavy-hebrew-wiki-ai",
    title: "בינה מלאכותית: מהפכה טכנולוגית (he)",
    content: [
      "בינה מלאכותית (באנגלית: Artificial Intelligence; בקיצור: AI) היא יכולתן של מערכות טכנולוגיות ומחשבים לדמות היבטים של תבונה אנושית, ובכלל זה למידה, הסקת מסקנות, פתרון בעיות ותפיסה חזותית או לשונית.",
      "מדובר בתחום מרתק שצמח בקצב חסר תקדים בעשור האחרון.",
      "בניגוד לתוכנות מחשב מסורתיות הפועלות לפי סדרת הוראות קבועה מראש, מערכות בינה מלאכותית מבוססות על אלגוריתמים המסוגלים לזהות דפוסים בתוך כמויות אדירות של נתונים, להסתגל למצבים משתנים ולבצע משימות המצריכות יכולת ניתוח מורכבת ושיקול דעת.",
      "היישומים של הטכנולוגיה מגיעים עד לתוך כל תחומי החיים המודרניים.",
      "בעשורים הראשונים של המאה ה-21 הפכה הבינה המלאכותית לאחת הטכנולוגיות המעצבות ביותר של האנושות.",
      "היא נחשבת לטכנולוגיה רב-תכליתית, בדומה למנוע הקיטור או לחשמל, המהווה תשתית לשינויים עמוקים בכלכלה, בתרבות ובחברה.",
      "חברות רבות משקיעות סכומי עתק במחקר ופיתוח של מערכות מבוססות בינה מלאכותית.",
      "לצד השפעתה האזרחית, הבינה המלאכותית מהווה מוקד מרכזי במאבק על עוצמה גאופוליטית.",
    ].join(" "),
    sentences: [
      {
        sentence: "בינה מלאכותית (באנגלית: Artificial Intelligence; בקיצור: AI) היא יכולתן של מערכות טכנולוגיות ומחשבים לדמות היבטים של תבונה אנושית, ובכלל זה למידה, הסקת מסקנות, פתרון בעיות ותפיסה חזותית או לשונית.",
        status: "verbatim",
        sourceUrl: "https://he.wikipedia.org/wiki/בינה_מלאכותית",
      },
      { sentence: "מדובר בתחום מרתק שצמח בקצב חסר תקדים בעשור האחרון.", status: "original" },
      {
        sentence: "בניגוד לתוכנות מחשב מסורתיות הפועלות לפי סדרת הוראות קבועה מראש, מערכות בינה מלאכותית מבוססות על אלגוריתמים המסוגלים לזהות דפוסים בתוך כמויות אדירות של נתונים, להסתגל למצבים משתנים ולבצע משימות המצריכות יכולת ניתוח מורכבת ושיקול דעת.",
        status: "verbatim",
        sourceUrl: "https://he.wikipedia.org/wiki/בינה_מלאכותית",
      },
      { sentence: "היישומים של הטכנולוגיה מגיעים עד לתוך כל תחומי החיים המודרניים.", status: "original" },
      {
        sentence: "בעשורים הראשונים של המאה ה-21 הפכה הבינה המלאכותית לאחת הטכנולוגיות המעצבות ביותר של האנושות.",
        status: "verbatim",
        sourceUrl: "https://he.wikipedia.org/wiki/בינה_מלאכותית",
      },
      {
        sentence: "היא נחשבת לטכנולוגיה רב-תכליתית, בדומה למנוע הקיטור או לחשמל, המהווה תשתית לשינויים עמוקים בכלכלה, בתרבות ובחברה.",
        status: "verbatim",
        sourceUrl: "https://he.wikipedia.org/wiki/בינה_מלאכותית",
      },
      { sentence: "חברות רבות משקיעות סכומי עתק במחקר ופיתוח של מערכות מבוססות בינה מלאכותית.", status: "original" },
      {
        sentence: "לצד השפעתה האזרחית, הבינה המלאכותית מהווה מוקד מרכזי במאבק על עוצמה גאופוליטית.",
        status: "verbatim",
        sourceUrl: "https://he.wikipedia.org/wiki/בינה_מלאכותית",
      },
    ],
    // 5 verbatim / 8 total = 62.5% → heavy
    overallSeverity: "heavy",
    sourceUrls: ["https://he.wikipedia.org/wiki/בינה_מלאכותית"],
  },

  // ── Hebrew: heavy plagiarism from Israeli policy site (.org.il) ──────────

  {
    id: "12-heavy-hebrew-idi-policy",
    title: "על מעונות היום והתעסוקה החרדית (he, idi.org.il)",
    content: [
      "בשבוע שעבר הטיל שר האוצר אביגדור ליברמן פצצה כשהתנה את התמיכה במעונות היום בעבודת הגבר.",
      "המטרה ברורה - להביא לעלייה בשיעור הגברים החרדים הפונים להכשרה מקצועית ואקדמית ולתעסוקה.",
      "זהו מהלך שמעורר ויכוח ציבורי נרחב בימים האחרונים.",
      "אין ספק, מדובר בהחלטה קשה, אך גם מתבקשת.",
      "זום-אאוט על המספרים מהעשור האחרון מספר את הסיפור כולו.",
      "חשוב להבחין בין הרטוריקה הפוליטית סביב המהלך לבין ההשפעה הכלכלית בפועל על משפחות.",
      "בחינה של הנתונים ההיסטוריים מעלה תמונה מורכבת שאינה חד-משמעית.",
    ].join(" "),
    sentences: [
      {
        sentence: "בשבוע שעבר הטיל שר האוצר אביגדור ליברמן פצצה כשהתנה את התמיכה במעונות היום בעבודת הגבר.",
        status: "verbatim",
        sourceUrl: "https://www.idi.org.il/articles/36066",
      },
      {
        sentence: "המטרה ברורה - להביא לעלייה בשיעור הגברים החרדים הפונים להכשרה מקצועית ואקדמית ולתעסוקה.",
        status: "verbatim",
        sourceUrl: "https://www.idi.org.il/articles/36066",
      },
      { sentence: "זהו מהלך שמעורר ויכוח ציבורי נרחב בימים האחרונים.", status: "original" },
      {
        sentence: "אין ספק, מדובר בהחלטה קשה, אך גם מתבקשת.",
        status: "verbatim",
        sourceUrl: "https://www.idi.org.il/articles/36066",
      },
      {
        sentence: "זום-אאוט על המספרים מהעשור האחרון מספר את הסיפור כולו.",
        status: "verbatim",
        sourceUrl: "https://www.idi.org.il/articles/36066",
      },
      { sentence: "חשוב להבחין בין הרטוריקה הפוליטית סביב המהלך לבין ההשפעה הכלכלית בפועל על משפחות.", status: "original" },
      { sentence: "בחינה של הנתונים ההיסטוריים מעלה תמונה מורכבת שאינה חד-משמעית.", status: "original" },
    ],
    // 4 verbatim / 7 total = 57.1% → heavy
    overallSeverity: "heavy",
    sourceUrls: ["https://www.idi.org.il/articles/36066"],
  },

  // ── Hebrew: light plagiarism from idi.org.il ─────────────────────────────

  {
    id: "13-light-hebrew-idi",
    title: "על שינויים כלכליים במדיניות החרדית (he, idi.org.il)",
    content: [
      "המדיניות הכלכלית של ישראל כלפי המגזר החרדי היא נושא רגיש שמעסיק דורות של מקבלי החלטות.",
      "שינויים תכופים בתקציבים, בקצבאות ובתמריצים מעצבים את כלכלת המשפחות החרדיות.",
      "בחינה של הנתונים מגלה כי בין השנים 2015-2013, עת היה נתניהו ראש ממשלה ולפיד שר האוצר (והחרדים באופוזיציה), נעשו כמה קיצוצים בתמיכה הכלכלית שניתנה לחברה החרדית, שנועדו להביא לכניסת גברים חרדים לתעסוקה.",
      "התוצאות של אותה מדיניות נמדדות עד היום על ידי כלכלנים ואנשי מדיניות.",
      "שינוי התנהגות דורש זמן רב, ולעיתים תוצאות של רפורמות מופיעות רק לאחר עשור.",
      "הדיון הציבורי ממשיך להיות טעון ורגשי, גם כאשר הנתונים עצמם יחסית ברורים.",
    ].join(" "),
    sentences: [
      { sentence: "המדיניות הכלכלית של ישראל כלפי המגזר החרדי היא נושא רגיש שמעסיק דורות של מקבלי החלטות.", status: "original" },
      { sentence: "שינויים תכופים בתקציבים, בקצבאות ובתמריצים מעצבים את כלכלת המשפחות החרדיות.", status: "original" },
      {
        sentence: "בחינה של הנתונים מגלה כי בין השנים 2015-2013, עת היה נתניהו ראש ממשלה ולפיד שר האוצר (והחרדים באופוזיציה), נעשו כמה קיצוצים בתמיכה הכלכלית שניתנה לחברה החרדית, שנועדו להביא לכניסת גברים חרדים לתעסוקה.",
        status: "near-verbatim",
        sourceUrl: "https://www.idi.org.il/articles/36066",
      },
      { sentence: "התוצאות של אותה מדיניות נמדדות עד היום על ידי כלכלנים ואנשי מדיניות.", status: "original" },
      { sentence: "שינוי התנהגות דורש זמן רב, ולעיתים תוצאות של רפורמות מופיעות רק לאחר עשור.", status: "original" },
      { sentence: "הדיון הציבורי ממשיך להיות טעון ורגשי, גם כאשר הנתונים עצמם יחסית ברורים.", status: "original" },
    ],
    // 1 near-verbatim / 6 total → light
    overallSeverity: "light",
    sourceUrls: ["https://www.idi.org.il/articles/36066"],
  },

  // ── Hebrew: original (false-positive test) ────────────────────────────────

  {
    id: "14-original-hebrew",
    title: "טיפים לבישול בייתי (he, original)",
    content: [
      "בישול ביתי הוא יותר מדרך להכין אוכל - הוא דרך חיים ודרך להכיר את עצמך.",
      "לפני שמתחילים להשקיע בסירים יקרים ובמכשירים מתקדמים, כדאי לבחון אילו כלים באמת חסרים במטבח.",
      "סכין חדה ואיכותית היא השקעה משתלמת ששווה יותר מכל מכשיר חשמלי מתוחכם.",
      "טעם של תבלינים טריים שונה לחלוטין מטעם של אלה ששוכבים במזווה שנה.",
      "כדאי לקנות תבלינים בכמויות קטנות ולטחון לפי הצורך, במיוחד פלפל שחור וכמון.",
      "הטעם של מזון מושפע מאיכות החומרים לא פחות מאשר מהטכניקה, ולעיתים אף יותר.",
      "אחד הסודות הגדולים של בישול טעים הוא סבלנות - לתת לבצל להשחים לאט ולא לדחוק את התהליך.",
    ].join(" "),
    sentences: [
      { sentence: "בישול ביתי הוא יותר מדרך להכין אוכל - הוא דרך חיים ודרך להכיר את עצמך.", status: "original" },
      { sentence: "לפני שמתחילים להשקיע בסירים יקרים ובמכשירים מתקדמים, כדאי לבחון אילו כלים באמת חסרים במטבח.", status: "original" },
      { sentence: "סכין חדה ואיכותית היא השקעה משתלמת ששווה יותר מכל מכשיר חשמלי מתוחכם.", status: "original" },
      { sentence: "טעם של תבלינים טריים שונה לחלוטין מטעם של אלה ששוכבים במזווה שנה.", status: "original" },
      { sentence: "כדאי לקנות תבלינים בכמויות קטנות ולטחון לפי הצורך, במיוחד פלפל שחור וכמון.", status: "original" },
      { sentence: "הטעם של מזון מושפע מאיכות החומרים לא פחות מאשר מהטכניקה, ולעיתים אף יותר.", status: "original" },
      { sentence: "אחד הסודות הגדולים של בישול טעים הוא סבלנות - לתת לבצל להשחים לאט ולא לדחוק את התהליך.", status: "original" },
    ],
    overallSeverity: "none",
    sourceUrls: [],
  },

  // ── English: heavy plagiarism from Britannica (non-Wikipedia) ────────────

  {
    id: "15-heavy-britannica-photosynthesis",
    title: "The Miracle of Photosynthesis (Britannica source)",
    content: [
      "Photosynthesis, the process by which green plants and certain other organisms transform light energy into chemical energy.",
      "This process has powered life on our planet for billions of years.",
      "During photosynthesis in green plants, light energy is captured and used to convert water, carbon dioxide, and minerals into oxygen and energy-rich organic compounds.",
      "Scientists continue to uncover new details about the molecular choreography involved.",
      "It would be impossible to overestimate the importance of photosynthesis in the maintenance of life on Earth.",
      "The Great Oxidation Event, which began about 2.4 billion years ago and was largely driven by the photosynthetic cyanobacteria, raised atmospheric oxygen to nearly 1 percent of present levels over a span of 600 million years, paving the way for the evolution of most forms of multicellular life.",
      "Without that single biochemical innovation, complex animal life would never have emerged.",
      "Photosynthesis completely transformed Earth's environment and biosphere.",
    ].join(" "),
    sentences: [
      {
        sentence: "Photosynthesis, the process by which green plants and certain other organisms transform light energy into chemical energy.",
        status: "verbatim",
        sourceUrl: "https://www.britannica.com/science/photosynthesis",
      },
      { sentence: "This process has powered life on our planet for billions of years.", status: "original" },
      {
        sentence: "During photosynthesis in green plants, light energy is captured and used to convert water, carbon dioxide, and minerals into oxygen and energy-rich organic compounds.",
        status: "verbatim",
        sourceUrl: "https://www.britannica.com/science/photosynthesis",
      },
      { sentence: "Scientists continue to uncover new details about the molecular choreography involved.", status: "original" },
      {
        sentence: "It would be impossible to overestimate the importance of photosynthesis in the maintenance of life on Earth.",
        status: "verbatim",
        sourceUrl: "https://www.britannica.com/science/photosynthesis",
      },
      {
        sentence: "The Great Oxidation Event, which began about 2.4 billion years ago and was largely driven by the photosynthetic cyanobacteria, raised atmospheric oxygen to nearly 1 percent of present levels over a span of 600 million years, paving the way for the evolution of most forms of multicellular life.",
        status: "verbatim",
        sourceUrl: "https://www.britannica.com/science/photosynthesis",
      },
      { sentence: "Without that single biochemical innovation, complex animal life would never have emerged.", status: "original" },
      {
        sentence: "Photosynthesis completely transformed Earth's environment and biosphere.",
        status: "verbatim",
        sourceUrl: "https://www.britannica.com/science/photosynthesis",
      },
    ],
    // 5 verbatim / 8 total = 62.5% → heavy
    overallSeverity: "heavy",
    sourceUrls: ["https://www.britannica.com/science/photosynthesis"],
  },

  // ── English: heavy plagiarism from ScienceDaily (non-Wikipedia) ──────────

  {
    id: "16-heavy-sciencedaily-ocean",
    title: "Understanding Ocean Currents (ScienceDaily source)",
    content: [
      "An ocean current is any more or less permanent or continuous, directed movement of ocean water that flows in one of the Earth's oceans.",
      "Oceanographers have studied these movements for over a century, yet many mysteries remain.",
      "The currents are generated from the forces acting upon the water like the earth's rotation, the wind, the temperature and salinity differences and the gravitation of the moon.",
      "These forces interact in complex ways across vast distances and multiple depths.",
      "The depth contours, the shoreline and other currents influence the current's direction and strength.",
      "Ocean currents can flow for thousands of kilometers.",
      "They are very important in determining the climates of the continents, especially those regions bordering on the ocean.",
      "Disruption to these flows, such as that caused by melting polar ice, would have global consequences.",
    ].join(" "),
    sentences: [
      {
        sentence: "An ocean current is any more or less permanent or continuous, directed movement of ocean water that flows in one of the Earth's oceans.",
        status: "verbatim",
        sourceUrl: "https://www.sciencedaily.com/terms/ocean_current.htm",
      },
      { sentence: "Oceanographers have studied these movements for over a century, yet many mysteries remain.", status: "original" },
      {
        sentence: "The currents are generated from the forces acting upon the water like the earth's rotation, the wind, the temperature and salinity differences and the gravitation of the moon.",
        status: "verbatim",
        sourceUrl: "https://www.sciencedaily.com/terms/ocean_current.htm",
      },
      { sentence: "These forces interact in complex ways across vast distances and multiple depths.", status: "original" },
      {
        sentence: "The depth contours, the shoreline and other currents influence the current's direction and strength.",
        status: "verbatim",
        sourceUrl: "https://www.sciencedaily.com/terms/ocean_current.htm",
      },
      {
        sentence: "Ocean currents can flow for thousands of kilometers.",
        status: "verbatim",
        sourceUrl: "https://www.sciencedaily.com/terms/ocean_current.htm",
      },
      {
        sentence: "They are very important in determining the climates of the continents, especially those regions bordering on the ocean.",
        status: "verbatim",
        sourceUrl: "https://www.sciencedaily.com/terms/ocean_current.htm",
      },
      { sentence: "Disruption to these flows, such as that caused by melting polar ice, would have global consequences.", status: "original" },
    ],
    // 5 verbatim / 8 total = 62.5% → heavy
    overallSeverity: "heavy",
    sourceUrls: ["https://www.sciencedaily.com/terms/ocean_current.htm"],
  },
];

// ── Derived stats (sanity check) ──────────────────────────────────────────────

export function corpusStats() {
  const counts = { heavy: 0, light: 0, none: 0 };
  for (const c of CORPUS) counts[c.overallSeverity]++;
  return {
    total: CORPUS.length,
    heavy: counts.heavy,    // target: 3
    light: counts.light,    // target: 3
    paraphrasedOrOriginal: counts.none, // target: 4 (2 paraphrased + 2 original)
  };
}
