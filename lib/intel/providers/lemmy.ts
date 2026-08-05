import type { ITrendProvider, RawPost } from '../types.js';

const LEMMY_INSTANCES = [
  'lemmy.world',
  'lemmy.ml',
  'lemm.ee',
];

const QUERIES = ['meme', 'brainrot', 'shitpost', 'viral', 'pepe', 'crypto meme', 'solana', 'italian brainrot'];

export class LemmyProvider implements ITrendProvider {
  readonly name = 'Lemmy';
  readonly sourceId = 'lemmy';
  readonly category = 'social' as const;
  readonly timeoutMs = 30_000;

  async fetch(): Promise<RawPost[]> {
    const all: RawPost[] = [];
    for (const instance of LEMMY_INSTANCES) {
      for (const q of QUERIES) {
        try {
          const url = `https://${instance}/api/v3/search?q=${encodeURIComponent(q)}&type_=Posts&sort=New&limit=10`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'MemeLaunchEngine/1.0' },
          });
          if (!res.ok) continue;
          const data = await res.json() as {
            posts: Array<{
              post: {
                id: number;
                name: string;
                url?: string;
                body?: string;
                published: string;
                score: number;
                number_of_comments: number;
              };
              creator: { name: string };
              community: { name: string };
            }>;
          };
          for (const p of data.posts ?? []) {
            const body = (p.post.body ?? p.post.name).trim();
            if (body.length < 10) continue;
            all.push({
              id: `lemmy-${instance}-${p.post.id}`,
              source: 'lemmy',
              author: p.creator.name,
              title: p.post.name.slice(0, 100),
              body,
              url: p.post.url ?? `https://${instance}/post/${p.post.id}`,
              timestamp: new Date(p.post.published).getTime(),
              likes: p.post.score,
              shares: 0,
              comments: p.post.number_of_comments,
              providerCategory: 'social',
            });
          }
        } catch { /* skip failed instance/query */ }
      }
    }
    return all;
  }
}
