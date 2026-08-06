import { useLaunchRadar, formatAge, formatUsd, getTrendIcon, getTrendColor } from '../hooks/useLaunchRadar';
import type { BundleApi } from '../hooks/useBundle';
import { LaunchCard } from './LaunchCard';
import type { NarrativeRanking } from '../utils/launch/types';

function NarrativeCard({ n, rank }: { n: NarrativeRanking; rank: number }) {
  const trendColor = getTrendColor(n.trend);
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-black text-zinc-500">#{rank}</span>
          <span className="font-mono text-sm font-bold text-zinc-100">{n.narrative}</span>
          <span className={`font-mono text-[9px] font-bold ${trendColor}`}>
            {getTrendIcon(n.trend)} {n.trend}
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono text-lg font-black text-amber-400">{n.count}</span>
          <span className="text-[9px] text-zinc-500 ml-1">launches</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-[9px] text-zinc-500">
        <span>{n.uniqueCreators} creators</span>
        <span>{n.launchVelocity.toFixed(1)}/min</span>
        <span>avg MC {formatUsd(n.avgMarketCap)}</span>
        <span>avg Vol {formatUsd(n.avgVolume)}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {n.variants.slice(0, 10).map((v, i) => (
          <span key={i} className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[8px] text-zinc-400">
            {v}
          </span>
        ))}
        {n.variants.length > 10 && (
          <span className="text-[8px] text-zinc-600">+{n.variants.length - 10} more</span>
        )}
      </div>
    </div>
  );
}

export function LaunchRadar({ api }: { api: BundleApi }) {
  const { coins, narratives, loading, error, lastRefresh, totalScanned, diagnostics } = useLaunchRadar();

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-lg font-bold text-zinc-100">Launch Radar</h2>
          <p className="text-xs text-zinc-500">
            Tracking newly created Solana meme coins
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
          {loading && (
            <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 font-semibold text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Live
            </span>
          )}
          {lastRefresh && (
            <span>Updated {formatAge((Date.now() - lastRefresh) / 1000)} ago</span>
          )}
          {totalScanned > 0 && (
            <span>{totalScanned} scanned</span>
          )}
        </div>
      </div>

      {/* Diagnostics */}
      {diagnostics && (
        <div className="mb-3 flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[10px] text-zinc-500">
          <span>Pump.fun: {diagnostics.pumpfunCount}</span>
          <span>DexScreener: {diagnostics.dexscreenerCount}</span>
          <span>Enriched: {diagnostics.enrichedCount}</span>
          <span>Narratives: {diagnostics.narrativeClusters}</span>
          <span>Warnings: {diagnostics.warningsFired}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && coins.length === 0 ? (
        <div className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-24 text-sm text-zinc-600">
          <span className="h-4 w-4 rounded-full border-2 border-zinc-600 border-t-transparent animate-spin" />
          Scanning Pump.fun and DexScreener...
        </div>
      ) : coins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-24 text-center text-sm text-zinc-600">
          {error || 'No launches found in the last 10 minutes. Refreshing...'}
        </div>
      ) : (
        <>
          {/* Narrative Rankings */}
          {narratives.length > 0 && (
            <div className="mb-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Narrative Rankings — duplicate meme ideas detected
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {narratives.map((n, i) => (
                  <NarrativeCard key={n.narrative} n={n} rank={i + 1} />
                ))}
              </div>
            </div>
          )}

          <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-950/10 px-3 py-2 text-[10px] text-emerald-300">
            {coins.length} candidate{coins.length !== 1 ? 's' : ''} from {totalScanned} launches — sorted by probability of success
          </div>

          <div className="space-y-3">
            {coins.map((c, i) => (
              <LaunchCard key={c.coin.mint} data={c} rank={i + 1} api={api} />
            ))}
          </div>
        </>
      )}

      {/* Scoring Legend */}
      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2">Scoring Formula</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[9px] text-zinc-500">
          <div><span className="font-semibold text-zinc-400">25%</span> Buyer Growth</div>
          <div><span className="font-semibold text-zinc-400">20%</span> Holder Growth</div>
          <div><span className="font-semibold text-zinc-400">15%</span> Wallet Diversity</div>
          <div><span className="font-semibold text-zinc-400">15%</span> Volume</div>
          <div><span className="font-semibold text-zinc-400">10%</span> Narrative Score</div>
          <div><span className="font-semibold text-zinc-400">10%</span> Liquidity</div>
          <div><span className="font-semibold text-zinc-400">5%</span> Social Links</div>
          <div><span className="font-semibold text-zinc-400">-</span> Warning Penalties</div>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2">How It Works</div>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-[9px] text-zinc-500">
          <div><span className="font-semibold text-zinc-400">1. Scan</span> — Pump.fun new launches every 5s</div>
          <div><span className="font-semibold text-zinc-400">2. Enrich</span> — DexScreener volume/buys/sells</div>
          <div><span className="font-semibold text-zinc-400">3. Cluster</span> — Group same meme ideas via fuzzy matching</div>
          <div><span className="font-semibold text-zinc-400">4. Score</span> — Probability of going viral</div>
          <div><span className="font-semibold text-zinc-400">5. Rank</span> — Narratives first, then coins</div>
          <div><span className="font-semibold text-zinc-400">6. Warn</span> — Rug risk, bots, low liquidity</div>
        </div>
      </div>
    </div>
  );
}
