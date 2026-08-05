import type { RawPost, LaunchOpportunity, CompetitionData, NarrativeReport, PipelineDiagnostics, RejectedEntity } from './types.js';

// ══════════════════════════════════════════════════════════════════════
// SECTION 1: TEXT PROCESSING
// ══════════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','if','then','else','when','at','by','for',
  'in','on','of','to','from','with','as','is','was','are','were','been','be',
  'have','has','had','do','does','did','will','would','could','should','may',
  'might','shall','can','need','this','that','these','those','i','me','my',
  'we','our','you','your','he','him','his','she','her','it','its','they',
  'them','their','what','which','who','where','when','why','how','all','each',
  'every','both','few','more','most','other','some','such','no','not','only',
  'own','same','so','than','too','very','just','about','above','after','again',
  'also','any','because','before','being','below','between','during','here',
  'into','now','over','out','through','under','up','down','off','once',
  'don','dont','get','got','like','one','two','go','going','know','think',
  'see','come','make','take','give','say','said','put','let','still','even',
  'way','much','back','well','look','first','last','new','right','thing',
  'things','really','yeah','yes','ok','okay','lol','lmao','haha','bro',
  'dude','tbh','ngl','actually','literally','basically','probably','definitely',
]);

const URL_RE = /https?:\/\/[^\s]+/gi;
const EMOJI_RE = /[\u{1F600}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu;
const PUNCT_RE = /[^\p{L}\p{N}\s]/gu;

function normalizeText(text: string): string {
  return text
    .replace(URL_RE, ' ')
    .replace(EMOJI_RE, ' ')
    .replace(PUNCT_RE, ' ')
    .toLowerCase()
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 2: REJECTION LISTS — Things that are NOT meme narratives
// ══════════════════════════════════════════════════════════════════════

const REJECT_COMPANIES = new Set([
  'apple','google','microsoft','amazon','netflix','spotify','tiktok','instagram',
  'youtube','twitter','facebook','snapchat','discord','twitch','reddit','tesla',
  'spacex','openai','anthropic','meta','nvidia','intel','amd','qualcomm',
  'samsung','sony','nintendo','valve','epic','adobe','salesforce','oracle',
  'ibm','cisco','vmware','uber','lyft','airbnb','doordash','shopify',
  'stripe','square','paypal','visa','mastercard','jpmorgan','goldman',
  'boeing','lockheed','northrop','raytheon','caterpillar','deere',
  'roblox','fortnite','minecraft','valorant','apex','pubg','gta',
]);

const REJECT_POLITICIANS = new Set([
  'trump','biden','putin','xi','zelensky','modi','erdogan','bolsonaro',
  'macron','scholz','sunak','meloni','netanyahu','mbs',
  'congress','senate','parliament','kremlin','white house','capitol',
  'democrat','republican','liberal','conservative','election','vote',
  'impeach','senator','governor','president','prime minister','mayor',
]);

const REJECT_FINANCE_WORDS = new Set([
  'stock','bond','etf','hedge fund','portfolio','dividend',
  'earnings','revenue','profit','loss','ipo','merger','acquisition',
  'bankruptcy','debt','interest rate','inflation','gdp','unemployment',
  'federal reserve','treasury','nyse','nasdaq','dow jones',
  'price','market cap','volume','liquidity','fdv','tvl',
  'holders','swaps','transactions','24h change','7d change',
]);

const REJECT_NEWS_WORDS = new Set([
  'war','conflict','invasion','ceasefire','nuclear','missile','bombing',
  'sanctions','tariff','embargo','diplomacy','summit','treaty',
  'earthquake','hurricane','tornado','flood','wildfire','drought',
  'pandemic','outbreak','virus','lockdown','quarantine',
]);

const REJECT_COUNTRIES = new Set([
  'america','united states','usa','uk','britain','england','france',
  'germany','china','japan','russia','india','brazil','mexico',
  'canada','australia','korea','iran','iraq','syria','ukraine',
  'israel','palestine','taiwan','hong kong','singapore',
]);

const REJECT_CRYPTO_GENERIC = new Set([
  'bitcoin','ethereum','solana','blockchain','web3','defi','nft',
  'token','coin','dex','amm','staking','yield','farming','liquidity',
  'pool','swap','bridge','airdrop','gas','gwei','layer 1','layer 2',
]);

const TEMPLATE_PATTERNS: RegExp[] = [
  /\b(trending|trend)\s+(on|in|now|today)\b/i,
  /\brank\s*#?\d/i,
  /\b(top|bottom)\s+(gainers?|losers?|traded|volume|coins?|tokens?|pairs?|boosted)\b/i,
  /\b24\s*h\s*(change|gain|loss|volume|move)\b/i,
  /\b(price|market)\s*(change|move|cap|pair)\b/i,
  /\b(volume|liquidity|fdv|tvl|apy|apr)\b/i,
  /\b(holders?|swaps?|transactions?)\b/i,
  /\bnew\s+(pairs?|listings?|coins?|tokens?)\b/i,
  /\b(boosted|boosting)\b/i,
];

// ══════════════════════════════════════════════════════════════════════
// SECTION 3: MEME CLASSIFIER
// ══════════════════════════════════════════════════════════════════════

type PostClass = 'meme' | 'cultural' | 'rejected';

const HUMOR_WORDS = new Set([
  'lmao','lmfao','rofl','bruh','sheesh','uno reverse','this is fine',
  'caught in 4k','dead','crying','screaming','no way','omg','wtf',
  'based','cringe','sus','imposter','ratio','cope','seethe','mald',
  'bussin','slaps','hits different','rent free','touch grass','goes hard',
]);

const ABSURD_ADJECTIVES = new Set([
  'thicc','thick','buff','chonky','chonk','smol','lil','tiny',
  'giant','massive','enormous','humongous','gigantic','colossal',
  'cursed','blessed','unholy','feral','unhinged',
  'crusty','dusty','musty','crispy','spicy','juicy','soggy',
  'shiny','glowy','sparkly','fuzzy','floofy','derpy',
  'savage','toxic','volatile','radioactive','nuclear',
  'goofy','silly','wacky','bonkers','batty','nuts',
  'galaxy','quantum','cyber','neon','laser','plasma','turbo','mega',
  'ultra','hyper','super','extreme',
]);

const ANIMALS = new Set([
  'cat','dog','frog','duck','bear','panda','penguin','shark','whale',
  'dragon','unicorn','goat','sheep','cow','pig','chicken','turkey',
  'horse','donkey','llama','alpaca','gorilla','monkey','ape',
  'sloth','raccoon','otter','beaver','moose','deer','wolf','fox',
  'lion','tiger','leopard','cheetah','crocodile','alligator','turtle',
  'snake','lizard','gecko','chameleon','dinosaur',
  'pigeon','crow','parrot','owl','eagle','hawk','falcon',
  'hamster','rabbit','bunny','mouse','rat','squirrel',
  'hedgehog','bat','dolphin','seal','walrus','koala','kangaroo',
  'platypus','lemur',
]);

const MEME_ROLES = new Set([
  'ceo','cto','cfo','vp','president','director','manager','intern',
  'founder','inventor','creator','overlord','ruler','king',
  'queen','prince','princess','duke','lord','sir',
  'warrior','knight','wizard','witch','mage','necromancer',
  'pirate','viking','samurai','spartan','gladiator',
  'chef','baker','barista','janitor','bouncer',
  'influencer','streamer','youtuber','tiktoker','memer','redditor',
  'chad','virgin','karen',
]);

const PERSON_PREFIXES = new Set([
  'daddy','mommy','big','little','lil','old','young','tiny','baby',
  'grandpa','grandma','uncle','auntie','cousin',
  'mr','mrs','miss','dr','prof','captain','general',
  'king','queen','lord','sir','prince','princess',
]);

const FUNNY_OBJECTS = new Set([
  'toilet','plunger','spork','nugget','cheese','pizza','taco','burrito',
  'sushi','donut','bagel','waffle','pancake',
  'sofa','couch','refrigerator','microwave','blender','toaster',
  'keyboard','monitor','printer',
  'banana','avocado','potato','tomato','onion','cactus','mushroom',
  'blanket','pillow','slipper','sock','shoe','flip flop',
  'diaper','pacifier',
]);

const ACTION_VERBS = new Set([
  'dancing','singing','running','flying','swimming','eating','sleeping',
  'fighting','dabbing','twerking','grinding','vibing','coping','seething',
  'crying','laughing','screaming','yelling','licking','biting','punching',
]);

// ══════════════════════════════════════════════════════════════════════
// SECTION 4: MEME CLASSIFICATION
// ══════════════════════════════════════════════════════════════════════

function classifyPost(text: string): { cls: PostClass; memeScore: number; rejectScore: number; reasons: string[] } {
  const lower = normalizeText(text);
  const words = lower.split(/\s+/);
  const reasons: string[] = [];
  let memeScore = 0;
  let rejectScore = 0;

  // Template rejection
  for (const p of TEMPLATE_PATTERNS) {
    if (p.test(lower)) { rejectScore += 15; reasons.push('template text'); break; }
  }

  // Check rejection lists
  for (const w of words) {
    if (REJECT_COMPANIES.has(w)) { rejectScore += 10; reasons.push(`company: ${w}`); }
    if (REJECT_POLITICIANS.has(w)) { rejectScore += 10; reasons.push(`politician: ${w}`); }
    if (REJECT_FINANCE_WORDS.has(w)) { rejectScore += 8; reasons.push(`finance: ${w}`); }
    if (REJECT_NEWS_WORDS.has(w)) { rejectScore += 8; reasons.push(`news: ${w}`); }
    if (REJECT_COUNTRIES.has(w)) { rejectScore += 5; reasons.push(`country: ${w}`); }
    if (REJECT_CRYPTO_GENERIC.has(w)) { rejectScore += 6; reasons.push(`crypto generic: ${w}`); }
  }

  // Check for meme signals
  for (const w of words) {
    if (HUMOR_WORDS.has(w)) { memeScore += 3; }
    if (ABSURD_ADJECTIVES.has(w)) { memeScore += 2; }
    if (ANIMALS.has(w)) { memeScore += 2; }
    if (MEME_ROLES.has(w)) { memeScore += 1; }
    if (FUNNY_OBJECTS.has(w)) { memeScore += 2; }
    if (PERSON_PREFIXES.has(w)) { memeScore += 1; }
    if (ACTION_VERBS.has(w)) { memeScore += 2; }
  }

  // Check for known meme tokens
  const KNOWN = ['pepe','doge','shiba','bonk','wojak','wif','popcat','brett','mog','bome','mew',
    'brainrot','sigma','skibidi','rizz','gigachad','npc','trollface'];
  for (const k of KNOWN) {
    if (lower.includes(k)) { memeScore += 5; }
  }

  // Check for slang
  const SLANG = ['ngl','tbh','fr','ong','istg','smh','no cap','deadass','lowkey','highkey'];
  for (const s of SLANG) {
    if (lower.includes(s)) { memeScore += 2; }
  }

  // Exclamation marks
  const exclCount = (text.match(/!/g) ?? []).length;
  if (exclCount >= 1) memeScore += 1;
  if (exclCount >= 3) memeScore += 2;

  // Determine class
  if (rejectScore >= 15 && rejectScore > memeScore) {
    return { cls: 'rejected', memeScore, rejectScore, reasons };
  }
  if (memeScore >= 5) return { cls: 'meme', memeScore, rejectScore, reasons };
  if (memeScore >= 2) return { cls: 'cultural', memeScore, rejectScore, reasons };
  return { cls: 'rejected', memeScore: 0, rejectScore, reasons: ['no meme signals'] };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 5: MEME CONCEPT EXTRACTION
// ══════════════════════════════════════════════════════════════════════

interface MemeConcept {
  raw: string;
  normalized: string;
  score: number;
  type: 'absurd_combo' | 'funny_name' | 'catchphrase' | 'known_meme' | 'running_joke';
}

const KNOWN_MEME_TOKENS: Record<string, string> = {
  'pepe': 'PEPE', 'pepe the frog': 'PEPE',
  'doge': 'DOGE', 'dogecoin': 'DOGE',
  'shiba': 'SHIBA', 'shiba inu': 'SHIBA', 'shib': 'SHIBA',
  'bonk': 'BONK', 'wojak': 'WOJAK',
  'wif': 'WIF', 'dog wif hat': 'WIF', 'dogwifhat': 'WIF',
  'popcat': 'POPCAT', 'pop cat': 'POPCAT',
  'brett': 'BRETT', 'brett on base': 'BRETT',
  'mog': 'MOG', 'bome': 'BOME', 'book of meme': 'BOME',
  'mew': 'MEW', 'cat in a dogs world': 'MEW',
  'italian brainrot': 'ITALIAN BRAINROT', 'italian brain rot': 'ITALIAN BRAINROT',
  'brainrot': 'BRAINROT', 'brain rot': 'BRAINROT',
  'sigma': 'SIGMA', 'skibidi': 'SKIBIDI', 'rizz': 'RIZZ',
  'gigachad': 'GIGACHAD', 'npc': 'NPC', 'trollface': 'TROLLFACE',
};

function normalizeConcept(raw: string): string {
  return raw.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function conceptKey(raw: string): string {
  return normalizeConcept(raw).split(/\s+/).sort().join(' ');
}

function extractMemeConcepts(title: string, body: string): MemeConcept[] {
  const allText = `${title} ${body}`;
  const lower = allText.toLowerCase();
  const words = lower.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, '')).filter((w) => w.length >= 2);
  const concepts: MemeConcept[] = [];
  const seenKeys = new Set<string>();

  function addConcept(raw: string, score: number, type: MemeConcept['type']) {
    const normalized = normalizeConcept(raw).toUpperCase();
    const key = normalized.split(/\s+/).sort().join(' ');
    if (seenKeys.has(key) || normalized.length < 3) return;
    seenKeys.add(key);
    concepts.push({ raw, normalized, score, type });
  }

  // 1. Known meme tokens
  for (const [key, norm] of Object.entries(KNOWN_MEME_TOKENS)) {
    if (lower.includes(key)) {
      addConcept(key, 20, 'known_meme');
    }
  }

  // 2. Absurd 2-word combos: [adj] [animal/object/role]
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (ABSURD_ADJECTIVES.has(w1) && (ANIMALS.has(w2) || FUNNY_OBJECTS.has(w2) || MEME_ROLES.has(w2))) {
      addConcept(`${w1} ${w2}`, 15, 'absurd_combo');
    }
    if (PERSON_PREFIXES.has(w1) && (ANIMALS.has(w2) || FUNNY_OBJECTS.has(w2) || MEME_ROLES.has(w2))) {
      addConcept(`${w1} ${w2}`, 15, 'funny_name');
    }
    if (ACTION_VERBS.has(w1) && (ANIMALS.has(w2) || FUNNY_OBJECTS.has(w2) || MEME_ROLES.has(w2))) {
      addConcept(`${w1} ${w2}`, 12, 'absurd_combo');
    }
  }

  // 3. Absurd 3-word combos
  for (let i = 0; i < words.length - 2; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    const w3 = words[i + 2];
    const nounOk = ANIMALS.has(w3) || FUNNY_OBJECTS.has(w3) || MEME_ROLES.has(w3);

    // [prefix] [adj] [noun]
    if (PERSON_PREFIXES.has(w1) && ABSURD_ADJECTIVES.has(w2) && nounOk) {
      addConcept(`${w1} ${w2} ${w3}`, 18, 'absurd_combo');
    }
    // [adj] [adj] [noun]
    if (ABSURD_ADJECTIVES.has(w1) && ABSURD_ADJECTIVES.has(w2) && nounOk) {
      addConcept(`${w1} ${w2} ${w3}`, 16, 'absurd_combo');
    }
    // [verb] [adj] [noun]
    if (ACTION_VERBS.has(w1) && ABSURD_ADJECTIVES.has(w2) && nounOk) {
      addConcept(`${w1} ${w2} ${w3}`, 14, 'absurd_combo');
    }
    // [verb] [noun] [noun]
    if (ACTION_VERBS.has(w1) && (ANIMALS.has(w2) || FUNNY_OBJECTS.has(w2)) && nounOk) {
      addConcept(`${w1} ${w2} ${w3}`, 13, 'absurd_combo');
    }
  }

  // 4. Hashtag concepts
  const HASHTAG_RE = /#([A-Za-z0-9_]{2,30})\b/g;
  for (const m of allText.matchAll(HASHTAG_RE)) {
    const tag = m[1].toLowerCase();
    const tagWords = tag.split(/[_\s]+/);
    let hasMemeWord = false;
    for (const tw of tagWords) {
      if (ABSURD_ADJECTIVES.has(tw) || ANIMALS.has(tw) || FUNNY_OBJECTS.has(tw) || MEME_ROLES.has(tw) || PERSON_PREFIXES.has(tw) || ACTION_VERBS.has(tw)) {
        hasMemeWord = true;
        break;
      }
    }
    if (hasMemeWord) {
      addConcept(tag.replace(/_/g, ' '), 10, 'running_joke');
    }
  }

  // 5. Capitalized phrases (likely proper nouns / titles)
  const CAP_PHRASES = allText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? [];
  for (const phrase of CAP_PHRASES) {
    const lowPhrase = phrase.toLowerCase();
    const phraseWords = lowPhrase.split(/\s+/);
    let hasMemeWord = false;
    for (const pw of phraseWords) {
      if (ABSURD_ADJECTIVES.has(pw) || ANIMALS.has(pw) || FUNNY_OBJECTS.has(pw) || MEME_ROLES.has(pw) || PERSON_PREFIXES.has(pw)) {
        hasMemeWord = true;
        break;
      }
    }
    if (hasMemeWord && phraseWords.length >= 2 && phraseWords.length <= 5) {
      addConcept(lowPhrase, 10, 'catchphrase');
    }
  }

  // 6. Detect [number] [unit] [animal] patterns like "40 pound tabby cat"
  const NUM_PATTERN = /(\d+)\s+(pound|lb|kg|inch|foot|feet|year|month|week|day|hour|minute)\s+(\w+)/gi;
  for (const m of allText.matchAll(NUM_PATTERN)) {
    const animalWord = m[3].toLowerCase();
    if (ANIMALS.has(animalWord) || MEME_ROLES.has(animalWord)) {
      addConcept(`${m[1]} ${m[2]} ${animalWord}`, 12, 'absurd_combo');
    }
  }

  return concepts.sort((a, b) => b.score - a.score);
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 6: CONCEPT CLUSTER
// ══════════════════════════════════════════════════════════════════════

interface ConceptCluster {
  concept: string;
  aliases: Set<string>;
  posts: RawPost[];
  firstSeen: number;
  lastSeen: number;
  authors: Set<string>;
  sources: Set<string>;
  humanAuthors: Set<string>;
  totalMentions: number;
  totalEngagement: number;
  conceptType: MemeConcept['type'];
  relatedConcepts: Set<string>;
  memeScore: number;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 7: BUILD CONCEPT CLUSTERS
// ══════════════════════════════════════════════════════════════════════

interface ExtractionStats {
  totalPosts: number;
  classifiedAsMeme: number;
  classifiedAsCultural: number;
  classifiedAsRejected: number;
  conceptsExtracted: number;
  uniqueConcepts: number;
  conceptsByType: Record<string, number>;
}

function buildConceptClusters(posts: RawPost[]): {
  clusters: Map<string, ConceptCluster>;
  stats: ExtractionStats;
  rejectedPosts: { post: string; reason: string }[];
} {
  const now = Date.now();
  const WINDOW = 24 * 3600 * 1000;
  const recent = posts.filter((p) => now - p.timestamp <= WINDOW);

  const clusterMap = new Map<string, ConceptCluster>();
  const stats: ExtractionStats = {
    totalPosts: recent.length,
    classifiedAsMeme: 0,
    classifiedAsCultural: 0,
    classifiedAsRejected: 0,
    conceptsExtracted: 0,
    uniqueConcepts: 0,
    conceptsByType: {},
  };
  const rejectedPosts: { post: string; reason: string }[] = [];

  for (const post of recent) {
    const allText = `${post.title} ${post.body}`;

    // Stage 1: Classify the post
    const classification = classifyPost(allText);
    if (classification.cls === 'rejected') {
      stats.classifiedAsRejected++;
      rejectedPosts.push({ post: post.title, reason: classification.reasons.join('; ') || 'no meme signals' });
      continue;
    }

    if (classification.cls === 'meme') stats.classifiedAsMeme++;
    else stats.classifiedAsCultural++;

    // Stage 2: Extract meme concepts
    const concepts = extractMemeConcepts(post.title, post.body);
    if (concepts.length === 0) {
      stats.classifiedAsRejected++;
      rejectedPosts.push({ post: post.title, reason: 'no meme concepts extracted' });
      continue;
    }

    stats.conceptsExtracted += concepts.length;

    // Stage 3: Assign post to best concept cluster
    const bestConcept = concepts[0];
    const key = normalizeConcept(bestConcept.normalized);

    let cluster = clusterMap.get(key);
    if (!cluster) {
      cluster = {
        concept: bestConcept.normalized,
        aliases: new Set(),
        posts: [],
        firstSeen: post.timestamp,
        lastSeen: post.timestamp,
        authors: new Set(),
        sources: new Set(),
        humanAuthors: new Set(),
        totalMentions: 0,
        totalEngagement: 0,
        conceptType: bestConcept.type,
        relatedConcepts: new Set(),
        memeScore: 0,
      };
      clusterMap.set(key, cluster);
    }

    cluster.aliases.add(bestConcept.raw);
    cluster.posts.push(post);
    cluster.authors.add(post.author);
    cluster.sources.add(post.source);
    if (post.providerCategory === 'social') cluster.humanAuthors.add(post.author);
    cluster.totalMentions += 1;
    cluster.totalEngagement += post.likes + post.shares * 2 + post.comments;
    cluster.firstSeen = Math.min(cluster.firstSeen, post.timestamp);
    cluster.lastSeen = Math.max(cluster.lastSeen, post.timestamp);
    cluster.memeScore += classification.memeScore;

    // Track related concepts from same post
    for (const c of concepts) {
      const cKey = normalizeConcept(c.normalized);
      if (cKey !== key) cluster.relatedConcepts.add(c.normalized);
      stats.conceptsByType[c.type] = (stats.conceptsByType[c.type] ?? 0) + 1;
    }

    stats.uniqueConcepts = clusterMap.size;
  }

  return { clusters: clusterMap, stats, rejectedPosts };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 8: ALIAS MERGING
// ══════════════════════════════════════════════════════════════════════

function mergeAliases(clusters: Map<string, ConceptCluster>): Map<string, ConceptCluster> {
  const ALIASES: Record<string, string> = { 'SHIB': 'SHIBA' };
  const merged = new Map<string, ConceptCluster>();
  const mergedAway = new Set<string>();

  for (const [key, cluster] of clusters) {
    if (mergedAway.has(key)) continue;
    const targetKey = ALIASES[key] ?? key;
    if (targetKey !== key) {
      const target = merged.get(targetKey) ?? clusters.get(targetKey);
      if (target && target !== cluster) {
        for (const a of cluster.aliases) target.aliases.add(a);
        target.posts.push(...cluster.posts);
        for (const a of cluster.authors) target.authors.add(a);
        for (const s of cluster.sources) target.sources.add(s);
        for (const a of cluster.humanAuthors) target.humanAuthors.add(a);
        for (const c of cluster.relatedConcepts) target.relatedConcepts.add(c);
        target.totalMentions += cluster.totalMentions;
        target.totalEngagement += cluster.totalEngagement;
        target.firstSeen = Math.min(target.firstSeen, cluster.firstSeen);
        target.lastSeen = Math.max(target.lastSeen, cluster.lastSeen);
        target.memeScore += cluster.memeScore;
        mergedAway.add(key);
        continue;
      }
    }
    merged.set(targetKey, cluster);
  }
  return merged;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 9: SCORING — LAUNCH OPPORTUNITY
// ══════════════════════════════════════════════════════════════════════

function computeGrowthPct(cluster: ConceptCluster, now: number): number {
  const half = 12 * 3600 * 1000;
  const recent = cluster.posts.filter((p) => now - p.timestamp <= half).length;
  const older = cluster.posts.length - recent;
  if (older === 0) return recent > 0 ? 100 + recent * 20 : 0;
  return Math.round(((recent - older) / older) * 100);
}

function computeVelocity(cluster: ConceptCluster): number {
  const spanHours = Math.max((cluster.lastSeen - cluster.firstSeen) / 3600000, 0.5);
  return cluster.totalMentions / spanHours;
}

function computeMomentum(cluster: ConceptCluster, now: number): number {
  const recent = cluster.posts.filter((p) => now - p.timestamp <= 6 * 3600 * 1000).length;
  const older = cluster.posts.filter((p) => now - p.timestamp > 6 * 3600 * 1000 && now - p.timestamp <= 12 * 3600 * 1000).length;
  if (older === 0) return recent > 0 ? 80 : 20;
  return Math.min(Math.round((recent / older) * 40), 100);
}

function computeVirality(cluster: ConceptCluster, now: number): number {
  const velocity = computeVelocity(cluster);
  const growth = computeGrowthPct(cluster, now);
  return Math.min(100, Math.round(
    Math.min(velocity / 5, 1) * 40 +
    Math.min(Math.max(growth, 0) / 200, 1) * 30 +
    Math.min(cluster.humanAuthors.size / 15, 1) * 20 +
    Math.min(cluster.sources.size / 3, 1) * 10
  ));
}

function computeMemeStrength(cluster: ConceptCluster): number {
  let score = 0;
  // Concept type bonus
  const TYPE_BONUS: Record<string, number> = {
    absurd_combo: 30, funny_name: 25, known_meme: 20,
    catchphrase: 15, running_joke: 15,
  };
  score += TYPE_BONUS[cluster.conceptType] ?? 10;
  // Multiple aliases = more people describing it differently = stronger meme
  score += Math.min(cluster.aliases.size * 3, 15);
  // Average meme score from classification
  score += Math.min(Math.round(cluster.memeScore / Math.max(cluster.posts.length, 1)), 15);
  // Short catchy name bonus
  if (cluster.concept.length <= 12) score += 10;
  else if (cluster.concept.length <= 20) score += 5;
  return Math.min(score, 100);
}

function computeCommunityDiversity(cluster: ConceptCluster): number {
  return Math.min(100, Math.round(
    Math.min(cluster.humanAuthors.size / 20, 1) * 40 +
    Math.min(cluster.sources.size / 3, 1) * 30 +
    Math.min(cluster.totalMentions / 30, 1) * 20 +
    (cluster.sources.size >= 2 ? 10 : 0)
  ));
}

function computeCrossPlatform(cluster: ConceptCluster): number {
  return Math.min(100, Math.round((cluster.sources.size / 4) * 100));
}

function computeOriginality(cluster: ConceptCluster): number {
  const KNOWN_OVERSATURATED = new Set(['PEPE','DOGE','SHIBA','BONK','WOJAK']);
  if (KNOWN_OVERSATURATED.has(cluster.concept)) return 10;
  // Unknown concept = high originality
  let score = 70;
  if (cluster.conceptType === 'absurd_combo') score += 20;
  if (cluster.conceptType === 'funny_name') score += 15;
  if (cluster.conceptType === 'catchphrase') score += 10;
  if (cluster.relatedConcepts.size > 0) score += 10;
  return Math.min(score, 100);
}

function computeImagePotential(cluster: ConceptCluster): number {
  const conceptLower = cluster.concept.toLowerCase();
  for (const a of ANIMALS) { if (conceptLower.includes(a)) return 90; }
  for (const o of FUNNY_OBJECTS) { if (conceptLower.includes(o)) return 80; }
  for (const r of MEME_ROLES) { if (conceptLower.includes(r)) return 70; }
  if (cluster.conceptType === 'absurd_combo') return 75;
  if (cluster.conceptType === 'funny_name') return 65;
  return 50;
}

function computeBrandability(cluster: ConceptCluster): number {
  let score = 50;
  const words = cluster.concept.split(/\s+/);
  if (words.length <= 2) score += 20;
  else if (words.length <= 3) score += 10;
  if (cluster.concept.length <= 12) score += 15;
  if (cluster.conceptType === 'funny_name') score += 10;
  return Math.min(score, 100);
}

function computeTickerQuality(cluster: ConceptCluster): number {
  const words = cluster.concept.split(/\s+/);
  const ticker = words.map((w) => w[0]).join('').toUpperCase().slice(0, 6);
  if (ticker.length <= 4) return 95;
  if (ticker.length <= 6) return 80;
  return 60;
}

function computeCompetition(cluster: ConceptCluster): CompetitionData {
  const KNOWN: Record<string, { count: number; successful: number; dead: number }> = {
    'PEPE': { count: 18000, successful: 5, dead: 17000 },
    'DOGE': { count: 1, successful: 1, dead: 0 },
    'SHIBA': { count: 500, successful: 2, dead: 480 },
    'BONK': { count: 200, successful: 3, dead: 180 },
    'WOJAK': { count: 300, successful: 2, dead: 280 },
  };

  const existing = KNOWN[cluster.concept];
  if (existing) {
    const saturation: CompetitionData['saturation'] =
      existing.count > 5000 ? 'saturated' :
      existing.count > 1000 ? 'high' :
      existing.count > 100 ? 'medium' : 'low';
    const recommendation: CompetitionData['recommendation'] =
      saturation === 'saturated' ? 'do_not_launch' :
      saturation === 'high' ? 'do_not_launch' :
      saturation === 'medium' ? 'wait' : 'launch_soon';
    return {
      existingTokens: existing.count, deadTokens: existing.dead,
      successfulTokens: existing.successful, copies: existing.count - existing.dead,
      forks: Math.floor(existing.count * 0.3), saturation, recommendation,
      recommendationReason: `${existing.count} tokens already exist — ${existing.dead} are dead`,
    };
  }

  // Novel concept = no competition
  return {
    existingTokens: 0, deadTokens: 0, successfulTokens: 0,
    copies: 0, forks: 0, saturation: 'none',
    recommendation: 'launch_immediately',
    recommendationReason: 'No existing token found — first mover advantage available',
  };
}

function computeLaunchScore(cluster: ConceptCluster, now: number): {
  launchScore: number; viralityScore: number; memeStrength: number;
  growthVelocity: number; communityDiversity: number; crossPlatformSpread: number;
  originalityScore: number; imagePotential: number; brandability: number;
  mascotPotential: number; tickerQuality: number; launchProbability: number;
  momentum: number;
} {
  const viralityScore = computeVirality(cluster, now);
  const memeStrength = computeMemeStrength(cluster);
  const growthVelocity = Math.min(100, Math.round(computeGrowthPct(cluster, now) / 3));
  const communityDiversity = computeCommunityDiversity(cluster);
  const crossPlatformSpread = computeCrossPlatform(cluster);
  const originalityScore = computeOriginality(cluster);
  const imagePotential = computeImagePotential(cluster);
  const brandability = computeBrandability(cluster);
  const mascotPotential = Math.round((imagePotential + brandability) / 2);
  const tickerQuality = computeTickerQuality(cluster);
  const momentum = computeMomentum(cluster, now);
  const competition = computeCompetition(cluster);

  const competitionPenalty =
    competition.saturation === 'saturated' ? 40 :
    competition.saturation === 'high' ? 25 :
    competition.saturation === 'medium' ? 10 : 0;

  const raw =
    memeStrength * 0.25 +
    viralityScore * 0.20 +
    originalityScore * 0.15 +
    communityDiversity * 0.15 +
    crossPlatformSpread * 0.10 +
    imagePotential * 0.05 +
    brandability * 0.05 +
    momentum * 0.05;

  const launchScore = Math.max(0, Math.min(Math.round(raw - competitionPenalty), 100));
  const launchProbability = Math.max(0, Math.min(Math.round(
    launchScore * (competition.recommendation === 'launch_immediately' ? 1.0 :
      competition.recommendation === 'launch_soon' ? 0.8 :
      competition.recommendation === 'wait' ? 0.4 : 0.1)
  ), 100));

  return {
    launchScore, viralityScore, memeStrength, growthVelocity,
    communityDiversity, crossPlatformSpread, originalityScore,
    imagePotential, brandability, mascotPotential, tickerQuality,
    launchProbability, momentum,
  };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 10: QUALITY FILTER
// ══════════════════════════════════════════════════════════════════════

const MAX_OPPORTUNITIES = 15;

const BLOCKED_CONCEPTS = new Set([
  'crypto','blockchain','web3','defi','nft','token','coin','dex',
  'trending','gainers','losers','volume','liquidity','market','cap',
  'rank','top','bottom','general','random','stuff','things',
  'reddit','bluesky','twitter','telegram','discord','youtube',
  'coingecko','dexscreener','github','hackernews',
]);

interface Thresholds {
  minAuthors: number;
  minMentions: number;
  minEngagement: number;
}

function computeThresholds(posts: RawPost[]): Thresholds {
  const n = posts.length;
  if (n < 30) return { minAuthors: 1, minMentions: 1, minEngagement: 0 };
  if (n < 100) return { minAuthors: 1, minMentions: 2, minEngagement: 5 };
  if (n < 500) return { minAuthors: 2, minMentions: 2, minEngagement: 10 };
  return { minAuthors: 2, minMentions: 3, minEngagement: 15 };
}

function checkRejection(cluster: ConceptCluster, thresholds: Thresholds): { rejected: boolean; reason: string } {
  if (!cluster.concept || cluster.concept.length < 3) {
    return { rejected: true, reason: 'concept too short' };
  }
  if (BLOCKED_CONCEPTS.has(cluster.concept.toLowerCase())) {
    return { rejected: true, reason: `blocked/generic concept "${cluster.concept}"` };
  }
  if (cluster.humanAuthors.size < thresholds.minAuthors) {
    return { rejected: true, reason: `only ${cluster.humanAuthors.size} author(s) — need ${thresholds.minAuthors}+` };
  }
  if (cluster.totalMentions < thresholds.minMentions) {
    return { rejected: true, reason: `only ${cluster.totalMentions} mention(s) — need ${thresholds.minMentions}+` };
  }
  if (cluster.totalEngagement < thresholds.minEngagement) {
    return { rejected: true, reason: `engagement ${cluster.totalEngagement} below minimum ${thresholds.minEngagement}` };
  }
  return { rejected: false, reason: '' };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 11: HELPERS
// ══════════════════════════════════════════════════════════════════════

function detectCategory(concept: string): string {
  const c = concept.toLowerCase();
  for (const a of ANIMALS) { if (c.includes(a)) return 'Animals'; }
  for (const o of FUNNY_OBJECTS) { if (c.includes(o)) return 'Objects'; }
  for (const r of MEME_ROLES) { if (c.includes(r)) return 'Characters'; }
  return 'Internet Meme';
}

function generateReason(cluster: ConceptCluster, now: number): string {
  const growth = computeGrowthPct(cluster, now);
  const velocity = computeVelocity(cluster);
  const parts: string[] = [];
  if (growth > 200) parts.push(`Mentions surged +${growth}% in last 12 hours`);
  else if (growth > 100) parts.push(`Mentions doubled (+${growth}%)`);
  else if (growth > 0) parts.push(`Growth +${growth}%`);
  if (velocity > 5) parts.push(`${Math.round(velocity)} mentions/hour`);
  if (cluster.sources.size >= 2) parts.push(`Across ${cluster.sources.size} platforms`);
  if (cluster.humanAuthors.size > 5) parts.push(`${cluster.humanAuthors.size} unique voices`);
  if (cluster.aliases.size > 1) parts.push(`${cluster.aliases.size} ways people describe it`);
  if (parts.length === 0) parts.push(`${cluster.totalMentions} mentions in ${Math.round((now - cluster.firstSeen) / 3600000)}h`);
  return parts.join('. ') + '.';
}

function generateWhySelected(cluster: ConceptCluster, scores: ReturnType<typeof computeLaunchScore>): string {
  const parts: string[] = [];
  parts.push(`Mentioned by ${cluster.humanAuthors.size} unique users.`);
  if (scores.growthVelocity > 50) parts.push(`Growing ${scores.growthVelocity}% recently.`);
  if (cluster.sources.size >= 2) parts.push(`Detected on ${[...cluster.sources].join(' and ')}.`);
  const competition = computeCompetition(cluster);
  if (competition.existingTokens === 0) parts.push('No existing Solana token found.');
  else if (competition.deadTokens > competition.existingTokens * 0.8) parts.push(`${competition.deadTokens} dead tokens — market cleared.`);
  if (scores.memeStrength >= 60) parts.push('High meme density.');
  if (scores.imagePotential >= 70) parts.push('Strong image potential.');
  if (scores.brandability >= 70) parts.push('Easy branding.');
  if (scores.tickerQuality >= 80) parts.push('Short memorable name.');
  return parts.join(' ');
}

function generateEvidence(cluster: ConceptCluster): string[] {
  const evidence: string[] = [];
  const bySource = new Map<string, number>();
  for (const p of cluster.posts) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);
  for (const [src, count] of [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    evidence.push(`${src}: ${count} mentions`);
  }
  if (cluster.aliases.size > 1) evidence.push(`Aliases: ${[...cluster.aliases].join(', ')}`);
  const topAuthors = [...cluster.authors].slice(0, 3);
  if (topAuthors.length > 0) evidence.push(`Active voices: ${topAuthors.join(', ')}`);
  return evidence;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 12: MAIN ANALYSIS
// ══════════════════════════════════════════════════════════════════════

export function analyzeNarratives(posts: RawPost[]): LaunchOpportunity[] {
  const now = Date.now();
  const L = (msg: string) => console.log(`[intel] ${msg}`);
  const SEP = '════════════════════════════════════════════════════════════';
  const SEP2 = '────────────────────────────────────────────────────────────';

  const allAuthors = new Set<string>();
  const allSources = new Set<string>();
  for (const p of posts) {
    allAuthors.add(p.author);
    allSources.add(p.source);
  }

  const bySource = new Map<string, number>();
  for (const p of posts) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);

  // STAGE 0: COLLECTED
  L(SEP);
  L('  COLLECTED POSTS');
  L(SEP);
  L(`  Total:     ${posts.length}`);
  L(`  Authors:   ${allAuthors.size}`);
  L(`  Platforms: ${allSources.size} (${[...allSources].join(', ')})`);
  for (const [src, count] of bySource) L(`    ${src}: ${count}`);
  L('');

  // STAGE 1: CLASSIFY + EXTRACT
  const { clusters, stats, rejectedPosts } = buildConceptClusters(posts);

  L(SEP);
  L('  STAGE 1: CLASSIFY + EXTRACT MEME CONCEPTS');
  L(SEP);
  L(`  Total posts:           ${stats.totalPosts}`);
  L(`  Classified as meme:    ${stats.classifiedAsMeme}`);
  L(`  Classified as cultural:${stats.classifiedAsCultural}`);
  L(`  Classified as rejected:${stats.classifiedAsRejected}`);
  L(`  Concepts extracted:    ${stats.conceptsExtracted}`);
  L(`  Unique concepts:       ${stats.uniqueConcepts}`);
  L(`  By type:`);
  for (const [t, c] of Object.entries(stats.conceptsByType).sort((a, b) => b[1] - a[1])) {
    L(`    ${t}: ${c}`);
  }
  L('');

  // STAGE 2: CLUSTER BY CONCEPT
  L(SEP);
  L('  STAGE 2: CLUSTER BY MEME CONCEPT');
  L(SEP);
  L(`  Clusters: ${clusters.size}`);
  for (const [key, cluster] of clusters) {
    L(SEP2);
    L(`  CONCEPT: "${cluster.concept}" (type: ${cluster.conceptType})`);
    L(`    Aliases:    ${[...cluster.aliases].join(', ')}`);
    L(`    Posts:      ${cluster.totalMentions}`);
    L(`    Authors:    ${cluster.authors.size} (human: ${cluster.humanAuthors.size})`);
    L(`    Platforms:  ${cluster.sources.size} (${[...cluster.sources].join(', ')})`);
    L(`    Engagement: ${cluster.totalEngagement}`);
    L(`    Meme score: ${cluster.memeScore}`);
    L(`    Related:    ${[...cluster.relatedConcepts].join(', ') || '(none)'}`);
  }
  L('');

  // STAGE 3: MERGE ALIASES
  const merged = mergeAliases(clusters);
  const aliasMerged = clusters.size - merged.size;

  L(SEP);
  L('  STAGE 3: MERGE ALIASES');
  L(SEP);
  L(`  Before: ${clusters.size} | After: ${merged.size} | Merged: ${aliasMerged}`);
  L('');

  // STAGE 4: THRESHOLDS
  const thresholds = computeThresholds(posts);

  L(SEP);
  L('  STAGE 4: THRESHOLDS');
  L(SEP);
  L(`  minAuthors: ${thresholds.minAuthors} | minMentions: ${thresholds.minMentions} | minEngagement: ${thresholds.minEngagement}`);
  L('');

  // STAGE 5: QUALITY FILTER
  L(SEP);
  L('  STAGE 5: QUALITY FILTER');
  L(SEP);

  const rejectedEntities: RejectedEntity[] = [];
  const passed: ConceptCluster[] = [];

  for (const [key, cluster] of merged) {
    const check = checkRejection(cluster, thresholds);
    if (check.rejected) {
      rejectedEntities.push({ entity: key, reason: check.reason, postCount: cluster.totalMentions });
      L(`  REJECTED: "${key}" — ${check.reason}`);
    } else {
      passed.push(cluster);
      L(`  PASSED:   "${key}" — ${cluster.totalMentions} posts, ${cluster.humanAuthors.size} authors`);
    }
  }
  L(`  Passed: ${passed.length} | Rejected: ${rejectedEntities.length}`);
  L('');

  // STAGE 6: SCORE
  L(SEP);
  L('  STAGE 6: LAUNCH OPPORTUNITY SCORING');
  L(SEP);

  const scored: Array<{ cluster: ConceptCluster; scores: ReturnType<typeof computeLaunchScore>; competition: CompetitionData }> = [];
  for (const cluster of passed) {
    const scores = computeLaunchScore(cluster, now);
    const competition = computeCompetition(cluster);
    scored.push({ cluster, scores, competition });
    L(`  "${cluster.concept}": launch=${scores.launchScore} meme=${scores.memeStrength} virality=${scores.viralityScore} competition=${competition.saturation}`);
  }
  L('');

  // STAGE 7: SORT + TOP 15
  scored.sort((a, b) => b.scores.launchScore - a.scores.launchScore);
  const top15 = scored.slice(0, MAX_OPPORTUNITIES);

  const opportunities: LaunchOpportunity[] = [];
  for (const { cluster, scores, competition } of top15) {
    const category = detectCategory(cluster.concept);
    const reason = generateReason(cluster, now);
    const whySelected = generateWhySelected(cluster, scores);
    const evidence = generateEvidence(cluster);
    const topPostTitles = [...cluster.posts]
      .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 3)
      .map((p) => p.title);

    const effectiveAuthors = cluster.humanAuthors.size;

    opportunities.push({
      id: `${cluster.concept.toLowerCase().replace(/\s+/g, '-')}-${now}`,
      narrative: cluster.concept.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      canonicalEntity: cluster.concept.toUpperCase(),
      aliases: [...cluster.aliases],
      launchScore: scores.launchScore,
      viralityScore: scores.viralityScore,
      memeStrength: scores.memeStrength,
      growthVelocity: scores.growthVelocity,
      communityDiversity: scores.communityDiversity,
      crossPlatformSpread: scores.crossPlatformSpread,
      originalityScore: scores.originalityScore,
      competition,
      mentionCount: cluster.totalMentions,
      uniqueAuthors: effectiveAuthors,
      sourcesFound: [...cluster.sources],
      sourceCount: cluster.sources.size,
      socialPlatforms: [...cluster.sources].filter((s) => !['dexscreener','coingecko'].includes(s)),
      marketPlatforms: [],
      firstDetected: cluster.firstSeen,
      lastSeen: cluster.lastSeen,
      momentum: scores.momentum,
      imagePotential: scores.imagePotential,
      brandability: scores.brandability,
      mascotPotential: scores.mascotPotential,
      tickerQuality: scores.tickerQuality,
      launchProbability: scores.launchProbability,
      reason,
      whySelected,
      evidence,
      category,
      topPostTitles,
      topContributingPosts: topPostTitles,
    });
  }

  // FINAL DIAGNOSTICS
  L(SEP);
  L('  FINAL DIAGNOSTICS');
  L(SEP);
  L(`  Collected posts:     ${posts.length}`);
  L(`  Meme classified:     ${stats.classifiedAsMeme + stats.classifiedAsCultural}`);
  L(`  Concepts extracted:  ${stats.conceptsExtracted}`);
  L(`  Unique concepts:     ${stats.uniqueConcepts}`);
  L(`  Merged aliases:      ${aliasMerged}`);
  L(`  Rejected:            ${rejectedEntities.length}`);
  L(`  Passed filter:       ${passed.length}`);
  L(`  Top 15 opportunities:${top15.length}`);
  L('');
  L('  REJECTED CONCEPTS:');
  for (const re of rejectedEntities) {
    L(`    ${re.entity} (${re.postCount} posts) — ${re.reason}`);
  }
  L('');
  L('  TOP 15 LAUNCH OPPORTUNITIES:');
  for (let i = 0; i < top15.length; i++) {
    const { cluster, scores, competition } = top15[i];
    L(`    #${i + 1}: ${cluster.concept} — launch=${scores.launchScore} competition=${competition.saturation} (${competition.recommendation})`);
  }
  L(SEP);

  return opportunities;
}
