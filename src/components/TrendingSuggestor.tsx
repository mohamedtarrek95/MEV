import { useRef, useState } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useIntelDiscovery } from '../hooks/useIntelDiscovery';
import { sourceLabel } from '../utils/intel/sources';
import { formatAge, formatEng, hoursAgo } from '../utils/intel/time';
import type { IntelSuggestion, SourceId } from '../utils/intel/types';
import { useToast } from './Toast';
import { Spinner } from './Spinner';
import { LaunchModal, type LaunchModalData } from './LaunchModal';

const DETECTED_SOURCES: SourceId[] = [
  'reddit', 'telegram', 'bluesky', 'mastodon', 'nitter',
  'pumpfun', 'axiom', 'dexscreener', 'dextools', 'geckoterminal',
  'gmgn', 'bullx', 'photon', 'birdeye', 'jupiter',
];

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.min(score, 100);
  const color = score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-cyan-500' : 'bg-amber-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs font-bold text-zinc-200">{score.toFixed(1)}</span>
      {label && <span className="text-[10px] text-zinc-600">{label}</span>}
    </div>
  );
}

function ConfidenceBadge({ pct }: { pct: number }) {
  const color = pct >= 70 ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40'
    : pct >= 40 ? 'border-cyan-500/50 text-cyan-400 bg-cyan-950/40'
    : 'border-zinc-600/50 text-zinc-400 bg-zinc-900/40';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {pct}% conf
    </span>
  );
}

