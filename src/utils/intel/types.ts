export type Chain = 'solana' | 'base' | 'eth' | 'bsc' | 'arbitrum';

export type SourceId =
  | 'reddit'
  | 'telegram'
  | 'bluesky'
  | 'mastodon'
  | 'nitter'
  | 'pumpfun'
  | 'axiom'
  | 'dexscreener'
  | 'dextools'
  | 'geckoterminal'
  | 'gmgn'
  | 'bullx'
  | 'photon'
  | 'birdeye'
  | 'jupiter';

export interface SourceObservation {
  sourceId: SourceId;
  /** Display label for the source. */
  tokenName: string;
  tokenSymbol: string;
  mintAddress?: string;
  chain: Chain;
  timestamp: number;
  mentions?: number;
  volume?: number;
  holders?: number;
  transactions?: number;
  trendingRank?: number;
}

export interface SourceSignal {
  sourceId: SourceId;
  tokenName: string;
  tokenSymbol: string;
  mintAddress?: string;
  chain?: Chain;
  timestamp: number;
  mentions?: number;
  volume?: number;
  holders?: number;
  transactions?: number;
  trendingRank?: number;
  holderChangePct?: number;
  volumeChangePct?: number;
}

/** Aggregated evidence for a single source contributing to a token's score. */
export interface PlatformSignal {
  sourceId: SourceId;
  label: string;
  mentions: number;
  trendingRank?: number;
  volume?: number;
  holders?: number;
  transactions?: number;
  holderChangePct?: number;
  volumeChangePct?: number;
  firstDetectedAt: number;
}

export interface EvidenceBullet {
  sourceId: SourceId;
  text: string;
}

export interface IntelSuggestion {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  mintAddress: string;
  imageUrl: string;
  globalTrendScore: number;
  confidencePct: number;
  platforms: string[];
  platformsCount: number;
  platformSignals: PlatformSignal[];
  evidence: EvidenceBullet[];
  tokenAgeMs: number;
  firstDetectedAt: number;
  totalMentions: number;
  totalEngagement: number;
  progressPct: number;
  dexscreenerUrl: string;
  axiomUrl: string;
  chain: Chain;
  topReason: string;
}

export interface IntelReport {
  generatedAt: number;
  suggestions: IntelSuggestion[];
  observationsProcessed: number;
  windowHours: number;
  feedSource: string;
}