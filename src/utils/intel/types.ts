export type SourceId =
  | 'reddit'
  | 'telegram'
  | 'bluesky'
  | 'mastodon'
  | 'nitter'
  | 'cryptoForums'
  | 'discordAnnouncements'
  | 'cryptoNews'
  | 'communityBoards';

export type SourceCategory = 'social' | 'crypto';

export interface SourceMeta {
  id: SourceId;
  label: string;
  weight: number;
  category: SourceCategory;
}

export interface Post {
  id: string;
  sourceId: SourceId;
  author: string;
  text: string;
  url: string;
  timestamp: number;
  likes: number;
  shares: number;
  comments: number;
}

export interface ExtractedToken {
  raw: string;
  normalized: string;
}

export interface IdeaCluster {
  key: string;
  canonicalName: string;
  tokens: string[];
  posts: Post[];
  firstSeen: number;
  lastSeen: number;
  authors: Set<string>;
  platforms: Set<SourceId>;
  totalMentions: number;
  totalEngagement: number;
}

export interface MemeIdea {
  id: string;
  name: string;
  symbol: string;
  description: string;
  trendScore: number;
  mentionCount: number;
  growthPct: number;
  uniqueAuthors: number;
  platformsFound: SourceId[];
  platformCount: number;
  firstDetected: number;
  lastSeen: number;
  confidencePct: number;
  reason: string;
  evidence: string[];
  tags: string[];
  theme: string;
  category: string;
}

export interface ISourceProvider {
  sourceId: SourceId;
  fetch(): Promise<Post[]>;
}
