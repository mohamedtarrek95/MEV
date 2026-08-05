import type { RawLaunch } from '../types.js';

interface DexPair {
  chainId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: { h24: number; h6: number; h1: number; m5: number };
  priceChange: { m5?: number; h1?: number; h6?: number; h24?: number };
  liquidity: { usd: number };
  fdv: number;
  pairCreatedAt: number;
  info: {
    imageUrl?: string;
    websites?: Array<{ url: string }>;
    socials?: Array<{ url: string; type: string }>;
  };
}

export interface DexEnrichment {
  pairAddress: string;
  priceUsd: number;
  volume24h: number;
  volume1h: number;
  volume5m: number;
  buys24h: number;
  sells24h: number;
  buys1h: number;
  sells1h: number;
  buys5m: number;
  sells5m: number;
  liquidity: number;
  priceChange1h: number;
  priceChange5m: number;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
}

export async function fetchDexScreenerBatch(mints: string[]): Promise<Map<string, DexEnrichment>> {
  const result = new Map<string, DexEnrichment>();
  if (mints.length === 0) return result;

  const batches: string[][] = [];
  for (let i = 0; i < mints.length; i += 30) {
    batches.push(mints.slice(i, i + 30));
  }

  for (const batch of batches) {
    try {
      const url = `https://api.dexscreener.com/tokens/v1/solana/${batch.join(',')}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'LaunchRadar/1.0' } });
      if (!res.ok) continue;
      const body = await res.json() as unknown;
      const pairs: DexPair[] = Array.isArray(body) ? body : Array.isArray((body as Record<string, unknown>).pairs) ? (body as Record<string, DexPair[]>).pairs : [];
      if (pairs.length === 0) continue;

      const byMint = new Map<string, DexPair[]>();
      for (const pair of pairs) {
        const mint = pair.baseToken?.address;
        if (!mint) continue;
        const existing = byMint.get(mint) || [];
        existing.push(pair);
        byMint.set(mint, existing);
      }

      for (const [mint, pairs] of byMint) {
        const pair = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        const socials = pair.info?.socials || [];
        result.set(mint, {
          pairAddress: pair.pairAddress,
          priceUsd: parseFloat(pair.priceUsd) || 0,
          volume24h: pair.volume?.h24 || 0,
          volume1h: pair.volume?.h1 || 0,
          volume5m: pair.volume?.m5 || 0,
          buys24h: pair.txns?.h24?.buys || 0,
          sells24h: pair.txns?.h24?.sells || 0,
          buys1h: pair.txns?.h1?.buys || 0,
          sells1h: pair.txns?.h1?.sells || 0,
          buys5m: pair.txns?.m5?.buys || 0,
          sells5m: pair.txns?.m5?.sells || 0,
          liquidity: pair.liquidity?.usd || 0,
          priceChange1h: pair.priceChange?.h1 || 0,
          priceChange5m: pair.priceChange?.m5 || 0,
          image: pair.info?.imageUrl || '',
          website: socials.find((s) => s.type === 'website')?.url || '',
          twitter: socials.find((s) => s.type === 'twitter')?.url || '',
          telegram: socials.find((s) => s.type === 'telegram')?.url || '',
        });
      }

      if (batches.length > 1) await new Promise((r) => setTimeout(r, 300));
    } catch { /* skip failed batch */ }
  }

  return result;
}
