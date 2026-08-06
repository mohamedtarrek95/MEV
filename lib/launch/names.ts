import type { EnrichedCoin, NarrativeCluster } from './types.js';

// ══════════════════════════════════════════════════════════════════════
// NARRATIVE SIMILARITY ENGINE
//
// Groups coins by the SAME MEME IDEA, not exact name matching.
// Detects when many developers independently create coins based
// on the same meme, even if every coin has a different name.
// ══════════════════════════════════════════════════════════════════════

// ── STEP 1: Normalization ──

const FILLER_WORDS = new Set([
  'coin', 'token', 'ai', 'inu', 'official', 'the', 'new', 'real', 'original',
  'v2', 'v3', '2.0', '3.0', '4.0',
  'sol', 'on', 'solana', 'pump', 'pumpfun', 'raydium',
  'moon', 'moonshot', 'safe', 'baby', 'mini', 'micro', 'nano', 'mega', 'super', 'ultra',
  'max', 'pro', 'plus', 'lite', 'x', 'xx', 'xxx',
  'king', 'queen', 'lord', 'god', 'dao',
  'community', 'people', 'peoples',
  'defi', 'nft', 'web3', 'meme',
]);

const SUFFIX_PATTERNS = [
  /^(.+?)(verse|world|land|city|town|zone|verse|verse|planet|hub|base|dao|fi|swap|dex)$/i,
  /^(.+?)(max|pro|plus|lite|mini|micro|nano|mega|super|ultra|prime|alpha|beta)$/i,
  /^(.+?)(ai|bot|gpt|llm|agent)$/i,
  /^(.+?)(inu|shib)$/i,
  /^(.+?)(x|xx|xxx)$/i,
  /^(.+?)(2|3|4|5)$/i,
];

const PREFIX_PATTERNS = [
  /^(baby|mini|micro|nano|mega|super|ultra|tiny|smol|big|chad|alpha|omega|sigma|beta)(.+)$/i,
  /^(the|real|original|official|new|true|classic|old)(.+)$/i,
];

function tokenize(name: string): string[] {
  // Split on non-alphanumeric, camelCase, and underscores
  const split = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-\.]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  return split;
}

function removeFillers(tokens: string[]): string[] {
  return tokens.filter((t) => !FILLER_WORDS.has(t) && t.length > 1);
}

function extractRootKeyword(name: string): string {
  let tokens = tokenize(name);
  tokens = removeFillers(tokens);

  let clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Priority 1: Strip prefix fillers then check suffix patterns
  // "babydogemax" → strip "baby" → "dogemax" → strip suffix "max" → "doge"
  for (const prefix of PREFIX_PATTERNS) {
    const prefixMatch = clean.match(prefix);
    if (prefixMatch && prefixMatch[2]) {
      const stripped = prefixMatch[2];
      for (const suffix of SUFFIX_PATTERNS) {
        const suffixMatch = stripped.match(suffix);
        if (suffixMatch && suffixMatch[1].length >= 3) {
          return suffixMatch[1].toUpperCase();
        }
      }
      if (stripped.length >= 3) return stripped.toUpperCase();
    }
  }

  // Priority 2: Check suffix patterns on full cleaned string
  for (const pattern of SUFFIX_PATTERNS) {
    const match = clean.match(pattern);
    if (match && match[1].length >= 3) {
      return match[1].toUpperCase();
    }
  }

  // Priority 3: Check prefix patterns on full cleaned string
  for (const pattern of PREFIX_PATTERNS) {
    const match = clean.match(pattern);
    if (match && match[2] && match[2].length >= 3) {
      return match[2].toUpperCase();
    }
  }

  // Priority 4: Longest non-filler token
  if (tokens.length > 0) {
    tokens.sort((a, b) => b.length - a.length);
    return tokens[0].toUpperCase();
  }

  return clean.toUpperCase().slice(0, 12);
}

// ── STEP 2: String Similarity Metrics ──

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;

  const matchWindow = Math.floor(Math.max(m, n) / 2) - 1;
  const aMatches = new Array(m).fill(false);
  const bMatches = new Array(n).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < m; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, n);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < m; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / m + matches / n + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, m, n); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function ngramSimilarity(a: string, b: string, n = 2): number {
  if (a.length < n || b.length < n) return a === b ? 1 : 0;
  const getNgrams = (s: string): Set<string> => {
    const grams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) {
      grams.add(s.slice(i, i + n));
    }
    return grams;
  };
  const aGrams = getNgrams(a);
  const bGrams = getNgrams(b);
  let intersection = 0;
  for (const g of aGrams) {
    if (bGrams.has(g)) intersection++;
  }
  const union = aGrams.size + bGrams.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function prefixSimilarity(a: string, b: string): number {
  const minLen = Math.min(a.length, b.length);
  if (minLen === 0) return 0;
  let i = 0;
  while (i < minLen && a[i] === b[i]) i++;
  return i / Math.max(a.length, b.length);
}

function substringSimilarity(a: string, b: string): number {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  // Check longest common substring
  let maxLen = 0;
  for (let i = 0; i < shorter.length; i++) {
    for (let j = i + 1; j <= shorter.length; j++) {
      const sub = shorter.slice(i, j);
      if (longer.includes(sub) && sub.length > maxLen) maxLen = sub.length;
    }
  }
  return maxLen / longer.length;
}

