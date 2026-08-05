import type { EnrichedCoin, NameCluster } from './types.js';

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function detectNameClusters(coins: EnrichedCoin[]): Map<string, NameCluster> {
  const groups = new Map<string, EnrichedCoin[]>();

  for (const coin of coins) {
    const norm = normalize(coin.name);
    if (!norm || norm.length < 2) continue;
    const existing = groups.get(norm) || [];
    existing.push(coin);
    groups.set(norm, existing);
  }

  const clusters = new Map<string, NameCluster>();
  const now = Date.now();

  for (const [norm, groupCoins] of groups) {
    if (groupCoins.length < 1) continue;

    const sorted = [...groupCoins].sort((a, b) => a.launchTime - b.launchTime);
    const creators = [...new Set(groupCoins.map((c) => c.creator))];
    const firstLaunch = sorted[0].launchTime;
    const lastLaunch = sorted[sorted.length - 1].launchTime;
    const spanMinutes = Math.max(1, (lastLaunch - firstLaunch) / 60000);
    const launchVelocity = groupCoins.length / spanMinutes;

    const repeatedLaunchScore = Math.min(100, groupCoins.length * 12);
    const creatorDiversity = Math.min(100, (creators.length / Math.max(1, groupCoins.length)) * 100);

    clusters.set(norm, {
      name: groupCoins[0].name,
      normalized: norm,
      count: groupCoins.length,
      firstLaunch,
      lastLaunch,
      uniqueCreators: creators,
      coins: groupCoins,
      launchVelocity,
      repeatedLaunchScore,
      creatorDiversity,
    });
  }

  return clusters;
}

export function findCluster(norm: string, clusters: Map<string, NameCluster>): NameCluster | null {
  return clusters.get(norm) || null;
}

export function normalizeForCluster(name: string): string {
  return normalize(name);
}
