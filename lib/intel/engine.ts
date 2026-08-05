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
// SECTION 6: NARRATIVE INTELLIGENCE LAYER
//
// This layer determines whether a cluster represents an actual meme
// narrative rather than simply a repeated phrase or metadata.
//
// It evaluates 8 dimensions and assigns a Narrative Quality Score (0-100)
// using weighted components:
//   35% semantic quality (is this a real cultural idea?)
//   25% cross-platform diversity
//   15% independent authors
//   10% engagement
//   10% growth
//   5%  freshness
//
// Only clusters scoring >= 70 become Meme Narratives.
// ══════════════════════════════════════════════════════════════════════

// Known meme narrative patterns — these are recognized cultural ideas
const MEME_NARRATIVE_PATTERNS: RegExp[] = [
  /\b(brainrot|italian brainrot|sigma|aura|npc|skibidi|gigachad|pepe|frog)\b/i,
  /\b(goblin mode|ai girlfriend|anime waifu|capybara|banana guy)\b/i,
  /\b(doge|shiba|bonk|wojak|chad|doomer|boomer|zoomer|coomer)\b/i,
  /\b(rizz|simp|stan|copypasta|yeet|slay|periodt|bet|no cap)\b/i,
  /\b(caught in 4k|red flag|green flag|ick|delulu|main character)\b/i,
  /\b(viral|meme|trend|fyp|for you|foryoupage|greenscreen|duet|stitch)\b/i,
  /\b(fortnite|minecraft|roblox|valorant|among us|sus)\b/i,
  /\b(pokemon|mario|zelda|kirby|spongebob|patrick|tom|jerry)\b/i,
  /\b(uno reverse|this is fine|distracted boyfriend|woman yelling cat)\b/i,
  /\b(doomer|poozer|tradwife|pickme|soy boy|fedora|neckbeard)\b/i,
  /\b(crypto|nft|defi|web3|blockchain)\b.*\b(meme|coin|token|project|launch)\b/i,
  /\b(solana|ethereum|base|bnb)\b.*\b(meme|coin|token|cat|dog|frog|pepe)\b/i,
];

// Metadata/UI labels that should NOT be narratives
const METADATA_LABELS: RegExp[] = [
  /\b(trending|trend)\s*(rank|on|in|now|today|coins?|tokens?|repos?|topics?)\b/i,
  /\brank\s*#?\d+\b/i,
  /\b(top|bottom)\s+(gainers?|losers?|traded|volume|coins?|tokens?|pairs?|boosted)\b/i,
  /\b24\s*h\s*(change|gain|loss|volume|move|price)\b/i,
  /\b(7d|1h|30m)\s*(change|gain|loss|volume)\b/i,
  /\b(volume|liquidity|fdv|tvl|apy|apr|market cap|price)\b/i,
  /\b(holders?|swaps?|transactions?|pairs?|listings?)\b/i,
  /\bnew\s+(pairs?|listings?|coins?|tokens?)\b/i,
  /\b(boosted|boosting|top boosted)\b/i,
  /\b(show hn|ask hn|hacker news|lobsters)\b/i,
  /\b(trending coins|trending tokens|trending today|trending this week)\b/i,
  /\b(most traded|highest volume|most popular)\b/i,
  /\b(created|launched|deployed|verified|unverified)\b/i,
  /\b(view|explore)\s+(more|all|details?)\b/i,
  /\b(sign|log\s*in|log\s*out|connect|disconnect)\b/i,
  /\b(buy|sell|swap|bridge)\s+(now|token|coin)\b/i,
  /\b(chain|network)\s*(mainnet|testnet|devnet)\b/i,
];

// Financial metrics that are NOT narratives
const FINANCIAL_METRICS: RegExp[] = [
  /\b(price|market cap|mc|fdv|tvl|volume|24h|7d|1h|30m)\b/i,
  /\b(change|gain|loss|pump|dump|ath|atl|dip|rally|moon)\b/i,
  /\b(\d+\.?\d*)\s*(%|percent|usd|usdc|usdt|sol|eth|btc)\b/i,
  /\b(bullish|bearish|long|short|leverage|margin)\b/i,
  /\b(liquidity|swap|pool|apy|apr|yield|stake)\b/i,
];

// Platform UI labels
const PLATFORM_UI_LABELS: RegExp[] = [
  /\b(coingecko|dexscreener|github|gitlab|bitbucket|npm|pypi)\b/i,
  /\b(stars?|forks?|watchers?|contributors?|commits?)\b/i,
  /\b(reddit|bluesky|twitter|telegram|discord|youtube|tiktok)\b.*\b(trending|popular|hot|top)\b/i,
  /\b(views?|likes?|shares?|comments?|upvotes?|downvotes?)\b/i,
];

