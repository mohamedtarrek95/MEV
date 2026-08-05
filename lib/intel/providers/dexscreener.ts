import type { ITrendProvider, RawPost } from '../types.js';

export class DexScreenerProvider implements ITrendProvider {
  readonly name = 'DexScreener';
  readonly sourceId = 'dexscreener';

  async fetch(): Promise<RawPost[]> {
    const posts: RawPost[] = [];
    try {
      const res = await fetch('https://api.dexscreener.com/token-boosts/top/v1');
      if (!res.ok) return [];
      const data = await res.json() as Array<{
        url?: string;
        chainId?: string;
        tokenAddress?: string;
        icon?: string;
        description?: string;
      }>;
      for (const item of (data ?? []).slice(0, 30)) {
        if (!item.tokenAddress || !item.chainId) continue;
        const desc = (item.description ?? '').trim();
        if (!desc || desc === item.tokenAddress) continue;
        posts.push({
          id: `dex-${item.tokenAddress}`,
          source: 'dexscreener',
          author: 'dexscreener',
          title: desc.slice(0, 100),
          body: desc,
          url: item.url ?? `https://dexscreener.com/${item.chainId}/${item.tokenAddress}`,
          timestamp: Date.now(),
          likes: 10,
          shares: 0,
          comments: 0,
        });
      }
    } catch { /* return empty */ }
    return posts;
  }
}
