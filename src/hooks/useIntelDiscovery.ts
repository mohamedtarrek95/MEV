import { useCallback, useEffect, useRef, useState } from 'react';
import type { Post, MemeIdea } from '../utils/intel/types';
import { MockMultiSourceProvider, createAllProviders } from '../utils/intel/providers/mockMulti';
import { buildMemeIdeas } from '../utils/intel/engine';
import { REFRESH_MS, WINDOW_MS } from '../utils/intel/sources';

// ── cache schema versioning ─────────────────────────────────────────
export const CACHE_SCHEMA_VERSION = 2;
const CACHE_KEY = 'meme-intel-cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CacheEnvelope {
  version: number;
  timestamp: number;
  data: MemeIdea[];
}

// ── per-field validation ────────────────────────────────────────────
interface ValidationError {
  field: string;
  reason: string;
}

function validateToken(token: unknown): token is MemeIdea['token'] {
  if (typeof token !== 'object' || token === null) return false;
  const t = token as Record<string, unknown>;
  const checks: [string, boolean][] = [
    ['token.name', typeof t.name === 'string' && t.name.length > 0],
    ['token.symbol', typeof t.symbol === 'string' && t.symbol.length > 0],
    ['token.description', typeof t.description === 'string'],
    ['token.theme', typeof t.theme === 'string'],
    ['token.lore', typeof t.lore === 'string'],
    ['token.mascot', typeof t.mascot === 'string'],
    ['token.colorPalette', Array.isArray(t.colorPalette)],
    ['token.logoPrompt', typeof t.logoPrompt === 'string'],
    ['token.bannerPrompt', typeof t.bannerPrompt === 'string'],
    ['token.websiteStyle', typeof t.websiteStyle === 'string'],
    ['token.socialBio', typeof t.socialBio === 'string'],
    ['token.launchTags', Array.isArray(t.launchTags)],
  ];
  return checks.every(([, ok]) => ok);
}

function validateIdea(raw: unknown, index: number): { valid: true; idea: MemeIdea } | { valid: false; errors: ValidationError[] } {
  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, errors: [{ field: 'root', reason: `item at index ${index} is not an object (type: ${typeof raw})` }] };
  }
  const obj = raw as Record<string, unknown>;
  const errors: ValidationError[] = [];

  if (typeof obj.id !== 'string') errors.push({ field: 'id', reason: `expected string, got ${typeof obj.id}` });
  if (typeof obj.narrative !== 'string') errors.push({ field: 'narrative', reason: `expected string, got ${typeof obj.narrative}` });
  if (typeof obj.trendScore !== 'number') errors.push({ field: 'trendScore', reason: `expected number, got ${typeof obj.trendScore}` });
  if (typeof obj.mentionCount !== 'number') errors.push({ field: 'mentionCount', reason: `expected number, got ${typeof obj.mentionCount}` });
  if (typeof obj.growthPct !== 'number') errors.push({ field: 'growthPct', reason: `expected number, got ${typeof obj.growthPct}` });
  if (typeof obj.uniqueAuthors !== 'number') errors.push({ field: 'uniqueAuthors', reason: `expected number, got ${typeof obj.uniqueAuthors}` });
  if (!Array.isArray(obj.platformsFound)) errors.push({ field: 'platformsFound', reason: `expected array, got ${typeof obj.platformsFound}` });
  if (typeof obj.platformCount !== 'number') errors.push({ field: 'platformCount', reason: `expected number, got ${typeof obj.platformCount}` });
  if (typeof obj.firstDetected !== 'number') errors.push({ field: 'firstDetected', reason: `expected number, got ${typeof obj.firstDetected}` });
  if (typeof obj.lastSeen !== 'number') errors.push({ field: 'lastSeen', reason: `expected number, got ${typeof obj.lastSeen}` });
  if (typeof obj.confidencePct !== 'number') errors.push({ field: 'confidencePct', reason: `expected number, got ${typeof obj.confidencePct}` });
  if (typeof obj.reason !== 'string') errors.push({ field: 'reason', reason: `expected string, got ${typeof obj.reason}` });
  if (!Array.isArray(obj.evidence)) errors.push({ field: 'evidence', reason: `expected array, got ${typeof obj.evidence}` });
  if (typeof obj.category !== 'string') errors.push({ field: 'category', reason: `expected string, got ${typeof obj.category}` });

  if (!validateToken(obj.token)) {
    errors.push({ field: 'token', reason: `token object is missing required fields or is ${typeof obj.token}` });
  }

  if (errors.length > 0) {
    console.warn(`[intel] item #${index} (${obj.id ?? 'unknown'}) invalid:`, errors);
    return { valid: false, errors };
  }

  return { valid: true, idea: raw as MemeIdea };
}

