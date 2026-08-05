import { useState, useCallback } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useIntelDiscovery, getScoreColor, getCompetitionColor, getRecommendationColor, getRecommendationLabel } from '../hooks/useIntelDiscovery';
import { sourceLabel } from '../utils/intel/sources';
import type { LaunchOpportunity } from '../utils/intel/types';
import { LaunchModal, type LaunchModalData } from './LaunchModal';
import { IntelAdminPanel } from './IntelAdminPanel';
import { Spinner } from './Spinner';

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

function OpportunityCard({ opportunity, index, onCreateToken }: { opportunity: LaunchOpportunity; index: number; onCreateToken: (o: LaunchOpportunity) => void }) {
  const [expanded, setExpanded] = useState(false);
  const rankBadgeColor = index < 3 ? 'border-fuchsia-500/50 bg-fuchsia-950/50 text-fuchsia-300'
    : index < 7 ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
    : 'border-zinc-700 bg-zinc-800 text-zinc-400';
  const competition = opportunity.competition;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg border font-mono text-xs font-black ${rankBadgeColor}`}>
            #{index + 1}
          </span>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 font-mono text-sm font-black text-zinc-300">
            {opportunity.canonicalEntity.slice(0, 4)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-mono text-base font-bold text-zinc-100">{opportunity.narrative}</h3>
            <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${getRecommendationColor(competition.recommendation)}`}>
              {getRecommendationLabel(competition.recommendation)}
            </span>
          </div>
          {opportunity.aliases.length > 1 && (
            <div className="mt-1 text-[10px] text-zinc-600">
              Aliases: {opportunity.aliases.join(', ')}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Launch Score</div>
          <div className={`font-mono text-3xl font-black ${getScoreColor(opportunity.launchScore)}`}>{opportunity.launchScore}</div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mt-1">Probability</div>
          <div className="font-mono text-lg font-bold text-zinc-400">{opportunity.launchProbability}%</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{opportunity.reason}</p>

      {opportunity.whySelected && (
        <div className="mt-2 rounded-md border border-fuchsia-500/20 bg-fuchsia-950/20 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-fuchsia-500 mb-1">Why This Opportunity Exists</div>
          <p className="text-[11px] text-fuchsia-300/80 leading-relaxed">{opportunity.whySelected}</p>
        </div>
      )}

      {/* Competition Section */}
      <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-950/20 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-amber-500 mb-1">Competition Analysis</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div><span className="text-zinc-600">Existing Tokens: </span><span className={getCompetitionColor(competition.saturation)}>{competition.existingTokens.toLocaleString()}</span></div>
          <div><span className="text-zinc-600">Dead Tokens: </span><span className="text-zinc-400">{competition.deadTokens.toLocaleString()}</span></div>
          <div><span className="text-zinc-600">Successful: </span><span className="text-emerald-400">{competition.successfulTokens}</span></div>
          <div><span className="text-zinc-600">Saturation: </span><span className={getCompetitionColor(competition.saturation)}>{competition.saturation}</span></div>
        </div>
        <p className="mt-1 text-[10px] text-amber-300/60">{competition.recommendationReason}</p>
      </div>

      {/* Core Scores */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Virality</div>
          <ScoreBar score={opportunity.viralityScore} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Meme Strength</div>
          <ScoreBar score={opportunity.memeStrength} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Community</div>
          <ScoreBar score={opportunity.communityDiversity} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Originality</div>
          <ScoreBar score={opportunity.originalityScore} />
        </div>
      </div>

      {/* Secondary Scores */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Image Potential</div>
          <div className="font-mono text-sm font-bold text-zinc-200">{opportunity.imagePotential}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Brandability</div>
          <div className="font-mono text-sm font-bold text-zinc-200">{opportunity.brandability}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Ticker Quality</div>
          <div className="font-mono text-sm font-bold text-zinc-200">{opportunity.tickerQuality}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Momentum</div>
          <div className="font-mono text-sm font-bold text-zinc-200">{opportunity.momentum}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">First Seen</div>
          <div className="font-mono text-sm text-zinc-300">{Math.round((Date.now() - opportunity.firstDetected) / 3600000)}h ago</div>
        </div>
      </div>

      {/* Mentions & Growth */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Mentions</div>
          <div className="font-mono text-sm font-bold text-zinc-200">{opportunity.mentionCount}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Unique Authors</div>
          <div className="font-mono text-sm font-bold text-zinc-200">{opportunity.uniqueAuthors}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Growth</div>
          <div className="font-mono text-sm font-bold">
            {opportunity.growthVelocity > 0 ? <span className="text-emerald-400">+{opportunity.growthVelocity}%</span> : <span className="text-zinc-500">—</span>}
          </div>
        </div>
      </div>

      {/* Platforms */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Detected On</div>
        <div className="flex flex-wrap gap-1.5">
          {opportunity.sourcesFound.map((src) => (
            <span key={src} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {sourceLabel(src)}
            </span>
          ))}
        </div>
      </div>

      {/* Top Posts */}
      {opportunity.topPostTitles.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Top Posts</div>
          <ul className="space-y-0.5">
            {opportunity.topPostTitles.map((t, i) => (
              <li key={i} className="text-[11px] text-zinc-500 truncate">• {t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-[10px] uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        {expanded ? '▾ Hide Details' : '▸ Show Evidence & Token Preview'}
      </button>

      {expanded && (
        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 p-3">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">Evidence</div>
          <ul className="space-y-1">
            {opportunity.evidence.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                {e}
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-zinc-800 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">Launch Metrics</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[11px]">
              <div><span className="text-zinc-600">Category: </span><span className="text-zinc-300">{opportunity.category}</span></div>
              <div><span className="text-zinc-600">Cross-Platform: </span><span className="text-zinc-300">{opportunity.crossPlatformSpread}%</span></div>
              <div><span className="text-zinc-600">Mascot Potential: </span><span className="text-zinc-300">{opportunity.mascotPotential}%</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onCreateToken(opportunity)}
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
  const { opportunities, loading, error, lastRefresh, refresh, isScraping } = useIntelDiscovery();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<LaunchOpportunity | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const handleCreateToken = useCallback((o: LaunchOpportunity) => {
    setSelectedOpportunity(o);
    setModalOpen(true);
  }, []);

  const handleLaunch = useCallback((data: LaunchModalData) => {
    if (selectedOpportunity) {
      void api.launchMemeCoin(data.name, data.ticker, data.description, data.imageUrl, data.buyAmount);
    }
    setModalOpen(false);
    setSelectedOpportunity(null);
  }, [api, selectedOpportunity]);

  const handleCancel = useCallback(() => { setModalOpen(false); setSelectedOpportunity(null); }, []);

  const handleCopy = useCallback(() => {
    if (opportunities.length === 0) return;
    const text = opportunities.map((o, i) => {
      return `#${i + 1} ${o.narrative} (${o.canonicalEntity})\nLaunch Score: ${o.launchScore} | Probability: ${o.launchProbability}%\nCompetition: ${o.competition.saturation} (${o.competition.existingTokens} tokens)\nRecommendation: ${o.competition.recommendation}\nMentions: ${o.mentionCount} | Authors: ${o.uniqueAuthors} | Growth: +${o.growthVelocity}%\nPlatforms: ${o.sourcesFound.join(', ')}\nWhy: ${o.whySelected}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [opportunities]);

  const initialData = selectedOpportunity ? (() => {
    const name = selectedOpportunity.narrative;
    const symbol = name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 6);
    return { name, ticker: symbol, description: `${name} is a meme coin born from the viral ${selectedOpportunity.canonicalEntity} trend.`, imageUrl: '', theme: selectedOpportunity.category, tags: selectedOpportunity.canonicalEntity.toLowerCase(), logoPrompt: '', bannerPrompt: '' };
  })() : undefined;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-lg font-bold text-zinc-100">Launch Opportunity Engine</h2>
          <p className="text-xs text-zinc-500">
            Discovering viral narratives BEFORE they become tokens
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
          <button onClick={handleCopy} disabled={opportunities.length === 0}
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

      {loading && opportunities.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-24 text-sm text-zinc-600">
          <Spinner className="h-5 w-5" />
          {isScraping ? 'Scanning the internet for viral narratives... This may take a moment on first load.' : 'Loading...'}
        </div>
      ) : opportunities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-24 text-center text-sm text-zinc-600">
          {error || 'No launch opportunities found. The engine is scanning for viral narratives.'}
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map((o, i) => (
            <OpportunityCard key={o.id} opportunity={o} index={i} onCreateToken={handleCreateToken} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-3">How It Works</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs text-zinc-500">
          <div><span className="font-semibold text-zinc-400">1. Collect</span> — Scans Reddit, Bluesky, Hacker News, Mastodon, Lemmy, GitHub for viral cultural discussions</div>
          <div><span className="font-semibold text-zinc-400">2. Extract Entities</span> — Finds meme names, characters, catchphrases, hashtags, cashtags — real ideas people discuss</div>
          <div><span className="font-semibold text-zinc-400">3. Cluster by Entity</span> — Groups posts by the IDEA, not by wording. "PEPE is exploding" and "Bought more PEPE" = same cluster</div>
          <div><span className="font-semibold text-zinc-400">4. Score Opportunity</span> — Evaluates virality, meme strength, community diversity, competition, originality, brandability</div>
          <div><span className="font-semibold text-zinc-400">5. Launch</span> — Top 15 pre-token opportunities ranked by launch score. Click "Create Token" to auto-generate everything.</div>
        </div>
      </div>

      <LaunchModal
        open={modalOpen}
        title={`Create Token: ${selectedOpportunity?.narrative ?? ''}`}
        initialData={initialData}
        busy={api.busy}
        onLaunch={handleLaunch}
        onCancel={handleCancel}
      />
    </div>
  );
}
