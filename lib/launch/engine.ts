import type { RawLaunch, EnrichedCoin, LaunchCoin, LaunchReport, NarrativeCluster, NarrativeRanking, ProviderStatus } from './types.js';
import { fetchPumpfun } from './providers/pumpfun.js';
import { fetchDexScreenerBatch, type DexEnrichment } from './providers/dexscreener.js';
import { detectNarrativeClusters, findNarrativeCluster } from './names.js';
import { calculateLaunchScore } from './scoring.js';

const MAX_AGE_MS = 60 * 60 * 1000;
const RAPID_ACCELERATION_BUY_RATIO = 3;
const MAX_RESULTS = 50;
const MAX_NARRATIVES = 20;

function enrichCoin(raw: RawLaunch, dex: DexEnrichment | null, now: number): EnrichedCoin {
  const ageSeconds = Math.max(0, (now - raw.createdAt) / 1000);
  return {
    mint: raw.mint,
    name: raw.name,
    ticker: raw.symbol,
    image: dex?.image || raw.image || '',
    launchTime: raw.createdAt,
    ageSeconds,
    marketCap: raw.usdMarketCap || raw.marketCap || 0,
    liquidity: dex?.liquidity || 0,
    volume24h: dex?.volume24h || 0,
    volume1h: dex?.volume1h || 0,
    volume5m: dex?.volume5m || 0,
    buys24h: dex?.buys24h || 0,
    sells24h: dex?.sells24h || 0,
    buys1h: dex?.buys1h || 0,
    sells1h: dex?.sells1h || 0,
    buys5m: dex?.buys5m || 0,
    sells5m: dex?.sells5m || 0,
    uniqueBuyers: dex ? Math.max(1, Math.round((dex.buys1h + dex.buys5m) * 0.6)) : 0,
    uniqueSellers: dex ? Math.max(1, Math.round((dex.sells1h + dex.sells5m) * 0.6)) : 0,
    topHolderPct: 0,
    creator: raw.creator,
    creatorRugCount: 0,
    creatorCoinCount: 0,
    website: dex?.website || raw.website || '',
    twitter: dex?.twitter || raw.twitter || '',
    telegram: dex?.telegram || raw.telegram || '',
    imageDex: dex?.image || '',
    pumpfunUrl: `https://pump.fun/coin/${raw.mint}`,
    dexscreenerUrl: `https://dexscreener.com/solana/${raw.mint}`,
    axiomUrl: `https://axiom.trade/mint/${raw.mint}`,
    priceChange1h: dex?.priceChange1h || 0,
    priceChange5m: dex?.priceChange5m || 0,
  };
}

function isAccelerating(coin: EnrichedCoin): boolean {
  if (coin.buys5m === 0) return false;
  return coin.buys5m > coin.sells5m * RAPID_ACCELERATION_BUY_RATIO;
}

function rankNarratives(clusters: Map<string, NarrativeCluster>): NarrativeRanking[] {
  const rankings: NarrativeRanking[] = [];
  const now = Date.now();

  for (const [, cluster] of clusters) {
    if (cluster.count < 2) continue;

    const creators = cluster.uniqueCreators.length;
    const trend = cluster.launchVelocity > 1 ? 'rising'
      : cluster.launchVelocity > 0.3 ? 'stable'
      : 'falling';

    rankings.push({
      narrative: cluster.narrative,
      rootKeyword: cluster.rootKeyword,
      count: cluster.count,
      uniqueCreators: creators,
      variants: cluster.variants,
      avgMarketCap: cluster.avgMarketCap,
      avgVolume: cluster.avgVolume,
      launchVelocity: cluster.launchVelocity,
      trend: trend as 'rising' | 'stable' | 'falling',
      coins: cluster.coins,
    });
  }

  rankings.sort((a, b) => {
    // Score: velocity * 0.4 + count * 0.3 + creators * 0.3
    const scoreA = a.launchVelocity * 0.4 + a.count * 0.3 + a.uniqueCreators * 0.3;
    const scoreB = b.launchVelocity * 0.4 + b.count * 0.3 + b.uniqueCreators * 0.3;
    return scoreB - scoreA;
  });

  return rankings.slice(0, MAX_NARRATIVES);
}

