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
// SECTION 2: TEMPLATE & METRIC DETECTION
// ══════════════════════════════════════════════════════════════════════

const TEMPLATE_PATTERNS: RegExp[] = [
  /\b(trending|trend)\s+(on|in|now|today)\b/i,
  /\b(trending|trend)\b/i,
  /\brank\s*#?\d/i,
  /\b(top|bottom)\s+(gainers?|losers?|traded|volume|coins?|tokens?|pairs?|boosted)\b/i,
  /\b24\s*h\s*(change|gain|loss|volume|move)\b/i,
  /\b(7d|1h|30m)\s*(change|gain|loss|volume)\b/i,
  /\b(price|market)\s*(change|move|cap|pair)\b/i,
  /\b(volume|liquidity|fdv|tvl|apy|apr)\b/i,
  /\b(holders?|swaps?|transactions?)\b/i,
  /\bnew\s+(pairs?|listings?|coins?|tokens?)\b/i,
  /\bshow\s+hn\b/i,
  /\blaunched\s+(on|via)\b/i,
  /\b(boosted|boosting)\b/i,
  /\bsee\s+more\b/i,
  /\b(view|explore)\s+(more|all|details?)\b/i,
  /\b(sign|log\s*in|log\s*out|connect|disconnect)\b/i,
  /\b(buy|sell|swap|bridge)\s+(now|token|coin)\b/i,
  /\b(chain|network)\s*(mainnet|testnet|devnet)\b/i,
];

const UI_LABELS = new Set([
  'trending','rank','top','gainers','losers','volume','liquidity','market',
  'cap','fdv','tvl','holders','swaps','transactions','price','change',
  '24h','7d','1h','30m','boosted','new','pairs','coins','tokens','trendingon',
  'coingecko','dexscreener','topics','language','stars','forks','github',
  'coin','token','pair','dex','chain','solana','ethereum','base','bnb',
  'bitcoin','matic','polygon','arbitrum','optimism','avalanche','cardano',
  'showhn','launchedon','boostedon','seemore','viewmore','exploreall',
  'sign','login','logout','connect','disconnect','buy','sell','swap','bridge',
  'mainnet','testnet','devnet','network','chain','blockchain','defi','nft',
  'web3','dapp','protocol','dao','governance','staking','yield','farming',
  'liquidity','pool','amms','order','book','limit','market','stop',
  'portfolio','wallet','balance','address','transaction','block','gas',
  'gwei','wei','lamports','sol','usdc','usdt','dai','eth','btc',
]);

const FINANCIAL_METRICS = new Set([
  'volume','liquidity','fdv','tvl','apy','apr','tvl','marketcap',
  'price','change','gain','loss','gainers','losers','traded',
  'holders','swaps','transactions','pair','token','coin','dex',
  'chain','network','mainnet','testnet','swap','buy','sell','bridge',
  'staking','yield','farming','pool','amms','order','book','portfolio',
  'wallet','balance','gas','gwei','wei','lamports',
]);

// ══════════════════════════════════════════════════════════════════════
// SECTION 2B: PROVIDER NOISE FILTERS
// ══════════════════════════════════════════════════════════════════════

const METADATA_LABELS = new Set([
  'trending','trend','rank','top','gainers','losers','volume','liquidity',
  'market','cap','fdv','tvl','holders','swaps','transactions','price',
  'change','24h','7d','1h','30m','boosted','new','pairs','coins','tokens',
  'topics','language','stars','forks','github','coingecko','dexscreener',
  'solana','ethereum','bitcoin','base','bnb','polygon','arbitrum',
  'show hn','ask hn','hacker news','lobsters','lobste.rs',
]);

const COINGECKO_NOISE_RE = /^(trending|trending coins|trending tokens|top coins|popular|gainers|losers|by 24h|by market cap|by volume|by price|by change)$/i;
const DEXSCREENER_NOISE_RE = /^(boosted|trending|top boosted|new pairs|new listings|most traded|highest volume|trending on|boosted on)$/i;
const GITHUB_NOISE_RE = /^(trending|trending repos|trending today|trending this week|popular|new|created|stars|forks)$/i;

// ══════════════════════════════════════════════════════════════════════
// SECTION 3: CONTENT CLASSIFIER
// ══════════════════════════════════════════════════════════════════════

type ContentType = 'meme_narrative' | 'social_discussion' | 'viral_topic' | 'token_name' | 'news_headline' | 'technical' | 'rejected';

