import type { RawPost, NarrativeCluster, MemeNarrative } from './types.js';

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

function normalize(text: string): string {
  return text
    .replace(URL_RE, ' ')
    .replace(EMOJI_RE, ' ')
    .replace(PUNCT_RE, ' ')
    .toLowerCase()
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 2: CONTENT CLASSIFIER
//
// ROOT CAUSE FIX: The old UI_LABELS set contained crypto domain terms
// like "solana", "ethereum", "token", "coin", "market" — killing ANY
// post that mentioned them. This is why 72 posts → 0 clusters.
//
// New approach: Only reject posts that are PURE metadata/template text.
// Posts that CONTAIN crypto terms alongside real discussion pass through.
// ══════════════════════════════════════════════════════════════════════

type ContentType = 'meme_narrative' | 'social_discussion' | 'viral_topic' | 'token_name' | 'news_headline' | 'technical' | 'rejected';

const TEMPLATE_PATTERNS: RegExp[] = [
  /\b(trending|trend)\s+(on|in|now|today)\b/i,
  /\brank\s*#?\d/i,
  /\b(top|bottom)\s+(gainers?|losers?|traded|volume|coins?|tokens?|pairs?|boosted)\b/i,
  /\b24\s*h\s*(change|gain|loss|volume|move)\b/i,
  /\b(7d|1h|30m)\s*(change|gain|loss|volume)\b/i,
  /\b(price|market)\s*(change|move|cap|pair)\b/i,
  /\b(volume|liquidity|fdv|tvl|apy|apr)\b/i,
  /\b(holders?|swaps?|transactions?)\b/i,
  /\bnew\s+(pairs?|listings?|coins?|tokens?)\b/i,
  /\b(boosted|boosting)\b/i,
  /\bsee\s+more\b/i,
  /\b(view|explore)\s+(more|all|details?)\b/i,
  /\b(sign|log\s*in|log\s*out|connect|disconnect)\b/i,
  /\b(buy|sell|swap|bridge)\s+(now|token|coin)\b/i,
  /\b(chain|network)\s*(mainnet|testnet|devnet)\b/i,
];

const MEME_LEXICON = new Set([
  'brainrot','gigachad','skibidi','rizz','sigma','beta','alpha','npc',
  'copypasta','stan','simp','wholesome','keanu','based','cringe','yeet',
  'slay','periodt','bet','no cap','fr','ong','istg','smh','nvm',
  'btw','ily','ikr','omg','bruh','sus','among','fortnite','minecraft',
  'roblox','valorant','apex','overwatch','pubg','cod','gta',
  'pokemon','mario','zelda','kirby','donkey','yoshi','peach','bowser',
  'meme','viral','fyp','for you','foryoupage',
  'greenscreen','duet','stitch','sound','audio',
  'cat','dog','frog','duck','bear','panda','penguin','shark','whale',
  'dragon','unicorn','alien','robot','zombie','ghost','skeleton','demon',
  'angel','fairy','witch','wizard','ninja','pirate','viking','knight',
  'banana','pizza','taco','sushi','donut','burger','fries','ice cream',
  'anime','manga','waifu','husbando','cosplay','otaku','weeb','kawaii',
  'desu','nani','sugoi','senpai','sensei',
  'ayo','oof','bruh','sheesh','caught','caught in 4k','4k',
  'unreal','dream','nightmare','core','era','aesthetic','vibe',
  'delulu','delusional','ick','ickk','red flag','green flag',
  'main character','mc','protagonist',
]);

const PERSONS = new Set([
  'elon','musk','trump','biden','kanye','kim','kardashian','taylor',
  'swift','drake','kendrick','beyonce','rihanna','adele','ed sheeran',
  'billie','eilish','doja','cat','post','malone','travis','scott',
  'kylie','jenner','hailey','bieber','selena','gomez','zayn','malik',
  'harry','styles','niall','horan','liam','payne','louis','tomlinson',
  'snoop','dogg','eminem','jay','bey','kanye','west',
  'mark','zuckerberg','tim','cook','sundar','pichai','satya','nadella',
  'jeff','bezos','bill','gates','sam','altman','gpt','openai','chatgpt',
  'midjourney','dall','stable','diffusion','claude','gemini','llama',
]);

const CHARACTERS = new Set([
  'pepe','doge','shiba','bonk','wojak','chad','gigachad','doomer',
  'boomer','zoomer','coomer','poozer','npc','soy','tradwife','pickme',
  'mario','luigi','zelda','link','kirby','pikachu','charizard','snorlax',
  'mewtwo','eevee','jigglypuff','squirtle','bulbasaur','charmander',
  'homer','bart','lisa','marge','maggie','peter','stewie','lois',
  'cartman','kyle','stan','kenny','butters','randy','sharon',
  'spongebob','patrick','squidward','sandy','mr krabs','plankton',
  'tom','jerry','sylvester','tweety','bugs','bunny','daffy','duck',
  'mickey','minnie','donald','goofy','pluto','elsa','anna','olaf',
  'simba','mufasa','nala','scar','timon','pumbaa','rafi','genie',
  'shrek','donkey','fiona','puss','boots','dream','dreamwork',
]);

const BRANDS = new Set([
  'apple','google','microsoft','amazon','netflix','spotify','tiktok',
  'instagram','youtube','twitter','facebook','snapchat','discord',
  'twitch','reddit','pinterest','linkedin','telegram','whatsapp',
  'openai','anthropic','meta','tesla','spacex','blue','origin',
  'nike','adidas','gucci','louis','vuitton','prada','chanel','dior',
  'starbucks','mcdonald','burger','king','wendy','taco','bell',
  'coca','cola','pepsi','fanta','sprite','monster','red','bull',
]);

const KNOWN_TOKEN_NAMES = new Set([
  'pepe','doge','shiba','bonk','wojak','cat','dog','frog','duck','bear',
  'panda','penguin','shark','whale','dragon','unicorn','alien','robot',
  'zombie','ghost','skeleton','mario','luigi','pikachu','charizard',
  'spongebob','patrick','tom','jerry','bugs','bunny','mickey','minnie',
  'elsa','simba','shrek','popcat','brett','mog','bome','wif','airdrop',
  'catcoin','dogcoin','frogcoin','bonkcoin','pepecoin','dogecoin',
  'shiba','shibainu','wojakcoin','popcatcoin',
]);

function extractEntities(text: string): { entity: string; category: string }[] {
  const lower = text.toLowerCase();
  const entities: { entity: string; category: string }[] = [];
  const seen = new Set<string>();

  for (const word of lower.split(/\s+/)) {
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (clean.length < 3) continue;
    if (STOP_WORDS.has(clean)) continue;

    if (!seen.has(clean)) {
      if (MEME_LEXICON.has(clean)) { entities.push({ entity: clean, category: 'meme' }); seen.add(clean); }
      else if (KNOWN_TOKEN_NAMES.has(clean)) { entities.push({ entity: clean, category: 'token' }); seen.add(clean); }
      else if (PERSONS.has(clean)) { entities.push({ entity: clean, category: 'person' }); seen.add(clean); }
      else if (CHARACTERS.has(clean)) { entities.push({ entity: clean, category: 'character' }); seen.add(clean); }
      else if (BRANDS.has(clean)) { entities.push({ entity: clean, category: 'brand' }); seen.add(clean); }
    }
  }

  const camelWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
  for (const w of camelWords) {
    const low = w.toLowerCase();
    if (!STOP_WORDS.has(low) && low.length >= 3 && !seen.has(low)) {
      entities.push({ entity: low, category: 'proper_noun' });
      seen.add(low);
    }
  }

  return entities;
}

function isMetadataOnly(text: string): boolean {
  const clean = normalize(text);
  if (clean.length === 0) return true;
  if (clean.length < 4) return true;

  if (/^\d+(\.\d+)?%?$/.test(clean)) return true;
  if (/^\d+(\.\d+)?$/.test(clean)) return true;

  for (const p of TEMPLATE_PATTERNS) {
    if (p.test(clean)) return true;
  }

  const wordCount = clean.split(/\s+/).length;
  if (wordCount <= 2) {
    const metadataOnly = /^(trending|trend|rank|top|gainers|losers|volume|liquidity|market|cap|fdv|tvl|holders|swaps|transactions|price|change|24h|7d|1h|30m|boosted|new|pairs|coins|tokens|topics|language|stars|forks|github|coingecko|dexscreener|solana|ethereum|bitcoin|base|bnb|polygon|arbitrum|show hn|ask hn|hacker news|lobsters|trending coins|trending tokens|top coins|popular|new pairs|new listings|most traded|highest volume|trending repos|trending today|trending this week|created)$/i;
    if (metadataOnly.test(clean)) return true;
  }

  return false;
}

function classifyText(text: string): ContentType {
  const clean = normalize(text);
  const words = clean.split(/\s+/);
  const wordCount = words.length;

  if (wordCount === 0) return 'rejected';
  if (wordCount === 1 && words[0].length < 3) return 'rejected';
  if (isMetadataOnly(text)) return 'rejected';

  const entities = extractEntities(text);
  if (entities.length > 0) return 'meme_narrative';

  const memeIndicators = ['lmao','omg','bruh','sheesh','caught','viral','meme','sus',
    'unreal','dream','nightmare','fyp','trending','for you','foryoupage',
    'based','cringe','npc','no cap','fr','ong','istg','smh',
    'ayo','oof','yall','finna','lowkey','highkey','periodt','slay'];

  let memeScore = 0;
  for (const w of words) {
    if (memeIndicators.includes(w)) memeScore++;
  }

  const hasQuestion = text.includes('?') || text.includes('!');

  const sentimentWords = ['love','hate','crazy','insane','wild','epic','best','worst',
    'amazing','terrible','beautiful','ugly','fire','trash','goat','mid','middest',
    'incredible','unbelievable','shocking','hilarious','funny','sad','happy','angry'];

  let sentimentScore = 0;
  for (const w of words) {
    if (sentimentWords.includes(w)) sentimentScore++;
  }

  if (memeScore >= 2 || (memeScore >= 1 && sentimentScore >= 1)) return 'viral_topic';
  if (sentimentScore >= 2 && wordCount >= 4) return 'social_discussion';
  if (hasQuestion && wordCount >= 4) return 'social_discussion';
  if (wordCount >= 5 && (sentimentScore >= 1 || memeScore >= 1)) return 'social_discussion';

  const newsPatterns = ['according','report','says','announced','launches','launching',
    'releases','releasing','unveils','unveiling','introduces','introducing',
    'confirms','confirming','denies','denying','claims','claiming'];

  let newsScore = 0;
  for (const w of words) {
    if (newsPatterns.includes(w)) newsScore++;
  }
  if (newsScore >= 1 && wordCount >= 5) return 'news_headline';

  if (wordCount >= 4) return 'social_discussion';
  return 'rejected';
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 3: TOKEN NAME NORMALIZATION
// ══════════════════════════════════════════════════════════════════════

const TOKEN_SUFFIX_RE = /\s*(coin|token|project|protocol|chain|network|inu|finance|dao|labs|verse|swap|pad|market|exchange)$/i;
const TOKEN_PREFIX_RE = /^[\$#\s]+/;
const KNOWN_TOKEN_ALIASES: Record<string, string> = {
  'pepe': 'pepe', 'pepe coin': 'pepe', 'pepecoin': 'pepe', 'pepe the frog': 'pepe',
  'bonk': 'bonk', 'bonk coin': 'bonk', 'bonkcoin': 'bonk', 'bonk inu': 'bonk',
  'doge': 'doge', 'dogecoin': 'doge', 'doge coin': 'doge',
  'shiba': 'shiba', 'shiba inu': 'shiba', 'shib': 'shiba', 'shibainu': 'shiba',
  'wojak': 'wojak', 'wojak coin': 'wojak', 'wojakcoin': 'wojak',
  'dogwifhat': 'wif', 'dog wif hat': 'wif', 'wif': 'wif',
  'popcat': 'popcat', 'pop cat': 'popcat',
  'brett': 'brett', 'brett on base': 'brett',
  'mog': 'mog', 'mog coin': 'mog', 'mogcoin': 'mog',
  'bome': 'bome', 'book of meme': 'bome', 'bookofmeme': 'bome',
  'cat in a dogs world': 'mew', 'meow': 'mew',
};

function normalizeTokenName(name: string): string {
  let norm = name.toLowerCase().trim();
  norm = norm.replace(TOKEN_PREFIX_RE, '');
  norm = norm.replace(TOKEN_SUFFIX_RE, '');
  norm = norm.replace(/[^a-z0-9\s]/g, '');
  norm = norm.replace(/\s+/g, ' ').trim();
  if (KNOWN_TOKEN_ALIASES[norm]) return KNOWN_TOKEN_ALIASES[norm];
  return norm;
}

function normalizeNarrativeName(name: string): string {
  return normalizeTokenName(name);
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 4: CLUSTERING
// ══════════════════════════════════════════════════════════════════════

function clusterKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return dp[m][n];
}

function similar(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const len = Math.max(a.length, b.length);
  if (len < 4) return false;
  return levenshtein(a, b) <= Math.floor(len * 0.25);
}

interface Cluster {
  key: string;
  canonicalName: string;
  phrases: string[];
  posts: RawPost[];
  firstSeen: number;
  lastSeen: number;
  authors: Set<string>;
  sources: Set<string>;
  totalMentions: number;
  totalEngagement: number;
  entities: Map<string, string>;
}

function clusterPosts(posts: RawPost[]): { clusters: Cluster[]; stats: { accepted: number; rejectedClassifier: number; rejectedShort: number; rejectedMetadata: number } } {
  const map = new Map<string, Cluster>();
  const now = Date.now();
  const WINDOW = 24 * 3600 * 1000;
  const recent = posts.filter((p) => now - p.timestamp <= WINDOW);

  let accepted = 0;
  let rejectedClassifier = 0;
  let rejectedShort = 0;
  let rejectedMetadata = 0;

  for (const post of recent) {
    const allText = `${post.title} ${post.body}`;

    if (isMetadataOnly(allText)) { rejectedMetadata++; continue; }

    const classification = classifyText(allText);
    if (classification === 'rejected') { rejectedClassifier++; continue; }

    accepted++;

    const sentences = allText.split(/[.!?\n]+/).filter((s) => s.trim().length > 8);
    for (const sentence of sentences) {
      if (isMetadataOnly(sentence)) { rejectedMetadata++; continue; }

      const sentClass = classifyText(sentence);
      if (sentClass === 'rejected') { rejectedClassifier++; continue; }

      const words = tokenize(sentence);
      if (words.length < 2) { rejectedShort++; continue; }

      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        const key = clusterKey(phrase);
        if (key.length < 4) continue;

        let c = map.get(key);
        if (!c) {
          c = {
            key, canonicalName: phrase, phrases: [phrase],
            posts: [], firstSeen: post.timestamp, lastSeen: post.timestamp,
            authors: new Set(), sources: new Set(),
            totalMentions: 0, totalEngagement: 0,
            entities: new Map(),
          };
          map.set(key, c);
        }
        c.posts.push(post);
        c.authors.add(post.author);
        c.sources.add(post.source);
        c.totalMentions += 1;
        c.totalEngagement += post.likes + post.shares * 2 + post.comments;
        c.firstSeen = Math.min(c.firstSeen, post.timestamp);
        c.lastSeen = Math.max(c.lastSeen, post.timestamp);

        const entities = extractEntities(sentence);
        for (const e of entities) {
          c.entities.set(e.entity, e.category);
        }
      }
    }
  }

  const clusters = [...map.values()];
  const merged = new Set<string>();

  for (let i = 0; i < clusters.length; i++) {
    if (merged.has(clusters[i].key)) continue;
    for (let j = i + 1; j < clusters.length; j++) {
      if (merged.has(clusters[j].key)) continue;
      if (similar(clusters[i].key, clusters[j].key)) {
        clusters[i].phrases.push(...clusters[j].phrases);
        clusters[i].posts.push(...clusters[j].posts);
        for (const a of clusters[j].authors) clusters[i].authors.add(a);
        for (const s of clusters[j].sources) clusters[i].sources.add(s);
        for (const [e, c] of clusters[j].entities) clusters[i].entities.set(e, c);
        clusters[i].totalMentions += clusters[j].totalMentions;
        clusters[i].totalEngagement += clusters[j].totalEngagement;
        clusters[i].firstSeen = Math.min(clusters[i].firstSeen, clusters[j].firstSeen);
        clusters[i].lastSeen = Math.max(clusters[i].lastSeen, clusters[j].lastSeen);
        if (clusters[j].canonicalName.length > clusters[i].canonicalName.length) {
          clusters[i].canonicalName = clusters[j].canonicalName;
        }
        merged.add(clusters[j].key);
      }
    }
  }

  return {
    clusters: clusters.filter((c) => !merged.has(c.key)),
    stats: { accepted, rejectedClassifier, rejectedShort, rejectedMetadata },
  };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 5: ENTITY-BASED CLUSTER MERGING
// ══════════════════════════════════════════════════════════════════════

function mergeByEntities(clusters: Cluster[]): Cluster[] {
  const entityMap = new Map<string, Cluster[]>();
  for (const c of clusters) {
    for (const [entity] of c.entities) {
      const norm = normalizeTokenName(entity);
      if (norm.length < 2) continue;
      const existing = entityMap.get(norm) ?? [];
      existing.push(c);
      entityMap.set(norm, existing);
    }
  }

  const mergedInto = new Set<string>();
  const result: Cluster[] = [];

  for (const [, group] of entityMap) {
    if (group.length < 2) continue;

    group.sort((a, b) => b.totalMentions - a.totalMentions);
    const primary = group[0];

    for (let i = 1; i < group.length; i++) {
      const secondary = group[i];
      if (mergedInto.has(secondary.key)) continue;

      primary.phrases.push(...secondary.phrases);
      primary.posts.push(...secondary.posts);
      for (const a of secondary.authors) primary.authors.add(a);
      for (const s of secondary.sources) primary.sources.add(s);
      for (const [e, c] of secondary.entities) primary.entities.set(e, c);
      primary.totalMentions += secondary.totalMentions;
      primary.totalEngagement += secondary.totalEngagement;
      primary.firstSeen = Math.min(primary.firstSeen, secondary.firstSeen);
      primary.lastSeen = Math.max(primary.lastSeen, secondary.lastSeen);
      if (secondary.canonicalName.length > primary.canonicalName.length) {
        primary.canonicalName = secondary.canonicalName;
      }
      mergedInto.add(secondary.key);
    }
  }

  for (const c of clusters) {
    if (!mergedInto.has(c.key)) {
      result.push(c);
    }
  }
  return result;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 6: SCORING
// ══════════════════════════════════════════════════════════════════════

function computeGrowthPct(cluster: Cluster, now: number): number {
  const half = 12 * 3600 * 1000;
  const recent = cluster.posts.filter((p) => now - p.timestamp <= half).length;
  const older = cluster.posts.length - recent;
  if (older === 0) return recent > 0 ? 100 + recent * 20 : 0;
  return Math.round(((recent - older) / older) * 100);
}

function computeVelocity(cluster: Cluster): number {
  const spanHours = Math.max((cluster.lastSeen - cluster.firstSeen) / 3600000, 0.5);
  return cluster.totalMentions / spanHours;
}

function computeConfidence(cluster: Cluster, now: number): number {
  const sourcePct = Math.min(cluster.sources.size / 3, 1);
  const mentionPct = Math.min(cluster.totalMentions / 50, 1);
  const growthPct = Math.min(Math.max(computeGrowthPct(cluster, now), 0) / 300, 1);
  const authorPct = Math.min(cluster.authors.size / 15, 1);
  return Math.round((sourcePct * 0.35 + mentionPct * 0.25 + growthPct * 0.25 + authorPct * 0.15) * 100);
}

function computeQualityScore(cluster: Cluster, now: number): number {
  const authorScore = Math.min(cluster.authors.size / 15, 1);
  const platformScore = Math.min(cluster.sources.size / 4, 1);
  const engagementScore = Math.min(cluster.totalEngagement / 500, 1);
  const growthPct = computeGrowthPct(cluster, now);
  const growthScore = Math.min(Math.max(growthPct, 0) / 300, 1);
  const velocity = computeVelocity(cluster);
  const velocityScore = Math.min(velocity / 10, 1);
  const ageHours = (now - cluster.lastSeen) / 3600000;
  const freshnessScore = Math.max(0, 1 - ageHours / 24);

  const raw =
    authorScore * 0.40 +
    platformScore * 0.25 +
    engagementScore * 0.15 +
    growthScore * 0.10 +
    velocityScore * 0.05 +
    freshnessScore * 0.05;

  return Math.round(raw * 10000) / 100;
}

function computeTrendScore(cluster: Cluster, now: number): number {
  const mentionScore = Math.min(cluster.totalMentions / 50, 1);
  const growthPct = computeGrowthPct(cluster, now);
  const growthScore = Math.min(Math.max(growthPct, 0) / 300, 1);
  const velocity = computeVelocity(cluster);
  const velocityScore = Math.min(velocity / 10, 1);
  const sourceScore = Math.min(cluster.sources.size / 4, 1);
  const authorScore = Math.min(cluster.authors.size / 15, 1);
  const ageHours = (now - cluster.lastSeen) / 3600000;
  const recencyBoost = Math.max(0, 1 - ageHours / 24);
  const raw =
    mentionScore * 0.20 + growthScore * 0.20 + velocityScore * 0.15 +
    sourceScore * 0.20 + authorScore * 0.15 + recencyBoost * 0.10;
  return Math.round(raw * 100) / 10;
}

function generateReason(cluster: Cluster, now: number): string {
  const growth = computeGrowthPct(cluster, now);
  const velocity = computeVelocity(cluster);
  const parts: string[] = [];
  if (growth > 200) parts.push(`Mentions surged +${growth}% in the last 12 hours`);
  else if (growth > 100) parts.push(`Mentions doubled in the last 12 hours (+${growth}%)`);
  else if (growth > 0) parts.push(`Steady growth of +${growth}% in recent hours`);
  if (velocity > 5) parts.push(`${Math.round(velocity)} mentions/hour — fast rising`);
  if (cluster.sources.size >= 3) parts.push(`Cross-platform spread across ${cluster.sources.size} sources`);
  else if (cluster.sources.size >= 2) parts.push(`Picking up on ${cluster.sources.size} independent platforms`);
  if (cluster.authors.size > 10) parts.push(`${cluster.authors.size} unique creators discussing this`);
  if (parts.length === 0) parts.push(`First seen ${Math.round((now - cluster.firstSeen) / 3600000)}h ago with ${cluster.totalMentions} mentions`);
  return parts.join('. ') + '.';
}

function generateEvidence(cluster: Cluster): string[] {
  const evidence: string[] = [];
  const bySource = new Map<string, number>();
  for (const p of cluster.posts) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);
  const sorted = [...bySource.entries()].sort((a, b) => b[1] - a[1]);
  for (const [src, count] of sorted.slice(0, 5)) evidence.push(`${src}: ${count} mentions`);
  const growth = computeGrowthPct(cluster, Date.now());
  if (growth > 0) evidence.push(`Growth: +${growth}% in last 12h`);
  const velocity = computeVelocity(cluster);
  if (velocity > 1) evidence.push(`Velocity: ${Math.round(velocity * 10) / 10} mentions/hour`);
  const ageHours = Math.round((Date.now() - cluster.firstSeen) / 3600000);
  evidence.push(`First detected: ${ageHours}h ago`);
  const topAuthors = [...cluster.authors].slice(0, 3);
  if (topAuthors.length > 0) evidence.push(`Active voices: ${topAuthors.join(', ')}`);
  return evidence;
}

function detectCategory(phrase: string): string {
  const WORD_MAP: Record<string, string> = {
    cat:'Animals',dog:'Animals',frog:'Animals',duck:'Animals',bear:'Animals',
    panda:'Animals',penguin:'Animals',shark:'Animals',whale:'Animals',
    dragon:'Animals',unicorn:'Animals',llama:'Animals',gorilla:'Animals',
    monkey:'Animals',lion:'Animals',tiger:'Animals',gecko:'Animals',
    pepe:'Animals',doge:'Animals',shiba:'Animals',bonk:'Animals',
    ai:'Technology',robot:'Technology',quantum:'Technology',cyber:'Technology',
    neon:'Technology',drone:'Technology',chip:'Technology',
    ninja:'Action',warrior:'Action',pirate:'Action',viking:'Action',knight:'Action',
    space:'Space',moon:'Space',mars:'Space',rocket:'Space',star:'Space',
    galaxy:'Space',cosmic:'Space',alien:'Space',ufo:'Space',
    banana:'Food',pizza:'Food',taco:'Food',sushi:'Food',donut:'Food',
    pixel:'Retro Gaming',retro:'Retro Gaming',arcade:'Retro Gaming',
    dark:'Dark Humor',shadow:'Dark Humor',void:'Dark Humor',
    anime:'Anime',manga:'Anime',cosplay:'Anime',waifu:'Anime',
    meme:'Internet Meme',viral:'Internet Meme',brainrot:'Internet Meme',
    skibidi:'Internet Meme',gigachad:'Internet Meme',sigma:'Internet Meme',
  };
  const words = phrase.split(/\s+/);
  const scores: Record<string, number> = {};
  for (const w of words) {
    const cat = WORD_MAP[w];
    if (cat) scores[cat] = (scores[cat] ?? 0) + 1;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) return sorted[0][0];
  return 'General Meme';
}

function capitalize(s: string): string {
  return s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 7: ADAPTIVE THRESHOLDS
// ══════════════════════════════════════════════════════════════════════

interface Thresholds {
  minAuthors: number;
  minMentions: number;
  minPlatforms: number;
  minEngagement: number;
  minTrendScore: number;
  minConfidence: number;
  allowSinglePlatform: boolean;
}

function computeAdaptiveThresholds(posts: RawPost[], clusterCount: number, totalAuthors: Set<string>, totalSources: Set<string>): Thresholds {
  const postCount = posts.length;
  const sourceCount = totalSources.size;
  const authorCount = totalAuthors.size;

  let minAuthors: number;
  let minMentions: number;
  let minPlatforms: number;
  let minEngagement: number;

  if (postCount < 30) {
    minAuthors = 1;
    minMentions = 2;
    minPlatforms = 1;
    minEngagement = 5;
  } else if (postCount < 100) {
    minAuthors = 2;
    minMentions = 2;
    minPlatforms = 1;
    minEngagement = 10;
  } else if (postCount < 500) {
    minAuthors = 2;
    minMentions = 3;
    minPlatforms = 2;
    minEngagement = 15;
  } else {
    minAuthors = 3;
    minMentions = 5;
    minPlatforms = 2;
    minEngagement = 20;
  }

  if (sourceCount < 3) {
    minPlatforms = Math.min(minPlatforms, 1);
  }

  if (authorCount < 5) {
    minAuthors = Math.min(minAuthors, 1);
  }

  return {
    minAuthors,
    minMentions,
    minPlatforms,
    minEngagement,
    minTrendScore: 15,
    minConfidence: 20,
    allowSinglePlatform: sourceCount < 3 || postCount < 100,
  };
}

function detectImpossibleThresholds(thresholds: Thresholds, posts: RawPost[], allAuthors: Set<string>, allSources: Set<string>): string[] {
  const warnings: string[] = [];

  if (thresholds.minAuthors > allAuthors.size) {
    warnings.push(`Threshold impossible: minAuthors=${thresholds.minAuthors} but dataset only has ${allAuthors.size} total authors. Adjusted to ${Math.min(thresholds.minAuthors, allAuthors.size)}.`);
  }
  if (thresholds.minPlatforms > allSources.size) {
    warnings.push(`Threshold impossible: minPlatforms=${thresholds.minPlatforms} but dataset only has ${allSources.size} platforms (${[...allSources].join(', ')}). Adjusted to ${Math.min(thresholds.minPlatforms, allSources.size)}.`);
  }
  if (thresholds.minMentions > posts.length) {
    warnings.push(`Threshold impossible: minMentions=${thresholds.minMentions} but only ${posts.length} posts exist. Adjusted to ${Math.min(thresholds.minMentions, posts.length)}.`);
  }

  return warnings;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 8: QUALITY FILTER
// ══════════════════════════════════════════════════════════════════════

const MAX_NARRATIVES = 15;

const BLOCKED_NAMES = new Set([
  'crypto','blockchain','web3','defi','nft','token','coin','dex','amm',
  'staking','yield','farming','liquidity','pool','swap','bridge','mint',
  'burn','airdrop','faucet','gas','gwei','wei','lamports','sol','usdc',
  'usdt','dai','eth','btc','ada','dot','avax','matic','link','uni',
  'aave','comp','snx','crv','sushi','cake','xvs','venus','anchor',
  'mirror','terraswap','osmosis','juno','stargaze','mars','neutron',
  'sei','sui','aptos','move','rust','solana','ethereum','bitcoin',
  'base','bnb','polygon','arbitrum','optimism','avalanche','cardano',
  'trending','trend','gainers','losers','volume','liquidity','market',
  'cap','fdv','tvl','holders','swaps','transactions','price','change',
  '24h','7d','1h','30m','boosted','new','pairs','coins','tokens',
  'rank','top','bottom','best','worst','first','last','next','prev',
  'general','random','stuff','things','something','anything','nothing',
  'update','news','breaking','alert','warning','notice','info','data',
  'result','results','list','item','entry','number','status','system',
  'check','test','demo','example','sample','placeholder','lorem','ipsum',
  'showhn','launchedon','boostedon','seemore','viewmore','exploreall',
  'reddit','bluesky','twitter','telegram','discord','youtube','tiktok',
  'coingecko','dexscreener','github','hackernews','hacker news',
]);

const BLOCKED_PATTERNS: RegExp[] = [
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  /^(0x)?[0-9a-f]{8,}$/i,
  /^(trending|trending coins|trending tokens|top coins|popular|gainers|losers|new pairs|new listings|trending repos|trending today)$/i,
  /^(boosted|top boosted|most traded|highest volume|trending on|boosted on)$/i,
];

function getRejectionReason(cluster: Cluster, now: number, thresholds: Thresholds): string | null {
  if (cluster.sources.size < thresholds.minPlatforms) {
    if (!(thresholds.allowSinglePlatform && cluster.sources.size === 1)) {
      return `single platform (need ${thresholds.minPlatforms}+)`;
    }
  }
  if (cluster.authors.size < thresholds.minAuthors) return `only ${cluster.authors.size} unique author(s) (need ${thresholds.minAuthors}+)`;
  if (cluster.totalMentions < thresholds.minMentions) return `only ${cluster.totalMentions} mention(s) (need ${thresholds.minMentions}+)`;
  if (cluster.totalEngagement < thresholds.minEngagement) return `engagement ${cluster.totalEngagement} below minimum ${thresholds.minEngagement}`;

  const normName = normalizeNarrativeName(cluster.canonicalName);
  if (!normName || normName.length < 2) return `empty or too short name`;

  if (BLOCKED_NAMES.has(normName)) return `generic/blocked name "${normName}"`;

  const words = normName.split(/\s+/);
  for (const w of words) {
    if (BLOCKED_NAMES.has(w)) return `contains blocked word "${w}"`;
  }

  for (const p of BLOCKED_PATTERNS) {
    if (p.test(normName)) return `matches blocked pattern`;
  }

  if (words.length === 1 && STOP_WORDS.has(words[0])) return `stop word "${normName}"`;

  const trendScore = computeTrendScore(cluster, now);
  if (trendScore < thresholds.minTrendScore) return `trend score ${trendScore} below minimum ${thresholds.minTrendScore}`;

  const confidencePct = computeConfidence(cluster, now);
  if (confidencePct < thresholds.minConfidence) return `confidence ${confidencePct}% below minimum ${thresholds.minConfidence}%`;

  return null;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 9: MAIN ANALYSIS
// ══════════════════════════════════════════════════════════════════════

export function analyzeNarratives(posts: RawPost[]): MemeNarrative[] {
  const now = Date.now();
  const L = (msg: string) => console.log(`[intel] ${msg}`);

  L('═══════════════════════════════════════════════');
  L('PIPELINE AUDIT — FULL DIAGNOSTICS');
  L('═══════════════════════════════════════════════');
  L('');

  const allAuthors = new Set<string>();
  const allSources = new Set<string>();
  for (const p of posts) { allAuthors.add(p.author); allSources.add(p.source); }

  L(`Stage 0: COLLECTED`);
  L(`  Posts: ${posts.length}`);
  L(`  Unique authors: ${allAuthors.size}`);
  L(`  Platforms: ${allSources.size} (${[...allSources].join(', ')})`);
  L('');

  const bySource = new Map<string, number>();
  for (const p of posts) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);
  L('  Posts by platform:');
  for (const [src, count] of bySource) L(`    ${src}: ${count}`);
  L('');

  const { clusters: rawClusters, stats: clusterStats } = clusterPosts(posts);

  L(`Stage 1: AFTER CLASSIFIER + CLUSTERING`);
  L(`  Posts accepted by classifier: ${clusterStats.accepted}`);
  L(`  Posts rejected (metadata/template): ${clusterStats.rejectedMetadata}`);
  L(`  Posts rejected (classifier): ${clusterStats.rejectedClassifier}`);
  L(`  Posts rejected (too short for 2-word phrase): ${clusterStats.rejectedShort}`);
  L(`  Raw clusters created: ${rawClusters.length}`);
  L('');

  const entityMerged = mergeByEntities(rawClusters);
  const entityMergeCount = rawClusters.length - entityMerged.length;
  L(`Stage 2: AFTER ENTITY MERGE`);
  L(`  Clusters: ${entityMerged.length}`);
  L(`  Merged by shared entity: ${entityMergeCount}`);
  L('');

  const thresholds = computeAdaptiveThresholds(posts, entityMerged.length, allAuthors, allSources);
  L(`Stage 3: ADAPTIVE THRESHOLDS`);
  L(`  minAuthors: ${thresholds.minAuthors}`);
  L(`  minMentions: ${thresholds.minMentions}`);
  L(`  minPlatforms: ${thresholds.minPlatforms}`);
  L(`  minEngagement: ${thresholds.minEngagement}`);
  L(`  minTrendScore: ${thresholds.minTrendScore}`);
  L(`  minConfidence: ${thresholds.minConfidence}`);
  L(`  allowSinglePlatform: ${thresholds.allowSinglePlatform}`);
  L('');

  const impossibleWarnings = detectImpossibleThresholds(thresholds, posts, allAuthors, allSources);
  if (impossibleWarnings.length > 0) {
    L('  ⚠ IMPOSSIBLE THRESHOLD DETECTED:');
    for (const w of impossibleWarnings) L(`    ${w}`);
    L('');
  }

  const rejectCounts: Record<string, number> = {};
  let duplicateCount = 0;
  let emptyNameCount = 0;

  const deduped = new Map<string, Cluster>();
  const clusterDetails: string[] = [];

  for (const cluster of entityMerged) {
    const normKey = normalizeNarrativeName(cluster.canonicalName);
    if (!normKey || normKey.length < 2) {
      emptyNameCount++;
      clusterDetails.push(`"${cluster.canonicalName}" → REJECTED: empty normalized name`);
      continue;
    }

    const reason = getRejectionReason(cluster, now, thresholds);
    if (reason) {
      rejectCounts[reason] = (rejectCounts[reason] ?? 0) + 1;
      clusterDetails.push(
        `"${cluster.canonicalName}" (${cluster.totalMentions} mentions, ${cluster.authors.size} authors, ${cluster.sources.size} platforms: ${[...cluster.sources].join(',')}, engagement=${cluster.totalEngagement}, trend=${computeTrendScore(cluster, now)}, conf=${computeConfidence(cluster, now)}) → REJECTED: ${reason}`
      );
      continue;
    }

    const existing = deduped.get(normKey);
    if (existing) {
      duplicateCount++;
      existing.posts.push(...cluster.posts);
      for (const a of cluster.authors) existing.authors.add(a);
      for (const s of cluster.sources) existing.sources.add(s);
      for (const [e, c] of cluster.entities) existing.entities.set(e, c);
      existing.totalMentions += cluster.totalMentions;
      existing.totalEngagement += cluster.totalEngagement;
      existing.firstSeen = Math.min(existing.firstSeen, cluster.firstSeen);
      existing.lastSeen = Math.max(existing.lastSeen, cluster.lastSeen);
      if (cluster.canonicalName.length > existing.canonicalName.length) {
        existing.canonicalName = cluster.canonicalName;
      }
      clusterDetails.push(`"${cluster.canonicalName}" → MERGED into "${existing.canonicalName}"`);
    } else {
      deduped.set(normKey, cluster);
      clusterDetails.push(
        `"${cluster.canonicalName}" (${cluster.totalMentions} mentions, ${cluster.authors.size} authors, ${cluster.sources.size} platforms, engagement=${cluster.totalEngagement}, trend=${computeTrendScore(cluster, now)}, conf=${computeConfidence(cluster, now)}) → ACCEPTED`
      );
    }
  }

  L(`Stage 4: CLUSTER DETAILS (every cluster)`);
  for (const d of clusterDetails) L(`  ${d}`);
  L('');

  L(`Stage 5: REJECTION BREAKDOWN`);
  L(`  Empty name: ${emptyNameCount}`);
  L(`  Duplicates merged: ${duplicateCount}`);
  const sortedRejects = Object.entries(rejectCounts).sort((a, b) => b[1] - a[1]);
  for (const [reason, count] of sortedRejects) {
    L(`  ${count} → ${reason}`);
  }
  L('');

  L(`Stage 6: SURVIVING CLUSTERS`);
  L(`  Count: ${deduped.size}`);
  L('');

  const narratives: MemeNarrative[] = [];
  for (const cluster of deduped.values()) {
    const trendScore = computeTrendScore(cluster, now);
    const growthPct = computeGrowthPct(cluster, now);
    const confidencePct = computeConfidence(cluster, now);
    const qualityScore = computeQualityScore(cluster, now);
    const category = detectCategory(cluster.canonicalName);
    const narrative = capitalize(cluster.canonicalName);
    const topPostTitles = [...cluster.posts]
      .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 3)
      .map((p) => p.title);

    narratives.push({
      id: `${cluster.key}-${now}`,
      narrative,
      trendScore,
      mentionCount: cluster.totalMentions,
      growthPct,
      uniqueAuthors: cluster.authors.size,
      sourcesFound: [...cluster.sources],
      sourceCount: cluster.sources.size,
      firstDetected: cluster.firstSeen,
      lastSeen: cluster.lastSeen,
      confidencePct,
      reason: generateReason(cluster, now),
      evidence: generateEvidence(cluster),
      category,
      topPostTitles,
      qualityScore,
    });
  }

  narratives.sort((a, b) => b.qualityScore - a.qualityScore);
  const final = narratives.slice(0, MAX_NARRATIVES);

  L('═══════════════════════════════════════════════');
  L('VERIFICATION REPORT');
  L('═══════════════════════════════════════════════');
  L(`  Collected posts:          ${posts.length}`);
  L(`  Accepted by classifier:   ${clusterStats.accepted}`);
  L(`  Clusters created:         ${rawClusters.length}`);
  L(`  Metadata removed:         ${clusterStats.rejectedMetadata}`);
  L(`  Duplicates merged:        ${duplicateCount}`);
  L(`  Rejected (single author): ${rejectCounts['single platform (need 2+)'] ?? 0}`);
  L(`  Rejected (single platform): ${Object.entries(rejectCounts).filter(([k]) => k.includes('platform')).reduce((s, [, v]) => s + v, 0)}`);
  L(`  Rejected (generic):       ${Object.entries(rejectCounts).filter(([k]) => k.includes('blocked') || k.includes('generic') || k.includes('stop word')).reduce((s, [, v]) => s + v, 0)}`);
  L(`  Rejected (low score):     ${(rejectCounts['trend score'] ?? 0) + (Object.entries(rejectCounts).filter(([k]) => k.includes('confidence') || k.includes('trend score') || k.includes('engagement')).reduce((s, [, v]) => s + v, 0))}`);
  L(`  Final narratives:         ${final.length}`);
  L('═══════════════════════════════════════════════');

  if (final.length === 0) {
    L('');
    L('WHY ZERO NARRATIVES:');
    L(`  ${posts.length} posts entered the pipeline.`);
    L(`  ${clusterStats.rejectedMetadata} were metadata/template text.`);
    L(`  ${clusterStats.rejectedClassifier} were rejected by classifier.`);
    L(`  ${clusterStats.accepted} posts survived classification.`);
    L(`  ${rawClusters.length} clusters were created from those posts.`);
    L(`  ${entityMergeCount} were merged by shared entities.`);
    L(`  ${entityMerged.length} clusters survived merging.`);
    L(`  ${emptyNameCount} had empty names.`);
    L(`  ${Object.values(rejectCounts).reduce((s, v) => s + v, 0)} were rejected by quality filters.`);
    L(`  ${deduped.size} survived all filters.`);
    L(`  ${final.length} narratives produced.`);
  } else {
    L('');
    L('FINAL NARRATIVES:');
    for (let i = 0; i < final.length; i++) {
      const n = final[i];
      L(`  #${i + 1} ${n.narrative}`);
      L(`       quality=${n.qualityScore} trend=${n.trendScore} conf=${n.confidencePct}% mentions=${n.mentionCount} authors=${n.uniqueAuthors} platforms=${n.sourceCount} engagement=${n.mentionCount}`);
    }
  }

  L('═══════════════════════════════════════════════');
  return final;
}
