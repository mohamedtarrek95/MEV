import type {
  IdeaCluster,
  MemeIdea,
  Post,
  SourceId,
} from './types';
import { SOURCES, sourceLabel, sourceWeight, WINDOW_MS } from './sources';
import { meridiemTime, hoursAgoStr } from './time';

// ── stop words ──────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','if','then','else','when','at','by','for',
  'in','on','of','to','from','with','as','is','was','are','were','been','be',
  'have','has','had','do','does','did','will','would','could','should','may',
  'might','shall','can','need','dare','ought','used','this','that','these',
  'those','i','me','my','we','our','you','your','he','him','his','she','her',
  'it','its','they','them','their','what','which','who','whom','whose','where',
  'when','why','how','all','each','every','both','few','more','most','other',
  'some','such','no','not','only','own','same','so','than','too','very','just',
  'about','above','after','again','also','any','because','before','being',
  'below','between','during','here','into','now','over','out','through',
  'under','up','down','off','once','further','then','there','here','very',
  'just','don','dont','get','got','like','one','two','go','going','know',
  'think','see','come','make','take','give','say','said','put','let','still',
  'even','way','much','back','well','look','first','last','new','right',
  'thing','things','really','yeah','yes','no','ok','okay','lol','lmao',
  'haha','bro','dude','imho','tbh','ngl','smh','fwiw','fyi','afaik',
  'rt','cc','dm','pm','op','oc','nsfw','spoiler','edit','upvote','downvote',
  'post','comment','thread','sub','subreddit','channel','group','chat',
  'guys','people','someone','everyone','anyone','nothing','everything',
]);

// ── emoji strip ─────────────────────────────────────────────────────
const EMOJI_RE = /[\u{1F600}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
const URL_RE = /https?:\/\/[^\s]+/gi;
const PUNCT_RE = /[^\p{L}\p{N}\s]/gu;
const MULTI_SPACE_RE = /\s{2,}/g;

// ── normalization ───────────────────────────────────────────────────
export function normalizeText(text: string): string {
  return text
    .replace(URL_RE, '')
    .replace(EMOJI_RE, '')
    .replace(PUNCT_RE, ' ')
    .toLowerCase()
    .replace(MULTI_SPACE_RE, ' ')
    .trim();
}

export function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

// ── fuzzy matching ──────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[m][n];
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const len = Math.max(a.length, b.length);
  if (len < 3) return false;
  return levenshtein(a, b) <= Math.floor(len * 0.3);
}

// ── phrase extraction ───────────────────────────────────────────────
function extractPhrases(normalized: string): string[] {
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);
  const filtered = words.filter((w) => !STOP_WORDS.has(w) && w.length >= 2);
  const phrases: string[] = [];
  for (let i = 0; i < filtered.length; i++) {
    phrases.push(filtered[i]);
    if (i + 1 < filtered.length) {
      phrases.push(`${filtered[i]} ${filtered[i + 1]}`);
    }
    if (i + 2 < filtered.length) {
      phrases.push(`${filtered[i]} ${filtered[i + 1]} ${filtered[i + 2]}`);
    }
  }
  return phrases;
}

// ── collapse repeated chars ─────────────────────────────────────────
function collapseRepeated(s: string): string {
  return s.replace(/(.)\1{2,}/g, '$1$1');
}

// ── token extraction from a post ────────────────────────────────────
function extractTokens(text: string): string[] {
  const norm = normalizeText(text);
  const phrases = extractPhrases(norm);
  return phrases.map((p) => collapseRepeated(p)).filter((p) => {
    const words = p.split(/\s+/);
    return words.every((w) => w.length >= 2);
  });
}

// ── cluster key (canonical) ─────────────────────────────────────────
function clusterKey(phrase: string): string {
  return normalizeKey(phrase);
}

