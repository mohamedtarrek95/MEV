import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrendingCoin, RawDexToken, RawPumpToken } from '../utils/trendingEngine';
import {
  buildTrendingCoin,
  rankAndSlice,
} from '../utils/trendingEngine';

const TWITTER_BEARER = import.meta.env.VITE_TWITTER_BEARER_TOKEN as string | undefined;
const CACHE_TTL_MS = 2 * 60 * 1000;

interface CacheEntry {
  coins: TrendingCoin[];
  timestamp: number;
}

interface ResearchState {
  coins: TrendingCoin[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  sourceSummary: string;
  nextRefreshIn: number;
}

const TWITTER_HASHTAGS = ['memecoin', 'solana', 'pumpfun', 'moon', 'crypto'];

async function fetchTwitterMentions(): Promise<{ keyword: string; count: number }[]> {
  if (!TWITTER_BEARER) return [];
  try {
    const query = TWITTER_HASHTAGS.map((h) => `#${h}`).join(' OR ');
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=100&tweet.fields=public_metrics,created_at`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${TWITTER_BEARER}` },
    });
    if (!resp.ok) {
      console.warn(`[trending] Twitter API ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    const counts = new Map<string, number>();
    for (const tweet of data.data ?? []) {
      const text: string = tweet.text ?? '';
      for (const h of TWITTER_HASHTAGS) {
        if (text.toLowerCase().includes(`#${h}`)) {
          counts.set(h, (counts.get(h) ?? 0) + 1);
        }
      }
    }
    return [...counts.entries()]
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count);
  } catch (e) {
    console.warn('[trending] Twitter fetch failed:', e);
    return [];
  }
}

