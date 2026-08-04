import type { Tweet } from './types';

/**
 * Source-agnostic contract for a Twitter/X feed.
 *
 * The trend-analysis engine depends only on this interface, so the data source
 * (Playwright scraper, official X API, mock) can be swapped without touching
 * the analysis or UI layers. Implementations must return ONLY public posts from
 * the last `windowHours` hours, already filtered for ads/pinned/dupes where
 * possible, and must dedupe by tweet id.
 */
export interface IFeedProvider {
  readonly name: string;
  /**
   * Fetch public posts, ideally only those newer than `since` (epoch ms),
   * returning them already deduped by id and sorted newest-first.
   */
  fetchTweets(since?: number): Promise<Tweet[]>;
}

export const TREND_WINDOW_HOURS = 24;

export const TWENTY_FOUR_HOURS_MS = TREND_WINDOW_HOURS * 60 * 60 * 1000;

export function isInsideWindow(createdAt: number, now = Date.now()): boolean {
  return now - createdAt <= TWENTY_FOUR_HOURS_MS;
}