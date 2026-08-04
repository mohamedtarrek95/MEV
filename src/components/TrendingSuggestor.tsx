import { useState, useCallback } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useIntelDiscovery, generateToken } from '../hooks/useIntelDiscovery';
import { sourceLabel } from '../utils/intel/sources';
import type { MemeNarrative } from '../utils/intel/types';
import { LaunchModal, type LaunchModalData } from './LaunchModal';
import { IntelAdminPanel } from './IntelAdminPanel';
import { Spinner } from './Spinner';

// ── score bar ───────────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(score, 100);
  const color = pct >= 80 ? 'bg-fuchsia-500' : pct >= 60 ? 'bg-cyan-500' : pct >= 40 ? 'bg-emerald-500' : 'bg-zinc-500';
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
  const cls = pct >= 70 ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300' :
    pct >= 40 ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-300' :
    'border-zinc-700 bg-zinc-800 text-zinc-400';
  return <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${cls}`}>{pct}%</span>;
}

function CategoryBadge({ category }: { category: string }) {
  return <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">{category}</span>;
}

// ── narrative card ──────────────────────────────────────────────────
function NarrativeCard({ narrative, index, onCreateToken }: { narrative: MemeNarrative; index: number; onCreateToken: (n: MemeNarrative) => void }) {
  const [expanded, setExpanded] = useState(false);
  const token = generateToken(narrative);
  const initials = token.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 font-mono text-sm font-black text-zinc-300">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-zinc-600">#{index + 1}</span>
            <h3 className="font-mono text-base font-bold text-zinc-100">{narrative.narrative}</h3>
            <span className="font-mono text-xs font-semibold text-fuchsia-400">${token.symbol}</span>
            <ConfidenceBadge pct={narrative.confidencePct} />
            <CategoryBadge category={narrative.category} />
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Score</div>
          <div className="font-mono text-3xl font-black text-fuchsia-400">{narrative.trendScore}</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{narrative.reason}</p>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Trend Score</div>
          <ScoreBar score={narrative.trendScore} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Mentions</div>
          <div className="font-mono text-sm font-bold text-zinc-200">{narrative.mentionCount}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Growth</div>
          <div className="font-mono text-sm font-bold text-zinc-200">
            {narrative.growthPct > 0 ? <span className="text-emerald-400">+{narrative.growthPct}%</span> : <span className="text-zinc-500">—</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Unique Authors</div>
          <div className="font-mono text-sm font-bold text-zinc-200">{narrative.uniqueAuthors}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">First Seen</div>
          <div className="font-mono text-sm text-zinc-300">
            {Math.round((Date.now() - narrative.firstDetected) / 3600000)}h ago
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Detected On</div>
        <div className="flex flex-wrap gap-1.5">
          {narrative.sourcesFound.map((src) => (
            <span key={src} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {sourceLabel(src)}
            </span>
          ))}
        </div>
      </div>

      {narrative.topPostTitles.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Top Posts</div>
          <ul className="space-y-0.5">
            {narrative.topPostTitles.map((t, i) => (
              <li key={i} className="text-[11px] text-zinc-500 truncate">• {t}</li>
            ))}
          </ul>
        </div>
      )}

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
            {narrative.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                {e}
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-zinc-800 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">AI Generated Token</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
              <div><span className="text-zinc-600">Name: </span><span className="text-zinc-300">{token.name}</span></div>
              <div><span className="text-zinc-600">Symbol: </span><span className="text-zinc-300">{token.symbol}</span></div>
              <div><span className="text-zinc-600">Theme: </span><span className="text-zinc-300">{token.theme}</span></div>
              <div><span className="text-zinc-600">Mascot: </span><span className="text-zinc-300">{token.mascot}</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onCreateToken(narrative)}
          className="rounded-lg bg-fuchsia-600 px-5 py-2 font-mono text-sm font-bold text-white transition-colors hover:bg-fuchsia-500"
        >
          Create Token
        </button>
      </div>
    </div>
  );
}

// ── main component ──────────────────────────────────────────────────
interface TrendingSuggestorProps { api: BundleApi }

export function TrendingSuggestor({ api }: TrendingSuggestorProps) {
  const { narratives, loading, error, lastRefresh, refresh, isScraping } = useIntelDiscovery();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedNarrative, setSelectedNarrative] = useState<MemeNarrative | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleCreateToken = useCallback((n: MemeNarrative) => {
    setSelectedNarrative(n);
    setModalOpen(true);
  }, []);

  const handleLaunch = useCallback((data: LaunchModalData) => {
    if (selectedNarrative) {
      void api.launchMemeCoin(data.name, data.ticker, data.description, data.imageUrl, data.buyAmount);
    }
    setModalOpen(false);
    setSelectedNarrative(null);
  }, [api, selectedNarrative]);

  const handleCancel = useCallback(() => { setModalOpen(false); setSelectedNarrative(null); }, []);

  const handleCopy = useCallback(() => {
    if (narratives.length === 0) return;
    const text = narratives.map((n, i) => {
      const t = generateToken(n);
      return `#${i + 1} ${n.narrative} ($${t.symbol})\nTrend Score: ${n.trendScore}\nConfidence: ${n.confidencePct}%\nMentions: ${n.mentionCount} | Growth: +${n.growthPct}% | Authors: ${n.uniqueAuthors}\nSources: ${n.sourcesFound.map(sourceLabel).join(', ')}\nReason: ${n.reason}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [narratives]);

  const initialData = selectedNarrative ? (() => {
    const t = generateToken(selectedNarrative);
    return { name: t.name, ticker: t.symbol, description: t.description, imageUrl: '', theme: t.theme, tags: t.launchTags.join(', '), logoPrompt: t.logoPrompt, bannerPrompt: t.bannerPrompt };
  })() : undefined;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-lg font-bold text-zinc-100">Meme Narrative Engine</h2>
          <p className="text-xs text-zinc-500">
            Auto-collecting real viral narratives from public sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isScraping && (
            <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
              <Spinner className="h-2.5 w-2.5" />
              Scraping...
            </span>
          )}
          {lastRefresh && (
            <span className="text-[10px] text-zinc-600">
              Updated {Math.round((Date.now() - lastRefresh) / 60000)}m ago
            </span>
          )}
          <button onClick={() => void refresh()} disabled={loading}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-40">
            {loading ? <Spinner className="h-3 w-3" /> : '↻ Refresh'}
          </button>
          <button onClick={handleCopy} disabled={narratives.length === 0}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-40">
            {copied ? '✓ Copied!' : '⧉ Copy Report'}
          </button>
          <button onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${showDiagnostics ? 'border-fuchsia-500/40 bg-fuchsia-950/30 text-fuchsia-300' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}>
            {showDiagnostics ? '✕ Close' : '⚙ Diagnostics'}
          </button>
        </div>
      </div>

      {showDiagnostics && (
        <div className="mb-6">
          <IntelAdminPanel />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-300">
          {error}
        </div>
      )}

      {loading && narratives.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-24 text-sm text-zinc-600">
          <Spinner className="h-5 w-5" />
          {isScraping ? 'Collecting real data from public sources... This may take a moment on first load.' : 'Loading...'}
        </div>
      ) : narratives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-24 text-center text-sm text-zinc-600">
          {error || 'No verified meme narratives found during the last 24 hours.'}
        </div>
      ) : (
        <div className="space-y-4">
          {narratives.map((n, i) => (
            <NarrativeCard key={n.id} narrative={n} index={i} onCreateToken={handleCreateToken} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-3">How It Works</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs text-zinc-500">
          <div><span className="font-semibold text-zinc-400">1. Auto-Collect</span> — API scrapes Reddit, Bluesky, Hacker News, DexScreener, CoinGecko, GitHub on every request (no manual worker needed)</div>
          <div><span className="font-semibold text-zinc-400">2. Analyze</span> — Normalizes text, extracts phrases, clusters similar topics, detects patterns using fuzzy matching</div>
          <div><span className="font-semibold text-zinc-400">3. Score</span> — Trend Score from mentions, growth, velocity, cross-platform spread, freshness. Confidence from real evidence only.</div>
          <div><span className="font-semibold text-zinc-400">4. Create</span> — Click "Create Token" to auto-generate name, ticker, description, mascot, and prompts</div>
        </div>
      </div>

      <LaunchModal
        open={modalOpen}
        title={`Create Token: ${selectedNarrative?.narrative ?? ''}`}
        initialData={initialData}
        busy={api.busy}
        onLaunch={handleLaunch}
        onCancel={handleCancel}
      />
    </div>
  );
}
