import type { ITrendProvider, RawPost } from '../types.js';

const QUERIES = ['meme', 'crypto', 'solana', 'viral', 'trending', 'nft', 'defi'];

export class BlueskyProvider implements ITrendProvider {
  readonly name = 'Bluesky';
  readonly sourceId = 'bluesky';
  readonly category = 'social' as const;

  async fetch(): Promise<RawPost[]> {
    const all: RawPost[] = [];
    for (const q of QUERIES) {
      try {
        const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&limit=25&sort=latest`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json() as {
          posts: Array<{
            uri: string;
            record: { text: string; createdAt: string; $type: string };
            author: { handle: string; displayName?: string };
            likeCount?: number;
            repostCount?: number;
            replyCount?: number;
          }>;
        };
        for (const p of data.posts ?? []) {
          if (p.record.$type !== 'app.bsky.feed.post') continue;
          all.push({
            id: `bsky-${p.uri.split('/').pop()}`,
            source: 'bluesky',
            author: p.author.handle,
            title: p.record.text.slice(0, 100),
            body: p.record.text,
            url: `https://bsky.app/profile/${p.author.handle}/post/${p.uri.split('/').pop()}`,
            timestamp: new Date(p.record.createdAt).getTime(),
            likes: p.likeCount ?? 0,
            shares: p.repostCount ?? 0,
            comments: p.replyCount ?? 0,
            providerCategory: 'social',
          });
        }
      } catch { /* skip failed query */ }
    }
    return all;
  }
}
