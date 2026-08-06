/**
 * SynAnt (Synonym/Antonym) Puzzle Engine
 * Word bank with synonyms, antonyms, and unrelated words
 * LCG-based deterministic question generation
 */

// ─── LCG Random Number Generator ───
function createRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ─── Word Bank ───
const WORD_BANK = [
  // Difficulty 1
  {
    word: "happy",
    definition: "feeling pleasure or contentment",
    example: "She was happy when she got a gift.",
    synonyms: ["glad", "joyful", "pleased", "cheerful", "elated"],
    antonyms: ["sad", "miserable", "gloomy", "unhappy", "dejected"],
    unrelated: ["running", "table", "pencil", "heavy", "circle"],
    difficulty: 1
  },
  {
    word: "big",
    definition: "of considerable size or extent",
    example: "The elephant is a big animal.",
    synonyms: ["large", "huge", "enormous", "giant", "vast"],
    antonyms: ["small", "tiny", "little", "miniature", "petite"],
    unrelated: ["green", "sing", "paper", "cold", "walk"],
    difficulty: 1
  },
  {
    word: "fast",
    definition: "moving or capable of moving at high speed",
    example: "The cheetah is a fast runner.",
    synonyms: ["quick", "rapid", "swift", "speedy", "hasty"],
    antonyms: ["slow", "sluggish", "gradual", "leisurely", "dawdling"],
    unrelated: ["book", "blue", "laugh", "sharp", "tree"],
    difficulty: 1
  },
  {
    word: "good",
    definition: "of high quality or satisfactory standard",
    example: "This is a good meal.",
    synonyms: ["great", "fine", "excellent", "wonderful", "superb"],
    antonyms: ["bad", "poor", "awful", "terrible", "inferior"],
    unrelated: ["chair", "red", "jump", "smooth", "river"],
    difficulty: 1
  },
  {
    word: "hot",
    definition: "having a high temperature",
    example: "The coffee is too hot to drink.",
    synonyms: ["warm", "heated", "burning", "scorching", "boiling"],
    antonyms: ["cold", "cool", "chilly", "freezing", "icy"],
    unrelated: ["window", "sing", "square", "soft", "dance"],
    difficulty: 1
  },
  {
    word: "new",
    definition: "recently made or obtained",
    example: "I bought a new phone yesterday.",
    synonyms: ["fresh", "recent", "modern", "current", "latest"],
    antonyms: ["old", "ancient", "outdated", "aged", "vintage"],
    unrelated: ["purple", "sleep", "rough", "mountain", "eat"],
    difficulty: 1
  },
  {
    word: "clean",
    definition: "free from dirt or marks",
    example: "Keep your room clean.",
    synonyms: ["spotless", "pure", "tidy", "neat", "pristine"],
    antonyms: ["dirty", "filthy", "messy", "soiled", "grimy"],
    unrelated: ["yellow", "fly", "hard", "ocean", "think"],
    difficulty: 1
  },
  {
    word: "strong",
    definition: "having physical power or force",
    example: "He is strong enough to lift that box.",
    synonyms: ["powerful", "mighty", "robust", "sturdy", "tough"],
    antonyms: ["weak", "feeble", "frail", "fragile", "delicate"],
    unrelated: ["orange", "read", "triangle", "quiet", "swim"],
    difficulty: 1
  },
  {
    word: "loud",
    definition: "producing much noise",
    example: "The music is too loud.",
    synonyms: ["noisy", "deafening", "thunderous", "booming", "roaring"],
    antonyms: ["quiet", "silent", "soft", "hushed", "muted"],
    unrelated: ["pink", "write", "circle", "sweet", "run"],
    difficulty: 1
  },
  {
    word: "bright",
    definition: "giving out or reflecting much light",
    example: "The sun is bright today.",
    synonyms: ["shining", "radiant", "luminous", "brilliant", "gleaming"],
    antonyms: ["dark", "dim", "dull", "gloomy", "shadowy"],
    unrelated: ["banana", "dance", "star", "rough", "smell"],
    difficulty: 1
  },
  {
    word: "easy",
    definition: "achieved without great effort",
    example: "This puzzle is easy to solve.",
    synonyms: ["simple", "effortless", "straightforward", "basic", "uncomplicated"],
    antonyms: ["hard", "difficult", "complex", "challenging", "tough"],
    unrelated: ["cloud", "whisper", "square", "bitter", "climb"],
    difficulty: 1
  },
  {
    word: "rich",
    definition: "having a great deal of money or assets",
    example: "He is a rich businessman.",
    synonyms: ["wealthy", "affluent", "prosperous", "opulent", "moneyed"],
    antonyms: ["poor", "needy", "impoverished", "destitute", "penniless"],
    unrelated: ["forest", "laugh", "triangle", "sour", "paint"],
    difficulty: 1
  },
  {
    word: "tall",
    definition: "of great or more than average height",
    example: "The giraffe is a tall animal.",
    synonyms: ["high", "towering", "lofty", "elevated", "giant"],
    antonyms: ["short", "low", "small", "petite", "diminutive"],
    unrelated: ["desert", "sing", "circle", "spicy", "drive"],
    difficulty: 1
  },
  {
    word: "smart",
    definition: "having or showing intelligence",
    example: "She is a smart student.",
    synonyms: ["intelligent", "clever", "bright", "wise", "brilliant"],
    antonyms: ["dumb", "stupid", "foolish", "ignorant", "unintelligent"],
    unrelated: ["valley", "cry", "rectangle", "salty", "build"],
    difficulty: 1
  },
  {
    word: "full",
    definition: "containing as much as possible",
    example: "The glass is full of water.",
    synonyms: ["filled", "packed", "loaded", "brimming", "stuffed"],
    antonyms: ["empty", "vacant", "hollow", "bare", "void"],
    unrelated: ["island", "shout", "oval", "bland", "cook"],
    difficulty: 1
  },

  // Difficulty 2
  {
    word: "brave",
    definition: "ready to face danger or pain without showing fear",
    example: "The firefighter was brave during the rescue.",
    synonyms: ["courageous", "fearless", "bold", "valiant", "heroic"],
    antonyms: ["cowardly", "timid", "fearful", "afraid", "scared"],
    unrelated: ["keyboard", "mirror", "laugh", "spicy", "wooden"],
    difficulty: 2
  },
  {
    word: "ancient",
    definition: "belonging to the very distant past",
    example: "The pyramids are ancient structures.",
    synonyms: ["old", "aged", "archaic", "antique", "historic"],
    antonyms: ["modern", "new", "recent", "contemporary", "current"],
    unrelated: ["bicycle", "whistle", "jump", "sour", "plastic"],
    difficulty: 2
  },
  {
    word: "common",
    definition: "occurring frequently or widespread",
    example: "Colds are common in winter.",
    synonyms: ["frequent", "usual", "ordinary", "typical", "regular"],
    antonyms: ["rare", "unusual", "uncommon", "scarce", "unique"],
    unrelated: ["guitar", "thunder", "swim", "bitter", "metal"],
    difficulty: 2
  },
  {
    word: "cruel",
    definition: "willfully causing pain or suffering",
    example: "It is cruel to hurt animals.",
    synonyms: ["harsh", "brutal", "savage", "vicious", "merciless"],
    antonyms: ["kind", "gentle", "compassionate", "merciful", "humane"],
    unrelated: ["telescope", "breeze", "climb", "tangy", "fabric"],
    difficulty: 2
  },
  {
    word: "calm",
    definition: "not showing or feeling nervousness or anger",
    example: "She remained calm during the storm.",
    synonyms: ["peaceful", "serene", "tranquil", "relaxed", "composed"],
    antonyms: ["agitated", "anxious", "nervous", "tense", "troubled"],
    unrelated: ["hammer", "whisper", "crawl", "savory", "ceramic"],
    difficulty: 2
  },
  {
    word: "dense",
    definition: "closely compacted in substance",
    example: "The forest was dense with trees.",
    synonyms: ["thick", "compact", "solid", "heavy", "concentrated"],
    antonyms: ["sparse", "thin", "light", "scattered", "loose"],
    unrelated: ["camera", "echo", "float", "sweet", "cotton"],
    difficulty: 2
  },
  {
    word: "fierce",
    definition: "having a violent or aggressive nature",
    example: "The lion is a fierce predator.",
    synonyms: ["ferocious", "savage", "wild", "aggressive", "intense"],
    antonyms: ["gentle", "mild", "tame", "docile", "peaceful"],
    unrelated: ["notebook", "murmur", "slide", "bland", "rubber"],
    difficulty: 2
  },
  {
    word: "generous",
    definition: "showing a readiness to give more than necessary",
    example: "He is generous with his time.",
    synonyms: ["kind", "charitable", "giving", "liberal", "magnanimous"],
    antonyms: ["selfish", "stingy", "greedy", "mean", "miserly"],
    unrelated: ["compass", "rustle", "spin", "tart", "leather"],
    difficulty: 2
  },
  {
    word: "humble",
    definition: "having a modest view of one's importance",
    example: "Despite his success, he remained humble.",
    synonyms: ["modest", "meek", "unassuming", "unpretentious", "lowly"],
    antonyms: ["arrogant", "proud", "boastful", "conceited", "haughty"],
    unrelated: ["calendar", "crackle", "twist", "zesty", "silk"],
    difficulty: 2
  },
  {
    word: "narrow",
    definition: "of small width in relation to length",
    example: "The path was narrow and winding.",
    synonyms: ["thin", "slender", "tight", "confined", "cramped"],
    antonyms: ["wide", "broad", "spacious", "expansive", "roomy"],
    unrelated: ["envelope", "hiss", "bounce", "pungent", "velvet"],
    difficulty: 2
  },
  {
    word: "rough",
    definition: "having an uneven or irregular surface",
    example: "The bark of the tree is rough.",
    synonyms: ["coarse", "uneven", "jagged", "rugged", "bumpy"],
    antonyms: ["smooth", "even", "polished", "flat", "sleek"],
    unrelated: ["microscope", "jingle", "roll", "mild", "wool"],
    difficulty: 2
  },
  {
    word: "shallow",
    definition: "of little depth",
    example: "The pool is shallow at this end.",
    synonyms: ["superficial", "skin-deep", "cursory", "surface", "slight"],
    antonyms: ["deep", "profound", "bottomless", "thorough", "intense"],
    unrelated: ["telescope", "chime", "sway", "spicy", "denim"],
    difficulty: 2
  },
  {
    word: "timid",
    definition: "showing a lack of courage or confidence",
    example: "The timid mouse hid in the corner.",
    synonyms: ["shy", "fearful", "nervous", "hesitant", "bashful"],
    antonyms: ["bold", "confident", "daring", "fearless", "assertive"],
    unrelated: ["barometer", "clatter", "wobble", "savory", "fleece"],
    difficulty: 2
  },
  {
    word: "visible",
    definition: "able to be seen",
    example: "The stars are visible on a clear night.",
    synonyms: ["apparent", "noticeable", "observable", "evident", "clear"],
    antonyms: ["invisible", "hidden", "obscure", "concealed", "unseen"],
    unrelated: ["pendulum", "rattle", "glide", "tangy", "linen"],
    difficulty: 2
  },
  {
    word: "wild",
    definition: "living in the natural environment",
    example: "Wild animals live in the jungle.",
    synonyms: ["untamed", "feral", "savage", "undomesticated", "natural"],
    antonyms: ["tame", "domesticated", "civilized", "controlled", "trained"],
    unrelated: ["calculator", "splash", "flutter", "bitter", "canvas"],
    difficulty: 2
  },

  // Difficulty 3
  {
    word: "abundant",
    definition: "existing or available in large quantities",
    example: "There was abundant food at the feast.",
    synonyms: ["plentiful", "ample", "copious", "profuse", "bountiful"],
    antonyms: ["scarce", "sparse", "meager", "insufficient", "lacking"],
    unrelated: ["thermometer", "sizzle", "pivot", "acidic", "burlap"],
    difficulty: 3
  },
  {
    word: "cautious",
    definition: "careful to avoid potential problems or dangers",
    example: "Be cautious when crossing the street.",
    synonyms: ["careful", "wary", "prudent", "vigilant", "alert"],
    antonyms: ["reckless", "careless", "rash", "impulsive", "hasty"],
    unrelated: ["chronometer", "crunch", "revolve", "piquant", "muslin"],
    difficulty: 3
  },
  {
    word: "complex",
    definition: "consisting of many interconnected parts",
    example: "The math problem was complex.",
    synonyms: ["complicated", "intricate", "elaborate", "convoluted", "involved"],
    antonyms: ["simple", "easy", "basic", "straightforward", "uncomplicated"],
    unrelated: ["altimeter", "clang", "rotate", "acrid", "tweed"],
    difficulty: 3
  },
  {
    word: "diligent",
    definition: "having or showing care in one's work",
    example: "She is a diligent student.",
    synonyms: ["hardworking", "industrious", "conscientious", "assiduous", "dedicated"],
    antonyms: ["lazy", "careless", "negligent", "idle", "slack"],
    unrelated: ["hygrometer", "thud", "tilt", "astringent", "corduroy"],
    difficulty: 3
  },
  {
    word: "eager",
    definition: "wanting to do something very much",
    example: "The children were eager to play outside.",
    synonyms: ["enthusiastic", "keen", "excited", "avid", "anxious"],
    antonyms: ["reluctant", "unwilling", "hesitant", "indifferent", "apathetic"],
    unrelated: ["odometer", "creak", "whirl", "briny", "chiffon"],
    difficulty: 3
  },
  {
    word: "fragile",
    definition: "easily broken or damaged",
    example: "Handle the glass with care; it is fragile.",
    synonyms: ["delicate", "brittle", "frail", "breakable", "weak"],
    antonyms: ["sturdy", "strong", "durable", "robust", "unbreakable"],
    unrelated: ["seismograph", "pop", "swivel", "brackish", "organza"],
    difficulty: 3
  },
  {
    word: "genuine",
    definition: "truly what it is said to be; authentic",
    example: "This is a genuine diamond.",
    synonyms: ["authentic", "real", "true", "legitimate", "sincere"],
    antonyms: ["fake", "false", "counterfeit", "artificial", "bogus"],
    unrelated: ["anemometer", "snap", "circle", "alkaline", "damask"],
    difficulty: 3
  },
  {
    word: "immense",
    definition: "extremely large or great",
    example: "The universe is immense.",
    synonyms: ["huge", "enormous", "vast", "gigantic", "colossal"],
    antonyms: ["tiny", "small", "minute", "minuscule", "microscopic"],
    unrelated: ["sphygmomanometer", "rustle", "orbit", "caustic", "taffeta"],
    difficulty: 3
  },
  {
    word: "peculiar",
    definition: "strange or odd; unusual",
    example: "He has a peculiar way of speaking.",
    synonyms: ["odd", "strange", "unusual", "bizarre", "weird"],
    antonyms: ["normal", "ordinary", "typical", "common", "conventional"],
    unrelated: ["stethoscope", "hum", "spin", "rancid", "brocade"],
    difficulty: 3
  },
  {
    word: "rigid",
    definition: "unable to bend or be forced out of shape",
    example: "The metal rod is rigid.",
    synonyms: ["stiff", "inflexible", "firm", "hard", "unyielding"],
    antonyms: ["flexible", "pliable", "bendable", "elastic", "soft"],
    unrelated: ["spectrometer", "whistle", "tumble", "fetid", "satin"],
    difficulty: 3
  },
  {
    word: "sincere",
    definition: "free from pretense or deceit; genuine",
    example: "She gave a sincere apology.",
    synonyms: ["genuine", "honest", "truthful", "earnest", "heartfelt"],
    antonyms: ["insincere", "fake", "dishonest", "false", "deceptive"],
    unrelated: ["protractor", "buzz", "flip", "acerbic", "polyester"],
    difficulty: 3
  },
  {
    word: "tranquil",
    definition: "free from disturbance; calm",
    example: "The lake was tranquil in the morning.",
    synonyms: ["calm", "peaceful", "serene", "quiet", "still"],
    antonyms: ["turbulent", "chaotic", "disturbed", "agitated", "restless"],
    unrelated: ["sextant", "chirp", "dart", "putrid", "rayon"],
    difficulty: 3
  },
  {
    word: "vivid",
    definition: "producing powerful feelings or strong, clear images",
    example: "She had a vivid dream last night.",
    synonyms: ["bright", "striking", "intense", "brilliant", "graphic"],
    antonyms: ["dull", "faded", "dim", "pale", "vague"],
    unrelated: ["theodolite", "purr", "soar", "malodorous", "nylon"],
    difficulty: 3
  },
  {
    word: "zealous",
    definition: "having great energy or enthusiasm",
    example: "He is a zealous supporter of the team.",
    synonyms: ["enthusiastic", "fervent", "passionate", "eager", "ardent"],
    antonyms: ["apathetic", "indifferent", "unenthusiastic", "lukewarm", "dispassionate"],
    unrelated: ["astrolabe", "screech", "plunge", "noxious", "acrylic"],
    difficulty: 3
  },
  {
    word: "obsolete",
    definition: "no longer produced or used; out of date",
    example: "Typewriters are now obsolete.",
    synonyms: ["outdated", "antiquated", "archaic", "defunct", "outmoded"],
    antonyms: ["modern", "current", "new", "contemporary", "updated"],
    unrelated: ["clinometer", "clank", "descend", "rancorous", "spandex"],
    difficulty: 3
  },

  // Difficulty 4
  {
    word: "benevolent",
    definition: "well-meaning and kindly",
    example: "The benevolent king helped the poor.",
    synonyms: ["kind", "charitable", "compassionate", "generous", "altruistic"],
    antonyms: ["malevolent", "cruel", "mean", "unkind", "selfish"],
    unrelated: ["spectroscope", "clatter", "ascend", "virulent", "elastane"],
    difficulty: 4
  },
  {
    word: "enigmatic",
    definition: "difficult to interpret or understand; mysterious",
    example: "She gave an enigmatic smile.",
    synonyms: ["mysterious", "puzzling", "cryptic", "perplexing", "inscrutable"],
    antonyms: ["clear", "obvious", "straightforward", "plain", "transparent"],
    unrelated: ["refractometer", "thump", "cascade", "venomous", "lycra"],
    difficulty: 4
  },
  {
    word: "meticulous",
    definition: "showing great attention to detail",
    example: "He is meticulous in his work.",
    synonyms: ["careful", "precise", "thorough", "scrupulous", "fastidious"],
    antonyms: ["careless", "sloppy", "negligent", "haphazard", "slovenly"],
    unrelated: ["calorimeter", "whack", "descend", "toxic", "kevlar"],
    difficulty: 4
  },
  {
    word: "opulent",
    definition: "ostentatiously rich and luxurious",
    example: "The palace was opulent with gold decorations.",
    synonyms: ["luxurious", "lavish", "sumptuous", "wealthy", "affluent"],
    antonyms: ["poor", "modest", "simple", "austere", "humble"],
    unrelated: ["manometer", "crack", "plummet", "pernicious", "aramid"],
    difficulty: 4
  },
  {
    word: "resilient",
    definition: "able to withstand or recover quickly from difficulties",
    example: "She was resilient after the setback.",
    synonyms: ["tough", "strong", "flexible", "adaptable", "hardy"],
    antonyms: ["fragile", "weak", "brittle", "vulnerable", "delicate"],
    unrelated: ["photometer", "bang", "nosedive", "deleterious", "graphene"],
    difficulty: 4
  },
  {
    word: "tenacious",
    definition: "holding firmly; persistent",
    example: "He was tenacious in pursuing his goals.",
    synonyms: ["persistent", "determined", "resolute", "steadfast", "dogged"],
    antonyms: ["irresolute", "weak", "yielding", "hesitant", "wavering"],
    unrelated: ["rheometer", "crash", "tumble", "baneful", "nomex"],
    difficulty: 4
  },
  {
    word: "eloquent",
    definition: "fluent or persuasive in speaking or writing",
    example: "The speaker gave an eloquent speech.",
    synonyms: ["articulate", "fluent", "expressive", "persuasive", "silver-tongued"],
    antonyms: ["inarticulate", "tongue-tied", "hesitant", "stammering", "unclear"],
    unrelated: ["viscometer", "slam", "spiral", "nefarious", "teflon"],
    difficulty: 4
  },
  {
    word: "frugal",
    definition: "sparing or economical with resources",
    example: "He is frugal with his money.",
    synonyms: ["economical", "thrifty", "prudent", "sparing", "careful"],
    antonyms: ["wasteful", "extravagant", "lavish", "spendthrift", "prodigal"],
    unrelated: ["tensiometer", "clunk", "loop", "inimical", "mylar"],
    difficulty: 4
  },
  {
    word: "indifferent",
    definition: "having no particular interest or concern",
    example: "He was indifferent to the outcome.",
    synonyms: ["apathetic", "unconcerned", "uninterested", "detached", "aloof"],
    antonyms: ["concerned", "interested", "caring", "enthusiastic", "engaged"],
    unrelated: ["luxmeter", "boom", "coil", "baleful", "carbon"],
    difficulty: 4
  },
  {
    word: "lucid",
    definition: "expressed clearly; easy to understand",
    example: "Her explanation was lucid and concise.",
    synonyms: ["clear", "intelligible", "coherent", "understandable", "plain"],
    antonyms: ["obscure", "confusing", "unclear", "ambiguous", "vague"],
    unrelated: ["pyrometer", "screech", "swirl", "detrimental", "silicon"],
    difficulty: 4
  },
  {
    word: "mundane",
    definition: "lacking interest or excitement; dull",
    example: "His job involves mundane tasks.",
    synonyms: ["ordinary", "routine", "boring", "monotonous", "tedious"],
    antonyms: ["extraordinary", "exciting", "unusual", "fascinating", "remarkable"],
    unrelated: ["radiometer", "squeak", "zigzag", "adverse", "titanium"],
    difficulty: 4
  },
  {
    word: "prudent",
    definition: "acting with care and thought for the future",
    example: "It is prudent to save money.",
    synonyms: ["wise", "sensible", "judicious", "careful", "cautious"],
    antonyms: ["reckless", "foolish", "imprudent", "careless", "rash"],
    unrelated: ["dosimeter", "clang", "meander", "injurious", "aluminum"],
    difficulty: 4
  },
  {
    word: "scrupulous",
    definition: "having moral integrity; very careful and thorough",
    example: "She is scrupulous in her research.",
    synonyms: ["honest", "ethical", "meticulous", "conscientious", "principled"],
    antonyms: ["dishonest", "unscrupulous", "careless", "corrupt", "unprincipled"],
    unrelated: ["actinometer", "whoosh", "undulate", "prejudicial", "magnesium"],
    difficulty: 4
  },
  {
    word: "transient",
    definition: "lasting only for a short time; temporary",
    example: "Fame can be transient.",
    synonyms: ["temporary", "fleeting", "brief", "short-lived", "ephemeral"],
    antonyms: ["permanent", "lasting", "enduring", "eternal", "persistent"],
    unrelated: ["photogoniometer", "swoosh", "oscillate", "malignant", "copper"],
    difficulty: 4
  },
  {
    word: "verbose",
    definition: "using more words than needed",
    example: "The report was verbose and hard to read.",
    synonyms: ["wordy", "long-winded", "rambling", "prolix", "loquacious"],
    antonyms: ["concise", "brief", "succinct", "terse", "laconic"],
    unrelated: ["inclinometer", "fizz", "vibrate", "damaging", "platinum"],
    difficulty: 4
  }
];

