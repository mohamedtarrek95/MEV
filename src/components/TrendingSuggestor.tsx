import { useState, useCallback } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useIntelDiscovery, getScoreColor, getScoreBg, getChanceColor } from '../hooks/useIntelDiscovery';
import { sourceLabel } from '../utils/intel/sources';
import type { MemeConcept } from '../utils/intel/types';
import { LaunchModal, type LaunchModalData } from './LaunchModal';
import { IntelAdminPanel } from './IntelAdminPanel';
import { Spinner } from './Spinner';

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.min(score, 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>
        <span className={`font-mono text-xs font-bold ${getScoreColor(score)}`}>{score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${getScoreBg(score)} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">{label}</div>
      <div className={`font-mono text-sm font-bold ${color ?? 'text-zinc-200'}`}>{value}</div>
    </div>
  );
}

function ConceptCard({ concept, index, onCreateToken }: { concept: MemeConcept; index: number; onCreateToken: (c: MemeConcept) => void }) {
  const [expanded, setExpanded] = useState(false);
  const rankBadge = index < 3
    ? 'border-fuchsia-500/50 bg-fuchsia-950/50 text-fuchsia-300'
    : index < 7
    ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
    : 'border-zinc-700 bg-zinc-800 text-zinc-400';

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg border font-mono text-xs font-black ${rankBadge}`}>
            #{index + 1}
          </span>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 font-mono text-xs font-black text-zinc-300">
            {concept.ticker}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-mono text-base font-bold text-zinc-100">{concept.name}</h3>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${getChanceColor(concept.estimatedChance)}`}>
              {concept.estimatedChance.toUpperCase()} CHANCE
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">{concept.oneSentence}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Launch Score</div>
          <div className={`font-mono text-3xl font-black ${getScoreColor(concept.launchScore)}`}>{concept.launchScore}</div>
        </div>
      </div>

      {/* Core Joke + Emotion */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-md border border-fuchsia-500/20 bg-fuchsia-950/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-fuchsia-500 mb-1">Core Joke</div>
          <p className="text-[11px] text-fuchsia-300/80 leading-relaxed">{concept.coreJoke}</p>
        </div>
        <div className="rounded-md border border-cyan-500/20 bg-cyan-950/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-cyan-500 mb-1">Core Emotion</div>
          <p className="text-[11px] text-cyan-300/80 leading-relaxed">{concept.coreEmotion}</p>
        </div>
      </div>

      {/* Competition */}
      <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-950/20 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-1">Competition</div>
        <div className="flex items-center gap-4 text-[11px]">
          <div><span className="text-zinc-600">Existing Tokens: </span><span className="text-zinc-300">{concept.existingTokens}</span></div>
          <div><span className="text-zinc-600">Level: </span><span className={getScoreColor(100 - concept.competitionLevel)}>{concept.competitionLevel <= 20 ? 'Low' : concept.competitionLevel <= 40 ? 'Medium' : 'High'}</span></div>
        </div>
        <p className="mt-1 text-[10px] text-amber-300/60">{concept.competitionNote}</p>
      </div>

      {/* Scores */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ScoreBar score={concept.originalityScore} label="Originality" />
        <ScoreBar score={concept.viralityScore} label="Virality" />
        <ScoreBar score={concept.visualPotential} label="Visual" />
        <ScoreBar score={concept.narrativeStrength} label="Narrative" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <ScoreBar score={concept.brandability} label="Brandability" />
        <ScoreBar score={concept.communityFit} label="Community" />
        <ScoreBar score={100 - concept.competitionLevel} label="Low Competition" />
      </div>

      {/* Target + Audience */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div><span className="text-zinc-600">Target Audience: </span><span className="text-zinc-300">{concept.targetAudience}</span></div>
        <div><span className="text-zinc-600">Community Type: </span><span className="text-zinc-300">{concept.communityType}</span></div>
      </div>

      {/* Visual Identity */}
      <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Visual Identity</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
          <div><span className="text-zinc-600">Mascot: </span><span className="text-zinc-300">{concept.mascot}</span></div>
          <div><span className="text-zinc-600">Style: </span><span className="text-zinc-300">{concept.visualStyle}</span></div>
          <div className="sm:col-span-2"><span className="text-zinc-600">Logo: </span><span className="text-zinc-300">{concept.logoConcept}</span></div>
        </div>
      </div>

      {/* Narrative Origin */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Narrative Origin</div>
        <p className="text-[11px] text-zinc-500">{concept.narrative} — {concept.narrativeContext.slice(0, 200)}</p>
      </div>

      {/* Sources */}
      {concept.sourcesScanned.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Detected On</div>
          <div className="flex flex-wrap gap-1.5">
            {concept.sourcesScanned.map((src) => (
              <span key={src} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {sourceLabel(src)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {expanded ? '▾ Hide Details' : '▸ Show Evidence & Image Prompt'}
      </button>

      {expanded && (
        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
          {/* Supporting Signals */}
          {concept.supportingSignals.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Supporting Signals</div>
              <ul className="space-y-0.5">
                {concept.supportingSignals.slice(0, 5).map((s, i) => (
                  <li key={i} className="text-[11px] text-zinc-500 truncate">• {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Evidence Posts */}
          {concept.postsUsed.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Evidence Posts</div>
              <ul className="space-y-1">
                {concept.postsUsed.map((p, i) => (
                  <li key={i} className="text-[10px] text-zinc-500">
                    <span className="text-zinc-400">{p.title}</span>
                    <span className="text-zinc-600"> — {sourceLabel(p.source)} ({p.engagement} eng)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Image Prompt */}
          <div className="border-t border-zinc-800 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">AI Image Prompt</div>
            <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">{concept.imagePrompt}</p>
          </div>
        </div>
      )}

      {/* Create Token Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onCreateToken(concept)}
          className="rounded-lg bg-fuchsia-600 px-5 py-2 font-mono text-sm font-bold text-white transition-colors hover:bg-fuchsia-500"
        >
          Create Token
        </button>
      </div>
    </div>
  );
}

interface TrendingSuggestorProps { api: BundleApi }

export function TrendingSuggestor({ api }: TrendingSuggestorProps) {
  const { concepts, loading, error, lastRefresh, refresh, isScraping } = useIntelDiscovery();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<MemeConcept | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleCreateToken = useCallback((c: MemeConcept) => {
    setSelectedConcept(c);
    setModalOpen(true);
  }, []);

  const handleLaunch = useCallback((data: LaunchModalData) => {
    if (selectedConcept) {
      void api.launchMemeCoin(data.name, data.ticker, data.description, data.imageUrl, data.buyAmount);
    }
    setModalOpen(false);
    setSelectedConcept(null);
  }, [api, selectedConcept]);

  const handleCancel = useCallback(() => { setModalOpen(false); setSelectedConcept(null); }, []);

  const handleCopy = useCallback(() => {
    if (concepts.length === 0) return;
    const text = concepts.map((c, i) => {
      return `#${i + 1} ${c.name} (${c.ticker})\nLaunch Score: ${c.launchScore} | Chance: ${c.estimatedChance}\nOne-liner: ${c.oneSentence}\nCore Joke: ${c.coreJoke}\nCore Emotion: ${c.coreEmotion}\nCompetition: ${c.existingTokens} existing tokens\nOriginality: ${c.originalityScore} | Virality: ${c.viralityScore} | Visual: ${c.visualPotential}\nBrandability: ${c.brandability} | Community: ${c.communityFit}\nMascot: ${c.mascot}\nImage Prompt: ${c.imagePrompt}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [concepts]);

  const initialData = selectedConcept ? {
    name: selectedConcept.name,
    ticker: selectedConcept.ticker,
    description: selectedConcept.oneSentence,
    imageUrl: '',
    theme: selectedConcept.narrative,
    tags: selectedConcept.name.toLowerCase(),
    logoPrompt: selectedConcept.imagePrompt,
    bannerPrompt: selectedConcept.imagePrompt,
  } : undefined;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-lg font-bold text-zinc-100">Crypto Meme Creation Engine</h2>
          <p className="text-xs text-zinc-500">
            Inventing NEW meme coin concepts — not detecting existing ones
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isScraping && (
            <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
              <Spinner className="h-2.5 w-2.5" />
              Scanning...
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
          <button onClick={handleCopy} disabled={concepts.length === 0}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-40">
            {copied ? '✓ Copied!' : '⧉ Copy Report'}
          </button>
          <button onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${showDiagnostics ? 'border-fuchsia-500/40 bg-fuchsia-950/30 text-fuchsia-300' : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}>
            {showDiagnostics ? '✕ Close' : '⚙ Diagnostics'}
          </button>
        </div>
      </div>

      {showDiagnostics && <div className="mb-6"><IntelAdminPanel /></div>}

      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-xs text-amber-300">
          {error}
        </div>
      )}

      {loading && concepts.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-24 text-sm text-zinc-600">
          <Spinner className="h-5 w-5" />
          {isScraping ? 'Scanning crypto communities for emerging narratives...' : 'Loading...'}
        </div>
      ) : concepts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-24 text-center text-sm text-zinc-600">
          {error || 'No concepts found. The engine is scanning for emerging narratives.'}
        </div>
      ) : (
        <div className="space-y-4">
          {concepts.map((c, i) => (
            <ConceptCard key={c.id} concept={c} index={i} onCreateToken={handleCreateToken} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-3">How It Works</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs text-zinc-500">
          <div><span className="font-semibold text-zinc-400">1. Collect</span> — Scans crypto Twitter, Reddit, Bluesky for emerging narratives and frustrations</div>
          <div><span className="font-semibold text-zinc-400">2. Detect Narratives</span> — Finds themes like "gas fee frustration" or "AI anxiety" — NOT existing meme coins</div>
          <div><span className="font-semibold text-zinc-400">3. Invent Concepts</span> — Creates NEW meme coin ideas from each narrative: name, ticker, joke, mascot, image prompt</div>
          <div><span className="font-semibold text-zinc-400">4. Score for Launch</span> — Originality 25%, Virality 20%, Visual 15%, Narrative 15%, Brand 10%, Community 10%, Competition 5%</div>
          <div><span className="font-semibold text-zinc-400">5. Launch</span> — Top 15 concepts ranked by launch score. Click "Create Token" to auto-generate everything.</div>
        </div>
      </div>

      <LaunchModal
        open={modalOpen}
        title={`Create Token: ${selectedConcept?.name ?? ''}`}
        initialData={initialData}
        busy={api.busy}
        onLaunch={handleLaunch}
        onCancel={handleCancel}
      />
    </div>
  );
}
