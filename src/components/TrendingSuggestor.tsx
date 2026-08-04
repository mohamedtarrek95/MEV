import { useState } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useTrendingResearch } from '../hooks/useTrendingResearch';
import type { MigrationCandidate } from '../utils/trendingEngine';
import { buildAxiomUrl } from '../utils/trendingEngine';
import { useToast } from './Toast';
import { Spinner } from './Spinner';
import { LaunchModal, type LaunchModalData } from './LaunchModal';

function CandidateCard({
  candidate,
  onLaunch,
}: {
  candidate: MigrationCandidate;
  onLaunch: (c: MigrationCandidate) => void;
}) {
  const toast = useToast();
  const axiomUrl = buildAxiomUrl(candidate.mintAddress);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    window.open(axiomUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyMint = () => {
    void navigator.clipboard.writeText(candidate.mintAddress);
    toast.push('success', 'Mint address copied');
  };

  const scoreColor =
    candidate.migrationScore >= 70
      ? 'border-emerald-500/30'
      : candidate.migrationScore >= 45
        ? 'border-cyan-500/30'
        : 'border-amber-500/30';

  return (
    <div
      className={`group cursor-pointer rounded-xl border bg-zinc-900/60 p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${scoreColor} hover:border-zinc-700`}
      onClick={handleCardClick}
    >
      <div className="flex items-start gap-3">
        <img
          src={candidate.imageUrl}
          alt={candidate.name}
          className="h-12 w-12 shrink-0 rounded-full border border-zinc-800 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMjcyNzNhIi8+PHRleHQgeD0iMjAiIHk9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjEyIj4/PC90ZXh0Pjwvc3ZnPg==';
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <span className="font-mono text-sm font-bold text-zinc-100 truncate">
                {candidate.name}
              </span>
              <span className="ml-2 font-mono text-xs text-cyan-400">{candidate.ticker}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-emerald-400">
                {candidate.previousMigrations}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                Previous Migrated Tokens
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-cyan-400">
                {Math.round(candidate.progressPct)}%
              </div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Progress</div>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="text-center">
              <div className="font-mono text-lg font-bold text-zinc-300">
                {candidate.migrationScore.toFixed(1)}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Score</div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">
        {candidate.rationale}
      </p>

      {candidate.similarNames.length > 0 && (
        <div className="mt-2">
          <span className="text-[10px] text-zinc-600">Matched migrated names: </span>
          <span className="text-[11px] text-zinc-400">
            {candidate.similarNames.slice(0, 5).join(', ')}
            {candidate.similarNames.length > 5 && ` +${candidate.similarNames.length - 5} more`}
          </span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopyMint();
          }}
          className="text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          Copy Mint
        </button>
        <a
          href={axiomUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-cyan-400 transition-colors"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          View on Axiom
        </a>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onLaunch(candidate);
        }}
        className="mt-3 w-full rounded-md bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-500"
      >
        Launch This Coin (Edit First)
      </button>
    </div>
  );
}

export function TrendingSuggestor({ api }: { api: BundleApi }) {
  const { candidates, isLoading, error, lastUpdated, sourceSummary, nextRefreshIn, refresh } =
    useTrendingResearch();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<LaunchModalData> | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState('Launch Meme Coin');

  const handleLaunchFromCandidate = (c: MigrationCandidate) => {
    setModalData({
      name: c.name,
      ticker: c.ticker,
      description: c.rationale,
      imageUrl: c.imageUrl,
      buyAmount: 0.1,
    });
    setModalTitle(`Launch ${c.name} (${c.ticker})`);
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
            Migration Predictor
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            Final Stretch tokens with 2+ previous migrations. Ranked by migration count.
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

      {isLoading && candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner className="h-8 w-8 text-cyan-400" />
          <p className="mt-4 font-mono text-sm text-zinc-500">Scanning Final Stretch tokens...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <p className="text-sm text-zinc-600">
            No migration candidates found with 2+ previous migrations.
          </p>
          <p className="mt-1 text-xs text-zinc-700">
            Try again later as new tokens enter Final Stretch.
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
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              onLaunch={handleLaunchFromCandidate}
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
