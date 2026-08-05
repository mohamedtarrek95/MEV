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
// This engine INVENTS new meme coin concepts.
// It does NOT detect existing memes.
// It does NOT rank existing tokens.
//
// Its only objective:
// "If I launch this meme coin today, why would people buy it?"
// ══════════════════════════════════════════════════════════════════════

export interface MemeConcept {
  id: string;

  // ── The Concept ──
  name: string;                       // "Gas Fee Goblin"
  ticker: string;                     // "GFEE"
  oneSentence: string;                // "A goblin that eats your gas fees before you do"
  coreJoke: string;                   // The punchline — why this is funny
  coreEmotion: string;                // The feeling it triggers (frustration, hype, absurdity)

  // ── Narrative Origin ──
  narrative: string;                  // The underlying narrative this concept emerged from
  narrativeContext: string;           // Full context of why this narrative exists

  // ── Target ──
  targetAudience: string;             // Who would buy this
  communityType: string;              // What kind of community forms around it

  // ── Visual ──
  mascot: string;                     // Character description
  visualStyle: string;                // Art style direction
  logoConcept: string;                // Logo description
  imagePrompt: string;                // AI image generation prompt

  // ── Scoring (0-100) ──
  launchScore: number;                // Final composite score
  originalityScore: number;           // How novel (25%)
  viralityScore: number;              // How shareable (20%)
  visualPotential: number;            // Mascot/sticker/profile pic potential (15%)
  narrativeStrength: number;          // How well-formed is the story (15%)
  brandability: number;               // Rememberable, pronounceable (10%)
  communityFit: number;               // Does crypto twitter love this (10%)
  competitionLevel: number;           // How many similar tokens exist (5%)

  // ── Competition ──
  existingTokens: number;
  competitionNote: string;

  // ── Evidence ──
  supportingSignals: string[];
  postsUsed: EvidencePost[];
  sourcesScanned: string[];

  // ── Timing ──
  generatedAt: number;
  estimatedChance: string;            // "High" / "Medium" / "Low"
}

export interface EvidencePost {
  title: string;
  source: string;
  author: string;
  engagement: number;
  timestamp: number;
}

export interface NarrativeSignal {
  theme: string;                      // "gas fee frustration"
  strength: number;                   // 0-100
  postCount: number;
  sourceCount: number;
  emotion: string;                    // dominant emotion
  posts: RawPost[];
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

// Legacy aliases
export type MemeNarrative = MemeConcept;
export type IntelReport = ConceptReport;
export type NarrativeCluster = never;
export type LaunchOpportunity = MemeConcept;
export type NarrativeReport = ConceptReport;
