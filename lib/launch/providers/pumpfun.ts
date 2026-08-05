import type { RawLaunch } from '../types.js';

export async function fetchPumpfun(limit = 50): Promise<RawLaunch[]> {
  const url = `https://frontend-api-v3.pump.fun/coins?sort=created_timestamp&order=DESC&limit=${limit}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LaunchRadar/1.0' },
  });
  if (!res.ok) throw new Error(`Pump.fun ${res.status}`);
  const data = await res.json() as Array<{
    mint: string;
    name: string;
    symbol: string;
    description: string;
    image_uri: string;
    creator: string;
    created_timestamp: number;
    market_cap: number;
    usd_market_cap: number;
    virtual_sol_reserves: number;
    real_sol_reserves: number;
    virtual_token_reserves: number;
    real_token_reserves: number;
    complete: boolean;
    website?: string;
    twitter?: string;
    telegram?: string;
    pool_address?: string;
  }>;
  return data.map((d) => ({
    mint: d.mint,
    name: d.name,
    symbol: d.symbol,
    image: d.image_uri || '',
    description: d.description || '',
    creator: d.creator,
    createdAt: d.created_timestamp,
    marketCap: d.market_cap || d.usd_market_cap || 0,
    solReserves: d.real_sol_reserves || 0,
    tokenReserves: d.real_token_reserves || 0,
    complete: d.complete || false,
    website: d.website || '',
    twitter: d.twitter || '',
    telegram: d.telegram || '',
    poolAddress: d.pool_address || '',
    usdMarketCap: d.usd_market_cap || 0,
  }));
}
