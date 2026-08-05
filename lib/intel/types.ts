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

export interface ITrendProvider {
  readonly name: string;
  readonly sourceId: string;
  readonly category: ProviderCategory;
  readonly timeoutMs?: number;
  fetch(): Promise<RawPost[]>;
}

// ══════════════════════════════════════════════════════════════════════
// LAUNCH OPPORTUNITY TYPES
//
// This project discovers pre-token viral narratives.
// It answers: "What meme should I launch today?"
// ══════════════════════════════════════════════════════════════════════

export interface LaunchOpportunity {
  id: string;
  narrative: string;
  canonicalEntity: string;
  aliases: string[];

  // Core scores (0-100)
  launchScore: number;
  viralityScore: number;
  memeStrength: number;
  growthVelocity: number;
  communityDiversity: number;
  crossPlatformSpread: number;
  originalityScore: number;

  // Competition data
  competition: CompetitionData;

  // Source data
  mentionCount: number;
  uniqueAuthors: number;
  sourcesFound: string[];
  sourceCount: number;
  socialPlatforms: string[];
  marketPlatforms: string[];

  // Temporal
  firstDetected: number;
  lastSeen: number;
  momentum: number;

  // Opportunity signals
  imagePotential: number;
  brandability: number;
  mascotPotential: number;
  tickerQuality: number;
  launchProbability: number;

  // Explanation
  reason: string;
  whySelected: string;
  evidence: string[];
  category: string;

  // Top content
  topPostTitles: string[];
  topContributingPosts: string[];
}

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

export interface NarrativeReport {
  generatedAt: number;
  opportunities: LaunchOpportunity[];
  postsProcessed: number;
  sourcesScanned: string[];
  windowHours: number;
  diagnostics: PipelineDiagnostics;
}

export interface PipelineDiagnostics {
  collectedPosts: number;
  extractedEntities: number;
  mergedEntities: number;
  rejectedEntities: RejectedEntity[];
  acceptedEntities: number;
  top15Entities: string[];
  pipelineFlow: string[];
}

export interface RejectedEntity {
  entity: string;
  reason: string;
  postCount: number;
}

// Legacy alias for backwards compat
export type MemeNarrative = LaunchOpportunity;
export type IntelReport = NarrativeReport;
export type NarrativeCluster = never;
