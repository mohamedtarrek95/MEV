import type { TrendSuggestion, TrendTopic } from './types.js';
import { levenshtein } from './engine.js';
import { TWENTY_FOUR_HOURS_MS } from './feed.js';

export interface PumpToken {
  name: string;
  symbol: string;
  mint: string;
  imageUri: string;
  createdAt: string;
  progressPct: number;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const len = Math.max(a.length, b.length);
  if (len < 3) return false;
  return levenshtein(a, b) <= Math.floor(len * 0.25);
}

export async function fetchFinalStretchTokens(): Promise<PumpToken[]> {
  const resp = await fetch(
    'https://frontend-api-v3.pump.fun/coins/king-of-the-hill?limit=100&offset=0&includeNsfw=false',
  );
  if (!resp.ok) throw new Error(`Pump.fun king-of-the-hill HTTP ${resp.status}`);
  const data = await resp.json();
  const arr = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  const now = Date.now();
  return arr
    .filter((c) => (c.complete as boolean) === false)
    .map((c) => {
      const created = parseCreated(c.created_timestamp);
      return { c, created };
    })
    .filter(({ created }) => created !== null && now - created <= TWENTY_FOUR_HOURS_MS)
    .map(({ c, created }) => ({
      name: (c.name as string) ?? '',
      symbol: (c.symbol as string) ?? '',
      mint: (c.mint as string) ?? '',
      imageUri: (c.image_uri as string) ?? '',
      createdAt: (c.created_timestamp as string) ?? '',
      progressPct: Math.min(99, ((c.usd_market_cap as number) ?? 0) / 69000 * 100),
    }));
}

function parseCreated(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

export function matchTrendsToTokens(
  topics: TrendTopic[],
  tokens: PumpToken[],
  now = Date.now(),
): TrendSuggestion[] {
  const out: TrendSuggestion[] = [];
  for (const token of tokens) {
    const created = parseCreated(token.createdAt);
    if (!created || now - created > TWENTY_FOUR_HOURS_MS) continue;
    const nameKey = normalizeName(token.name);
    const symbolKey = normalizeName(token.symbol);
    let best: TrendTopic | null = null;
    let bestScore = -1;
    for (const topic of topics) {
      const termKey = normalizeName(topic.canonical);
      if (similar(nameKey, termKey) || (symbolKey && similar(symbolKey, termKey))) {
        if (topic.trendScore > bestScore) {
          bestScore = topic.trendScore;
          best = topic;
        }
      }
    }
    if (!best) continue;
    out.push({
      id: `${token.mint}-${now}`,
      tokenName: token.name,
      tokenSymbol: token.symbol,
      mintAddress: token.mint,
      imageUrl: token.imageUri,
      trendScore: best.trendScore,
      mentions24h: best.mentionCount,
      uniqueAccounts: best.uniqueAccounts,
      totalEngagement: best.totalEngagement,
      tokenAgeMs: now - created,
      firstDetectedAt: best.firstDetectedAt,
      matchedTopic: best.display,
      progressPct: token.progressPct,
      dexscreenerUrl: `https://dexscreener.com/solana/${token.mint}`,
    });
  }
  return out.sort((a, b) => b.trendScore - a.trendScore);
}

export function parsePumpCreated(v: unknown): number | null {
  return parseCreated(v);
}