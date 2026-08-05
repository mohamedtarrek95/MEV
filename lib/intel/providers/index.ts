import type { ITrendProvider } from '../types.js';
import { RedditProvider } from './reddit.js';
import { BlueskyProvider } from './bluesky.js';
import { HackerNewsProvider } from './hackernews.js';
import { GitHubProvider } from './github.js';
import { MastodonProvider } from './mastodon.js';
import { LemmyProvider } from './lemmy.js';

// Market providers are REMOVED. This engine discovers pre-token narratives,
// not existing tokens. DexScreener and CoinGecko data is irrelevant.
export function createAllProviders(): ITrendProvider[] {
  return [
    new RedditProvider(),
    new BlueskyProvider(),
    new HackerNewsProvider(),
    new GitHubProvider(),
    new MastodonProvider(),
    new LemmyProvider(),
  ];
}
