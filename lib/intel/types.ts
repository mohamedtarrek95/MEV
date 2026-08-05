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

// ═══════════════ INVENTOR ═══════════════
//
// Invent original Solana meme coin ideas from real crypto events,
// narratives and community emotions.
//
// Every concept MUST originate from a REAL crypto catalyst.
// The engine thinks like a creative crypto founder:
// "Would I personally spend 2 SOL launching this?"
// ════════════════════════════════════════

export type CatalystCategory =
  | 'exchange_hack' | 'bridge_exploit' | 'etf' | 'regulation'
  | 'whale_movement' | 'ai' | 'gaming' | 'solana_upgrade'
  | 'ethereum_upgrade' | 'memecoin_mania' | 'gas_fees'
  | 'network_congestion' | 'pumpfun' | 'defi' | 'nft'
  | 'stablecoins' | 'layer2' | 'security' | 'liquidity'
  | 'macro' | 'community_drama' | 'influencer_event';

export type CommunityEmotion =
  | 'fear' | 'greed' | 'excitement' | 'fomo' | 'hope'
  | 'frustration' | 'sarcasm' | 'irony' | 'anger'
  | 'disbelief' | 'relief' | 'hype' | 'confusion';

export interface CryptoCatalyst {
  id: string;
  event: string;
  category: CatalystCategory;
  severity: number;
  posts: RawPost[];
  dominantEmotion: CommunityEmotion;
}

export interface CommunityReaction {
  catalyst: CryptoCatalyst;
  jokes: string[];
  sarcasticComments: string[];
  funnyNicknames: string[];
  emotionalThemes: string[];
}

export interface MemeConcept {
  id: string;

  // ── Token Identity ──
  name: string;
  ticker: string;
  oneSentence: string;
  backstory: string;
  coreJoke: string;
  catchphrase: string;
  communityNickname: string;

  // ── Catalyst Origin ──
  cryptoCatalyst: string;
  catalystCategory: CatalystCategory;
  detectedEmotion: CommunityEmotion;

  // ── Why People Buy ──
  whyFunny: string;
  whyRelatable: string;
  whyCryptoNative: string;
  whyPeoplePostMemes: string;
  whyInfluencersShare: string;

  // ── Visual Identity ──
  mascot: string;
  visualIdentity: string;
  logoIdea: string;
  imagePrompt: string;
  bannerPrompt: string;

  // ── Scoring (0-100) ──
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

  // ── Competition ──
  existingTokens: number;
  competitionNote: string;

  // ── Target ──
  targetAudience: string;
  launchRecommendation: string;

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
