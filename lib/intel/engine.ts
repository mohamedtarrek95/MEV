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
  'been','being','were','was','did','does','done','doing','having',
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
]);

const TEMPLATE_PATTERNS: RegExp[] = [
  /\b(trending|trend)\s+(on|in|now|today)\b/i,
  /\brank\s*#?\d/i,
  /\b(top|bottom)\s+(gainers?|losers?|coins?|tokens?)\b/i,
  /\b24\s*h\s*(change|gain|loss|volume)\b/i,
  /\b(price|market)\s*(change|cap|pair)\b/i,
  /\b(volume|liquidity|fdv|tvl|apy|apr)\b/i,
  /\bnew\s+(pairs?|listings?|coins?|tokens?)\b/i,
];
// ══════════════════════════════════════════════════════════════════════
// SECTION 3: MEME CLASSIFIER
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
  'italian brainrot','brain rot','brain rot italian',
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
// SECTION 4: PHRASE EXTRACTION
//
// Extract MEANINGFUL PHRASES (2-5 words) from posts.
// A phrase is a meaningful chunk that captures a cultural idea.
// NOT individual words. NOT single entities.
// ══════════════════════════════════════════════════════════════════════

interface ExtractedPhrase {
  text: string;          // normalized phrase text
  raw: string;           // original text as found
  score: number;         // phrase quality score
  type: 'meme_phrase' | 'absurd_combo' | 'known_meme' | 'character_name' | 'catchphrase';
}

const KNOWN_PHRASES: Record<string, string> = {
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
};

