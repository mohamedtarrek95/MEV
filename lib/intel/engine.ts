import type { RawPost, LaunchOpportunity, CompetitionData, NarrativeReport, PipelineDiagnostics, SupportingPost, GrowthBucket } from './types.js';

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
// SECTION 2: REJECTION LISTS
//
// These filters ensure we NEVER recommend news, politics, tech, finance.
// ══════════════════════════════════════════════════════════════════════

const REJECT_WORDS = new Set([
  'apple','google','microsoft','amazon','netflix','spotify','tiktok','instagram',
  'youtube','twitter','facebook','snapchat','discord','twitch','reddit','tesla',
  'spacex','openai','anthropic','meta','nvidia','roblox','fortnite','minecraft',
  'trump','biden','putin','zelensky','modi','macron','congress','senate',
  'president','governor','senator','election','democrat','republican',
  'stock','bond','etf','earnings','revenue','profit','loss','ipo',
  'bankruptcy','debt','inflation','gdp','federal reserve','treasury',
  'war','conflict','nuclear','missile','sanctions','tariff',
  'earthquake','hurricane','pandemic','virus','lockdown',
  'bitcoin','ethereum','solana','blockchain','web3','defi','nft',
  'token','coin','dex','staking','yield','farming','liquidity','swap',
  'price','market cap','volume','fdv','tvl','holders',
  'america','united states','china','russia','ukraine','israel',
  'trending','gainers','losers','boosted','rank','top',
  'rust','python','javascript','typescript','golang','java','c++','ruby',
  'framework','library','npm','pip','cargo','api','sdk','webhook',
  'passwordless','authentication','authorization','encryption','decryption',
  'kubernetes','docker','aws','azure','gcp','terraform','devops',
]);

const TEMPLATE_PATTERNS: RegExp[] = [
  /\b(trending|trend)\s+(on|in|now|today)\b/i,
  /\brank\s*#?\d/i,
  /\b(top|bottom)\s+(gainers?|losers?|coins?|tokens?)\b/i,
  /\b24\s*h\s*(change|gain|loss|volume)\b/i,
  /\b(price|market)\s*(change|cap|pair)\b/i,
  /\b(volume|liquidity|fdv|tvl|apy|apr)\b/i,
  /\bnew\s+(pairs?|listings?|coins?|tokens?)\b/i,
  /\b(pull request|merge request|commit|branch|release)\b/i,
  /\b(vulnerability|cve|security patch)\b/i,
];

// ══════════════════════════════════════════════════════════════════════
// SECTION 3: MEME CLASSIFIER
//
// Classifies posts into: meme, cultural, rejected.
// Only meme and cultural continue to concept extraction.
// ══════════════════════════════════════════════════════════════════════

type PostClass = 'meme' | 'cultural' | 'rejected';

const MEME_WORDS = new Set([
  'cat','dog','frog','duck','bear','panda','penguin','shark','whale',
  'dragon','unicorn','goat','sheep','cow','pig','chicken','horse',
  'llama','gorilla','monkey','ape','sloth','raccoon','otter','wolf','fox',
  'lion','tiger','crocodile','turtle','snake','gecko','dinosaur',
  'hamster','rabbit','bunny','mouse','squirrel','hedgehog','koala','lemur',
  'thicc','thick','buff','chonky','chonk','smol','tiny','giant','massive',
  'cursed','blessed','feral','unhinged','crusty','dusty','spicy','juicy',
  'shiny','glowy','fuzzy','floofy','derpy','savage','toxic','goofy','silly',
  'galaxy','quantum','cyber','neon','laser','turbo','mega','ultra','hyper',
  'ceo','cto','cfo','president','director','manager','intern','founder',
  'king','queen','prince','princess','lord','sir','wizard','witch','mage',
  'pirate','viking','samurai','gladiator','chef','baker','janitor',
  'influencer','streamer','youtuber','tiktoker','chad','virgin','karen',
  'daddy','mommy','big','little','lil','old','young','tiny','baby',
  'grandpa','grandma','uncle','auntie','mr','mrs','dr','captain',
  'toilet','plunger','spork','nugget','cheese','pizza','taco','sushi',
  'donut','waffle','banana','avocado','potato','tomato','cactus','mushroom',
  'blanket','pillow','slipper','diaper','pacifier',
  'dancing','singing','running','flying','swimming','eating','sleeping',
  'fighting','dabbing','twerking','grinding','vibing','crying','screaming',
  'lmao','lmfao','rofl','bruh','sheesh','dead','omg','wtf',
  'based','cringe','sus','cope','seethe','bussin','goes hard','rent free',
  'ngl','tbh','fr','ong','istg','smh','no cap','lowkey','highkey',
  'pepe','doge','shiba','bonk','wojak','popcat','brett','mog','bome','mew',
  'brainrot','sigma','skibidi','rizz','gigachad','npc','trollface',
]);

