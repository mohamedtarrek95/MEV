import { loadTweets, saveReport, saveTweets } from './cache.js';
import { analyzeTrends } from './engine.js';
import { fetchFinalStretchTokens, matchTrendsToTokens } from './match.js';
import { MockFeedProvider } from './mockFeed.js';
import { PlaywrightXProvider } from './playwrightX.js';
import { REFRESH_INTERVAL_MS, TWENTY_FOUR_HOURS_MS } from './feed.js';
import type { TrendSuggestion, TrendsReport, Tweet } from './types.js';

type Provider = { readonly name: string; fetchTweets(since?: number): Promise<Tweet[]> };

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

function pickProvider(): Provider {
  if (process.env.TRENDS_PROVIDER === 'playwright') {
    return new PlaywrightXProvider();
  }
  return new MockFeedProvider();
}

export async function runScan(): Promise<TrendsReport> {
  const provider = pickProvider();
  const existing = await loadTweets();
  const since = existing.length > 0 ? Math.min(...existing.map((t: Tweet) => t.createdAt)) : undefined;

  let fresh: Tweet[] = [];
  let feedSource = provider.name;
  try {
    fresh = await provider.fetchTweets(since);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const fallback = new MockFeedProvider();
    fresh = await fallback.fetchTweets(since);
    feedSource = `mock (${provider.name} failed: ${msg})`;
  }

  const merged = mergeAndDedupe(existing, fresh);
  await saveTweets(merged);

  const { topics, tweetsProcessed } = analyzeTrends(merged);
  let suggestions: TrendSuggestion[] = [];
  let tokensCount = 0;
  try {
    const tokens = await fetchFinalStretchTokens();
    tokensCount = tokens.length;
    suggestions = matchTrendsToTokens(topics, tokens);
  } catch (err) {
    suggestions = [];
  }

  const report: TrendsReport = {
    generatedAt: Date.now(),
    topics,
    tweetsProcessed,
    windowHours: 24,
    suggestions,
    feedSource,
  };
  await saveReport(report);

  console.log(
    `[trends] scan complete source=${feedSource} tweets=${tweetsProcessed} tokens=${tokensCount} topics=${topics.length} suggestions=${suggestions.length}`,
  );
  return report;
}

export async function startWorker(): Promise<void> {
  const intervalMs = Number(process.env.TRENDS_REFRESH_MS || REFRESH_INTERVAL_MS);
  await runScan();
  setInterval(() => {
    void runScan().catch((err) => {
      console.error('[trends] worker scan failed:', err);
    });
  }, intervalMs);
  console.log(`[trends] worker running, refresh every ${Math.round(intervalMs / 60000)} min`);
}

// Run directly: `node api/trends/worker.ts`
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker().catch((err) => {
    console.error('[trends] worker failed to start:', err);
    process.exit(1);
  });
}