// ── STEP 3: Combined Similarity Score ──

function computeSimilarity(a: string, b: string): number {
  const aNorm = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bNorm = b.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (aNorm === bNorm) return 1;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
    return 0.85 + Math.min(aNorm.length, bNorm.length) / Math.max(aNorm.length, bNorm.length) * 0.15;
  }

  const lev = levenshteinSimilarity(aNorm, bNorm);
  const jw = jaroWinkler(aNorm, bNorm);
  const ngram = ngramSimilarity(aNorm, bNorm);
  const prefix = prefixSimilarity(aNorm, bNorm);
  const substring = substringSimilarity(aNorm, bNorm);

  // Weighted combination
  const score = lev * 0.20 + jw * 0.25 + ngram * 0.25 + prefix * 0.15 + substring * 0.15;
  return score;
}

// ── STEP 4: Narrative Clustering ──

const SIMILARITY_THRESHOLD = 0.65;

export function detectNarrativeClusters(coins: EnrichedCoin[]): Map<string, NarrativeCluster> {
  // Step A: Extract root keywords and group by root
  const rootGroups = new Map<string, EnrichedCoin[]>();

  for (const coin of coins) {
    const root = extractRootKeyword(coin.name);
    if (!root || root.length < 2) continue;
    const existing = rootGroups.get(root) || [];
    existing.push(coin);
    rootGroups.set(root, existing);
  }

  // Step B: For small roots, check if they should be merged with similar roots
  const roots = [...rootGroups.keys()];
  const merged = new Map<string, string>(); // root -> canonical root

  for (let i = 0; i < roots.length; i++) {
    const rA = roots[i];
    if (merged.has(rA)) continue;
    const canonical = rA;
    merged.set(rA, canonical);

    for (let j = i + 1; j < roots.length; j++) {
      const rB = roots[j];
      if (merged.has(rB)) continue;

      const sim = computeSimilarity(rA, rB);
      if (sim >= SIMILARITY_THRESHOLD) {
        merged.set(rB, canonical);
      }
    }
  }

  // Step C: Build narrative clusters
  const narrativeGroups = new Map<string, EnrichedCoin[]>();
  for (const [root, coinsInGroup] of rootGroups) {
    const canonical = merged.get(root) || root;
    const existing = narrativeGroups.get(canonical) || [];
    existing.push(...coinsInGroup);
    narrativeGroups.set(canonical, existing);
  }

  // Step D: Create NarrativeCluster objects
  const clusters = new Map<string, NarrativeCluster>();
  const now = Date.now();

  for (const [root, groupCoins] of narrativeGroups) {
    if (groupCoins.length < 1) continue;

    const sorted = [...groupCoins].sort((a, b) => a.launchTime - b.launchTime);
    const creators = [...new Set(groupCoins.map((c) => c.creator))];
    const names = [...new Set(groupCoins.map((c) => c.name))];
    const firstLaunch = sorted[0].launchTime;
    const lastLaunch = sorted[sorted.length - 1].launchTime;
    const spanMinutes = Math.max(0.5, (lastLaunch - firstLaunch) / 60000);
    const launchVelocity = groupCoins.length / spanMinutes;

    const avgMarketCap = groupCoins.reduce((s, c) => s + c.marketCap, 0) / groupCoins.length;
    const avgVolume = groupCoins.reduce((s, c) => s + c.volume1h, 0) / groupCoins.length;
    const avgBuyers = groupCoins.reduce((s, c) => s + c.uniqueBuyers, 0) / groupCoins.length;
    const avgLifetime = groupCoins.reduce((s, c) => s + c.ageSeconds, 0) / groupCoins.length;

    const repeatedLaunchScore = Math.min(100, groupCoins.length * 10);
    const creatorDiversity = Math.min(100, (creators.length / Math.max(1, groupCoins.length)) * 100);

    clusters.set(root, {
      narrative: root,
      rootKeyword: root,
      variants: names,
      count: groupCoins.length,
      firstLaunch,
      lastLaunch,
      uniqueCreators: creators,
      coins: groupCoins,
      avgMarketCap,
      avgVolume,
      avgBuyers,
      launchVelocity,
      avgLifetimeSeconds: avgLifetime,
      repeatedLaunchScore,
      creatorDiversity,
    });
  }

  return clusters;
}

export function findNarrativeCluster(name: string, clusters: Map<string, NarrativeCluster>): NarrativeCluster | null {
  const root = extractRootKeyword(name);
  if (clusters.has(root)) return clusters.get(root)!;

  // Fuzzy search: find best matching root
  let bestSim = 0;
  let bestCluster: NarrativeCluster | null = null;
  for (const [key, cluster] of clusters) {
    const sim = computeSimilarity(root, key);
    if (sim > bestSim && sim >= SIMILARITY_THRESHOLD) {
      bestSim = sim;
      bestCluster = cluster;
    }
  }
  return bestCluster;
}

export function extractRootKeywordFor(name: string): string {
  return extractRootKeyword(name);
}
