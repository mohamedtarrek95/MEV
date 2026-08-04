import type { ITrendProvider, RawPost } from '../types.js';

interface HNItem {
  id: number;
  title?: string;
  by?: string;
  time?: number;
  score?: number;
  descendants?: number;
  url?: string;
  type?: string;
}

async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    if (!res.ok) return null;
    return (await res.json()) as HNItem;
  } catch {
    return null;
  }
}

export class HackerNewsProvider implements ITrendProvider {
  readonly name = 'Hacker News';
  readonly sourceId = 'hackerNews';

  async fetch(): Promise<RawPost[]> {
    const posts: RawPost[] = [];
    try {
      const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      if (!topRes.ok) return [];
      const ids = (await topRes.json()) as number[];
      const batch = ids.slice(0, 40);
      const items = await Promise.allSettled(batch.map(fetchItem));
      for (const r of items) {
        if (r.status !== 'fulfilled' || !r.value || !r.value.title) continue;
        const i = r.value;
        const title = i.title!;
        posts.push({
          id: `hn-${i.id}`,
          source: 'hackerNews',
          author: i.by ?? 'unknown',
          title,
          body: title,
          url: i.url ?? `https://news.ycombinator.com/item?id=${i.id}`,
          timestamp: (i.time ?? 0) * 1000,
          likes: i.score ?? 0,
          shares: 0,
          comments: i.descendants ?? 0,
        });
      }
    } catch { /* return empty */ }
    return posts;
  }
}
