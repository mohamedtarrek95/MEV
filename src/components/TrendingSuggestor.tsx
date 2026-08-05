import { useState, useCallback } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useIntelDiscovery, getScoreColor, getScoreBg } from '../hooks/useIntelDiscovery';
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
            <span className="rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
              {concept.catalystCategory.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
              {concept.detectedEmotion.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">{concept.oneSentence}</p>
          <p className="mt-0.5 text-[11px] italic text-zinc-500">"{concept.catchphrase}"</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Launch Score</div>
          <div className={`font-mono text-3xl font-black ${getScoreColor(concept.launchScore)}`}>{concept.launchScore}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">Existing</div>
          <div className="font-mono text-sm font-bold text-zinc-400">{concept.existingTokens}</div>
        </div>
      </div>

      {/* Catalyst + Emotion + Why */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-md border border-amber-500/20 bg-amber-950/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-1">Crypto Catalyst</div>
          <p className="text-[11px] text-amber-300/80 leading-relaxed">{concept.cryptoCatalyst}</p>
        </div>
        <div className="rounded-md border border-fuchsia-500/20 bg-fuchsia-950/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-fuchsia-500 mb-1">Detected Emotion</div>
          <p className="text-[11px] text-fuchsia-300/80 leading-relaxed">{concept.detectedEmotion}</p>
        </div>
        <div className="rounded-md border border-cyan-500/20 bg-cyan-950/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-cyan-500 mb-1">Why This Could Go Viral</div>
          <p className="text-[11px] text-cyan-300/80 leading-relaxed">{concept.whyFunny}</p>
        </div>
      </div>

      {/* Backstory */}
      <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Backstory</div>
        <p className="text-[11px] text-zinc-300 leading-relaxed">{concept.backstory}</p>
      </div>

      {/* Core Joke */}
      <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Core Joke</div>
        <p className="text-[11px] text-zinc-300 leading-relaxed">{concept.coreJoke}</p>
      </div>

      {/* Scores */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <ScoreBar score={concept.originality} label="Originality" />
        <ScoreBar score={concept.virality} label="Virality" />
        <ScoreBar score={concept.visualPotential} label="Visual" />
        <ScoreBar score={concept.storyStrength} label="Story" />
        <ScoreBar score={concept.memePotential} label="Meme" />
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <ScoreBar score={concept.communityPotential} label="Community" />
        <ScoreBar score={concept.brandability} label="Brand" />
        <ScoreBar score={concept.cryptoRelevance} label="Crypto Rel." />
        <ScoreBar score={100 - concept.competition} label="Low Comp." />
        <ScoreBar score={concept.launchTiming} label="Timing" />
      </div>

      {/* Mascot + Visual + Logo */}
      <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Visual Identity</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px]">
          <div><span className="text-zinc-600">Mascot: </span><span className="text-zinc-300">{concept.mascot}</span></div>
          <div><span className="text-zinc-600">Style: </span><span className="text-zinc-300">{concept.visualIdentity}</span></div>
          <div><span className="text-zinc-600">Logo: </span><span className="text-zinc-300">{concept.logoIdea}</span></div>
        </div>
      </div>

      {/* Community Nickname */}
      <div className="mt-2 text-[11px]">
        <span className="text-zinc-600">Community Nickname: </span>
        <span className="font-bold text-zinc-300">{concept.communityNickname}</span>
      </div>

      {/* Target + Recommendation */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div><span className="text-zinc-600">Target Audience: </span><span className="text-zinc-300">{concept.targetAudience}</span></div>
        <div><span className="text-zinc-600">Launch Rec: </span>
          <span className={concept.launchRecommendation.includes('NOW') ? 'text-emerald-400 font-bold' : 'text-yellow-400'}>
            {concept.launchRecommendation}
          </span>
        </div>
      </div>

      {/* Why People Buy */}
      <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Why Would People Buy This?</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
          <div><span className="text-zinc-600">Funny: </span><span className="text-zinc-400">{concept.whyFunny}</span></div>
          <div><span className="text-zinc-600">Relatable: </span><span className="text-zinc-400">{concept.whyRelatable}</span></div>
          <div><span className="text-zinc-600">Crypto-native: </span><span className="text-zinc-400">{concept.whyCryptoNative}</span></div>
          <div><span className="text-zinc-600">Memeable: </span><span className="text-zinc-400">{concept.whyPeoplePostMemes}</span></div>
          <div><span className="text-zinc-600">Shareable: </span><span className="text-zinc-400">{concept.whyInfluencersShare}</span></div>
          <div><span className="text-zinc-600">Competition: </span><span className="text-zinc-400">{concept.competitionNote}</span></div>
        </div>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {expanded ? '▾ Hide' : '▸ Show Evidence & Image Prompt'}
      </button>

      {expanded && (
        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
          {concept.supportingPosts.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Evidence</div>
              <ul className="space-y-1">
                {concept.supportingPosts.map((p, i) => (
                  <li key={i} className="text-[10px] text-zinc-500">
                    <span className="text-zinc-400">{p.title}</span>
                    <span className="text-zinc-600"> — {sourceLabel(p.source)} ({p.engagement} eng)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="border-t border-zinc-800 pt-2 mb-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Image Prompt</div>
            <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">{concept.imagePrompt}</p>
          </div>
          <div className="border-t border-zinc-800 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Banner Prompt</div>
            <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">{concept.bannerPrompt}</p>
          </div>
          {concept.sourcesScanned.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Sources</div>
              <div className="flex flex-wrap gap-1.5">
                {concept.sourcesScanned.map((src) => (
                  <span key={src} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {sourceLabel(src)}
                  </span>
                ))}
              </div>
            </div>
          )}
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
      return `#${i + 1} ${c.name} (${c.ticker})\nLaunch Score: ${c.launchScore}\nCatalyst: ${c.cryptoCatalyst}\nEmotion: ${c.detectedEmotion}\nBackstory: ${c.backstory}\nCore Joke: ${c.coreJoke}\nCatchphrase: "${c.catchphrase}"\nMascot: ${c.mascot}\nWhy: ${c.whyFunny}\nCompetition: ${c.existingTokens} existing`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [concepts]);

  const initialData = selectedConcept ? {
    name: selectedConcept.name,
    ticker: selectedConcept.ticker,
    description: selectedConcept.oneSentence,
    imageUrl: '',
    theme: selectedConcept.catalystCategory,
    tags: selectedConcept.name.toLowerCase(),
    logoPrompt: selectedConcept.imagePrompt,
    bannerPrompt: selectedConcept.bannerPrompt,
  } : undefined;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-lg font-bold text-zinc-100">Crypto Meme Creation Engine</h2>
          <p className="text-xs text-zinc-500">
            Inventing original Solana meme coins from real crypto events
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
          {isScraping ? 'Scanning crypto communities for catalysts and reactions...' : 'Loading...'}
        </div>
      ) : concepts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-24 text-center text-sm text-zinc-600">
          {error || 'No high-conviction concepts found. The engine only returns ideas worth launching.'}
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-950/10 px-4 py-2 text-xs text-emerald-300">
            {concepts.length} original concept{concepts.length !== 1 ? 's' : ''} from {new Set(concepts.map((c) => c.catalystCategory)).size} crypto catalyst{new Set(concepts.map((c) => c.catalystCategory)).size !== 1 ? 's' : ''}
          </div>
          <div className="space-y-4">
            {concepts.map((c, i) => (
              <ConceptCard key={c.id} concept={c} index={i} onCreateToken={handleCreateToken} />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-3">How It Works</div>
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 text-[10px] text-zinc-500">
          <div><span className="font-semibold text-zinc-400">1. Detect</span> — Real crypto catalysts from communities</div>
          <div><span className="font-semibold text-zinc-400">2. Emotions</span> — What people are feeling about it</div>
          <div><span className="font-semibold text-zinc-400">3. Reactions</span> — Jokes, sarcasm, nicknames</div>
          <div><span className="font-semibold text-zinc-400">4. Characters</span> — Invent a memeable character</div>
          <div><span className="font-semibold text-zinc-400">5. Identity</span> — Name, ticker, story, mascot</div>
          <div><span className="font-semibold text-zinc-400">6. Quality</span> — "Would I spend 2 SOL?"</div>
          <div><span className="font-semibold text-zinc-400">7. Launch</span> — Create Token auto-generates everything</div>
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