// ─── Phase & Difficulty Mapping ───
//
// New interleaved mapping (modes cycle within each tier):
//  Level 1  → Tier 1, Phase 1 (Pair Drag)
//  Level 2  → Tier 1, Phase 2 (Word Sort)
//  Level 3  → Tier 1, Phase 3 (Crossword)
//  Level 4  → Tier 2, Phase 1
//  Level 5  → Tier 2, Phase 2
//  Level 6  → Tier 2, Phase 3
//  Level 7  → Tier 3, Phase 1
//  Level 8  → Tier 3, Phase 2
//  Level 9  → Tier 3, Phase 3
//  Level 10 → Tier 4, Phase 3 (capstone)
function getPhase(level) {
  if (level === 10) return 3; // capstone: hardest Crossword
  const phaseMap = [1, 2, 3, 1, 2, 3, 1, 2, 3];
  return phaseMap[(level - 1) % 3] || 1;
}

function getDifficultyForLevel(level) {
  if (level === 10) return [4]; // capstone always tier 4
  const tier = Math.min(Math.ceil(level / 3), 4);
  return [tier];
}

// ─── Puzzle Generation ───
function getPuzzleForLevel(level, roundIndex) {
  const phase = getPhase(level);
  const difficulties = getDifficultyForLevel(level);

  // Filter word bank by difficulty
  const pool = WORD_BANK.filter(w => difficulties.includes(w.difficulty));
  if (pool.length === 0) return null;

  // LCG seed
  const seed = level * 10000 + roundIndex * 137;
  const rng = createRandom(seed);

  // Pick center word
  const centerIdx = Math.floor(rng() * pool.length);
  const centerWord = pool[centerIdx];

  if (phase === 1) {
    return generatePhase1(level, centerWord, rng);
  } else if (phase === 2) {
    return generatePhase2(level, centerWord, rng);
  } else if (phase === 3) {
    return generatePhase3(level, centerWord, rng);
  }

  return null;
}

