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
}

export interface IntelReport {
  generatedAt: number;
  narratives: MemeNarrative[];
  postsProcessed: number;
  sourcesScanned: string[];
  windowHours: number;
}

export interface TokenSuggestion {
  name: string;
  symbol: string;
  description: string;
  theme: string;
  mascot: string;
  logoPrompt: string;
  bannerPrompt: string;
  launchTags: string[];
}