function classifyPost(text: string): PostClass {
  const lower = normalizeText(text);
  const words = lower.split(/\s+/);

  for (const p of TEMPLATE_PATTERNS) {
    if (p.test(lower)) return 'rejected';
  }

  let rejectScore = 0;
  let memeScore = 0;
  for (const w of words) {
    if (REJECT_WORDS.has(w)) rejectScore += 10;
    if (MEME_WORDS.has(w)) memeScore += 2;
  }

  const KNOWN = ['pepe','doge','shiba','bonk','wojak','wif','popcat','brett','mog','bome','mew',
    'brainrot','sigma','skibidi','rizz','gigachad','npc','trollface','italian brainrot'];
  for (const k of KNOWN) {
    if (lower.includes(k)) memeScore += 5;
  }

  if (rejectScore >= 15 && rejectScore > memeScore) return 'rejected';
  if (memeScore >= 4) return 'meme';
  if (memeScore >= 2) return 'cultural';
  return 'rejected';
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 4: CONCEPT EXTRACTION
//
// Extracts MEANINGFUL CONCEPTS (2-5 words) from posts.
// A concept is a cultural idea that could become a meme token.
// NOT individual words. NOT single entities.
//
// The engine thinks in STORIES, not WORDS.
// ══════════════════════════════════════════════════════════════════════

interface ExtractedConcept {
  text: string;
  raw: string;
  score: number;
  type: 'known_meme' | 'absurd_combo' | 'character_name' | 'catchphrase' | 'visual_idea';
}

const KNOWN_MEMES: Record<string, string> = {
  'italian brainrot': 'ITALIAN BRAINROT',
  'italian brain rot': 'ITALIAN BRAINROT',
  'pepe the frog': 'PEPE THE FROG',
  'dog wif hat': 'DOG WIF HAT',
  'dogwifhat': 'DOG WIF HAT',
  'cat in a dogs world': 'CAT IN A DOGS WORLD',
  'book of meme': 'BOOK OF MEME',
  'shiba inu': 'SHIBA INU',
  'dogecoin': 'DOGECOIN',
  'bonk coin': 'BONK COIN',
  'pepe coin': 'PEPE COIN',
  'chill guy': 'CHILL GUY',
  'skibidi toilet': 'SKIBIDI TOILET',
  'gigachad': 'GIGACHAD',
  'banana cat': 'BANANA CAT',
  'john pork': 'JOHN PORK',
  'npc live': 'NPC LIVESTREAM',
  'npc stream': 'NPC LIVESTREAM',
  'tabby cat': 'TABBY CAT',
  'shark girl': 'SHARK GIRL',
};

const ABSURD_ADJ = new Set([
  'thicc','thick','buff','chonky','chonk','smol','tiny','giant','massive',
  'cursed','blessed','feral','unhinged','derpy','savage','toxic','goofy','silly',
  'galaxy','quantum','cyber','neon','laser','turbo','mega','ultra','hyper',
  'crusty','dusty','spicy','juicy','shiny','glowy','fuzzy','floofy','wacky',
  'chill','sus','based','cringe','mega','super','ultra',' turbo','omega',
  'evil','dark','shadow','golden','silver','crystal','mecha','cyber',
  'zombie','skeleton','ghost','demon','angel','saint','king','queen',
]);

const NOUNS = new Set([
  'cat','dog','frog','duck','bear','panda','penguin','shark','whale',
  'dragon','unicorn','goat','sheep','cow','pig','chicken','horse',
  'llama','gorilla','monkey','ape','sloth','raccoon','otter','wolf','fox',
  'lion','tiger','crocodile','turtle','snake','gecko','dinosaur',
  'hamster','rabbit','bunny','mouse','squirrel','hedgehog','koala','lemur',
  'toilet','plunger','spork','nugget','cheese','pizza','taco','sushi',
  'donut','waffle','banana','avocado','potato','tomato','cactus','mushroom',
  'blanket','pillow','slipper','diaper','pacifier',
  'guy','bro','dude','man','woman','boy','girl','kid','baby','grandpa','grandma',
  'warrior','wizard','pirate','viking','samurai','chef','king','queen',
  'chad','virgin','karen','npc','streamer','influencer',
]);

const PERSON_PREFIX = new Set([
  'daddy','mommy','big','little','lil','old','young','tiny','baby',
  'grandpa','grandma','uncle','auntie','mr','mrs','dr','captain',
  'king','queen','prince','princess','lord','sir','president','ceo',
]);

const ACTION_VERBS = new Set([
  'dancing','singing','running','flying','swimming','eating','sleeping',
  'fighting','dabbing','twerking','grinding','vibing','crying','screaming',
  'laughing','licking','biting','punching','kicking','yelling','taking',
  'calling','phoning','texting','posting','tweeting','streaming',
]);

function extractConcepts(text: string): ExtractedConcept[] {
  const lower = normalizeText(text);
  const words = lower.split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  const concepts: ExtractedConcept[] = [];
  const seen = new Set<string>();

  function addConcept(raw: string, score: number, type: ExtractedConcept['type']) {
    const normalized = raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    if (seen.has(normalized) || normalized.length < 4) return;
    seen.add(normalized);
    concepts.push({ text: normalized, raw, score, type });
  }

  // 1. Known memes get highest priority
  for (const [key, norm] of Object.entries(KNOWN_MEMES)) {
    if (lower.includes(key)) {
      addConcept(key, 30, 'known_meme');
    }
  }

  // 2. Adjective + Noun combos (the core of meme concepts)
  //    "chonky cat", "cursed frog", "buff gorilla"
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (ABSURD_ADJ.has(w1) && NOUNS.has(w2)) {
      addConcept(`${w1} ${w2}`, 22, 'absurd_combo');
    }
  }

  // 3. Person + Noun combos (character names)
  //    "grandma shark", "captain nugget", "baby turtle"
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (PERSON_PREFIX.has(w1) && w2.length >= 3 && !STOP_WORDS.has(w2)) {
      addConcept(`${w1} ${w2}`, 20, 'character_name');
    }
  }

  // 4. Verb + Adjective/Noun (action combos)
  //    "dancing cactus", "screaming frog", "crying cheese"
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (ACTION_VERBS.has(w1) && (ABSURD_ADJ.has(w2) || NOUNS.has(w2))) {
      addConcept(`${w1} ${w2}`, 18, 'absurd_combo');
    }
  }

  // 5. Three-word combos (richer concepts)
  //    "giant dancing cactus", "cursed baby shark"
  for (let i = 0; i < words.length - 2; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    const w3 = words[i + 2];
    if (ABSURD_ADJ.has(w1) && ABSURD_ADJ.has(w2) && NOUNS.has(w3)) {
      addConcept(`${w1} ${w2} ${w3}`, 24, 'absurd_combo');
    }
    if (ABSURD_ADJ.has(w1) && NOUNS.has(w2) && NOUNS.has(w3)) {
      addConcept(`${w1} ${w2} ${w3}`, 20, 'absurd_combo');
    }
    if (ACTION_VERBS.has(w1) && ABSURD_ADJ.has(w2) && NOUNS.has(w3)) {
      addConcept(`${w1} ${w2} ${w3}`, 20, 'absurd_combo');
    }
    if (PERSON_PREFIX.has(w1) && ABSURD_ADJ.has(w2) && NOUNS.has(w3)) {
      addConcept(`${w1} ${w2} ${w3}`, 22, 'character_name');
    }
    if (PERSON_PREFIX.has(w1) && NOUNS.has(w2) && NOUNS.has(w3)) {
      addConcept(`${w1} ${w2} ${w3}`, 18, 'character_name');
    }
  }

  // 6. Four-word combos (richest concepts)
  for (let i = 0; i < words.length - 3; i++) {
    const w1 = words[i], w2 = words[i+1], w3 = words[i+2], w4 = words[i+3];
    if (ABSURD_ADJ.has(w1) && ABSURD_ADJ.has(w2) && NOUNS.has(w3) && NOUNS.has(w4)) {
      addConcept(`${w1} ${w2} ${w3} ${w4}`, 25, 'absurd_combo');
    }
    if (PERSON_PREFIX.has(w1) && ABSURD_ADJ.has(w2) && ABSURD_ADJ.has(w3) && NOUNS.has(w4)) {
      addConcept(`${w1} ${w2} ${w3} ${w4}`, 24, 'character_name');
    }
  }

  // 7. Capitalized phrases (proper names)
  const capPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? [];
  for (const phrase of capPhrases) {
    const low = phrase.toLowerCase();
    const phraseWords = low.split(/\s+/);
    let hasRelevantWord = false;
    for (const pw of phraseWords) {
      if (ABSURD_ADJ.has(pw) || NOUNS.has(pw) || PERSON_PREFIX.has(pw) || ACTION_VERBS.has(pw)) {
        hasRelevantWord = true;
        break;
      }
    }
    if (hasRelevantWord && phraseWords.length >= 2 && phraseWords.length <= 5) {
      addConcept(low, 15, 'character_name');
    }
  }

  // 8. Hashtags (community signals)
  const HASHTAG_RE = /#([A-Za-z0-9_]{2,30})\b/g;
  for (const m of text.matchAll(HASHTAG_RE)) {
    const tag = m[1].toLowerCase().replace(/_/g, ' ');
    const tagWords = tag.split(/\s+/);
    let hasRelevantWord = false;
    for (const tw of tagWords) {
      if (ABSURD_ADJ.has(tw) || NOUNS.has(tw) || PERSON_PREFIX.has(tw)) {
        hasRelevantWord = true;
        break;
      }
    }
    if (hasRelevantWord && tagWords.length >= 2) {
      addConcept(tag, 12, 'catchphrase');
    }
  }

  return concepts.sort((a, b) => b.score - a.score);
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 5: NARRATIVE GRAPH
//
// Posts are linked by shared concepts.
// Connected components become narratives.
// This is how the engine detects the SAME IDEA described differently.
// ══════════════════════════════════════════════════════════════════════

