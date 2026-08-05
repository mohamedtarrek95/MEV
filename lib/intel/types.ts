export type ProviderCategory = 'social' | 'market';

export interface RawPost {
  id: string;
  source: string;
  author: string;
  title: string;
  body: string;
  url: string;
  timestamp: number;
  likes: number;
  shares: number;
  comments: number;
  providerCategory: ProviderCategory;
}

export interface NarrativeCluster {
  key: string;
  canonicalName: string;
  phrases: string[];
  posts: RawPost[];
  firstSeen: number;
  lastSeen: number;
  authors: Set<string>;
  sources: Set<string>;
  totalMentions: number;
  totalEngagement: number;
}

export interface MemeNarrative {
  id: string;
  narrative: string;
  trendScore: number;
  mentionCount: number;
  growthPct: number;
  uniqueAuthors: number;
  sourcesFound: string[];
  sourceCount: number;
  firstDetected: number;
  lastSeen: number;
  confidencePct: number;
  reason: string;
  evidence: string[];
  category: string;
  topPostTitles: string[];
  qualityScore: number;
  narrativeWhy: string;
  isNarrative: boolean;
  topContributingPosts: string[];
  topPlatforms: string[];
  trendCause: string;
  humanAuthors: string[];
  marketSignals: string[];
  socialPlatforms: string[];
}

export interface IntelReport {
  generatedAt: number;
  narratives: MemeNarrative[];
  postsProcessed: number;
  sourcesScanned: string[];
  windowHours: number;
}

export interface ITrendProvider {
  readonly name: string;
  readonly sourceId: string;
  readonly category: ProviderCategory;
  readonly timeoutMs?: number;
  fetch(): Promise<RawPost[]>;
}
