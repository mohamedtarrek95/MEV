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

  name: string;
  ticker: string;
  oneSentence: string;
  backstory: string;
  coreJoke: string;
  catchphrase: string;
  communityNickname: string;

  cryptoCatalyst: string;
  catalystCategory: string;
  detectedEmotion: string;

  whyFunny: string;
  whyRelatable: string;
  whyCryptoNative: string;
  whyPeoplePostMemes: string;
  whyInfluencersShare: string;

  mascot: string;
  visualIdentity: string;
  logoIdea: string;
  imagePrompt: string;
  bannerPrompt: string;

  launchScore: number;
  originality: number;
  virality: number;
  visualPotential: number;
  storyStrength: number;
  communityPotential: number;
  brandability: number;
  cryptoRelevance: number;
  memePotential: number;
  competition: number;
  launchTiming: number;

  existingTokens: number;
  competitionNote: string;

  targetAudience: string;
  launchRecommendation: string;

  supportingPosts: EvidencePost[];
  sourcesScanned: string[];

  generatedAt: number;
}

export interface CryptoCatalyst {
  id: string;
  event: string;
  category: string;
  severity: number;
  dominantEmotion: string;
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
export type NarrativeSignal = CryptoCatalyst;
export type CompetitionData = never;