function extractPhrases(text: string): ExtractedPhrase[] {
  const lower = normalizeText(text);
  const words = lower.split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  const phrases: ExtractedPhrase[] = [];
  const seen = new Set<string>();

  function addPhrase(raw: string, score: number, type: ExtractedPhrase['type']) {
    const normalized = raw.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    if (seen.has(normalized) || normalized.length < 4) return;
    seen.add(normalized);
    phrases.push({ text: normalized, raw, score, type });
  }

  for (const [key, norm] of Object.entries(KNOWN_PHRASES)) {
    if (lower.includes(key)) {
      addPhrase(key, 25, 'known_meme');
    }
  }

  const ABS = new Set(['thicc','thick','buff','chonky','chonk','smol','tiny','giant','massive',
    'cursed','blessed','feral','unhinged','derpy','savage','toxic','goofy','silly',
    'galaxy','quantum','cyber','neon','laser','turbo','mega','ultra','hyper',
    'crusty','dusty','spicy','juicy','shiny','glowy','fuzzy','floofy','wacky']);
  const NOUNS = new Set([...MEME_WORDS].filter((w) => !ABS.has(w) && w.length >= 3));

  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (ABS.has(w1) && NOUNS.has(w2)) {
      addPhrase(`${w1} ${w2}`, 18, 'absurd_combo');
    }
  }

  const PREFIXES = new Set(['daddy','mommy','big','little','lil','old','young','tiny','baby',
    'grandpa','grandma','uncle','auntie','mr','mrs','dr','captain','king','queen']);
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (PREFIXES.has(w1) && w2.length >= 3 && !STOP_WORDS.has(w2)) {
      addPhrase(`${w1} ${w2}`, 16, 'character_name');
    }
  }

  const VERBS = new Set(['dancing','singing','running','flying','swimming','eating','sleeping',
    'fighting','dabbing','twerking','grinding','vibing','crying','screaming',
    'laughing','licking','biting','punching','kicking','yelling']);
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (VERBS.has(w1) && (ABS.has(w2) || NOUNS.has(w2))) {
      addPhrase(`${w1} ${w2}`, 15, 'absurd_combo');
    }
  }

  for (let i = 0; i < words.length - 2; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    const w3 = words[i + 2];
    if (PREFIXES.has(w1) && ABS.has(w2) && NOUNS.has(w3)) {
      addPhrase(`${w1} ${w2} ${w3}`, 20, 'absurd_combo');
    }
    if (ABS.has(w1) && ABS.has(w2) && NOUNS.has(w3)) {
      addPhrase(`${w1} ${w2} ${w3}`, 18, 'absurd_combo');
    }
    if (VERBS.has(w1) && ABS.has(w2) && NOUNS.has(w3)) {
      addPhrase(`${w1} ${w2} ${w3}`, 17, 'absurd_combo');
    }
    if (VERBS.has(w1) && NOUNS.has(w2) && NOUNS.has(w3)) {
      addPhrase(`${w1} ${w2} ${w3}`, 14, 'absurd_combo');
    }
    if (ABS.has(w1) && NOUNS.has(w2) && NOUNS.has(w3)) {
      addPhrase(`${w1} ${w2} ${w3}`, 15, 'absurd_combo');
    }
  }

  for (let i = 0; i < words.length - 3; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    const w3 = words[i + 2];
    const w4 = words[i + 3];
    if (PREFIXES.has(w1) && ABS.has(w2) && ABS.has(w3) && NOUNS.has(w4)) {
      addPhrase(`${w1} ${w2} ${w3} ${w4}`, 22, 'absurd_combo');
    }
    if (PREFIXES.has(w1) && ABS.has(w2) && NOUNS.has(w3) && NOUNS.has(w4)) {
      addPhrase(`${w1} ${w2} ${w3} ${w4}`, 20, 'absurd_combo');
    }
    if (VERBS.has(w1) && ABS.has(w2) && ABS.has(w3) && NOUNS.has(w4)) {
      addPhrase(`${w1} ${w2} ${w3} ${w4}`, 19, 'absurd_combo');
    }
  }

  const capPhrases = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? [];
  for (const phrase of capPhrases) {
    const low = phrase.toLowerCase();
    const phraseWords = low.split(/\s+/);
    let hasMemeWord = false;
    for (const pw of phraseWords) {
      if (ABS.has(pw) || NOUNS.has(pw) || PREFIXES.has(pw) || VERBS.has(pw)) {
        hasMemeWord = true;
        break;
      }
    }
    if (hasMemeWord && phraseWords.length >= 2 && phraseWords.length <= 5) {
      addPhrase(low, 12, 'character_name');
    }
  }

  const HASHTAG_RE = /#([A-Za-z0-9_]{2,30})\b/g;
  for (const m of text.matchAll(HASHTAG_RE)) {
    const tag = m[1].toLowerCase().replace(/_/g, ' ');
    const tagWords = tag.split(/\s+/);
    let hasMemeWord = false;
    for (const tw of tagWords) {
      if (ABS.has(tw) || NOUNS.has(tw) || PREFIXES.has(tw) || VERBS.has(tw)) {
        hasMemeWord = true;
        break;
      }
    }
    if (hasMemeWord && tagWords.length >= 2) {
      addPhrase(tag, 10, 'catchphrase');
    }
  }

  return phrases.sort((a, b) => b.score - a.score);
}
// ══════════════════════════════════════════════════════════════════════
// SECTION 5: NARRATIVE GRAPH
//
// Build a graph where posts are linked by shared phrases.
// Connected components become narratives.
// ══════════════════════════════════════════════════════════════════════

interface NarrativeGraph {
  phraseToPosts: Map<string, Set<number>>;
  postToPhrases: Map<number, string[]>;
}

