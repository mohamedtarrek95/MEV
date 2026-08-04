import { useState } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useTrendingResearch } from '../hooks/useTrendingResearch';
import type { TrendingCoin } from '../utils/trendingEngine';
import { buildAxiomUrl, isLaunched } from '../utils/trendingEngine';
import { useToast } from './Toast';
import { Spinner } from './Spinner';
import { LaunchModal, type LaunchModalData } from './LaunchModal';

function TrendingScoreBar({ score }: { score: number }) {
  const pct = Math.min(score, 100);
  const color =
    score >= 70 ? 'bg-emerald-500' :
    score >= 45 ? 'bg-cyan-500' :
    score >= 25 ? 'bg-amber-500' : 'bg-zinc-600';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-zinc-400">{score.toFixed(1)}</span>
    </div>
  );
}

function RiskBadge({ level }: { level: 'Low' | 'Medium' | 'High' }) {
  const cls =
    level === 'Low'
      ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40'
      : level === 'Medium'
        ? 'border-amber-500/50 text-amber-400 bg-amber-950/40'
        : 'border-red-500/50 text-red-400 bg-red-950/40';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {level}
    </span>
  );
}

function QuickStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-sm font-bold text-zinc-200">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
    </div>
  );
}

function TrendingCard({
  coin,
  onLaunch,
  expanded,
  onToggle,
}: {
  coin: TrendingCoin;
  onLaunch: (c: TrendingCoin) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const toast = useToast();
  const launched = isLaunched(coin.mintAddress);
  const axiomUrl = launched ? buildAxiomUrl(coin.mintAddress) : '';

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    if (expanded) {
      onToggle();
      return;
    }
    if (!launched) {
      toast.push('info', 'Launch this coin first to view on Axiom.');
      return;
    }
    window.open(axiomUrl, '_blank', 'noopener,noreferrer');
  };

  const glowColor =
    coin.riskLevel === 'Low'
      ? 'hover:border-emerald-500/40 hover:shadow-emerald-500/10'
      : coin.riskLevel === 'Medium'
        ? 'hover:border-amber-500/40 hover:shadow-amber-500/10'
        : 'hover:border-red-500/40 hover:shadow-red-500/10';

  const borderGlow =
    coin.riskLevel === 'Low'
      ? 'border-emerald-500/20'
      : coin.riskLevel === 'Medium'
        ? 'border-amber-500/20'
        : 'border-red-500/20';

  return (
    <div
      className={`group cursor-pointer rounded-xl border bg-zinc-900/60 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
        expanded ? `${borderGlow} shadow-lg` : `border-zinc-800 ${glowColor}`
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3">
        <img
          src={coin.imageUrl}
          alt={coin.name}
          className="h-12 w-12 shrink-0 rounded-full border border-zinc-800 object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMjcyNzNhIi8+PHRleHQgeD0iMjAiIHk9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjEyIj4/PC90ZXh0Pjwvc3ZnPg==';
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-sm font-bold text-zinc-100">{coin.name}</span>
              <span className="ml-2 font-mono text-xs text-cyan-400">{coin.ticker}</span>
            </div>
            <RiskBadge level={coin.riskLevel} />
          </div>
          <div className="mt-1.5">
            <TrendingScoreBar score={coin.trendingScore} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">
        {coin.rationale}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
        <QuickStat
          label="Mentions"
          value={coin.quickStats.mentionsLastHour.toLocaleString()}
          color="text-cyan-400"
        />
        <QuickStat
          label="Vol Change"
          value={`+${coin.quickStats.volumeChangePct}%`}
          color="text-fuchsia-400"
        />
        <QuickStat
          label="Age"
          value={coin.quickStats.ageHours < 1
            ? `${Math.round(coin.quickStats.ageHours * 60)}m`
            : `${Math.round(coin.quickStats.ageHours)}h`}
          color="text-emerald-400"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          {expanded ? '▲ Hide details' : '▼ Details'}
        </button>
        {launched ? (
          <a
            href={axiomUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="View on Axiom.Trade"
            className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View on Axiom
          </a>
        ) : (
          <span className="text-[11px] text-amber-500/60" title="Launch this coin first to view on Axiom.">
            Not launched yet
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-3 border-t border-zinc-800 pt-3 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Full Rationale
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">{coin.rationale}</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-zinc-600">Source: </span>
              <span className="text-zinc-400">{coin.source}</span>
            </div>
            <div>
              <span className="text-zinc-600">Launched: </span>
              <span className={launched ? 'text-emerald-400' : 'text-amber-400'}>
                {launched ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          {launched && (
            <div className="text-[11px]">
              <span className="text-zinc-600">Mint: </span>
              <span className="font-mono text-zinc-500 break-all">{coin.mintAddress}</span>
            </div>
          )}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onLaunch(coin);
        }}
        className="mt-3 w-full rounded-md bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-500"
      >
        Launch This Coin (Edit First)
      </button>
    </div>
  );
}

export function TrendingSuggestor({ api }: { api: BundleApi }) {
  const { coins, isLoading, error, lastUpdated, sourceSummary, nextRefreshIn, refresh } =
    useTrendingResearch();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<LaunchModalData> | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState('Launch Meme Coin');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleLaunchFromCoin = (coin: TrendingCoin) => {
    setModalData({
      name: coin.name,
      ticker: coin.ticker,
      description: coin.description,
      imageUrl: coin.imageUrl,
      buyAmount: 0.1,
    });
    setModalTitle(`Launch ${coin.name} (${coin.ticker})`);
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
            Trending Coin Suggestor
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            Live trending data from Twitter, DexScreener, and Pump.fun. Ranked by composite score.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {nextRefreshIn > 0 && (
            <span className="text-[11px] text-zinc-600 font-mono">
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

      {sourceSummary && (
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-[11px] text-zinc-500">
          Sources: {sourceSummary}
          {lastUpdated > 0 && (
            <span className="ml-2 text-zinc-600">(updated {timeSince}s ago)</span>
          )}
        </div>
      )}

      {isLoading && coins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner className="h-8 w-8 text-cyan-400" />
          <p className="mt-4 font-mono text-sm text-zinc-500">Fetching trending data...</p>
        </div>
      ) : coins.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-zinc-600">No trending data available. Using fallback list.</p>
          <button
            onClick={refresh}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-950/30 px-4 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-900/40"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {coins.map((coin) => (
            <TrendingCard
              key={coin.id}
              coin={coin}
              onLaunch={handleLaunchFromCoin}
              expanded={expandedId === coin.id}
              onToggle={() => setExpandedId(expandedId === coin.id ? null : coin.id)}
            />
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
