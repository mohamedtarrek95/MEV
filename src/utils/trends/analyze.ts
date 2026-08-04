import type { Tweet, TrendTopic, TrendsReport } from './types';
import { tokenize, detectTickers, detectHashtags } from './normalize';
import { mergeFuzzyToken } from './fuzzy';
import { TREND_WINDOW_HOURS } from './feedProvider';

interface TopicAccumulator {
  display: string;
  tokens: Set<string>;
  mentionCount: number;
  accounts: Set<string>;
  engagement: number;
  firstDetectedAt: number;
  /** timestamps of every mention (ms) */
  hits: number[];
}

const MIN_MENTIONS = 3;
const MIN_UNIQUE_ACCOUNTS = 2;
const MIN_TOPIC_LENGTH = 2;

/**
 * Pure, source-agnostic trend engine. It only ever sees `Tweet[]`; it does not
 * care where they came from (scraper, official X API, mock). This is the layer
 * that must remain untouched when the feed source is swapped.
 */
export function analyzeTrends(tweets: Tweet[], now = Date.now()): TrendsReport {
  const filtered = tweets.filter(
    (t) => !t.isAd && !t.isPinned && !t.isDupe && now - t.createdAt <= TREND_WINDOW_HOURS * 3600 * 1000,
  );

  const acc = new Map<string, TopicAccumulator>();

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
    a.engagement +=
      tweet.metrics.likes + tweet.metrics.reposts + tweet.metrics.replies + tweet.metrics.views;
    a.firstDetectedAt = Math.min(a.firstDetectedAt, tweet.createdAt);
    a.hits.push(tweet.createdAt);
  };

  for (const tweet of filtered) {
    const tokens = tokenize(tweet.text);
    const tickers = detectTickers(tweet.text);
    const hashtags = detectHashtags(tweet.text);

    for (const token of tokens) {
      const key = mergeFuzzyToken(token, acc);
      touch(key, token, token, tweet);
    }
    for (const t of tickers) {
      if (tokens.includes(t)) continue;
      touch(t, `$${t.toUpperCase()}`, t, tweet);
    }
    for (const h of hashtags) {
      if (tokens.includes(h)) continue;
      touch(h, `#${h}`, h, tweet);
    }
  }

  const threeHoursMs = 3 * 3600 * 1000;
  const thirtyMinMs = 30 * 60 * 1000;

  const topics: TrendTopic[] = [];
  for (const [key, a] of acc) {
    if (key.length < MIN_TOPIC_LENGTH) continue;
    if (a.mentionCount < MIN_MENTIONS) continue;
    if (a.accounts.size < MIN_UNIQUE_ACCOUNTS) continue;

    const recent3h = a.hits.filter((h) => now - h <= threeHoursMs).length;
    const older3h = a.mentionCount - recent3h;
    const recent30m = a.hits.filter((h) => now - h <= thirtyMinMs).length;

    const growth3h = older3h === 0 ? recent3h : recent3h / Math.max(older3h, 1);
    const growth30m = Math.max(recent30m, 1) / Math.max(a.mentionCount, 1) * 100;

    const logEngagement = Math.log10(a.engagement + 1);
    const logMentions = Math.log10(a.mentionCount + 1);

    const trendScore = Math.round(
      (Math.min(logMentions / 2, 1) * 35 +
        Math.min(growth3h / 2, 1) * 30 +
        Math.min(a.accounts.size / 15, 1) * 15 +
        Math.min(logEngagement / 6, 1) * 15 +
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

  return {
    generatedAt: now,
    topics,
    tweetsProcessed: filtered.length,
    windowHours: TREND_WINDOW_HOURS,
  };
}
