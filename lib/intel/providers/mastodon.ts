import type { ITrendProvider, RawPost } from '../types.js';

const INSTANCES = [
  'mastodon.social',
  'infosec.exchange',
  'fosstodon.org',
  'techhub.social',
];

const QUERIES = ['meme', 'brainrot', 'shitpost', 'viral', 'pepe', 'crypto meme', 'solana', 'pump.fun', 'italian brainrot'];

export class MastodonProvider implements ITrendProvider {
  readonly name = 'Mastodon';
  readonly sourceId = 'mastodon';
  readonly category = 'social' as const;

  async fetch(): Promise<RawPost[]> {
    const all: RawPost[] = [];
    for (const instance of INSTANCES) {
      for (const q of QUERIES) {
        try {
          const url = `https://${instance}/api/v2/search?q=${encodeURIComponent(q)}&type=statuses&limit=10`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'MemeLaunchEngine/1.0' },
          });
          if (!res.ok) continue;
          const data = await res.json() as {
            statuses: Array<{
              id: string;
              content: string;
              created_at: string;
              account: { acct: string; display_name?: string };
              favourites_count: number;
              reblogs_count: number;
              replies_count: number;
            }>;
          };
          for (const s of data.statuses ?? []) {
            const body = s.content.replace(/<[^>]*>/g, '').trim();
            if (body.length < 20) continue;
            all.push({
              id: `mastodon-${instance}-${s.id}`,
              source: 'mastodon',
              author: s.account.acct.split('@')[0],
              title: body.slice(0, 100),
              body,
              url: `https://${instance}/notice/${s.id}`,
              timestamp: new Date(s.created_at).getTime(),
              likes: s.favourites_count,
              shares: s.reblogs_count,
              comments: s.replies_count,
              providerCategory: 'social',
            });
          }
        } catch { /* skip failed instance/query */ }
      }
    }
    return all;
  }
}
