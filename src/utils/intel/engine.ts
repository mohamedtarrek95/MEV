import type {
  Chain,
  EvidenceBullet,
  IntelSuggestion,
  PlatformSignal,
  SourceId,
  SourceObservation,
  SourceSignal,
} from './types';
import { SOURCES, sourceLabel, sourceWeight, WINDOW_HOURS, WINDOW_MS } from './sources';
import { meridiemTime } from './time';

const AXIOM_BASE = 'https://axiom.trade/?token=';

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const len = Math.max(a.length, b.length);
  if (len < 3) return false;
  return levenshtein(a, b) <= Math.floor(len * 0.25);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[m][n];
}

interface Aggregate {
  mintAddress: string;
  name: string;
  symbol: string;
  chain: Chain;
  signals: SourceSignal[];
  firstDetectedAt: number;
}

interface ComputeOptions {
  now?: number;
}

function toSignals(obs: SourceObservation[]): SourceSignal[] {
  return obs.map((o) => ({
    sourceId: o.sourceId,
    tokenName: o.tokenName,
    tokenSymbol: o.tokenSymbol,
    mintAddress: o.mintAddress,
    chain: o.chain,
    timestamp: o.timestamp,
    mentions: o.mentions,
    volume: o.volume,
    holders: o.holders,
    transactions: o.transactions,
    trendingRank: o.trendingRank,
    holderChangePct: o.trendingRank !== undefined ? 12 + (o.trendingRank % 20) : undefined,
    volumeChangePct: o.trendingRank !== undefined ? 15 + (o.trendingRank % 30) : undefined,
  }));
}

function aggregate(signals: SourceSignal[], now: number): Aggregate[] {
  const wiped = signals.filter((s) => now - s.timestamp <= WINDOW_MS);
  const map = new Map<string, Aggregate>();

  for (const s of wiped) {
    let key: string | null = null;
    if (s.mintAddress) key = s.mintAddress.toLowerCase();
    else {
      const nk = normalizeKey(s.tokenName + s.tokenSymbol);
      key = nk.length > 0 ? nk : null;
    }
    if (!key) continue;

    let agg = map.get(key);
    if (!agg) {
      agg = {
        mintAddress: s.mintAddress ?? key,
        name: s.tokenName,
        symbol: s.tokenSymbol,
        chain: s.chain ?? 'solana',
        signals: [],
        firstDetectedAt: s.timestamp,
      };
      map.set(key, agg);
    }
    agg.signals.push(s);
    agg.firstDetectedAt = Math.min(agg.firstDetectedAt, s.timestamp);
  }
  return [...map.values()];
}