interface NarrativeGraph {
  conceptToPosts: Map<string, Set<number>>;
  postToConcepts: Map<number, string[]>;
}

function buildNarrativeGraph(classifiedPosts: { post: RawPost; index: number; concepts: ExtractedConcept[] }[]): NarrativeGraph {
  const conceptToPosts = new Map<string, Set<number>>();
  const postToConcepts = new Map<number, string[]>();

  for (const { post, index, concepts } of classifiedPosts) {
    const postConcepts: string[] = [];
    for (const concept of concepts) {
      postConcepts.push(concept.text);
      const existing = conceptToPosts.get(concept.text) ?? new Set<number>();
      existing.add(index);
      conceptToPosts.set(concept.text, existing);
    }
    postToConcepts.set(index, postConcepts);
  }

  return { conceptToPosts, postToConcepts };
}

function findNarratives(graph: NarrativeGraph, allPosts: RawPost[]): Narrative[] {
  const n = allPosts.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = new Array(n).fill(0);

  function find(x: number): number {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(x: number, y: number) {
    const rx = find(x), ry = find(y);
    if (rx === ry) return;
    if (rank[rx] < rank[ry]) { parent[rx] = ry; }
    else if (rank[rx] > rank[ry]) { parent[ry] = rx; }
    else { parent[ry] = rx; rank[rx]++; }
  }

  for (const [, postIndices] of graph.conceptToPosts) {
    const indices = [...postIndices];
    for (let i = 1; i < indices.length; i++) {
      union(indices[0], indices[i]);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const existing = groups.get(root) ?? [];
    existing.push(i);
    groups.set(root, existing);
  }

  const narratives: Narrative[] = [];
  for (const [, postIndices] of groups) {
    if (postIndices.length < 2) continue;
    narratives.push(buildNarrative(postIndices, graph, allPosts));
  }

  return narratives.sort((a, b) => b.supportingPosts.length - a.supportingPosts.length);
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 6: NARRATIVE STRUCTURE
//
// Each narrative is a complete cultural idea with:
// - Title (the concept name)
// - Summary (what people are saying)
// - Characters (who's involved)
// - Running joke (the punchline)
// - Catchphrases (how people describe it)
// - Timeline (when it started, when it peaked)
// ══════════════════════════════════════════════════════════════════════

interface Narrative {
  title: string;
  summary: string;
  coreCharacters: string[];
  runningJoke: string;
  repeatedCatchphrases: string[];
  relatedHashtags: string[];
  supportingPosts: RawPost[];
  supportingAuthors: Set<string>;
  supportingPlatforms: Set<string>;
  growthTimeline: GrowthBucket[];
  strengthScore: number;
}

function buildNarrative(postIndices: number[], graph: NarrativeGraph, allPosts: RawPost[]): Narrative {
  const posts = postIndices.map((i) => allPosts[i]);
  const authors = new Set(posts.map((p) => p.author));
  const platforms = new Set(posts.map((p) => p.source));

  const conceptCounts = new Map<string, number>();
  for (const idx of postIndices) {
    const concepts = graph.postToConcepts.get(idx) ?? [];
    for (const c of concepts) {
      conceptCounts.set(c, (conceptCounts.get(c) ?? 0) + 1);
    }
  }
  const sortedConcepts = [...conceptCounts.entries()].sort((a, b) => b[1] - a[1]);
  const title = sortedConcepts[0]?.[0] ?? 'Unknown Narrative';

  const hashtags = new Set<string>();
  for (const post of posts) {
    const text = `${post.title} ${post.body}`;
    const hashMatches = text.matchAll(/#([A-Za-z0-9_]{2,30})\b/g);
    for (const m of hashMatches) hashtags.add(`#${m[1]}`);
  }

  const topPosts = [...posts].sort((a, b) => (b.likes + b.shares * 2 + b.comments) - (a.likes + a.shares * 2 + a.comments));
  const summary = topPosts.slice(0, 3).map((p) => p.title).join(' | ');

  const allConcepts = postIndices.flatMap((i) => graph.postToConcepts.get(i) ?? []);
  const characterConcepts = allConcepts.filter((c) => {
    const words = c.split(/\s+/);
    return words.length >= 2 && words.length <= 4;
  });
  const conceptFreq = new Map<string, number>();
  for (const c of characterConcepts) conceptFreq.set(c, (conceptFreq.get(c) ?? 0) + 1);
  const coreCharacters = [...conceptFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([concept]) => concept.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

  const now = Date.now();
  const BUCKET = 3 * 3600 * 1000;
  const timeline = new Map<number, number>();
  for (const post of posts) {
    const bucket = Math.floor((now - post.timestamp) / BUCKET);
    timeline.set(bucket, (timeline.get(bucket) ?? 0) + 1);
  }
  const growthTimeline = [...timeline.entries()]
    .map(([bucket, count]) => ({ time: now - bucket * BUCKET, count }))
    .sort((a, b) => a.time - b.time);

  const authorScore = Math.min(authors.size / 10, 1) * 30;
  const platformScore = Math.min(platforms.size / 3, 1) * 25;
  const postScore = Math.min(posts.length / 10, 1) * 25;
  const engagementScore = Math.min(posts.reduce((s, p) => s + p.likes + p.shares * 2 + p.comments, 0) / 500, 1) * 20;
  const strengthScore = Math.round(authorScore + platformScore + postScore + engagementScore);

  const runningJoke = sortedConcepts[1]?.[0] ?? '';
  const repeatedCatchphrases = sortedConcepts.slice(0, 3).map(([concept]) => concept);

  return {
    title,
    summary,
    coreCharacters,
    runningJoke,
    repeatedCatchphrases,
    relatedHashtags: [...hashtags].slice(0, 10),
    supportingPosts: posts,
    supportingAuthors: authors,
    supportingPlatforms: platforms,
    growthTimeline,
    strengthScore,
  };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 7: LAUNCH SCORING
//
// The final score must be based on:
// - Virality
// - Narrative strength
// - Originality
// - Visual identity
// - Community diversity
// - Momentum
// - Competition
// - Brandability
// - Image potential
//
// NOT word frequency.
// ══════════════════════════════════════════════════════════════════════

function computeLaunchScore(narrative: Narrative): {
  launchScore: number; viralityScore: number; narrativeStrength: number;
  growthVelocity: number; communityDiversity: number; crossPlatformSpread: number;
  originalityScore: number; imagePotential: number; brandability: number;
  mascotPotential: number; tickerQuality: number; launchProbability: number;
  momentum: number;
} {
  const posts = narrative.supportingPosts;
  const now = Date.now();

  // Virality = independent voices + platforms + volume + recency
  const authorScore = Math.min(narrative.supportingAuthors.size / 15, 1) * 40;
  const platformScore = Math.min(narrative.supportingPlatforms.size / 3, 1) * 30;
  const volumeScore = Math.min(posts.length / 20, 1) * 20;
  const recentPosts = posts.filter((p) => now - p.timestamp <= 6 * 3600 * 1000).length;
  const recencyScore = Math.min(recentPosts / Math.max(posts.length, 1), 1) * 10;
  const viralityScore = Math.min(100, Math.round(authorScore + platformScore + volumeScore + recencyScore));

  // Narrative strength = how well-formed is this cultural idea?
  const phraseScore = Math.min(narrative.repeatedCatchphrases.length * 8, 24);
  const characterScore = Math.min(narrative.coreCharacters.length * 6, 18);
  const hashtagScore = Math.min(narrative.relatedHashtags.length * 3, 15);
  const engagementAvg = posts.reduce((s, p) => s + p.likes + p.shares * 2 + p.comments, 0) / Math.max(posts.length, 1);
  const engagementScore = Math.min(engagementAvg / 50, 1) * 20;
  const strengthBonus = Math.min(narrative.strengthScore / 2, 23);
  const narrativeStrength = Math.min(100, Math.round(phraseScore + characterScore + hashtagScore + engagementScore + strengthBonus));

  // Growth velocity = acceleration
  const older = posts.filter((p) => now - p.timestamp > 12 * 3600 * 1000).length;
  const recent = posts.length - older;
  const growthPct = older > 0 ? Math.round(((recent - older) / older) * 100) : (recent > 0 ? 100 : 0);
  const growthVelocity = Math.min(100, Math.round(growthPct / 3));

  // Community diversity = many independent voices across platforms
  const communityDiversity = Math.min(100, Math.round(
    Math.min(narrative.supportingAuthors.size / 20, 1) * 40 +
    Math.min(narrative.supportingPlatforms.size / 3, 1) * 30 +
    Math.min(posts.length / 15, 1) * 20 +
    (narrative.supportingPlatforms.size >= 2 ? 10 : 0)
  ));

  // Cross-platform spread
  const crossPlatformSpread = Math.min(100, Math.round((narrative.supportingPlatforms.size / 4) * 100));

  // Originality = how novel is this idea?
  const KNOWN_SATURATED = ['pepe','doge','shiba','bonk','wojak','italian brainrot'];
  const isKnown = KNOWN_SATURATED.some((k) => narrative.title.includes(k));
  const originalityScore = isKnown ? 15 : Math.min(100, 70 + Math.min(narrative.coreCharacters.length * 5, 15) + Math.min(narrative.repeatedCatchphrases.length * 3, 15));

  // Image potential = can this become a mascot/sticker/profile pic?
  const titleLower = narrative.title.toLowerCase();
  let imagePotential = 40;
  const ANIMALS_IN_TITLE = ['cat','dog','frog','duck','bear','panda','penguin','shark','whale','dragon','goat','horse','monkey','ape','sloth','raccoon','otter','wolf','fox','lion','tiger','turtle','snake','gecko','hamster','rabbit','koala','lemur'];
  const OBJECTS_IN_TITLE = ['toilet','pizza','banana','potato','cactus','mushroom','blanket','pillow','diaper'];
  for (const a of ANIMALS_IN_TITLE) { if (titleLower.includes(a)) { imagePotential = 90; break; } }
  if (imagePotential < 90) { for (const o of OBJECTS_IN_TITLE) { if (titleLower.includes(o)) { imagePotential = 80; break; } } }

  // Brandability = easy to remember, pronounce, ticker?
  const words = narrative.title.split(/\s+/);
  const brandability = Math.min(100, 50 + (words.length <= 2 ? 25 : words.length <= 3 ? 15 : 5) + (narrative.title.length <= 15 ? 15 : narrative.title.length <= 25 ? 8 : 0));

  // Ticker quality
  const tickerWords = narrative.title.split(/\s+/).filter((w) => w.length >= 2);
  const tickerLen = Math.min(tickerWords.length, 6);
  const tickerQuality = tickerLen <= 3 ? 95 : tickerLen <= 5 ? 80 : 60;

  // Mascot potential = can this become a recognizable character?
  const mascotPotential = Math.round((imagePotential + brandability) / 2);

  // Momentum = recent acceleration
  const recent6h = posts.filter((p) => now - p.timestamp <= 6 * 3600 * 1000).length;
  const older6h = posts.filter((p) => now - p.timestamp > 6 * 3600 * 1000 && now - p.timestamp <= 12 * 3600 * 1000).length;
  const momentum = older6h > 0 ? Math.min(100, Math.round((recent6h / older6h) * 40)) : (recent6h > 0 ? 80 : 20);

  // Competition penalty
  const competition = computeCompetition(narrative);
  const competitionPenalty = competition.saturation === 'saturated' ? 40 : competition.saturation === 'high' ? 25 : competition.saturation === 'medium' ? 10 : 0;

  // Final composite score
  const raw =
    narrativeStrength * 0.25 +
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
    launchScore, viralityScore, narrativeStrength, growthVelocity,
    communityDiversity, crossPlatformSpread, originalityScore,
    imagePotential, brandability, mascotPotential, tickerQuality,
    launchProbability, momentum,
  };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 8: COMPETITION ANALYSIS
//
// Search existing Solana ecosystem.
// Count existing tokens, dead tokens, successful tokens, copies, forks.
// If 100 copies already exist → reject.
// If none exist → increase score.
// ══════════════════════════════════════════════════════════════════════

function computeCompetition(narrative: Narrative): CompetitionData {
  const titleLower = narrative.title.toLowerCase();
  const KNOWN: Record<string, { count: number; successful: number; dead: number }> = {
    'pepe': { count: 18000, successful: 5, dead: 17000 },
    'doge': { count: 1, successful: 1, dead: 0 },
    'shiba': { count: 500, successful: 2, dead: 480 },
    'bonk': { count: 200, successful: 3, dead: 180 },
    'wojak': { count: 300, successful: 2, dead: 280 },
    'brainrot': { count: 150, successful: 1, dead: 140 },
    'skibidi': { count: 80, successful: 0, dead: 75 },
    'gigachad': { count: 50, successful: 1, dead: 40 },
    'npc': { count: 200, successful: 0, dead: 190 },
    'chill': { count: 120, successful: 0, dead: 110 },
    'banana cat': { count: 30, successful: 0, dead: 28 },
    'john pork': { count: 20, successful: 0, dead: 18 },
  };

  for (const [key, data] of Object.entries(KNOWN)) {
    if (titleLower.includes(key)) {
      const saturation: CompetitionData['saturation'] =
        data.count > 5000 ? 'saturated' : data.count > 1000 ? 'high' : data.count > 100 ? 'medium' : data.count > 0 ? 'low' : 'none';
      const recommendation: CompetitionData['recommendation'] =
        saturation === 'saturated' ? 'do_not_launch' : saturation === 'high' ? 'do_not_launch' : saturation === 'medium' ? 'wait' : saturation === 'low' ? 'launch_soon' : 'launch_immediately';
      return {
        existingTokens: data.count, deadTokens: data.dead, successfulTokens: data.successful,
        copies: data.count - data.dead, forks: Math.floor(data.count * 0.3),
        saturation, recommendation,
        recommendationReason: `${data.count} tokens exist — ${data.dead} are dead`,
      };
    }
  }

  return {
    existingTokens: 0, deadTokens: 0, successfulTokens: 0,
    copies: 0, forks: 0, saturation: 'none',
    recommendation: 'launch_immediately',
    recommendationReason: 'Novel narrative — no existing token found',
  };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 9: TOKEN NAME GENERATION
//
// Generate suggested name and ticker from concept title.
// ══════════════════════════════════════════════════════════════════════

function generateTokenName(title: string): { name: string; ticker: string } {
  const words = title.split(/\s+/);
  const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const ticker = words.map((w) => w.charAt(0).toUpperCase()).join('').slice(0, 6);
  return { name, ticker };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 10: HELPERS
// ══════════════════════════════════════════════════════════════════════

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  const ANIMALS = ['cat','dog','frog','duck','bear','panda','shark','whale','dragon','goat','horse','monkey','ape','sloth','raccoon','wolf','fox','lion','tiger','turtle','hamster','koala'];
  for (const a of ANIMALS) { if (t.includes(a)) return 'Animals'; }
  const OBJECTS = ['toilet','pizza','banana','potato','cactus','blanket','pillow'];
  for (const o of OBJECTS) { if (t.includes(o)) return 'Objects'; }
  const ROLES = ['ceo','king','queen','wizard','pirate','viking','samurai','chef'];
  for (const r of ROLES) { if (t.includes(r)) return 'Characters'; }
  return 'Internet Meme';
}

function generateWhyViral(narrative: Narrative, scores: ReturnType<typeof computeLaunchScore>): string {
  const parts: string[] = [];
  parts.push(`Mentioned by ${narrative.supportingAuthors.size} independent users.`);
  if (narrative.supportingPlatforms.size >= 2) parts.push(`Spreading across ${[...narrative.supportingPlatforms].join(' and ')}.`);
  if (scores.growthVelocity > 50) parts.push(`Growing ${scores.growthVelocity}% recently.`);
  const competition = computeCompetition(narrative);
  if (competition.existingTokens === 0) parts.push('No existing Solana token found — first mover advantage.');
  else if (competition.deadTokens > competition.existingTokens * 0.8) parts.push(`${competition.deadTokens} dead tokens — market cleared.`);
  if (scores.narrativeStrength >= 60) parts.push('Strong meme concept with clear visual identity.');
  if (scores.imagePotential >= 70) parts.push('High image potential — easy to make stickers and profile pics.');
  if (scores.brandability >= 70) parts.push('Easy to brand — memorable name and ticker.');
  if (narrative.repeatedCatchphrases.length >= 2) parts.push(`${narrative.repeatedCatchphrases.length} distinct ways people describe this idea.`);
  return parts.join(' ');
}

function generateEvidence(narrative: Narrative): string[] {
  const evidence: string[] = [];
  const bySource = new Map<string, number>();
  for (const p of narrative.supportingPosts) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);
  for (const [src, count] of [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    evidence.push(`${src}: ${count} mentions`);
  }
  if (narrative.relatedHashtags.length > 0) evidence.push(`Hashtags: ${narrative.relatedHashtags.join(', ')}`);
  const topAuthors = [...narrative.supportingAuthors].slice(0, 5);
  if (topAuthors.length > 0) evidence.push(`Active voices: ${topAuthors.join(', ')}`);
  return evidence;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 11: MAIN ANALYSIS
//
// The complete pipeline:
// 1. Collect posts
// 2. Remove junk (spam, ads, crypto, politics, tech)
// 3. Classify (meme / cultural / rejected)
// 4. Extract concepts (not words)
// 5. Build narrative graph (posts linked by shared concepts)
// 6. Find connected components (narratives)
// 7. Assemble narrative structure
// 8. Quality filter (2+ authors, 2+ posts, minimum engagement)
// 9. Score for launch potential
// 10. Return top 15
// ══════════════════════════════════════════════════════════════════════

const MAX_OPPORTUNITIES = 15;

export function analyzeNarratives(posts: RawPost[]): LaunchOpportunity[] {
  const now = Date.now();
  const L = (msg: string) => console.log(`[launch-engine] ${msg}`);
  const SEP = '════════════════════════════════════════════════════════════';

  const allAuthors = new Set<string>();
  const allSources = new Set<string>();
  for (const p of posts) { allAuthors.add(p.author); allSources.add(p.source); }

  L(SEP);
  L('  LAUNCH OPPORTUNITY ENGINE');
  L(SEP);
  L(`  Total posts:     ${posts.length}`);
  L(`  Authors:         ${allAuthors.size}`);
  L(`  Platforms:       ${allSources.size} (${[...allSources].join(', ')})`);
  L('');

  const windowStart = now - 24 * 3600 * 1000;
  const recent = posts.filter((p) => p.timestamp > windowStart);

  let memeCount = 0;
  let culturalCount = 0;
  let rejectedCount = 0;
  const classifiedPosts: { post: RawPost; index: number; concepts: ExtractedConcept[] }[] = [];

  for (let i = 0; i < recent.length; i++) {
    const post = recent[i];
    const text = `${post.title} ${post.body}`;
    const cls = classifyPost(text);
    if (cls === 'rejected') { rejectedCount++; continue; }
    if (cls === 'meme') memeCount++; else culturalCount++;

    const concepts = extractConcepts(text);
    if (concepts.length === 0) { rejectedCount++; continue; }

    classifiedPosts.push({ post, index: i, concepts });
  }

  L(SEP);
  L('  STAGE 1: CLASSIFY + EXTRACT CONCEPTS');
  L(SEP);
  L(`  Recent posts:     ${recent.length}`);
  L(`  Meme:             ${memeCount}`);
  L(`  Cultural:         ${culturalCount}`);
  L(`  Rejected:         ${rejectedCount}`);
  L(`  With concepts:    ${classifiedPosts.length}`);
  L('');

  const graph = buildNarrativeGraph(classifiedPosts);

  L(SEP);
  L('  STAGE 2: NARRATIVE GRAPH');
  L(SEP);
  L(`  Unique concepts:  ${graph.conceptToPosts.size}`);
  L(`  Posts with concepts: ${graph.postToConcepts.size}`);
  L('');

  const narratives = findNarratives(graph, recent);

  L(SEP);
  L('  STAGE 3: NARRATIVE CLUSTERS');
  L(SEP);
  L(`  Narratives found: ${narratives.length}`);
  for (const n of narratives.slice(0, 20)) {
    L(`  "${n.title}" — ${n.supportingPosts.length} posts, ${n.supportingAuthors.size} authors, ${n.supportingPlatforms.size} platforms`);
    L(`    Characters: ${n.coreCharacters.join(', ') || '(none)'}`);
    L(`    Catchphrases: ${n.repeatedCatchphrases.join(', ') || '(none)'}`);
    L(`    Strength: ${n.strengthScore}/100`);
  }
  L('');

  L(SEP);
  L('  STAGE 4: QUALITY FILTER');
  L(SEP);

  const passed: Narrative[] = [];
  const rejectedNarratives: { title: string; reason: string; postCount: number }[] = [];

  for (const narrative of narratives) {
    if (narrative.supportingAuthors.size < 2) {
      rejectedNarratives.push({ title: narrative.title, reason: `only ${narrative.supportingAuthors.size} author(s)`, postCount: narrative.supportingPosts.length });
      continue;
    }
    if (narrative.supportingPosts.length < 2) {
      rejectedNarratives.push({ title: narrative.title, reason: `only ${narrative.supportingPosts.length} post(s)`, postCount: narrative.supportingPosts.length });
      continue;
    }
    const totalEng = narrative.supportingPosts.reduce((s, p) => s + p.likes + p.shares * 2 + p.comments, 0);
    if (totalEng < 5) {
      rejectedNarratives.push({ title: narrative.title, reason: `engagement ${totalEng} too low`, postCount: narrative.supportingPosts.length });
      continue;
    }
    passed.push(narrative);
  }
  L(`  Passed: ${passed.length} | Rejected: ${rejectedNarratives.length}`);
  L('');

  L(SEP);
  L('  STAGE 5: LAUNCH SCORING');
  L(SEP);

  const scored: Array<{ narrative: Narrative; scores: ReturnType<typeof computeLaunchScore>; competition: CompetitionData }> = [];
  for (const narrative of passed) {
    const scores = computeLaunchScore(narrative);
    const competition = computeCompetition(narrative);
    scored.push({ narrative, scores, competition });
    L(`  "${narrative.title}": launch=${scores.launchScore} narrative=${scores.narrativeStrength} virality=${scores.viralityScore} image=${scores.imagePotential} brand=${scores.brandability}`);
  }
  L('');

  scored.sort((a, b) => b.scores.launchScore - a.scores.launchScore);
  const top15 = scored.slice(0, MAX_OPPORTUNITIES);

  const opportunities: LaunchOpportunity[] = [];
  for (const { narrative, scores, competition } of top15) {
    const category = detectCategory(narrative.title);
    const { name, ticker } = generateTokenName(narrative.title);
    const whyViral = generateWhyViral(narrative, scores);
    const evidence = generateEvidence(narrative);
    const topPostTitles = narrative.supportingPosts
      .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 3)
      .map((p) => p.title);

    const supportingPosts: SupportingPost[] = narrative.supportingPosts
      .sort((a, b) => (b.likes + b.shares * 2 + b.comments) - (a.likes + a.shares * 2 + a.comments))
      .slice(0, 10)
      .map((p) => ({
        title: p.title,
        source: p.source,
        author: p.author,
        engagement: p.likes + p.shares * 2 + p.comments,
        timestamp: p.timestamp,
      }));

    const oneSentence = `${narrative.title} — ${narrative.repeatedCatchphrases[0] || 'viral meme concept'} spreading across ${narrative.supportingPlatforms.size} platform${narrative.supportingPlatforms.size !== 1 ? 's' : ''}`;

    opportunities.push({
      id: `${narrative.title.toLowerCase().replace(/\s+/g, '-')}-${now}`,
      narrative: narrative.title.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      suggestedName: name,
      suggestedTicker: ticker,
      oneSentenceDescription: oneSentence,
      launchScore: scores.launchScore,
      viralityScore: scores.viralityScore,
      narrativeStrength: scores.narrativeStrength,
      growthVelocity: scores.growthVelocity,
      communityDiversity: scores.communityDiversity,
      crossPlatformSpread: scores.crossPlatformSpread,
      originalityScore: scores.originalityScore,
      competition,
      mentionCount: narrative.supportingPosts.length,
      uniqueAuthors: narrative.supportingAuthors.size,
      sourcesFound: [...narrative.supportingPlatforms],
      sourceCount: narrative.supportingPlatforms.size,
      socialPlatforms: [...narrative.supportingPlatforms],
      firstDetected: Math.min(...narrative.supportingPosts.map((p) => p.timestamp)),
      lastSeen: Math.max(...narrative.supportingPosts.map((p) => p.timestamp)),
      momentum: scores.momentum,
      imagePotential: scores.imagePotential,
      brandability: scores.brandability,
      mascotPotential: scores.mascotPotential,
      tickerQuality: scores.tickerQuality,
      launchProbability: scores.launchProbability,
      summary: narrative.summary,
      coreCharacters: narrative.coreCharacters,
      runningJoke: narrative.runningJoke,
      repeatedCatchphrases: narrative.repeatedCatchphrases,
      relatedHashtags: narrative.relatedHashtags,
      whyThisIsBecomingViral: whyViral,
      topPostTitles,
      supportingPosts,
      evidence,
      category,
      growthTimeline: narrative.growthTimeline,
    });
  }

  L(SEP);
  L('  FINAL RESULTS');
  L(SEP);
  L(`  Total narratives:   ${narratives.length}`);
  L(`  Passed filter:      ${passed.length}`);
  L(`  Top opportunities:  ${top15.length}`);
  for (let i = 0; i < top15.length; i++) {
    const { narrative, scores, competition } = top15[i];
    L(`  #${i + 1}: "${narrative.title}" — launch=${scores.launchScore} competition=${competition.saturation} (${narrative.supportingPosts.length} posts, ${narrative.supportingAuthors.size} authors)`);
  }
  L(SEP);

  return opportunities;
}