// ── aggregate into clusters ─────────────────────────────────────────
function clusterPosts(posts: Post[]): IdeaCluster[] {
  const clusterMap = new Map<string, IdeaCluster>();

  for (const post of posts) {
    const tokens = extractTokens(post.text);
    const seen = new Set<string>();

    for (const token of tokens) {
      const key = clusterKey(token);
      if (seen.has(key)) continue;
      seen.add(key);

      let cluster = clusterMap.get(key);
      if (!cluster) {
        cluster = {
          key,
          canonicalName: token,
          tokens: [token],
          posts: [],
          firstSeen: post.timestamp,
          lastSeen: post.timestamp,
          authors: new Set(),
          platforms: new Set(),
          totalMentions: 0,
          totalEngagement: 0,
        };
        clusterMap.set(key, cluster);
      }

      cluster.posts.push(post);
      cluster.authors.add(post.author);
      cluster.platforms.add(post.sourceId);
      cluster.totalMentions += 1;
      cluster.totalEngagement += post.likes + post.shares * 2 + post.comments;
      cluster.firstSeen = Math.min(cluster.firstSeen, post.timestamp);
      cluster.lastSeen = Math.max(cluster.lastSeen, post.timestamp);
    }
  }

  // merge similar clusters
  const clusters = [...clusterMap.values()];
  const merged = new Set<string>();

  for (let i = 0; i < clusters.length; i++) {
    if (merged.has(clusters[i].key)) continue;
    for (let j = i + 1; j < clusters.length; j++) {
      if (merged.has(clusters[j].key)) continue;
      if (similar(clusters[i].key, clusters[j].key)) {
        // merge j into i
        clusters[i].tokens.push(...clusters[j].tokens);
        clusters[i].posts.push(...clusters[j].posts);
        for (const a of clusters[j].authors) clusters[i].authors.add(a);
        for (const p of clusters[j].platforms) clusters[i].platforms.add(p);
        clusters[i].totalMentions += clusters[j].totalMentions;
        clusters[i].totalEngagement += clusters[j].totalEngagement;
        clusters[i].firstSeen = Math.min(clusters[i].firstSeen, clusters[j].firstSeen);
        clusters[i].lastSeen = Math.max(clusters[i].lastSeen, clusters[j].lastSeen);
        // keep the more "readable" name
        if (clusters[j].canonicalName.length > clusters[i].canonicalName.length) {
          clusters[i].canonicalName = clusters[j].canonicalName;
        }
        merged.add(clusters[j].key);
      }
    }
  }

  return clusters.filter((c) => !merged.has(c.key));
}

// ── detect category ─────────────────────────────────────────────────
const ANIMAL_WORDS = new Set([
  'cat','dog','hamster','mouse','rat','frog','toad','duck','chicken','hen',
  'cow','pig','sheep','goat','horse','bear','wolf','fox','rabbit','bunny',
  'turtle','penguin','whale','shark','crab','lobster','octopus','squid',
  'bee','ant','spider','snake','lizard','dinosaur','dragon','unicorn',
  'llama','alpaca','gorilla','monkey','ape','elephant','giraffe','lion',
  'tiger','zebra','koala','panda','sloth','narwhal','axolotl',
]);
const TECH_WORDS = new Set([
  'ai','artificial','intelligence','robot','quantum','cyber','blockchain',
  'nft','defi','web3','metaverse','algorithm','neural','network','gpu',
  'mining','token','crypto','bitcoin','ethereum','solana','laser','neon',
  'hologram','vr','ar','drone','chip','silicon','matrix','hack',
]);
const VIOLENCE_WORDS = new Set([
  'ninja','warrior','samurai','pirate','viking','knight','assassin',
]);
const SPACE_WORDS = new Set([
  'space','moon','mars','rocket','star','galaxy','cosmic','alien','ufo',
  'orbit','nebula','asteroid','comet','supernova',
]);
const FOOD_WORDS = new Set([
  'banana','pizza','taco','burrito','sushi','ramen','waffle','pancake',
  'donut','cookie','ice cream','chocolate','avocado','pickle','pepper',
]);

function detectCategory(phrase: string): { category: string; theme: string } {
  const words = phrase.split(/\s+/);
  for (const w of words) {
    if (ANIMAL_WORDS.has(w)) return { category: 'Animals', theme: 'animals' };
    if (SPACE_WORDS.has(w)) return { category: 'Space', theme: 'space' };
    if (FOOD_WORDS.has(w)) return { category: 'Food', theme: 'food' };
    if (TECH_WORDS.has(w)) return { category: 'Technology', theme: 'tech' };
    if (VIOLENCE_WORDS.has(w)) return { category: 'Action', theme: 'action' };
  }
  if (phrase.includes('quantum') || phrase.includes('cyber') || phrase.includes('neon'))
    return { category: 'Tech Aesthetic', theme: 'cyber' };
  if (phrase.includes('pixel') || phrase.includes('retro') || phrase.includes('8bit'))
    return { category: 'Retro Gaming', theme: 'retro' };
  if (phrase.includes('dark') || phrase.includes('shadow') || phrase.includes('void'))
    return { category: 'Dark Humor', theme: 'dark' };
  if (phrase.includes('moon') || phrase.includes('rocket'))
    return { category: 'To The Moon', theme: 'moon' };
  return { category: 'General Meme', theme: 'meme' };
}

