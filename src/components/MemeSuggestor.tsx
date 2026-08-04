import { useEffect, useState } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useMemeResearch } from '../hooks/useMemeResearch';
import type { MemeSuggestion, CoinDraft, Rationale } from '../utils/suggestionEngine';
import {
  buildDexScreenerUrl,
  isPlaceholderMint,
} from '../utils/suggestionEngine';
import { useToast } from './Toast';
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

function SentimentBadge({ sentiment }: { sentiment: 'Positive' | 'Neutral' | 'Negative' }) {
  const cls =
    sentiment === 'Positive'
      ? 'text-emerald-400'
      : sentiment === 'Negative'
        ? 'text-red-400'
        : 'text-zinc-400';
  return <span className={`text-xs font-semibold ${cls}`}>{sentiment}</span>;
}

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-[11px] text-zinc-500">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[11px] text-zinc-400 w-16 text-right">{value.toLocaleString()}</span>
    </div>
  );
}

function RationaleSection({ rationale }: { rationale: Rationale }) {
  const bd = rationale.breakdown;
  return (
    <div className="mt-4 border-t border-zinc-800 pt-4 space-y-3">
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Trending Score Breakdown
        </div>
        <div className="space-y-1.5">
          <ScoreBar label="Twitter Engagement" value={bd.twitterMentions} max={10000} color="bg-cyan-500" />
          <ScoreBar label="DexScreener Volume" value={bd.dexVolumeChangePct} max={500} color="bg-fuchsia-500" />
          <ScoreBar label="New Holders (24h)" value={bd.newHolders} max={1000} color="bg-emerald-500" />
          <ScoreBar label="Hours Since Launch" value={bd.hoursSinceLaunch} max={168} color="bg-amber-500" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Sentiment</div>
          <SentimentBadge sentiment={rationale.sentiment} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Liquidity</div>
          <span className={`text-xs font-semibold ${
            rationale.liquidity === 'High' ? 'text-emerald-400' :
            rationale.liquidity === 'Medium' ? 'text-amber-400' : 'text-red-400'
          }`}>{rationale.liquidity}</span>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Dev Activity</div>
          <span className={`text-xs font-semibold ${
            rationale.developerActivity === 'Active' ? 'text-emerald-400' : 'text-red-400'
          }`}>{rationale.developerActivity}</span>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Final Verdict</div>
        <p className="text-xs leading-relaxed text-zinc-400">{rationale.verdict}</p>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onLaunch,
  expanded,
  onToggleExpand,
}: {
  suggestion: MemeSuggestion;
  onLaunch: (s: MemeSuggestion) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const toast = useToast();
  const isPlaceholder = isPlaceholderMint(suggestion.mintAddress);
  const hasValidLink = !isPlaceholder && !!suggestion.chainId && !!suggestion.mintAddress;
  const dexUrl = hasValidLink
    ? buildDexScreenerUrl(suggestion.chainId, suggestion.mintAddress)
    : 'https://dexscreener.com';

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (expanded) {
      onToggleExpand();
      return;
    }
    if (!hasValidLink) {
      toast.push('info', 'Coin not found on DexScreener yet. Redirecting to search...');
    }
    window.open(dexUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`group cursor-pointer rounded-xl border bg-zinc-900/60 p-4 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5 ${
        expanded ? 'border-cyan-500/30 shadow-lg shadow-cyan-500/5' : 'border-zinc-800 hover:border-cyan-500/20'
      }`}
      onClick={handleCardClick}
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
            <div className="flex items-center gap-2">
              <a
                href={dexUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={!hasValidLink ? 'This coin is a suggestion – launch it first to get a real address.' : `View ${suggestion.name} on DexScreener`}
                onClick={(e) => e.stopPropagation()}
                className={!hasValidLink ? 'text-amber-500/50 cursor-not-allowed' : 'text-zinc-600 hover:text-cyan-400 transition-colors'}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              <RiskBadge level={suggestion.riskLevel} />
            </div>
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Topic: {suggestion.trendingTopic} &middot; Est. cost: {suggestion.estimatedCostSol.toFixed(3)} SOL
          </div>
          {isPlaceholder && (
            <div className="mt-1 text-[10px] text-amber-500/70" title="This coin is a suggestion – launch it first to get a real address.">
              Suggestion only – launch to get a real mint address
            </div>
          )}
          <div className="mt-2">
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-zinc-600">Trending Score</div>
            <TrendingScoreBar score={suggestion.trendingScore} />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          {expanded ? '▲ Hide details' : '📊 Why this coin?'}
        </button>
        <span className="text-[10px] text-zinc-600">
          {suggestion.source === 'dexscreener' ? 'Live data' : 'AI generated'}
        </span>
      </div>

      {expanded && <RationaleSection rationale={suggestion.rationale} />}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onLaunch(suggestion);
        }}
        className="mt-3 w-full rounded-md bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-500"
      >
        Launch This Coin (Edit First)
      </button>
    </div>
  );
}

function DraftCard({
  draft,
  onEdit,
  onDelete,
}: {
  draft: CoinDraft;
  onEdit: (d: CoinDraft) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-sm font-bold text-zinc-200">
            {draft.name} <span className="text-cyan-400">({draft.ticker})</span>
          </div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {draft.buyAmount} SOL &middot; {new Date(draft.createdAt).toLocaleDateString()}
          </div>
          {draft.description && (
            <div className="mt-1 text-[11px] text-zinc-600 line-clamp-2">{draft.description}</div>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(draft)}
            className="rounded border border-zinc-700 px-2 py-1 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(draft.id)}
            className="rounded border border-red-500/30 px-2 py-1 text-[10px] text-red-400 hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function MemeSuggestor({ api }: { api: BundleApi }) {
  const {
    suggestions, loading, lastUpdated, error, sourceInfo,
    fetchSuggestions, clearCache,
    drafts, addDraft, deleteDraft,
  } = useMemeResearch();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<LaunchModalData> | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState('Launch Meme Coin');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  const handleRefresh = () => {
    setExpandedId(null);
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

  const handleSaveDraft = (data: LaunchModalData) => {
    addDraft({
      name: data.name,
      ticker: data.ticker,
      description: data.description,
      imageUrl: data.imageUrl,
      buyAmount: data.buyAmount,
    });
    toast.push('success', `Draft saved: ${data.name} (${data.ticker})`);
    setModalOpen(false);
  };

  const handleEditDraft = (draft: CoinDraft) => {
    setModalData({
      name: draft.name,
      ticker: draft.ticker,
      description: draft.description,
      imageUrl: draft.imageUrl,
      buyAmount: draft.buyAmount,
    });
    setModalTitle(`Edit Draft: ${draft.name}`);
    setModalOpen(true);
  };

  const handleDeleteDraft = (draftId: string) => {
    deleteDraft(draftId);
    toast.push('info', 'Draft deleted');
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
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onLaunch={handleLaunchFromSuggestion}
              expanded={expandedId === s.id}
              onToggleExpand={() => setExpandedId(expandedId === s.id ? null : s.id)}
            />
          ))}
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
            My Drafts ({drafts.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {drafts.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                onEdit={handleEditDraft}
                onDelete={handleDeleteDraft}
              />
            ))}
          </div>
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
