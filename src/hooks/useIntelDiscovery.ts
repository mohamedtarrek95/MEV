import { useCallback, useEffect, useRef, useState } from 'react';
import type { Post, MemeIdea } from '../utils/intel/types';
import { MockMultiSourceProvider, createAllProviders } from '../utils/intel/providers/mockMulti';
import { buildMemeIdeas } from '../utils/intel/engine';
import { REFRESH_MS, WINDOW_MS } from '../utils/intel/sources';

const CACHE_KEY = 'meme-intel-cache';
const CACHE_TTL = 10 * 60 * 1000;

interface CacheEntry {
  ideas: MemeIdea[];
  timestamp: number;
}

function readCache(): MemeIdea[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.ideas;
  } catch {
    return null;
  }
}

function writeCache(ideas: MemeIdea[]) {
  try {
    const entry: CacheEntry = { ideas, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch { /* quota exceeded — ignore */ }
}

interface UseIntelResult {
  ideas: MemeIdea[];
  posts: Post[];
  loading: boolean;
  lastRefresh: number | null;
  refresh: () => void;
}

export function useIntelDiscovery(): UseIntelResult {
  const [ideas, setIdeas] = useState<MemeIdea[]>(() => readCache() ?? []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(ideas.length === 0);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const providersRef = useRef<MockMultiSourceProvider[]>(createAllProviders({ seed: 42, ideaCount: 10 }));

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const providers = providersRef.current;
      const results = await Promise.allSettled(
        providers.map((p) => p.fetch()),
      );
      const allPosts: Post[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') allPosts.push(...r.value);
      }
      const now = Date.now();
      const recent = allPosts.filter((p) => now - p.timestamp <= WINDOW_MS);
      setPosts(recent);
      const ideas = buildMemeIdeas({ posts: recent, now });
      setIdeas(ideas);
      writeCache(ideas);
      setLastRefresh(now);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const id = setInterval(() => void fetchAll(), REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchAll]);

  return { ideas, posts, loading, lastRefresh, refresh: fetchAll };
}
