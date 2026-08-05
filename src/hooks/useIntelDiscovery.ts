import { useCallback, useEffect, useRef, useState } from 'react';
import type { LaunchOpportunity, NarrativeReport, CompetitionData } from '../utils/intel/types';
import { REFRESH_MS } from '../utils/intel/sources';

const INTEL_API_URL = import.meta.env.VITE_INTEL_API_URL || '/api/report?action=intel';
const CACHE_KEY = 'launch-opportunity-cache';
const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEnvelope {
  version: number;
  timestamp: number;
  report: NarrativeReport;
}

function readCache(): NarrativeReport | null {
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

function writeCache(report: NarrativeReport) {
  try {
    const envelope: CacheEnvelope = { version: 1, timestamp: Date.now(), report };
    localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch { /* ignore */ }
}

export function getCompetitionColor(saturation: CompetitionData['saturation']): string {
  switch (saturation) {
    case 'none': return 'text-emerald-400';
    case 'low': return 'text-green-400';
    case 'medium': return 'text-yellow-400';
    case 'high': return 'text-orange-400';
    case 'saturated': return 'text-red-400';
    default: return 'text-zinc-400';
  }
}

export function getRecommendationColor(rec: CompetitionData['recommendation']): string {
  switch (rec) {
    case 'launch_immediately': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'launch_soon': return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'wait': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'do_not_launch': return 'bg-red-500/20 text-red-300 border-red-500/30';
    default: return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
  }
}

export function getRecommendationLabel(rec: CompetitionData['recommendation']): string {
  switch (rec) {
    case 'launch_immediately': return 'LAUNCH NOW';
    case 'launch_soon': return 'LAUNCH SOON';
    case 'wait': return 'WAIT';
    case 'do_not_launch': return 'DO NOT LAUNCH';
    default: return 'UNKNOWN';
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

export { getScoreColor };

interface UseIntelResult {
  report: NarrativeReport | null;
  opportunities: LaunchOpportunity[];
  loading: boolean;
  error: string | null;
  lastRefresh: number | null;
  refresh: () => void;
  isScraping: boolean;
}

export function useIntelDiscovery(): UseIntelResult {
  const cached = readCache();
  const [report, setReport] = useState<NarrativeReport | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number | null>(cached?.generatedAt ?? null);
  const [isScraping, setIsScraping] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setIsScraping(true);
    try {
      const res = await fetch(INTEL_API_URL, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as {
        ok: boolean;
        report: NarrativeReport | null;
        message?: string;
        error?: string;
      };

      if (!body.ok) throw new Error(body.error ?? body.message ?? 'API returned error');

      if (body.report) {
        setReport(body.report);
        writeCache(body.report);
        setLastRefresh(body.report.generatedAt);
        setError(null);
      } else {
        const msg = body.message || 'No launch opportunities found.';
        setReport(null);
        setError(msg);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to connect to engine');
    } finally {
      setLoading(false);
      setIsScraping(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const id = setInterval(() => void fetchData(), REFRESH_MS);
    return () => { clearInterval(id); abortRef.current?.abort(); };
  }, [fetchData]);

  return {
    report,
    opportunities: report?.opportunities ?? [],
    loading,
    error,
    lastRefresh,
    refresh: fetchData,
    isScraping,
  };
}
