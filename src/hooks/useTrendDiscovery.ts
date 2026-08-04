import { useCallback, useEffect, useRef, useState } from 'react';
import type { Tweet, TrendSuggestion, TrendTopic } from '../utils/trends/types';
import type { IFeedProvider } from '../utils/trends/feedProvider';
import { MockFeedProvider } from '../utils/trends/mockFeed';
import { analyzeTrends } from '../utils/trends/analyze';
import { matchTrendsToTokens, parseCreated } from '../utils/trends/match';
import { TWENTY_FOUR_HOURS_MS } from '../utils/trends/feedProvider';

const REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const TWEET_CACHE_KEY = 'trends-tweet-cache';
const TWEET_CACHE_TTL = 6 * 60 * 60 * 1000;
const TRENDS_API = '/api/report?action=trends';

interface BackendReport {
  generatedAt: number;
  topics: TrendTopic[];
  tweetsProcessed: number;
  suggestions: TrendSuggestion[];
  feedSource: string;
}

/** Try the backend worker's cached report first (returns null if unavailable). */
async function loadBackendReport(): Promise<BackendReport | null> {
  try {
    const resp = await fetch(TRENDS_API, { headers: { Accept: 'application/json' } });
    if (!resp.ok) return null;
    const body = (await resp.json()) as { ok?: boolean; report?: BackendReport };
    if (!body.ok || !body.report) return null;
    if (Date.now() - body.report.generatedAt > REFRESH_INTERVAL_MS) return null;
    return body.report;
  } catch {
    return null;
  }
}

interface StoredTweets {
  tweets: Tweet[];
  timestamp: number;
}

interface DiscoveryState {
  suggestions: TrendSuggestion[];
  topics: TrendTopic[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  tweetsProcessed: number;
  nextRefreshIn: number;
}

function loadCachedTweets(): Tweet[] {
  try {
    const raw = localStorage.getItem(TWEET_CACHE_KEY);
    if (!raw) return [];
    const parsed: StoredTweets = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > TWEET_CACHE_TTL) return [];
    return parsed.tweets;
  } catch {
    return [];
  }
}

function storeCachedTweets(tweets: Tweet[]): void {
  try {
    localStorage.setItem(TWEET_CACHE_KEY, JSON.stringify({ tweets, timestamp: Date.now() }));
  } catch {
    /* quota */
  }
}

function mergeAndDedupe(existing: Tweet[], fresh: Tweet[], now = Date.now()): Tweet[] {
  const byId = new Map<string, Tweet>();
  for (const t of existing) {
    if (now - t.createdAt <= TWENTY_FOUR_HOURS_MS) byId.set(t.id, t);
  }
  for (const t of fresh) {
    if (!t.isAd && !t.isPinned && !t.isDupe) byId.set(t.id, t);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

async function fetchFinalStretchTokens(): Promise<{ name: string; symbol: string; mint: string; imageUri: string; createdAt: string; progressPct: number }[]> {
  const resp = await fetch(
    'https://frontend-api-v3.pump.fun/coins/king-of-the-hill?limit=100&offset=0&includeNsfw=false',
  );
  if (!resp.ok) throw new Error(`Pump.fun king-of-the-hill HTTP ${resp.status}`);
  const data = (await resp.json()) as Record<string, unknown>[];
  const now = Date.now();
  return (Array.isArray(data) ? data : [])
    .filter((c) => (c.complete as boolean) === false)
    .filter((c) => {
      const created = parseCreated((c.created_timestamp as string | number) ?? '');
      return created !== null && now - created <= TWENTY_FOUR_HOURS_MS;
    })
    .map((c) => ({
      name: (c.name as string) ?? '',
      symbol: (c.symbol as string) ?? '',
      mint: (c.mint as string) ?? '',
      imageUri: (c.image_uri as string) ?? '',
      createdAt: (c.created_timestamp as string) ?? '',
      progressPct: Math.min(99, ((c.usd_market_cap as number) ?? 0) / 69000 * 100),
    }));
}

export function useTrendDiscovery(provider?: IFeedProvider) {
  const feedRef = useRef<IFeedProvider | null>(provider ?? null);
  if (!feedRef.current) {
    feedRef.current = new MockFeedProvider();
  }

  const [state, setState] = useState<DiscoveryState>({
    suggestions: [],
    topics: [],
    isLoading: false,
    error: null,
    lastUpdated: 0,
    tweetsProcessed: 0,
    nextRefreshIn: 0,
  });
  const tweetCacheRef = useRef<Tweet[]>(loadCachedTweets());
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
  }, []);

  const runScan = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const backend = await loadBackendReport();

      let suggestions: TrendSuggestion[] = [];
      let topics: TrendTopic[] = [];
      let tweetsProcessed = 0;

      if (backend) {
        suggestions = backend.suggestions;
        topics = backend.topics;
        tweetsProcessed = backend.tweetsProcessed;
      } else {
        const feed = feedRef.current!;
        const [freshTweets, tokens] = await Promise.all([
          feed.fetchTweets().catch(() => [] as Tweet[]),
          fetchFinalStretchTokens().catch(() => []),
        ]);

        const merged = mergeAndDedupe(tweetCacheRef.current, freshTweets);
        tweetCacheRef.current = merged;
        storeCachedTweets(merged);

        const report = analyzeTrends(merged);
        suggestions = matchTrendsToTokens(report.topics, tokens);
        topics = report.topics;
        tweetsProcessed = report.tweetsProcessed;
      }

      const now = Date.now();
      setState({
        suggestions,
        topics,
        isLoading: false,
        error: null,
        lastUpdated: now,
        tweetsProcessed,
        nextRefreshIn: Math.ceil(REFRESH_INTERVAL_MS / 1000),
      });

      clearTimers();
      countdownRef.current = setInterval(() => {
        setState((s) => {
          if (s.nextRefreshIn <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return { ...s, nextRefreshIn: 0 };
          }
          return { ...s, nextRefreshIn: s.nextRefreshIn - 1 };
        });
      }, 1000);
    } catch (e) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: (e as Error)?.message ?? String(e),
      }));
    }
  }, [clearTimers]);

  useEffect(() => {
    void runScan();
    const t = setInterval(() => void runScan(), REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(t);
      clearTimers();
    };
  }, [runScan, clearTimers]);

  const refresh = useCallback(() => {
    clearTimers();
    void runScan();
  }, [runScan, clearTimers]);

  return { ...state, refresh };
}