// ── generate symbol ─────────────────────────────────────────────────
function generateSymbol(name: string): string {
  const words = name.split(/\s+/);
  if (words.length === 1) {
    const w = words[0];
    return w.length <= 6 ? w.toUpperCase() : w.slice(0, 6).toUpperCase();
  }
  const acronym = words.map((w) => w[0]).join('').toUpperCase();
  if (acronym.length >= 2 && acronym.length <= 6) return acronym;
  return words[0].slice(0, 4).toUpperCase() + words[1].slice(0, 2).toUpperCase();
}

// ── generate description ────────────────────────────────────────────
function generateDescription(name: string, category: string, mentionCount: number, platforms: SourceId[]): string {
  const platformNames = platforms.map(sourceLabel).join(', ');
  return `A meme coin inspired by the viral "${name}" trend detected across ${platformNames}. ` +
    `Category: ${category}. ${mentionCount} mentions across multiple platforms in the last 24 hours. ` +
    `Early viral momentum detected — could be the next breakout meme.`;
}

// ── generate tags ───────────────────────────────────────────────────
function generateTags(name: string, category: string): string[] {
  const tags = ['meme', 'viral', 'trending'];
  const words = name.toLowerCase().split(/\s+/);
  for (const w of words) {
    if (w.length >= 3) tags.push(w);
  }
  tags.push(category.toLowerCase().replace(/\s+/g, '-'));
  return [...new Set(tags)].slice(0, 8);
}

// ── growth calculation ──────────────────────────────────────────────
function computeGrowthPct(cluster: IdeaCluster, now: number): number {
  const halfWindow = WINDOW_MS / 2;
  const recent = cluster.posts.filter((p) => now - p.timestamp <= halfWindow).length;
  const older = cluster.posts.length - recent;
  if (older === 0) return recent > 0 ? 100 + recent * 20 : 0;
  return Math.round(((recent - older) / older) * 100);
}

// ── velocity (mentions per hour) ────────────────────────────────────
function computeVelocity(cluster: IdeaCluster): number {
  const spanHours = Math.max((cluster.lastSeen - cluster.firstSeen) / 3600000, 0.5);
  return cluster.totalMentions / spanHours;
}

// ── trend score ─────────────────────────────────────────────────────
function computeTrendScore(cluster: IdeaCluster, now: number): number {
  const mentionScore = Math.min(cluster.totalMentions / 500, 1);
  const growthPct = computeGrowthPct(cluster, now);
  const growthScore = Math.min(Math.max(growthPct, 0) / 500, 1);
  const velocity = computeVelocity(cluster);
  const velocityScore = Math.min(velocity / 20, 1);
  const platformScore = Math.min(cluster.platforms.size / 6, 1);
  const authorScore = Math.min(cluster.authors.size / 100, 1);

  // recency boost: higher if recently seen
  const ageHours = (now - cluster.lastSeen) / 3600000;
  const recencyBoost = Math.max(0, 1 - ageHours / 24);

  // reliability weight from platforms
  const reliability = [...cluster.platforms].reduce(
    (sum, id) => sum + sourceWeight(id), 0,
  ) / Math.max(cluster.platforms.size, 1);

  const raw =
    mentionScore * 0.25 +
    growthScore * 0.2 +
    velocityScore * 0.2 +
    platformScore * 0.15 +
    authorScore * 0.1 +
    recencyBoost * 0.05 +
    reliability * 0.05;

  return Math.round(raw * 1000) / 10;
}

// ── confidence ──────────────────────────────────────────────────────
function computeConfidence(cluster: IdeaCluster, now: number): number {
  const platformPct = Math.min(cluster.platforms.size / 6, 1);
  const mentionPct = Math.min(cluster.totalMentions / 300, 1);
  const growthPct = Math.min(Math.max(computeGrowthPct(cluster, now), 0) / 400, 1);
  const authorPct = Math.min(cluster.authors.size / 80, 1);
  return Math.round(
    (platformPct * 0.35 + mentionPct * 0.25 + growthPct * 0.25 + authorPct * 0.15) * 100,
  );
}

