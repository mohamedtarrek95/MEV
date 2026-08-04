import type { ITrendProvider, RawPost } from '../types.js';

export class CoinGeckoProvider implements ITrendProvider {
  readonly name = 'CoinGecko';
  readonly sourceId = 'coingecko';

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
        const change = item.data?.price_change_percentage_24h?.usd ?? 0;
        posts.push({
          id: `cg-${item.id}`,
          source: 'coingecko',
          author: 'coingecko',
          title: `${item.name} (${item.symbol.toUpperCase()}) trending on CoinGecko`,
          body: `${item.name} is trending. Rank #${item.market_cap_rank ?? '?'}. 24h change: ${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
          url: `https://www.coingecko.com/en/coins/${item.id}`,
          timestamp: Date.now(),
          likes: item.score ?? 0,
          shares: 0,
          comments: 0,
        });
      }
    } catch { /* return empty */ }
    return posts;
  }
}
