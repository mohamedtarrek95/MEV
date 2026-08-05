import type { ITrendProvider, RawPost } from '../types.js';

const SUBREDDITS = [
  'wallstreetbets', 'cryptocurrency', 'solana', 'memes', 'defi',
  'CryptoMoonShots', 'SatoshiStreetBets', 'meme', 'CryptoMemes',
];

async function fetchSubreddit(sub: string, after?: string): Promise<{ posts: RawPost[]; after: string | null }> {
  const url = `https://www.reddit.com/r/${sub}/hot.json?limit=25${after ? `&after=${after}` : ''}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'MemeIntel/1.0 (meme-narrative-discovery)' },
  });
  if (!res.ok) throw new Error(`Reddit ${sub}: ${res.status}`);
  const data = await res.json() as {
    data?: { children: Array<{ data: { id: string; author: string; title: string; selftext: string; url: string; created_utc: number; score: number; num_comments: number; permalink: string } }>; after: string | null };
  };
  const children = data.data?.children ?? [];
  const posts: RawPost[] = children
    .filter((c) => c.data.score > 5)
    .map((c) => {
      const d = c.data;
      return {
        id: `reddit-${d.id}`,
        source: 'reddit',
        author: d.author,
        title: d.title,
        body: d.selftext || d.title,
        url: `https://reddit.com${d.permalink}`,
        timestamp: Math.floor(d.created_utc * 1000),
        likes: d.score,
        shares: 0,
        comments: d.num_comments,
        providerCategory: 'social',
      };
    });
  return { posts, after: data.data?.after ?? null };
}

export class RedditProvider implements ITrendProvider {
  readonly name = 'Reddit';
  readonly sourceId = 'reddit';
  readonly category = 'social' as const;

  async fetch(): Promise<RawPost[]> {
    const all: RawPost[] = [];
    const concurrency = 3;
    const batches: string[][] = [];
    for (let i = 0; i < SUBREDDITS.length; i += concurrency) {
      batches.push(SUBREDDITS.slice(i, i + concurrency));
    }
    for (const batch of batches) {
      const results = await Promise.allSettled(batch.map((sub) => fetchSubreddit(sub)));
      for (const r of results) {
        if (r.status === 'fulfilled') all.push(...r.value.posts);
      }
    }
    return all;
  }
}
