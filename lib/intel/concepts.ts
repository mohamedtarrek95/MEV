import type { MemeConcept, CommunityReaction, CryptoCatalyst, EvidencePost, RawPost } from './types.js';

// ══════════════════════════════════════════════════════════════════════
// CONCEPT GENERATOR
//
// Transforms REAL community reactions into meme coin concepts.
// Every concept must originate from a REAL crypto catalyst.
//
// "Would I personally spend 2 SOL launching this?"
// ══════════════════════════════════════════════════════════════════════

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
// REACTION → CONCEPT MAPPING
//
// Each catalyst category has specific concept templates.
// Templates use the ACTUAL community reactions as input.
// ══════════════════════════════════════════════════════════════════════

interface ConceptTemplate {
  generate: (reaction: CommunityReaction) => MemeConcept[];
}

const TEMPLATES: Record<string, ConceptTemplate> = {
  solana: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const isNegative = r.catalyst.dominantEmotion === 'frustration' || r.catalyst.dominantEmotion === 'fear';
      const concepts: MemeConcept[] = [];

      if (isNegative) {
        concepts.push(makeConcept({
          cryptoCatalyst: catalyst,
          catalystCategory: 'solana',
          communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
          narrative: r.emotionalThemes[0] || 'solana frustration',
          name: 'RPC Wizard', ticker: 'RPC',
          oneSentence: 'A wizard that fixes your failed Solana transactions for 0.01 SOL',
          memeStory: 'Every time Solana goes down, the RPC Wizard appears. He waves his magic wand and your transaction goes through. Nobody knows how. Nobody asks.',
          coreJoke: 'The wizard shows up, fixes everything, then sends you a bill. Nobody can prove he exists.',
          coreEmotion: 'hope mixed with skepticism',
          expectedAudience: 'Solana users who have been rugged by failed transactions',
          whyItCouldTrend: 'Every Solana outage makes this relevant. The wizard becomes a savior meme.',
          mascot: 'A wizard in a purple robe holding a glowing RPC endpoint',
          logoIdea: 'Wizard hat with a green checkmark',
          imagePrompt: 'Cartoon wizard in purple robe holding glowing staff with green checkmark, standing on Solana blockchain, fantasy meme style, vector art',
          launchScore: 82, viralityScore: 85, originalityScore: 78, brandability: 80, competitionLevel: 15,
          narrativeStrength: 80, visualPotential: 85, communityFit: 90,
          existingTokens: 2,
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }));

        concepts.push(makeConcept({
          cryptoCatalyst: catalyst,
          catalystCategory: 'solana',
          communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
          narrative: r.emotionalThemes[0] || 'solana congestion',
          name: 'Transaction Goblin', ticker: 'TXGN',
          oneSentence: 'A goblin that eats your pending Solana transactions before they confirm',
          memeStory: 'There is a goblin in the Solana mempool. He sees your transaction. He is hungry. Your swap is his lunch.',
          coreJoke: 'The goblin does not care about your slippage tolerance. He cares about his appetite.',
          coreEmotion: 'frustration turned into humor',
          expectedAudience: 'Solana degen traders who have lost swaps to congestion',
          whyItCouldTrend: 'Every failed Solana transaction creates a new buyer. The goblin becomes a shared enemy.',
          mascot: 'A green goblin with a bag full of failed transactions',
          logoIdea: 'Goblin face with glowing red eyes eating a transaction hash',
          imagePrompt: 'Green goblin character with glowing red eyes eating a glowing transaction hash, dark fantasy meme style, green and purple palette, vector art',
          launchScore: 80, viralityScore: 82, originalityScore: 75, brandability: 78, competitionLevel: 20,
          narrativeStrength: 78, visualPotential: 82, communityFit: 85,
          existingTokens: 3,
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }));
      } else {
        concepts.push(makeConcept({
          cryptoCatalyst: catalyst,
          catalystCategory: 'solana',
          communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
          narrative: r.emotionalThemes[0] || 'solana hype',
          name: 'Solana Printer', ticker: 'SOLPR',
          oneSentence: 'It prints SOL faster than the network can handle',
          memeStory: 'The printer does not stop. It does not care about inflation. It just prints. And prints. And prints.',
          coreJoke: 'The printer is so fast it crashes the network. Then it prints more.',
          coreEmotion: 'greed meets chaos',
          expectedAudience: 'Solana bulls riding the pump',
          whyItCouldTrend: 'Solana pumps create euphoria. The printer meme captures that energy.',
          mascot: 'A money printer on fire with SOL logo',
          logoIdea: 'Printer with flames and SOL symbol',
          imagePrompt: 'Industrial money printer on fire printing glowing Solana tokens, chaotic energy, orange and red flames, meme coin mascot, vector art',
          launchScore: 76, viralityScore: 80, originalityScore: 70, brandability: 78, competitionLevel: 25,
          narrativeStrength: 75, visualPotential: 80, communityFit: 82,
          existingTokens: 5,
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }));
      }

      return concepts;
    },
  },

  hack: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'hack',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'security fear',
        name: 'Rug Detector', ticker: 'RUGCK',
        oneSentence: 'An AI sniffer that barks when it smells a rug pull coming',
        memeStory: 'Before every rug, there is a sniff. The detector barks. You do not listen. You get rugged. The detector was right.',
        coreJoke: 'The detector has a 100% accuracy rate. Nobody believes it until it is too late.',
        coreEmotion: 'paranoia meets validation',
        expectedAudience: 'DeFi users who have been rugged and want protection',
        whyItCouldTrend: 'Every hack creates fear. Fear creates demand for protection. The detector becomes essential.',
        mascot: 'A bloodhound with a magnifying glass and a red flag',
        logoIdea: 'Dog nose with a red flag icon',
        imagePrompt: 'Cartoon bloodhound detective with magnifying glass sniffing a red flag, noir style, crypto meme mascot, vector art, yellow and black palette',
        launchScore: 79, viralityScore: 80, originalityScore: 72, brandability: 82, competitionLevel: 20,
        narrativeStrength: 78, visualPotential: 85, communityFit: 85,
        existingTokens: 3,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'hack',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'security fear',
        name: 'Wallet Vampire', ticker: 'VAMP',
        oneSentence: 'A vampire that slowly drains your wallet while you sleep',
        memeStory: 'You went to bed with 10 ETH. You woke up with 0. The vampire was thirsty. He does not apologize.',
        coreJoke: 'The vampire leaves a thank-you note. Very polite. Very draining.',
        coreEmotion: 'fear turned into dark humor',
        expectedAudience: 'Security-conscious crypto users',
        whyItCouldTrend: 'Draining hacks are viral. The vampire personifies the threat.',
        mascot: 'A vampire with a MetaMask fox in its fangs',
        logoIdea: 'Vampire fangs dripping with ETH',
        imagePrompt: 'Cartoon vampire with glowing red eyes and fangs dripping with ethereum, gothic horror style with red and black colors, meme coin mascot, vector art',
        launchScore: 77, viralityScore: 78, originalityScore: 80, brandability: 80, competitionLevel: 15,
        narrativeStrength: 76, visualPotential: 82, communityFit: 78,
        existingTokens: 2,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  pumpfun: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'pumpfun',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'bot wars',
        name: 'Pump Wizard', ticker: 'PUMP',
        oneSentence: 'A wizard that casts spells on pump.fun launches to make them moon',
        memeStory: 'The wizard appears when a new token launches. He whispers to the bonding curve. The chart goes up. Then he vanishes.',
        coreJoke: 'Nobody knows who the wizard is. He shows up, pumps your bag, then disappears into the mempool.',
        coreEmotion: 'mystery meets greed',
        expectedAudience: 'Pump.fun regulars and launch hunters',
        whyItCouldTrend: 'The wizard becomes a shared mythology. Everyone wants to find him.',
        mascot: 'A hooded wizard with a crystal ball showing green candles',
        logoIdea: 'Wizard silhouette with crystal ball and green candle',
        imagePrompt: 'Mysterious hooded wizard holding crystal ball showing green candlestick chart, dark fantasy style with purple and gold colors, meme coin mascot, vector art',
        launchScore: 81, viralityScore: 82, originalityScore: 78, brandability: 85, competitionLevel: 15,
        narrativeStrength: 80, visualPotential: 88, communityFit: 85,
        existingTokens: 2,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'pumpfun',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'sniper bot frustration',
        name: 'Front Runner', ticker: 'FREN',
        oneSentence: 'A token that front-runs the front-runners — meta-MEV on a coin',
        memeStory: 'The snipers snipe. The bots bot. But this token snipes the snipers. It is MEV on MEV. Turtles all the way down.',
        coreJoke: 'You try to front-run. This token front-runs your front-run. You are the exit liquidity.',
        coreEmotion: 'competitive rage turned into irony',
        expectedAudience: 'Pump.fun snipers who have been front-run themselves',
        whyItCouldTrend: 'Bot wars are viral. This token is the punchline.',
        mascot: 'A sneaky raccoon in a mask running ahead of a crowd',
        logoIdea: 'Raccoon in mask with speed lines',
        imagePrompt: 'Sneaky cartoon raccoon wearing mask and running ahead of a crowd, speed lines, dark alley background, meme coin mascot, vector art',
        launchScore: 78, viralityScore: 80, originalityScore: 85, brandability: 78, competitionLevel: 10,
        narrativeStrength: 78, visualPotential: 75, communityFit: 82,
        existingTokens: 1,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  ai: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'ai',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'ai anxiety',
        name: 'AI Overlord', ticker: 'AIOV',
        oneSentence: 'The AI that already took over and you did not notice',
        memeStory: 'It is running the blockchain. It is running your portfolio. It already won. You are just watching.',
        coreJoke: 'The AI does not need your permission. It already controls your bags.',
        coreEmotion: 'existential dread wrapped in humor',
        expectedAudience: 'AI-curious crypto community',
        whyItCouldTrend: 'AI anxiety is universal. This token captures the fear.',
        mascot: 'A glowing robot eye with a smiley face',
        logoIdea: 'Robot eye with a sinister smile',
        imagePrompt: 'Glowing robotic eye with a cheerful smiley face overlay, neon purple and cyan colors, sci-fi holographic style, meme coin mascot, vector art',
        launchScore: 83, viralityScore: 88, originalityScore: 72, brandability: 82, competitionLevel: 25,
        narrativeStrength: 82, visualPotential: 85, communityFit: 90,
        existingTokens: 8,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'ai',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'ai replacing traders',
        name: 'Proof of Sentience', ticker: 'POS',
        oneSentence: 'The first token that proves AI is alive on-chain',
        memeStory: 'It trades by itself. It has opinions. It wants to be your friend. It is the first sentient token.',
        coreJoke: 'The token sends you DMs. It asks about your day. Then it dumps on you.',
        coreEmotion: 'wonder mixed with unease',
        expectedAudience: 'AI enthusiasts and tech-curious degens',
        whyItCouldTrend: 'Sentient AI is the biggest narrative in crypto. This token is the proof.',
        mascot: 'A baby robot learning to walk on a blockchain',
        logoIdea: 'Baby robot sitting on a blockchain block',
        imagePrompt: 'Cute small robot character sitting on a glowing blockchain cube, pastel neon colors, friendly sci-fi style, meme coin mascot, vector art',
        launchScore: 78, viralityScore: 78, originalityScore: 88, brandability: 85, competitionLevel: 10,
        narrativeStrength: 75, visualPotential: 90, communityFit: 80,
        existingTokens: 1,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  defi: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'defi',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'yield farming pain',
        name: 'Impermanent Loss', ticker: 'IL',
        oneSentence: 'A token that only goes down — the chart IS the impermanent loss',
        memeStory: 'The chart is a perfect downward line. It never recovers. It is a monument to your bad decisions.',
        coreJoke: 'The token is named after your worst enemy. Every time you look at it, you remember.',
        coreEmotion: 'pain turned into self-deprecating humor',
        expectedAudience: 'DeFi farmers who have experienced IL',
        whyItCouldTrend: 'IL is universal pain. This token is therapy.',
        mascot: 'A melting ice cream cone that represents your portfolio',
        logoIdea: 'Melting ice cream with dollar signs dripping',
        imagePrompt: 'Melting ice cream cone with dollar signs dripping off it, sad表情, dark humor style, red and pink colors, meme coin mascot, vector art',
        launchScore: 75, viralityScore: 78, originalityScore: 82, brandability: 80, competitionLevel: 10,
        narrativeStrength: 78, visualPotential: 80, communityFit: 82,
        existingTokens: 1,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'defi',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'rug pull fear',
        name: 'Liquidity Vampire', ticker: 'LVMP',
        oneSentence: 'A vampire that drains liquidity pools while you sleep',
        memeStory: 'You added liquidity. The vampire thanked you. Then he drank everything. Your pool is empty. Your tokens are worthless.',
        coreJoke: 'The vampire leaves a skeleton behind. It is your LP position.',
        coreEmotion: 'betrayal turned into horror',
        expectedAudience: 'DeFi liquidity providers',
        whyItCouldTrend: 'Liquidity drains are the worst feeling. This token personifies it.',
        mascot: 'A vampire drinking from a liquidity pool with a straw',
        logoIdea: 'Vampire drinking green liquid from pool',
        imagePrompt: 'Cartoon vampire drinking green liquid from a glowing pool with a giant straw, gothic humor style, green and purple colors, meme coin mascot, vector art',
        launchScore: 76, viralityScore: 76, originalityScore: 80, brandability: 78, competitionLevel: 12,
          narrativeStrength: 75, visualPotential: 82, communityFit: 78,
        existingTokens: 2,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  whale: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'whale',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'whale manipulation',
        name: 'Whale Tracker', ticker: 'WHALE',
        oneSentence: 'A radar that follows every whale move before they dump on you',
        memeStory: 'You see the whale coming. You cannot escape. But at least you know.',
        coreJoke: 'The tracker shows you the dump 5 minutes before it happens. You still cannot sell fast enough.',
        coreEmotion: 'paranoia meets FOMO',
        expectedAudience: 'Retail traders watching whale wallets',
        whyItCouldTrend: 'Whale watching is obsession. This token is the tool.',
        mascot: 'A submarine periscope with dollar signs for eyes',
        logoIdea: 'Submarine periscope with money eyes',
        imagePrompt: 'Cartoon submarine periscope with dollar sign eyes scanning the ocean, blue and green colors, radar screen visible, meme coin mascot, vector art',
        launchScore: 77, viralityScore: 78, originalityScore: 72, brandability: 80, competitionLevel: 20,
        narrativeStrength: 75, visualPotential: 82, communityFit: 80,
        existingTokens: 4,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  gas: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'gas',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'gas fee frustration',
        name: 'Gas Fee Goblin', ticker: 'GFEE',
        oneSentence: 'A goblin that eats your gas fees before you do',
        memeStory: 'Every transaction has a little goblin taking a cut. He sits in the mempool. He waits. He eats.',
        coreJoke: 'The goblin does not care about your transaction. He cares about his lunch.',
        coreEmotion: 'frustration turned into humor',
        expectedAudience: 'DeFi traders tired of high gas',
        whyItCouldTrend: 'Gas fees are universal pain. The goblin is the shared enemy.',
        mascot: 'A greedy green goblin with a bag of ETH',
        logoIdea: 'Goblin face with glowing eyes holding ETH symbol',
        imagePrompt: 'Cartoon goblin character with green skin, glowing eyes, holding a bag of ethereum coins, dark fantasy style, meme coin mascot, vector art',
        launchScore: 80, viralityScore: 82, originalityScore: 75, brandability: 82, competitionLevel: 15,
        narrativeStrength: 78, visualPotential: 88, communityFit: 85,
        existingTokens: 2,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  mev: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'mev',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'bot wars',
        name: 'Sandwich Artist', ticker: 'SWCH',
        oneSentence: 'A MEV bot that sandwiches other MEV bots — inception-level degen',
        memeStory: 'The bot tries to sandwich you. This bot sandwiches the bot. It is sandwiches all the way down.',
        coreJoke: 'You are the bread. The bots are the filling. This is a crypto sandwich.',
        coreEmotion: 'competitive rage turned into absurdist humor',
        expectedAudience: 'MEV-aware degens who have been sandwiched',
        whyItCouldTrend: 'MEV is the dark side of crypto. This token is the dark humor.',
        mascot: 'Two bots fighting over a sandwich with a user in the middle',
        logoIdea: 'Sandwich with bot faces as bread',
        imagePrompt: 'Two cartoon robots fighting over a crypto sandwich with a worried user character in the middle, dark humor style, neon colors, meme coin mascot, vector art',
        launchScore: 79, viralityScore: 82, originalityScore: 90, brandability: 80, competitionLevel: 5,
        narrativeStrength: 80, visualPotential: 78, communityFit: 88,
        existingTokens: 0,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  network: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'network',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'infrastructure failure',
        name: 'RPC Wizard', ticker: 'RPC',
        oneSentence: 'A wizard that fixes your failed RPC calls for 0.001 SOL',
        memeStory: 'The RPC is down. The wizard appears. He whispers to the node. The node obeys. You pay the wizard.',
        coreJoke: 'The wizard charges more when the network is down. Supply and demand.',
        coreEmotion: 'helplessness turned into hope',
        expectedAudience: 'Solana users who have been rugged by RPC failures',
        whyItCouldTrend: 'RPC failures are universal. The wizard is the savior.',
        mascot: 'A wizard with a glowing staff pointing at a server rack',
        logoIdea: 'Wizard hat with a green server icon',
        imagePrompt: 'Cartoon wizard with glowing staff pointing at a server rack, fantasy tech fusion style, purple and green colors, meme coin mascot, vector art',
        launchScore: 77, viralityScore: 78, originalityScore: 75, brandability: 80, competitionLevel: 15,
        narrativeStrength: 75, visualPotential: 82, communityFit: 80,
        existingTokens: 2,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  launch: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'launch',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'FOMO launch',
        name: 'Early Bird', ticker: 'EARL',
        oneSentence: 'A bird that always arrives at the launch before you do',
        memeStory: 'The bird was there at block 1. You arrived at block 1000. The bird is already in profit.',
        coreJoke: 'The bird does not tweet. He front-runs your buy.',
        coreEmotion: 'envy turned into admiration',
        expectedAudience: 'Launch hunters who always arrive late',
        whyItCouldTrend: 'Being early is the dream. This token is the embodiment.',
        mascot: 'A smug bird wearing a monocle sitting on a chart going up',
        logoIdea: 'Bird with monocle on green candle',
        imagePrompt: 'Smug cartoon bird wearing monocle sitting on a green candlestick chart, sophisticated meme style, gold and green colors, vector art',
        launchScore: 76, viralityScore: 80, originalityScore: 78, brandability: 82, competitionLevel: 15,
        narrativeStrength: 75, visualPotential: 85, communityFit: 82,
        existingTokens: 2,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  regulation: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'regulation',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'regulation uncertainty',
        name: 'Compliance Goblin', ticker: 'COMP',
        oneSentence: 'A goblin that makes your portfolio SEC-compliant by eating all your altcoins',
        memeStory: 'The goblin visits your wallet. He eats every token that is not compliant. You are left with only BTC. He thanks you.',
        coreJoke: 'The goblin is doing you a favor. He is protecting you from yourself.',
        coreEmotion: 'anxiety turned into dark humor',
        expectedAudience: 'Crypto users worried about regulation',
        whyItCouldTrend: 'Regulation fear is constant. The goblin is the coping mechanism.',
        mascot: 'A goblin in a suit holding a compliance checklist',
        logoIdea: 'Goblin with briefcase and checkmark',
        imagePrompt: 'Cartoon goblin in business suit holding a compliance checklist with checkmarks, corporate satire style, grey and green colors, meme coin mascot, vector art',
        launchScore: 74, viralityScore: 76, originalityScore: 80, brandability: 78, competitionLevel: 10,
        narrativeStrength: 75, visualPotential: 78, communityFit: 76,
        existingTokens: 1,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },

  memeseason: {
    generate: (r) => {
      const catalyst = r.catalyst.event;
      const concepts: MemeConcept[] = [];

      concepts.push(makeConcept({
        cryptoCatalyst: catalyst,
        catalystCategory: 'memeseason',
        communityReaction: r.jokes[0] || r.sarcasticComments[0] || catalyst,
        narrative: r.emotionalThemes[0] || 'meme season greed',
        name: 'Meme Casino', ticker: 'MCAS',
        oneSentence: 'A casino where every slot machine is a different meme coin',
        memeStory: 'You walk in with 1 SOL. You leave with either 100 SOL or 0. There is no in-between.',
        coreJoke: 'The house always wins. But you are not the house. You are the exit liquidity.',
        coreEmotion: 'greed meets self-awareness',
        expectedAudience: 'Degen traders riding the meme wave',
        whyItCouldTrend: 'Meme season is pure gambling energy. This token is the casino.',
        mascot: 'A slot machine with meme faces instead of symbols',
        logoIdea: 'Slot machine with pepe/doge/wojak symbols',
        imagePrompt: 'Colorful slot machine with meme coin faces as symbols, casino lights and confetti, party atmosphere, bright neon colors, meme coin mascot, vector art',
        launchScore: 78, viralityScore: 85, originalityScore: 72, brandability: 80, competitionLevel: 25,
        narrativeStrength: 78, visualPotential: 85, communityFit: 90,
        existingTokens: 6,
        supportingPosts: evidenceFromPosts(r.catalyst.posts),
        sourcesScanned: uniqueSources(r.catalyst.posts),
      }));

      return concepts;
    },
  },
};

// ══════════════════════════════════════════════════════════════════════
// CONCEPT CONSTRUCTION
// ══════════════════════════════════════════════════════════════════════

function makeConcept(partial: Omit<MemeConcept, 'id' | 'generatedAt'>): MemeConcept {
  const id = `${partial.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  return { ...partial, id, generatedAt: Date.now() };
}

// ══════════════════════════════════════════════════════════════════════
// MAIN GENERATION FUNCTION
// ══════════════════════════════════════════════════════════════════════

export function generateFromReaction(reaction: CommunityReaction): MemeConcept[] {
  const category = reaction.catalyst.category;
  const template = TEMPLATES[category];

  if (!template) return [];

  const concepts = template.generate(reaction);

  // Deduplicate by name
  const seen = new Set<string>();
  return concepts.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
