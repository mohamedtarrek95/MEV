export interface TweetMetrics {
  likes: number;
  replies: number;
  reposts: number;
  views: number;
}

export interface Tweet {
  id: string;
  authorId: string;
  authorHandle: string;
  text: string;
  createdAt: number;
  metrics: TweetMetrics;
  isPinned?: boolean;
  isAd?: boolean;
  isDupe?: boolean;
}

export interface TrendTopic {
  canonical: string;
  display: string;
  tokens: string[];
  mentionCount: number;
  uniqueAccounts: number;
  totalEngagement: number;
  firstDetectedAt: number;
  growth30m: number;
  growth3h: number;
  trendScore: number;
}

export interface TrendSuggestion {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  mintAddress: string;
  imageUrl: string;
  trendScore: number;
  mentions24h: number;
  uniqueAccounts: number;
  totalEngagement: number;
  tokenAgeMs: number;
  firstDetectedAt: number;
  matchedTopic: string;
  progressPct: number;
  dexscreenerUrl: string;
}

export interface TrendsReport {
  generatedAt: number;
  topics: TrendTopic[];
  tweetsProcessed: number;
  windowHours: number;
  suggestions: TrendSuggestion[];
  feedSource: string;
}
