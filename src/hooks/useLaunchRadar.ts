import { useCallback, useEffect, useRef, useState } from 'react';
import type { LaunchCoin, LaunchReport, NarrativeRanking } from '../utils/launch/types';

const LAUNCHES_API = '/api/launches?action=launches';
const REFRESH_INTERVAL_MS = 5000;
const CACHE_KEY = 'launch-radar-cache';
const CACHE_TTL_MS = 60_000;

interface CacheEnvelope {
  version: number;
  timestamp: number;
  report: LaunchReport;
}

function readCache(): LaunchReport | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const env: CacheEnvelope = JSON.parse(raw);
    if (env.version !== 1) { localStorage.removeItem(CACHE_KEY); return null; }
    if (Date.now() - env.timestamp > CACHE_TTL_MS) { localStorage.removeItem(CACHE_KEY); return null; }
    return env.report;
  } catch { localStorage.removeItem(CACHE_KEY); return null; }
}

function writeCache(report: LaunchReport) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ version: 1, timestamp: Date.now(), report })); } catch {}
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 65) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  if (score >= 35) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 65) return 'bg-green-500';
  if (score >= 50) return 'bg-yellow-500';
  if (score >= 35) return 'bg-orange-500';
  return 'bg-red-500';
}

function getTrendIcon(trend: string): string {
  if (trend === 'rising') return '↗';
  if (trend === 'falling') return '↘';
  if (trend === 'new') return '★';
  return '→';
}

function getTrendColor(trend: string): string {
  if (trend === 'rising') return 'text-emerald-400';
  if (trend === 'falling') return 'text-red-400';
  if (trend === 'new') return 'text-cyan-400';
  return 'text-zinc-500';
}

function getWarningColor(severity: string): string {
  if (severity === 'high') return 'border-red-500/40 bg-red-950/30 text-red-300';
  if (severity === 'medium') return 'border-yellow-500/40 bg-yellow-950/30 text-yellow-300';
  return 'border-zinc-600 bg-zinc-800 text-zinc-400';
}

export function useLaunchRadar() {
  const cached = readCache();
  const [report, setReport] = useState<LaunchReport | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number | null>(cached?.generatedAt ?? null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch(LAUNCHES_API, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json() as { ok: boolean; report: LaunchReport | null; message?: string; error?: string };
      if (!body.ok) throw new Error(body.error || body.message || 'API error');
      if (body.report) {
        setReport(body.report);
        writeCache(body.report);
        setLastRefresh(body.report.generatedAt);
        setError(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    intervalRef.current = setInterval(() => void fetchData, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortRef.current?.abort();
    };
  }, [fetchData]);

  return {
    report,
    coins: report?.coins ?? [],
    narratives: report?.narratives ?? [],
    loading,
    error,
    lastRefresh,
    refresh: fetchData,
    totalScanned: report?.totalScanned ?? 0,
    diagnostics: report?.diagnostics ?? null,
  };
}

export {
  formatAge,
  formatUsd,
  getScoreColor,
  getScoreBg,
  getTrendIcon,
  getTrendColor,
  getWarningColor,
};
