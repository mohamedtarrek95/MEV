import type { TrendTopic, FinalStretchToken, TrendSuggestion } from './types';
import { levenshtein } from './fuzzy';
import { TWENTY_FOUR_HOURS_MS } from './feedProvider';

function normalizeTokenName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function isSimilarFn(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen < 3) return false;
  return levenshtein(a, b) <= Math.floor(maxLen * 0.25);
}

export function buildDexscreenerUrl(mint: string): string {
  return `https://dexscreener.com/solana/${mint}`;
}

/**
 * Matches trending topics to Pump.fun tokens currently in the Final Stretch
 * section. Only tokens created within the last 24h are considered. Returns
 * suggestions sorted by Trend Score.
 */
export function matchTrendsToTokens(
  topics: TrendTopic[],
  tokens: FinalStretchToken[],
  now = Date.now(),
): TrendSuggestion[] {
  const windowStart = now - TWENTY_FOUR_HOURS_MS;
  const suggestions: TrendSuggestion[] = [];

  for (const token of tokens) {
    const created = parseCreated(token.createdAt);
    if (!created || created < windowStart) continue;

    const nameKey = normalizeTokenName(token.name);
    const symbolKey = normalizeTokenName(token.symbol);

    let best: TrendTopic | null = null;
    let bestScore = -1;

    for (const topic of topics) {
      const termKey = normalizeTokenName(topic.canonical);
      if (!termKey) continue;
      if (isSimilarFn(nameKey, termKey) || (symbolKey && isSimilarFn(symbolKey, termKey))) {
        if (topic.trendScore > bestScore) {
          bestScore = topic.trendScore;
          best = topic;
        }
      }
    }

    if (!best) continue;

    suggestions.push({
      id: `${token.mint}-${Date.now()}`,
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
      dexscreenerUrl: buildDexscreenerUrl(token.mint),
    });
  }

  return suggestions.sort((a, b) => b.trendScore - a.trendScore);
}

function parseCreated(value: string | number): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

export { parseCreated };

export function formatAge(ageMs: number): string {
  const mins = Math.floor(ageMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}