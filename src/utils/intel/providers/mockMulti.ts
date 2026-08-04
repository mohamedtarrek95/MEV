import type { SourceObservation, SourceId } from '../types';
import { WINDOW_MS } from '../sources';
import { type ISourceProvider } from './provider';

interface Narrative {
  name: string;
  symbol: string;
  mint: string;
}

export const NARRATIVES: Narrative[] = [
  { name: 'dogwifcap', symbol: 'DOGC', mint: 'DOGCxu5h1bNQ1FmKxqBqPumpXampleMint1111111111' },
  { name: 'Pepe Frog', symbol: 'PEPE', mint: 'PEPEfrog2c7MwdFxyzPumpXampleMint222222222' },
  { name: 'Bonk 2.0', symbol: 'BONK2', mint: 'BONK2narrativeBoostPumpXampleMint333333333' },
  { name: 'AI Agent', symbol: 'AGNT', mint: 'AGNTaiAgentmemePumpXampleMint444444444' },
  { name: 'Sad Cat', symbol: 'SADC', mint: 'SADCcatmemeFinalStretchPumpMint555555555' },
];

/** Which narrative each source strongly covers and its level of amplification. */
const SOURCE_FOCUS: Record<SourceId, { focus: string[]; intensity: number }> = {
  reddit: { focus: ['dogwifcap', 'Pepe Frog', 'Bonk 2.0', 'AI Agent'], intensity: 9 },
  telegram: { focus: ['dogwifcap', 'AI Agent', 'Sad Cat'], intensity: 8 },
  bluesky: { focus: ['Pepe Frog', 'AI Agent', 'Bonk 2.0'], intensity: 4 },
  mastodon: { focus: ['AI Agent', 'Pepe Frog'], intensity: 3 },
  nitter: { focus: ['dogwifcap', 'Bonk 2.0', 'Sad Cat'], intensity: 6 },
  pumpfun: { focus: NARRATIVES.map((n) => n.name), intensity: 10 },
  axiom: { focus: ['dogwifcap', 'Bonk 2.0', 'AI Agent', 'Sad Cat'], intensity: 10 },
  dexscreener: { focus: ['dogwifcap', 'Pepe Frog', 'Bonk 2.0'], intensity: 8 },
  dextools: { focus: ['Pepe Frog', 'Bonk 2.0'], intensity: 6 },
  geckoterminal: { focus: ['dogwifcap', 'AI Agent'], intensity: 5 },
  gmgn: { focus: ['dogwifcap', 'Bonk 2.0', 'Sad Cat'], intensity: 7 },
  bullx: { focus: ['dogwifcap', 'AI Agent'], intensity: 6 },
  photon: { focus: ['Pepe Frog', 'Bonk 2.0'], intensity: 5 },
  birdeye: { focus: ['dogwifcap', 'Bonk 2.0', 'Sad Cat'], intensity: 6 },
  jupiter: { focus: ['dogwifcap', 'Bonk 2.0', 'AI Agent'], intensity: 4 },
};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MockMultiSourceProvider implements ISourceProvider {
  readonly sourceId: SourceId;
  private seed: number;

  constructor(sourceId: SourceId, seed = 1) {
    this.sourceId = sourceId;
    this.seed = seed;
  }

  async fetch(since?: number): Promise<SourceObservation[]> {
    await new Promise((r) => setTimeout(r, 30));
    const cfg = SOURCE_FOCUS[this.sourceId];
    const rand = mulberry32(this.seed + this.sourceId.length * 7);
    const now = Date.now();
    const observations: SourceObservation[] = [];

    for (const item of NARRATIVES) {
      if (!cfg.focus.includes(item.name)) continue;
      const createdAt = now - Math.round(rand() * Math.floor(WINDOW_MS * 0.9));
      if (since && createdAt <= since) continue;

      const mentions = Math.max(3, Math.round(rand() * cfg.intensity * 14));
      observations.push({
        sourceId: this.sourceId,
        tokenName: item.name,
        tokenSymbol: item.symbol,
        mintAddress: item.mint,
        chain: 'solana',
        timestamp: createdAt,
        mentions,
        volume: Math.round(rand() * 900_000),
        holders: Math.round(rand() * 4000),
        transactions: Math.round(rand() * 1200),
        trendingRank: this.sourceId === 'dexscreener' ? 1 + Math.floor(rand() * 5) : undefined,
      });
    }
    return observations;
  }
}