const EMOTIONAL_WORDS = new Set([
  'love','hate','crazy','insane','wild','epic','best','worst','amazing',
  'terrible','beautiful','ugly','fire','trash','goat','mid','middest',
  'incredible','unbelievable','shocking','hilarious','funny','sad','happy',
  'angry','obsessed','addicted','based','cringe','ngl','fr','istg',
  'unreal','dream','nightmare','sheesh','ayo','bruh','lowkey','highkey',
]);

const CONVERSATIONAL_WORDS = new Set([
  'think','feel','believe','opinion','hot','take','controversial','unpopular',
  'just','actually','literally','honestly','seriously','imagine','what','why',
  'how','anyone','someone','everyone','nobody','we','us','them','those',
  'this','that','here','there','now','today','yesterday','tomorrow',
]);

const INDEPENDENT_SOURCES = new Set([
  'reddit','bluesky','dexscreener','pump.fun','hackernews','lobsters',
  'twitter','telegram','discord','youtube','tiktok','instagram','4chan',
]);

interface NarrativeIntelligence {
  isNarrative: boolean;
  score: number;
  reasons: string[];
  breakdown: Record<string, number>;
  narrativeWhy: string;
  topContributingPosts: string[];
  topPlatforms: string[];
  trendCause: string;
}

function computeNarrativeIntelligence(cluster: Cluster, now: number): NarrativeIntelligence {
  const reasons: string[] = [];
  const breakdown: Record<string, number> = {};
  const name = cluster.canonicalName.toLowerCase();
  const nameNorm = normalizeNarrativeName(name);

  // ── CHECK 1: Does the cluster describe a meme, joke, character,
  //    movement, personality, slang, event, or viral concept? (0-30) ──
  let culturalIdeaScore = 0;

  // Direct match to known meme narrative patterns
  for (const p of MEME_NARRATIVE_PATTERNS) {
    if (p.test(name)) { culturalIdeaScore += 15; break; }
  }

  // Check for recognized cultural entities
  const entities = [...cluster.entities.entries()];
  const culturalEntities = entities.filter(([, cat]) =>
    cat === 'meme' || cat === 'character' || cat === 'person' || cat === 'token'
  );
  culturalIdeaScore += Math.min(culturalEntities.length * 5, 15);
  breakdown.culturalIdea = Math.min(culturalIdeaScore, 30);

  if (culturalIdeaScore >= 20) {
    reasons.push(`Recognized cultural idea (${culturalEntities.map(([e]) => e).join(', ')})`);
  } else if (culturalIdeaScore >= 10) {
    reasons.push('Partial cultural recognition');
  }

  // ── CHECK 2: Is the cluster composed mostly of metadata? (0-20) ──
  let metadataPenalty = 0;
  for (const p of METADATA_LABELS) {
    if (p.test(name)) { metadataPenalty += 20; break; }
  }
  // Also check if the cluster name is a common metadata phrase
  const metadataWords = ['trending', 'rank', 'top', 'gainers', 'losers', 'volume', 'liquidity',
    'market', 'cap', 'fdv', 'tvl', 'holders', 'swaps', 'transactions', 'price', 'change',
    '24h', '7d', '1h', '30m', 'boosted', 'new', 'pairs', 'coins', 'tokens', 'topics',
    'language', 'stars', 'forks', 'github', 'coingecko', 'dexscreener', 'created', 'show hn',
    'ask hn', 'hacker news', 'lobsters', 'trending coins', 'trending tokens', 'trending today',
    'most traded', 'highest volume', 'trending repos', 'new pairs', 'new listings'];
  const nameWords = name.split(/\s+/);
  let metadataWordCount = 0;
  for (const w of nameWords) {
    if (metadataWords.includes(w)) metadataWordCount++;
  }
  if (nameWords.length > 0 && metadataWordCount / nameWords.length > 0.5) {
    metadataPenalty = Math.max(metadataPenalty, 15);
  }
  const metadataScore = 20 - Math.min(metadataPenalty, 20);
  breakdown.metadata = metadataScore;
  if (metadataPenalty >= 15) {
    reasons.push('Cluster is metadata/UI label — not a narrative');
  } else if (metadataPenalty >= 8) {
    reasons.push('Contains metadata elements');
  }

  // ── CHECK 3: Does the cluster contain only financial metrics? (0-15) ──
  let financialPenalty = 0;
  for (const p of FINANCIAL_METRICS) {
    if (p.test(name)) { financialPenalty += 15; break; }
  }
  const financialScore = 15 - Math.min(financialPenalty, 15);
  breakdown.financial = financialScore;
  if (financialPenalty >= 10) {
    reasons.push('Cluster is primarily financial metrics — not a narrative');
  }

  // ── CHECK 4: Is it merely a platform UI label? (0-10) ──
  let uiPenalty = 0;
  for (const p of PLATFORM_UI_LABELS) {
    if (p.test(name)) { uiPenalty += 10; break; }
  }
  const uiScore = 10 - Math.min(uiPenalty, 10);
  breakdown.platformUi = uiScore;
  if (uiPenalty >= 8) {
    reasons.push('Cluster is a platform UI label — not a narrative');
  }

  // ── CHECK 5: Does it represent human discussion? (0-10) ──
  const samplePosts = cluster.posts.slice(0, 30);
  let humanDiscussionScore = 0;

  // Check for real discussion signals in posts
  let discussionHits = 0;
  for (const post of samplePosts) {
    const text = `${post.title} ${post.body}`.toLowerCase();
    // Look for opinion-sharing, questions, reactions
    if (text.includes('?') || text.includes('!')) discussionHits++;
    if (/\b(think|feel|believe|opinion|hot take|controversial)\b/i.test(text)) discussionHits++;
    if (/\b(love|hate|crazy|insane|wild|epic|best|worst|amazing)\b/i.test(text)) discussionHits++;
  }
  humanDiscussionScore = Math.min(Math.round((discussionHits / Math.max(samplePosts.length, 1)) * 15), 10);
  breakdown.humanDiscussion = humanDiscussionScore;
  if (humanDiscussionScore >= 7) {
    reasons.push('Strong human discussion signal');
  } else if (humanDiscussionScore >= 3) {
    reasons.push('Moderate discussion activity');
  } else {
    reasons.push('Weak human discussion — may be automated/metadata');
  }

  // ── CHECK 6: Is there emotional or conversational language? (0-10) ──
  let emotionalHits = 0;
  let conversationalHits = 0;
  for (const post of samplePosts) {
    const text = `${post.title} ${post.body}`.toLowerCase();
    const words = text.split(/\s+/);
    for (const w of words) {
      const clean = w.replace(/[^a-z]/g, '');
      if (EMOTIONAL_WORDS.has(clean)) emotionalHits++;
      if (CONVERSATIONAL_WORDS.has(clean)) conversationalHits++;
    }
  }
  const emotionalScore = Math.min(Math.round((emotionalHits / Math.max(samplePosts.length, 1)) * 8), 5);
  const conversationalScore = Math.min(Math.round((conversationalHits / Math.max(samplePosts.length, 1)) * 8), 5);
  breakdown.emotional = emotionalScore;
  breakdown.conversational = conversationalScore;
  if (emotionalScore >= 3) reasons.push('Emotional engagement detected');
  if (conversationalScore >= 3) reasons.push('Conversational/opinion language present');

  // ── CHECK 7: Does it appear naturally across multiple independent posts? (0-5) ──
  let naturalMentionCount = 0;
  for (const post of samplePosts) {
    const text = `${post.title} ${post.body}`.toLowerCase();
    if (text.includes(name) || text.includes(nameNorm)) naturalMentionCount++;
  }
  const mentionRatio = samplePosts.length > 0 ? naturalMentionCount / samplePosts.length : 0;
  const crossPostScore = Math.min(Math.round(mentionRatio * 7), 5);
  breakdown.crossPost = crossPostScore;
  if (crossPostScore >= 4) {
    reasons.push(`Appears naturally in ${Math.round(mentionRatio * 100)}% of posts`);
  } else if (crossPostScore >= 2) {
    reasons.push(`Found in ${Math.round(mentionRatio * 100)}% of posts`);
  }

  // ── CHECK 8: Is it used as a subject rather than as metadata? (0-5) ──
  let subjectScore = 0;
  // A real narrative is typically the subject of discussion, not just a label
  // Check if posts discuss the concept, not just mention it as a tag
  let discussionPosts = 0;
  for (const post of samplePosts) {
    const text = `${post.title} ${post.body}`.toLowerCase();
    const hasNarrative = text.includes(name) || text.includes(nameNorm);
    const isDiscussion = text.length > 50 && (text.includes(' ') && !/^\d/.test(text));
    if (hasNarrative && isDiscussion) discussionPosts++;
  }
  const discussionRatio = samplePosts.length > 0 ? discussionPosts / samplePosts.length : 0;
  subjectScore = Math.min(Math.round(discussionRatio * 7), 5);
  breakdown.subjectUsage = subjectScore;
  if (subjectScore >= 4) {
    reasons.push('Used as subject of discussion — not just a label');
  }

  // ── SEMANTIC TOTAL (0-100) ──
  const semanticTotal = Math.min(
    breakdown.culturalIdea + metadataScore + financialScore + uiScore +
    breakdown.humanDiscussion + breakdown.emotional + breakdown.conversational +
    crossPostScore + subjectScore, 100
  );
  breakdown.semanticTotal = semanticTotal;

  // ── DETERMINE IF THIS IS A REAL NARRATIVE ──
  // Hard reject: metadata-only, financial-only, or platform UI
  const isMetadata = metadataPenalty >= 15;
  const isFinancial = financialPenalty >= 10;
  const isPlatformUi = uiPenalty >= 8;
  const hasNoCulturalIdea = culturalIdeaScore < 5;

  // A cluster must have at least SOME cultural signal to be a narrative
  const isNarrative = !isMetadata && !isFinancial && !isPlatformUi && !hasNoCulturalIdea;

  // ── BUILD NARRATIVE WHY ──
  let narrativeWhy = '';
  if (!isNarrative) {
    if (isMetadata) narrativeWhy = 'Rejected: Cluster represents metadata or UI labels, not a cultural narrative.';
    else if (isFinancial) narrativeWhy = 'Rejected: Cluster is primarily financial metrics, not a meme narrative.';
    else if (isPlatformUi) narrativeWhy = 'Rejected: Cluster is a platform UI label, not human discussion.';
    else narrativeWhy = 'Rejected: No recognizable cultural idea or meme concept detected.';
  } else {
    const strengths: string[] = [];
    if (culturalIdeaScore >= 15) strengths.push('recognized cultural concept');
    if (emotionalScore >= 3) strengths.push('emotional engagement');
    if (conversationalScore >= 3) strengths.push('active discussion');
    if (humanDiscussionScore >= 5) strengths.push('human discussion signal');
    if (crossPostScore >= 3) strengths.push('cross-post presence');
    if (subjectScore >= 3) strengths.push('subject of conversation');
    narrativeWhy = `Accepted: ${strengths.join(', ') || 'qualifies as a meme narrative'}.`;
  }

  // ── TOP CONTRIBUTING POSTS ──
  const topContributingPosts = [...cluster.posts]
    .sort((a, b) => (b.likes + b.shares * 2 + b.comments) - (a.likes + a.shares * 2 + a.comments))
    .slice(0, 5)
    .map((p) => p.title || p.body.slice(0, 100));

  // ── TOP PLATFORMS ──
  const platformCounts = new Map<string, number>();
  for (const p of cluster.posts) {
    platformCounts.set(p.source, (platformCounts.get(p.source) ?? 0) + 1);
  }
  const topPlatforms = [...platformCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([src]) => src);

  // ── TREND CAUSE ──
  const growthPct = computeGrowthPct(cluster, now);
  const velocity = computeVelocity(cluster);
  const ageHours = (now - cluster.firstSeen) / 3600000;
  const trendCauses: string[] = [];
  if (growthPct > 200) trendCauses.push(`Mentions surged +${growthPct}% in the last 12 hours`);
  else if (growthPct > 100) trendCauses.push(`Mentions doubled recently (+${growthPct}%)`);
  else if (growthPct > 50) trendCauses.push(`Steady growth of +${growthPct}%`);
  if (velocity > 5) trendCauses.push(`High velocity: ${Math.round(velocity)} mentions/hour`);
  if (cluster.sources.size >= 3) trendCauses.push(`Spread across ${cluster.sources.size} platforms`);
  if (ageHours < 6) trendCauses.push('Very fresh — detected within the last 6 hours');
  if (trendCauses.length === 0) trendCauses.push(`First seen ${Math.round(ageHours)}h ago with ${cluster.totalMentions} mentions`);
  const trendCause = trendCauses.join('. ');

  return {
    isNarrative,
    score: semanticTotal,
    reasons,
    breakdown,
    narrativeWhy,
    topContributingPosts,
    topPlatforms,
    trendCause,
  };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 7: SCORING (QUALITY + TREND)
// ══════════════════════════════════════════════════════════════════════

function computeNarrativeQualityScore(cluster: Cluster, now: number, intel: NarrativeIntelligence): { score: number; semanticBreakdown: Record<string, number>; reasons: string[] } {
  // Platform diversity (0-1)
  const platformScore = Math.min(cluster.sources.size / 4, 1);

  // Author diversity (0-1)
  const authorScore = Math.min(cluster.authors.size / 15, 1);

  // Engagement (0-1)
  const engagementScore = Math.min(cluster.totalEngagement / 500, 1);

  // Growth (0-1)
  const growthPct = computeGrowthPct(cluster, now);
  const growthScore = Math.min(Math.max(growthPct, 0) / 300, 1);

  // Freshness (0-1)
  const ageHours = (now - cluster.lastSeen) / 3600000;
  const freshnessScore = Math.max(0, 1 - ageHours / 24);

  // Combined narrative quality (0-100)
  // Weights: 35% semantic (from narrative intelligence), 25% platform, 15% authors, 10% engagement, 10% growth, 5% freshness
  const raw =
    (intel.score / 100) * 35 +
    platformScore * 25 +
    authorScore * 15 +
    engagementScore * 10 +
    growthScore * 10 +
    freshnessScore * 5;

  const score = Math.round(raw * 100) / 100;

  const reasons: string[] = [...intel.reasons];
  if (cluster.sources.size >= 3) reasons.push(`Spread across ${cluster.sources.size} platforms`);
  if (cluster.authors.size >= 5) reasons.push(`${cluster.authors.size} unique creators`);

  return { score, semanticBreakdown: intel.breakdown, reasons };
}

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
// SECTION 8: ADAPTIVE THRESHOLDS
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
// SECTION 9: QUALITY FILTER
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

interface RejectionResult {
  rejected: boolean;
  reason: string;
  line: string;
}

function checkRejection(cluster: Cluster, now: number, thresholds: Thresholds): RejectionResult {
  const normName = normalizeNarrativeName(cluster.canonicalName);
  const words = normName ? normName.split(/\s+/) : [];

  // CHECK 1: Platforms
  if (cluster.sources.size < thresholds.minPlatforms) {
    if (!(thresholds.allowSinglePlatform && cluster.sources.size === 1)) {
      return { rejected: true, reason: `only ${cluster.sources.size} platform(s) [${[...cluster.sources].join(', ')}] — need ${thresholds.minPlatforms}+`, line: 'engine.ts: getRejectionReason → cluster.sources.size < thresholds.minPlatforms' };
    }
  }

  // CHECK 2: Authors
  if (cluster.authors.size < thresholds.minAuthors) {
    return { rejected: true, reason: `only ${cluster.authors.size} unique author(s) [${[...cluster.authors].slice(0, 5).join(', ')}${cluster.authors.size > 5 ? '...' : ''}] — need ${thresholds.minAuthors}+`, line: 'engine.ts: getRejectionReason → cluster.authors.size < thresholds.minAuthors' };
  }

  // CHECK 3: Mentions
  if (cluster.totalMentions < thresholds.minMentions) {
    return { rejected: true, reason: `only ${cluster.totalMentions} mention(s) — need ${thresholds.minMentions}+`, line: 'engine.ts: getRejectionReason → cluster.totalMentions < thresholds.minMentions' };
  }

  // CHECK 4: Engagement
  if (cluster.totalEngagement < thresholds.minEngagement) {
    return { rejected: true, reason: `engagement ${cluster.totalEngagement} — below minimum ${thresholds.minEngagement}`, line: 'engine.ts: getRejectionReason → cluster.totalEngagement < thresholds.minEngagement' };
  }

  // CHECK 5: Empty/short name
  if (!normName || normName.length < 2) {
    return { rejected: true, reason: `empty or too short normalized name (was "${cluster.canonicalName}")`, line: 'engine.ts: getRejectionReason → !normName || normName.length < 2' };
  }

  // CHECK 6: Blocked name (exact match)
  if (BLOCKED_NAMES.has(normName)) {
    return { rejected: true, reason: `blocked/generic name "${normName}"`, line: 'engine.ts: getRejectionReason → BLOCKED_NAMES.has(normName)' };
  }

  // CHECK 7: Contains blocked word
  for (const w of words) {
    if (BLOCKED_NAMES.has(w)) {
      return { rejected: true, reason: `contains blocked word "${w}" in "${normName}"`, line: 'engine.ts: getRejectionReason → BLOCKED_NAMES.has(w) inside word loop' };
    }
  }

  // CHECK 8: Blocked pattern
  for (let pi = 0; pi < BLOCKED_PATTERNS.length; pi++) {
    if (BLOCKED_PATTERNS[pi].test(normName)) {
      return { rejected: true, reason: `matches blocked pattern #${pi + 1} "${normName}"`, line: 'engine.ts: getRejectionReason → BLOCKED_PATTERNS[pi].test(normName)' };
    }
  }

  // CHECK 9: Stop word
  if (words.length === 1 && STOP_WORDS.has(words[0])) {
    return { rejected: true, reason: `single stop word "${normName}"`, line: 'engine.ts: getRejectionReason → STOP_WORDS.has(words[0])' };
  }

  // CHECK 10: Trend score
  const trendScore = computeTrendScore(cluster, now);
  if (trendScore < thresholds.minTrendScore) {
    return { rejected: true, reason: `trend score ${trendScore} — below minimum ${thresholds.minTrendScore}`, line: 'engine.ts: getRejectionReason → trendScore < thresholds.minTrendScore' };
  }

  // CHECK 11: Confidence
  const confidencePct = computeConfidence(cluster, now);
  if (confidencePct < thresholds.minConfidence) {
    return { rejected: true, reason: `confidence ${confidencePct}% — below minimum ${thresholds.minConfidence}%`, line: 'engine.ts: getRejectionReason → confidencePct < thresholds.minConfidence' };
  }

  return { rejected: false, reason: '', line: '' };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 10: MAIN ANALYSIS
// ══════════════════════════════════════════════════════════════════════

export function analyzeNarratives(posts: RawPost[]): MemeNarrative[] {
  const now = Date.now();
  const L = (msg: string) => console.log(`[intel] ${msg}`);
  const SEP = '════════════════════════════════════════════════════════════';
  const SEP2 = '────────────────────────────────────────────────────────────';

  const allAuthors = new Set<string>();
  const allSources = new Set<string>();
  for (const p of posts) { allAuthors.add(p.author); allSources.add(p.source); }

  const bySource = new Map<string, number>();
  for (const p of posts) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);

  // ── STAGE 0: COLLECTED ──
  L(SEP);
  L('  COLLECTED POSTS');
  L(SEP);
  L(`  Total:       ${posts.length}`);
  L(`  Authors:     ${allAuthors.size}`);
  L(`  Platforms:   ${allSources.size} (${[...allSources].join(', ')})`);
  for (const [src, count] of bySource) L(`    ${src}: ${count}`);
  L('');

  // ── STAGE 1: CLASSIFIER + CLUSTERING ──
  const { clusters: rawClusters, stats: clusterStats } = clusterPosts(posts);

  L(SEP);
  L('  AFTER CLASSIFIER + CLUSTERING');
  L(SEP);
  L(`  Posts accepted by classifier:      ${clusterStats.accepted}`);
  L(`  Posts rejected (metadata/template): ${clusterStats.rejectedMetadata}`);
  L(`  Posts rejected (classifier):        ${clusterStats.rejectedClassifier}`);
  L(`  Posts rejected (too short):         ${clusterStats.rejectedShort}`);
  L(`  Raw clusters created:               ${rawClusters.length}`);
  L('');

  // ── STAGE 2: ENTITY MERGE ──
  const entityMerged = mergeByEntities(rawClusters);
  const entityMergeCount = rawClusters.length - entityMerged.length;

  L(SEP);
  L('  AFTER ENTITY MERGE');
  L(SEP);
  L(`  Clusters:       ${entityMerged.length}`);
  L(`  Merged by entity: ${entityMergeCount}`);
  L('');

  // ── STAGE 3: ADAPTIVE THRESHOLDS ──
  const thresholds = computeAdaptiveThresholds(posts, entityMerged.length, allAuthors, allSources);

  L(SEP);
  L('  ADAPTIVE THRESHOLDS');
  L(SEP);
  L(`  minAuthors:         ${thresholds.minAuthors}`);
  L(`  minMentions:         ${thresholds.minMentions}`);
  L(`  minPlatforms:        ${thresholds.minPlatforms}`);
  L(`  minEngagement:       ${thresholds.minEngagement}`);
  L(`  minTrendScore:       ${thresholds.minTrendScore}`);
  L(`  minConfidence:       ${thresholds.minConfidence}`);
  L(`  allowSinglePlatform: ${thresholds.allowSinglePlatform}`);
  const impossibleWarnings = detectImpossibleThresholds(thresholds, posts, allAuthors, allSources);
  for (const w of impossibleWarnings) L(`  ⚠ ${w}`);
  L('');

  // ── STAGE 4: EVERY CLUSTER ──
  L(SEP);
  L('  EVERY CLUSTER — DETAIL');
  L(SEP);

  const rejectCounts: Record<string, number> = {};
  let duplicateCount = 0;
  let emptyNameCount = 0;
  const deduped = new Map<string, Cluster>();

  for (let ci = 0; ci < entityMerged.length; ci++) {
    const cluster = entityMerged[ci];
    const normKey = normalizeNarrativeName(cluster.canonicalName);

    L(SEP2);
    L(`  CLUSTER ${ci + 1}: "${cluster.canonicalName}"`);
    L(SEP2);
    L(`  Posts:      ${cluster.totalMentions}`);
    L(`  Authors:    ${cluster.authors.size} (${[...cluster.authors].slice(0, 5).join(', ')}${cluster.authors.size > 5 ? '...' : ''})`);
    L(`  Platforms:  ${cluster.sources.size} (${[...cluster.sources].join(', ')})`);
    L(`  Engagement: ${cluster.totalEngagement}`);
    L(`  Trend:      ${computeTrendScore(cluster, now)}`);
    L(`  Confidence: ${computeConfidence(cluster, now)}%`);
    L(`  Phrases:    ${cluster.phrases.slice(0, 5).join(', ')}${cluster.phrases.length > 5 ? '...' : ''}`);
    L('');

    // CHECK: Empty normalized name
    if (!normKey || normKey.length < 2) {
      emptyNameCount++;
      L(`  Result:     REJECTED`);
      L(`  Reason:     Empty normalized name (was "${cluster.canonicalName}")`);
      L(`  Line:       engine.ts: analyzeNarratives → !normKey || normKey.length < 2`);
      L('');
      continue;
    }

    // CHECK: Quality filters
    const check = checkRejection(cluster, now, thresholds);
    if (check.rejected) {
      rejectCounts[check.reason] = (rejectCounts[check.reason] ?? 0) + 1;
      L(`  Result:     REJECTED`);
      L(`  Reason:     ${check.reason}`);
      L(`  Line:       ${check.line}`);
      L('');
      continue;
    }

    // CHECK: Deduplication
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
      L(`  Result:     MERGED into "${existing.canonicalName}"`);
      L(`  Reason:     Duplicate normalized name "${normKey}"`);
      L(`  Line:       engine.ts: analyzeNarratives → deduped.get(normKey) found existing`);
      L('');
      continue;
    }

    deduped.set(normKey, cluster);
    L(`  Result:     PASSED`);
    L('');
  }

  // ── STAGE 5: REJECTION BREAKDOWN ──
  L(SEP);
  L('  REJECTION BREAKDOWN');
  L(SEP);
  L(`  Empty name:       ${emptyNameCount}`);
  L(`  Duplicates merged: ${duplicateCount}`);
  const sortedRejects = Object.entries(rejectCounts).sort((a, b) => b[1] - a[1]);
  for (const [reason, count] of sortedRejects) {
    L(`  ${count} → ${reason}`);
  }
  L('');

  // ── STAGE 6: NARRATIVE INTELLIGENCE LAYER ──
  const NARRATIVE_QUALITY_MIN = 70;
  const narrativeQualityPassed: Cluster[] = [];
  const narrativeQualityRejected: { cluster: Cluster; reason: string; score: number }[] = [];
  const narrativeIntelligenceMap = new Map<string, NarrativeIntelligence>();

  L(SEP);
  L('  NARRATIVE INTELLIGENCE LAYER');
  L(SEP);

  for (const cluster of deduped.values()) {
    const intel = computeNarrativeIntelligence(cluster, now);
    narrativeIntelligenceMap.set(cluster.key, intel);
    const nq = computeNarrativeQualityScore(cluster, now, intel);

    L(SEP2);
    L(`  "${cluster.canonicalName}"`);
    L(`    Narrative Quality Score: ${nq.score} / 100`);
    L(`    Is Narrative: ${intel.isNarrative}`);
    L(`    Semantic Breakdown:`);
    for (const [k, v] of Object.entries(nq.semanticBreakdown)) {
      L(`      ${k}: ${v}`);
    }
    L(`    Reasons:`);
    for (const r of nq.reasons) L(`      - ${r}`);
    L(`    Why: ${intel.narrativeWhy}`);
    L(`    Top Platforms: ${intel.topPlatforms.join(', ')}`);
    L(`    Trend Cause: ${intel.trendCause}`);

    if (!intel.isNarrative) {
      narrativeQualityRejected.push({ cluster, reason: intel.narrativeWhy, score: nq.score });
      L(`    Result: REJECTED (not a meme narrative)`);
    } else if (nq.score < NARRATIVE_QUALITY_MIN) {
      narrativeQualityRejected.push({ cluster, reason: `narrative quality ${nq.score} < ${NARRATIVE_QUALITY_MIN} threshold`, score: nq.score });
      L(`    Result: REJECTED (below ${NARRATIVE_QUALITY_MIN} threshold)`);
    } else {
      narrativeQualityPassed.push(cluster);
      L(`    Result: PASSED ✓`);
    }
    L('');
  }

  L(`  Passed: ${narrativeQualityPassed.length}`);
  L(`  Rejected: ${narrativeQualityRejected.length}`);
  L('');

  // ── STAGE 7: FINAL NARRATIVES ──
  const narratives: MemeNarrative[] = [];
  for (const cluster of narrativeQualityPassed) {
    const trendScore = computeTrendScore(cluster, now);
    const growthPct = computeGrowthPct(cluster, now);
    const confidencePct = computeConfidence(cluster, now);
    const nq = computeNarrativeQualityScore(cluster, now, narrativeIntelligenceMap.get(cluster.key)!);
    const intel = narrativeIntelligenceMap.get(cluster.key)!;
    const qualityScore = nq.score;
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
      narrativeWhy: intel.narrativeWhy,
      isNarrative: intel.isNarrative,
      topContributingPosts: intel.topContributingPosts,
      topPlatforms: intel.topPlatforms,
      trendCause: intel.trendCause,
    });
  }

  narratives.sort((a, b) => b.qualityScore - a.qualityScore);
  const final = narratives.slice(0, MAX_NARRATIVES);

  // ── FINAL SUMMARY ──
  L(SEP);
  L('  SUMMARY');
  L(SEP);
  L(`  Collected Posts:       ${posts.length}`);
  L(`  Extracted Phrases:     (see raw clusters above)`);
  L(`  Clusters:              ${entityMerged.length}`);
  L(`  Rejected Generic:      ${Object.entries(rejectCounts).filter(([k]) => k.includes('blocked')).reduce((s, [, v]) => s + v, 0)}`);
  L(`  Rejected Metadata:     ${clusterStats.rejectedMetadata}`);
  L(`  Rejected One Author:   ${Object.entries(rejectCounts).filter(([k]) => k.includes('author')).reduce((s, [, v]) => s + v, 0)}`);
  L(`  Rejected One Platform: ${Object.entries(rejectCounts).filter(([k]) => k.includes('platform')).reduce((s, [, v]) => s + v, 0)}`);
  L(`  Rejected Low Score:    ${Object.entries(rejectCounts).filter(([k]) => k.includes('trend') || k.includes('confidence') || k.includes('engagement')).reduce((s, [, v]) => s + v, 0)}`);
  L(`  Rejected Duplicate:    ${duplicateCount}`);
  L(`  Narrative Intel Rejected: ${narrativeQualityRejected.length} (below ${NARRATIVE_QUALITY_MIN} threshold or not narrative)`);
  L(`  Final Narratives:      ${final.length}`);
  L(SEP);

  if (final.length === 0) {
    L('');
    L('  ╔══════════════════════════════════════════════╗');
    L('  ║  WHY ZERO NARRATIVES                        ║');
    L('  ╚══════════════════════════════════════════════╝');
    L('');

    // Find the LAST rejection — what rule removed the final clusters?
    const lastRejects = sortedRejects.filter(([, c]) => c > 0);
    if (lastRejects.length > 0) {
      const [topReason, topCount] = lastRejects[0];
      L(`  The #1 rejection rule removed ${topCount} cluster(s):`);
      L(`  "${topReason}"`);
      L('');
    }

    if (narrativeQualityRejected.length > 0) {
      L(`  Narrative intelligence rejected ${narrativeQualityRejected.length} cluster(s):`);
      for (const { cluster, score, reason } of narrativeQualityRejected.slice(0, 5)) {
        L(`    "${cluster.canonicalName}" — score ${score}/100`);
        L(`      ${reason}`);
      }
      L('');
    }

    L(`  Pipeline flow:`);
    L(`    ${posts.length} posts`);
    L(`    ↓ ${clusterStats.rejectedMetadata} metadata/template rejected`);
    L(`    ↓ ${clusterStats.rejectedClassifier} classifier rejected`);
    L(`    ↓ ${clusterStats.accepted} accepted → ${rawClusters.length} raw clusters`);
    L(`    ↓ ${entityMergeCount} entity-merged → ${entityMerged.length} clusters`);
    L(`    ↓ ${emptyNameCount} empty name`);
    L(`    ↓ ${Object.values(rejectCounts).reduce((s, v) => s + v, 0)} quality filter rejected`);
    L(`    ↓ ${duplicateCount} duplicate merged`);
    L(`    ↓ ${narrativeQualityRejected.length} narrative intelligence rejected (below ${NARRATIVE_QUALITY_MIN} or not narrative)`);
    L(`    = ${narrativeQualityPassed.length} passed narrative intel → ${final.length} narratives`);
    L('');

    // Find the exact line responsible for the most rejections
    if (sortedRejects.length > 0) {
      const [worstReason] = sortedRejects[0];
      L(`  HIGHEST-IMPACT REJECTION RULE:`);
      L(`  "${worstReason}"`);
      L('');
      if (worstReason.includes('platform')) L(`  → Line: engine.ts: checkRejection → cluster.sources.size < thresholds.minPlatforms`);
      else if (worstReason.includes('author')) L(`  → Line: engine.ts: checkRejection → cluster.authors.size < thresholds.minAuthors`);
      else if (worstReason.includes('mention')) L(`  → Line: engine.ts: checkRejection → cluster.totalMentions < thresholds.minMentions`);
      else if (worstReason.includes('engagement')) L(`  → Line: engine.ts: checkRejection → cluster.totalEngagement < thresholds.minEngagement`);
      else if (worstReason.includes('trend')) L(`  → Line: engine.ts: checkRejection → trendScore < thresholds.minTrendScore`);
      else if (worstReason.includes('confidence')) L(`  → Line: engine.ts: checkRejection → confidencePct < thresholds.minConfidence`);
      else if (worstReason.includes('blocked')) L(`  → Line: engine.ts: checkRejection → BLOCKED_NAMES.has(normName) or BLOCKED_NAMES.has(w)`);
      else L(`  → Line: engine.ts: checkRejection → see reason above`);
    }

    if (narrativeQualityRejected.length > 0 && sortedRejects.length === 0) {
      L(`  HIGHEST-IMPACT REJECTION RULE:`);
      L(`  "narrative intelligence below ${NARRATIVE_QUALITY_MIN} threshold or not a meme narrative"`);
      L('');
      L(`  → Line: engine.ts: analyzeNarratives → NARRATIVE_QUALITY_MIN threshold + narrative intelligence`);
    }
  }

  L(SEP);
  return final;
}
