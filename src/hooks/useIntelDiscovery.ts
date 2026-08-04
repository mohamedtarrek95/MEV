import { useCallback, useEffect, useRef, useState } from 'react';
import type { SourceObservation, IntelSuggestion, IntelReport } from '../utils/intel/types';
import { type ISourceProvider } from '../utils/intel/providers/provider';
import { MockMultiSourceProvider } from '../utils/intel/providers/mockMulti';
import { buildSuggestions } from '../utils/intel/engine';
import { fetchFinalStretch } from '../utils/intel/finalStretch';
import { WINDOW_MS, REFRESH_INTERVAL_MS } from '../utils/intel/sources';
import type { SourceId } from '../utils/intel/types';

const CACHE_KEY = 'intel-obs-cache';
const CACHE_TTL = 6 * 60 * 60 * 1000;

const ALL_SOURCES: SourceId[] = [
  'reddit', 'telegram', 'bluesky', 'mastodon', 'nitter',
  'pumpfun', 'axiom', 'dexscreener', 'dextools', 'geckoterminal',
  'gmgn', 'bullx', 'photon', 'birdeye', 'jupiter',
];

interface StoredObservations {
  observations: SourceObservation[];
  timestamp: number;
}

interface IntelState {
  suggestions: IntelSuggestion[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  observationsProcessed: number;
  nextRefreshIn: number;
  feedSource: string;
}

function loadCachedObservations(): SourceObservation[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed: StoredObservations = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return [];
    return parsed.observations;
  } catch {
    return [];
  }
}

function storeObservations(obs: SourceObservation[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ observations: obs, timestamp: Date.now() }));
  } catch {
    /* quota */
  }
}

function dedupeObservations(existing: SourceObservation[], fresh: SourceObservation[]): SourceObservation[] {
  const byKey = new Map<string, SourceObservation>();
  const now = Date.now();

  for (const o of existing) {
    if (now - o.timestamp > WINDOW_MS) continue;
    byKey.set(`${o.sourceId}:${o.tokenSymbol}:${o.tokenName}`, o);
  }
  for (const o of fresh) {
    byKey.set(`${o.sourceId}:${o.tokenSymbol}:${o.tokenName}`, o);
  }
  return [...byKey.values()];
}

export function useIntelDiscovery(providers?: ISourceProvider[]) {
  const providerMap = useRef<Map<SourceId, ISourceProvider>>(new Map());
  if (providerMap.current.size === 0) {
    const list = providers ?? ALL_SOURCES.map((id) => new MockMultiSourceProvider(id));
    for (const p of list) providerMap.current.set(p.sourceId, p);
  }

  const [state, setState] = useState<IntelState>({
    suggestions: [],
    isLoading: false,
    error: null,
    lastUpdated: 0,
    observationsProcessed: 0,
    nextRefreshIn: 0,
    feedSource: '',
  });
  const cachedObs = useRef<SourceObservation[]>(loadCachedObservations());
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = null;
  }, []);

  const runScan = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const results = await Promise.allSettled(
        ALL_SOURCES.map((id) => {
          const provider = providerMap.current.get(id);
          return provider ? provider.fetch().catch(() => [] as SourceObservation[]) : Promise.resolve([] as SourceObservation[]);
        }),
      );

      const freshObs: SourceObservation[] = [];
      const activeSources = new Set<string>();
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const o of r.value) {
            freshObs.push(o);
            activeSources.add(o.sourceId);
          }
        }
      }

      const merged = dedupeObservations(cachedObs.current, freshObs);
      cachedObs.current = merged;
      storeObservations(merged);

      const [finalStretch] = await Promise.all([fetchFinalStretch()]);
      const suggestions = buildSuggestions({ observations: merged, finalStretchTokens: finalStretch });

      const now = Date.now();
      setState({
        suggestions,
        isLoading: false,
        error: null,
        lastUpdated: now,
        observationsProcessed: merged.length,
        nextRefreshIn: Math.ceil(REFRESH_INTERVAL_MS / 1000),
        feedSource: `${activeSources.size} source(s) · ${merged.length} observations`,
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
      setState((s) => ({
        ...s,
        isLoading: false,
        error: (e as Error)?.message ?? String(e),
      }));
    }
  }, [clearTimers]);

  useEffect(() => {
    void runScan();
    const t = setInterval(() => void runScan(), REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(t);
      clearTimers();
    };
  }, [runScan, clearTimers]);

  const refresh = useCallback(() => {
    clearTimers();
    void runScan();
  }, [runScan, clearTimers]);

  return { ...state, refresh };
}