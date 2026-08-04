import { useState, useEffect, useCallback } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useIntelDiscovery } from '../hooks/useIntelDiscovery';
import { sourceLabel } from '../utils/intel/sources';
import { formatAge, formatEng } from '../utils/intel/time';
import type { MemeIdea } from '../utils/intel/types';
import { LaunchModal, type LaunchModalData } from './LaunchModal';
import { Spinner } from './Spinner';

// ── color palette preview ───────────────────────────────────────────
function ColorPalette({ colors }: { colors: string[] }) {
  return (
    <div className="flex gap-1">
      {colors.map((c, i) => (
        <div key={i} className="h-5 w-5 rounded-full border border-zinc-700" style={{ backgroundColor: c }} title={c} />
      ))}
    </div>
  );
}

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

// ── badges ──────────────────────────────────────────────────────────
function ConfidenceBadge({ pct }: { pct: number }) {
  const cls = pct >= 70 ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300' :
    pct >= 40 ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-300' :
    'border-zinc-700 bg-zinc-800 text-zinc-400';
  return <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${cls}`}>{pct}%</span>;
}

function CategoryBadge({ category }: { category: string }) {
  return <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">{category}</span>;
}

// ── logo placeholder ────────────────────────────────────────────────
function LogoPlaceholder({ name, colors }: { name: string; colors: string[] }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const bg = colors[0] ?? '#FFD700';
  const fg = colors[1] ?? '#000000';
  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-xl border border-zinc-700 font-mono text-lg font-black"
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials}
    </div>
  );
}

// ── idea card ───────────────────────────────────────────────────────
function IdeaCard({ idea, index, onCreateToken }: { idea: MemeIdea; index: number; onCreateToken: (i: MemeIdea) => void }) {
  const [expanded, setExpanded] = useState(false);
  const t = idea.token;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700">
      {/* header */}
      <div className="flex items-start gap-4">
        <LogoPlaceholder name={t.name} colors={t.colorPalette} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-zinc-600">#{index + 1}</span>
            <h3 className="font-mono text-base font-bold text-zinc-100">{t.name}</h3>
            <span className="font-mono text-xs font-semibold text-fuchsia-400">${t.symbol}</span>
            <ConfidenceBadge pct={idea.confidencePct} />
            <CategoryBadge category={idea.category} />
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-500">Narrative: {idea.narrative}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Score</div>
          <div className="font-mono text-3xl font-black text-fuchsia-400">{idea.trendScore}</div>
        </div>
      </div>

      {/* reason */}
      <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{idea.reason}</p>

      {/* stats grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
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
            {idea.growthPct > 0 ? <span className="text-emerald-400">+{idea.growthPct}%</span> : <span className="text-zinc-500">—</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Unique Authors</div>
          <div className="font-mono text-sm font-bold text-zinc-200">{idea.uniqueAuthors}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">First Seen</div>
          <div className="font-mono text-sm text-zinc-300">{formatAge(Date.now() - idea.firstDetected)}</div>
        </div>
      </div>

      {/* platforms */}
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

      {/* token details */}
      <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-3">AI Generated Token</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-zinc-600">Description: </span>
            <span className="text-zinc-300">{t.description}</span>
          </div>
          <div>
            <span className="text-zinc-600">Theme: </span>
            <span className="text-zinc-300">{t.theme}</span>
          </div>
          <div>
            <span className="text-zinc-600">Mascot: </span>
            <span className="text-zinc-300">{t.mascot}</span>
          </div>
          <div>
            <span className="text-zinc-600">Lore: </span>
            <span className="text-zinc-300">{t.lore}</span>
          </div>
          <div>
            <span className="text-zinc-600">Website Style: </span>
            <span className="text-zinc-300">{t.websiteStyle}</span>
          </div>
          <div>
            <span className="text-zinc-600">Social Bio: </span>
            <span className="text-zinc-300">{t.socialBio}</span>
          </div>
        </div>

        <div className="mt-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Color Palette: </span>
          <ColorPalette colors={t.colorPalette} />
        </div>

        <div className="mt-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Logo Prompt: </span>
          <span className="text-[11px] text-zinc-400 font-mono">{t.logoPrompt}</span>
        </div>
        <div className="mt-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Banner Prompt: </span>
          <span className="text-[11px] text-zinc-400 font-mono">{t.bannerPrompt}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {t.launchTags.map((tag) => (
            <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">#{tag}</span>
          ))}
        </div>
      </div>

      {/* expand evidence */}
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
        </div>
      )}

      {/* create token button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onCreateToken(idea)}
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
      void api.launchMemeCoin(data.name, data.ticker, data.description, data.imageUrl, data.buyAmount);
    }
    setModalOpen(false);
    setSelectedIdea(null);
  }, [api, selectedIdea]);

  const handleCancel = useCallback(() => { setModalOpen(false); setSelectedIdea(null); }, []);

  const handleCopy = useCallback(() => {
    if (ideas.length === 0) return;
    const text = ideas.map((idea, i) => {
      const t = idea.token;
      return `#${i + 1} ${t.name} ($${t.symbol})\nNarrative: ${idea.narrative}\nTrend Score: ${idea.trendScore}\nConfidence: ${idea.confidencePct}%\nMentions: ${idea.mentionCount} | Growth: +${idea.growthPct}% | Authors: ${idea.uniqueAuthors}\nPlatforms: ${idea.platformsFound.map(sourceLabel).join(', ')}\nDescription: ${t.description}\nTheme: ${t.theme}\nMascot: ${t.mascot}\nLogo Prompt: ${t.logoPrompt}\nBanner Prompt: ${t.bannerPrompt}\nTags: ${t.launchTags.join(', ')}\nReason: ${idea.reason}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [ideas]);

  const initialData = selectedIdea ? {
    name: selectedIdea.token.name,
    ticker: selectedIdea.token.symbol,
    description: selectedIdea.token.description,
    imageUrl: '',
    theme: selectedIdea.token.theme,
    tags: selectedIdea.token.launchTags.join(', '),
    logoPrompt: selectedIdea.token.logoPrompt,
    bannerPrompt: selectedIdea.token.bannerPrompt,
  } : undefined;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-lg font-bold text-zinc-100">AI Meme Narrative Engine</h2>
          <p className="text-xs text-zinc-500">
            Discovering viral narratives across 12 platforms before they become tokens
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-zinc-600">Updated {formatAge(Date.now() - lastRefresh)} ago</span>
          )}
          <button onClick={() => void refresh()} disabled={loading}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-40">
            {loading ? <Spinner className="h-3 w-3" /> : '↻ Refresh'}
          </button>
          <button onClick={handleCopy} disabled={ideas.length === 0}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-40">
            {copied ? '✓ Copied!' : '⧉ Copy Report'}
          </button>
        </div>
      </div>

      {loading && ideas.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-24 text-sm text-zinc-600">
          <Spinner className="h-5 w-5" />
          Scanning 12 platforms for emerging viral narratives...
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-24 text-center text-sm text-zinc-600">
          No viral narratives detected yet. Try refreshing.
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea, i) => (
            <IdeaCard key={idea.id} idea={idea} index={i} onCreateToken={handleCreateToken} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-3">How It Works</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs text-zinc-500">
          <div><span className="font-semibold text-zinc-400">1. Collect</span> — Monitors Reddit, Telegram, Bluesky, Mastodon, Nitter, Crypto/AI/Gaming/Tech/Entertainment News, Meme Sites, Public Forums</div>
          <div><span className="font-semibold text-zinc-400">2. Analyze</span> — Extracts repeated words, viral jokes, slang, characters, AI/gaming/political trends, catchphrases, and rapidly rising topics</div>
          <div><span className="font-semibold text-zinc-400">3. Score</span> — Meme Trend Score from mention frequency, growth, velocity, cross-platform spread, unique authors, and engagement</div>
          <div><span className="font-semibold text-zinc-400">4. Generate</span> — For each strong narrative, auto-generates token name, ticker, description, theme, lore, mascot, color palette, logo/banner prompts, website style, social bio, launch tags</div>
          <div><span className="font-semibold text-zinc-400">5. Launch</span> — Click "Create Token" to pre-fill everything. Zero typing required.</div>
        </div>
      </div>

      <LaunchModal
        open={modalOpen}
        title={`Create Token: ${selectedIdea?.token.name ?? ''}`}
        initialData={initialData}
        busy={api.busy}
        onLaunch={handleLaunch}
        onCancel={handleCancel}
      />
    </div>
  );
}
