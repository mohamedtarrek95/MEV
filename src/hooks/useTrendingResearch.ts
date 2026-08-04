import { useCallback, useEffect, useRef, useState } from 'react';
import type { FinalStretchToken, MigratedToken, MigrationCandidate } from '../utils/trendingEngine';
import {
  normalizeForFuzzy,
  fuzzyMatch,
  buildMigrationCandidate,
  rankCandidates,
} from '../utils/trendingEngine';

const CACHE_TTL_MS = 2 * 60 * 1000;
const MIGRATED_CACHE_TTL = 10 * 60 * 1000;
const MIGRATED_STORAGE_KEY = 'pump-migrated-cache';

interface CacheEntry {
  candidates: MigrationCandidate[];
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

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function fetchFinalStretchTokens(): Promise<FinalStretchToken[]> {
  const resp = await fetch(
    'https://frontend-api-v3.pump.fun/coins/king-of-the-hill?limit=100&offset=0&includeNsfw=false',
  );
  if (!resp.ok) throw new Error(`Pump.fun king-of-the-hill HTTP ${resp.status}`);
  const data = await resp.json();
  const coins = Array.isArray(data) ? data : [];
  const now = Date.now();
  return coins
    .filter((c: Record<string, unknown>) => {
      if ((c.complete as boolean) !== false) return false;
      const ts = c.created_timestamp;
      if (typeof ts === 'string') {
        const created = new Date(ts).getTime();
        if (Number.isFinite(created) && now - created > TWENTY_FOUR_HOURS_MS) return false;
      } else if (typeof ts === 'number') {
        if (now - ts > TWENTY_FOUR_HOURS_MS) return false;
      }
      return true;
    })
    .map((c: Record<string, unknown>) => ({
      name: (c.name as string) ?? '',
      symbol: (c.symbol as string) ?? '',
      mint: (c.mint as string) ?? '',
      imageUri: (c.image_uri as string) ?? '',
      usdMarketCap: (c.usd_market_cap as number) ?? 0,
      progressPct: computeProgress(c.usd_market_cap as number ?? 0),
      creator: (c.creator as string) ?? '',
      createdAt: (c.created_timestamp as string) ?? '',
    }));
}

function computeProgress(marketCapUsd: number): number {
  const TARGET = 69000;
  return Math.min(99, Math.max(1, (marketCapUsd / TARGET) * 100));
}

async function fetchMigratedTokens(): Promise<MigratedToken[]> {
  try {
    const raw = localStorage.getItem(MIGRATED_STORAGE_KEY);
    if (raw) {
      const cached: { tokens: MigratedToken[]; timestamp: number } = JSON.parse(raw);
      if (Date.now() - cached.timestamp < MIGRATED_CACHE_TTL) {
        return cached.tokens;
      }
    }
  } catch {
    /* ignore */
  }

  const allTokens: MigratedToken[] = [];
  const PAGE_SIZE = 100;
  const MAX_PAGES = 10;

  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      const resp = await fetch(
        `https://frontend-api-v3.pump.fun/coins?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}&includeNsfw=false&sort=created_timestamp&order=DESC`,
      );
      if (!resp.ok) break;
      const data = await resp.json();
      const coins = Array.isArray(data) ? data : [];
      if (coins.length === 0) break;

      for (const c of coins) {
        if ((c as Record<string, unknown>).complete === true) {
          allTokens.push({
            name: ((c as Record<string, unknown>).name as string) ?? '',
            symbol: ((c as Record<string, unknown>).symbol as string) ?? '',
            mint: ((c as Record<string, unknown>).mint as string) ?? '',
            imageUri: ((c as Record<string, unknown>).image_uri as string) ?? '',
            migratedAt: ((c as Record<string, unknown>).created_timestamp as string) ?? '',
          });
        }
      }

      if (coins.length < PAGE_SIZE) break;
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      break;
    }
  }

  if (allTokens.length > 0) {
    try {
      localStorage.setItem(
        MIGRATED_STORAGE_KEY,
        JSON.stringify({ tokens: allTokens, timestamp: Date.now() }),
      );
    } catch {
      /* ignore quota */
    }
  }

  return allTokens;
}

