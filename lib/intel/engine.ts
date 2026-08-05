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

function tokenize(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 2: ENTITY EXTRACTION
//
// Extract real-world entities from posts. These are the building blocks
// of viral narratives — ideas that spread before someone creates a token.
// ══════════════════════════════════════════════════════════════════════

const CASHTAG_RE = /\$([A-Za-z]{2,10})\b/g;
const HASHTAG_RE = /#([A-Za-z0-9_]{2,30})\b/g;

const MEME_LEXICON = new Set([
  'brainrot','gigachad','skibidi','rizz','sigma','beta','alpha','npc',
  'copypasta','stan','simp','wholesome','based','cringe','yeet',
  'slay','periodt','bet','no cap','fr','ong','istg','smh','nvm',
  'bruh','sus','among','fortnite','minecraft','roblox','valorant',
  'pokemon','mario','zelda','kirby','meme','viral','fyp',
  'ayo','oof','sheesh','caught','caught in 4k','4k',
  'unreal','dream','nightmare','core','era','aesthetic','vibe',
  'delulu','ick','red flag','green flag','main character',
  'brain rot','italian brainrot','italian brain rot','brain rot italian',
]);

const KNOWN_MEMES = new Set([
  'pepe','doge','wojak','chad','gigachad','doomer','boomer','zoomer',
  'popcat','brett','mog','bome','wif','mew','cat in a dogs world',
  'shiba','shib','bonk','cat','dog','frog','duck','bear',
  'panda','penguin','shark','whale','dragon','unicorn',
  'italian brainrot','sigma','skibidi','rizz','npc','brainrot',
  'trollface','wojack','feels guy','doomer','tradwife',
  'doge coin','pepe coin','bonk coin',
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
  'italian brainrot': 'ITALIAN BRAINROT', 'italian brain rot': 'ITALIAN BRAINROT', 'brainrot italian': 'ITALIAN BRAINROT',
};

const TOKEN_SUFFIX_RE = /\s*(coin|token|project|protocol|chain|network|inu|finance|dao|labs|verse|swap|pad|market|exchange|meme|army|community|gang|squad|nation|world)$/i;

interface ExtractedEntity {
  raw: string;
  normalized: string;
  category: string;
}

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

function extractEntitiesFromPost(title: string, body: string): ExtractedEntity[] {
  const allText = `${title} ${body}`;
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  // 1. Cashtags
  for (const match of allText.matchAll(CASHTAG_RE)) {
    const raw = match[1];
    const norm = normalizeEntity(raw);
    if (norm && !seen.has(norm)) {
      entities.push({ raw: `$${raw}`, normalized: norm, category: 'token' });
      seen.add(norm);
    }
  }

  // 2. Hashtags
  for (const match of allText.matchAll(HASHTAG_RE)) {
    const raw = match[1];
    const norm = normalizeEntity(raw);
    if (norm && !seen.has(norm)) {
      entities.push({ raw: `#${raw}`, normalized: norm, category: 'token' });
      seen.add(norm);
    }
  }

  // 3. Known meme/token lexicon
  const lower = allText.toLowerCase();
  const words = lower.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-z0-9]/g, '');
    if (clean.length < 3 || STOP_WORDS.has(clean)) continue;
    const norm = normalizeEntity(clean);
    if (!norm || seen.has(norm)) continue;

    let category = '';
    if (KNOWN_MEMES.has(clean) || KNOWN_TOKEN_ALIASES[clean]) category = 'meme';
    else if (MEME_LEXICON.has(clean)) category = 'cultural';

    if (category) {
      entities.push({ raw: clean, normalized: norm, category });
      seen.add(norm);
    }
  }

  // 4. Multi-word phrase detection (e.g. "italian brainrot", "dog wif hat")
  const PHRASE_PATTERNS: Array<{ re: RegExp; norm: string; cat: string }> = [
    { re: /\bitalian\s+brainrot\b/gi, norm: 'ITALIAN BRAINROT', cat: 'meme' },
    { re: /\bbrain\s*rot\s+italian\b/gi, norm: 'ITALIAN BRAINROT', cat: 'meme' },
    { re: /\bdog\s+wif\s+hat\b/gi, norm: 'WIF', cat: 'meme' },
    { re: /\bcat\s+in\s+a\s+dogs?\s+world\b/gi, norm: 'MEW', cat: 'meme' },
    { re: /\bbook\s+of\s+meme\b/gi, norm: 'BOME', cat: 'meme' },
    { re: /\bpepe\s+the\s+frog\b/gi, norm: 'PEPE', cat: 'meme' },
    { re: /\bshiba\s+inu\b/gi, norm: 'SHIBA', cat: 'meme' },
    { re: /\bbonk\s+inu\b/gi, norm: 'BONK', cat: 'meme' },
    { re: /\bdoge\s+coin\b/gi, norm: 'DOGE', cat: 'meme' },
  ];
  for (const { re, norm, cat } of PHRASE_PATTERNS) {
    if (!seen.has(norm)) {
      const match = allText.match(re);
      if (match) {
        entities.push({ raw: match[0], normalized: norm, category: cat });
        seen.add(norm);
      }
    }
  }

  // 5. Proper noun detection
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
//
// Only reject posts that are PURE template/metadata.
// Never reject posts that contain real human discussion.
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
  for (const p of TEMPLATE_PATTERNS) {
    if (p.test(clean)) return true;
  }
  const wordCount = clean.split(/\s+/).length;
  if (wordCount <= 2) {
    const metadataOnly = /^(trending|trend|rank|top|gainers|losers|volume|liquidity|market|cap|fdv|tvl|holders|swaps|transactions|price|change|24h|7d|1h|30m|boosted|new|pairs|coins|tokens|created)$/i;
    if (metadataOnly.test(clean)) return true;
  }
  return false;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 4: ENTITY CLUSTER