const MEME_LEXICON = new Set([
  'brainrot','gigachad','skibidi','rizz','sigma','beta','alpha','npc',
  'copypasta','stan','simp','wholesome','keanu','based','cringe','yeet',
  'slay','periodt','bet','no cap','fr','ong','istg','smh','nvm',
  'btw','ily','ikr','omg','bruh','sus','among','fortnite','minecraft',
  'minecraft','roblox','valorant','apex','overwatch','pubg','cod','gta',
  'pokemon','mario','zelda','kirby','donkey','yoshi','peach','bowser',
  'meme','viral','trending','fyp','for you','foryou','foryoupage',
  'greenscreen','duet','stitch','sound','audio','trending sound',
  'cat','dog','frog','duck','bear','panda','penguin','shark','whale',
  'dragon','unicorn','alien','robot','zombie','ghost','skeleton','demon',
  'angel','fairy','witch','wizard','ninja','pirate','viking','knight',
  'banana','pizza','taco','sushi','donut','burger','fries','ice cream',
  'anime','manga','waifu','husbando','cosplay','otaku','weeb','kawaii',
  'desu','nani','sugoi','kawaii','senpai','sensei','sensei',
  'ayo','oof','bruh','sheesh','caught','caught in 4k','4k',
  'unreal','dream','nightmare','core','era','aesthetic','vibe',
  'delulu','delusional','ick','ickk','red flag','green flag',
  'ick','delulu','main character','mc','npc','protagonist',
]);

const PERSONS = new Set([
  'elon','musk','trump','biden','kanye','kim','kardashian','taylor',
  'swift','drake','kendrick','beyonce','rihanna','adele','ed sheeran',
  'billie','eilish','doja','cat','post','malone','travis','scott',
  'kylie','jenner','hailey','bieber','selena','gomez','zayn','malik',
  'harry','styles','niall','horan','liam','payne','louis','tomlinson',
  'snoop','dogg','eminem','jay','bey','kanye','west','kim','kardashian',
  'mark','zuckerberg','tim','cook','sundar','pichai','satya','nadella',
  'jeff','bezos','bill','gates','sam','altman','gpt','openai','chatgpt',
  'midjourney','dall','stable','diffusion','claude','gemini','llama',
]);

