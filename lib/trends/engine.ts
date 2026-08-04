import type { Tweet, TrendTopic } from './types.js';

/** ---- normalization (source-agnostic) ---- */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'the', 'this', 'that', 'these', 'those', 'to', 'us', 'was', 'we', 'were', 'you',
  'your', 'get', 'got', 'go', 'going', 'just', 'like', 'see', 'say', 'said', 'one',
  'new', 'now', 'today', 'will', 'still', 'via', 'dont', 'didnt', 'im', 'com',
  'http', 'https', 'www', 'rt', 'amp', 'x', 'twitter',
]);

export function normalizeForTrends(text: string): string {
  return text
    .replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .toLowerCase()
    .trim();
}

/** ---- fuzzy ---- */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}

export function mergeFuzzyToken<T>(token: string, keys: Map<string, T>): string {
  let best = token;
  let bestDist = Infinity;
  for (const [key] of keys) {
    if (token === key) return key;
    const len = Math.max(token.length, key.length);
    const thr = len <= 3 ? 0 : len <= 5 ? 1 : len <= 8 ? 2 : Math.floor(len * 0.25);
    const dist = levenshtein(token, key);
    if (dist <= thr && dist < bestDist) {
      bestDist = dist;
      best = key;
    }
  }
  return best;
}

/** ---- trend analysis ---- */
export function analyzeTrends(tweets: Tweet[], now = Date.now()): { topics: TrendTopic[]; tweetsProcessed: number } {
  const windowMs = 24 * 3600 * 1000;
  const filtered = tweets.filter(
    (t) => !t.isAd && !t.isPinned && !t.isDupe && now - t.createdAt <= windowMs,
  );

  const acc = new Map<string, {
    display: string;
    tokens: Set<string>;
    mentionCount: number;
    accounts: Set<string>;
    engagement: number;
    firstDetectedAt: number;
    hits: number[];
  }>();

  const touch = (key: string, display: string, token: string, tweet: Tweet) => {
    let a = acc.get(key);
    if (!a) {
      a = {
        display,
        tokens: new Set(),
        mentionCount: 0,
        accounts: new Set(),
        engagement: 0,
        firstDetectedAt: tweet.createdAt,
        hits: [],
      };
      acc.set(key, a);
    }
    a.tokens.add(token);
    a.mentionCount += 1;
    a.accounts.add(tweet.authorId);
    a.engagement += tweet.metrics.likes + tweet.metrics.reposts + tweet.metrics.replies + tweet.metrics.views;
    a.firstDetectedAt = Math.min(a.firstDetectedAt, tweet.createdAt);
    a.hits.push(tweet.createdAt);
  };

  for (const tweet of filtered) {
    const tokens = normalizeForTrends(tweet.text).split(/\s+/).filter((t) => t.length >= 2 && !STOPWORDS.has(t));
    const tickers = [...tweet.text.matchAll(/\$([a-zA-Z0-9]{2,10})\b/g)].map((m) => m[1].toLowerCase());
    for (const token of tokens) {
      const key = mergeFuzzyToken(token, acc);
      touch(key, token, token, tweet);
    }
    for (const t of tickers) {
      if (tokens.includes(t)) continue;
      touch(t, `$${t.toUpperCase()}`, t, tweet);
    }
  }

  const threeHoursMs = 3 * 3600 * 1000;
  const thirtyMinMs = 30 * 60 * 1000;
  const topics: TrendTopic[] = [];

  for (const [key, a] of acc) {
    if (key.length < 2 || a.mentionCount < 3 || a.accounts.size < 2) continue;
    const recent3h = a.hits.filter((h) => now - h <= threeHoursMs).length;
    const older3h = a.mentionCount - recent3h;
    const recent30m = a.hits.filter((h) => now - h <= thirtyMinMs).length;
    const growth3h = older3h === 0 ? recent3h : recent3h / Math.max(older3h, 1);
    const growth30m = (Math.max(recent30m, 1) / Math.max(a.mentionCount, 1)) * 100;
    const logEng = Math.log10(a.engagement + 1);
    const logMen = Math.log10(a.mentionCount + 1);
    const trendScore = Math.round(
      (Math.min(logMen / 2, 1) * 35 +
        Math.min(growth3h / 2, 1) * 30 +
        Math.min(a.accounts.size / 15, 1) * 15 +
        Math.min(logEng / 6, 1) * 15 +
        Math.min(growth30m / 25, 1) * 5) *
        10,
    ) / 10;
    topics.push({
      canonical: key,
      display: a.display,
      tokens: [...a.tokens],
      mentionCount: a.mentionCount,
      uniqueAccounts: a.accounts.size,
      totalEngagement: a.engagement,
      firstDetectedAt: a.firstDetectedAt,
      growth30m: Math.round(growth30m * 10) / 10,
      growth3h: Math.round(growth3h * 10) / 10,
      trendScore,
    });
  }

  topics.sort((x, y) => y.trendScore - x.trendScore);
  return { topics, tweetsProcessed: filtered.length };
}