// ── cache read/write ────────────────────────────────────────────────
interface CacheReadResult {
  ideas: MemeIdea[];
  stats: {
    totalRaw: number;
    valid: number;
    discarded: number;
    reasons: string[];
  };
}

function readCache(): CacheReadResult {
  const empty: CacheReadResult = { ideas: [], stats: { totalRaw: 0, valid: 0, discarded: 0, reasons: [] } };

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) {
      console.log('[intel] cache: empty');
      return empty;
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      console.warn('[intel] cache: root is not an object, discarding');
      localStorage.removeItem(CACHE_KEY);
      return empty;
    }

    const envelope = parsed as Record<string, unknown>;

    // version check
    if (typeof envelope.version !== 'number') {
      console.warn('[intel] cache: no version field, discarding entire cache');
      localStorage.removeItem(CACHE_KEY);
      return empty;
    }
    if (envelope.version !== CACHE_SCHEMA_VERSION) {
      console.warn(`[intel] cache: version mismatch (cache=${envelope.version}, expected=${CACHE_SCHEMA_VERSION}), discarding`);
      localStorage.removeItem(CACHE_KEY);
      return empty;
    }

    // TTL check
    if (typeof envelope.timestamp !== 'number') {
      console.warn('[intel] cache: no timestamp, discarding');
      localStorage.removeItem(CACHE_KEY);
      return empty;
    }
    const ageMs = Date.now() - envelope.timestamp;
    const ageMin = Math.round(ageMs / 60000);
    console.log(`[intel] cache: version=${envelope.version}, age=${ageMin}m`);

    if (ageMs > CACHE_TTL_MS) {
      console.warn(`[intel] cache: expired (age=${ageMin}m > ${CACHE_TTL_MS / 60000}m), discarding`);
      localStorage.removeItem(CACHE_KEY);
      return empty;
    }

    // data check
    if (!Array.isArray(envelope.data)) {
      console.warn('[intel] cache: data is not an array, discarding');
      localStorage.removeItem(CACHE_KEY);
      return empty;
    }

    const items = envelope.data as unknown[];
    const valid: MemeIdea[] = [];
    const reasons: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const result = validateIdea(items[i], i);
      if (result.valid) {
        valid.push(result.idea);
      } else {
        const r = result.errors.map((e) => `${e.field}: ${e.reason}`).join('; ');
        reasons.push(`item #${i}: ${r}`);
      }
    }

    const stats = {
      totalRaw: items.length,
      valid: valid.length,
      discarded: items.length - valid.length,
      reasons,
    };

    if (stats.discarded > 0) {
      console.warn(`[intel] cache: ${stats.discarded}/${stats.totalRaw} items discarded`, reasons);
    } else {
      console.log(`[intel] cache: ${stats.valid} valid items loaded`);
    }

    return { ideas: valid, stats };
  } catch (err) {
    console.error('[intel] cache: parse/read failed, discarding', err);
    localStorage.removeItem(CACHE_KEY);
    return empty;
  }
}

