export interface EvidencePost {
  title: string;
  source: string;
  author: string;
  engagement: number;
  timestamp: number;
}

export interface MemeConcept {
  id: string;

  name: string;
  ticker: string;
  oneSentence: string;
  coreJoke: string;
  coreEmotion: string;

  narrative: string;
  narrativeContext: string;

  targetAudience: string;
  communityType: string;

  mascot: string;
  visualStyle: string;
  logoConcept: string;
  imagePrompt: string;

  launchScore: number;
  originalityScore: number;
  viralityScore: number;
  visualPotential: number;
  narrativeStrength: number;
  brandability: number;
  communityFit: number;
  competitionLevel: number;

  existingTokens: number;
  competitionNote: string;

  supportingSignals: string[];
  postsUsed: EvidencePost[];
  sourcesScanned: string[];

  generatedAt: number;
  estimatedChance: string;
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
  memePosts: number;
  newsPosts: number;
  rejectedPosts: number;
  narrativesDetected: number;
  conceptsGenerated: number;
  conceptsFiltered: number;
  topConcepts: number;
}

export interface ConceptReport {
  generatedAt: number;
  concepts: MemeConcept[];
  narrativesDetected: NarrativeSignal[];
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