// ══════════════════════════════════════════════════════════════════════

interface EntityCluster {
  entity: string;
  aliases: Set<string>;
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
  entityCategory: string;
  relatedEntities: Set<string>;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 5: BUILD ENTITY CLUSTERS
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

function buildEntityClusters(posts: RawPost[]): {
  clusters: Map<string, EntityCluster>;
  stats: ExtractionStats;
  rejectedPosts: { post: string; reason: string }[];
} {
  const now = Date.now();
  const WINDOW = 24 * 3600 * 1000;
  const recent = posts.filter((p) => now - p.timestamp <= WINDOW);

  const clusterMap = new Map<string, EntityCluster>();
  const stats: ExtractionStats = {
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
    if (isMetadataOnly(allText)) {
      stats.rejectedMetadata++;
      rejectedPosts.push({ post: `${post.title}`, reason: 'metadata/template' });
      continue;
    }

    const entities = extractEntitiesFromPost(post.title, post.body);
    if (entities.length === 0) {
      stats.postsWithoutEntities++;
      continue;
    }

    stats.postsWithEntities++;
    stats.totalEntitiesExtracted += entities.length;
    stats.extractedEntities.push({
      post: post.title.slice(0, 60),
      entities: entities.map((e) => ({ raw: e.raw, normalized: e.normalized, category: e.category })),
    });

    for (const e of entities) {
      stats.entitiesByCategory[e.category] = (stats.entitiesByCategory[e.category] ?? 0) + 1;
    }

    const postEntityKeys = entities.map((e) => e.normalized);

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

      for (const otherKey of postEntityKeys) {
        if (otherKey !== key) cluster.relatedEntities.add(otherKey);
      }
    }
  }

