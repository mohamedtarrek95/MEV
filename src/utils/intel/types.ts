export type SourceId =
  | 'reddit'
  | 'telegram'
  | 'bluesky'
  | 'mastodon'
  | 'nitter'
  | 'cryptoNews'
  | 'aiNews'
  | 'gamingNews'
  | 'techNews'
  | 'entertainmentNews'
  | 'memeWebsites'
  | 'publicForums';

export type SourceCategory = 'social' | 'news' | 'community';

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

export interface TokenSuggestion {
  name: string;
  symbol: string;
  description: string;
  theme: string;
  lore: string;
  mascot: string;
  colorPalette: string[];
  logoPrompt: string;
  bannerPrompt: string;
  websiteStyle: string;
  socialBio: string;
  launchTags: string[];
}

export interface MemeIdea {
  id: string;
  narrative: string;
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
  category: string;
  token: TokenSuggestion;
}

export interface ISourceProvider {
  sourceId: SourceId;
  fetch(): Promise<Post[]>;
}
