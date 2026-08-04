import type { RawPost, NarrativeCluster, MemeNarrative, IntelReport } from './types.js';

// ── text normalization ──────────────────────────────────────────────
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
  'things','really','yeah','yes','no','ok','okay','lol','lmao','haha','bro',
  'dude','tbh','ngl','actually','literally','basically','probably','definitely',
]);

const URL_RE = /https?:\/\/[^\s]+/gi;
const EMOJI_RE = /[\u{1F600}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu;
const PUNCT_RE = /[^\p{L}\p{N}\s]/gu;

function normalize(text: string): string {
  return text.replace(URL_RE, '').replace(EMOJI_RE, '').replace(PUNCT_RE, ' ').toLowerCase().replace(/\s{2,}/g, ' ').trim();
}

function extractWords(text: string): string[] {
  return normalize(text).split(/\s+/).filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

// ── phrase extraction ───────────────────────────────────────────────
function extractPhrases(text: string): string[] {
  const words = extractWords(text);
  const phrases: string[] = [];
  for (let i = 0; i < words.length; i++) {
    phrases.push(words[i]);
    if (i + 1 < words.length) phrases.push(`${words[i]} ${words[i + 1]}`);
    if (i + 2 < words.length) phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return phrases;
}

// ── fuzzy matching ──────────────────────────────────────────────────
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
  if (len < 3) return false;
  return levenshtein(a, b) <= Math.floor(len * 0.3);
}

function clusterKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

// ── clustering ──────────────────────────────────────────────────────
function clusterPosts(posts: RawPost[]): NarrativeCluster[] {
  const map = new Map<string, NarrativeCluster>();
  const now = Date.now();
  const WINDOW = 24 * 3600 * 1000;

  const recent = posts.filter((p) => now - p.timestamp <= WINDOW);

  for (const post of recent) {
    const allText = `${post.title} ${post.body}`;
    const phrases = extractPhrases(allText);
    const seen = new Set<string>();

    for (const phrase of phrases) {
      const key = clusterKey(phrase);
      if (seen.has(key) || key.length < 3) continue;
      seen.add(key);

      let c = map.get(key);
      if (!c) {
        c = {
          key, canonicalName: phrase, phrases: [phrase],
          posts: [], firstSeen: post.timestamp, lastSeen: post.timestamp,
          authors: new Set(), sources: new Set(),
          totalMentions: 0, totalEngagement: 0,
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

// ── scoring ─────────────────────────────────────────────────────────
function computeGrowthPct(cluster: NarrativeCluster, now: number): number {
  const half = 12 * 3600 * 1000;
  const recent = cluster.posts.filter((p) => now - p.timestamp <= half).length;
  const older = cluster.posts.length - recent;
  if (older === 0) return recent > 0 ? 100 + recent * 20 : 0;
  return Math.round(((recent - older) / older) * 100);
}

function computeVelocity(cluster: NarrativeCluster): number {
  const spanHours = Math.max((cluster.lastSeen - cluster.firstSeen) / 3600000, 0.5);
  return cluster.totalMentions / spanHours;
}

function computeTrendScore(cluster: NarrativeCluster, now: number): number {
  const mentionScore = Math.min(cluster.totalMentions / 100, 1);
  const growthPct = computeGrowthPct(cluster, now);
  const growthScore = Math.min(Math.max(growthPct, 0) / 500, 1);
  const velocity = computeVelocity(cluster);
  const velocityScore = Math.min(velocity / 10, 1);
  const sourceScore = Math.min(cluster.sources.size / 4, 1);
  const authorScore = Math.min(cluster.authors.size / 30, 1);
  const ageHours = (now - cluster.lastSeen) / 3600000;
  const recencyBoost = Math.max(0, 1 - ageHours / 24);
  const raw =
    mentionScore * 0.25 + growthScore * 0.20 + velocityScore * 0.20 +
    sourceScore * 0.15 + authorScore * 0.10 + recencyBoost * 0.10;
  return Math.round(raw * 1000) / 10;
}

function computeConfidence(cluster: NarrativeCluster, now: number): number {
  const sourcePct = Math.min(cluster.sources.size / 4, 1);
  const mentionPct = Math.min(cluster.totalMentions / 100, 1);
  const growthPct = Math.min(Math.max(computeGrowthPct(cluster, now), 0) / 400, 1);
  const authorPct = Math.min(cluster.authors.size / 30, 1);
  return Math.round((sourcePct * 0.35 + mentionPct * 0.25 + growthPct * 0.25 + authorPct * 0.15) * 100);
}

// ── category detection ──────────────────────────────────────────────
const WORD_MAP: Record<string, string> = {
  cat:'animal',dog:'animal',hamster:'animal',mouse:'animal',frog:'animal',
  duck:'animal',cow:'animal',pig:'animal',bear:'animal',wolf:'animal',
  fox:'animal',penguin:'animal',whale:'animal',shark:'animal',dragon:'animal',
  unicorn:'animal',llama:'animal',gorilla:'animal',monkey:'animal',lion:'animal',
  tiger:'animal',panda:'animal',gecko:'animal',
  ai:'tech',robot:'tech',quantum:'tech',cyber:'tech',blockchain:'tech',
  neural:'tech',gpu:'tech',laser:'tech',neon:'tech',drone:'tech',chip:'tech',
  ninja:'action',warrior:'action',pirate:'action',viking:'action',knight:'action',
  space:'space',moon:'space',mars:'space',rocket:'space',star:'space',
  galaxy:'space',cosmic:'space',alien:'space',ufo:'space',
  banana:'food',pizza:'food',taco:'food',sushi:'food',donut:'food',
  pixel:'retro',retro:'retro',arcade:'retro',
  dark:'dark',shadow:'dark',void:'dark',
  anime:'anime',manga:'anime',
  celebrity:'celebrity',famous:'celebrity',
  meme:'meme',viral:'meme',trending:'meme',
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

// ── reason / evidence ───────────────────────────────────────────────
function generateReason(cluster: NarrativeCluster, now: number): string {
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

function generateEvidence(cluster: NarrativeCluster): string[] {
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

function capitalize(s: string): string {
  return s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ── main analysis ───────────────────────────────────────────────────
export function analyzeNarratives(posts: RawPost[]): MemeNarrative[] {
  const now = Date.now();
  const clusters = clusterPosts(posts);
  const narratives: MemeNarrative[] = [];

  for (const cluster of clusters) {
    if (cluster.totalMentions < 2) continue;
    if (cluster.sources.size < 1) continue;

    const trendScore = computeTrendScore(cluster, now);
    if (trendScore < 3) continue;

    const growthPct = computeGrowthPct(cluster, now);
    const confidencePct = computeConfidence(cluster, now);
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
    });
  }

  return narratives.sort((a, b) => b.trendScore - a.trendScore);
}