export async function scanLaunches(): Promise<{
  report: LaunchReport;
  pumpfunStatus: ProviderStatus;
  dexStatus: ProviderStatus;
}> {
  const overallStart = Date.now();
  const now = overallStart;

  const pumpfunStart = Date.now();
  let rawLaunches: RawLaunch[] = [];
  const pumpfunStatus: ProviderStatus = {
    name: 'Pump.fun',
    sourceId: 'pumpfun',
    requests: 1,
    collected: 0,
    durationMs: 0,
    lastError: null,
    lastSuccess: null,
  };

  try {
    rawLaunches = await fetchPumpfun(80);
    pumpfunStatus.collected = rawLaunches.length;
    pumpfunStatus.lastSuccess = Date.now();
  } catch (err) {
    pumpfunStatus.lastError = err instanceof Error ? err.message : String(err);
  }
  pumpfunStatus.durationMs = Date.now() - pumpfunStart;

  const recentLaunches = rawLaunches.filter((r) => {
    const age = now - r.createdAt;
    return age <= MAX_AGE_MS;
  });

  const dexStart = Date.now();
  const dexStatus: ProviderStatus = {
    name: 'DexScreener',
    sourceId: 'dexscreener',
    requests: 0,
    collected: 0,
    durationMs: 0,
    lastError: null,
    lastSuccess: null,
  };

  let dexData = new Map<string, DexEnrichment>();
  const mints = recentLaunches.map((r) => r.mint);
  if (mints.length > 0) {
    try {
      dexData = await fetchDexScreenerBatch(mints);
      dexStatus.collected = dexData.size;
      dexStatus.lastSuccess = Date.now();
    } catch (err) {
      dexStatus.lastError = err instanceof Error ? err.message : String(err);
    }
  }
  dexStatus.durationMs = Date.now() - dexStart;
  dexStatus.requests = Math.ceil(mints.length / 30);

  const enriched: EnrichedCoin[] = [];
  for (const raw of recentLaunches) {
    const dex = dexData.get(raw.mint) || null;
    enriched.push(enrichCoin(raw, dex, now));
  }

  const clusters = detectNarrativeClusters(enriched);
  const narratives = rankNarratives(clusters);

  const candidates: LaunchCoin[] = [];
  let warningsFired = 0;

  for (const coin of enriched) {
    const cluster = findNarrativeCluster(coin.name, clusters);

    const ageMs = now - coin.launchTime;
    const isWithinWindow = ageMs <= 10 * 60 * 1000;
    if (!isWithinWindow && !isAccelerating(coin)) continue;

    const { launchScore, probability, scoreBreakdown, warnings, trend } = calculateLaunchScore(coin, cluster);
    warningsFired += warnings.length;

    candidates.push({
      coin,
      launchScore,
      probability,
      scoreBreakdown,
      narrativeCluster: cluster,
      warnings,
      trend,
    });
  }

  candidates.sort((a, b) => b.launchScore - a.launchScore);
  const top = candidates.slice(0, MAX_RESULTS);

  const report: LaunchReport = {
    generatedAt: now,
    coins: top,
    narratives,
    totalScanned: enriched.length,
    timeWindow: '10m',
    providers: [pumpfunStatus, dexStatus],
    diagnostics: {
      pumpfunCount: rawLaunches.length,
      dexscreenerCount: dexData.size,
      enrichedCount: enriched.length,
      narrativeClusters: clusters.size,
      warningsFired,
    },
  };

  const totalDuration = Date.now() - overallStart;
  console.log(`[launch-radar] ${enriched.length} coins scanned → ${top.length} candidates, ${narratives.length} narratives (${totalDuration}ms)`);
  console.log(`[launch-radar] ${clusters.size} narrative clusters, ${warningsFired} warnings`);

  return { report, pumpfunStatus, dexStatus };
}