function PlatformRow({ sourceId, mentions, trendingRank }: { sourceId: SourceId; mentions: number; trendingRank?: number }) {
  return (
    <div className="flex items-center justify-between gap-1 rounded bg-zinc-950/60 px-2 py-1">
      <span className="text-[11px] text-zinc-400">✓ {sourceLabel(sourceId)}</span>
      <span className="text-[10px] text-zinc-500">
        {mentions > 0 ? `${mentions} mentions` : '—'}
        {trendingRank !== undefined && <span className="ml-1 text-cyan-400">#{trendingRank}</span>}
      </span>
    </div>
  );
}

function CandidateCard({ suggestion }: { suggestion: IntelSuggestion }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(suggestion.mintAddress);
    toast.push('success', 'Contract address copied');
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  const detectedSources = DETECTED_SOURCES.filter((sid) => {
    const ps = suggestion.platformSignals.find((s) => s.sourceId === sid);
    return ps && ps.mentions > 0;
  });
  const undetectedSources = DETECTED_SOURCES.filter((sid) => !detectedSources.includes(sid));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all duration-300 hover:border-zinc-700">
      <div className="flex items-start gap-3">
        <img
          src={suggestion.imageUrl}
          alt={suggestion.tokenName}
          className="h-11 w-11 shrink-0 rounded-full border border-zinc-800 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMjcyNzNhIi8+PHRleHQgeD0iMjAiIHk9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjEyIj4/PC90ZXh0Pjwvc3ZnPg==';
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-sm font-bold text-zinc-100 truncate">{suggestion.tokenName}</span>
              <span className="ml-2 font-mono text-xs text-cyan-400">{suggestion.tokenSymbol}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ConfidenceBadge pct={suggestion.confidencePct} />
              <span className="rounded bg-fuchsia-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                {suggestion.platformsCount} sources
              </span>
            </div>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="min-w-0 flex-1 break-all font-mono text-[10px] text-zinc-500">
              {suggestion.mintAddress}
            </span>
            <button
              onClick={handleCopy}
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                copied
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400'
                  : 'border-zinc-700 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-400'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600">Global Trend Score</div>
            <ScoreBar score={suggestion.globalTrendScore} label="" />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
        <div className="text-center">
          <div className="font-mono text-sm font-bold text-zinc-100">{suggestion.totalMentions}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Mentions</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-sm font-bold text-zinc-100">{formatAge(suggestion.tokenAgeMs)}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Token Age</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-sm font-bold text-zinc-100">
            {new Date(suggestion.firstDetectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">First Detected</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          Detected On ({detectedSources.length})
        </div>
        <div className="grid grid-cols-2 gap-1">
          {detectedSources.map((sid) => {
            const ps = suggestion.platformSignals.find((s) => s.sourceId === sid);
            return (
              <PlatformRow
                key={sid}
                sourceId={sid}
                mentions={ps?.mentions ?? 0}
                trendingRank={ps?.trendingRank}
              />
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 w-full text-center text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors"
      >
        {expanded ? '▲ Hide Details' : `▼ Details + Evidence (${suggestion.evidence.length} bullets)`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Why This Was Selected
          </div>
          <ul className="space-y-1">
            {suggestion.evidence.map((e, i) => (
              <li key={`${e.sourceId}-${i}`} className="text-[11px] text-zinc-400">
                • {e.text}
              </li>
            ))}
          </ul>

          {undetectedSources.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">Not Detected On</div>
              <div className="flex flex-wrap gap-1">
                {undetectedSources.map((sid) => (
                  <span key={sid} className="rounded bg-zinc-900/60 px-1.5 py-0.5 text-[10px] text-zinc-600">
                    {sourceLabel(sid)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] text-zinc-600">Chain: {suggestion.chain}</div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <a
          href={suggestion.dexscreenerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-md border border-zinc-700 px-3 py-2 text-center text-[11px] font-semibold text-zinc-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
        >
          Open on DexScreener
        </a>
        <a
          href={suggestion.axiomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-md border border-zinc-700 px-3 py-2 text-center text-[11px] font-semibold text-zinc-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
        >
          Open on Axiom
        </a>
      </div>
    </div>
  );
}

export function TrendingSuggestor({ api }: { api: BundleApi }) {
  const { suggestions, isLoading, error, lastUpdated, observationsProcessed, nextRefreshIn, feedSource, refresh } =
    useIntelDiscovery();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<LaunchModalData> | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState('Launch Meme Coin');

  const handleLaunch = (s: IntelSuggestion) => {
    setModalData({
      name: s.tokenName,
      ticker: s.tokenSymbol,
      description: s.topReason,
      imageUrl: s.imageUrl,
      buyAmount: 0.1,
    });
    setModalTitle(`Launch ${s.tokenName} (${s.tokenSymbol})`);
    setModalOpen(true);
  };

  const handleModalLaunch = (data: LaunchModalData) => {
    void api.launchMemeCoin(data.name, data.ticker, data.description, data.imageUrl, data.buyAmount);
    setModalOpen(false);
  };

  const handleSaveDraft = (data: LaunchModalData) => {
    toast.push('success', `Draft: ${data.name} (${data.ticker}) saved`);
    setModalOpen(false);
  };

  const timeSince = lastUpdated ? Math.round((Date.now() - lastUpdated) / 1000) : 0;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Multi-Source Meme Intelligence
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            Cross-platform signals from 15 sources. Final Stretch only, 24h window, refreshed every 4 min.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {nextRefreshIn > 0 && (
            <span className="font-mono text-[11px] text-zinc-600">
              Refresh in {Math.floor(nextRefreshIn / 60)}:{String(nextRefreshIn % 60).padStart(2, '0')}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-40"
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : <span>🔄</span>}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
          ⚠ {error}
        </div>
      )}

      {feedSource && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-[11px] text-zinc-500">
          <span>{feedSource}</span>
          {timeSince > 0 && <span>(updated {timeSince}s ago)</span>}
          <span>{suggestions.length} suggestions</span>
        </div>
      )}

      {isLoading && suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner className="h-8 w-8 text-cyan-400" />
          <p className="mt-4 font-mono text-sm text-zinc-500">Scanning 15 sources across the web...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-zinc-600">
            No Final Stretch tokens match any cross-platform trends yet.
          </p>
          <button
            onClick={refresh}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-950/30 px-4 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-900/40"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {suggestions.map((s) => (
            <CandidateCard key={s.id} suggestion={s} />
          ))}
        </div>
      )}

      <LaunchModal
        open={modalOpen}
        title={modalTitle}
        initialData={modalData}
        busy={api.busy}
        onLaunch={handleModalLaunch}
        onSaveDraft={handleSaveDraft}
        onCancel={() => setModalOpen(false)}
      />
    </section>
  );
}