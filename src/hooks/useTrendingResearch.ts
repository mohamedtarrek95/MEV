import { useCallback, useEffect, useRef, useState } from 'react';
import type { FinalStretchToken, MigratedToken, MigrationCandidate } from '../utils/trendingEngine';
import {
  fuzzyMatch,
  buildMigrationCandidate,
  rankCandidates,
} from '../utils/trendingEngine';

const CACHE_TTL_MS = 2 * 60 * 1000;
const MIGRATED_CACHE_KEY = 'pump-migrated-cache';
const MIGRATED_CACHE_TTL = 10 * 60 * 1000;

interface CacheEntry {
  candidates: MigrationCandidate[];
  timestamp: number;
}

interface MigratedCacheEntry {
  tokens: MigratedToken[];
  timestamp: number;
}

interface ResearchState {
  candidates: MigrationCandidate[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  sourceSummary: string;
  nextRefreshIn: number;
}

async function fetchFinalStretchTokens(): Promise<FinalStretchToken[]> {
  try {
    const resp = await fetch(
      'https://frontend-api-v3.pump.fun/coins/king-of-the-hill?limit=50&offset=0&includeNsfw=false',
    );
    if (!resp.ok) {
      console.warn(`[migration] Pump.fun King-of-Hill API ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    const coins = Array.isArray(data) ? data : [];
    return coins
      .filter((c: Record<string, unknown>) => {
        const status = c.complete as boolean | undefined;
        const marketCap = (c.usd_market_cap as number) ?? 0;
        return !status && marketCap > 0;
      })
      .slice(0, 50)
      .map((c: Record<string, unknown>) => ({
        name: (c.name as string) ?? '',
        symbol: (c.symbol as string) ?? '',
        mint: (c.mint as string) ?? '',
        imageUri: (c.image_uri as string) ?? '',
        usdMarketCap: (c.usd_market_cap as number) ?? 0,
        progressPct: Math.min(99, Math.max(1, ((c.usd_market_cap as number) ?? 0) / 69000 * 100)),
        creator: (c.creator as string) ?? '',
        createdAt: (c.created_timestamp as string) ?? '',
      }));
  } catch (e) {
    console.warn('[migration] Final Stretch fetch failed:', e);
    return [];
  }
}

async function fetchMigratedTokensCached(): Promise<MigratedToken[]> {
  try {
    const raw = localStorage.getItem(MIGRATED_CACHE_KEY);
    if (raw) {
      const cached: MigratedCacheEntry = JSON.parse(raw);
      if (Date.now() - cached.timestamp < MIGRATED_CACHE_TTL) {
        return cached.tokens;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const resp = await fetch(
      'https://frontend-api-v3.pump.fun/coins/king-of-the-hill?limit=50&offset=0&includeNsfw=false',
    );
    if (!resp.ok) {
      console.warn(`[migration] Pump.fun migrated API ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    const coins = Array.isArray(data) ? data : [];
    const migrated = coins
      .filter((c: Record<string, unknown>) => (c.complete as boolean) === true)
      .slice(0, 200)
      .map((c: Record<string, unknown>) => ({
        name: (c.name as string) ?? '',
        symbol: (c.symbol as string) ?? '',
        mint: (c.mint as string) ?? '',
        imageUri: (c.image_uri as string) ?? '',
        migratedAt: (c.created_timestamp as string) ?? '',
      }));

    const cacheEntry: MigratedCacheEntry = { tokens: migrated, timestamp: Date.now() };
    try {
      localStorage.setItem(MIGRATED_CACHE_KEY, JSON.stringify(cacheEntry));
    } catch {
      /* ignore quota */
    }

    return migrated;
  } catch (e) {
    console.warn('[migration] Migrated tokens fetch failed:', e);
    return [];
  }
}

async function fetchFallbackData(): Promise<MigrationCandidate[]> {
  try {
    const resp = await fetch('/trending.json');
    if (!resp.ok) return [];
    const data = await resp.json();
    return (Array.isArray(data) ? data : [])
      .filter((c: Record<string, unknown>) => ((c.previousMigrations as number) ?? 0) >= 2)
      .map((c: Record<string, unknown>) => ({
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: (c.name as string) ?? 'Unknown',
        ticker: (c.ticker as string) ?? '???',
        mintAddress: (c.mintAddress as string) ?? '',
        imageUrl: (c.imageUrl as string) || `https://picsum.photos/seed/${c.ticker}/200/200`,
        previousMigrations: (c.previousMigrations as number) ?? 0,
        progressPct: (c.progressPct as number) ?? 50,
        migrationScore: (c.migrationScore as number) ?? 0,
        rationale: (c.rationale as string) ?? 'Historical migration pattern detected.',
        similarNames: (c.similarNames as string[]) ?? [],
        isLaunched: true,
      }));
  } catch {
    return [];
  }
}

function findPreviousMigrations(
  finalStretchToken: FinalStretchToken,
  migratedTokens: MigratedToken[],
): { count: number; names: string[] } {
  const matches: string[] = [];
  for (const mt of migratedTokens) {
    if (mt.mint === finalStretchToken.mint) continue;
    if (
      fuzzyMatch(mt.name, finalStretchToken.name) ||
      fuzzyMatch(mt.symbol, finalStretchToken.symbol)
    ) {
      matches.push(mt.name);
    }
  }
  const unique = [...new Set(matches)];
  return { count: unique.length, names: unique };
}

function buildCandidates(
  finalStretchTokens: FinalStretchToken[],
  migratedTokens: MigratedToken[],
): MigrationCandidate[] {
  const candidates: MigrationCandidate[] = [];
  const groupedByName = new Map<string, FinalStretchToken[]>();

  for (const ft of finalStretchTokens) {
    const key = ft.name.toLowerCase().replace(/[\s_\-]+/g, '');
    const existing = groupedByName.get(key);
    if (existing) {
      existing.push(ft);
    } else {
      groupedByName.set(key, [ft]);
    }
  }

  for (const [, group] of groupedByName) {
    const primary = group.reduce((best, t) =>
      t.progressPct > best.progressPct ? t : best,
    );

    const { count, names } = findPreviousMigrations(primary, migratedTokens);
    if (count < 2) continue;

    const candidate = buildMigrationCandidate({
      token: primary,
      previousMigrations: count,
      similarNames: names,
      progressPct: primary.progressPct,
    });

    candidates.push(candidate);
  }

  return candidates;
}

export function useTrendingResearch() {
  const [state, setState] = useState<ResearchState>({
    candidates: [],
    isLoading: false,
    error: null,
    lastUpdated: 0,
    sourceSummary: '',
    nextRefreshIn: 0,
  });
  const cacheRef = useRef<CacheEntry | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
  }, []);

  const fetchCandidates = useCallback(async (force = false) => {
    if (!force && cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_TTL_MS) {
      const remaining = Math.ceil(
        (CACHE_TTL_MS - (Date.now() - cacheRef.current.timestamp)) / 1000,
      );
      setState((s) => ({
        ...s,
        candidates: cacheRef.current!.candidates,
        lastUpdated: cacheRef.current!.timestamp,
        nextRefreshIn: remaining,
      }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const [finalStretchResult, migratedResult] = await Promise.allSettled([
        fetchFinalStretchTokens(),
        fetchMigratedTokensCached(),
      ]);

      const finalStretchTokens =
        finalStretchResult.status === 'fulfilled' ? finalStretchResult.value : [];
      const migratedTokens =
        migratedResult.status === 'fulfilled' ? migratedResult.value : [];

      const errors: string[] = [];
      if (finalStretchResult.status === 'rejected') errors.push('Final Stretch');
      if (migratedResult.status === 'rejected') errors.push('Migrated tokens');

      let candidates = buildCandidates(finalStretchTokens, migratedTokens);
      const ranked = rankCandidates(candidates, 20);

      if (ranked.length === 0) {
        const fallback = await fetchFallbackData();
        if (fallback.length > 0) {
          candidates = fallback;
        }
      }

      const finalCandidates = ranked.length > 0 ? ranked : candidates;
      const now = Date.now();

      cacheRef.current = { candidates: finalCandidates, timestamp: now };

      const srcParts: string[] = [];
      if (finalStretchTokens.length > 0) srcParts.push(`Final Stretch (${finalStretchTokens.length})`);
      if (migratedTokens.length > 0) srcParts.push(`Migrated DB (${migratedTokens.length})`);
      if (finalCandidates.length === candidates.length && finalCandidates !== candidates) {
        /* ranked */
      } else if (finalCandidates.length > 0 && ranked.length === 0) {
        srcParts.push('Fallback');
      }
      const srcSummary = srcParts.length > 0 ? srcParts.join(' | ') : 'No data';

      setState({
        candidates: finalCandidates,
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
          candidates: cacheRef.current!.candidates,
          isLoading: false,
          error: `Fetch failed: ${msg}. Using cached data.`,
          lastUpdated: cacheRef.current!.timestamp,
        }));
      } else {
        const fallback = await fetchFallbackData();
        setState({
          candidates: fallback,
          isLoading: false,
          error: `Fetch failed: ${msg}. Using fallback data.`,
          lastUpdated: Date.now(),
          sourceSummary: 'Fallback',
          nextRefreshIn: 0,
        });
      }
    }
  }, [clearTimers]);

  useEffect(() => {
    void fetchCandidates();
    return () => clearTimers();
  }, [fetchCandidates, clearTimers]);

  const refresh = useCallback(() => {
    cacheRef.current = null;
    clearTimers();
    void fetchCandidates(true);
  }, [fetchCandidates, clearTimers]);

  return {
    ...state,
    refresh,
  };
}
