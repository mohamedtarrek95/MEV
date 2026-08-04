import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemeNarrative, IntelReport, TokenSuggestion } from '../utils/intel/types';
import { REFRESH_MS } from '../utils/intel/sources';

const INTEL_API_URL = import.meta.env.VITE_INTEL_API_URL || 'http://localhost:3939/api/intel';
const CACHE_KEY = 'meme-intel-real-cache';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEnvelope {
  version: number;
  timestamp: number;
  report: IntelReport;
}

function readCache(): IntelReport | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const envelope: CacheEnvelope = JSON.parse(raw);
    if (envelope.version !== 1) { localStorage.removeItem(CACHE_KEY); return null; }
    if (Date.now() - envelope.timestamp > CACHE_TTL_MS) { localStorage.removeItem(CACHE_KEY); return null; }
    return envelope.report;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function writeCache(report: IntelReport) {
  try {
    const envelope: CacheEnvelope = { version: 1, timestamp: Date.now(), report };
    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch { /* ignore */ }
}

// ── token generation from narrative ─────────────────────────────────
const NAME_PREFIXES = ['Mega','Ultra','Super','Hyper','Turbo','Epic','Legendary','Cosmic','Neon','Pixel','Cyber','Quantum','Galaxy','Stellar','Alpha','Shadow','Void','Laser','Happy','Wild'];

function hashCode(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return h; }
function capitalize(s: string): string { return s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }

export function generateToken(narrative: MemeNarrative): TokenSuggestion {
  const n = narrative.narrative;
  const words = n.split(/\s+/);
  let name: string;
  if (words.length === 1) {
    const prefix = NAME_PREFIXES[Math.abs(hashCode(n)) % NAME_PREFIXES.length];
    name = `${prefix} ${capitalize(n)}`;
  } else {
    name = words.map(capitalize).join(' ');
  }
  const symbolWords = name.split(/\s+/);
  const symbol = symbolWords.length === 1
    ? (symbolWords[0].length <= 6 ? symbolWords[0].toUpperCase() : symbolWords[0].slice(0, 6).toUpperCase())
    : symbolWords.map((w) => w[0]).join('').toUpperCase().slice(0, 6);

  const category = narrative.category;
  const descMap: Record<string, string> = {
    'Animals': `${name} is a meme coin born from the viral ${n} trend. Cute, chaotic, and community-driven.`,
    'Technology': `${name} merges ${n} memes with crypto culture. The future of funny on Solana.`,
    'Space': `${name} is going to the moon. Born from the ${n} viral movement.`,
    'Food': `${name} serves up hot meme energy from the ${n} trend. Delicious gains ahead.`,
    'Retro Gaming': `${name} brings retro gaming nostalgia. Born from the ${n} trend.`,
    'Dark Humor': `${name} embraces the void. Born from the ${n} viral moment.`,
  };

  const mascotMap: Record<string, string> = {
    'Animals': `A cute ${n} wearing sunglasses and holding a diamond.`,
    'Technology': `A robot ${n} with glowing circuits and a degen grin.`,
    'Space': `A cosmic ${n} floating in a sea of stars.`,
    'Food': `A delicious ${n} with a golden glow.`,
    'Retro Gaming': `A pixel-art ${n} in 8-bit style.`,
    'Dark Humor': `A shadowy ${n} with glowing red eyes.`,
  };

  const themeMap: Record<string, string> = {
    'Animals': 'Cute & Chaotic', 'Technology': 'AI Meme', 'Space': 'Cosmic Meme',
    'Food': 'Tasty Meme', 'Retro Gaming': '8-Bit Meme', 'Dark Humor': 'Dark Meme',
  };

  const desc = descMap[category] ?? `${name} is a viral meme coin inspired by the ${n} trend.`;
  const mascot = mascotMap[category] ?? `A cool ${n} with sunglasses and a degen attitude.`;
  const theme = themeMap[category] ?? 'Meme Energy';
  const logoPrompt = `${mascot} Logo design, vector style, transparent background, high detail, professional crypto token art`;
  const bannerPrompt = `Wide banner with ${n} theme, vibrant colors, community energy, professional crypto art`;
  const launchTags = ['meme', 'solana', 'crypto', 'viral', ...n.toLowerCase().split(/\s+/).filter((w) => w.length >= 3)].slice(0, 8);

  return { name, symbol, description: desc, theme, mascot, logoPrompt, bannerPrompt, launchTags };
}

// ── hook ────────────────────────────────────────────────────────────
interface UseIntelResult {
  report: IntelReport | null;
  narratives: MemeNarrative[];
  loading: boolean;
  error: string | null;
  lastRefresh: number | null;
  refresh: () => void;
}

export function useIntelDiscovery(): UseIntelResult {
  const cached = readCache();
  const [report, setReport] = useState<IntelReport | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number | null>(cached?.generatedAt ?? null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      console.log(`[intel] fetching from ${INTEL_API_URL}`);
      const res = await fetch(INTEL_API_URL, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { ok: boolean; report: IntelReport | null; message?: string };
      if (!body.ok) throw new Error(body.message ?? 'API returned error');
      if (body.report) {
        console.log(`[intel] received ${body.report.narratives.length} narratives from ${body.report.postsProcessed} posts`);
        setReport(body.report);
        writeCache(body.report);
        setLastRefresh(body.report.generatedAt);
      } else {
        console.log('[intel] no report available from backend');
        setReport(null);
        setError('No data yet. Start the intel worker: npm run intel:worker');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[intel] fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to intel backend');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const id = setInterval(() => void fetchData(), REFRESH_MS);
    return () => { clearInterval(id); abortRef.current?.abort(); };
  }, [fetchData]);

  return {
    report,
    narratives: report?.narratives ?? [],
    loading,
    error,
    lastRefresh,
    refresh: fetchData,
  };
}
