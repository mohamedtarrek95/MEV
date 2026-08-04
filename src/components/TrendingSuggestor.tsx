import { useRef, useState } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { useTrendDiscovery } from '../hooks/useTrendDiscovery';
import type { Tweet } from '../utils/trends/types';
import type { IFeedProvider } from '../utils/trends/feedProvider';
import { MockFeedProvider } from '../utils/trends/mockFeed';
import { useToast } from './Toast';
import { Spinner } from './Spinner';
import { LaunchModal, type LaunchModalData } from './LaunchModal';

function formatAge(ageMs: number): string {
  const mins = Math.floor(ageMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

function formatEngagement(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(score, 100);
  const color = score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-cyan-500' : 'bg-amber-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs font-bold text-zinc-200">{score.toFixed(1)}</span>
    </div>
  );
}

interface SuggestionCardProps {
  mintAddress: string;
  tokenName: string;
  tokenSymbol: string;
  imageUrl: string;
  trendScore: number;
  mentions24h: number;
  uniqueAccounts: number;
  totalEngagement: number;
  tokenAgeMs: number;
  firstDetectedAt: number;
  matchedTopic: string;
  dexscreenerUrl: string;
  onLaunch: () => void;
}

function SuggestionCard(props: SuggestionCardProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(props.mintAddress);
    toast.push('success', 'Contract address copied');
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={() => window.open(props.dexscreenerUrl, '_blank', 'noopener,noreferrer')}
      className="group cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all duration-300 hover:scale-[1.02] hover:border-cyan-500/40 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <img
          src={props.imageUrl}
          alt={props.tokenName}
          className="h-11 w-11 shrink-0 rounded-full border border-zinc-800 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMjcyNzNhIi8+PHRleHQgeD0iMjAiIHk9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjEyIj4/PC90ZXh0Pjwvc3ZnPg==';
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-sm font-bold text-zinc-100 truncate">{props.tokenName}</span>
              <span className="ml-2 font-mono text-xs text-cyan-400">{props.tokenSymbol}</span>
            </div>
            <span className="shrink-0 rounded bg-fuchsia-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
              Trend {props.trendScore.toFixed(1)}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="min-w-0 flex-1 break-all font-mono text-[10px] text-zinc-500">
              {props.mintAddress}
            </span>
            <button
              onClick={handleCopy}
              className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                copied
                  ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400'
                  : 'border-zinc-700 text-zinc-400 hover:border-cyan-500/50 hover:text-cyan-400'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Mentions (24h)</div>
          <div className="font-mono text-sm font-bold text-zinc-100">{props.mentions24h}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Unique Accounts</div>
          <div className="font-mono text-sm font-bold text-zinc-100">{props.uniqueAccounts}</div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Total Engagement</div>
          <div className="font-mono text-sm font-bold text-zinc-100">
            {formatEngagement(props.totalEngagement)}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-600">Token Age</div>
          <div className="font-mono text-sm font-bold text-zinc-100">{formatAge(props.tokenAgeMs)}</div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-600">
        <span>First detected: {formatTime(props.firstDetectedAt)}</span>
        <span>Matched: {props.matchedTopic}</span>
      </div>

      <div className="mt-2">
        <div className="text-[10px] uppercase tracking-wider text-zinc-600">Trend Score</div>
        <ScoreBar score={props.trendScore} />
      </div>

      <div className="mt-3 flex gap-2">
        <a
          href={props.dexscreenerUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded-md border border-zinc-700 px-3 py-2 text-center text-xs font-semibold text-zinc-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
        >
          Open on DexScreener
        </a>
        <button
          onClick={(e) => {
            e.stopPropagation();
            props.onLaunch();
          }}
          className="flex-1 rounded-md bg-fuchsia-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-fuchsia-500"
        >
          Launch This Coin
        </button>
      </div>
    </div>
  );
}

export function TrendingSuggestor({ api, feedProvider }: { api: BundleApi; feedProvider?: IFeedProvider }) {
  const { suggestions, topics, isLoading, error, lastUpdated, tweetsProcessed, nextRefreshIn, refresh } =
    useTrendDiscovery(feedProvider);
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Partial<LaunchModalData> | undefined>(undefined);
  const [modalTitle, setModalTitle] = useState('Launch Meme Coin');
  const [view, setView] = useState<'suggestions' | 'topics'>('suggestions');

  const handleLaunch = (s: (typeof suggestions)[number]) => {
    setModalData({
      name: s.tokenName,
      ticker: s.tokenSymbol,
      description: `Trending topic "${s.matchedTopic}" — ${s.mentions24h} mentions, ${s.uniqueAccounts} accounts in 24h.`,
      imageUrl: s.imageUrl,
      buyAmount: 0.1,
    });
    setModalTitle(`Launch ${s.tokenName} (${s.tokenSymbol})`);
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
            X Trend Discovery
          </h2>
          <p className="mt-1 text-xs text-zinc-600">
            Narrative engine over the last 24h, mapped to Pump.fun Final Stretch.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {nextRefreshIn > 0 && (
            <span className="font-mono text-[11px] text-zinc-600">
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

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setView('suggestions')}
          className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
            view === 'suggestions' ? 'bg-fuchsia-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Suggestions
        </button>
        <button
          onClick={() => setView('topics')}
          className={`rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
            view === 'topics' ? 'bg-fuchsia-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Trend Topics
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
          ⚠ {error}
        </div>
      )}

      {sourceBanner(timeSince, tweetsProcessed, topics.length, suggestions.length)}

      {isLoading && suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner className="h-8 w-8 text-cyan-400" />
          <p className="mt-4 font-mono text-sm text-zinc-500">Scanning X for trends...</p>
        </div>
      ) : view === 'suggestions' ? (
        suggestions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm text-zinc-600">
              No trending topics matched a Final Stretch token yet.
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
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                mintAddress={s.mintAddress}
                tokenName={s.tokenName}
                tokenSymbol={s.tokenSymbol}
                imageUrl={s.imageUrl}
                trendScore={s.trendScore}
                mentions24h={s.mentions24h}
                uniqueAccounts={s.uniqueAccounts}
                totalEngagement={s.totalEngagement}
                tokenAgeMs={s.tokenAgeMs}
                firstDetectedAt={s.firstDetectedAt}
                matchedTopic={s.matchedTopic}
                dexscreenerUrl={s.dexscreenerUrl}
                onLaunch={() => handleLaunch(s)}
              />
            ))}
          </div>
        )
      ) : topics.length === 0 ? (
        <div className="py-16 text-center text-sm text-zinc-600">No topics detected yet.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/60 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
              <tr>
                <th className="px-3 py-2">Topic</th>
                <th className="px-3 py-2">Mentions</th>
                <th className="px-3 py-2">Accounts</th>
                <th className="px-3 py-2">Engagement</th>
                <th className="px-3 py-2">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {topics.map((t, i) => (
                <tr key={`${t.canonical}-${i}`} className="bg-zinc-900/40">
                  <td className="px-3 py-2 font-mono font-semibold text-cyan-300">{t.display}</td>
                  <td className="px-3 py-2 text-zinc-300">{t.mentionCount}</td>
                  <td className="px-3 py-2 text-zinc-300">{t.uniqueAccounts}</td>
                  <td className="px-3 py-2 text-zinc-300">{formatEngagement(t.totalEngagement)}</td>
                  <td className="px-3 py-2">
                    <ScoreBar score={t.trendScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

function sourceBanner(
  timeSince: number,
  tweetsProcessed: number,
  topicCount: number,
  suggestionCount: number,
) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-[11px] text-zinc-500">
      <span>Source: Mock feed (Playwright X + official API swappable)</span>
      <span>{tweetsProcessed} tweets</span>
      <span>{topicCount} topics</span>
      <span>{suggestionCount} suggestions</span>
      {timeSince > 0 && <span>(updated {timeSince}s ago)</span>}
    </div>
  );
}