export interface EvidencePost {
  title: string;
  source: string;
  author: string;
  engagement: number;
  timestamp: number;
}

export interface CryptoCatalyst {
  id: string;
  event: string;
  category: string;
  severity: number;
  dominantEmotion: string;
}

export interface MemeConcept {
  id: string;

  cryptoCatalyst: string;
  catalystCategory: string;
  communityReaction: string;
  narrative: string;

  name: string;
  ticker: string;
  oneSentence: string;
  memeStory: string;
  coreJoke: string;
  coreEmotion: string;

  expectedAudience: string;
  whyItCouldTrend: string;

  mascot: string;
  logoIdea: string;
  imagePrompt: string;

  launchScore: number;
  viralityScore: number;
  originalityScore: number;
  brandability: number;
  competitionLevel: number;
  narrativeStrength: number;
  visualPotential: number;
  communityFit: number;

  existingTokens: number;

  supportingPosts: EvidencePost[];
  sourcesScanned: string[];

  generatedAt: number;
}

export interface NarrativeSignal {
  theme: string;
  strength: number;
  postCount: number;
  sourceCount: number;
  emotion: string;
}

export interface PipelineDiagnostics {
  collectedPosts: number;
  cryptoPosts: number;
  catalystsDetected: number;
  reactionsExtracted: number;
  conceptsGenerated: number;
  conceptsRejected: number;
  highConviction: number;
}

export interface ConceptReport {
  generatedAt: number;
  concepts: MemeConcept[];
  catalystsDetected: CryptoCatalyst[];
  postsProcessed: number;
  sourcesScanned: string[];
  windowHours: number;
  diagnostics: PipelineDiagnostics;
}

// Legacy aliases
export type MemeNarrative = MemeConcept;
export type IntelReport = ConceptReport;
export type NarrativeCluster = never;
export type LaunchOpportunity = MemeConcept;
export type NarrativeReport = ConceptReport;
export type CompetitionData = never;