function buildMigratedIndex(migratedTokens: MigratedToken[]): Map<string, MigratedToken[]> {
  const index = new Map<string, MigratedToken[]>();
  for (const mt of migratedTokens) {
    const key = normalizeForFuzzy(mt.name);
    if (!key) continue;
    const existing = index.get(key);
    if (existing) {
      existing.push(mt);
    } else {
      index.set(key, [mt]);
    }
  }
  return index;
}

function findMigratedMatches(
  finalStretchName: string,
  migratedIndex: Map<string, MigratedToken[]>,
): { count: number; names: string[] } {
  const normalized = normalizeForFuzzy(finalStretchName);
  if (!normalized) return { count: 0, names: [] };

  const matchedNames = new Set<string>();

  const directMatch = migratedIndex.get(normalized);
  if (directMatch) {
    for (const mt of directMatch) matchedNames.add(mt.name);
  }

  for (const [key, tokens] of migratedIndex) {
    if (key === normalized) continue;
    if (key.includes(normalized) || normalized.includes(key)) {
      for (const mt of tokens) matchedNames.add(mt.name);
    }
  }

  for (const [key, tokens] of migratedIndex) {
    if (key === normalized) continue;
    if (key.includes(normalized) || normalized.includes(key)) continue;
    const hasFuzzy = tokens.some((mt) => fuzzyMatch(finalStretchName, mt.name));
    if (hasFuzzy) {
      for (const mt of tokens) matchedNames.add(mt.name);
    }
  }

  return { count: matchedNames.size, names: [...matchedNames] };
}

function buildCandidates(
  finalStretchTokens: FinalStretchToken[],
  migratedIndex: Map<string, MigratedToken[]>,
): MigrationCandidate[] {
  const candidates: MigrationCandidate[] = [];
  const seenNames = new Set<string>();

  for (const ft of finalStretchTokens) {
    const nameKey = normalizeForFuzzy(ft.name);
    if (!nameKey) continue;
    if (seenNames.has(nameKey)) continue;

    const { count, names } = findMigratedMatches(ft.name, migratedIndex);
    if (count < 2) continue;

    seenNames.add(nameKey);

    candidates.push(
      buildMigrationCandidate({
        token: ft,
        previousMigrations: count,
        similarNames: names,
        progressPct: ft.progressPct,
      }),
    );
  }

  return candidates;
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
        fetchMigratedTokens(),
      ]);

      const finalStretchTokens =
        finalStretchResult.status === 'fulfilled' ? finalStretchResult.value : [];
      const migratedTokens =
        migratedResult.status === 'fulfilled' ? migratedResult.value : [];

      const errors: string[] = [];
      if (finalStretchResult.status === 'rejected') {
        errors.push(`Final Stretch: ${String(finalStretchResult.reason)}`);
      }
      if (migratedResult.status === 'rejected') {
        errors.push(`Migrated: ${String(migratedResult.reason)}`);
      }

      if (finalStretchTokens.length === 0) {
        errors.push('No Final Stretch tokens returned');
      }
      if (migratedTokens.length === 0) {
        errors.push('No Migrated tokens returned');
      }

      const migratedIndex = buildMigratedIndex(migratedTokens);
      const candidates = buildCandidates(finalStretchTokens, migratedIndex);
      const ranked = rankCandidates(candidates, 20);

      let finalCandidates = ranked;
      if (ranked.length === 0) {
        const fallback = await fetchFallbackData();
        if (fallback.length > 0) {
          finalCandidates = fallback;
        }
      }

      const now = Date.now();
      cacheRef.current = { candidates: finalCandidates, timestamp: now };

      const srcParts: string[] = [];
      srcParts.push(`Final Stretch (${finalStretchTokens.length})`);
      srcParts.push(`Migrated (${migratedTokens.length})`);
      if (finalCandidates.length > 0 && ranked.length === 0) srcParts.push('Fallback');
      const srcSummary = srcParts.join(' | ');

      setState({
        candidates: finalCandidates,
        isLoading: false,
        error: errors.length > 0 ? errors.join('; ') : null,
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