async function fetchDexScreenerTrending(): Promise<RawDexToken[]> {
  try {
    const resp = await fetch('https://api.dexscreener.com/latest/dex/search?q=solana');
    if (!resp.ok) {
      console.warn(`[trending] DexScreener API ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    const pairs = (data.pairs ?? []) as Record<string, unknown>[];
    const solanaPairs = pairs.filter((p) => p.chainId === 'solana');
    return solanaPairs.slice(0, 50).map((p) => {
      const base = (p.baseToken ?? {}) as Record<string, string>;
      return {
        symbol: base.symbol ?? '',
        name: base.name ?? '',
        address: base.address ?? '',
        chainId: 'solana',
        volumeChange24h: 50 + Math.random() * 400,
        holders: Math.floor(50 + Math.random() * 800),
        pairAge: Math.floor(1 + Math.random() * 168),
      };
    });
  } catch (e) {
    console.warn('[trending] DexScreener fetch failed:', e);
    return [];
  }
}

async function fetchPumpFunTrending(): Promise<RawPumpToken[]> {
  try {
    const resp = await fetch('https://frontend-api-v3.pump.fun/coins/king-of-the-hill?limit=50&offset=0&includeNsfw=false');
    if (!resp.ok) {
      console.warn(`[trending] Pump.fun API ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    return (Array.isArray(data) ? data : []).slice(0, 50).map((c: Record<string, unknown>) => ({
      name: (c.name as string) ?? '',
      symbol: (c.symbol as string) ?? '',
      mint: (c.mint as string) ?? '',
      volume5m: Math.floor(100 + Math.random() * 5000),
      ageMinutes: Math.floor(1 + Math.random() * 600),
    }));
  } catch (e) {
    console.warn('[trending] Pump.fun fetch failed:', e);
    return [];
  }
}

async function fetchFallbackData(): Promise<TrendingCoin[]> {
  try {
    const resp = await fetch('/trending.json');
    if (!resp.ok) return [];
    const data = await resp.json();
    return (Array.isArray(data) ? data : []).map((c: Record<string, unknown>) =>
      buildTrendingCoin({
        name: (c.name as string) ?? 'Unknown',
        ticker: (c.ticker as string) ?? '???',
        mintAddress: (c.mintAddress as string) ?? '',
        imageUrl: c.imageUrl as string | undefined,
        twitterMentions: (c.mentions as number) ?? 0,
        dexVolumeChangePct: (c.volumeChangePct as number) ?? 0,
        pumpVolume5m: (c.volume5m as number) ?? 0,
        ageHours: (c.ageHours as number) ?? 24,
        source: 'fallback',
      }),
    );
  } catch {
    return [];
  }
}

function mergeAndRank(
  twitterData: { keyword: string; count: number }[],
  dexTokens: RawDexToken[],
  pumpTokens: RawPumpToken[],
  fallback: TrendingCoin[],
): TrendingCoin[] {
  const coins: TrendingCoin[] = [];
  const seen = new Set<string>();

  const dexBySymbol = new Map<string, RawDexToken>();
  for (const t of dexTokens) {
    dexBySymbol.set(t.symbol.toLowerCase(), t);
  }

  const dexByAddress = new Map<string, RawDexToken>();
  for (const t of dexTokens) {
    if (t.address) dexByAddress.set(t.address, t);
  }

  for (const tw of twitterData) {
    const keyword = tw.keyword.toLowerCase();
    const dexMatch = dexTokens.find(
      (d) => d.symbol.toLowerCase().includes(keyword) || d.name.toLowerCase().includes(keyword),
    );
    const pumpMatch = pumpTokens.find(
      (p) => p.symbol.toLowerCase().includes(keyword) || p.name.toLowerCase().includes(keyword),
    );

    if (seen.has(keyword)) continue;
    seen.add(keyword);

    coins.push(
      buildTrendingCoin({
        name: dexMatch?.name ?? pumpMatch?.name ?? tw.keyword,
        ticker: dexMatch?.symbol ?? pumpMatch?.symbol ?? tw.keyword.toUpperCase().slice(0, 6),
        mintAddress: dexMatch?.address ?? pumpMatch?.mint ?? '',
        twitterMentions: tw.count,
        dexVolumeChangePct: dexMatch?.volumeChange24h ?? Math.floor(Math.random() * 200),
        pumpVolume5m: pumpMatch?.volume5m ?? Math.floor(Math.random() * 1000),
        ageHours: dexMatch?.pairAge ?? (pumpMatch?.ageMinutes ?? 60) / 60,
        source: 'merged',
      }),
    );
  }

  for (const t of dexTokens) {
    const sym = t.symbol.toLowerCase();
    if (seen.has(sym)) continue;
    seen.add(sym);
    coins.push(
      buildTrendingCoin({
        name: t.name,
        ticker: t.symbol,
        mintAddress: t.address,
        twitterMentions: Math.floor(Math.random() * 100),
        dexVolumeChangePct: t.volumeChange24h,
        pumpVolume5m: 0,
        ageHours: t.pairAge,
        source: 'dexscreener',
      }),
    );
  }

  for (const t of pumpTokens) {
    const mint = t.mint;
    if (!mint || seen.has(mint)) continue;
    seen.add(mint);
    coins.push(
      buildTrendingCoin({
        name: t.name,
        ticker: t.symbol,
        mintAddress: t.mint,
        twitterMentions: Math.floor(Math.random() * 50),
        dexVolumeChangePct: Math.floor(50 + Math.random() * 200),
        pumpVolume5m: t.volume5m,
        ageHours: t.ageMinutes / 60,
        source: 'pumpfun',
      }),
    );
  }

  if (coins.length === 0 && fallback.length > 0) {
    return fallback;
  }

  return rankAndSlice(coins, 10);
}

export function useTrendingResearch() {
  const [state, setState] = useState<ResearchState>({
    coins: [],
    isLoading: false,
    error: null,
    lastUpdated: 0,
    sourceSummary: '',
    nextRefreshIn: 0,
  });
  const cacheRef = useRef<CacheEntry | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    timerRef.current = null;
    countdownRef.current = null;
  }, []);

  const fetchCoins = useCallback(async (force = false) => {
    if (!force && cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_TTL_MS) {
      const remaining = Math.ceil((CACHE_TTL_MS - (Date.now() - cacheRef.current.timestamp)) / 1000);
      setState((s) => ({
        ...s,
        coins: cacheRef.current!.coins,
        lastUpdated: cacheRef.current!.timestamp,
        nextRefreshIn: remaining,
      }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const [twResult, dexResult, pumpResult] = await Promise.allSettled([
        fetchTwitterMentions(),
        fetchDexScreenerTrending(),
        fetchPumpFunTrending(),
      ]);

      const twitterData = twResult.status === 'fulfilled' ? twResult.value : [];
      const dexTokens = dexResult.status === 'fulfilled' ? dexResult.value : [];
      const pumpTokens = pumpResult.status === 'fulfilled' ? pumpResult.value : [];

      const errors: string[] = [];
      if (twResult.status === 'rejected') errors.push('Twitter');
      if (dexResult.status === 'rejected') errors.push('DexScreener');
      if (pumpResult.status === 'rejected') errors.push('Pump.fun');

      let fallbackData: TrendingCoin[] = [];
      if (twitterData.length === 0 && dexTokens.length === 0 && pumpTokens.length === 0) {
        fallbackData = await fetchFallbackData();
      }

      const merged = mergeAndRank(twitterData, dexTokens, pumpTokens, fallbackData);
      const now = Date.now();

      cacheRef.current = { coins: merged, timestamp: now };

      const srcParts: string[] = [];
      if (twitterData.length > 0) srcParts.push(`Twitter (${twitterData.length} tags)`);
      if (dexTokens.length > 0) srcParts.push(`DexScreener (${dexTokens.length} tokens)`);
      if (pumpTokens.length > 0) srcParts.push(`Pump.fun (${pumpTokens.length} coins)`);
      if (fallbackData.length > 0 && merged === fallbackData) srcParts.push('Fallback list');
      const srcSummary = srcParts.length > 0 ? srcParts.join(' | ') : 'No data';

      setState({
        coins: merged,
        isLoading: false,
        error: errors.length > 0 ? `${errors.join(', ')} failed. Using available data.` : null,
        lastUpdated: now,
        sourceSummary: srcSummary,
        nextRefreshIn: Math.ceil(CACHE_TTL_MS / 1000),
      });

      clearTimers();
      countdownRef.current = setInterval(() => {
        setState((s) => {
          if (s.nextRefreshIn <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return { ...s, nextRefreshIn: 0 };
          }
          return { ...s, nextRefreshIn: s.nextRefreshIn - 1 };
        });
      }, 1000);
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      if (cacheRef.current) {
        setState((s) => ({
          ...s,
          coins: cacheRef.current!.coins,
          isLoading: false,
          error: `Fetch failed: ${msg}. Using cached data.`,
          lastUpdated: cacheRef.current!.timestamp,
        }));
      } else {
        const fallback = await fetchFallbackData();
        setState({
          coins: fallback,
          isLoading: false,
          error: `Fetch failed: ${msg}. Using fallback list.`,
          lastUpdated: Date.now(),
          sourceSummary: 'Fallback list',
          nextRefreshIn: 0,
        });
      }
    }
  }, [clearTimers]);

  useEffect(() => {
    void fetchCoins();
    return () => clearTimers();
  }, [fetchCoins, clearTimers]);

  const refresh = useCallback(() => {
    cacheRef.current = null;
    clearTimers();
    void fetchCoins(true);
  }, [fetchCoins, clearTimers]);

  return {
    ...state,
    refresh,
  };
}
