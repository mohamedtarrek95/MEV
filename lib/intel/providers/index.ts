import type { ITrendProvider } from '../types.js';
import { RedditProvider } from './reddit.js';
import { BlueskyProvider } from './bluesky.js';
import { MastodonProvider } from './mastodon.js';
import { LemmyProvider } from './lemmy.js';

// Only meme-generating platforms are included.
// HackerNews and GitHub are NOT meme sources — they produce developer content.
// Market providers are removed — this engine discovers pre-token narratives.
export function createAllProviders(): ITrendProvider[] {
  return [
    new RedditProvider(),
    new BlueskyProvider(),
    new MastodonProvider(),
    new LemmyProvider(),
  ];
}
