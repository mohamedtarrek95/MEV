import { useState, useEffect, useCallback } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useIntelDiscovery } from '../hooks/useIntelDiscovery';
import { sourceLabel } from '../utils/intel/sources';
import { formatAge, formatEng } from '../utils/intel/time';
import type { MemeIdea } from '../utils/intel/types';
import { LaunchModal, type LaunchModalData } from './LaunchModal';
import { Spinner } from './Spinner';

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(score, 100);
  const color =
    pct >= 80 ? 'bg-fuchsia-500' :
    pct >= 60 ? 'bg-cyan-500' :
    pct >= 40 ? 'bg-emerald-500' :
    'bg-zinc-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs font-bold text-zinc-300">{score}</span>
    </div>
  );
}

function ConfidenceBadge({ pct }: { pct: number }) {
  const cls =
    pct >= 70 ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300' :
    pct >= 40 ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-300' :
    'border-zinc-700 bg-zinc-800 text-zinc-400';
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${cls}`}>
      {pct}%
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
      {category}
    </span>
  );
}

function GrowthBadge({ pct }: { pct: number }) {
  if (pct <= 0) return null;
  return (
    <span className="font-mono text-xs font-bold text-emerald-400">+{pct}%</span>
  );
}

function IdeaCard({
  idea,
  index,
  onCreateToken,
}: {
  idea: MemeIdea;
  index: number;
  onCreateToken: (idea: MemeIdea) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-zinc-600">#{index + 1}</span>
            <h3 className="font-mono text-base font-bold text-zinc-100">{idea.name}</h3>
            <span className="font-mono text-xs text-zinc-500">${idea.symbol}</span>
            <ConfidenceBadge pct={idea.confidencePct} />
            <CategoryBadge category={idea.category} />
          </div>

          <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">{idea.reason}</p>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Trend Score</div>
              <ScoreBar score={idea.trendScore} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Mentions</div>
              <div className="font-mono text-sm font-bold text-zinc-200">{formatEng(idea.mentionCount)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Growth</div>
              <div className="font-mono text-sm font-bold text-zinc-200">
                {idea.growthPct > 0 ? <GrowthBadge pct={idea.growthPct} /> : <span className="text-zinc-500">—</span>}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">First Seen</div>
              <div className="font-mono text-sm text-zinc-300">{formatAge(Date.now() - idea.firstDetected)}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Detected On</div>
            <div className="flex flex-wrap gap-1.5">
              {idea.platformsFound.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {sourceLabel(id)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600">Score</div>
            <div className="font-mono text-2xl font-black text-fuchsia-400">{idea.trendScore}</div>
          </div>
          <button
            onClick={() => onCreateToken(idea)}
            className="rounded-md bg-fuchsia-600 px-3 py-1.5 font-mono text-xs font-bold text-white transition-colors hover:bg-fuchsia-500 whitespace-nowrap"
          >
            Create Token
          </button>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {expanded ? '▾ Hide Evidence' : '▸ Show Evidence'}
      </button>

      {expanded && (
        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Evidence</div>
          <ul className="space-y-1">
            {idea.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                {e}
              </li>
            ))}
          </ul>
          {idea.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {idea.tags.map((t) => (
                <span key={t} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TrendingSuggestorProps {
  api: BundleApi;
}

export function TrendingSuggestor({ api }: TrendingSuggestorProps) {
  const { ideas, loading, lastRefresh, refresh } = useIntelDiscovery();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<MemeIdea | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateToken = useCallback((idea: MemeIdea) => {
    setSelectedIdea(idea);
    setModalOpen(true);
  }, []);

  const handleLaunch = useCallback((data: LaunchModalData) => {
    if (selectedIdea) {
      void api.launchMemeCoin(
        data.name,
        data.ticker,
        data.description,
        data.imageUrl,
        data.buyAmount,
      );
    }
    setModalOpen(false);
    setSelectedIdea(null);
  }, [api, selectedIdea]);

  const handleCancel = useCallback(() => {
    setModalOpen(false);
    setSelectedIdea(null);
  }, []);

  const handleCopy = useCallback(() => {
    if (ideas.length > 0) {
      const text = ideas.map((idea, i) =>
        `#${i + 1} ${idea.name} ($${idea.symbol})\nTrend Score: ${idea.trendScore}\nMentions: ${idea.mentionCount}\nGrowth: +${idea.growthPct}%\nPlatforms: ${idea.platformsFound.map(sourceLabel).join(', ')}\nConfidence: ${idea.confidencePct}%\nReason: ${idea.reason}`
      ).join('\n\n');
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [ideas]);

  const initialData = selectedIdea ? {
    name: selectedIdea.name,
    ticker: selectedIdea.symbol,
    description: selectedIdea.description,
    imageUrl: '',
  } : undefined;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-lg font-bold text-zinc-100">Meme Trend Intelligence</h2>
          <p className="text-xs text-zinc-500">
            Discovering viral meme ideas across 9 platforms before they become tokens
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-zinc-600">
              Updated {formatAge(Date.now() - lastRefresh)} ago
            </span>
          )}
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
          >
            {loading ? <Spinner className="h-3 w-3" /> : '↻ Refresh'}
          </button>
          <button
            onClick={handleCopy}
            disabled={ideas.length === 0}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-40"
          >
            {copied ? '✓ Copied!' : '⧉ Copy Report'}
          </button>
        </div>
      </div>

      {loading && ideas.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-800 py-20 text-sm text-zinc-600">
          <Spinner className="h-5 w-5" />
          Scanning 9 platforms for emerging meme trends...
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 py-20 text-center text-sm text-zinc-600">
          No trending meme ideas detected yet. Try refreshing.
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea, i) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              index={i}
              onCreateToken={handleCreateToken}
            />
          ))}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">How It Works</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-zinc-500">
          <div>
            <span className="font-semibold text-zinc-400">1. Scan</span> — Monitors Reddit, Telegram, Bluesky, Mastodon, Nitter, Crypto Forums, Discord, News, Community Boards for the last 24h
          </div>
          <div>
            <span className="font-semibold text-zinc-400">2. Detect</span> — Extracts frequently repeated words, new memes, viral jokes, characters, slang, AI/gaming/political trends, catchphrases, and rapidly rising topics
          </div>
          <div>
            <span className="font-semibold text-zinc-400">3. Score</span> — Calculates Meme Trend Score from mention frequency, growth velocity, cross-platform spread, unique authors, and engagement. Only ideas on 2+ platforms are shown.
          </div>
        </div>
      </div>

      <LaunchModal
        open={modalOpen}
        title={`Create Token: ${selectedIdea?.name ?? ''}`}
        initialData={initialData}
        busy={api.busy}
        onLaunch={handleLaunch}
        onCancel={handleCancel}
      />
    </div>
  );
}