function writeCache(ideas: MemeIdea[]) {
  try {
    const envelope: CacheEnvelope = {
      version: CACHE_SCHEMA_VERSION,
      timestamp: Date.now(),
      data: ideas,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
    console.log(`[intel] cache: wrote ${ideas.length} ideas (version=${CACHE_SCHEMA_VERSION})`);
  } catch { /* quota exceeded — ignore */ }
}

// ── public debug info ───────────────────────────────────────────────
export interface CacheDebugInfo {
  cacheKey: string;
  schemaVersion: number;
  expectedVersion: number;
  versionMatch: boolean;
  rawJson: string | null;
  parsedEnvelope: CacheEnvelope | null;
  ageMs: number | null;
  ageMinutes: number | null;
  ttlMinutes: number;
  expired: boolean;
  totalItems: number;
  validItems: number;
  invalidItems: number;
  validationErrors: string[];
}

export function getCacheDebugInfo(): CacheDebugInfo {
  const info: CacheDebugInfo = {
    cacheKey: CACHE_KEY,
    schemaVersion: -1,
    expectedVersion: CACHE_SCHEMA_VERSION,
    versionMatch: false,
    rawJson: null,
    parsedEnvelope: null,
    ageMs: null,
    ageMinutes: null,
    ttlMinutes: CACHE_TTL_MS / 60000,
    expired: false,
    totalItems: 0,
    validItems: 0,
    invalidItems: 0,
    validationErrors: [],
  };

  try {
    info.rawJson = localStorage.getItem(CACHE_KEY);
    if (!info.rawJson) return info;

    const parsed: unknown = JSON.parse(info.rawJson);
    if (typeof parsed !== 'object' || parsed === null) return info;

    const env = parsed as Record<string, unknown>;
    if (typeof env.version === 'number') info.schemaVersion = env.version;
    info.versionMatch = info.schemaVersion === CACHE_SCHEMA_VERSION;

    if (typeof env.timestamp === 'number') {
      info.parsedEnvelope = env as unknown as CacheEnvelope;
      info.ageMs = Date.now() - env.timestamp;
      info.ageMinutes = Math.round(info.ageMs / 60000);
      info.expired = info.ageMs > CACHE_TTL_MS;
    }

    if (Array.isArray(env.data)) {
      const items = env.data as unknown[];
      info.totalItems = items.length;
      for (let i = 0; i < items.length; i++) {
        const result = validateIdea(items[i], i);
        if (result.valid) info.validItems++;
        else {
          info.invalidItems++;
          info.validationErrors.push(result.errors.map((e) => `${e.field}: ${e.reason}`).join('; '));
        }
      }
    }
  } catch {
    // parse failure — leave defaults
  }

  return info;
}

// ── hook ────────────────────────────────────────────────────────────
interface UseIntelResult {
  ideas: MemeIdea[];
  posts: Post[];
  loading: boolean;
  lastRefresh: number | null;
  refresh: () => void;
}

export function useIntelDiscovery(): UseIntelResult {
  const [ideas, setIdeas] = useState<MemeIdea[]>(() => readCache().ideas);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(ideas.length === 0);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const providersRef = useRef<MockMultiSourceProvider[]>(createAllProviders({ seed: 42, ideaCount: 10 }));

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const providers = providersRef.current;
      console.log(`[intel] fetching from ${providers.length} providers...`);
      const results = await Promise.allSettled(
        providers.map((p) => p.fetch()),
      );
      const allPosts: Post[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') allPosts.push(...r.value);
      }
      console.log(`[intel] collected ${allPosts.length} posts from providers`);
      const now = Date.now();
      const recent = allPosts.filter((p) => now - p.timestamp <= WINDOW_MS);
      setPosts(recent);
      const ideas = buildMemeIdeas({ posts: recent, now });
      console.log(`[intel] generated ${ideas.length} meme ideas`);
      setIdeas(ideas);
      writeCache(ideas);
      setLastRefresh(now);
    } catch (err) {
      console.error('[intel] fetch failed, keeping stale data', err);
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
