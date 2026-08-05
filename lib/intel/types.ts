export type ProviderCategory = 'social' | 'crypto' | 'news';

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
// CRYPTO MEME CREATION INTELLIGENCE ENGINE
//
// Every concept MUST originate from a REAL crypto catalyst.
// The engine thinks like a Pump.fun founder:
// "Would I personally spend 2 SOL launching this?"
//
// If the answer is NO, the concept is deleted immediately.
// ══════════════════════════════════════════════════════════════════════

export interface CryptoCatalyst {
  id: string;
  event: string;                       // "Solana network congestion spikes"
  category: string;                    // "solana", "defi", "ai", "hack", etc.
  severity: number;                    // 0-100, how much attention this is getting
  posts: RawPost[];                    // People discussing this event
  dominantEmotion: string;             // fear, greed, frustration, hype, humor
}

export interface CommunityReaction {
  catalyst: CryptoCatalyst;
  jokes: string[];                     // What people are joking about
  sarcasticComments: string[];         // Sarcastic replies
  funnyNicknames: string[];            // What people are calling things
  emotionalThemes: string[];           // Recurring emotional patterns
  viralScreenshots: string[];          // Descriptions of viral content
}

export interface MemeConcept {
  id: string;

  // ── The Catalyst ──
  cryptoCatalyst: string;              // The REAL event this came from
  catalystCategory: string;            // solana, defi, ai, hack, etc.

  // ── The Reaction ──
  communityReaction: string;           // What people are actually saying
  narrative: string;                   // The emotional narrative

  // ── The Concept ──
  name: string;                        // "Transaction Goblin"
  ticker: string;                      // "TXGN"
  oneSentence: string;                 // "A goblin that eats your pending transactions"
  memeStory: string;                   // Full story of why this exists
  coreJoke: string;                    // The punchline
  coreEmotion: string;                 // The feeling it triggers

  // ── Target ──
  expectedAudience: string;            // Who would buy this
  whyItCouldTrend: string;             // Why this could hit Pump.fun trending

  // ── Visual ──
  mascot: string;                      // Character description
  logoIdea: string;                    // Logo description
  imagePrompt: string;                 // AI image generation prompt

  // ── Scoring (0-100) ──
  launchScore: number;                 // Final composite — would I spend 2 SOL?
  viralityScore: number;               // How shareable (20%)
  originalityScore: number;            // How novel (25%)
  brandability: number;                // Rememberable (10%)
  competitionLevel: number;            // How many similar tokens (5%)
  narrativeStrength: number;           // Story strength (15%)
  visualPotential: number;             // Mascot potential (15%)
  communityFit: number;                // Crypto degen culture fit (10%)

  // ── Competition ──
  existingTokens: number;

  // ── Evidence ──
  supportingPosts: EvidencePost[];
  sourcesScanned: string[];

  // ── Timing ──
  generatedAt: number;
}

export interface EvidencePost {
  title: string;
  source: string;
  author: string;
  engagement: number;
  timestamp: number;
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

export interface PipelineDiagnostics {
  collectedPosts: number;
  cryptoPosts: number;
  catalystsDetected: number;
  reactionsExtracted: number;
  conceptsGenerated: number;
  conceptsRejected: number;
  highConviction: number;
}

// Legacy aliases
export type MemeNarrative = MemeConcept;
export type IntelReport = ConceptReport;
export type NarrativeCluster = never;
export type LaunchOpportunity = MemeConcept;
export type NarrativeReport = ConceptReport;
export type NarrativeSignal = CryptoCatalyst;