function generatePhase1(level, centerWord, rng) {
  // Phase 1 appears at levels 1 (tier 1), 4 (tier 2), 7 (tier 3)
  // Word-count scaling increases with tier.
  let synCount = 2, antCount = 1, unrelCount = 1; // level 1 (tier 1)
  if (level === 4) { synCount = 2; antCount = 2; unrelCount = 2; } // tier 2
  else if (level === 7) { synCount = 3; antCount = 2; unrelCount = 2; } // tier 3

  const pairs = [];
  const allSynonyms = [...centerWord.synonyms];
  const allAntonyms = [...centerWord.antonyms];

  // Shuffle and pick
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const syns = shuffle([...centerWord.synonyms]).slice(0, synCount);
  const ants = shuffle([...centerWord.antonyms]).slice(0, antCount);
  const unrels = shuffle([...centerWord.unrelated]).slice(0, unrelCount);

  syns.forEach(w => pairs.push({ word: centerWord.word, pairedWith: w, relationship: "synonym" }));
  ants.forEach(w => pairs.push({ word: centerWord.word, pairedWith: w, relationship: "antonym" }));
  unrels.forEach(w => pairs.push({ word: centerWord.word, pairedWith: w, relationship: "unrelated" }));

  shuffle(pairs);

  return {
    phase: 1,
    centerWord: centerWord.word,
    definition: centerWord.definition,
    example: centerWord.example,
    pairs,
    allSynonyms,
    allAntonyms
  };
}