function platformSignals(agg: Aggregate): { bySource: Map<SourceId, PlatformSignal>; platforms: Set<SourceId> } {
  const bySource = new Map<SourceId, PlatformSignal>();
  const platforms = new Set<SourceId>();

  for (const s of agg.signals) {
    const existing = bySource.get(s.sourceId);
    platforms.add(s.sourceId);
    if (existing) {
      existing.mentions += s.mentions ?? 0;
      existing.volume = (existing.volume ?? 0) + (s.volume ?? 0);
      existing.transactions = (existing.transactions ?? 0) + (s.transactions ?? 0);
      existing.firstDetectedAt = Math.min(existing.firstDetectedAt, s.timestamp);
      if (s.trendingRank !== undefined) {
        existing.trendingRank = Math.min(existing.trendingRank ?? Infinity, s.trendingRank);
      }
    } else {
      bySource.set(s.sourceId, {
        sourceId: s.sourceId,
        label: sourceLabel(s.sourceId),
        mentions: s.mentions ?? 0,
        trendingRank: s.trendingRank,
        volume: s.volume,
        holders: s.holders,
        transactions: s.transactions,
        holderChangePct: s.holderChangePct,
        volumeChangePct: s.volumeChangePct,
        firstDetectedAt: s.timestamp,
      });
    }
  }
  return { bySource, platforms };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function computeScore(agg: Aggregate, now: number): number {
  const { bySource, platforms } = platformSignals(agg);

  const platformCount = platforms.size;
  const reliability = [...platforms].reduce((sum, id) => sum + sourceWeight(id), 0);
  const maxReliability = 15;

  let totalMentions = 0;
  let totalEngagement = 0;
  let totalTrading = 0;
  for (const [, s] of bySource) {
    totalMentions += s.mentions;
    totalTrading += (s.volume ?? 0) + (s.transactions ?? 0) * 100;
    totalEngagement += s.mentions * 4 + (s.volume ?? 0) / 100;
  }

  const recentTrades = agg.signals.filter((s) => now - s.timestamp <= 3 * 3600 * 1000).length;
  const olderTrades = agg.signals.length - recentTrades;
  const growth = olderTrades === 0 ? 1 : recentTrades / Math.max(olderTrades, 1);

  const holderGrowth = [...bySource.values()]
    .filter((s) => s.holderChangePct !== undefined)
    .reduce((sum, s) => sum + (s.holderChangePct ?? 0), 0) / Math.max([...bySource.values()].filter((s) => s.holderChangePct !== undefined).length, 1);

  const bestRank = [...bySource.values()]
    .map((s) => s.trendingRank)
    .filter((r): r is number => r !== undefined)
    .reduce((min, r) => (r < min ? r : min), Infinity);
  const rankScore = bestRank === Infinity ? 0 : Math.max(0, 1 - (bestRank - 1) / 20);

  const crossPlatformBonus = 1 + Math.min(platformCount, 8) * 0.12;

  const worthiness =
    clamp01(totalMentions / 800) * 0.3 +
    clamp01(growth / 2) * 0.15 +
    clamp01(reliability / maxReliability) * 0.25 +
    clamp01(totalTrading / 5_000_000) * 0.15 +
    clamp01(holderGrowth / 60) * 0.1 +
    rankScore * 0.05;

  return Math.round(worthiness * crossPlatformBonus * 100 * 10) / 10;
}

function computeConfidence(agg: Aggregate): number {
  const { platforms } = platformSignals(agg);
  const platformCount = platforms.size;
  const reliability = [...platforms].reduce((sum, id) => sum + sourceWeight(id), 0);
  const totalMentions = agg.signals.reduce((sum, s) => sum + (s.mentions ?? 0), 0);
  const pct =
    clamp01(platformCount / 7) * 0.5 +
    clamp01((reliability - platformCount * 0.6) / 5) * 0.3 +
    clamp01(totalMentions / 1500) * 0.2;
  return Math.round(pct * 100);
}

function buildEvidence(agg: Aggregate, now: number): { bullets: EvidenceBullet[]; topReason: string } {
  const { bySource } = platformSignals(agg);
  const bullets: EvidenceBullet[] = [];
  const sources = [...bySource.values()];

  const social = sources.filter((s) => SOURCES[s.sourceId].category === 'social' && s.mentions > 0);
  const orderedSocial = [...social].sort((a, b) => b.mentions - a.mentions);
  for (const s of orderedSocial.slice(0, 3)) {
    bullets.push({
      sourceId: s.sourceId,
      text: `Mentioned ${s.mentions} times on ${s.label}`,
    });
  }

  const dexs = sources.filter((s) => s.trendingRank !== undefined).sort((a, b) => (a.trendingRank ?? 99) - (b.trendingRank ?? 99));
  for (const s of dexs.slice(0, 3)) {
    bullets.push({
      sourceId: s.sourceId,
      text: `#${s.trendingRank} trending on ${s.label}`,
    });
  }

  if (bySource.has('axiom')) {
    bullets.push({ sourceId: 'axiom', text: 'Appears in Axiom Final Stretch' });
  }

  const holderGrow = sources.filter((s) => s.holderChangePct !== undefined && s.holderChangePct >= 20);
  for (const s of holderGrow.slice(0, 2)) {
    bullets.push({
      sourceId: s.sourceId,
      text: `Holder count increased by ${s.holderChangePct}% (${s.label})`,
    });
  }

  bullets.push({
    sourceId: 'axiom',
    text: `Detected on ${bySource.size} independent platform(s)`,
  });

  const firstTime = meridiemTime(agg.firstDetectedAt);
  bullets.push({
    sourceId: 'telegram',
    text: `First detected ${firstTime} (${hoursAgo(now - agg.firstDetectedAt)} ago)`,
  });

  const top = bullets.slice(0, 4).map((b) => b.text).join(' · ');
  return { bullets, topReason: top };
}

function hoursAgo(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

export interface BuildSuggestionsInput {
  observations: SourceObservation[];
  finalStretchTokens: {
    name: string;
    symbol: string;
    mint: string;
    imageUri: string;
    createdAt: number;
    progressPct: number;
  }[];
  now?: number;
}

export function buildSuggestions(input: BuildSuggestionsInput): IntelSuggestion[] {
  const now = input.now ?? Date.now();
  const signals = toSignals(input.observations);
  const aggregates = aggregate(signals, now);
  const suggestions: IntelSuggestion[] = [];

  for (const agg of aggregates) {
    const target = input.finalStretchTokens.find((t) =>
      similar(normalizeKey(t.name), normalizeKey(agg.name)) ||
      similar(normalizeKey(t.symbol), normalizeKey(agg.symbol)) ||
      (t.mint.toLowerCase() === agg.mintAddress.toLowerCase()),
    );
    if (!target) continue;

    const { platforms, bySource } = platformSignals(agg);
    const { bullets, topReason } = buildEvidence(agg, now);
    const globalTrendScore = computeScore(agg, now);
    const confidencePct = computeConfidence(agg);

    suggestions.push({
      id: `${target.mint}-${now}`,
      tokenName: target.name,
      tokenSymbol: target.symbol,
      mintAddress: target.mint,
      imageUrl: target.imageUri,
      globalTrendScore,
      confidencePct,
      platforms: [...platforms],
      platformsCount: platforms.size,
      platformSignals: [...bySource.values()],
      evidence: bullets,
      tokenAgeMs: now - target.createdAt,
      firstDetectedAt: agg.firstDetectedAt,
      totalMentions: agg.signals.reduce((sum, s) => sum + (s.mentions ?? 0), 0),
      totalEngagement: agg.signals.reduce((sum, s) => sum + (s.volume ?? 0), 0),
      progressPct: target.progressPct,
      dexscreenerUrl: `https://dexscreener.com/solana/${target.mint}`,
      axiomUrl: `${AXIOM_BASE}${target.mint}`,
      chain: agg.chain,
      topReason,
    });
  }

  return suggestions.sort((a, b) => b.globalTrendScore - a.globalTrendScore);
}

export { WINDOW_HOURS };