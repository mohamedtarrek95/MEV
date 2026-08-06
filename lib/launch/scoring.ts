import type { EnrichedCoin, NarrativeCluster, LaunchWarning } from './types.js';

export function calculateLaunchScore(
  coin: EnrichedCoin,
  cluster: NarrativeCluster | null,
): {
  launchScore: number;
  probability: string;
  scoreBreakdown: {
    buyerGrowth: number;
    holderGrowth: number;
    walletDiversity: number;
    volumeScore: number;
    narrativeScore: number;
    liquidityScore: number;
    socialScore: number;
  };
  warnings: LaunchWarning[];
  trend: 'rising' | 'stable' | 'falling' | 'new';
} {
  const warnings = detectWarnings(coin);
  const warningPenalty = warnings.reduce((pen, w) => {
    if (w.severity === 'high') return pen + 20;
    if (w.severity === 'medium') return pen + 10;
    return pen + 5;
  }, 0);

  const buyerGrowth = scoreBuyerGrowth(coin);
  const holderGrowth = scoreHolderGrowth(coin);
  const walletDiversity = scoreWalletDiversity(coin);
  const volumeScore = scoreVolume(coin);
  const narrativeScore = scoreNarrative(cluster);
  const liquidityScore = scoreLiquidity(coin);
  const socialScore = scoreSocial(coin);

  const raw = Math.round(
    buyerGrowth * 0.25 +
    holderGrowth * 0.20 +
    walletDiversity * 0.15 +
    volumeScore * 0.15 +
    narrativeScore * 0.10 +
    liquidityScore * 0.10 +
    socialScore * 0.05
  );

  const launchScore = Math.max(0, Math.min(100, raw - warningPenalty));

  let probability = 'Low';
  if (launchScore >= 80) probability = 'Very High';
  else if (launchScore >= 65) probability = 'High';
  else if (launchScore >= 50) probability = 'Medium';
  else if (launchScore >= 35) probability = 'Low-Medium';

  const trend = detectTrend(coin, cluster);

  return {
    launchScore,
    probability,
    scoreBreakdown: { buyerGrowth, holderGrowth, walletDiversity, volumeScore, narrativeScore, liquidityScore, socialScore },
    warnings,
    trend,
  };
}

function scoreBuyerGrowth(coin: EnrichedCoin): number {
  const buys5m = coin.buys5m;
  const sells5m = coin.sells5m;
  if (buys5m === 0 && sells5m === 0) return 10;
  const ratio = sells5m > 0 ? buys5m / sells5m : buys5m > 0 ? 10 : 0;
  return Math.min(100, Math.round(ratio * 20 + (buys5m > 5 ? 30 : buys5m * 6)));
}

function scoreHolderGrowth(coin: EnrichedCoin): number {
  const buys1h = coin.buys1h;
  const sells1h = coin.sells1h;
  if (buys1h === 0 && sells1h === 0) return 10;
  const netBuys = buys1h - sells1h;
  return Math.min(100, Math.max(0, Math.round(50 + netBuys * 3)));
}

function scoreWalletDiversity(coin: EnrichedCoin): number {
  const totalTraders = coin.uniqueBuyers + coin.uniqueSellers;
  if (totalTraders === 0) return 5;
  const ratio = coin.uniqueBuyers / Math.max(1, coin.uniqueSellers);
  const diversity = Math.min(totalTraders, 50);
  return Math.min(100, Math.round(diversity * 1.5 + (ratio > 1.5 ? 20 : 0)));
}

function scoreVolume(coin: EnrichedCoin): number {
  const vol = coin.volume5m + coin.volume1h;
  if (vol < 10) return 5;
  if (vol < 100) return 15;
  if (vol < 1000) return 30;
  if (vol < 5000) return 50;
  if (vol < 20000) return 70;
  if (vol < 100000) return 85;
  return 100;
}

function scoreNarrative(cluster: NarrativeCluster | null): number {
  if (!cluster || cluster.count <= 1) return 10;
  return Math.min(100, cluster.repeatedLaunchScore);
}

function scoreLiquidity(coin: EnrichedCoin): number {
  const liq = coin.liquidity;
  if (liq < 10) return 5;
  if (liq < 100) return 15;
  if (liq < 500) return 30;
  if (liq < 2000) return 50;
  if (liq < 10000) return 70;
  if (liq < 50000) return 85;
  return 100;
}

function scoreSocial(coin: EnrichedCoin): number {
  let score = 0;
  if (coin.website) score += 30;
  if (coin.twitter) score += 40;
  if (coin.telegram) score += 30;
  return score;
}

function detectWarnings(coin: EnrichedCoin): LaunchWarning[] {
  const warnings: LaunchWarning[] = [];

  if (coin.uniqueBuyers < 3 && coin.buys1h > 10) {
    warnings.push({
      type: 'bot_wallets',
      severity: 'high',
      message: `Only ${coin.uniqueBuyers} unique buyers but ${coin.buys1h} total buys — likely bot activity`,
    });
  }

  if (coin.topHolderPct > 30) {
    warnings.push({
      type: 'top_holder_heavy',
      severity: 'high',
      message: `Top holder owns ${coin.topHolderPct.toFixed(1)}% — rug risk`,
    });
  }

  if (coin.liquidity < 50 && coin.ageSeconds > 300) {
    warnings.push({
      type: 'low_liquidity',
      severity: 'medium',
      message: `Liquidity only $${coin.liquidity.toFixed(0)} after ${Math.round(coin.ageSeconds / 60)} min`,
    });
  }

  if (!coin.website && !coin.twitter && !coin.telegram) {
    warnings.push({
      type: 'no_socials',
      severity: 'low',
      message: 'No social links — anonymous launch',
    });
  }

  if (coin.creatorRugCount > 0) {
    warnings.push({
      type: 'creator_rugged',
      severity: 'high',
      message: `Creator rugged ${coin.creatorRugCount} previous token${coin.creatorRugCount > 1 ? 's' : ''}`,
    });
  }

  if (coin.creatorCoinCount > 5) {
    warnings.push({
      type: 'serial_rugger',
      severity: 'medium',
      message: `Creator launched ${coin.creatorCoinCount} tokens — possible serial deployer`,
    });
  }

  return warnings;
}

function detectTrend(coin: EnrichedCoin, cluster: NarrativeCluster | null): 'rising' | 'stable' | 'falling' | 'new' {
  if (coin.ageSeconds < 120) return 'new';
  if (coin.buys5m > coin.sells5m * 2) return 'rising';
  if (coin.sells5m > coin.buys5m * 2) return 'falling';
  return 'stable';
}
