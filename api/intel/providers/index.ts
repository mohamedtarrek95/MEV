import type { ITrendProvider } from '../types.js';
import { RedditProvider } from './reddit.js';
import { BlueskyProvider } from './bluesky.js';
import { HackerNewsProvider } from './hackernews.js';
import { DexScreenerProvider } from './dexscreener.js';
import { CoinGeckoProvider } from './coingecko.js';
import { GitHubProvider } from './github.js';

export function createAllProviders(): ITrendProvider[] {
  return [
    new RedditProvider(),
    new BlueskyProvider(),
    new HackerNewsProvider(),
    new DexScreenerProvider(),
    new CoinGeckoProvider(),
    new GitHubProvider(),
  ];
}
