import { useState, useCallback } from 'react';
import type { LaunchCoin } from '../utils/launch/types';
import type { BundleApi } from '../hooks/useBundle';
import { formatAge, formatUsd, getScoreColor, getScoreBg, getTrendIcon, getTrendColor, getWarningColor } from '../hooks/useLaunchRadar';
import { LaunchModal, type LaunchModalData } from './LaunchModal';

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[9px] uppercase tracking-wider text-zinc-600 truncate">{label}</span>
      <div className="flex-1 h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${getScoreBg(score)}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`font-mono text-[9px] font-bold ${getScoreColor(score)} w-6 text-right`}>{score}</span>
    </div>
  );
}

interface LaunchCardProps {
  data: LaunchCoin;
  rank: number;
  api: BundleApi;
}

export function LaunchCard({ data, rank, api }: LaunchCardProps) {
  const { coin, launchScore, probability, scoreBreakdown, narrativeCluster, warnings, trend } = data;
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  const rankBadge = rank <= 3
    ? 'border-fuchsia-500/50 bg-fuchsia-950/50 text-fuchsia-300'
    : rank <= 10
    ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
    : 'border-zinc-700 bg-zinc-800 text-zinc-400';

  const cluster = narrativeCluster;
  const hasCluster = cluster && cluster.count > 1;

  const buildInitialData = useCallback((): Partial<LaunchModalData> => {
    const narrName = cluster?.narrative || coin.name;
    const desc = `${coin.name} (${coin.ticker}) — Solana meme coin. ${coin.marketCap > 0 ? `Market cap: ${formatUsd(coin.marketCap)}.` : ''} ${coin.liquidity > 0 ? `Liquidity: ${formatUsd(coin.liquidity)}.` : ''} ${hasCluster ? `Part of the ${narrName} narrative with ${cluster.count} similar launches.` : ''}`;
    return {
      name: coin.name,
      ticker: coin.ticker,
      description: desc,
      imageUrl: coin.image || '',
      buyAmount: 0.1,
      theme: narrName,
      tags: [narrName, coin.ticker, 'solana', 'meme'].join(', '),
      logoPrompt: `${coin.name} meme coin logo, ${narrName.toLowerCase()} character, bold cartoon style, high contrast, transparent background, token icon, crypto meme aesthetic`,
      bannerPrompt: `${coin.name} meme coin banner, ${narrName.toLowerCase()} themed, vibrant colors, crypto community energy, wide format`,
    };
  }, [coin, cluster, hasCluster]);

  const handleLaunch = useCallback((modalData: LaunchModalData) => {
    void api.launchMemeCoin(modalData.name, modalData.ticker, modalData.description, modalData.imageUrl, modalData.buyAmount);
    setShowLaunchModal(false);
  }, [api]);

  return (
    <>
    <div className={`rounded-xl border p-4 transition-all hover:scale-[1.005] ${
      warnings.some((w) => w.severity === 'high')
        ? 'border-red-500/30 bg-red-950/10'
        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
    }`}>
      <div className="flex items-start gap-3">
        {/* Rank + Image */}
        <div className="flex flex-col items-center gap-1">
          <span className={`flex h-6 w-6 items-center justify-center rounded-lg border font-mono text-[10px] font-black ${rankBadge}`}>
            #{rank}
          </span>
          {coin.image ? (
            <img src={coin.image} alt={coin.ticker} className="h-10 w-10 rounded-lg border border-zinc-700 object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg border border-zinc-700 bg-zinc-800 flex items-center justify-center font-mono text-[10px] text-zinc-500">
              {coin.ticker.slice(0, 3)}
            </div>
          )}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-mono text-sm font-bold text-zinc-100 truncate">{coin.name}</h3>
            <span className="font-mono text-[10px] text-zinc-500">{coin.ticker}</span>
            <span className={`rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-bold ${
              trend === 'rising' ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
              : trend === 'new' ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-300'
              : trend === 'falling' ? 'border-red-500/30 bg-red-950/30 text-red-300'
              : 'border-zinc-700 bg-zinc-800 text-zinc-400'
            }`}>
              {getTrendIcon(trend)} {trend}
            </span>
          </div>

          <div className="mt-1 flex items-center gap-3 text-[10px] text-zinc-500">
            <span>{formatAge(coin.ageSeconds)} old</span>
            <span>MC {formatUsd(coin.marketCap)}</span>
            <span>Liq {formatUsd(coin.liquidity)}</span>
            <span>Vol {formatUsd(coin.volume5m + coin.volume1h)}</span>
          </div>

          {/* Quick Stats */}
          <div className="mt-1.5 grid grid-cols-4 gap-2">
            <div className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-center">
              <div className="text-[9px] uppercase text-zinc-600">Buys</div>
              <div className="font-mono text-[11px] font-bold text-emerald-400">{coin.buys5m + coin.buys1h}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-center">
              <div className="text-[9px] uppercase text-zinc-600">Sells</div>
              <div className="font-mono text-[11px] font-bold text-red-400">{coin.sells5m + coin.sells1h}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-center">
              <div className="text-[9px] uppercase text-zinc-600">Buyers</div>
              <div className="font-mono text-[11px] font-bold text-zinc-300">{coin.uniqueBuyers}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-center">
              <div className="text-[9px] uppercase text-zinc-600">Sellers</div>
              <div className="font-mono text-[11px] font-bold text-zinc-300">{coin.uniqueSellers}</div>
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <div className="text-[9px] uppercase tracking-wider text-zinc-600">Launch Score</div>
          <div className={`font-mono text-2xl font-black ${getScoreColor(launchScore)}`}>{launchScore}</div>
          <div className={`mt-0.5 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold ${
            probability === 'Very High' ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
            : probability === 'High' ? 'border-green-500/40 bg-green-950/30 text-green-300'
            : probability === 'Medium' ? 'border-yellow-500/40 bg-yellow-950/30 text-yellow-300'
            : 'border-zinc-700 bg-zinc-800 text-zinc-400'
          }`}>
            {probability}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1">
        <ScoreBar score={scoreBreakdown.buyerGrowth} label="Buyer Growth" />
        <ScoreBar score={scoreBreakdown.holderGrowth} label="Holder Growth" />
        <ScoreBar score={scoreBreakdown.walletDiversity} label="Wallet Div." />
        <ScoreBar score={scoreBreakdown.volumeScore} label="Volume" />
        <ScoreBar score={scoreBreakdown.narrativeScore} label="Narrative" />
        <ScoreBar score={scoreBreakdown.liquidityScore} label="Liquidity" />
        <ScoreBar score={scoreBreakdown.socialScore} label="Social" />
      </div>

      {/* Narrative Launch Details */}
      {hasCluster && cluster && (
        <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/15 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
              {cluster.narrative}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-amber-600">Narrative</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
            <div>
              <div className="text-[8px] uppercase text-zinc-600">Launches Created</div>
              <div className="font-mono text-[11px] font-bold text-amber-300">{cluster.count}</div>
            </div>
            <div>
              <div className="text-[8px] uppercase text-zinc-600">Unique Creators</div>
              <div className="font-mono text-[11px] font-bold text-amber-300">{cluster.uniqueCreators.length}</div>
            </div>
            <div>
              <div className="text-[8px] uppercase text-zinc-600">First Launch</div>
              <div className="font-mono text-[11px] font-bold text-zinc-300">{formatAge((Date.now() / 1000) - cluster.firstLaunch)} ago</div>
            </div>
            <div>
              <div className="text-[8px] uppercase text-zinc-600">Latest Launch</div>
              <div className="font-mono text-[11px] font-bold text-zinc-300">{formatAge((Date.now() / 1000) - cluster.lastLaunch)} ago</div>
            </div>
            <div>
              <div className="text-[8px] uppercase text-zinc-600">Launch Velocity</div>
              <div className={`font-mono text-[11px] font-bold ${getTrendColor(cluster.launchVelocity > 1 ? 'rising' : cluster.launchVelocity > 0.3 ? 'stable' : 'falling')}`}>
                {cluster.launchVelocity.toFixed(1)}/min
              </div>
            </div>
            <div>
              <div className="text-[8px] uppercase text-zinc-600">Trend</div>
              <div className={`font-mono text-[11px] font-bold ${getTrendColor(cluster.launchVelocity > 1 ? 'rising' : cluster.launchVelocity > 0.3 ? 'stable' : 'falling')}`}>
                {cluster.launchVelocity > 1 ? '↗ Rising' : cluster.launchVelocity > 0.3 ? '→ Stable' : '↘ Falling'}
              </div>
            </div>
            <div>
              <div className="text-[8px] uppercase text-zinc-600">Confidence</div>
              <div className="font-mono text-[11px] font-bold text-emerald-400">{scoreBreakdown.narrativeScore}%</div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {cluster.variants.slice(0, 8).map((v, i) => (
              <span key={i} className="rounded border border-amber-500/30 bg-amber-950/20 px-1.5 py-0.5 font-mono text-[8px] text-amber-300/80">
                {v}
              </span>
            ))}
            {cluster.variants.length > 8 && (
              <span className="text-[8px] text-amber-400/60">+{cluster.variants.length - 8} more</span>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {warnings.map((w, i) => (
            <span key={i} className={`rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold ${getWarningColor(w.severity)}`}>
              {w.message}
            </span>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-2 flex items-center gap-2">
        <a href={coin.pumpfunUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-zinc-700 px-2 py-0.5 text-[9px] font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors">
          Pump.fun
        </a>
        <a href={coin.dexscreenerUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-zinc-700 px-2 py-0.5 text-[9px] font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors">
          DexScreener
        </a>
        <a href={coin.axiomUrl} target="_blank" rel="noopener noreferrer" className="rounded border border-zinc-700 px-2 py-0.5 text-[9px] font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors">
          Axiom
        </a>
        {coin.twitter && (
          <a href={coin.twitter} target="_blank" rel="noopener noreferrer" className="rounded border border-zinc-700 px-2 py-0.5 text-[9px] font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors">
            Twitter
          </a>
        )}
        {coin.telegram && (
          <a href={coin.telegram} target="_blank" rel="noopener noreferrer" className="rounded border border-zinc-700 px-2 py-0.5 text-[9px] font-semibold text-zinc-400 hover:bg-zinc-800 transition-colors">
            Telegram
          </a>
        )}
        <span className="ml-auto font-mono text-[9px] text-zinc-600 truncate max-w-[120px]">{coin.mint.slice(0, 8)}...{coin.mint.slice(-4)}</span>
      </div>

      {/* Create Token Button — opens the SAME Launchpad modal */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => setShowLaunchModal(true)}
          disabled={api.busy}
          className="rounded-lg bg-fuchsia-600 px-5 py-2 font-mono text-sm font-bold text-white transition-colors hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {api.busy ? 'Launching...' : 'Create Token'}
        </button>
      </div>
    </div>

    {/* SAME Launchpad Modal used by Pump.fun Launchpad */}
    <LaunchModal
      open={showLaunchModal}
      title={`Launch ${coin.name} (${coin.ticker})`}
      initialData={buildInitialData()}
      busy={api.busy}
      onLaunch={handleLaunch}
      onCancel={() => setShowLaunchModal(false)}
    />
  </>
  );
}
