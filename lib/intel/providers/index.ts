import type { ITrendProvider, RawPost } from '../types.js';
import { RedditProvider } from './reddit.js';
import { BlueskyProvider } from './bluesky.js';
import { MastodonProvider } from './mastodon.js';
import { LemmyProvider } from './lemmy.js';

// Crypto sources have higher weight than general meme sources.
// Both are needed: crypto tells us what traders care about,
// meme tells us what culture is doing.
export function createAllProviders(): ITrendProvider[] {
  return [
    new RedditProvider(),
    new BlueskyProvider(),
    new MastodonProvider(),
    new LemmyProvider(),
  ];
}
