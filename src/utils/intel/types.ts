export interface CompetitionData {
  existingTokens: number;
  deadTokens: number;
  successfulTokens: number;
  copies: number;
  forks: number;
  saturation: 'none' | 'low' | 'medium' | 'high' | 'saturated';
  recommendation: 'launch_immediately' | 'launch_soon' | 'wait' | 'do_not_launch';
  recommendationReason: string;
}

export interface SupportingPost {
  title: string;
  source: string;
  author: string;
  engagement: number;
  timestamp: number;
}

export interface GrowthBucket {
  time: number;
  count: number;
}

export interface LaunchOpportunity {
  id: string;

  narrative: string;
  suggestedName: string;
  suggestedTicker: string;
  oneSentenceDescription: string;

  launchScore: number;
  viralityScore: number;
  narrativeStrength: number;
  growthVelocity: number;
  communityDiversity: number;
  crossPlatformSpread: number;
  originalityScore: number;
  imagePotential: number;
  brandability: number;
  mascotPotential: number;
  tickerQuality: number;
  momentum: number;
  launchProbability: number;

  competition: CompetitionData;

  mentionCount: number;
  uniqueAuthors: number;
  sourcesFound: string[];
  sourceCount: number;
  socialPlatforms: string[];

  firstDetected: number;
  lastSeen: number;

  summary: string;
  coreCharacters: string[];
  runningJoke: string;
  repeatedCatchphrases: string[];
  relatedHashtags: string[];
  whyThisIsBecomingViral: string;

  topPostTitles: string[];
  supportingPosts: SupportingPost[];
  evidence: string[];
  category: string;
  growthTimeline: GrowthBucket[];
}

export interface PipelineDiagnostics {
  collectedPosts: number;
  memePosts: number;
  culturalPosts: number;
  rejectedPosts: number;
  phrasesExtracted: number;
  narrativeClusters: number;
  passedFilter: number;
  topOpportunities: number;
  pipelineFlow: string[];
}

export interface NarrativeReport {
  generatedAt: number;
  opportunities: LaunchOpportunity[];
  postsProcessed: number;
  sourcesScanned: string[];
  windowHours: number;
  diagnostics: PipelineDiagnostics;
}

export interface IntelReport extends NarrativeReport {}
export type MemeNarrative = LaunchOpportunity;
