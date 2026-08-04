import { useEffect, useState, useCallback } from 'react';

interface ProviderDiag {
  name: string;
  sourceId: string;
  requests: number;
  collectedPosts: number;
  acceptedPosts: number;
  rejectedPosts: number;
  httpStatus: number | null;
  lastSuccess: number | null;
  lastError: string | null;
  durationMs: number;
}

interface StatusData {
  ok: boolean;
  redis: boolean;
  redisConfigured: boolean;
  lastRefreshAt: number;
  isRefreshing: boolean;
  lastScrape: {
    scrapedAt: number;
    durationMs: number;
    totalPosts: number;
    totalAccepted: number;
    totalRejected: number;
    narratives: number;
    providers: ProviderDiag[];
  } | null;
  reportNarratives: number;
}

function timeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export function IntelAdminPanel() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/report?action=status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as StatusData;
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/report?action=refresh');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [fetchStatus]);

  useEffect(() => {
    void fetchStatus();
    const id = setInterval(() => void fetchStatus(), 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-sm text-zinc-500">
        Loading diagnostics...
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-6 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm font-bold text-zinc-200">Engine Diagnostics</h3>
        <button
          onClick={() => void forceRefresh()}
          disabled={refreshing}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
        >
          {refreshing ? 'Scraping...' : 'Force Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Redis" value={status?.redis ? 'Connected' : status?.redisConfigured ? 'Error' : 'Not configured'} ok={!!status?.redis} />
        <StatCard label="Last Scan" value={status?.lastRefreshAt ? timeAgo(status.lastRefreshAt) : 'Never'} ok={!!status?.lastRefreshAt} />
        <StatCard label="Narratives" value={String(status?.reportNarratives ?? 0)} ok={(status?.reportNarratives ?? 0) > 0} />
        <StatCard label="Status" value={status?.isRefreshing ? 'Scraping...' : 'Idle'} ok={!status?.isRefreshing} />
      </div>

      {status?.lastScrape && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-3 text-[10px] uppercase tracking-wider text-zinc-600">Last Scrape Results</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div>
              <div className="text-[10px] text-zinc-600">Duration</div>
              <div className="font-mono text-sm text-zinc-200">{status.lastScrape.durationMs}ms</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600">Total Posts</div>
              <div className="font-mono text-sm text-zinc-200">{status.lastScrape.totalPosts}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600">Accepted</div>
              <div className="font-mono text-sm text-emerald-400">{status.lastScrape.totalAccepted}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600">Rejected</div>
              <div className="font-mono text-sm text-amber-400">{status.lastScrape.totalRejected}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-600">Narratives</div>
              <div className="font-mono text-sm text-fuchsia-400">{status.lastScrape.narratives}</div>
            </div>
          </div>

          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Provider Health</div>
          <div className="space-y-2">
            {status.lastScrape.providers.map((p) => (
              <ProviderRow key={p.sourceId} provider={p} />
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-2 text-xs text-amber-300">
          {error}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className={`font-mono text-sm font-bold ${ok ? 'text-emerald-400' : 'text-zinc-400'}`}>{value}</div>
    </div>
  );
}

function ProviderRow({ provider: p }: { provider: ProviderDiag }) {
  const hasData = p.acceptedPosts > 0;
  const hasError = !!p.lastError;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
      <div className={`h-2 w-2 rounded-full ${hasData ? 'bg-emerald-400' : hasError ? 'bg-red-400' : 'bg-zinc-600'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-zinc-200">{p.name}</span>
          {p.httpStatus && (
            <span className={`font-mono text-[10px] ${p.httpStatus < 400 ? 'text-emerald-400' : 'text-red-400'}`}>
              HTTP {p.httpStatus}
            </span>
          )}
          <span className="font-mono text-[10px] text-zinc-600">{p.durationMs}ms</span>
          {p.lastSuccess && (
            <span className="font-mono text-[10px] text-zinc-600">Last: {timeAgo(p.lastSuccess)}</span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-0.5">
          <span className="text-[10px] text-zinc-500">Collected: <span className="text-zinc-300">{p.collectedPosts}</span></span>
          <span className="text-[10px] text-zinc-500">Accepted: <span className="text-emerald-400">{p.acceptedPosts}</span></span>
          <span className="text-[10px] text-zinc-500">Rejected: <span className="text-amber-400">{p.rejectedPosts}</span></span>
          <span className="text-[10px] text-zinc-500">Requests: <span className="text-zinc-300">{p.requests}</span></span>
        </div>
        {hasError && (
          <div className="mt-1 text-[10px] text-red-400 truncate">Error: {p.lastError}</div>
        )}
      </div>
    </div>
  );
}
