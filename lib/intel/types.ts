export type ProviderCategory = 'social';

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
// LAUNCH OPPORTUNITY ENGINE TYPES
//
// This engine discovers pre-token viral narratives.
// Its only objective: "Find ideas that have high probability of
// becoming successful meme tokens."
// ══════════════════════════════════════════════════════════════════════

export interface LaunchOpportunity {
  id: string;

  // ── The Idea ──
  narrative: string;                  // "Italian Brainrot Shark"
  suggestedName: string;              // "ItalianBrainrotShark"
  suggestedTicker: string;            // "IBRK"
  oneSentenceDescription: string;     // "Absurd Italian meme combining brainrot culture with shark imagery"

  // ── Core Scores (0-100) ──
  launchScore: number;                // Final composite score
  viralityScore: number;              // How fast is this spreading?
  narrativeStrength: number;          // How complete/well-formed is this narrative?
  growthVelocity: number;             // Acceleration of discussion
  communityDiversity: number;         // How many independent voices
  crossPlatformSpread: number;        // How many platforms
  originalityScore: number;           // How novel vs. saturated?
  imagePotential: number;             // Can this become a mascot/sticker/profile pic?
  brandability: number;               // Easy to remember, pronounce, ticker?
  mascotPotential: number;            // Can this become a recognizable character?
  tickerQuality: number;              // Short, memorable, unique ticker?
  momentum: number;                   // Acceleration of discussion
  launchProbability: number;          // Probability of successful token launch

  // ── Competition ──
  competition: CompetitionData;

  // ── Evidence ──
  mentionCount: number;
  uniqueAuthors: number;
  sourcesFound: string[];
  sourceCount: number;
  socialPlatforms: string[];

  // ── Temporal ──
  firstDetected: number;
  lastSeen: number;

  // ── Narrative Structure ──
  summary: string;                    // One-sentence summary
  coreCharacters: string[];           // Recurring entities
  runningJoke: string;                // The main joke/punchline
  repeatedCatchphrases: string[];     // Ways people describe this
  relatedHashtags: string[];
  whyThisIsBecomingViral: string;     // WHY it's spreading

  // ── Content ──
  topPostTitles: string[];
  supportingPosts: SupportingPost[];
  evidence: string[];
  category: string;

  // ── Growth ──
  growthTimeline: GrowthBucket[];
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
  memePosts: number;
  culturalPosts: number;
  rejectedPosts: number;
  phrasesExtracted: number;
  narrativeClusters: number;
  passedFilter: number;
  topOpportunities: number;
  pipelineFlow: string[];
}

// Legacy aliases
export type MemeNarrative = LaunchOpportunity;
export type IntelReport = NarrativeReport;
export type NarrativeCluster = never;