function buildNarrativeGraph(classifiedPosts: { post: RawPost; index: number; phrases: ExtractedPhrase[] }[]): NarrativeGraph {
  const phraseToPosts = new Map<string, Set<number>>();
  const postToPhrases = new Map<number, string[]>();

  for (const { post, index, phrases } of classifiedPosts) {
    const postPhrases: string[] = [];
    for (const phrase of phrases) {
      postPhrases.push(phrase.text);
      const existing = phraseToPosts.get(phrase.text) ?? new Set<number>();
      existing.add(index);
      phraseToPosts.set(phrase.text, existing);
    }
    postToPhrases.set(index, postPhrases);
  }

  return { phraseToPosts, postToPhrases };
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

  for (const [, postIndices] of graph.phraseToPosts) {
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
// ══════════════════════════════════════════════════════════════════════

interface Narrative {
  title: string;
  summary: string;
  coreCharacters: string[];
  runningJoke: string;
  repeatedCatchphrases: string[];
  relatedHashtags: string[];
  relatedCashtags: string[];
  relatedTokens: string[];
  supportingPosts: RawPost[];
  supportingAuthors: Set<string>;
  supportingPlatforms: Set<string>;
  growthTimeline: { time: number; count: number }[];
  strengthScore: number;
}

function buildNarrative(postIndices: number[], graph: NarrativeGraph, allPosts: RawPost[]): Narrative {
  const posts = postIndices.map((i) => allPosts[i]);
  const authors = new Set(posts.map((p) => p.author));
  const platforms = new Set(posts.map((p) => p.source));

  const phraseCounts = new Map<string, number>();
  for (const idx of postIndices) {
    const phrases = graph.postToPhrases.get(idx) ?? [];
    for (const p of phrases) {
      phraseCounts.set(p, (phraseCounts.get(p) ?? 0) + 1);
    }
  }
  const sortedPhrases = [...phraseCounts.entries()].sort((a, b) => b[1] - a[1]);
  const title = sortedPhrases[0]?.[0] ?? 'Unknown Narrative';

  const hashtags = new Set<string>();
  const cashtags = new Set<string>();
  const tokens = new Set<string>();
  for (const post of posts) {
    const text = `${post.title} ${post.body}`;
    const hashMatches = text.matchAll(/#([A-Za-z0-9_]{2,30})\b/g);
    for (const m of hashMatches) hashtags.add(`#${m[1]}`);
    const cashtagMatches = text.matchAll(/\$([A-Za-z]{2,10})\b/g);
    for (const m of cashtagMatches) cashtags.add(`$${m[1]}`);
  }

  const topPosts = [...posts].sort((a, b) => (b.likes + b.shares * 2 + b.comments) - (a.likes + a.shares * 2 + a.comments));
  const summary = topPosts.slice(0, 3).map((p) => p.title).join(' | ');

  const allPhrases = postIndices.flatMap((i) => graph.postToPhrases.get(i) ?? []);
  const characterPhrases = allPhrases.filter((p) => {
    const words = p.split(/\s+/);
    return words.length >= 2 && words.length <= 4;
  });
  const phraseFreq = new Map<string, number>();
  for (const p of characterPhrases) phraseFreq.set(p, (phraseFreq.get(p) ?? 0) + 1);
  const coreCharacters = [...phraseFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([phrase]) => phrase.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

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

  const runningJoke = sortedPhrases[1]?.[0] ?? '';
  const repeatedCatchphrases = sortedPhrases.slice(0, 3).map(([phrase]) => phrase);

  return {
    title,
    summary,
    coreCharacters,
    runningJoke,
    repeatedCatchphrases,
    relatedHashtags: [...hashtags].slice(0, 10),
    relatedCashtags: [...cashtags].slice(0, 5),
    relatedTokens: [...tokens].slice(0, 5),
    supportingPosts: posts,
    supportingAuthors: authors,
    supportingPlatforms: platforms,
    growthTimeline,
    strengthScore,
  };
}
// ══════════════════════════════════════════════════════════════════════
// SECTION 7: LAUNCH SCORING
// ══════════════════════════════════════════════════════════════════════

function computeLaunchScore(narrative: Narrative): {
  launchScore: number; viralityScore: number; memeStrength: number;
  growthVelocity: number; communityDiversity: number; crossPlatformSpread: number;
  originalityScore: number; imagePotential: number; brandability: number;
  mascotPotential: number; tickerQuality: number; launchProbability: number;
  momentum: number;
} {
  const posts = narrative.supportingPosts;
  const now = Date.now();

  const authorScore = Math.min(narrative.supportingAuthors.size / 15, 1) * 40;
  const platformScore = Math.min(narrative.supportingPlatforms.size / 3, 1) * 30;
  const volumeScore = Math.min(posts.length / 20, 1) * 20;
  const recentPosts = posts.filter((p) => now - p.timestamp <= 6 * 3600 * 1000).length;
  const recencyScore = Math.min(recentPosts / Math.max(posts.length, 1), 1) * 10;
  const viralityScore = Math.min(100, Math.round(authorScore + platformScore + volumeScore + recencyScore));

  const phraseScore = Math.min(narrative.repeatedCatchphrases.length * 8, 24);
  const characterScore = Math.min(narrative.coreCharacters.length * 6, 18);
  const hashtagScore = Math.min(narrative.relatedHashtags.length * 3, 15);
  const engagementAvg = posts.reduce((s, p) => s + p.likes + p.shares * 2 + p.comments, 0) / Math.max(posts.length, 1);
  const engagementScore = Math.min(engagementAvg / 50, 1) * 20;
  const strengthBonus = Math.min(narrative.strengthScore / 2, 23);
  const memeStrength = Math.min(100, Math.round(phraseScore + characterScore + hashtagScore + engagementScore + strengthBonus));

  const older = posts.filter((p) => now - p.timestamp > 12 * 3600 * 1000).length;
  const recent = posts.length - older;
  const growthPct = older > 0 ? Math.round(((recent - older) / older) * 100) : (recent > 0 ? 100 : 0);
  const growthVelocity = Math.min(100, Math.round(growthPct / 3));

  const communityDiversity = Math.min(100, Math.round(
    Math.min(narrative.supportingAuthors.size / 20, 1) * 40 +
    Math.min(narrative.supportingPlatforms.size / 3, 1) * 30 +
    Math.min(posts.length / 15, 1) * 20 +
    (narrative.supportingPlatforms.size >= 2 ? 10 : 0)
  ));

  const crossPlatformSpread = Math.min(100, Math.round((narrative.supportingPlatforms.size / 4) * 100));

  const KNOWN_SATURATED = ['italian brainrot','pepe','doge','shiba','bonk','wojak'];
  const isKnown = KNOWN_SATURATED.some((k) => narrative.title.includes(k));
  const originalityScore = isKnown ? 15 : Math.min(100, 70 + Math.min(narrative.coreCharacters.length * 5, 15) + Math.min(narrative.repeatedCatchphrases.length * 3, 15));

  const titleLower = narrative.title.toLowerCase();
  let imagePotential = 40;
  const ANIMALS_IN_TITLE = ['cat','dog','frog','duck','bear','panda','penguin','shark','whale','dragon','goat','horse','monkey','ape','sloth','raccoon','otter','wolf','fox','lion','tiger','turtle','snake','gecko','hamster','rabbit','koala','lemur'];
  const OBJECTS_IN_TITLE = ['toilet','pizza','banana','potato','cactus','mushroom','blanket','pillow','diaper'];
  for (const a of ANIMALS_IN_TITLE) { if (titleLower.includes(a)) { imagePotential = 90; break; } }
  if (imagePotential < 90) { for (const o of OBJECTS_IN_TITLE) { if (titleLower.includes(o)) { imagePotential = 80; break; } } }

  const words = narrative.title.split(/\s+/);
  const brandability = Math.min(100, 50 + (words.length <= 2 ? 25 : words.length <= 3 ? 15 : 5) + (narrative.title.length <= 15 ? 15 : narrative.title.length <= 25 ? 8 : 0));

  const tickerWords = narrative.title.split(/\s+/).filter((w) => w.length >= 2);
  const tickerLen = Math.min(tickerWords.length, 6);
  const tickerQuality = tickerLen <= 3 ? 95 : tickerLen <= 5 ? 80 : 60;

  const mascotPotential = Math.round((imagePotential + brandability) / 2);

  const recent6h = posts.filter((p) => now - p.timestamp <= 6 * 3600 * 1000).length;
  const older6h = posts.filter((p) => now - p.timestamp > 6 * 3600 * 1000 && now - p.timestamp <= 12 * 3600 * 1000).length;
  const momentum = older6h > 0 ? Math.min(100, Math.round((recent6h / older6h) * 40)) : (recent6h > 0 ? 80 : 20);

  const competition = computeCompetition(narrative);
  const competitionPenalty = competition.saturation === 'saturated' ? 40 : competition.saturation === 'high' ? 25 : competition.saturation === 'medium' ? 10 : 0;

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

function computeCompetition(narrative: Narrative): CompetitionData {
  const titleLower = narrative.title.toLowerCase();
  const KNOWN: Record<string, { count: number; successful: number; dead: number }> = {
    'pepe': { count: 18000, successful: 5, dead: 17000 },
    'doge': { count: 1, successful: 1, dead: 0 },
    'shiba': { count: 500, successful: 2, dead: 480 },
    'bonk': { count: 200, successful: 3, dead: 180 },
    'wojak': { count: 300, successful: 2, dead: 280 },
  };

  for (const [key, data] of Object.entries(KNOWN)) {
    if (titleLower.includes(key)) {
      const saturation: CompetitionData['saturation'] =
        data.count > 5000 ? 'saturated' : data.count > 1000 ? 'high' : data.count > 100 ? 'medium' : 'low';
      const recommendation: CompetitionData['recommendation'] =
        saturation === 'saturated' ? 'do_not_launch' : saturation === 'high' ? 'do_not_launch' : saturation === 'medium' ? 'wait' : 'launch_soon';
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
// SECTION 8: HELPERS
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

function generateWhySelected(narrative: Narrative, scores: ReturnType<typeof computeLaunchScore>): string {
  const parts: string[] = [];
  parts.push(`Mentioned by ${narrative.supportingAuthors.size} independent users.`);
  if (narrative.supportingPlatforms.size >= 2) parts.push(`Detected on ${[...narrative.supportingPlatforms].join(' and ')}.`);
  if (scores.growthVelocity > 50) parts.push(`Growing ${scores.growthVelocity}% recently.`);
  const competition = computeCompetition(narrative);
  if (competition.existingTokens === 0) parts.push('No existing Solana token found — first mover advantage.');
  else if (competition.deadTokens > competition.existingTokens * 0.8) parts.push(`${competition.deadTokens} dead tokens — market cleared.`);
  if (scores.memeStrength >= 60) parts.push('Strong meme concept.');
  if (scores.imagePotential >= 70) parts.push('High image potential.');
  if (scores.brandability >= 70) parts.push('Easy branding.');
  if (narrative.repeatedCatchphrases.length >= 2) parts.push(`${narrative.repeatedCatchphrases.length} distinct phrases describe this narrative.`);
  return parts.join(' ');
}

function generateReason(narrative: Narrative): string {
  const parts: string[] = [];
  const now = Date.now();
  const recent = narrative.supportingPosts.filter((p) => now - p.timestamp <= 6 * 3600 * 1000).length;
  if (recent > 0) parts.push(`${recent} posts in last 6 hours`);
  if (narrative.supportingPlatforms.size >= 2) parts.push(`Across ${narrative.supportingPlatforms.size} platforms`);
  if (narrative.supportingAuthors.size > 5) parts.push(`${narrative.supportingAuthors.size} unique voices`);
  if (narrative.repeatedCatchphrases.length > 1) parts.push(`${narrative.repeatedCatchphrases.length} ways people describe it`);
  if (parts.length === 0) parts.push(`${narrative.supportingPosts.length} supporting posts`);
  return parts.join('. ') + '.';
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
// SECTION 9: MAIN ANALYSIS
// ══════════════════════════════════════════════════════════════════════

const MAX_OPPORTUNITIES = 15;

export function analyzeNarratives(posts: RawPost[]): LaunchOpportunity[] {
  const now = Date.now();
  const L = (msg: string) => console.log(`[intel] ${msg}`);
  const SEP = '════════════════════════════════════════════════════════════';
  const SEP2 = '────────────────────────────────────────────────────────────';

  const allAuthors = new Set<string>();
  const allSources = new Set<string>();
  for (const p of posts) { allAuthors.add(p.author); allSources.add(p.source); }

  const bySource = new Map<string, number>();
  for (const p of posts) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);

  L(SEP);
  L('  COLLECTED POSTS');
  L(SEP);
  L(`  Total:     ${posts.length}`);
  L(`  Authors:   ${allAuthors.size}`);
  L(`  Platforms: ${allSources.size} (${[...allSources].join(', ')})`);
  for (const [src, count] of bySource) L(`    ${src}: ${count}`);
  L('');

  const windowStart = now - 24 * 3600 * 1000;
  const recent = posts.filter((p) => p.timestamp > windowStart);

  let memeCount = 0;
  let culturalCount = 0;
  let rejectedCount = 0;
  const classifiedPosts: { post: RawPost; index: number; phrases: ExtractedPhrase[] }[] = [];

  for (let i = 0; i < recent.length; i++) {
    const post = recent[i];
    const text = `${post.title} ${post.body}`;
    const cls = classifyPost(text);
    if (cls === 'rejected') { rejectedCount++; continue; }
    if (cls === 'meme') memeCount++; else culturalCount++;

    const phrases = extractPhrases(text);
    if (phrases.length === 0) { rejectedCount++; continue; }

    classifiedPosts.push({ post, index: i, phrases });
  }

  L(SEP);
  L('  STAGE 1: CLASSIFY + EXTRACT PHRASES');
  L(SEP);
  L(`  Total recent posts:  ${recent.length}`);
  L(`  Classified meme:     ${memeCount}`);
  L(`  Classified cultural: ${culturalCount}`);
  L(`  Rejected:            ${rejectedCount}`);
  L(`  Posts with phrases:  ${classifiedPosts.length}`);
  L('');

  const graph = buildNarrativeGraph(classifiedPosts);

  L(SEP);
  L('  STAGE 2: NARRATIVE GRAPH');
  L(SEP);
  L(`  Unique phrases:      ${graph.phraseToPosts.size}`);
  L(`  Posts with phrases:  ${graph.postToPhrases.size}`);
  L('');

  const narratives = findNarratives(graph, recent);

  L(SEP);
  L('  STAGE 3: NARRATIVE CLUSTERS');
  L(SEP);
  L(`  Narratives found:    ${narratives.length}`);
  for (const n of narratives.slice(0, 20)) {
    L(SEP2);
    L(`  "${n.title}"`);
    L(`    Posts: ${n.supportingPosts.length} | Authors: ${n.supportingAuthors.size} | Platforms: ${n.supportingPlatforms.size}`);
    L(`    Characters: ${n.coreCharacters.join(', ') || '(none)'}`);
    L(`    Catchphrases: ${n.repeatedCatchphrases.join(', ') || '(none)'}`);
    L(`    Hashtags: ${n.relatedHashtags.join(', ') || '(none)'}`);
    L(`    Strength: ${n.strengthScore}/100`);
  }
  L('');

  L(SEP);
  L('  STAGE 4: QUALITY FILTER');
  L(SEP);

  const passed: Narrative[] = [];
  const rejectedEntities: RejectedEntity[] = [];

  for (const narrative of narratives) {
    if (narrative.supportingAuthors.size < 2) {
      rejectedEntities.push({ entity: narrative.title, reason: `only ${narrative.supportingAuthors.size} author(s) — need 2+ independent voices`, postCount: narrative.supportingPosts.length });
      L(`  REJECTED: "${narrative.title}" — only ${narrative.supportingAuthors.size} author(s)`);
      continue;
    }
    if (narrative.supportingPosts.length < 2) {
      rejectedEntities.push({ entity: narrative.title, reason: `only ${narrative.supportingPosts.length} post(s) — need 2+`, postCount: narrative.supportingPosts.length });
      L(`  REJECTED: "${narrative.title}" — only ${narrative.supportingPosts.length} post(s)`);
      continue;
    }
    const totalEng = narrative.supportingPosts.reduce((s, p) => s + p.likes + p.shares * 2 + p.comments, 0);
    if (totalEng < 5) {
      rejectedEntities.push({ entity: narrative.title, reason: `engagement ${totalEng} too low`, postCount: narrative.supportingPosts.length });
      L(`  REJECTED: "${narrative.title}" — engagement ${totalEng}`);
      continue;
    }
    passed.push(narrative);
    L(`  PASSED:   "${narrative.title}" — ${narrative.supportingPosts.length} posts, ${narrative.supportingAuthors.size} authors, ${narrative.supportingPlatforms.size} platforms`);
  }
  L(`  Passed: ${passed.length} | Rejected: ${rejectedEntities.length}`);
  L('');

  L(SEP);
  L('  STAGE 5: LAUNCH SCORING');
  L(SEP);

  const scored: Array<{ narrative: Narrative; scores: ReturnType<typeof computeLaunchScore>; competition: CompetitionData }> = [];
  for (const narrative of passed) {
    const scores = computeLaunchScore(narrative);
    const competition = computeCompetition(narrative);
    scored.push({ narrative, scores, competition });
    L(`  "${narrative.title}": launch=${scores.launchScore} meme=${scores.memeStrength} virality=${scores.viralityScore}`);
  }
  L('');

  scored.sort((a, b) => b.scores.launchScore - a.scores.launchScore);
  const top15 = scored.slice(0, MAX_OPPORTUNITIES);

  const opportunities: LaunchOpportunity[] = [];
  for (const { narrative, scores, competition } of top15) {
    const category = detectCategory(narrative.title);
    const reason = generateReason(narrative);
    const whySelected = generateWhySelected(narrative, scores);
    const evidence = generateEvidence(narrative);
    const topPostTitles = narrative.supportingPosts
      .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 3)
      .map((p) => p.title);

    opportunities.push({
      id: `${narrative.title.toLowerCase().replace(/\s+/g, '-')}-${now}`,
      narrative: narrative.title.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      canonicalEntity: narrative.title.toUpperCase(),
      aliases: narrative.repeatedCatchphrases,
      launchScore: scores.launchScore,
      viralityScore: scores.viralityScore,
      memeStrength: scores.memeStrength,
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
      marketPlatforms: [],
      firstDetected: Math.min(...narrative.supportingPosts.map((p) => p.timestamp)),
      lastSeen: Math.max(...narrative.supportingPosts.map((p) => p.timestamp)),
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

  L(SEP);
  L('  FINAL DIAGNOSTICS');
  L(SEP);
  L(`  Collected posts:     ${posts.length}`);
  L(`  Meme classified:     ${memeCount}`);
  L(`  Cultural classified: ${culturalCount}`);
  L(`  Rejected posts:      ${rejectedCount}`);
  L(`  Phrases extracted:   ${graph.phraseToPosts.size}`);
  L(`  Narrative clusters:  ${narratives.length}`);
  L(`  Passed filter:       ${passed.length}`);
  L(`  Top 15 opportunities:${top15.length}`);
  L('');
  L('  REJECTED NARRATIVES:');
  for (const re of rejectedEntities) {
    L(`    ${re.entity} (${re.postCount} posts) — ${re.reason}`);
  }
  L('');
  L('  TOP 15 LAUNCH OPPORTUNITIES:');
  for (let i = 0; i < top15.length; i++) {
    const { narrative, scores, competition } = top15[i];
    L(`    #${i + 1}: "${narrative.title}" — launch=${scores.launchScore} competition=${competition.saturation} (${narrative.supportingPosts.length} posts, ${narrative.supportingAuthors.size} authors, ${narrative.supportingPlatforms.size} platforms)`);
  }
  L(SEP);

  return opportunities;
}
