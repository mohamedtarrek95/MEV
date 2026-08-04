import { useEffect, useState } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useMemeResearch } from '../hooks/useMemeResearch';
import type { MemeSuggestion } from '../utils/suggestionEngine';
import { Spinner } from './Spinner';
import { LaunchModal, type LaunchModalData } from './LaunchModal';

function TrendingScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-cyan-500' : score >= 40 ? 'bg-amber-500' : 'bg-zinc-600';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="font-mono text-xs text-zinc-400">{score}</span>
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

function SuggestionCard({
  suggestion,
  onLaunch,
}: {
  suggestion: MemeSuggestion;
  onLaunch: (s: MemeSuggestion) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all duration-300 hover:border-cyan-500/30 hover:bg-zinc-900 hover:shadow-lg hover:shadow-cyan-500/5 ${expanded ? 'border-cyan-500/20' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-3">
        <img
          src={suggestion.imageUrl}
          alt={suggestion.name}
          className="h-12 w-12 shrink-0 rounded-full border border-zinc-800 object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMjcyNzNhIi8+PHRleHQgeD0iMjAiIHk9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjEyIj4/PC90ZXh0Pjwvc3ZnPg==';
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-sm font-bold text-zinc-100">{suggestion.name}</span>
              <span className="ml-2 font-mono text-xs text-cyan-400">{suggestion.ticker}</span>
            </div>
            <RiskBadge level={suggestion.riskLevel} />
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Topic: {suggestion.trendingTopic} &middot; Est. cost: {suggestion.estimatedCostSol.toFixed(3)} SOL
          </div>
          <div className="mt-2">
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-zinc-600">Trending Score</div>
            <TrendingScoreBar score={suggestion.trendingScore} />
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="text-xs leading-relaxed text-zinc-400">{suggestion.description}</p>
          <div className="mt-3 text-[10px] uppercase tracking-wider text-zinc-600">
            Source: {suggestion.source} &middot; {suggestion.id.slice(0, 12)}
          </div>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onLaunch(suggestion);
        }}
        className="mt-3 w-full rounded-md bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-500"
      >
        ⚡ Launch This Coin
      </button>
    </div>
  );
}

function CustomLaunchModal({
  open,
  busy,
  onLaunch,
  onCancel,
}: {
  open: boolean;
  busy: boolean;
  onLaunch: (data: LaunchModalData) => void;
  onCancel: () => void;
}) {
  return (
    <LaunchModal
      open={open}
      title="Create Custom Coin"
      busy={busy}
      onLaunch={onLaunch}
      onCancel={onCancel}
    />
  );
}

export function MemeSuggestor({ api }: { api: BundleApi }) {
  const { suggestions, loading, lastUpdated, error, sourceInfo, fetchSuggestions, clearCache } =
    useMemeResearch();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<LaunchModalData> | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState('Launch Meme Coin');

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  const handleRefresh = () => {
    clearCache();
    void fetchSuggestions(true);
  };

  const handleLaunchFromSuggestion = (suggestion: MemeSuggestion) => {
    setModalData({
      name: suggestion.name,
      ticker: suggestion.ticker,
      description: suggestion.description,
      imageUrl: suggestion.imageUrl,
      buyAmount: suggestion.estimatedCostSol,
    });
    setModalTitle(`Launch ${suggestion.name} (${suggestion.ticker})`);
    setModalOpen(true);
  };

  const handleCustomCoin = () => {
    setModalData(undefined);
    setModalTitle('Create Custom Coin');
    setModalOpen(true);
  };

  const handleModalLaunch = (data: LaunchModalData) => {
    void api.launchMemeCoin(data.name, data.ticker, data.description, data.imageUrl, data.buyAmount);
    setModalOpen(false);
  };

  const timeSince = lastUpdated ? Math.round((Date.now() - lastUpdated) / 1000) : 0;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Meme Coin Suggestor
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            AI-driven suggestions based on trending topics across Twitter, DexScreener, and market data.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-40"
          >
            {loading ? <Spinner className="h-4 w-4" /> : <span>🔄</span>}
            Refresh Suggestions
          </button>
          <button
            onClick={handleCustomCoin}
            disabled={api.busy}
            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-950/30 px-4 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-900/40 disabled:opacity-40"
          >
            ➕ Create Custom Coin
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
          ⚠ {error}
        </div>
      )}

      {sourceInfo && (
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-[11px] text-zinc-500">
          {sourceInfo}
          {lastUpdated > 0 && (
            <span className="ml-2 text-zinc-600">(updated {timeSince}s ago)</span>
          )}
        </div>
      )}

      {loading && suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner className="h-8 w-8 text-cyan-400" />
          <p className="mt-4 font-mono text-sm text-zinc-500">Researching trending meme coins...</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-600">
          No suggestions available. Click &quot;Refresh Suggestions&quot; to start research.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} onLaunch={handleLaunchFromSuggestion} />
          ))}
        </div>
      )}

      <LaunchModal
        open={modalOpen}
        title={modalTitle}
        initialData={modalData}
        busy={api.busy}
        onLaunch={handleModalLaunch}
        onCancel={() => setModalOpen(false)}
      />
    </section>
  );
}
