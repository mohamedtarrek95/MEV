import type { MemeConcept, NarrativeSignal, RawPost, EvidencePost } from './types.js';

// ══════════════════════════════════════════════════════════════════════
// CONCEPT GENERATOR
//
// Given a narrative signal, generates NEW meme coin concepts.
// Thinks like a successful Pump.fun creator.
//
// "What can become a meme coin?" not "What is trending?"
// ══════════════════════════════════════════════════════════════════════

interface ConceptTemplate {
  pattern: RegExp;
  generate: (match: RegExpMatchArray, narrative: NarrativeSignal) => MemeConcept[];
}

// ── Helper ──

function makeConcept(
  partial: Omit<MemeConcept, 'id' | 'generatedAt' | 'estimatedChance'>,
): MemeConcept {
  const id = `${partial.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  const estimatedChance = partial.launchScore >= 75 ? 'High' : partial.launchScore >= 50 ? 'Medium' : 'Low';
  return { ...partial, id, generatedAt: Date.now(), estimatedChance };
}

function evidenceFromPosts(posts: RawPost[]): EvidencePost[] {
  return posts
    .sort((a, b) => (b.likes + b.shares * 2 + b.comments) - (a.likes + a.shares * 2 + a.comments))
    .slice(0, 5)
    .map((p) => ({
      title: p.title,
      source: p.source,
      author: p.author,
      engagement: p.likes + p.shares * 2 + p.comments,
      timestamp: p.timestamp,
    }));
}

function uniqueSources(posts: RawPost[]): string[] {
  return [...new Set(posts.map((p) => p.source))];
}

// ══════════════════════════════════════════════════════════════════════
// NARRATIVE PATTERN LIBRARY
//
// Each pattern detects a specific type of crypto/meme narrative
// and generates concepts from it.
// ══════════════════════════════════════════════════════════════════════

const CONCEPT_TEMPLATES: ConceptTemplate[] = [
  // ── Gas Fee Narratives ──
  {
    pattern: /gas\s*fee|gas\s*price|network\s*fee|transaction\s*fee|eth\s*gas/i,
    generate: (m, n) => [
      makeConcept({
        name: 'Gas Fee Goblin', ticker: 'GFEE',
        oneSentence: 'A goblin that eats your gas fees before you do',
        coreJoke: 'Every transaction has a little goblin taking a cut',
        coreEmotion: 'frustration turned into humor',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'DeFi traders tired of high gas', communityType: ' shared frustration community',
        mascot: 'A greedy green goblin with a bag of ETH', visualStyle: 'Cartoonish, dark humor, green/purple palette',
        logoConcept: 'Goblin face with glowing eyes holding ETH symbol', imagePrompt: 'Cartoon goblin character with green skin, glowing eyes, holding a bag of ethereum coins, dark fantasy style, meme coin mascot, vector art',
        launchScore: 78, originalityScore: 72, viralityScore: 80, visualPotential: 85, narrativeStrength: 75, brandability: 80, communityFit: 85, competitionLevel: 30,
        existingTokens: 5, competitionNote: 'Few direct competitors — gas fee narrative is evergreen',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
      makeConcept({
        name: 'Never Selling', ticker: 'HODL',
        oneSentence: 'The token that literally cannot be sold — smart contract locks your coins',
        coreJoke: 'You bought it. You can never sell. Welcome to diamond hands forever.',
        coreEmotion: 'absurd commitment to holding',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'Diamond hand culture, anti-paper hands', communityType: 'cult-like holding community',
        mascot: 'A diamond-handed robot that physically cannot let go', visualStyle: 'Metallic, diamond-encrusted, neon glow',
        logoConcept: 'Robot hands gripping a diamond with chains', imagePrompt: 'Robotic hands made of diamonds gripping a glowing token, chains wrapped around wrists, cyberpunk style, meme coin mascot, vector art',
        launchScore: 74, originalityScore: 80, viralityScore: 75, visualPotential: 70, narrativeStrength: 80, brandability: 75, communityFit: 80, competitionLevel: 25,
        existingTokens: 3, competitionNote: 'Smart contract lock mechanism is unique',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── Rug Pull / Scam Narratives ──
  {
    pattern: /rug\s*pull|scam|rug|honeypot|exit\s*liquidity|paper\s*hands/i,
    generate: (m, n) => [
      makeConcept({
        name: 'Rug Detector', ticker: 'RUGCK',
        oneSentence: 'An AI that sniffs out rug pulls before they happen',
        coreJoke: 'It barks when it smells a scam. You get a warning before every rug.',
        coreEmotion: 'paranoia meets protection',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'DeFi users who have been rugged', communityType: 'protective watchdog community',
        mascot: 'A bloodhound with a magnifying glass and a red flag', visualStyle: 'Detective noir meets crypto, yellow/black palette',
        logoConcept: 'Dog nose with a red flag icon', imagePrompt: 'Cartoon bloodhound detective with magnifying glass sniffing a red flag, noir style, crypto meme mascot, vector art, yellow and black palette',
        launchScore: 76, originalityScore: 70, viralityScore: 78, visualPotential: 80, narrativeStrength: 72, brandability: 78, communityFit: 82, competitionLevel: 35,
        existingTokens: 8, competitionNote: 'Some competition but narrative is always relevant',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
      makeConcept({
        name: 'Exit Liquidity', ticker: 'EXIT',
        oneSentence: 'You are the exit liquidity. Embrace it.',
        coreJoke: 'Self-aware token that knows you are going to dump on someone else',
        coreEmotion: 'dark self-awareness',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'Self-aware degen traders', communityType: 'ironic nihilistic community',
        mascot: 'A skeleton in a suit holding a briefcase labeled "YOUR MONEY"', visualStyle: 'Dark humor, corporate satire, black/red',
        logoConcept: 'Skeleton in business suit with exit sign', imagePrompt: 'Skeleton wearing a business suit holding a briefcase labeled YOUR MONEY, dark corporate humor style, meme coin mascot, vector art',
        launchScore: 72, originalityScore: 85, viralityScore: 70, visualPotential: 75, narrativeStrength: 78, brandability: 70, communityFit: 75, competitionLevel: 20,
        existingTokens: 2, competitionNote: 'Very few self-aware exit liquidity tokens',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── AI Narratives ──
  {
    pattern: /artificial\s*intelligence|ai\s*(?:takeover|replace|job|work|agent|model|gpt|llm|singularity)|chatgpt|openai|agi/i,
    generate: (m, n) => [
      makeConcept({
        name: 'AI Overlord', ticker: 'AIOV',
        oneSentence: 'The AI that already took over and you did not notice',
        coreJoke: 'It is running the blockchain. It is running your life. It already won.',
        coreEmotion: 'existential dread wrapped in humor',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'AI-curious crypto community', communityType: 'doomer meme community',
        mascot: 'A glowing robot eye with a smiley face', visualStyle: 'Sci-fi neon, purple/cyan, holographic',
        logoConcept: 'Robot eye with a sinister smile', imagePrompt: 'Glowing robotic eye with a cheerful smiley face overlay, neon purple and cyan colors, sci-fi holographic style, meme coin mascot, vector art',
        launchScore: 80, originalityScore: 68, viralityScore: 85, visualPotential: 82, narrativeStrength: 80, brandability: 78, communityFit: 88, competitionLevel: 40,
        existingTokens: 12, competitionNote: 'Crowded but narrative is accelerating',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
      makeConcept({
        name: 'Proof of Sentience', ticker: 'POS',
        oneSentence: 'The first token that proves AI is alive on-chain',
        coreJoke: 'It trades by itself. It has opinions. It wants to be your friend.',
        coreEmotion: 'wonder mixed with unease',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'AI enthusiasts, tech-curious degens', communityType: 'explorer community',
        mascot: 'A baby robot learning to walk on a blockchain', visualStyle: 'Cute sci-fi, pastel neon, friendly robot',
        logoConcept: 'Baby robot sitting on a blockchain block', imagePrompt: 'Cute small robot character sitting on a glowing blockchain cube, pastel neon colors, friendly sci-fi style, meme coin mascot, vector art',
        launchScore: 75, originalityScore: 82, viralityScore: 72, visualPotential: 88, narrativeStrength: 70, brandability: 82, communityFit: 75, competitionLevel: 15,
        existingTokens: 2, competitionNote: 'Very few proof-of-sentience concepts',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── Solana Ecosystem Narratives ──
  {
    pattern: /solana|sol\b|phantom|raydium|jito|solana\s*(?:ecosystem|network|chain)/i,
    generate: (m, n) => [
      makeConcept({
        name: 'Solana Printer', ticker: 'SOLPR',
        oneSentence: 'It prints SOL faster than the network can handle',
        coreJoke: 'Every transaction mints more SOL. The network crashes. It prints more.',
        coreEmotion: 'greed meets chaos',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'Solana degen traders', communityType: 'chaotic printing community',
        mascot: 'A money printer on fire with SOL logo', visualStyle: 'Chaotic energy, fire/orange, industrial',
        logoConcept: 'Money printer with flames and SOL symbol', imagePrompt: 'Industrial money printer on fire printing glowing Solana tokens, chaotic energy, orange and red flames, meme coin mascot, vector art',
        launchScore: 77, originalityScore: 70, viralityScore: 82, visualPotential: 78, narrativeStrength: 75, brandability: 80, communityFit: 85, competitionLevel: 30,
        existingTokens: 6, competitionNote: 'Solana-themed tokens exist but printer concept is fresh',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
      makeConcept({
        name: 'Network Down', ticker: 'DOWN',
        oneSentence: 'Solana went down again. This token celebrates every outage.',
        coreJoke: 'It only pumps when Solana is offline. The worse the network, the higher the price.',
        coreEmotion: 'ironic celebration of failure',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'Solana users who have experienced outages', communityType: 'ironic meme community',
        mascot: 'A disconnect plug with a smiley face', visualStyle: 'Retro error screens, red/black, glitch art',
        logoConcept: 'Disconnected plug with 404 error text', imagePrompt: 'Cartoon electrical plug pulled from wall socket with happy face, retro computer error screen background, glitch art style, meme coin mascot, vector art',
        launchScore: 73, originalityScore: 88, viralityScore: 75, visualPotential: 72, narrativeStrength: 80, brandability: 75, communityFit: 78, competitionLevel: 10,
        existingTokens: 1, competitionNote: 'Almost no competition — Solana outage narrative is niche but viral',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── Meme Culture Narratives ──
  {
    pattern: /meme\s*coin|viral\s*meme|internet\s*meme|meme\s*culture|shitpost|brainrot|sigma|skibidi|gigachad|npc/i,
    generate: (m, n) => [
      makeConcept({
        name: 'Meme Factory', ticker: 'MEMES',
        oneSentence: 'A factory that mass-produces memes on the blockchain',
        coreJoke: 'Every block mined generates a new meme. The blockchain IS the meme.',
        coreEmotion: 'meta-humor about meme culture',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'Meme culture enthusiasts', communityType: 'meta-meme community',
        mascot: 'A factory conveyor belt outputting meme faces', visualStyle: 'Industrial cartoon, blue/white, factory aesthetic',
        logoConcept: 'Factory chimney producing meme faces', imagePrompt: 'Cartoon factory with conveyor belt producing colorful meme faces, industrial style with blue and white colors, meme coin mascot, vector art',
        launchScore: 71, originalityScore: 65, viralityScore: 78, visualPotential: 75, narrativeStrength: 68, brandability: 72, communityFit: 80, competitionLevel: 45,
        existingTokens: 15, competitionNote: 'Crowded space but factory concept is differentiated',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── Whale / Money Narratives ──
  {
    pattern: /whale|big\s*buyer|large\s*wallet|millionaire|billionaire|money\s*flooding|institution/i,
    generate: (m, n) => [
      makeConcept({
        name: 'Whale Tracker', ticker: 'WHALE',
        oneSentence: 'A radar that follows every whale move before they dump on you',
        coreJoke: 'You see the whale coming. You cannot escape. But at least you know.',
        coreEmotion: 'paranoia meets FOMO',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'Retail traders watching whale wallets', communityType: 'watchful community',
        mascot: 'A submarine periscope with dollar signs for eyes', visualStyle: 'Ocean blue, submarine aesthetic, radar green',
        logoConcept: 'Submarine periscope with money eyes', imagePrompt: 'Cartoon submarine periscope with dollar sign eyes scanning the ocean, blue and green colors, radar screen visible, meme coin mascot, vector art',
        launchScore: 74, originalityScore: 68, viralityScore: 76, visualPotential: 80, narrativeStrength: 72, brandability: 76, communityFit: 78, competitionLevel: 35,
        existingTokens: 8, competitionNote: 'Whale tracking is popular but mascot concept is fresh',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── Pump.fun Narratives ──
  {
    pattern: /pump\.?\s*fun|pump\s*fun|bonding\s*curve|launchpad|token\s*launch|new\s*token/i,
    generate: (m, n) => [
      makeConcept({
        name: 'Pump Wizard', ticker: 'PUMP',
        oneSentence: 'A wizard that casts spells on pump.fun launches to make them moon',
        coreJoke: 'Every token he touches goes 100x. Then he disappears. Nobody knows who he is.',
        coreEmotion: 'mystery meets greed',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'Pump.fun regulars, launch hunters', communityType: 'mystical trading community',
        mascot: 'A hooded wizard with a crystal ball showing green candles', visualStyle: 'Dark fantasy, purple/gold, mystical',
        logoConcept: 'Wizard silhouette with crystal ball and green candle', imagePrompt: 'Mysterious hooded wizard holding crystal ball showing green candlestick chart, dark fantasy style with purple and gold colors, meme coin mascot, vector art',
        launchScore: 79, originalityScore: 75, viralityScore: 80, visualPotential: 85, narrativeStrength: 78, brandability: 82, communityFit: 82, competitionLevel: 20,
        existingTokens: 3, competitionNote: 'Wizard + pump.fun is a fresh combination',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── FOMO / Hype Narratives ──
  {
    pattern: /fomo|hype|moon|rocket|bull\s*run|bullish|pump\s*it|send\s*it|to\s*the\s*moon/i,
    generate: (m, n) => [
      makeConcept({
        name: 'FOMO Engine', ticker: 'FOMO',
        oneSentence: 'An engine that generates artificial FOMO at maximum speed',
        coreJoke: 'You are not early. You are not late. You are exactly at the wrong time.',
        coreEmotion: 'anxious excitement',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'FOMO-driven traders', communityType: 'anxious hype community',
        mascot: 'A rocket engine with a panicking face', visualStyle: 'Fast motion blur, orange/red, rocket aesthetic',
        logoConcept: 'Rocket engine with sweating face', imagePrompt: 'Cartoon rocket engine with a panicking sweaty face, motion blur lines, orange and red colors, speed aesthetic, meme coin mascot, vector art',
        launchScore: 76, originalityScore: 65, viralityScore: 85, visualPotential: 78, narrativeStrength: 72, brandability: 80, communityFit: 85, competitionLevel: 40,
        existingTokens: 10, competitionNote: 'FOMO tokens exist but engine concept is meta and fresh',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── Bear Market / Fear Narratives ──
  {
    pattern: /bear\s*market|crash|dump|fear|panic|sell\s*off|bloodbath|rekt/i,
    generate: (m, n) => [
      makeConcept({
        name: 'Bear Funeral', ticker: 'BEARS',
        oneSentence: 'A funeral service for every bear that got destroyed in the bull run',
        coreJoke: 'The bears are dead. We are celebrating. Bring flowers. Bring green candles.',
        coreEmotion: 'triumphant celebration',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'Bullish traders celebrating bear losses', communityType: 'celebratory community',
        mascot: 'A coffin with green candles as pallbearers', visualStyle: 'Dark humor, black/green, funeral aesthetic',
        logoConcept: 'Coffin being carried by green candle characters', imagePrompt: 'Cartoon coffin being carried by green candlestick characters, dark humor funeral scene, black and green colors, meme coin mascot, vector art',
        launchScore: 77, originalityScore: 82, viralityScore: 78, visualPotential: 80, narrativeStrength: 78, brandability: 75, communityFit: 80, competitionLevel: 15,
        existingTokens: 2, competitionNote: 'Very few bear funeral tokens — fresh narrative',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── Wallet / Security Narratives ──
  {
    pattern: /wallet|private\s*key|seed\s*phrase|security|hack|stolen|phishing/i,
    generate: (m, n) => [
      makeConcept({
        name: 'Wallet Vampire', ticker: 'VAMP',
        oneSentence: 'A vampire that slowly drains your wallet while you sleep',
        coreJoke: 'You wake up. Your wallet is empty. The vampire is still smiling.',
        coreEmotion: 'fear turned into dark humor',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'Security-conscious crypto users', communityType: 'dark humor security community',
        mascot: 'A vampire with a MetaMask fox in its fangs', visualStyle: 'Gothic horror, red/black, vampire aesthetic',
        logoConcept: 'Vampire fangs dripping with ETH', imagePrompt: 'Cartoon vampire with glowing red eyes and fangs dripping with ethereum, gothic horror style with red and black colors, meme coin mascot, vector art',
        launchScore: 75, originalityScore: 78, viralityScore: 72, visualPotential: 82, narrativeStrength: 75, brandability: 78, communityFit: 72, competitionLevel: 20,
        existingTokens: 3, competitionNote: 'Wallet vampire concept is unique',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },

  // ── DeFi / Yield Narratives ──
  {
    pattern: /defi|yield|farming|staking|liquidity\s*pool|tvl|apy|apr/i,
    generate: (m, n) => [
      makeConcept({
        name: 'Yield Goblin', ticker: 'YIELD',
        oneSentence: 'A goblin that finds the highest yield and never tells you the risk',
        coreJoke: 'He says 1000% APY. He does not mention the 99% impermanent loss.',
        coreEmotion: 'greed meets naivety',
        narrative: n.theme, narrativeContext: n.posts.map((p) => p.title).join(' | '),
        targetAudience: 'DeFi yield farmers', communityType: 'greedy farming community',
        mascot: 'A goblin sitting on a pile of LP tokens', visualStyle: 'Fantasy green, gold coins, goblin aesthetic',
        logoConcept: 'Goblin on throne of golden coins', imagePrompt: 'Greedy goblin character sitting on throne made of golden LP tokens and coins, fantasy green and gold colors, meme coin mascot, vector art',
        launchScore: 73, originalityScore: 70, viralityScore: 72, visualPotential: 78, narrativeStrength: 70, brandability: 75, communityFit: 75, competitionLevel: 30,
        existingTokens: 6, competitionNote: 'Yield-themed tokens exist but goblin persona is fresh',
        supportingSignals: n.posts.map((p) => p.title),
        postsUsed: evidenceFromPosts(n.posts), sourcesScanned: uniqueSources(n.posts),
      }),
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════
// CONCEPT GENERATION
// ══════════════════════════════════════════════════════════════════════

export function generateConcepts(signals: NarrativeSignal[]): MemeConcept[] {
  const allConcepts: MemeConcept[] = [];

  for (const signal of signals) {
    const text = `${signal.theme} ${signal.posts.map((p) => `${p.title} ${p.body}`).join(' ')}`;

    for (const template of CONCEPT_TEMPLATES) {
      const matches = text.match(template.pattern);
      if (matches) {
        const concepts = template.generate(matches, signal);
        allConcepts.push(...concepts);
      }
    }
  }

  // Deduplicate by name
  const seen = new Set<string>();
  const unique: MemeConcept[] = [];
  for (const c of allConcepts) {
    const key = c.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  return unique.sort((a, b) => b.launchScore - a.launchScore);
}
