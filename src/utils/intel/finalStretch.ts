import { NARRATIVES } from './providers/mockMulti';

export interface FinalStretchToken {
  name: string;
  symbol: string;
  mint: string;
  imageUri: string;
  createdAt: number;
  progressPct: number;
}

const TWENTY_FOUR_HOURS_MS = 24 * 3600 * 1000;
const TARGET = 69000;

function parseTs(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const t = new Date(v).getTime();
    if (Number.isFinite(t)) return t;
  }
  return null;
}

function computeProgress(marketCap: number): number {
  return Math.min(99, Math.max(1, (marketCap / TARGET) * 100));
}

export async function fetchRealFinalStretch(): Promise<FinalStretchToken[]> {
  const resp = await fetch(
    'https://frontend-api-v3.pump.fun/coins/king-of-the-hill?limit=100&offset=0&includeNsfw=false',
  );
  if (!resp.ok) throw new Error(`Pump.fun HTTP ${resp.status}`);
  const data = (await resp.json()) as Record<string, unknown>[];
  const now = Date.now();
  return (Array.isArray(data) ? data : [])
    .filter((c) => (c.complete as boolean) === false)
    .filter((c) => {
      const ts = parseTs(c.created_timestamp);
      return ts !== null && now - ts <= TWENTY_FOUR_HOURS_MS;
    })
    .map((c) => ({
      name: (c.name as string) ?? '',
      symbol: (c.symbol as string) ?? '',
      mint: (c.mint as string) ?? '',
      imageUri: (c.image_uri as string) ?? '',
      createdAt: parseTs(c.created_timestamp) ?? now,
      progressPct: computeProgress((c.usd_market_cap as number) ?? 0),
    }));
}

/**
 * Mock fallback that returns tokens matching the mock source observations
 * so the UI always has data to display.
 */
export function mockFinalStretch(): FinalStretchToken[] {
  const now = Date.now();
  return NARRATIVES.map((n, i) => ({
    name: n.name,
    symbol: n.symbol,
    mint: n.mint,
    imageUri: `https://picsum.photos/seed/${n.symbol.toLowerCase()}/200/200`,
    createdAt: now - Math.round(Math.random() * TWENTY_FOUR_HOURS_MS * 0.8),
    progressPct: Math.round(30 + Math.random() * 60),
  }));
}

export async function fetchFinalStretch(): Promise<FinalStretchToken[]> {
  try {
    const real = await fetchRealFinalStretch();
    if (real.length > 0) return real;
  } catch {
    /* fall through */
  }
  return mockFinalStretch();
}