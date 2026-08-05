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

export interface LaunchOpportunity {
  id: string;
  narrative: string;
  canonicalEntity: string;
  aliases: string[];

  launchScore: number;
  viralityScore: number;
  memeStrength: number;
  growthVelocity: number;
  communityDiversity: number;
  crossPlatformSpread: number;
  originalityScore: number;

  competition: CompetitionData;

  mentionCount: number;
  uniqueAuthors: number;
  sourcesFound: string[];
  sourceCount: number;
  socialPlatforms: string[];
  marketPlatforms: string[];

  firstDetected: number;
  lastSeen: number;
  momentum: number;

  imagePotential: number;
  brandability: number;
  mascotPotential: number;
  tickerQuality: number;
  launchProbability: number;

  reason: string;
  whySelected: string;
  evidence: string[];
  category: string;

  topPostTitles: string[];
  topContributingPosts: string[];
}

export interface PipelineDiagnostics {
  collectedPosts: number;
  extractedEntities: number;
  mergedEntities: number;
  rejectedEntities: Array<{ entity: string; reason: string; postCount: number }>;
  acceptedEntities: number;
  top15Entities: string[];
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