const CHARACTERS = new Set([
  'pepe','doge','shiba','bonk','wojak','chad','gigachad','doomer',
  'boomer','zoomer','coomer','poozer','npc','soy','tradwife','pickme',
  'mr','miss','dr','prof','sir','lord','king','queen','prince','princess',
  'captain','general','commander','president','minister','senator',
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

function extractEntities(text: string): { entity: string; category: string }[] {
  const lower = text.toLowerCase();
  const entities: { entity: string; category: string }[] = [];
  const seen = new Set<string>();

  for (const word of lower.split(/\s+/)) {
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (clean.length < 3) continue;
    if (STOP_WORDS.has(clean)) continue;
    if (UI_LABELS.has(clean)) continue;
    if (FINANCIAL_METRICS.has(clean)) continue;

    if (!seen.has(clean)) {
      if (MEME_LEXICON.has(clean)) { entities.push({ entity: clean, category: 'meme' }); seen.add(clean); }
      else if (PERSONS.has(clean)) { entities.push({ entity: clean, category: 'person' }); seen.add(clean); }
      else if (CHARACTERS.has(clean)) { entities.push({ entity: clean, category: 'character' }); seen.add(clean); }
      else if (BRANDS.has(clean)) { entities.push({ entity: clean, category: 'brand' }); seen.add(clean); }
    }
  }

  const camelWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
  for (const w of camelWords) {
    const low = w.toLowerCase();
    if (!STOP_WORDS.has(low) && !UI_LABELS.has(low) && low.length >= 3 && !seen.has(low)) {
      entities.push({ entity: low, category: 'proper_noun' });
      seen.add(low);
    }
  }

  return entities;
}

function classifyText(text: string): ContentType {
  const clean = normalize(text);
  const words = clean.split(/\s+/);
  const wordCount = words.length;

  if (wordCount === 0) return 'rejected';
  if (wordCount === 1 && words[0].length < 3) return 'rejected';

  if (/^\d+(\.\d+)?%?$/.test(clean.trim())) return 'rejected';
  if (/^\d+(\.\d+)?$/.test(clean.trim())) return 'rejected';

  for (const p of TEMPLATE_PATTERNS) {
    if (p.test(clean)) return 'rejected';
  }

  for (const w of words) {
    if (UI_LABELS.has(w)) return 'rejected';
  }

  let financialCount = 0;
  for (const w of words) {
    if (FINANCIAL_METRICS.has(w)) financialCount++;
  }
  if (financialCount >= 2) return 'rejected';

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

  const techPatterns = ['algorithm','protocol','framework','library','database','api',
    'server','client','network','security','encryption','authentication',
    'deployment','container','kubernetes','docker','microservice','compiler',
    'runtime','debug','testing','ci','cd','pipeline','repository','commit'];

  let techScore = 0;
  for (const w of words) {
    if (techPatterns.includes(w)) techScore++;
  }
  if (techScore >= 2) return 'technical';

  if (wordCount >= 4) return 'social_discussion';
  return 'rejected';
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 4: TOKEN NAME NORMALIZATION & CLUSTERING
// ══════════════════════════════════════════════════════════════════════

const TOKEN_SUFFIX_RE = /\s*(coin|token|project|protocol|chain|network|inu|finance|protocol|dao|labs|verse|swap|pad|market|exchange)$/i;
const TOKEN_PREFIX_RE = /^[\$#\s]+/;
const KNOWN_TOKEN_ALIASES: Record<string, string> = {
  'pepe': 'pepe',
  'pepe coin': 'pepe',
  'pepecoin': 'pepe',
  'pepe the frog': 'pepe',
  'bonk': 'bonk',
  'bonk coin': 'bonk',
  'bonkcoin': 'bonk',
  'doge': 'doge',
  'dogecoin': 'doge',
  'doge coin': 'doge',
  'shiba': 'shiba',
  'shiba inu': 'shiba',
  'shib': 'shiba',
  'shibainu': 'shiba',
  'wojak': 'wojak',
  'wojak coin': 'wojak',
  'wojakcoin': 'wojak',
  'dogwifhat': 'dogwifhat',
  'dog wif hat': 'dogwifhat',
  'cat in a dogs world': 'cat in a dogs world',
  'meow': 'cat in a dogs world',
  'popcat': 'popcat',
  'pop cat': 'popcat',
  'brett': 'brett',
  'brett on base': 'brett',
  'mog': 'mog',
  'mog coin': 'mog',
  'mogcoin': 'mog',
  'bome': 'bome',
  'book of meme': 'bome',
  'bookofmeme': 'bome',
  'wif': 'wif',
  'bONK': 'bonk',
};

function normalizeTokenName(name: string): string {
  let norm = name.toLowerCase().trim();
  norm = norm.replace(TOKEN_PREFIX_RE, '');
  norm = norm.replace(TOKEN_SUFFIX_RE, '');
  norm = norm.replace(/[^a-z0-9\s]/g, '');
  norm = norm.replace(/\s+/g, ' ').trim();
  return norm;
}

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

function clusterPosts(posts: RawPost[]): Cluster[] {
  const map = new Map<string, Cluster>();
  const now = Date.now();
  const WINDOW = 24 * 3600 * 1000;
  const recent = posts.filter((p) => now - p.timestamp <= WINDOW);

  for (const post of recent) {
    const allText = `${post.title} ${post.body}`;
    const classification = classifyText(allText);
    if (classification === 'rejected') continue;

    const sentences = allText.split(/[.!?\n]+/).filter((s) => s.trim().length > 10);
    for (const sentence of sentences) {
      const sentClass = classifyText(sentence);
      if (sentClass === 'rejected') continue;

      const words = tokenize(sentence);
      if (words.length < 2) continue;

      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        const key = clusterKey(phrase);
        if (key.length < 5) continue;

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

  return clusters.filter((c) => !merged.has(c.key));
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 4B: ENTITY-BASED CLUSTER MERGING
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

  for (const [entity, group] of entityMap) {
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
// SECTION 5: VALIDATION & SCORING
// ══════════════════════════════════════════════════════════════════════

const TRUSTED_SOURCES = new Set(['reddit', 'bluesky', 'dexscreener', 'pumpfun']);

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

function computeTrendScore(cluster: Cluster, now: number): number {
  const mentionScore = Math.min(cluster.totalMentions / 100, 1);
  const growthPct = computeGrowthPct(cluster, now);
  const growthScore = Math.min(Math.max(growthPct, 0) / 500, 1);
  const velocity = computeVelocity(cluster);
  const velocityScore = Math.min(velocity / 10, 1);
  const sourceScore = Math.min(cluster.sources.size / 4, 1);
  const authorScore = Math.min(cluster.authors.size / 30, 1);
  const ageHours = (now - cluster.lastSeen) / 3600000;
  const recencyBoost = Math.max(0, 1 - ageHours / 24);
  const entityBonus = cluster.entities.size > 0 ? 0.1 : 0;
  const raw =
    mentionScore * 0.25 + growthScore * 0.20 + velocityScore * 0.20 +
    sourceScore * 0.15 + authorScore * 0.10 + recencyBoost * 0.10 + entityBonus;
  return Math.round(raw * 1000) / 10;
}

function computeConfidence(cluster: Cluster, now: number): number {
  const sourcePct = Math.min(cluster.sources.size / 3, 1);
  const mentionPct = Math.min(cluster.totalMentions / 50, 1);
  const growthPct = Math.min(Math.max(computeGrowthPct(cluster, now), 0) / 300, 1);
  const authorPct = Math.min(cluster.authors.size / 15, 1);
  return Math.round((sourcePct * 0.35 + mentionPct * 0.25 + growthPct * 0.25 + authorPct * 0.15) * 100);
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
  if (cluster.authors.size > 20) parts.push(`${cluster.authors.size} unique creators discussing this`);
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

// ══════════════════════════════════════════════════════════════════════
// SECTION 6: QUALITY FILTER & DEDUPLICATION
// ══════════════════════════════════════════════════════════════════════

const MAX_NARRATIVES = 15;

const GENERIC_PHRASES = new Set([
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
  'showhn','launchedon','boostedon','seemore','viewmore','exploreall',
  'rank','top','bottom','best','worst','first','last','next','prev',
  'general','random','stuff','things','something','anything','nothing',
  'update','news','breaking','alert','warning','notice','info','data',
  'result','results','list','item','entry','number','status','system',
  'check','test','demo','example','sample','placeholder','lorem','ipsum',
]);

const PLATFORM_LABELS = new Set([
  'reddit','bluesky','twitter','x','telegram','discord','youtube','tiktok',
  'instagram','facebook','snapchat','twitch','pinterest','linkedin',
  'coingecko','dexscreener','github','hackernews','hacker news','lobste.rs',
  'show hn','ask hn','hn','lobsters',
]);

const TOKEN_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SYMBOL_PATTERN = /^[A-Z]{1,6}$/;
const GENERIC_WORDS = new Set([
  'the','and','for','are','but','not','you','all','can','had','her','was',
  'one','our','out','day','get','has','him','his','how','its','may','new',
  'now','old','see','way','who','did','got','let','say','she','too','use',
  'web','app','use','run','set','try','ask','men','buy','eye','job','pay',
  'lot','big','few','top','end','put','own','say','low','run','got','bit',
]);

function normalizeNarrativeName(name: string): string {
  let norm = name.toLowerCase().trim();
  norm = norm.replace(/^[\$#]+/g, '');
  norm = norm.replace(TOKEN_SUFFIX_RE, '');
  norm = norm.replace(/[^a-z0-9\s]/g, '');
  norm = norm.replace(/\s+/g, ' ').trim();
  return norm;
}

function getRejectionReason(cluster: Cluster, now: number): string | null {
  const normName = normalizeNarrativeName(cluster.canonicalName);
  const words = normName.split(/\s+/);

  if (cluster.sources.size < 2) {
    const allTrusted = [...cluster.sources].every((s) => TRUSTED_SOURCES.has(s));
    const highEngagement = cluster.totalEngagement > 50;
    if (!(allTrusted && highEngagement)) {
      return `only ${cluster.sources.size} platform(s) (need 2+ unless trusted+high engagement)`;
    }
  }
  if (cluster.authors.size < 2) return `only ${cluster.authors.size} unique author(s) (need 2+)`;
  if (cluster.totalMentions < 3) return `only ${cluster.totalMentions} mention(s) (need 3+)`;

  if (words.length === 1 && GENERIC_WORDS.has(words[0])) return `generic word "${normName}"`;
  if (GENERIC_PHRASES.has(normName)) return `generic phrase "${normName}"`;
  for (const w of words) {
    if (GENERIC_PHRASES.has(w)) return `contains generic word "${w}"`;
    if (PLATFORM_LABELS.has(w)) return `contains platform label "${w}"`;
  }
  if (PLATFORM_LABELS.has(normName)) return `platform label "${normName}"`;

  if (COINGECKO_NOISE_RE.test(normName)) return `CoinGecko metadata noise`;
  if (DEXSCREENER_NOISE_RE.test(normName)) return `DexScreener metadata noise`;
  if (GITHUB_NOISE_RE.test(normName)) return `GitHub metadata noise`;

  if (TOKEN_ADDRESS_RE.test(normName.replace(/\s/g, ''))) return `token address`;
  if (words.length <= 2 && words.every((w) => SYMBOL_PATTERN.test(w))) return `symbol-only name`;

  const hexPattern = /^(0x)?[0-9a-f]{8,}$/i;
  if (hexPattern.test(normName.replace(/\s/g, ''))) return `hex/hash pattern`;

  if (words.every((w) => GENERIC_WORDS.has(w))) return `all generic words`;

  const trendScore = computeTrendScore(cluster, now);
  if (trendScore < 30) return `trend score ${trendScore} below minimum 30`;

  const confidencePct = computeConfidence(cluster, now);
  if (confidencePct < 40) return `confidence ${confidencePct}% below minimum 40%`;

  return null;
}

function isLowQuality(cluster: Cluster, now: number): boolean {
  return getRejectionReason(cluster, now) !== null;
}

function computeQualityScore(cluster: Cluster, now: number): number {
  const platformDiversity = Math.min(cluster.sources.size / 4, 1);
  const authorScore = Math.min(cluster.authors.size / 30, 1);
  const growthPct = computeGrowthPct(cluster, now);
  const growthScore = Math.min(Math.max(growthPct, 0) / 500, 1);
  const velocity = computeVelocity(cluster);
  const velocityScore = Math.min(velocity / 10, 1);
  const engagementScore = Math.min(cluster.totalEngagement / 1000, 1);
  const ageHours = (now - cluster.lastSeen) / 3600000;
  const freshnessScore = Math.max(0, 1 - ageHours / 24);
  const confidence = computeConfidence(cluster, now) / 100;

  const raw =
    platformDiversity * 0.35 +
    authorScore * 0.20 +
    growthScore * 0.15 +
    velocityScore * 0.10 +
    engagementScore * 0.10 +
    freshnessScore * 0.05 +
    confidence * 0.05;

  return Math.round(raw * 10000) / 100;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 7: CATEGORY DETECTION
// ══════════════════════════════════════════════════════════════════════

const WORD_MAP: Record<string, string> = {
  cat:'animal',dog:'animal',hamster:'animal',mouse:'animal',frog:'animal',
  duck:'animal',cow:'animal',pig:'animal',bear:'animal',wolf:'animal',
  fox:'animal',penguin:'animal',whale:'animal',shark:'animal',dragon:'animal',
  unicorn:'animal',llama:'animal',gorilla:'animal',monkey:'animal',lion:'animal',
  tiger:'animal',panda:'animal',gecko:'animal',pepe:'animal',doge:'animal',
  shiba:'animal',bonk:'animal',
  ai:'tech',robot:'tech',quantum:'tech',cyber:'tech',blockchain:'tech',
  neural:'tech',gpu:'tech',laser:'tech',neon:'tech',drone:'tech',chip:'tech',
  ninja:'action',warrior:'action',pirate:'action',viking:'action',knight:'action',
  space:'space',moon:'space',mars:'space',rocket:'space',star:'space',
  galaxy:'space',cosmic:'space',alien:'space',ufo:'space',
  banana:'food',pizza:'food',taco:'food',sushi:'food',donut:'food',
  pixel:'retro',retro:'retro',arcade:'retro',
  dark:'dark',shadow:'dark',void:'dark',
  anime:'anime',manga:'anime',cosplay:'anime',waifu:'anime',
  celebrity:'celebrity',famous:'celebrity',
  meme:'meme',viral:'meme',brainrot:'meme',skibidi:'meme',gigachad:'meme',
  npc:'meme',sigma:'meme',copypasta:'meme',stan:'meme',
};

function detectCategory(phrase: string): string {
  const words = phrase.split(/\s+/);
  const scores: Record<string, number> = {};
  for (const w of words) {
    const cat = WORD_MAP[w];
    if (cat) scores[cat] = (scores[cat] ?? 0) + 1;
  }
  if (phrase.includes('quantum') || phrase.includes('cyber') || phrase.includes('neon')) scores.tech = (scores.tech ?? 0) + 2;
  if (phrase.includes('moon') || phrase.includes('rocket')) scores.space = (scores.space ?? 0) + 2;
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    const LABELS: Record<string, string> = {
      animal:'Animals', tech:'Technology', action:'Action', space:'Space',
      food:'Food', retro:'Retro Gaming', dark:'Dark Humor', anime:'Anime',
      celebrity:'Celebrity', meme:'Internet Meme',
    };
    return LABELS[sorted[0][0]] ?? 'General Meme';
  }
  return 'General Meme';
}

function capitalize(s: string): string {
  return s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 8: MAIN ANALYSIS
// ══════════════════════════════════════════════════════════════════════

export function analyzeNarratives(posts: RawPost[]): MemeNarrative[] {
  const now = Date.now();

  console.log(`[intel] === ANALYSIS START ===`);
  console.log(`[intel] Total posts received: ${posts.length}`);

  const bySource = new Map<string, number>();
  for (const p of posts) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);
  for (const [src, count] of bySource) {
    console.log(`[intel]   ${src}: ${count} posts`);
  }

  const clusters = clusterPosts(posts);
  console.log(`[intel] Clusters after phrase extraction + fuzzy merge: ${clusters.length}`);

  const entityMerged = mergeByEntities(clusters);
  console.log(`[intel] Clusters after entity-based merge: ${entityMerged.length}`);

  const rejectCounts: Record<string, number> = {};
  let genericCount = 0;
  let duplicateCount = 0;

  const deduped = new Map<string, Cluster>();
  for (const cluster of entityMerged) {
    const normKey = normalizeNarrativeName(cluster.canonicalName);
    if (!normKey) {
      console.log(`[intel] CLUSTER "${cluster.canonicalName}" -> REJECTED: empty normalized name`);
      continue;
    }

    const reason = getRejectionReason(cluster, now);
    if (reason) {
      console.log(`[intel] CLUSTER "${cluster.canonicalName}" (${cluster.phrases.length} phrases)`);
      console.log(`[intel]   Mentions: ${cluster.totalMentions} | Authors: ${cluster.authors.size} | Platforms: ${[...cluster.sources].join(', ')}`);
      console.log(`[intel]   Engagement: ${cluster.totalEngagement} | Trend: ${computeTrendScore(cluster, now)} | Confidence: ${computeConfidence(cluster, now)}`);
      console.log(`[intel]   REJECTED: ${reason}`);
      rejectCounts[reason] = (rejectCounts[reason] ?? 0) + 1;
      continue;
    }

    const existing = deduped.get(normKey);
    if (existing) {
      duplicateCount++;
      console.log(`[intel] CLUSTER "${cluster.canonicalName}" MERGED into "${existing.canonicalName}" (norm: ${normKey})`);
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
    } else {
      console.log(`[intel] CLUSTER "${cluster.canonicalName}" -> ACCEPTED`);
      console.log(`[intel]   Mentions: ${cluster.totalMentions} | Authors: ${cluster.authors.size} | Platforms: ${[...cluster.sources].join(', ')}`);
      console.log(`[intel]   Engagement: ${cluster.totalEngagement} | Trend: ${computeTrendScore(cluster, now)} | Confidence: ${computeConfidence(cluster, now)}`);
      deduped.set(normKey, cluster);
    }
  }

  console.log(`[intel] === DIAGNOSTICS SUMMARY ===`);
  console.log(`[intel] Posts collected: ${posts.length}`);
  console.log(`[intel] Clusters created (phrase-based): ${clusters.length}`);
  console.log(`[intel] Clusters after entity merge: ${entityMerged.length}`);
  console.log(`[intel] Clusters after dedup: ${deduped.size}`);
  console.log(`[intel] Duplicate merges: ${duplicateCount}`);
  console.log(`[intel] Rejection breakdown:`);
  const sortedRejects = Object.entries(rejectCounts).sort((a, b) => b[1] - a[1]);
  for (const [reason, count] of sortedRejects) {
    console.log(`[intel]   ${count} -> ${reason}`);
  }
  console.log(`[intel] Remaining: ${deduped.size}`);

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
  console.log(`[intel] Final narratives returned: ${final.length}`);
  for (const n of final) {
    console.log(`[intel]   #${final.indexOf(n) + 1} ${n.narrative} | quality=${n.qualityScore} trend=${n.trendScore} conf=${n.confidencePct}% mentions=${n.mentionCount} authors=${n.uniqueAuthors} platforms=${n.sourceCount}`);
  }
  console.log(`[intel] === ANALYSIS END ===`);
  return final;
}
