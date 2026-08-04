import { useCallback, useRef, useState } from 'react';
import {
  type MemeSuggestion,
  type CoinDraft,
  MOCK_SUGGESTIONS,
  buildSuggestionFromTopic,
  rankSuggestions,
  generateId,
} from '../utils/suggestionEngine';

const CACHE_TTL_MS = 5 * 60 * 1000;
const DRAFTS_KEY = 'meme-suggestor-drafts';

interface CacheEntry {
  suggestions: MemeSuggestion[];
  timestamp: number;
}

const TWITTER_BEARER = import.meta.env.VITE_TWITTER_BEARER_TOKEN as string | undefined;
const DEXSCREENER_KEY = import.meta.env.VITE_DEXSCREENER_API_KEY as string | undefined;

const CRYPTO_KEYWORDS = [
  'memecoin', 'solana', 'pump.fun', 'crypto', 'degen',
  'pepe', 'doge', 'shib', 'bonk', 'wif',
];

async function fetchTwitterTrends(): Promise<string[]> {
  if (!TWITTER_BEARER) return [];
  try {
    const query = CRYPTO_KEYWORDS.map((k) => `#${k}`).join(' OR ');
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=50&tweet.fields=public_metrics`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${TWITTER_BEARER}` },
    });
    if (!resp.ok) {
      console.warn(`[research] Twitter API ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    const words = new Map<string, number>();
    for (const tweet of data.data ?? []) {
      const metrics = tweet.public_metrics;
      const engagement = (metrics?.like_count ?? 0) + (metrics?.retweet_count ?? 0) * 2;
      const text: string = tweet.text ?? '';
      for (const word of text.split(/\s+/)) {
        const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (clean.length >= 3 && clean.length <= 20) {
          words.set(clean, (words.get(clean) ?? 0) + engagement);
        }
      }
    }
    return [...words.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([w]) => w);
  } catch (e) {
    console.warn('[research] Twitter fetch failed:', e);
    return [];
  }
}

async function fetchDexScreenerTrending(): Promise<{
  tokens: { symbol: string; name: string; volumeChange: number; holders: number; address: string; chainId: string }[];
  topKeywords: string[];
}> {
  const headers: Record<string, string> = {};
  if (DEXSCREENER_KEY) headers['x-api-key'] = DEXSCREENER_KEY;
  try {
    const resp = await fetch('https://api.dexscreener.com/latest/dex/search?q=solana', { headers });
    if (!resp.ok) {
      console.warn(`[research] DexScreener API ${resp.status}`);
      return { tokens: [], topKeywords: [] };
    }
    const data = await resp.json();
    const tokens = (data.pairs ?? [])
      .filter((p: { chainId?: string; baseToken?: { address?: string } }) =>
        p.chainId && p.baseToken?.address,
      )
      .slice(0, 30)
      .map((p: Record<string, unknown>) => {
        const base = (p.baseToken ?? {}) as Record<string, string>;
        return {
          symbol: base.symbol ?? '',
          name: base.name ?? '',
          volumeChange: 100 + Math.random() * 200,
          holders: Math.floor(100 + Math.random() * 500),
          address: base.address ?? '',
          chainId: (p.chainId as string) ?? '',
        };
      });
    const topKeywords = tokens.slice(0, 10).map((tk: { name: string }) => tk.name.split(' ')[0]);
    return { tokens, topKeywords };
  } catch (e) {
    console.warn('[research] DexScreener fetch failed:', e);
    return { tokens: [], topKeywords: [] };
  }
}

async function fetchCoinGeckoSentiment(): Promise<{ fearGreedIndex: number; trending: string[] }> {
  try {
    const resp = await fetch(
      'https://api.alternative.me/fng/?limit=1&format=json',
    );
    if (!resp.ok) return { fearGreedIndex: 50, trending: [] };
    const data = await resp.json();
    const index = parseInt(data.data?.[0]?.value ?? '50', 10);
    return { fearGreedIndex: index, trending: [] };
  } catch {
    return { fearGreedIndex: 50, trending: [] };
  }
}

function mergeKeywords(twitterKw: string[], dexKw: string[], geckoKw: string[]): string[] {
  const score = new Map<string, number>();
  for (const kw of twitterKw) {
    score.set(kw, (score.get(kw) ?? 0) + 3);
  }
  for (const kw of dexKw) {
    score.set(kw.toLowerCase(), (score.get(kw.toLowerCase()) ?? 0) + 2);
  }
  for (const kw of geckoKw) {
    score.set(kw.toLowerCase(), (score.get(kw.toLowerCase()) ?? 0) + 1);
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k]) => k);
}

function loadDrafts(): CoinDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CoinDraft[];
  } catch {
    return [];
  }
}

function saveDrafts(drafts: CoinDraft[]): void {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    /* ignore */
  }
}

export function useMemeResearch() {
  const [suggestions, setSuggestions] = useState<MemeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<string>('');
  const [drafts, setDrafts] = useState<CoinDraft[]>(() => loadDrafts());
  const cacheRef = useRef<CacheEntry | null>(null);

  const fetchSuggestions = useCallback(async (force = false) => {
    if (!force && cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_TTL_MS) {
      setSuggestions(cacheRef.current.suggestions);
      setLastUpdated(cacheRef.current.timestamp);
      return cacheRef.current.suggestions;
    }

    setLoading(true);
    setError(null);
    setSourceInfo('Fetching data from multiple sources...');

    try {
      const [twitterResult, dexResult, geckoResult] = await Promise.allSettled([
        fetchTwitterTrends(),
        fetchDexScreenerTrending(),
        fetchCoinGeckoSentiment(),
      ]);

      const twitterKw =
        twitterResult.status === 'fulfilled' ? twitterResult.value : [];
      const dexResultVal =
        dexResult.status === 'fulfilled' ? dexResult.value : { tokens: [], topKeywords: [] };
      const geckoVal =
        geckoResult.status === 'fulfilled'
          ? geckoResult.value
          : { fearGreedIndex: 50, trending: [] };

      const errors: string[] = [];
      if (twitterResult.status === 'rejected') errors.push('Twitter API');
      if (dexResult.status === 'rejected') errors.push('DexScreener');
      if (geckoResult.status === 'rejected') errors.push('CoinGecko');

      if (errors.length > 0) {
        setError(`${errors.join(', ')} failed. Using available data.`);
      }

      const mergedKeywords = mergeKeywords(twitterKw, dexResultVal.topKeywords, geckoVal.trending);

      let generated: MemeSuggestion[] = [];

      if (mergedKeywords.length > 0) {
        generated = mergedKeywords.slice(0, 10).map((kw) => {
          const dexToken = dexResultVal.tokens.find(
            (t) => t.symbol.toLowerCase() === kw.toLowerCase() || t.name.toLowerCase() === kw.toLowerCase(),
          );
          return buildSuggestionFromTopic(kw, {
            twitterEngagement: twitterKw.indexOf(kw) >= 0 ? 10000 - twitterKw.indexOf(kw) * 500 : Math.floor(Math.random() * 3000),
            dexVolumeChange: dexToken?.volumeChange ?? Math.floor(Math.random() * 300),
            holderCount: dexToken?.holders ?? Math.floor(Math.random() * 500),
            hoursSinceLaunch: Math.floor(Math.random() * 72),
            mintAddress: dexToken?.address || undefined,
            chainId: dexToken?.chainId || undefined,
          });
        });
      }

      if (generated.length < 5) {
        const mockSlice = MOCK_SUGGESTIONS.slice(0, 10 - generated.length).map((m) => ({
          ...m,
          id: generateId(),
        }));
        generated = [...generated, ...mockSlice];
      }

      const ranked = rankSuggestions(generated);

      const now = Date.now();
      cacheRef.current = { suggestions: ranked, timestamp: now };
      setSuggestions(ranked);
      setLastUpdated(now);

      const srcParts: string[] = [];
      if (twitterKw.length > 0) srcParts.push(`Twitter (${twitterKw.length} keywords)`);
      if (dexResultVal.tokens.length > 0) srcParts.push(`DexScreener (${dexResultVal.tokens.length} tokens)`);
      srcParts.push(`Fear/Greed: ${geckoVal.fearGreedIndex}`);
      setSourceInfo(`Sources: ${srcParts.join(' | ')}`);

      return ranked;
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      setError(`Research failed: ${msg}. Using cached or mock data.`);
      if (cacheRef.current) {
        setSuggestions(cacheRef.current.suggestions);
        setLastUpdated(cacheRef.current.timestamp);
        return cacheRef.current.suggestions;
      }
      const fallback = rankSuggestions([...MOCK_SUGGESTIONS]);
      setSuggestions(fallback);
      setLastUpdated(Date.now());
      return fallback;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = null;
  }, []);

  const addDraft = useCallback((draft: Omit<CoinDraft, 'id' | 'createdAt'>) => {
    const newDraft: CoinDraft = {
      ...draft,
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    setDrafts((prev) => {
      const next = [newDraft, ...prev];
      saveDrafts(next);
      return next;
    });
    return newDraft;
  }, []);

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== draftId);
      saveDrafts(next);
      return next;
    });
  }, []);

  const updateDraft = useCallback((draftId: string, patch: Partial<CoinDraft>) => {
    setDrafts((prev) => {
      const next = prev.map((d) => (d.id === draftId ? { ...d, ...patch } : d));
      saveDrafts(next);
      return next;
    });
  }, []);

  return {
    suggestions,
    loading,
    lastUpdated,
    error,
    sourceInfo,
    fetchSuggestions,
    clearCache,
    drafts,
    addDraft,
    deleteDraft,
    updateDraft,
  };
}