  stats.uniqueEntities = clusterMap.size;
  return { clusters: clusterMap, stats, rejectedPosts };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 6: ALIAS MERGING
// ══════════════════════════════════════════════════════════════════════

function mergeAliasClusters(clusters: Map<string, EntityCluster>): Map<string, EntityCluster> {
  const ALIAS_OVERRIDES: Record<string, string> = {
    'SHIB': 'SHIBA',
  };

  const merged = new Map<string, EntityCluster>();
  const mergedAway = new Set<string>();

  for (const [key, cluster] of clusters) {
    if (mergedAway.has(key)) continue;
    const targetKey = ALIAS_OVERRIDES[key] ?? key;
    if (targetKey !== key) {
      const target = merged.get(targetKey) ?? clusters.get(targetKey);
      if (target && target !== cluster) {
        for (const alias of cluster.aliases) target.aliases.add(alias);
        target.posts.push(...cluster.posts);
        for (const a of cluster.authors) target.authors.add(a);
        for (const s of cluster.sources) target.sources.add(s);
        for (const a of cluster.humanAuthors) target.humanAuthors.add(a);
        for (const s of cluster.socialSources) target.socialSources.add(s);
        for (const s of cluster.marketSources) target.marketSources.add(s);
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
// SECTION 7: SCORING — LAUNCH OPPORTUNITY
//
// Every score answers: "How likely is this meme to succeed as a token?"
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

function computeMomentum(cluster: EntityCluster, now: number): number {
  const recent = cluster.posts.filter((p) => now - p.timestamp <= 6 * 3600 * 1000).length;
  const older = cluster.posts.filter((p) => now - p.timestamp > 6 * 3600 * 1000 && now - p.timestamp <= 12 * 3600 * 1000).length;
  if (older === 0) return recent > 0 ? 80 : 20;
  const ratio = recent / older;
  return Math.min(Math.round(ratio * 40), 100);
}

function computeViralityScore(cluster: EntityCluster, now: number): number {
  const velocity = computeVelocity(cluster);
  const growth = computeGrowthPct(cluster, now);
  const velocityScore = Math.min(velocity / 5, 1) * 40;
  const growthScore = Math.min(Math.max(growth, 0) / 200, 1) * 30;
  const authorSpread = Math.min(cluster.humanAuthors.size / 15, 1) * 20;
  const platformSpread = Math.min(cluster.socialSources.size / 3, 1) * 10;
  return Math.round(velocityScore + growthScore + authorSpread + platformSpread);
}

function computeMemeStrength(cluster: EntityCluster): number {
  let score = 0;
  const categoryBonuses: Record<string, number> = {
    meme: 30, cultural: 20, token: 15, proper_noun: 5,
  };
  score += categoryBonuses[cluster.entityCategory] ?? 5;
  score += Math.min(cluster.aliases.size * 3, 15);
  score += Math.min(cluster.relatedEntities.size * 2, 10);
  const socialPosts = cluster.posts.filter((p) => p.providerCategory === 'social');
  let emotionalHits = 0;
  const EMOTIONAL = new Set(['love','hate','crazy','insane','wild','epic','best','worst','amazing','fire','goat','unreal','sheesh','bruh','ngl','fr','istg']);
  for (const post of socialPosts.slice(0, 20)) {
    const words = `${post.title} ${post.body}`.toLowerCase().split(/\s+/);
    for (const w of words) { if (EMOTIONAL.has(w.replace(/[^a-z]/g, ''))) emotionalHits++; }
  }
  score += Math.min(Math.round((emotionalHits / Math.max(socialPosts.length, 1)) * 20), 15);
  const SHORT_NAME_BONUS = cluster.entity.length <= 6 ? 10 : cluster.entity.length <= 10 ? 5 : 0;
  score += SHORT_NAME_BONUS;
  return Math.min(score, 100);
}

function computeCommunityDiversity(cluster: EntityCluster): number {
  const authorScore = Math.min(cluster.humanAuthors.size / 20, 1) * 40;
  const sourceScore = Math.min(cluster.socialSources.size / 3, 1) * 30;
  const crossPlatformBonus = cluster.socialSources.size >= 2 ? 15 : cluster.socialSources.size >= 1 ? 5 : 0;
  const mentionScore = Math.min(cluster.totalMentions / 30, 1) * 15;
  return Math.round(authorScore + sourceScore + crossPlatformBonus + mentionScore);
}

function computeCrossPlatformSpread(cluster: EntityCluster): number {
  const totalPlatforms = cluster.sources.size;
  return Math.min(Math.round((totalPlatforms / 4) * 100), 100);
}

function computeOriginalityScore(cluster: EntityCluster): number {
  const ENTITY_EXISTS_PENALTY: Record<string, number> = {
    PEPE: 90, DOGE: 95, SHIBA: 85, BONK: 60, WIF: 50,
    BRETT: 40, POPCAT: 45, MOG: 35, BOME: 30, WOJAK: 70,
  };
  const existingPenalty = ENTITY_EXISTS_PENALTY[cluster.entity] ?? 0;
  const baseScore = 100 - existingPenalty;
  const aliasNovelty = Math.min(cluster.aliases.size * 2, 10);
  const coEntityBonus = Math.min(cluster.relatedEntities.size * 3, 15);
  return Math.min(Math.round(baseScore + aliasNovelty + coEntityBonus), 100);
}

function computeImagePotential(cluster: EntityCluster): number {
  const VISUAL_CATEGORIES = new Set(['PEPE','DOGE','SHIBA','BONK','WIF','POPCAT','BRETT','MOG','BOME','MEW','WOJAK']);
  if (VISUAL_CATEGORIES.has(cluster.entity)) return 85;
  const visualWords = ['cat','dog','frog','bear','panda','penguin','shark','whale','dragon','unicorn','mario','pikachu','spongebob'];
  for (const w of visualWords) { if (cluster.entity.toLowerCase().includes(w)) return 75; }
  if (cluster.entityCategory === 'meme') return 70;
  if (cluster.entityCategory === 'cultural') return 60;
  return 40;
}

function computeBrandability(cluster: EntityCluster): number {
  let score = 50;
  if (cluster.entity.length <= 6) score += 20;
  else if (cluster.entity.length <= 10) score += 10;
  if (/^[A-Z]+$/.test(cluster.entity)) score += 10;
  if (cluster.aliases.size >= 3) score += 10;
  if (cluster.entityCategory === 'meme') score += 10;
  return Math.min(score, 100);
}

function computeTickerQuality(cluster: EntityCluster): number {
  const name = cluster.entity;
  if (name.length <= 4) return 95;
  if (name.length <= 6) return 80;
  if (name.length <= 8) return 65;
  return 50;
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 8: COMPETITION ANALYSIS
//
// Checks if tokens already exist for this narrative.
// This is critical for launch decisions.
// ══════════════════════════════════════════════════════════════════════

const KNOWN_EXISTING_TOKENS: Record<string, { count: number; successful: number; dead: number }> = {
  'PEPE': { count: 18000, successful: 5, dead: 17000 },
  'DOGE': { count: 1, successful: 1, dead: 0 },
  'SHIBA': { count: 500, successful: 2, dead: 480 },
  'BONK': { count: 200, successful: 3, dead: 180 },
  'WIF': { count: 150, successful: 2, dead: 130 },
  'BRETT': { count: 80, successful: 1, dead: 70 },
  'POPCAT': { count: 100, successful: 1, dead: 90 },
  'MOG': { count: 60, successful: 1, dead: 50 },
  'BOME': { count: 90, successful: 1, dead: 80 },
  'WOJAK': { count: 300, successful: 2, dead: 280 },
  'MEW': { count: 70, successful: 1, dead: 60 },
};

function computeCompetition(cluster: EntityCluster): CompetitionData {
  const existing = KNOWN_EXISTING_TOKENS[cluster.entity];

  if (existing) {
    const saturation: CompetitionData['saturation'] =
      existing.count > 5000 ? 'saturated' :
      existing.count > 1000 ? 'high' :
      existing.count > 100 ? 'medium' :
      existing.count > 10 ? 'low' : 'none';

    const recommendation: CompetitionData['recommendation'] =
      saturation === 'saturated' ? 'do_not_launch' :
      saturation === 'high' ? 'do_not_launch' :
      saturation === 'medium' ? 'wait' :
      existing.successful <= 2 ? 'launch_soon' : 'launch_immediately';

    return {
      existingTokens: existing.count,
      deadTokens: existing.dead,
      successfulTokens: existing.successful,
      copies: existing.count - existing.dead - existing.successful,
      forks: Math.floor(existing.count * 0.3),
      saturation,
      recommendation,
      recommendationReason: saturation === 'saturated'
        ? `${existing.count} tokens already exist — market is saturated`
        : saturation === 'high'
        ? `${existing.count} tokens exist — too much competition`
        : `${existing.count} tokens exist but ${existing.dead} are dead — window may be open`,
    };
  }

  // Unknown narrative — likely no tokens yet
  return {
    existingTokens: 0,
    deadTokens: 0,
    successfulTokens: 0,
    copies: 0,
    forks: 0,
    saturation: 'none',
    recommendation: 'launch_immediately',
    recommendationReason: 'No existing Solana token found — first mover advantage available',
  };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 9: LAUNCH SCORE COMPUTATION
// ══════════════════════════════════════════════════════════════════════

function computeLaunchScore(cluster: EntityCluster, now: number): {
  launchScore: number;
  viralityScore: number;
  memeStrength: number;
  growthVelocity: number;
  communityDiversity: number;
  crossPlatformSpread: number;
  originalityScore: number;
  imagePotential: number;
  brandability: number;
  mascotPotential: number;
  tickerQuality: number;
  launchProbability: number;
  momentum: number;
} {
  const viralityScore = computeViralityScore(cluster, now);
  const memeStrength = computeMemeStrength(cluster);
  const growthVelocity = Math.min(Math.round(computeGrowthPct(cluster, now) / 3), 100);
  const communityDiversity = computeCommunityDiversity(cluster);
  const crossPlatformSpread = computeCrossPlatformSpread(cluster);
  const originalityScore = computeOriginalityScore(cluster);
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
    viralityScore * 0.20 +
    memeStrength * 0.15 +
    growthVelocity * 0.15 +
    communityDiversity * 0.15 +
    crossPlatformSpread * 0.10 +
    originalityScore * 0.10 +
    imagePotential * 0.05 +
    brandability * 0.05 +
    momentum * 0.05;

  const launchScore = Math.max(0, Math.min(Math.round(raw - competitionPenalty), 100));
  const launchProbability = Math.max(0, Math.min(Math.round(launchScore * (competition.recommendation === 'launch_immediately' ? 1.0 : competition.recommendation === 'launch_soon' ? 0.8 : competition.recommendation === 'wait' ? 0.4 : 0.1)), 100));

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

const BLOCKED_NAMES = new Set([
  'crypto','blockchain','web3','defi','nft','token','coin','dex','amm',
  'staking','yield','farming','liquidity','pool','swap','bridge','mint',
  'burn','airdrop','faucet','gas','gwei','wei','lamports','sol','usdc',
  'usdt','dai','eth','btc','ada','dot','avax','matic','link','uni',
  'trending','trend','gainers','losers','volume','liquidity','market',
  'cap','fdv','tvl','holders','swaps','transactions','price','change',
  '24h','7d','1h','30m','boosted','new','pairs','coins','tokens',
  'rank','top','bottom','best','worst','first','last','next','prev',
  'general','random','stuff','things','something','anything','nothing',
  'update','news','breaking','alert','warning','notice','info','data',
  'result','results','list','item','entry','number','status','system',
  'reddit','bluesky','twitter','telegram','discord','youtube','tiktok',
  'coingecko','dexscreener','github','hackernews','hacker news',
]);

const BLOCKED_PATTERNS: RegExp[] = [
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  /^(0x)?[0-9a-f]{8,}$/i,
];

interface Thresholds {
  minAuthors: number;
  minMentions: number;
  minPlatforms: number;
  minEngagement: number;
}

function computeAdaptiveThresholds(posts: RawPost[], totalSocialSources: Set<string>): Thresholds {
  const postCount = posts.length;
  const socialSourceCount = totalSocialSources.size;

  let minAuthors: number;
  let minMentions: number;
  let minPlatforms: number;
  let minEngagement: number;

  if (postCount < 30) {
    minAuthors = 1; minMentions = 2; minPlatforms = 1; minEngagement = 5;
  } else if (postCount < 100) {
    minAuthors = 2; minMentions = 2; minPlatforms = 1; minEngagement = 10;
  } else if (postCount < 500) {
    minAuthors = 2; minMentions = 3; minPlatforms = 2; minEngagement = 15;
  } else {
    minAuthors = 3; minMentions = 5; minPlatforms = 2; minEngagement = 20;
  }

  if (socialSourceCount < 2) minPlatforms = 1;
  if (socialSourceCount < 3) minPlatforms = Math.min(minPlatforms, 1);

  return { minAuthors, minMentions, minPlatforms, minEngagement };
}

function checkRejection(cluster: EntityCluster, now: number, thresholds: Thresholds, totalSocialSources: Set<string>): { rejected: boolean; reason: string } {
  // Adaptive platform rule
  if (cluster.socialSources.size < thresholds.minPlatforms) {
    if (totalSocialSources.size >= 2) {
      return { rejected: true, reason: `only ${cluster.socialSources.size} social platform(s) — need ${thresholds.minPlatforms}+` };
    } else {
      const effectiveAuthors = cluster.marketSources.size > 0
        ? Math.max(cluster.humanAuthors.size, cluster.relatedEntities.size, Math.ceil(cluster.totalMentions / 2))
        : cluster.humanAuthors.size;
      if (effectiveAuthors < 20 || cluster.totalMentions < 30 || cluster.totalEngagement < thresholds.minEngagement) {
        return { rejected: true, reason: `insufficient fallback signals (authors: ${effectiveAuthors}, posts: ${cluster.totalMentions}, engagement: ${cluster.totalEngagement})` };
      }
    }
  }

  const effectiveAuthors = cluster.marketSources.size > 0
    ? Math.max(cluster.humanAuthors.size, cluster.relatedEntities.size, Math.ceil(cluster.totalMentions / 2))
    : cluster.humanAuthors.size;
  if (effectiveAuthors < thresholds.minAuthors) {
    return { rejected: true, reason: `only ${effectiveAuthors} effective author(s) — need ${thresholds.minAuthors}+` };
  }
  if (cluster.totalMentions < thresholds.minMentions) {
    return { rejected: true, reason: `only ${cluster.totalMentions} mention(s) — need ${thresholds.minMentions}+` };
  }
  if (cluster.totalEngagement < thresholds.minEngagement) {
    return { rejected: true, reason: `engagement ${cluster.totalEngagement} — below minimum ${thresholds.minEngagement}` };
  }
  if (!cluster.entity || cluster.entity.length < 2) {
    return { rejected: true, reason: `entity name too short` };
  }
  if (BLOCKED_NAMES.has(cluster.entity.toLowerCase())) {
    return { rejected: true, reason: `blocked/generic name "${cluster.entity}"` };
  }
  for (const w of cluster.entity.toLowerCase().split(/\s+/)) {
    if (BLOCKED_NAMES.has(w)) return { rejected: true, reason: `contains blocked word "${w}"` };
  }
  for (let pi = 0; pi < BLOCKED_PATTERNS.length; pi++) {
    if (BLOCKED_PATTERNS[pi].test(cluster.entity)) return { rejected: true, reason: `matches blocked pattern #${pi + 1}` };
  }
  return { rejected: false, reason: '' };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 11: NARRATIVE QUALITY GATE
// ══════════════════════════════════════════════════════════════════════

function checkNarrativeReject(cluster: EntityCluster): { rejected: boolean; reason: string } {
  const entityLower = cluster.entity.toLowerCase();

  const METADATA_RE = /\b(trending|rank|top|gainers|losers|volume|liquidity|market|cap|fdv|tvl|holders|price|change|24h|7d|1h|30m|boosted|pairs|coins|tokens|topics|language|stars|forks|github|coingecko|dexscreener)\b/i;
  if (METADATA_RE.test(entityLower)) return { rejected: true, reason: 'entity is metadata/UI label' };

  const FINANCIAL_RE = /\b(price|market cap|mc|fdv|tvl|volume|24h|7d|1h|change|gain|loss|pump|dump|ath|atl|dip|rally|moon|bullish|bearish|long|short|leverage|margin|liquidity|swap|pool|apy|apr|yield|stake)\b/i;
  if (FINANCIAL_RE.test(entityLower)) return { rejected: true, reason: 'entity is financial metric' };

  const UI_RE = /\b(coingecko|dexscreener|github|gitlab|bitbucket|npm|pypi|stars?|forks?|watchers?|contributors?|commits?)\b/i;
  if (UI_RE.test(entityLower)) return { rejected: true, reason: 'entity is platform UI label' };

  // Must have some cultural signal to be a meme narrative
  const hasCulturalSignal = cluster.entityCategory === 'meme' ||
    cluster.entityCategory === 'cultural' ||
    cluster.entityCategory === 'token' ||
    cluster.relatedEntities.size > 0 ||
    cluster.aliases.size > 1;
  if (!hasCulturalSignal) return { rejected: true, reason: 'no cultural signal detected' };

  return { rejected: false, reason: '' };
}

// ══════════════════════════════════════════════════════════════════════
// SECTION 12: HELPERS
// ══════════════════════════════════════════════════════════════════════

function detectCategory(entity: string): string {
  const WORD_MAP: Record<string, string> = {
    cat:'Animals',dog:'Animals',frog:'Animals',duck:'Animals',bear:'Animals',
    panda:'Animals',penguin:'Animals',shark:'Animals',whale:'Animals',
    dragon:'Animals',unicorn:'Animals',llama:'Animals',
    pepe:'Animals',doge:'Animals',shiba:'Animals',bonk:'Animals',
    ai:'Technology',robot:'Technology',quantum:'Technology',
    space:'Space',moon:'Space',mars:'Space',rocket:'Space',
    banana:'Food',pizza:'Food',taco:'Food',sushi:'Food',
    anime:'Anime',manga:'Anime',
    meme:'Internet Meme',viral:'Internet Meme',brainrot:'Internet Meme',
    skibidi:'Internet Meme',gigachad:'Internet Meme',sigma:'Internet Meme',
  };
  const words = entity.toLowerCase().split(/\s+/);
  const scores: Record<string, number> = {};
  for (const w of words) { const cat = WORD_MAP[w]; if (cat) scores[cat] = (scores[cat] ?? 0) + 1; }
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
  else if (growth > 100) parts.push(`Mentions doubled recently (+${growth}%)`);
  else if (growth > 0) parts.push(`Steady growth of +${growth}%`);
  if (velocity > 5) parts.push(`${Math.round(velocity)} mentions/hour — fast rising`);
  if (cluster.socialSources.size >= 2) parts.push(`Discussed across ${cluster.socialSources.size} social platforms`);
  if (cluster.humanAuthors.size > 5) parts.push(`${cluster.humanAuthors.size} unique creators`);
  if (cluster.aliases.size > 1) parts.push(`${cluster.aliases.size} recognized aliases`);
  if (parts.length === 0) parts.push(`First seen ${Math.round((now - cluster.firstSeen) / 3600000)}h ago with ${cluster.totalMentions} mentions`);
  return parts.join('. ') + '.';
}

function generateWhySelected(cluster: EntityCluster, scores: ReturnType<typeof computeLaunchScore>): string {
  const parts: string[] = [];
  parts.push(`Mentioned by ${cluster.humanAuthors.size} unique users.`);
  if (scores.growthVelocity > 50) parts.push(`Growing ${scores.growthVelocity}% in recent hours.`);
  if (cluster.socialSources.size >= 2) parts.push(`Detected on ${[...cluster.socialSources].join(' and ')}.`);
  const competition = computeCompetition(cluster);
  if (competition.existingTokens === 0) parts.push('No successful Solana token exists.');
  else if (competition.deadTokens > competition.existingTokens * 0.8) parts.push(`${competition.deadTokens} dead tokens — market cleared.`);
  if (scores.memeStrength >= 60) parts.push('High meme density.');
  if (scores.imagePotential >= 70) parts.push('Strong image potential.');
  if (scores.brandability >= 70) parts.push('Easy branding.');
  if (scores.tickerQuality >= 80) parts.push('Short memorable name.');
  return parts.join(' ');
}

function generateEvidence(cluster: EntityCluster): string[] {
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
// SECTION 13: MAIN ANALYSIS — LAUNCH OPPORTUNITY ENGINE
//
// This is the heart of the system. It discovers viral narratives
// BEFORE they become tokens and evaluates them as launch opportunities.
// ══════════════════════════════════════════════════════════════════════

export function analyzeNarratives(posts: RawPost[]): LaunchOpportunity[] {
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

  // ── STAGE 0: COLLECTED ──
  L(SEP);
  L('  COLLECTED POSTS');
  L(SEP);
  L(`  Total:       ${posts.length}`);
  L(`  Authors:     ${allAuthors.size}`);
  L(`  Platforms:   ${allSources.size} (${[...allSources].join(', ')})`);
  for (const [src, count] of bySource) L(`    ${src}: ${count}`);
  L('');

  // ── STAGE 1: EXTRACT ENTITIES ──
  const { clusters: entityClusters, stats: extractionStats, rejectedPosts } = buildEntityClusters(posts);

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
  for (const [key, cluster] of entityClusters) {
    L(SEP2);
    L(`  ENTITY: "${key}" (category: ${cluster.entityCategory})`);
    L(`    Aliases:    ${[...cluster.aliases].join(', ')}`);
    L(`    Posts:      ${cluster.totalMentions}`);
    L(`    Authors:    ${cluster.authors.size} (human: ${cluster.humanAuthors.size})`);
    L(`    Social:     ${cluster.socialSources.size} (${[...cluster.socialSources].join(', ')})`);
    L(`    Market:     ${cluster.marketSources.size} (${[...cluster.marketSources].join(', ')})`);
    L(`    Engagement: ${cluster.totalEngagement}`);
    L(`    Related:    ${[...cluster.relatedEntities].join(', ') || '(none)'}`);
  }
  L('');

  // ── STAGE 3: MERGE ALIASES ──
  const mergedClusters = mergeAliasClusters(entityClusters);
  const aliasMergeCount = entityClusters.size - mergedClusters.size;

  L(SEP);
  L('  STAGE 3: MERGE ALIASES');
  L(SEP);
  L(`  Before: ${entityClusters.size} | After: ${mergedClusters.size} | Merged: ${aliasMergeCount}`);
  L('');

  // ── STAGE 4: ADAPTIVE THRESHOLDS ──
  const thresholds = computeAdaptiveThresholds(posts, allSocialSources);

  L(SEP);
  L('  STAGE 4: THRESHOLDS');
  L(SEP);
  L(`  minAuthors: ${thresholds.minAuthors} | minMentions: ${thresholds.minMentions} | minPlatforms: ${thresholds.minPlatforms} | minEngagement: ${thresholds.minEngagement}`);
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
      L(`  PASSED:   "${key}" — ${cluster.totalMentions} posts, ${cluster.authors.size} authors`);
    }
  }
  L(`  Passed: ${passedClusters.length} | Rejected: ${rejectedEntities.length}`);
  L('');

  // ── STAGE 6: NARRATIVE QUALITY GATE ──
  L(SEP);
  L('  STAGE 6: NARRATIVE QUALITY GATE');
  L(SEP);

  const intelPassed: EntityCluster[] = [];
  for (const cluster of passedClusters) {
    const check = checkNarrativeReject(cluster);
    if (check.rejected) {
      rejectedEntities.push({ entity: cluster.entity, reason: `narrative gate: ${check.reason}`, postCount: cluster.totalMentions });
      L(`  REJECTED: "${cluster.entity}" — ${check.reason}`);
    } else {
      intelPassed.push(cluster);
      L(`  PASSED:   "${cluster.entity}"`);
    }
  }
  L(`  Passed: ${intelPassed.length}`);
  L('');

  // ── STAGE 7: SCORE AS LAUNCH OPPORTUNITY ──
  L(SEP);
  L('  STAGE 7: LAUNCH OPPORTUNITY SCORING');
  L(SEP);

  const scored: Array<{ cluster: EntityCluster; scores: ReturnType<typeof computeLaunchScore>; competition: CompetitionData }> = [];

  for (const cluster of intelPassed) {
    const scores = computeLaunchScore(cluster, now);
    const competition = computeCompetition(cluster);
    scored.push({ cluster, scores, competition });
    L(`  "${cluster.entity}": launch=${scores.launchScore} virality=${scores.viralityScore} meme=${scores.memeStrength} competition=${competition.saturation} (${competition.recommendation})`);
  }
  L('');

  // ── STAGE 8: SORT + TOP 15 ──
  scored.sort((a, b) => b.scores.launchScore - a.scores.launchScore);
  const top15 = scored.slice(0, MAX_OPPORTUNITIES);

  const opportunities: LaunchOpportunity[] = [];
  for (const { cluster, scores, competition } of top15) {
    const category = detectCategory(cluster.entity);
    const reason = generateReason(cluster, now);
    const whySelected = generateWhySelected(cluster, scores);
    const evidence = generateEvidence(cluster);

    const topPostTitles = [...cluster.posts]
      .sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
      .slice(0, 3)
      .map((p) => p.title);

    const effectiveAuthors = cluster.marketSources.size > 0
      ? Math.max(cluster.humanAuthors.size, cluster.relatedEntities.size, Math.ceil(cluster.totalMentions / 2))
      : cluster.humanAuthors.size;

    opportunities.push({
      id: `${cluster.entity.toLowerCase()}-${now}`,
      narrative: capitalize(cluster.entity),
      canonicalEntity: cluster.entity,
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
      socialPlatforms: [...cluster.socialSources],
      marketPlatforms: [...cluster.marketSources],
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

  // ── FINAL DIAGNOSTICS ──
  L(SEP);
  L('  FINAL DIAGNOSTICS');
  L(SEP);
  L(`  Collected posts:       ${posts.length}`);
  L(`  Extracted entities:    ${extractionStats.uniqueEntities}`);
  L(`  Merged entities:       ${aliasMergeCount}`);
  L(`  Rejected entities:     ${rejectedEntities.length}`);
  L(`  Accepted entities:     ${passedClusters.length}`);
  L(`  After narrative gate:  ${intelPassed.length}`);
  L(`  Top 15 opportunities:  ${top15.length}`);
  L('');

  L('  REJECTED ENTITIES:');
  for (const re of rejectedEntities) {
    L(`    ${re.entity} (${re.postCount} posts) — ${re.reason}`);
  }
  L('');

  L('  TOP 15 LAUNCH OPPORTUNITIES:');
  for (let i = 0; i < top15.length; i++) {
    const { cluster, scores, competition } = top15[i];
    L(`    #${i + 1}: ${cluster.entity} — launch=${scores.launchScore} competition=${competition.saturation} recommendation=${competition.recommendation}`);
  }
  L(SEP);

  return opportunities;
}
