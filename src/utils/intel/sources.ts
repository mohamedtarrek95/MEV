import type { SourceId } from './types';

export const WINDOW_HOURS = 24;
export const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;
export const REFRESH_INTERVAL_MS = 4 * 60 * 1000;

export function isInsideWindow(ts: number, now = Date.now()): boolean {
  return now - ts <= WINDOW_MS;
}

export interface SourceMeta {
  id: SourceId;
  label: string;
  /** 0..1 reliability weight; higher = more trustworthy signal. */
  weight: number;
  /** Score contribution weight within the global engine (sum of meta weights is not necessarily 1). */
  category: 'social' | 'memecoin' | 'dex';
}

export const SOURCES: Record<SourceId, SourceMeta> = {
  reddit: { id: 'reddit', label: 'Reddit', weight: 0.8, category: 'social' },
  telegram: { id: 'telegram', label: 'Telegram', weight: 0.85, category: 'social' },
  bluesky: { id: 'bluesky', label: 'Bluesky', weight: 0.7, category: 'social' },
  mastodon: { id: 'mastodon', label: 'Mastodon', weight: 0.65, category: 'social' },
  nitter: { id: 'nitter', label: 'Nitter (X)', weight: 0.7, category: 'social' },
  pumpfun: { id: 'pumpfun', label: 'Pump.fun', weight: 0.9, category: 'memecoin' },
  axiom: { id: 'axiom', label: 'Axiom Pulse', weight: 1.0, category: 'memecoin' },
  dexscreener: { id: 'dexscreener', label: 'DexScreener', weight: 0.95, category: 'dex' },
  dextools: { id: 'dextools', label: 'DexTools', weight: 0.85, category: 'dex' },
  geckoterminal: { id: 'geckoterminal', label: 'GeckoTerminal', weight: 0.85, category: 'dex' },
  gmgn: { id: 'gmgn', label: 'GMGN', weight: 0.8, category: 'dex' },
  bullx: { id: 'bullx', label: 'BullX', weight: 0.7, category: 'memecoin' },
  photon: { id: 'photon', label: 'Photon', weight: 0.7, category: 'memecoin' },
  birdeye: { id: 'birdeye', label: 'Birdeye', weight: 0.8, category: 'dex' },
  jupiter: { id: 'jupiter', label: 'Jupiter', weight: 0.85, category: 'dex' },
};

export function sourceLabel(id: SourceId): string {
  return SOURCES[id].label;
}

export function sourceWeight(id: SourceId): number {
  return SOURCES[id].weight;
}