function generatePhase2(level, centerWord, rng) {
  // Phase 2 appears at levels 2 (tier 1), 5 (tier 2), 8 (tier 3)
  // Word-count scaling increases with tier.
  let synCount = 2, antCount = 2, unrelCount = 2; // level 2 (tier 1)
  if (level === 5) { synCount = 3; antCount = 2; unrelCount = 3; } // tier 2
  else if (level === 8) { synCount = 3; antCount = 3; unrelCount = 3; } // tier 3

  const words = [];
  const allSynonyms = [...centerWord.synonyms];
  const allAntonyms = [...centerWord.antonyms];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const syns = shuffle([...centerWord.synonyms]).slice(0, synCount);
  const ants = shuffle([...centerWord.antonyms]).slice(0, antCount);
  const unrels = shuffle([...centerWord.unrelated]).slice(0, unrelCount);

  syns.forEach(w => words.push({ word: w, type: "synonym" }));
  ants.forEach(w => words.push({ word: w, type: "antonym" }));
  unrels.forEach(w => words.push({ word: w, type: "unrelated" }));

  shuffle(words);

  return {
    phase: 2,
    centerWord: centerWord.word,
    definition: centerWord.definition,
    example: centerWord.example,
    words,
    allSynonyms,
    allAntonyms
  };
}

function generatePhase3(level, centerWord, rng) {
  // Phase 3 appears at levels 3 (tier 1), 6 (tier 2), 9 (tier 3), 10 (capstone tier 4)
  // Word-count scaling increases with tier.
  let synCount = 2, antCount = 2; // level 3 (tier 1)
  if (level === 6) { synCount = 2; antCount = 3; } // tier 2
  else if (level === 9) { synCount = 3; antCount = 3; } // tier 3
  else if (level === 10) { synCount = 3; antCount = 4; } // capstone tier 4 — max difficulty

  const words = [];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const syns = shuffle([...centerWord.synonyms]).slice(0, synCount);
  const ants = shuffle([...centerWord.antonyms]).slice(0, antCount);

  syns.forEach(w => words.push({
    word: w.toUpperCase(),
    clue: `Synonym of ${centerWord.word.toUpperCase()}`,
    type: "synonym"
  }));
  ants.forEach(w => words.push({
    word: w.toUpperCase(),
    clue: `Antonym of ${centerWord.word.toUpperCase()}`,
    type: "antonym"
  }));

  return {
    phase: 3,
    centerWord: centerWord.word,
    definition: centerWord.definition,
    words
  };
}

module.exports = { getPuzzleForLevel, WORD_BANK };
