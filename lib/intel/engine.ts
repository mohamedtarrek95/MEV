import type { RawPost, NarrativeCluster, MemeNarrative, ProviderCategory } from './types.js';

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

function tokenize(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 2: ENTITY EXTRACTION & NORMALIZATION
//
// This is the foundation of the new pipeline.
// Entities are extracted FIRST. They become cluster keys.
// ══════════════════════════════════════════════════════════════════════

const CASHTAG_RE = /\$([A-Za-z]{2,10})\b/g;
const HASHTAG_RE = /#([A-Za-z0-9_]{2,30})\b/g;

const KNOWN_TOKEN_NAMES = new Set([
  'pepe','doge','shiba','bonk','wojak','cat','dog','frog','duck','bear',
  'panda','penguin','shark','whale','dragon','unicorn','alien','robot',
  'zombie','ghost','skeleton','mario','luigi','pikachu','charizard',
  'spongebob','patrick','tom','jerry','bugs','bunny','mickey','minnie',
  'elsa','simba','shrek','popcat','brett','mog','bome','wif','airdrop',
  'catcoin','dogcoin','frogcoin','bonkcoin','pepecoin','dogecoin',
  'shiba','shibainu','wojakcoin','popcatcoin',
  'mew','bome','bookofmeme','catcoin','dogcoin',
]);

const KNOWN_TOKEN_ALIASES: Record<string, string> = {
  'pepe': 'PEPE', 'pepe coin': 'PEPE', 'pepecoin': 'PEPE', 'pepe the frog': 'PEPE',
  'bonk': 'BONK', 'bonk coin': 'BONK', 'bonkcoin': 'BONK', 'bonk inu': 'BONK',
  'doge': 'DOGE', 'dogecoin': 'DOGE', 'doge coin': 'DOGE',
  'shiba': 'SHIBA', 'shiba inu': 'SHIBA', 'shib': 'SHIBA', 'shibainu': 'SHIBA',
  'wojak': 'WOJAK', 'wojak coin': 'WOJAK', 'wojakcoin': 'WOJAK',
  'dogwifhat': 'WIF', 'dog wif hat': 'WIF', 'wif': 'WIF',
  'popcat': 'POPCAT', 'pop cat': 'POPCAT',
  'brett': 'BRETT', 'brett on base': 'BRETT',
  'mog': 'MOG', 'mog coin': 'MOG', 'mogcoin': 'MOG',
  'bome': 'BOME', 'book of meme': 'BOME', 'bookofmeme': 'BOME',
  'cat in a dogs world': 'MEW', 'meow': 'MEW', 'mew': 'MEW',
};

const TOKEN_SUFFIX_RE = /\s*(coin|token|project|protocol|chain|network|inu|finance|dao|labs|verse|swap|pad|market|exchange)$/i;

function normalizeEntity(raw: string): string {
  let norm = raw.toLowerCase().trim();
  norm = norm.replace(/^[\$#\s]+/, '');
  norm = norm.replace(TOKEN_SUFFIX_RE, '');
  norm = norm.replace(/[^a-z0-9\s]/g, '');
  norm = norm.replace(/\s+/g, ' ').trim();
  if (KNOWN_TOKEN_ALIASES[norm]) return KNOWN_TOKEN_ALIASES[norm];
  if (norm.length >= 2) return norm.toUpperCase();
  return '';
}

// ── Lexicon sets for entity extraction ──

const MEME_LEXICON = new Set([
  'brainrot','gigachad','skibidi','rizz','sigma','beta','alpha','npc',
  'copypasta','stan','simp','wholesome','based','cringe','yeet',
  'slay','periodt','bet','no cap','fr','ong','istg','smh','nvm',
  'btw','ily','ikr','omg','bruh','sus','among','fortnite','minecraft',
  'roblox','valorant','apex','overwatch','pubg','cod','gta',
  'pokemon','mario','zelda','kirby','donkey','yoshi','peach','bowser',
  'meme','viral','fyp','for you','foryoupage',
  'greenscreen','duet','stitch','sound','audio',
  'ayo','oof','sheesh','caught','caught in 4k','4k',
  'unreal','dream','nightmare','core','era','aesthetic','vibe',
  'delulu','delusional','ick','red flag','green flag',
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
  'jeff','bezos','bill','gates','sam','altman',
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
  'openai','anthropic','meta','tesla','spacex',
  'nike','adidas','gucci','louis','vuitton','prada','chanel','dior',
]);

interface ExtractedEntity {
  raw: string;
  normalized: string;
  category: string;
}

function extractEntitiesFromPost(title: string, body: string): ExtractedEntity[] {
  const allText = `${title} ${body}`;
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  // 1. Cashtags: $PEPE, $DOGE
  for (const match of allText.matchAll(CASHTAG_RE)) {
    const raw = match[1];
    const norm = normalizeEntity(raw);
    if (norm && !seen.has(norm)) {
      entities.push({ raw: `$${raw}`, normalized: norm, category: 'token' });
      seen.add(norm);
    }
  }

  // 2. Hashtags: #pepe, #dogecoin
  for (const match of allText.matchAll(HASHTAG_RE)) {
    const raw = match[1];
    const norm = normalizeEntity(raw);
    if (norm && !seen.has(norm)) {
      entities.push({ raw: `#${raw}`, normalized: norm, category: 'token' });
      seen.add(norm);
    }
  }

  // 3. Lexicon-based extraction
  const lower = allText.toLowerCase();
  const words = lower.split(/\s+/);

  for (const word of words) {
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (clean.length < 3) continue;
    if (STOP_WORDS.has(clean)) continue;

    const norm = normalizeEntity(clean);
    if (!norm || seen.has(norm)) continue;

    let category = '';
    if (KNOWN_TOKEN_NAMES.has(clean) || KNOWN_TOKEN_ALIASES[clean]) {
      category = 'token';
    } else if (MEME_LEXICON.has(clean)) {
      category = 'meme';
    } else if (CHARACTERS.has(clean)) {
      category = 'character';
    } else if (PERSONS.has(clean)) {
      category = 'person';
    } else if (BRANDS.has(clean)) {
      category = 'brand';
    }

    if (category) {
      entities.push({ raw: clean, normalized: norm, category });
      seen.add(norm);
    }
  }

  // 4. Proper noun detection (CamelCase / capitalized words)
  const camelWords = allText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
  for (const w of camelWords) {
    const low = w.toLowerCase();
    if (!STOP_WORDS.has(low) && low.length >= 3) {
      const norm = normalizeEntity(low);
      if (norm && !seen.has(norm)) {
        entities.push({ raw: w, normalized: norm, category: 'proper_noun' });
        seen.add(norm);
      }
    }
  }

  return entities;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 3: CONTENT CLASSIFICATION (metadata rejection only)
// ══════════════════════════════════════════════════════════════════════

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

function isMetadataOnly(text: string): boolean {
  const clean = normalizeText(text);
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

// ══════════════════════════════════════════════════════════════════════
// SECTION 4: ENTITY-CLUSTER
//
// The core data structure. Each cluster is keyed by a normalized entity.
// Posts mentioning the same entity are grouped together regardless of
// how they phrase it.
// ══════════════════════════════════════════════════════════════════════

interface EntityCluster {
  entity: string;              // normalized entity key (e.g. "PEPE")
  aliases: Set<string>;        // all raw forms seen (e.g. "$PEPE", "Pepe", "Pepe Coin")
  posts: RawPost[];
  firstSeen: number;
  lastSeen: number;
  authors: Set<string>;
  sources: Set<string>;
  humanAuthors: Set<string>;
  socialSources: Set<string>;
  marketSources: Set<string>;
  totalMentions: number;
  totalEngagement: number;
  entityCategory: string;      // primary category of the entity
  relatedPhrases: Set<string>; // enriched by phrase analysis
  relatedEntities: Set<string>; // other entities that co-occur in same posts
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 5: PIPELINE — ENTITY EXTRACTION + CLUSTERING
// ══════════════════════════════════════════════════════════════════════

interface ExtractionStats {
  totalPosts: number;
  postsWithEntities: number;
  postsWithoutEntities: number;
  totalEntitiesExtracted: number;
  uniqueEntities: number;
  entitiesByCategory: Record<string, number>;
  rejectedMetadata: number;
  extractedEntities: { post: string; entities: ExtractedEntity[] }[];
}

interface RejectedEntity {
  entity: string;
  reason: string;
  postCount: number;
}

function buildEntityClusters(posts: RawPost[]): {
  clusters: Map<string, EntityCluster>;
  extractionStats: ExtractionStats;
  rejectedPosts: { post: string; reason: string }[];
} {
  const now = Date.now();
  const WINDOW = 24 * 3600 * 1000;
  const recent = posts.filter((p) => now - p.timestamp <= WINDOW);

  const clusterMap = new Map<string, EntityCluster>();
  const extractionStats: ExtractionStats = {
    totalPosts: recent.length,
    postsWithEntities: 0,
    postsWithoutEntities: 0,
    totalEntitiesExtracted: 0,
    uniqueEntities: 0,
    entitiesByCategory: {},
    rejectedMetadata: 0,
    extractedEntities: [],
  };
  const rejectedPosts: { post: string; reason: string }[] = [];

  for (const post of recent) {
    const allText = `${post.title} ${post.body}`;

    // Reject pure metadata/template posts
    if (isMetadataOnly(allText)) {
      extractionStats.rejectedMetadata++;
      rejectedPosts.push({ post: `${post.title} | ${post.body.slice(0, 80)}`, reason: 'metadata/template' });
      continue;
    }

    // Extract entities from this post
    const entities = extractEntitiesFromPost(post.title, post.body);

    if (entities.length === 0) {
      extractionStats.postsWithoutEntities++;
      rejectedPosts.push({ post: `${post.title} | ${post.body.slice(0, 80)}`, reason: 'no entities extracted' });
      continue;
    }

    extractionStats.postsWithEntities++;
    extractionStats.totalEntitiesExtracted += entities.length;
    extractionStats.extractedEntities.push({
      post: `${post.title.slice(0, 60)}`,
      entities: entities.map((e) => ({ raw: e.raw, normalized: e.normalized, category: e.category })),
    });

    // Track category counts
    for (const e of entities) {
      extractionStats.entitiesByCategory[e.category] = (extractionStats.entitiesByCategory[e.category] ?? 0) + 1;
    }

    // Get all normalized entity keys for this post
    const postEntityKeys = entities.map((e) => e.normalized);

    // For each entity, add this post to its cluster
    for (const entity of entities) {
      const key = entity.normalized;
      if (!key) continue;

      let cluster = clusterMap.get(key);
      if (!cluster) {
        cluster = {
          entity: key,
          aliases: new Set(),
          posts: [],
          firstSeen: post.timestamp,
          lastSeen: post.timestamp,
          authors: new Set(),
          sources: new Set(),
          humanAuthors: new Set(),
          socialSources: new Set(),
          marketSources: new Set(),
          totalMentions: 0,
          totalEngagement: 0,
          entityCategory: entity.category,
          relatedPhrases: new Set(),
          relatedEntities: new Set(),
        };
        clusterMap.set(key, cluster);
      }

      cluster.aliases.add(entity.raw);
      cluster.posts.push(post);
      cluster.authors.add(post.author);
      cluster.sources.add(post.source);
      if (post.providerCategory === 'social') {
        cluster.humanAuthors.add(post.author);
        cluster.socialSources.add(post.source);
      } else {
        cluster.marketSources.add(post.source);
      }
      cluster.totalMentions += 1;
      cluster.totalEngagement += post.likes + post.shares * 2 + post.comments;
      cluster.firstSeen = Math.min(cluster.firstSeen, post.timestamp);
      cluster.lastSeen = Math.max(cluster.lastSeen, post.timestamp);

      // Track co-occurring entities
      for (const otherKey of postEntityKeys) {
        if (otherKey !== key) cluster.relatedEntities.add(otherKey);
      }

      // Enrich with phrases from the post
      const sentences = allText.split(/[.!?\n]+/).filter((s) => s.trim().length > 8);
      for (const sentence of sentences) {
        const words = tokenize(sentence);
        if (words.length >= 2) {
          for (let i = 0; i < words.length - 1; i++) {
            cluster.relatedPhrases.add(`${words[i]} ${words[i + 1]}`);
          }
        }
      }
    }
  }

  extractionStats.uniqueEntities = clusterMap.size;
  return { clusters: clusterMap, extractionStats, rejectedPosts };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 6: ALIAS MERGING
//
// Merge clusters that represent the same real-world entity.
// Already handled by normalizeEntity() — but we do a second pass
// to catch any remaining alias collisions.
// ══════════════════════════════════════════════════════════════════════

function mergeAliasClusters(clusters: Map<string, EntityCluster>): Map<string, EntityCluster> {
  // The normalizeEntity function should already handle most aliases.
  // This pass catches edge cases where different normalized forms
  // still refer to the same thing.
  const ALIAS_OVERRIDES: Record<string, string> = {
    'SHIB': 'SHIBA',
  };

  const merged = new Map<string, EntityCluster>();
  const mergedAway = new Set<string>();

  for (const [key, cluster] of clusters) {
    if (mergedAway.has(key)) continue;

    const targetKey = ALIAS_OVERRIDES[key] ?? key;
    if (targetKey !== key) {
      // Merge this cluster into the target
      const target = merged.get(targetKey) ?? clusters.get(targetKey);
      if (target && target !== cluster) {
        for (const alias of cluster.aliases) target.aliases.add(alias);
        target.posts.push(...cluster.posts);
        for (const a of cluster.authors) target.authors.add(a);
        for (const s of cluster.sources) target.sources.add(s);
        for (const a of cluster.humanAuthors) target.humanAuthors.add(a);
        for (const s of cluster.socialSources) target.socialSources.add(s);
        for (const s of cluster.marketSources) target.marketSources.add(s);
        for (const p of cluster.relatedPhrases) target.relatedPhrases.add(p);
        for (const e of cluster.relatedEntities) target.relatedEntities.add(e);
        target.totalMentions += cluster.totalMentions;
        target.totalEngagement += cluster.totalEngagement;
        target.firstSeen = Math.min(target.firstSeen, cluster.firstSeen);
        target.lastSeen = Math.max(target.lastSeen, cluster.lastSeen);
        mergedAway.add(key);
        continue;
      }
    }
    merged.set(targetKey, cluster);
  }

  return merged;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 7: SCORING
// ══════════════════════════════════════════════════════════════════════

function computeGrowthPct(cluster: EntityCluster, now: number): number {
  const half = 12 * 3600 * 1000;
  const recent = cluster.posts.filter((p) => now - p.timestamp <= half).length;
  const older = cluster.posts.length - recent;
  if (older === 0) return recent > 0 ? 100 + recent * 20 : 0;
  return Math.round(((recent - older) / older) * 100);
}

function computeVelocity(cluster: EntityCluster): number {
  const spanHours = Math.max((cluster.lastSeen - cluster.firstSeen) / 3600000, 0.5);
  return cluster.totalMentions / spanHours;
}

function computeConfidence(cluster: EntityCluster, now: number): number {
  const sourcePct = Math.min(cluster.sources.size / 3, 1);
  const mentionPct = Math.min(cluster.totalMentions / 50, 1);
  const growthPct = Math.min(Math.max(computeGrowthPct(cluster, now), 0) / 300, 1);
  const authorPct = Math.min(cluster.authors.size / 15, 1);
  return Math.round((sourcePct * 0.35 + mentionPct * 0.25 + growthPct * 0.25 + authorPct * 0.15) * 100);
}

function computeTrendScore(cluster: EntityCluster, now: number): number {
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

function computeNarrativeIntelligenceScore(cluster: EntityCluster, now: number): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // 1. Entity category bonus (0-25)
  const CAT_BONUS: Record<string, number> = {
    token: 20,
    meme: 15,
    character: 15,
    person: 10,
    brand: 5,
    proper_noun: 3,
  };
  const catBonus = CAT_BONUS[cluster.entityCategory] ?? 0;
  score += catBonus;
  if (catBonus >= 15) reasons.push(`Strong entity category: ${cluster.entityCategory}`);

  // 2. Alias diversity bonus (0-10) — more aliases = more cross-platform recognition
  const aliasBonus = Math.min(cluster.aliases.size * 2, 10);
  score += aliasBonus;
  if (cluster.aliases.size >= 3) reasons.push(`${cluster.aliases.size} recognized aliases (${[...cluster.aliases].slice(0, 5).join(', ')})`);

  // 3. Co-occurring entity bonus (0-10)
  const coEntityBonus = Math.min(cluster.relatedEntities.size * 2, 10);
  score += coEntityBonus;
  if (cluster.relatedEntities.size >= 2) reasons.push(`Co-occurs with ${cluster.relatedEntities.size} other entities`);

  // 4. Human discussion signal (0-15)
  const socialPosts = cluster.posts.filter((p) => p.providerCategory === 'social');
  const samplePosts = socialPosts.slice(0, 30);
  let discussionHits = 0;
  for (const post of samplePosts) {
    const text = `${post.title} ${post.body}`.toLowerCase();
    if (text.includes('?') || text.includes('!')) discussionHits++;
    if (/\b(think|feel|believe|opinion|hot take|controversial|love|hate|crazy|insane|wild|epic|best|worst|amazing)\b/i.test(text)) discussionHits++;
  }
  const discussionRatio = samplePosts.length > 0 ? discussionHits / samplePosts.length : 0;
  const discussionScore = Math.min(Math.round(discussionRatio * 20), 15);
  score += discussionScore;
  if (discussionScore >= 10) reasons.push('Strong human discussion signal');
  else if (discussionScore >= 5) reasons.push('Moderate discussion activity');

  // 5. Emotional + conversational language (0-10)
  const EMOTIONAL = new Set(['love','hate','crazy','insane','wild','epic','best','worst','amazing','terrible','fire','trash','goat','unreal','dream','nightmare','sheesh','bruh']);
  const CONVERSATIONAL = new Set(['think','feel','believe','opinion','hot','take','controversial','unpopular','honestly','seriously','imagine']);
  let emotionalHits = 0;
  let conversationalHits = 0;
  for (const post of samplePosts) {
    const words = `${post.title} ${post.body}`.toLowerCase().split(/\s+/);
    for (const w of words) {
      const clean = w.replace(/[^a-z]/g, '');
      if (EMOTIONAL.has(clean)) emotionalHits++;
      if (CONVERSATIONAL.has(clean)) conversationalHits++;
    }
  }
  const emotionalScore = Math.min(Math.round((emotionalHits / Math.max(samplePosts.length, 1)) * 10), 5);
  const conversationalScore = Math.min(Math.round((conversationalHits / Math.max(samplePosts.length, 1)) * 10), 5);
  score += emotionalScore + conversationalScore;
  if (emotionalScore >= 3) reasons.push('Emotional engagement detected');
  if (conversationalScore >= 3) reasons.push('Conversational language present');

  // 6. Cross-platform natural presence (0-10)
  let naturalMentions = 0;
  const entityLower = cluster.entity.toLowerCase();
  for (const post of samplePosts) {
    const text = `${post.title} ${post.body}`.toLowerCase();
    if (text.includes(entityLower)) naturalMentions++;
  }
  const mentionRatio = samplePosts.length > 0 ? naturalMentions / samplePosts.length : 0;
  const crossPlatformScore = Math.min(Math.round(mentionRatio * 15), 10);
  score += crossPlatformScore;
  if (crossPlatformScore >= 7) reasons.push(`Found in ${Math.round(mentionRatio * 100)}% of social posts`);
  else if (crossPlatformScore >= 3) reasons.push(`Present in ${Math.round(mentionRatio * 100)}% of social posts`);

  // 7. Metadata/financial penalty (0-20 subtracted)
  const METADATA_RE = /\b(trending|rank|top|gainers|losers|volume|liquidity|market|cap|fdv|tvl|holders|price|change|24h|7d|boosted|pairs|coins|tokens)\b/i;
  const FINANCIAL_RE = /\b(price|market cap|mc|fdv|tvl|volume|24h|7d|1h|change|gain|loss|pump|dump|ath|atl|dip|rally|moon|bullish|bearish|long|short|leverage|margin|liquidity|swap|pool|apy|apr|yield|stake)\b/i;
  const entityLowerForCheck = cluster.entity.toLowerCase();
  if (METADATA_RE.test(entityLowerForCheck)) {
    score -= 20;
    reasons.push('REJECTED: entity is metadata/UI label');
  }
  if (FINANCIAL_RE.test(entityLowerForCheck)) {
    score -= 15;
    reasons.push('REJECTED: entity is financial metric');
  }

  return { score: Math.max(0, Math.min(score, 100)), reasons };
}

function computeEntityQualityScore(cluster: EntityCluster, now: number): number {
  const intel = computeNarrativeIntelligenceScore(cluster, now);

  // Effective authors for market providers
  const effectiveAuthors = cluster.marketSources.size > 0
    ? Math.max(
        cluster.humanAuthors.size,
        cluster.relatedEntities.size,
        Math.ceil(cluster.totalMentions / 2),
      )
    : cluster.humanAuthors.size;

  // Platform score: social platforms weighted more
  const platformScore = Math.min(cluster.socialSources.size / 3, 1);

  // Author score
  const authorScore = Math.min(effectiveAuthors / 10, 1);

  // Market confirmation bonus
  const marketBonus = Math.min(cluster.marketSources.size / 3, 0.5);

  // Engagement
  const engagementScore = Math.min(cluster.totalEngagement / 500, 1);

  // Growth
  const growthPct = computeGrowthPct(cluster, now);
  const growthScore = Math.min(Math.max(growthPct, 0) / 300, 1);

  // Freshness
  const ageHours = (now - cluster.lastSeen) / 3600000;
  const freshnessScore = Math.max(0, 1 - ageHours / 24);

  // Velocity
  const velocity = computeVelocity(cluster);
  const velocityScore = Math.min(velocity / 10, 1);

  const raw =
    (intel.score / 100) * 30 +
    platformScore * 20 +
    authorScore * 15 +
    engagementScore * 10 +
    growthScore * 10 +
    freshnessScore * 5 +
    velocityScore * 5 +
    marketBonus * 5;

  return Math.round(raw * 100) / 100;
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

interface Thresholds {
  minAuthors: number;
  minMentions: number;
  minPlatforms: number;
  minEngagement: number;
  minTrendScore: number;
  minConfidence: number;
}

function computeAdaptiveThresholds(posts: RawPost[], totalSocialSources: Set<string>): Thresholds {
  const postCount = posts.length;
  const socialSourceCount = totalSocialSources.size;

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

  // Adaptive platform rule:
  // If social platforms available >=2, require platforms >=2
  // Else allow platforms ==1 IF authors >=20 AND posts >=30 AND engagement high
  if (socialSourceCount < 2) {
    minPlatforms = 1;
  }

  if (socialSourceCount < 3) {
    minPlatforms = Math.min(minPlatforms, 1);
  }

  return {
    minAuthors,
    minMentions,
    minPlatforms,
    minEngagement,
    minTrendScore: 15,
    minConfidence: 20,
  };
}

interface RejectionResult {
  rejected: boolean;
  reason: string;
}

function checkRejection(cluster: EntityCluster, now: number, thresholds: Thresholds, totalSocialSources: Set<string>): RejectionResult {
  // CHECK 1: Social platforms
  if (cluster.socialSources.size < thresholds.minPlatforms) {
    // Adaptive rule: if social platforms <2, allow single platform IF strong signals
    if (totalSocialSources.size >= 2) {
      return { rejected: true, reason: `only ${cluster.socialSources.size} social platform(s) [${[...cluster.socialSources].join(', ')}] — need ${thresholds.minPlatforms}+ (social platforms available: ${totalSocialSources.size})` };
    } else {
      // Few social platforms available — relax platform requirement
      // But require strong author + post + engagement signals
      const effectiveAuthors = cluster.marketSources.size > 0
        ? Math.max(cluster.humanAuthors.size, cluster.relatedEntities.size, Math.ceil(cluster.totalMentions / 2))
        : cluster.humanAuthors.size;
      if (effectiveAuthors < 20 || cluster.totalMentions < 30 || cluster.totalEngagement < thresholds.minEngagement) {
        return { rejected: true, reason: `only ${cluster.socialSources.size} social platform(s) and insufficient fallback signals (authors: ${effectiveAuthors}, posts: ${cluster.totalMentions}, engagement: ${cluster.totalEngagement})` };
      }
    }
  }

  // CHECK 2: Human authors
  const effectiveAuthors = cluster.marketSources.size > 0
    ? Math.max(cluster.humanAuthors.size, cluster.relatedEntities.size, Math.ceil(cluster.totalMentions / 2))
    : cluster.humanAuthors.size;
  if (effectiveAuthors < thresholds.minAuthors) {
    return { rejected: true, reason: `only ${effectiveAuthors} effective author(s) (human: ${cluster.humanAuthors.size}, entities: ${cluster.relatedEntities.size}, mentions/2: ${Math.ceil(cluster.totalMentions / 2)}) — need ${thresholds.minAuthors}+` };
  }

  // CHECK 3: Mentions
  if (cluster.totalMentions < thresholds.minMentions) {
    return { rejected: true, reason: `only ${cluster.totalMentions} mention(s) — need ${thresholds.minMentions}+` };
  }

  // CHECK 4: Engagement
  if (cluster.totalEngagement < thresholds.minEngagement) {
    return { rejected: true, reason: `engagement ${cluster.totalEngagement} — below minimum ${thresholds.minEngagement}` };
  }

  // CHECK 5: Empty/short name
  if (!cluster.entity || cluster.entity.length < 2) {
    return { rejected: true, reason: `empty or too short entity name ("${cluster.entity}")` };
  }

  // CHECK 6: Blocked name
  if (BLOCKED_NAMES.has(cluster.entity.toLowerCase())) {
    return { rejected: true, reason: `blocked/generic name "${cluster.entity}"` };
  }

  // CHECK 7: Contains blocked word
  const words = cluster.entity.toLowerCase().split(/\s+/);
  for (const w of words) {
    if (BLOCKED_NAMES.has(w)) {
      return { rejected: true, reason: `contains blocked word "${w}" in "${cluster.entity}"` };
    }
  }

  // CHECK 8: Blocked pattern
  for (let pi = 0; pi < BLOCKED_PATTERNS.length; pi++) {
    if (BLOCKED_PATTERNS[pi].test(cluster.entity)) {
      return { rejected: true, reason: `matches blocked pattern #${pi + 1}` };
    }
  }

  // CHECK 9: Trend score
  const trendScore = computeTrendScore(cluster, now);
  if (trendScore < thresholds.minTrendScore) {
    return { rejected: true, reason: `trend score ${trendScore} — below minimum ${thresholds.minTrendScore}` };
  }

  // CHECK 10: Confidence
  const confidencePct = computeConfidence(cluster, now);
  if (confidencePct < thresholds.minConfidence) {
    return { rejected: true, reason: `confidence ${confidencePct}% — below minimum ${thresholds.minConfidence}%` };
  }

  return { rejected: false, reason: '' };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 9: NARRATIVE INTELLIGENCE (hard reject rules)
// ══════════════════════════════════════════════════════════════════════

function checkNarrativeReject(cluster: EntityCluster): { rejected: boolean; reason: string } {
  const entityLower = cluster.entity.toLowerCase();

  // Hard reject: metadata/UI label
  const METADATA_RE = /\b(trending|rank|top|gainers|losers|volume|liquidity|market|cap|fdv|tvl|holders|price|change|24h|7d|1h|30m|boosted|pairs|coins|tokens|topics|language|stars|forks|github|coingecko|dexscreener)\b/i;
  if (METADATA_RE.test(entityLower)) {
    return { rejected: true, reason: 'entity is metadata/UI label — not a narrative' };
  }

  // Hard reject: financial metric
  const FINANCIAL_RE = /\b(price|market cap|mc|fdv|tvl|volume|24h|7d|1h|change|gain|loss|pump|dump|ath|atl|dip|rally|moon|bullish|bearish|long|short|leverage|margin|liquidity|swap|pool|apy|apr|yield|stake)\b/i;
  if (FINANCIAL_RE.test(entityLower)) {
    return { rejected: true, reason: 'entity is financial metric — not a narrative' };
  }

  // Hard reject: platform UI label
  const UI_RE = /\b(coingecko|dexscreener|github|gitlab|bitbucket|npm|pypi|stars?|forks?|watchers?|contributors?|commits?)\b/i;
  if (UI_RE.test(entityLower)) {
    return { rejected: true, reason: 'entity is platform UI label — not a narrative' };
  }

  // Hard reject: no cultural signal
  const NO_CULTURAL_SIGNAL = cluster.entityCategory !== 'token' &&
    cluster.entityCategory !== 'meme' &&
    cluster.entityCategory !== 'character' &&
    cluster.entityCategory !== 'person' &&
    cluster.relatedEntities.size === 0 &&
    cluster.aliases.size <= 1;
  if (NO_CULTURAL_SIGNAL) {
    return { rejected: true, reason: 'no recognizable cultural idea or meme concept detected' };
  }

  return { rejected: false, reason: '' };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 10: HELPERS
// ══════════════════════════════════════════════════════════════════════

function detectCategory(entity: string): string {
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
  const words = entity.toLowerCase().split(/\s+/);
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

function generateReason(cluster: EntityCluster, now: number): string {
  const growth = computeGrowthPct(cluster, now);
  const velocity = computeVelocity(cluster);
  const parts: string[] = [];
  if (growth > 200) parts.push(`Mentions surged +${growth}% in the last 12 hours`);
  else if (growth > 100) parts.push(`Mentions doubled in the last 12 hours (+${growth}%)`);
  else if (growth > 0) parts.push(`Steady growth of +${growth}% in recent hours`);
  if (velocity > 5) parts.push(`${Math.round(velocity)} mentions/hour — fast rising`);
  if (cluster.socialSources.size >= 2) parts.push(`Discussed across ${cluster.socialSources.size} social platforms`);
  else if (cluster.socialSources.size >= 1) parts.push(`Picking up on ${cluster.socialSources.size} social platform`);
  if (cluster.marketSources.size >= 1) parts.push(`Market-confirmed by ${[...cluster.marketSources].join(', ')}`);
  if (cluster.humanAuthors.size > 5) parts.push(`${cluster.humanAuthors.size} unique human creators`);
  if (cluster.aliases.size > 1) parts.push(`${cluster.aliases.size} recognized aliases (${[...cluster.aliases].slice(0, 3).join(', ')})`);
  if (parts.length === 0) parts.push(`First seen ${Math.round((now - cluster.firstSeen) / 3600000)}h ago with ${cluster.totalMentions} mentions`);
  return parts.join('. ') + '.';
}

function generateEvidence(cluster: EntityCluster): string[] {
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
  if (cluster.aliases.size > 1) evidence.push(`Aliases: ${[...cluster.aliases].join(', ')}`);
  const topAuthors = [...cluster.authors].slice(0, 3);
  if (topAuthors.length > 0) evidence.push(`Active voices: ${topAuthors.join(', ')}`);
  return evidence;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 11: MAIN ANALYSIS — ENTITY-FIRST PIPELINE
// ══════════════════════════════════════════════════════════════════════

export function analyzeNarratives(posts: RawPost[]): MemeNarrative[] {
  const now = Date.now();
  const L = (msg: string) => console.log(`[intel] ${msg}`);
  const SEP = '════════════════════════════════════════════════════════════';
  const SEP2 = '────────────────────────────────────────────────────────────';

  const allAuthors = new Set<string>();
  const allSources = new Set<string>();
  const allSocialSources = new Set<string>();
  for (const p of posts) {
    allAuthors.add(p.author);
    allSources.add(p.source);
    if (p.providerCategory === 'social') allSocialSources.add(p.source);
  }

  const bySource = new Map<string, number>();
  for (const p of posts) bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);

  // ── STAGE 0: COLLECTED POSTS ──
  L(SEP);
  L('  COLLECTED POSTS');
  L(SEP);
  L(`  Total:       ${posts.length}`);
  L(`  Authors:     ${allAuthors.size}`);
  L(`  Platforms:   ${allSources.size} (${[...allSources].join(', ')})`);
  for (const [src, count] of bySource) L(`    ${src}: ${count}`);
  L('');

  // ── STAGE 1: EXTRACT ENTITIES ──
  const { clusters: entityClusters, extractionStats, rejectedPosts } = buildEntityClusters(posts);

  L(SEP);
  L('  STAGE 1: ENTITY EXTRACTION');
  L(SEP);
  L(`  Total posts:            ${extractionStats.totalPosts}`);
  L(`  Posts with entities:    ${extractionStats.postsWithEntities}`);
  L(`  Posts without entities: ${extractionStats.postsWithoutEntities}`);
  L(`  Posts rejected (meta):  ${extractionStats.rejectedMetadata}`);
  L(`  Total entities found:   ${extractionStats.totalEntitiesExtracted}`);
  L(`  Unique entities:        ${extractionStats.uniqueEntities}`);
  L(`  Entities by category:`);
  for (const [cat, count] of Object.entries(extractionStats.entitiesByCategory).sort((a, b) => b[1] - a[1])) {
    L(`    ${cat}: ${count}`);
  }
  L('');

  // Print extracted entities (first 30)
  L('  EXTRACTED ENTITIES (sample):');
  for (const entry of extractionStats.extractedEntities.slice(0, 30)) {
    const entityStr = entry.entities.map((e) => `${e.raw} → ${e.normalized} (${e.category})`).join(', ');
    L(`    "${entry.post}" → ${entityStr}`);
  }
  L('');

  // ── STAGE 2: CLUSTER BY ENTITY ──
  L(SEP);
  L('  STAGE 2: CLUSTER BY ENTITY');
  L(SEP);
  L(`  Entity clusters created: ${entityClusters.size}`);

  // Print all entity clusters
  for (const [key, cluster] of entityClusters) {
    L(SEP2);
    L(`  ENTITY: "${key}" (category: ${cluster.entityCategory})`);
    L(`    Aliases:    ${[...cluster.aliases].join(', ')}`);
    L(`    Posts:      ${cluster.totalMentions}`);
    L(`    Authors:    ${cluster.authors.size}`);
    L(`    Human:      ${cluster.humanAuthors.size}`);
    L(`    Social:     ${cluster.socialSources.size} (${[...cluster.socialSources].join(', ')})`);
    L(`    Market:     ${cluster.marketSources.size} (${[...cluster.marketSources].join(', ')})`);
    L(`    Engagement: ${cluster.totalEngagement}`);
    L(`    Related:    ${[...cluster.relatedEntities].join(', ') || '(none)'}`);
    L(`    Phrases:    ${cluster.relatedPhrases.size} unique`);
  }
  L('');

  // ── STAGE 3: MERGE ALIASES ──
  const mergedClusters = mergeAliasClusters(entityClusters);
  const aliasMergeCount = entityClusters.size - mergedClusters.size;

  L(SEP);
  L('  STAGE 3: MERGE ALIASES');
  L(SEP);
  L(`  Clusters before merge: ${entityClusters.size}`);
  L(`  Clusters after merge:  ${mergedClusters.size}`);
  L(`  Merged:                ${aliasMergeCount}`);
  L('');

  // ── STAGE 4: ADAPTIVE THRESHOLDS ──
  const thresholds = computeAdaptiveThresholds(posts, allSocialSources);

  L(SEP);
  L('  STAGE 4: ADAPTIVE THRESHOLDS');
  L(SEP);
  L(`  minAuthors:    ${thresholds.minAuthors}`);
  L(`  minMentions:   ${thresholds.minMentions}`);
  L(`  minPlatforms:  ${thresholds.minPlatforms}`);
  L(`  minEngagement: ${thresholds.minEngagement}`);
  L(`  minTrendScore: ${thresholds.minTrendScore}`);
  L(`  minConfidence: ${thresholds.minConfidence}`);
  L(`  Social platforms available: ${allSocialSources.size}`);
  L('');

  // ── STAGE 5: QUALITY FILTER ──
  L(SEP);
  L('  STAGE 5: QUALITY FILTER');
  L(SEP);

  const rejectedEntities: RejectedEntity[] = [];
  const passedClusters: EntityCluster[] = [];

  for (const [key, cluster] of mergedClusters) {
    const check = checkRejection(cluster, now, thresholds, allSocialSources);
    if (check.rejected) {
      rejectedEntities.push({ entity: key, reason: check.reason, postCount: cluster.totalMentions });
      L(`  REJECTED: "${key}" — ${check.reason}`);
    } else {
      passedClusters.push(cluster);
      L(`  PASSED:   "${key}" — ${cluster.totalMentions} posts, ${cluster.authors.size} authors, ${cluster.sources.size} platforms`);
    }
  }
  L('');
  L(`  Passed quality filter: ${passedClusters.length}`);
  L(`  Rejected:              ${rejectedEntities.length}`);
  L('');

  // ── STAGE 6: NARRATIVE INTELLIGENCE REJECTION ──
  L(SEP);
  L('  STAGE 6: NARRATIVE INTELLIGENCE');
  L(SEP);

  const intelPassed: EntityCluster[] = [];
  const intelRejected: { cluster: EntityCluster; reason: string }[] = [];

  for (const cluster of passedClusters) {
    const check = checkNarrativeReject(cluster);
    if (check.rejected) {
      intelRejected.push({ cluster, reason: check.reason });
      rejectedEntities.push({ entity: cluster.entity, reason: `narrative intel: ${check.reason}`, postCount: cluster.totalMentions });
      L(`  REJECTED: "${cluster.entity}" — ${check.reason}`);
    } else {
      intelPassed.push(cluster);
      L(`  PASSED:   "${cluster.entity}"`);
    }
  }
  L('');
  L(`  Passed narrative intel: ${intelPassed.length}`);
  L(`  Rejected:               ${intelRejected.length}`);
  L('');

  // ── STAGE 7: SCORE ENTITIES ──
  L(SEP);
  L('  STAGE 7: SCORE ENTITIES');
  L(SEP);

  const scored: { cluster: EntityCluster; score: number; trendScore: number; confidencePct: number; growthPct: number; reason: string; evidence: string[] }[] = [];

  for (const cluster of intelPassed) {
    const score = computeEntityQualityScore(cluster, now);
    const trendScore = computeTrendScore(cluster, now);
    const confidencePct = computeConfidence(cluster, now);
    const growthPct = computeGrowthPct(cluster, now);
    const reason = generateReason(cluster, now);
    const evidence = generateEvidence(cluster);

    scored.push({ cluster, score, trendScore, confidencePct, growthPct, reason, evidence });
    L(`  "${cluster.entity}": score=${score}, trend=${trendScore}, confidence=${confidencePct}%, growth=${growthPct}%`);
  }
  L('');

  // ── STAGE 8: SORT + TOP 15 ──
  scored.sort((a, b) => b.score - a.score);
  const top15 = scored.slice(0, MAX_NARRATIVES);

  const narratives: MemeNarrative[] = [];
  for (const { cluster, score, trendScore, confidencePct, growthPct, reason, evidence } of top15) {
    const category = detectCategory(cluster.entity);
    const narrative = capitalize(cluster.entity);
    const topPostTitles = [...cluster.posts]
      .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 3)
      .map((p) => p.title);

    const effectiveAuthors = cluster.marketSources.size > 0
      ? Math.max(cluster.humanAuthors.size, cluster.relatedEntities.size, Math.ceil(cluster.totalMentions / 2))
      : cluster.humanAuthors.size;

    narratives.push({
      id: `${cluster.entity.toLowerCase()}-${now}`,
      narrative,
      trendScore,
      mentionCount: cluster.totalMentions,
      growthPct,
      uniqueAuthors: effectiveAuthors,
      sourcesFound: [...cluster.sources],
      sourceCount: cluster.sources.size,
      firstDetected: cluster.firstSeen,
      lastSeen: cluster.lastSeen,
      confidencePct,
      reason,
      evidence,
      category,
      topPostTitles,
      qualityScore: score,
      narrativeWhy: `Accepted: entity ${cluster.entity} (${cluster.entityCategory}) with ${cluster.aliases.size} aliases, ${cluster.totalMentions} posts across ${cluster.sources.size} platforms`,
      isNarrative: true,
      topContributingPosts: topPostTitles,
      topPlatforms: [...cluster.socialSources].slice(0, 5),
      trendCause: reason,
      humanAuthors: [...cluster.humanAuthors],
      marketSignals: [...cluster.marketSources],
      socialPlatforms: [...cluster.socialSources],
    });
  }

  // ── FINAL DIAGNOSTICS ──
  L(SEP);
  L('  FINAL DIAGNOSTICS');
  L(SEP);
  L(`  Collected posts:       ${posts.length}`);
  L(`  Extracted entities:    ${extractionStats.uniqueEntities}`);
  L(`  Merged entities:       ${aliasMergeCount}`);
  L(`  Rejected entities:     ${rejectedEntities.length}`);
  L(`  Accepted entities:     ${passedClusters.length}`);
  L(`  After narrative intel: ${intelPassed.length}`);
  L(`  Top 15 entities:       ${top15.length}`);
  L('');

  L('  REJECTED ENTITIES (with exact rule):');
  for (const re of rejectedEntities) {
    L(`    ${re.entity} (${re.postCount} posts) — ${re.reason}`);
  }
  L('');

  L('  TOP 15 ENTITIES:');
  for (let i = 0; i < top15.length; i++) {
    const { cluster, score } = top15[i];
    L(`    #${i + 1}: ${cluster.entity} — score ${score}, ${cluster.totalMentions} posts, ${cluster.authors.size} authors, ${cluster.sources.size} platforms, aliases: ${[...cluster.aliases].join(', ')}`);
  }
  L(SEP);

  return narratives;
}