// ── reason generator ────────────────────────────────────────────────
function generateReason(cluster: IdeaCluster, now: number): string {
  const growth = computeGrowthPct(cluster, now);
  const velocity = computeVelocity(cluster);
  const ageHours = Math.round((now - cluster.firstSeen) / 3600000);
  const parts: string[] = [];

  if (growth > 200) {
    parts.push(`Mentions surged +${growth}% in the last 12 hours`);
  } else if (growth > 100) {
    parts.push(`Mentions doubled in the last 12 hours (+${growth}%)`);
  } else if (growth > 0) {
    parts.push(`Steady growth of +${growth}% in recent hours`);
  }

  if (velocity > 10) {
    parts.push(`${Math.round(velocity)} mentions/hour — extremely hot`);
  } else if (velocity > 3) {
    parts.push(`${Math.round(velocity)} mentions/hour — fast rising`);
  }

  if (cluster.platforms.size >= 4) {
    parts.push(`Cross-platform viral spread across ${cluster.platforms.size} sources`);
  } else if (cluster.platforms.size >= 2) {
    parts.push(`Picking up on ${cluster.platforms.size} independent platforms`);
  }

  if (cluster.authors.size > 50) {
    parts.push(`${cluster.authors.size} unique creators discussing this idea`);
  }

  if (parts.length === 0) {
    parts.push(`First seen ${ageHours}h ago with ${cluster.totalMentions} mentions`);
  }

  return parts.join('. ') + '.';
}

// ── evidence bullets ────────────────────────────────────────────────
function generateEvidence(cluster: IdeaCluster, now: number): string[] {
  const evidence: string[] = [];
  const byPlatform = new Map<SourceId, number>();
  for (const p of cluster.posts) {
    byPlatform.set(p.sourceId, (byPlatform.get(p.sourceId) ?? 0) + 1);
  }

  const sorted = [...byPlatform.entries()].sort((a, b) => b[1] - a[1]);
  for (const [id, count] of sorted.slice(0, 5)) {
    evidence.push(`${sourceLabel(id)}: ${count} mentions`);
  }

  const growth = computeGrowthPct(cluster, now);
  if (growth > 0) {
    evidence.push(`Growth: +${growth}% in last 12h`);
  }

  const velocity = computeVelocity(cluster);
  if (velocity > 1) {
    evidence.push(`Velocity: ${Math.round(velocity * 10) / 10} mentions/hour`);
  }

  const ageHours = Math.round((now - cluster.firstSeen) / 3600000);
  evidence.push(`First detected: ${ageHours}h ago (${meridiemTime(cluster.firstSeen)})`);

  const topAuthors = [...new Set(cluster.posts.map((p) => p.author))].slice(0, 3);
  if (topAuthors.length > 0) {
    evidence.push(`Active voices: ${topAuthors.join(', ')}`);
  }

  return evidence;
}

// ── main export ─────────────────────────────────────────────────────
export interface BuildMemeIdeasInput {
  posts: Post[];
  now?: number;
}

export function buildMemeIdeas(input: BuildMemeIdeasInput): MemeIdea[] {
  const now = input.now ?? Date.now();
  const recent = input.posts.filter((p) => now - p.timestamp <= WINDOW_MS);
  const clusters = clusterPosts(recent);
  const ideas: MemeIdea[] = [];

  for (const cluster of clusters) {
    if (cluster.totalMentions < 3) continue;
    if (cluster.platforms.size < 2) continue;

    const trendScore = computeTrendScore(cluster, now);
    if (trendScore < 5) continue;

    const growthPct = computeGrowthPct(cluster, now);
    const confidencePct = computeConfidence(cluster, now);
    const { category, theme } = detectCategory(cluster.canonicalName);
    const name = capitalize(cluster.canonicalName);
    const symbol = generateSymbol(name);
    const description = generateDescription(name, category, cluster.totalMentions, [...cluster.platforms]);
    const tags = generateTags(name, category);
    const reason = generateReason(cluster, now);
    const evidence = generateEvidence(cluster, now);

    ideas.push({
      id: `${cluster.key}-${now}`,
      name,
      symbol,
      description,
      trendScore,
      mentionCount: cluster.totalMentions,
      growthPct,
      uniqueAuthors: cluster.authors.size,
      platformsFound: [...cluster.platforms],
      platformCount: cluster.platforms.size,
      firstDetected: cluster.firstSeen,
      lastSeen: cluster.lastSeen,
      confidencePct,
      reason,
      evidence,
      tags,
      theme,
      category,
    });
  }

  return ideas.sort((a, b) => b.trendScore - a.trendScore);
}

function capitalize(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
