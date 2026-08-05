import type { ITrendProvider, RawPost } from '../types.js';

export class CoinGeckoProvider implements ITrendProvider {
  readonly name = 'CoinGecko';
  readonly sourceId = 'coingecko';
  readonly category = 'market' as const;

  async fetch(): Promise<RawPost[]> {
    const posts: RawPost[] = [];
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/search/trending');
      if (!res.ok) return [];
      const data = await res.json() as {
        coins?: Array<{
          item: {
            id: string;
            name: string;
            symbol: string;
            market_cap_rank?: number;
            score?: number;
            data?: { price_change_percentage_24h?: { usd?: number } };
          };
        }>;
      };
      for (const c of (data.coins ?? []).slice(0, 20)) {
        const item = c.item;
        posts.push({
          id: `cg-${item.id}`,
          source: 'coingecko',
          author: 'coingecko',
          title: item.name,
          body: item.name,
          url: `https://www.coingecko.com/en/coins/${item.id}`,
          timestamp: Date.now(),
          likes: item.score ?? 0,
          shares: 0,
          comments: 0,
          providerCategory: 'market',
        });
      }
    } catch { /* return empty */ }
    return posts;
  }
}
