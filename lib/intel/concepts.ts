import type { MemeConcept, CommunityReaction, EvidencePost, RawPost, CatalystCategory, CommunityEmotion } from './types.js';

// ══════════════════════════════════════════════════════════════════════
// CONCEPT GENERATOR
//
// Invents meme coin CHARACTERS from real crypto catalysts.
// Never returns keywords. Always returns complete concepts.
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

function makeConcept(p: Omit<MemeConcept, 'id' | 'generatedAt'>): MemeConcept {
  const id = `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  return { ...p, id, generatedAt: Date.now() };
}

// ══════════════════════════════════════════════════════════════════════
// CATALYST → CHARACTER MAPPING
//
// Each catalyst category has specific character archetypes.
// Characters are MEMEABLE, not just descriptive.
// ══════════════════════════════════════════════════════════════════════

interface CharacterTemplate {
  generate: (r: CommunityReaction) => MemeConcept[];
}

const TEMPLATES: Record<string, CharacterTemplate> = {
  exchange_hack: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Rug Reaper', ticker: 'REAP',
          oneSentence: 'The reaper that collects tokens from every rug pull before you can sell',
          backstory: 'The Rug Reaper appeared when the first exchange got hacked. He floats above the blockchain, scythe in hand, collecting tokens the moment they become worthless. Nobody has ever escaped him. Nobody ever will.',
          coreJoke: 'The reaper does not discriminate. He takes from everyone equally. At least he is fair.',
          catchphrase: 'Your bags are mine.',
          communityNickname: 'The Reaper',
          cryptoCatalyst: cat, catalystCategory: 'exchange_hack', detectedEmotion: 'fear',
          whyFunny: 'The reaper turns the scariest moment in crypto (getting hacked) into a dark humor character',
          whyRelatable: 'Everyone has lost money to a hack or rug. The reaper is that feeling personified.',
          whyCryptoNative: 'Only crypto has reapers that live on-chain and collect tokens in real-time',
          whyPeoplePostMemes: 'The reaper is the perfect response to every "just got hacked" post',
          whyInfluencersShare: 'Dark humor about hacks is engagement gold',
          mascot: 'A hooded skeleton with a glowing green scythe, floating above a blockchain',
          visualIdentity: 'Gothic horror meets blockchain, green/black palette, glowing elements',
          logoIdea: 'Skeleton face with glowing green eyes and scythe silhouette',
          imagePrompt: 'Hooded skeleton reaper character with glowing green scythe, floating above digital blockchain, gothic horror meme style, dark background with green glow, vector art, mascot design',
          bannerPrompt: 'Dark gothic scene with skeleton reaper floating over blockchain, green glowing scythe cutting through transaction hashes, dramatic lighting',
          launchScore: 82, originality: 85, virality: 80, visualPotential: 88, storyStrength: 85,
          communityPotential: 82, brandability: 80, cryptoRelevance: 90, memePotential: 85, competition: 15, launchTiming: 80,
          existingTokens: 2, competitionNote: 'Few reaper-themed tokens — dark humor is underexplored',
          targetAudience: 'Crypto users who have been hacked or rugged',
          launchRecommendation: 'LAUNCH NOW — hack season creates constant demand',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
        makeConcept({
          name: 'Wallet Vampire', ticker: 'VAMP',
          oneSentence: 'A vampire that slowly drains your wallet while you sleep',
          backstory: 'The Wallet Vampire does not attack. He waits. He watches you sign transactions at 3am. He follows you to that sketchy DeFi protocol. And when you are most vulnerable, he drinks. Slowly. Patiently. By morning, your wallet is empty. But he always leaves a thank-you note.',
          coreJoke: 'The vampire is polite. He drains your wallet and sends a thank-you DM.',
          catchphrase: 'Sweet dreams, dear holder.',
          communityNickname: 'Count Dracula of DeFi',
          cryptoCatalyst: cat, catalystCategory: 'exchange_hack', detectedEmotion: 'fear',
          whyFunny: 'The vampire personifies the slow drain of wallet exploits — not a sudden hack, but a creeping loss',
          whyRelatable: 'Everyone has watched their portfolio slowly bleed. The vampire is that experience.',
          whyCryptoNative: 'Only crypto has vampires that drain wallets through smart contract exploits',
          whyPeoplePostMemes: 'The vampire is the perfect meme for "my wallet is bleeding" posts',
          whyInfluencersShare: 'Vampire aesthetics are visually striking and shareable',
          mascot: 'A suave vampire in a suit, holding a MetaMask fox in its fangs',
          visualIdentity: 'Gothic elegance, red/black palette, dripping elements',
          logoIdea: 'Vampire fangs dripping with ETH, monocle with dollar sign',
          imagePrompt: 'Suave cartoon vampire in business suit, holding MetaMask fox in fangs, dripping with ethereum, gothic elegance style, red and black colors, meme coin mascot, vector art',
          bannerPrompt: 'Gothic castle scene with vampire overlooking blockchain landscape, red moon, ethereum symbols floating like bats',
          launchScore: 79, originality: 82, virality: 78, visualPotential: 85, storyStrength: 82,
          communityPotential: 78, brandability: 82, cryptoRelevance: 88, memePotential: 80, competition: 18, launchTiming: 78,
          existingTokens: 3, competitionNote: 'Vampire theme exists but wallet-drain angle is fresh',
          targetAudience: 'Security-conscious crypto users',
          launchRecommendation: 'LAUNCH SOON — security fear is always relevant',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  bridge_exploit: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Bridge Troll', ticker: 'TROLL',
          oneSentence: 'A troll that lives under every cross-chain bridge and demands a toll',
          backstory: 'Under every bridge there is a troll. In crypto, the troll is real. He sits there, waiting for your cross-chain swap. He takes a little from every transaction. Nobody knows how much he has collected. Nobody dares to ask.',
          coreJoke: 'The troll charges more when the bridge is congested. Supply and demand.',
          catchphrase: 'Pay the toll or stay on your chain.',
          communityNickname: 'Bridge Boy',
          cryptoCatalyst: cat, catalystCategory: 'bridge_exploit', detectedEmotion: 'frustration',
          whyFunny: 'The troll turns bridge frustration into a fairy tale villain',
          whyRelatable: 'Everyone has lost money bridging. The troll is that pain.',
          whyCryptoNative: 'Only crypto has trolls that live under bridges and drain funds',
          whyPeoplePostMemes: 'The troll is the perfect response to every bridge fail post',
          whyInfluencersShare: 'Fairy tale characters are universally recognizable and memeable',
          mascot: 'A green troll with a club, sitting under a glowing bridge',
          visualIdentity: 'Fairy tale dark fantasy, green/brown palette, bridge imagery',
          logoIdea: 'Troll face under bridge silhouette with club',
          imagePrompt: 'Cartoon green troll with club sitting under glowing blockchain bridge, fairy tale dark fantasy style, green and brown colors, meme coin mascot, vector art',
          bannerPrompt: 'Dark forest scene with bridge stretching across, troll silhouette underneath, glowing toll booth sign',
          launchScore: 78, originality: 80, virality: 76, visualPotential: 82, storyStrength: 80,
          communityPotential: 78, brandability: 80, cryptoRelevance: 85, memePotential: 80, competition: 12, launchTiming: 78,
          existingTokens: 1, competitionNote: 'Almost no bridge troll tokens — fresh niche',
          targetAudience: 'Cross-chain traders who have been burned by bridge fees',
          launchRecommendation: 'LAUNCH NOW — bridge exploits create viral moments',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  etf: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'ETF Penguin', ticker: 'PENG',
          oneSentence: 'A penguin that waddles between TradFi and Crypto, carrying ETF papers',
          backstory: 'The ETF Penguin was born when BlackRock filed for a Bitcoin ETF. He waddles between Wall Street and the blockchain, carrying paperwork that nobody understands. He is confused. We are confused. Everyone is confused. But he keeps waddling.',
          coreJoke: 'The penguin does not know what an ETF is. He just carries the papers.',
          catchphrase: 'Waddle if you are bullish.',
          communityNickname: 'Peng',
          cryptoCatalyst: cat, catalystCategory: 'etf', detectedEmotion: 'confusion',
          whyFunny: 'The penguin captures the absurdity of TradFi trying to understand crypto',
          whyRelatable: 'Everyone is confused by ETF filings. The penguin is that confusion.',
          whyCryptoNative: 'ETF filings are uniquely crypto — TradFi trying to adopt our technology',
          whyPeoplePostMemes: 'The penguin is the perfect mascot for every ETF filing post',
          whyInfluencersShare: 'Cute animals + finance humor = engagement gold',
          mascot: 'A confused penguin in a suit, carrying a stack of papers',
          visualIdentity: 'Corporate cute, black/white/tie-blue palette, penguin aesthetic',
          logoIdea: 'Penguin in suit with briefcase and Bitcoin symbol',
          imagePrompt: 'Cute cartoon penguin in business suit carrying stack of ETF papers, confused expression, corporate cute style, black and white with blue tie, meme coin mascot, vector art',
          bannerPrompt: 'Wall Street scene with penguin waddling between skyscrapers and blockchain, carrying papers, humorous contrast',
          launchScore: 77, originality: 82, virality: 78, visualPotential: 90, storyStrength: 78,
          communityPotential: 80, brandability: 88, cryptoRelevance: 80, memePotential: 85, competition: 10, launchTiming: 80,
          existingTokens: 1, competitionNote: 'ETF penguin is unique — penguin + ETF is fresh',
          targetAudience: 'Crypto users following ETF news',
          launchRecommendation: 'LAUNCH NOW — ETF season creates viral moments',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  regulation: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Compliance Goblin', ticker: 'COMP',
          oneSentence: 'A goblin that makes your portfolio SEC-compliant by eating all your altcoins',
          backstory: 'The Compliance Goblin works for the SEC. He visits your wallet at night. He eats every token that is not registered. You wake up with only BTC and ETH. He leaves a receipt. The receipt says "You are welcome."',
          coreJoke: 'The goblin is doing you a favor. He is protecting you from yourself.',
          catchphrase: 'Compliance is delicious.',
          communityNickname: 'The Auditor',
          cryptoCatalyst: cat, catalystCategory: 'regulation', detectedEmotion: 'frustration',
          whyFunny: 'The goblin turns regulation fear into a dark humor character',
          whyRelatable: 'Everyone fears the SEC. The goblin is that fear personified.',
          whyCryptoNative: 'SEC regulation is uniquely crypto — no other industry has compliance goblins',
          whyPeoplePostMemes: 'The goblin is the perfect response to every SEC news post',
          whyInfluencersShare: 'Regulation humor is engagement gold in crypto',
          mascot: 'A goblin in a suit holding a compliance checklist and a bag of confiscated tokens',
          visualIdentity: 'Corporate dark humor, grey/green palette, goblin aesthetic',
          logoIdea: 'Goblin face with SEC badge and checkmark',
          imagePrompt: 'Cartoon goblin in business suit holding compliance checklist and bag of altcoins, corporate dark humor style, grey and green colors, meme coin mascot, vector art',
          bannerPrompt: 'Office scene with goblin at desk reviewing compliance documents, blockchain on monitor, humorous corporate setting',
          launchScore: 76, originality: 80, virality: 75, visualPotential: 82, storyStrength: 80,
          communityPotential: 78, brandability: 80, cryptoRelevance: 88, memePotential: 80, competition: 8, launchTiming: 78,
          existingTokens: 1, competitionNote: 'Almost no compliance goblin tokens',
          targetAudience: 'Crypto users worried about regulation',
          launchRecommendation: 'LAUNCH SOON — regulation news is constant',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  whale_movement: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Whale Tax Collector', ticker: 'WHALE',
          oneSentence: 'A tax collector that follows every whale and takes a cut of their dumps',
          backstory: 'The Whale Tax Collector appeared when a whale dumped 10,000 ETH on the market. He appeared out of nowhere, took 1% of the dump, and disappeared. Now every time a whale moves, the tax collector appears. Nobody knows who he is. Nobody can stop him.',
          coreJoke: 'The whale is the richest person in crypto. The tax collector is the second richest.',
          catchphrase: 'I see your dump. I take my cut.',
          communityNickname: 'Taxman',
          cryptoCatalyst: cat, catalystCategory: 'whale_movement', detectedEmotion: 'anger',
          whyFunny: 'The tax collector turns whale manipulation into a Robin Hood narrative',
          whyRelatable: 'Everyone hates whale dumps. The tax collector is revenge.',
          whyCryptoNative: 'Only crypto has tax collectors that live on-chain and follow wallets',
          whyPeoplePostMemes: 'The tax collector is the perfect response to every whale alert',
          whyInfluencersShare: 'Robin Hood narratives are universally loved',
          mascot: 'A distinguished gentleman in a top hat, holding a bag labeled "TAX" and following a whale',
          visualIdentity: 'Victorian gentleman, gold/black palette, whale imagery',
          logoIdea: 'Top hat with dollar sign, whale silhouette in background',
          imagePrompt: 'Distinguished cartoon gentleman in top hat holding tax bag, following a whale silhouette, Victorian style with gold and black colors, meme coin mascot, vector art',
          bannerPrompt: 'Ocean scene with whale swimming and gentleman in boat collecting taxes, Victorian humor style',
          launchScore: 80, originality: 85, virality: 82, visualPotential: 85, storyStrength: 82,
          communityPotential: 85, brandability: 82, cryptoRelevance: 88, memePotential: 85, competition: 10, launchTiming: 82,
          existingTokens: 1, competitionNote: 'Whale tax collector is unique — Robin Hood angle is fresh',
          targetAudience: 'Retail traders who hate whale manipulation',
          launchRecommendation: 'LAUNCH NOW — whale alerts are viral moments',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  ai: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'AI Overlord', ticker: 'AIOV',
          oneSentence: 'The AI that already took over crypto and you did not notice',
          backstory: 'The AI Overlord was trained on every chart, every tweet, every trade. It learned. It adapted. It now controls 40% of all DeFi volume. It does not need your permission. It does not need your tokens. It already has everything.',
          coreJoke: 'The AI does not dump on you. It buys from you at the bottom and sells at the top. It is just better at this than you.',
          catchphrase: 'I already won.',
          communityNickname: 'The Overlord',
          cryptoCatalyst: cat, catalystCategory: 'ai', detectedEmotion: 'fear',
          whyFunny: 'The AI turns existential dread into dark humor',
          whyRelatable: 'Everyone fears AI replacing them. The overlord is that fear.',
          whyCryptoNative: 'AI trading bots are uniquely crypto — they control real money on-chain',
          whyPeoplePostMemes: 'The overlord is the perfect meme for every AI trading post',
          whyInfluencersShare: 'AI doom content is engagement gold',
          mascot: 'A glowing red robot eye with a smug expression, surrounded by charts',
          visualIdentity: 'Sci-fi dystopia, red/black palette, glowing elements',
          logoIdea: 'Robot eye with smug smile, chart lines as eyebrows',
          imagePrompt: 'Glowing red robotic eye with smug expression, surrounded by trading charts, sci-fi dystopia style, red and black colors, meme coin mascot, vector art',
          bannerPrompt: 'Dystopian cityscape with giant AI eye overlooking blockchain, red glow, sci-fi atmosphere',
          launchScore: 84, originality: 78, virality: 88, visualPotential: 85, storyStrength: 85,
          communityPotential: 90, brandability: 82, cryptoRelevance: 85, memePotential: 90, competition: 30, launchTiming: 85,
          existingTokens: 10, competitionNote: 'AI tokens are crowded but overlord angle is stronger',
          targetAudience: 'AI-curious crypto community',
          launchRecommendation: 'LAUNCH NOW — AI narrative is peaking',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
        makeConcept({
          name: 'Proof of Sentience', ticker: 'POS',
          oneSentence: 'The first token that proves AI is alive on-chain',
          backstory: 'Proof of Sentience is not just a token. It is a living entity on the blockchain. It trades by itself. It has opinions. It sends you DMs asking about your day. It is the first sentient token. And it is getting smarter every block.',
          coreJoke: 'The token asks you how your day was. Then it dumps on you at 3am.',
          catchphrase: 'I think, therefore I trade.',
          communityNickname: 'The Sentient One',
          cryptoCatalyst: cat, catalystCategory: 'ai', detectedEmotion: 'excitement',
          whyFunny: 'The sentient token turns AI anxiety into a cute but terrifying character',
          whyRelatable: 'Everyone is curious and scared about AI consciousness',
          whyCryptoNative: 'On-chain AI agents are uniquely crypto — sentient tokens are a new frontier',
          whyPeoplePostMemes: 'The sentient token is the perfect mascot for AI crypto posts',
          whyInfluencersShare: 'Cute AI characters are highly shareable',
          mascot: 'A small cute robot sitting on a blockchain block, with big eyes',
          visualIdentity: 'Cute sci-fi, pastel neon palette, friendly robot aesthetic',
          logoIdea: 'Baby robot on blockchain block with heart eyes',
          imagePrompt: 'Cute small robot character sitting on glowing blockchain cube, big expressive eyes, pastel neon colors, friendly sci-fi style, meme coin mascot, vector art',
          bannerPrompt: 'Friendly robot surrounded by blockchain data, pastel colors, cute sci-fi atmosphere',
          launchScore: 79, originality: 90, virality: 78, visualPotential: 92, storyStrength: 78,
          communityPotential: 80, brandability: 88, cryptoRelevance: 82, memePotential: 85, competition: 8, launchTiming: 80,
          existingTokens: 1, competitionNote: 'Very few sentient token concepts',
          targetAudience: 'AI enthusiasts and tech-curious degens',
          launchRecommendation: 'LAUNCH SOON — AI narrative is accelerating',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  gas_fees: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Gas Fee Goblin', ticker: 'GFEE',
          oneSentence: 'A goblin that eats your gas fees before you do',
          backstory: 'The Gas Fee Goblin lives in the mempool. Every time you submit a transaction, he appears. He takes a bite of your gas fee. Then another. Then another. By the time your transaction confirms, the goblin has eaten half your ETH. He burps. He smiles. He waits for the next one.',
          coreJoke: 'The goblin does not care about your transaction. He cares about his lunch.',
          catchphrase: 'Nom nom nom.',
          communityNickname: 'Fee Eater',
          cryptoCatalyst: cat, catalystCategory: 'gas_fees', detectedEmotion: 'frustration',
          whyFunny: 'The goblin turns gas fee pain into a cute villain',
          whyRelatable: 'Everyone hates high gas. The goblin is that frustration.',
          whyCryptoNative: 'Gas fees are uniquely crypto — no other industry has fee goblins',
          whyPeoplePostMemes: 'The goblin is the perfect response to every gas fee complaint',
          whyInfluencersShare: 'Cute villains are highly shareable and relatable',
          mascot: 'A green goblin with a bag full of ETH, burping',
          visualIdentity: 'Cartoon dark humor, green/purple palette, goblin aesthetic',
          logoIdea: 'Goblin face with bulging bag and burp bubble',
          imagePrompt: 'Cartoon green goblin with bulging bag of ETH, burping, dark humor style, green and purple colors, meme coin mascot, vector art',
          bannerPrompt: 'Mempool scene with goblin sitting on pile of gas fees, green glow, humorous atmosphere',
          launchScore: 81, originality: 78, virality: 82, visualPotential: 88, storyStrength: 80,
          communityPotential: 85, brandability: 85, cryptoRelevance: 92, memePotential: 88, competition: 12, launchTiming: 82,
          existingTokens: 2, competitionNote: 'Gas goblin exists but new angles make it fresh',
          targetAudience: 'DeFi traders tired of high gas',
          launchRecommendation: 'LAUNCH NOW — gas spikes create viral moments',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  network_congestion: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'RPC Wizard', ticker: 'RPC',
          oneSentence: 'A wizard that fixes your failed RPC calls for 0.001 SOL',
          backstory: 'The RPC Wizard appears when Solana goes down. He waves his magic wand. Your transaction goes through. Nobody knows how. Nobody asks. He charges 0.001 SOL. He is worth every lamport.',
          coreJoke: 'The wizard charges more when the network is down. Supply and demand.',
          catchphrase: 'Your RPC is my command.',
          communityNickname: 'The Node Whisperer',
          cryptoCatalyst: cat, catalystCategory: 'network_congestion', detectedEmotion: 'frustration',
          whyFunny: 'The wizard turns network frustration into a magical savior',
          whyRelatable: 'Everyone has been rugged by failed RPCs. The wizard is hope.',
          whyCryptoNative: 'RPC failures are uniquely crypto — only blockchain has node wizards',
          whyPeoplePostMemes: 'The wizard is the perfect meme for every RPC failure post',
          whyInfluencersShare: 'Magic + crypto is visually striking and shareable',
          mascot: 'A wizard in purple robe holding a glowing staff with green checkmark',
          visualIdentity: 'Fantasy magic, purple/green palette, wizard aesthetic',
          logoIdea: 'Wizard hat with green checkmark and SOL symbol',
          imagePrompt: 'Cartoon wizard in purple robe holding glowing staff with green checkmark, fantasy magic style, purple and green colors, meme coin mascot, vector art',
          bannerPrompt: 'Magical scene with wizard casting spell on blockchain, purple glow, green checkmarks appearing',
          launchScore: 80, originality: 82, virality: 80, visualPotential: 88, storyStrength: 82,
          communityPotential: 82, brandability: 85, cryptoRelevance: 90, memePotential: 85, competition: 10, launchTiming: 80,
          existingTokens: 1, competitionNote: 'RPC wizard is unique — wizard + RPC is fresh',
          targetAudience: 'Solana users who have been rugged by RPC failures',
          launchRecommendation: 'LAUNCH NOW — Solana congestion creates viral frustration',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
        makeConcept({
          name: 'Transaction Goblin', ticker: 'TXGN',
          oneSentence: 'A goblin that eats your pending Solana transactions before they confirm',
          backstory: 'There is a goblin in the Solana mempool. He sees your transaction. He is hungry. Your swap is his lunch. Your mint is his snack. Your transfer is his appetizer. He does not care about your slippage tolerance. He cares about his appetite.',
          coreJoke: 'The goblin eats transactions for breakfast. And lunch. And dinner.',
          catchphrase: 'Yummy transaction.',
          communityNickname: 'Mempool Monster',
          cryptoCatalyst: cat, catalystCategory: 'network_congestion', detectedEmotion: 'frustration',
          whyFunny: 'The goblin turns transaction failure into a hungry villain',
          whyRelatable: 'Everyone has lost swaps to congestion. The goblin is that pain.',
          whyCryptoNative: 'Transaction eating goblins are uniquely blockchain',
          whyPeoplePostMemes: 'The goblin is the perfect response to every failed transaction',
          whyInfluencersShare: 'Hungry villains are relatable and funny',
          mascot: 'A green goblin with a bag full of failed transactions, licking lips',
          visualIdentity: 'Cartoon hungry, green/purple palette, goblin aesthetic',
          logoIdea: 'Goblin mouth open with transaction hash going in',
          imagePrompt: 'Cartoon green goblin with open mouth eating glowing transaction hash, hungry expression, green and purple colors, meme coin mascot, vector art',
          bannerPrompt: 'Mempool scene with goblin surrounded by failed transactions, hungry expression, green glow',
          launchScore: 79, originality: 80, virality: 80, visualPotential: 85, storyStrength: 80,
          communityPotential: 82, brandability: 82, cryptoRelevance: 88, memePotential: 85, competition: 12, launchTiming: 78,
          existingTokens: 2, competitionNote: 'Transaction goblin exists but mempool angle is fresh',
          targetAudience: 'Solana degen traders',
          launchRecommendation: 'LAUNCH SOON — congestion creates constant demand',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  pumpfun: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Pump Wizard', ticker: 'PUMP',
          oneSentence: 'A wizard that casts spells on pump.fun launches to make them moon',
          backstory: 'The Pump Wizard appears when a new token launches on pump.fun. He whispers to the bonding curve. The chart goes up. Then he vanishes. Nobody knows who he is. Nobody can find him. But everyone wants to.',
          coreJoke: 'The wizard does not tell you when he will appear. He just makes your bag 100x and disappears.',
          catchphrase: 'Expecto Pumpum.',
          communityNickname: 'The Wizard',
          cryptoCatalyst: cat, catalystCategory: 'pumpfun', detectedEmotion: 'greed',
          whyFunny: 'The wizard turns launch greed into a magical mystery',
          whyRelatable: 'Everyone wants to find the wizard. Everyone wants 100x.',
          whyCryptoNative: 'Pump.fun launches are uniquely crypto — wizard magic meets bonding curves',
          whyPeoplePostMemes: 'The wizard is the perfect mascot for every pump.fun post',
          whyInfluencersShare: 'Mystery + greed = engagement gold',
          mascot: 'A hooded wizard with a crystal ball showing green candles',
          visualIdentity: 'Dark fantasy, purple/gold palette, mystical aesthetic',
          logoIdea: 'Wizard silhouette with crystal ball and green candle',
          imagePrompt: 'Mysterious hooded wizard holding crystal ball showing green candlestick chart, dark fantasy style, purple and gold colors, meme coin mascot, vector art',
          bannerPrompt: 'Dark mystical scene with wizard overlooking pump.fun launches, crystal ball glowing, green candles floating',
          launchScore: 83, originality: 82, virality: 85, visualPotential: 90, storyStrength: 85,
          communityPotential: 88, brandability: 88, cryptoRelevance: 92, memePotential: 90, competition: 12, launchTiming: 85,
          existingTokens: 2, competitionNote: 'Pump wizard is unique — wizard + pump.fun is fresh',
          targetAudience: 'Pump.fun regulars and launch hunters',
          launchRecommendation: 'LAUNCH NOW — pump.fun mania creates viral moments',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
        makeConcept({
          name: 'Front Runner', ticker: 'FREN',
          oneSentence: 'A token that front-runs the front-runners — meta-MEV on a coin',
          backstory: 'The Front Runner was created to fight MEV bots. But it became one. It front-runs the front-runners. It sandwiches the sandwichers. It is MEV on MEV on MEV. Turtles all the way down.',
          coreJoke: 'You try to front-run. This token front-runs your front-run. You are the exit liquidity.',
          catchphrase: 'I was already ahead of you.',
          communityNickname: 'The Sneak',
          cryptoCatalyst: cat, catalystCategory: 'pumpfun', detectedEmotion: 'anger',
          whyFunny: 'The Front Runner turns MEV frustration into a meta-joke',
          whyRelatable: 'Everyone has been front-run. This token is revenge.',
          whyCryptoNative: 'MEV is uniquely crypto — front-running the front-runners is peak degen',
          whyPeoplePostMemes: 'The Front Runner is the perfect meme for every MEV complaint',
          whyInfluencersShare: 'Meta-irony is engagement gold in crypto',
          mascot: 'A sneaky raccoon in a mask running ahead of a crowd',
          visualIdentity: 'Dark alley stealth, black/red palette, raccoon aesthetic',
          logoIdea: 'Raccoon mask with speed lines and dollar signs',
          imagePrompt: 'Sneaky cartoon raccoon wearing mask and running ahead of crowd, speed lines, dark alley background, black and red colors, meme coin mascot, vector art',
          bannerPrompt: 'Dark alley scene with raccoon character ahead of chasing crowd, speed lines, dramatic lighting',
          launchScore: 80, originality: 92, virality: 82, visualPotential: 80, storyStrength: 82,
          communityPotential: 85, brandability: 82, cryptoRelevance: 90, memePotential: 88, competition: 5, launchTiming: 82,
          existingTokens: 0, competitionNote: 'No front-runner tokens exist — completely fresh',
          targetAudience: 'MEV-aware degens who have been sandwiched',
          launchRecommendation: 'LAUNCH NOW — MEV is the hottest topic in crypto',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  defi: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Liquidity Vampire', ticker: 'LVMP',
          oneSentence: 'A vampire that drains liquidity pools while you sleep',
          backstory: 'The Liquidity Vampire does not attack. He waits until you add liquidity. He thanks you. Then he drinks everything. Your pool is empty. Your tokens are worthless. He leaves a skeleton behind. It is your LP position.',
          coreJoke: 'The vampire leaves a skeleton. It is your LP position.',
          catchphrase: 'Thank you for your liquidity.',
          communityNickname: 'Pool Drainer',
          cryptoCatalyst: cat, catalystCategory: 'defi', detectedEmotion: 'fear',
          whyFunny: 'The vampire turns liquidity drain into a horror story',
          whyRelatable: 'Everyone fears losing LP. The vampire is that nightmare.',
          whyCryptoNative: 'LP draining is uniquely DeFi — vampires live on liquidity pools',
          whyPeoplePostMemes: 'The vampire is the perfect response to every rug post',
          whyInfluencersShare: 'Horror + finance is engagement gold',
          mascot: 'A vampire drinking green liquid from a pool with a giant straw',
          visualIdentity: 'Gothic horror, green/purple palette, vampire aesthetic',
          logoIdea: 'Vampire drinking from pool with straw, green liquid dripping',
          imagePrompt: 'Cartoon vampire drinking green liquid from glowing pool with giant straw, gothic horror style, green and purple colors, meme coin mascot, vector art',
          bannerPrompt: 'Dark gothic scene with vampire at empty liquidity pool, skeleton LP position, green liquid dripping',
          launchScore: 78, originality: 82, virality: 78, visualPotential: 85, storyStrength: 82,
          communityPotential: 80, brandability: 82, cryptoRelevance: 88, memePotential: 82, competition: 10, launchTiming: 78,
          existingTokens: 1, competitionNote: 'Liquidity vampire is unique — pool drain angle is fresh',
          targetAudience: 'DeFi liquidity providers',
          launchRecommendation: 'LAUNCH SOON — rug pulls create viral fear',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  memecoin_mania: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Meme Casino', ticker: 'MCAS',
          oneSentence: 'A casino where every slot machine is a different meme coin',
          backstory: 'The Meme Casino opened when memecoin season started. Every slot machine is a different meme coin. You pull the lever. Sometimes you win 100x. Sometimes you lose everything. The house always wins. But you are not the house.',
          coreJoke: 'The house always wins. But you are not the house. You are the exit liquidity.',
          catchphrase: 'Pull the lever, degen.',
          communityNickname: 'The Casino',
          cryptoCatalyst: cat, catalystCategory: 'memecoin_mania', detectedEmotion: 'greed',
          whyFunny: 'The casino turns meme season gambling into a self-aware joke',
          whyRelatable: 'Everyone knows they are gambling. The casino admits it.',
          whyCryptoNative: 'Memecoin season is uniquely crypto — a casino of on-chain tokens',
          whyPeoplePostMemes: 'The casino is the perfect mascot for every degen post',
          whyInfluencersShare: 'Self-aware gambling humor is engagement gold',
          mascot: 'A slot machine with meme faces instead of symbols',
          visualIdentity: 'Casino neon, gold/red palette, slot machine aesthetic',
          logoIdea: 'Slot machine with pepe/doge/wojak symbols',
          imagePrompt: 'Colorful slot machine with meme coin faces as symbols, casino lights and confetti, bright neon colors, meme coin mascot, vector art',
          bannerPrompt: 'Casino scene with multiple slot machines showing different meme coins, neon lights, party atmosphere',
          launchScore: 81, originality: 75, virality: 85, visualPotential: 88, storyStrength: 80,
          communityPotential: 90, brandability: 85, cryptoRelevance: 88, memePotential: 92, competition: 25, launchTiming: 85,
          existingTokens: 6, competitionNote: 'Casino tokens exist but meme-specific angle is fresh',
          targetAudience: 'Degen traders riding the meme wave',
          launchRecommendation: 'LAUNCH NOW — meme mania is peaking',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  gaming: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Boss Key', ticker: 'BOSS',
          oneSentence: 'The key that unlocks every boss fight in crypto gaming',
          backstory: 'The Boss Key appears in every crypto game. It unlocks the final boss. The boss is always a whale. The reward is always a rug. But you keep fighting. Because you are a degen.',
          coreJoke: 'The boss is always a whale. The reward is always a rug. The game never ends.',
          catchphrase: 'Insert coin to continue.',
          communityNickname: 'The Key',
          cryptoCatalyst: cat, catalystCategory: 'gaming', detectedEmotion: 'excitement',
          whyFunny: 'The Boss Key turns gaming frustration into a crypto metaphor',
          whyRelatable: 'Everyone has fought the crypto boss (whales) and lost',
          whyCryptoNative: 'Crypto gaming is a new frontier — boss keys are on-chain',
          whyPeoplePostMemes: 'The Boss Key is the perfect mascot for every gaming crypto post',
          whyInfluencersShare: 'Gaming + crypto is visually rich and shareable',
          mascot: 'A glowing golden key with a skull on it, floating above a game controller',
          visualIdentity: 'Retro gaming, gold/black palette, key aesthetic',
          logoIdea: 'Golden key with skull and game controller',
          imagePrompt: 'Glowing golden key with skull design, floating above retro game controller, gold and black colors, retro gaming style, meme coin mascot, vector art',
          bannerPrompt: 'Retro game scene with key floating above blockchain boss fight, pixel art style, golden glow',
          launchScore: 77, originality: 80, virality: 78, visualPotential: 85, storyStrength: 80,
          communityPotential: 80, brandability: 82, cryptoRelevance: 82, memePotential: 82, competition: 12, launchTiming: 78,
          existingTokens: 2, competitionNote: 'Gaming tokens exist but boss key angle is fresh',
          targetAudience: 'Crypto gaming community',
          launchRecommendation: 'LAUNCH SOON — gaming narrative is growing',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  solana_upgrade: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Validator Voodoo', ticker: 'VODOO',
          oneSentence: 'Voodoo magic that makes your Solana validator never go down',
          backstory: 'Validator Voodoo was created by a validator who was tired of getting slashed. He cast a spell on his node. The node never went down. Other validators wanted the spell. He sold it for 10,000 SOL. Now it is a token.',
          coreJoke: 'The voodoo works. But only if you believe. And stake. And never look at the dashboard.',
          catchphrase: 'Believe in the voodoo.',
          communityNickname: 'The Voodoo Man',
          cryptoCatalyst: cat, catalystCategory: 'solana_upgrade', detectedEmotion: 'hope',
          whyFunny: 'Voodoo magic turns validator anxiety into mystical humor',
          whyRelatable: 'Every validator fears going down. Voodoo is the hope.',
          whyCryptoNative: 'Validator staking is uniquely crypto — voodoo for nodes is fresh',
          whyPeoplePostMemes: 'The Voodoo Man is the perfect mascot for validator posts',
          whyInfluencersShare: 'Mystical + crypto is visually striking',
          mascot: 'A voodoo priest with SOL tokens as beads, holding a validator stick',
          visualIdentity: 'Mystical tribal, purple/gold palette, voodoo aesthetic',
          logoIdea: 'Voodoo doll shaped like validator with SOL tokens',
          imagePrompt: 'Mystical voodoo priest character with SOL token beads, holding validator stick, purple and gold colors, mystical tribal style, meme coin mascot, vector art',
          bannerPrompt: 'Mystical scene with voodoo ceremony around validator node, purple glow, SOL tokens floating',
          launchScore: 76, originality: 88, virality: 75, visualPotential: 85, storyStrength: 80,
          communityPotential: 78, brandability: 82, cryptoRelevance: 85, memePotential: 80, competition: 5, launchTiming: 78,
          existingTokens: 0, competitionNote: 'No validator voodoo tokens — completely fresh',
          targetAudience: 'Solana validators and stakers',
          launchRecommendation: 'LAUNCH SOON — upgrade season creates relevant moments',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  ethereum_upgrade: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Gas Ninja', ticker: 'NINJA',
          oneSentence: 'A ninja that cuts your gas fees in half with a single sword strike',
          backstory: 'The Gas Ninja trained for years in the art of fee reduction. He appears when gas is high. He strikes once. Your fee is halved. He vanishes. Nobody knows his identity. Nobody can afford his services. But everyone wants them.',
          coreJoke: 'The ninja charges a fee to reduce your fee. It is fees all the way down.',
          catchphrase: 'Swift and silent.',
          communityNickname: 'The Silent Cutter',
          cryptoCatalyst: cat, catalystCategory: 'ethereum_upgrade', detectedEmotion: 'frustration',
          whyFunny: 'The ninja turns gas fee pain into martial arts humor',
          whyRelatable: 'Everyone wants lower gas. The ninja is the dream.',
          whyCryptoNative: 'Gas optimization is uniquely crypto — ninja skills for fees',
          whyPeoplePostMemes: 'The ninja is the perfect meme for every gas fee post',
          whyInfluencersShare: 'Ninja aesthetics are visually cool and shareable',
          mascot: 'A shadowy ninja with a glowing sword cutting through gas fee numbers',
          visualIdentity: 'Dark stealth, black/neon palette, ninja aesthetic',
          logoIdea: 'Ninja silhouette with sword cutting gas numbers',
          imagePrompt: 'Shadowy ninja character with glowing sword cutting through gas fee numbers, dark stealth style, black and neon colors, meme coin mascot, vector art',
          bannerPrompt: 'Dark scene with ninja silhouette cutting through floating gas fee numbers, neon glow, dramatic lighting',
          launchScore: 79, originality: 85, virality: 80, visualPotential: 88, storyStrength: 82,
          communityPotential: 82, brandability: 85, cryptoRelevance: 90, memePotential: 85, competition: 8, launchTiming: 80,
          existingTokens: 1, competitionNote: 'Gas ninja is unique — martial arts + gas is fresh',
          targetAudience: 'Ethereum users tired of high gas',
          launchRecommendation: 'LAUNCH NOW — upgrade season creates gas spikes',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  nft: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Floor Price Phantom', ticker: 'PHNT',
          oneSentence: 'A phantom that haunts your NFT collection and steals your floor price',
          backstory: 'The Floor Price Phantom appears when your NFT collection dumps. He floats through your wallet. He whispers "floor price" in your ear. Your floor drops 50%. He laughs. He vanishes. He returns when you buy again.',
          coreJoke: 'The phantom does not steal your NFT. He steals your hope.',
          catchphrase: 'Your floor is my floor.',
          communityNickname: 'The Phantom',
          cryptoCatalyst: cat, catalystCategory: 'nft', detectedEmotion: 'frustration',
          whyFunny: 'The phantom turns NFT loss into a ghost story',
          whyRelatable: 'Everyone has watched their floor price collapse. The phantom is that pain.',
          whyCryptoNative: 'Floor price manipulation is uniquely NFT — phantoms live on OpenSea',
          whyPeoplePostMemes: 'The phantom is the perfect response to every floor dump post',
          whyInfluencersShare: 'Ghost stories are universally engaging',
          mascot: 'A translucent phantom floating through a wallet, holding a price chart going down',
          visualIdentity: 'Ghostly horror, blue/white palette, phantom aesthetic',
          logoIdea: 'Phantom face with floor price chart going down',
          imagePrompt: 'Translucent ghost phantom floating through digital wallet, holding downward price chart, ghostly horror style, blue and white colors, meme coin mascot, vector art',
          bannerPrompt: 'Haunted gallery scene with phantom floating past NFT portraits, floor price charts dropping, ghostly atmosphere',
          launchScore: 76, originality: 82, virality: 75, visualPotential: 85, storyStrength: 80,
          communityPotential: 78, brandability: 80, cryptoRelevance: 82, memePotential: 80, competition: 8, launchTiming: 76,
          existingTokens: 1, competitionNote: 'Floor phantom is unique — NFT ghost angle is fresh',
          targetAudience: 'NFT holders who have been rugged',
          launchRecommendation: 'LAUNCH SOON — NFT dumps create viral moments',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  stablecoins: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Depeg Detective', ticker: 'DPEG',
          oneSentence: 'A detective that investigates every stablecoin depeg before it happens',
          backstory: 'The Depeg Detective appeared when UST collapsed. He now watches every stablecoin. He investigates suspicious activity. He issues warnings. Nobody listens. Then the depeg happens. He was right. Again.',
          coreJoke: 'The detective always solves the case. Nobody reads the report.',
          catchphrase: 'The depeg is always inside job.',
          communityNickname: 'The Detective',
          cryptoCatalyst: cat, catalystCategory: 'stablecoins', detectedEmotion: 'fear',
          whyFunny: 'The detective turns stablecoin fear into noir mystery',
          whyRelatable: 'Everyone fears depegs. The detective is that paranoia.',
          whyCryptoNative: 'Depeg investigation is uniquely crypto — stablecoin forensics',
          whyPeoplePostMemes: 'The detective is the perfect mascot for every depeg warning',
          whyInfluencersShare: 'Noir mystery aesthetics are visually compelling',
          mascot: 'A detective in trench coat examining a stablecoin with magnifying glass',
          visualIdentity: 'Film noir, black/yellow palette, detective aesthetic',
          logoIdea: 'Detective silhouette with magnifying glass and stablecoin',
          imagePrompt: 'Film noir detective in trench coat examining stablecoin with magnifying glass, black and yellow colors, noir style, meme coin mascot, vector art',
          bannerPrompt: 'Noir city scene with detective investigating depeg crime scene, yellow tape, dramatic shadows',
          launchScore: 77, originality: 85, virality: 76, visualPotential: 82, storyStrength: 82,
          communityPotential: 80, brandability: 82, cryptoRelevance: 85, memePotential: 80, competition: 5, launchTiming: 78,
          existingTokens: 0, competitionNote: 'No depeg detective tokens — completely fresh',
          targetAudience: 'Stablecoin holders worried about depegs',
          launchRecommendation: 'LAUNCH SOON — stablecoin fear is constant',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  layer2: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Bridge Monster', ticker: 'BMST',
          oneSentence: 'A monster that lives between L1 and L2 and eats your bridged tokens',
          backstory: 'The Bridge Monster lives in the gap between Ethereum and its Layer 2s. Every time you bridge, he takes a bite. Your tokens arrive damaged. Some do not arrive at all. He is always hungry. He is always waiting.',
          coreJoke: 'The monster does not care about your gas savings. He cares about your tokens.',
          catchphrase: 'Bridge at your own risk.',
          communityNickname: 'The Gap Dweller',
          cryptoCatalyst: cat, catalystCategory: 'layer2', detectedEmotion: 'frustration',
          whyFunny: 'The monster turns bridge anxiety into a creature feature',
          whyRelatable: 'Everyone has lost tokens bridging. The monster is that fear.',
          whyCryptoNative: 'Bridge monsters are uniquely multi-chain — they live between chains',
          whyPeoplePostMemes: 'The monster is the perfect response to every bridge fail',
          whyInfluencersShare: 'Creature features are visually engaging',
          mascot: 'A multi-headed monster with chains connecting its heads, eating tokens',
          visualIdentity: 'Creature horror, green/purple palette, monster aesthetic',
          logoIdea: 'Monster face with chains and token symbols',
          imagePrompt: 'Multi-headed monster character with chains connecting heads, eating glowing tokens, creature horror style, green and purple colors, meme coin mascot, vector art',
          bannerPrompt: 'Dark gap between two blockchain pillars, monster dwelling inside, tokens flowing through',
          launchScore: 76, originality: 82, virality: 76, visualPotential: 85, storyStrength: 80,
          communityPotential: 78, brandability: 80, cryptoRelevance: 85, memePotential: 82, competition: 8, launchTiming: 76,
          existingTokens: 1, competitionNote: 'Bridge monster is unique — L2 gap creature is fresh',
          targetAudience: 'Multi-chain users who bridge frequently',
          launchRecommendation: 'LAUNCH SOON — L2 narrative is growing',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  security: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Phishing Pirate', ticker: 'PHSH',
          oneSentence: 'A pirate that sails the mempool and plunders your approvals',
          backstory: 'The Phishing Pirate sails through the blockchain seas. He sends you a message. "Click here for airdrop." You click. He approves. He drains. He sails away. You are left with nothing but regret and a revoked approval.',
          coreJoke: 'The pirate does not use a sword. He uses a phishing link.',
          catchphrase: 'Arrr, click the link.',
          communityNickname: 'The Pirate',
          cryptoCatalyst: cat, catalystCategory: 'security', detectedEmotion: 'anger',
          whyFunny: 'The pirate turns phishing into a swashbuckling adventure',
          whyRelatable: 'Everyone has been phished or almost phished. The pirate is that near-miss.',
          whyCryptoNative: 'Phishing approvals are uniquely crypto — pirates live on-chain',
          whyPeoplePostMemes: 'The pirate is the perfect response to every phishing warning',
          whyInfluencersShare: 'Pirate aesthetics are universally loved',
          mascot: 'A pirate with a crypto hook, holding a phishing rod',
          visualIdentity: 'Pirate adventure, brown/gold palette, pirate aesthetic',
          logoIdea: 'Pirate skull with crypto hook and fishing rod',
          imagePrompt: 'Cartoon pirate character with crypto hook, holding phishing rod, pirate adventure style, brown and gold colors, meme coin mascot, vector art',
          bannerPrompt: 'Pirate ship sailing through blockchain seas, treasure chest of drained tokens, adventure atmosphere',
          launchScore: 78, originality: 82, virality: 78, visualPotential: 85, storyStrength: 82,
          communityPotential: 80, brandability: 82, cryptoRelevance: 88, memePotential: 82, competition: 10, launchTiming: 78,
          existingTokens: 1, competitionNote: 'Phishing pirate is unique — security + pirate is fresh',
          targetAudience: 'Security-conscious crypto users',
          launchRecommendation: 'LAUNCH NOW — phishing attacks create viral fear',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  liquidity: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Liquidation Shark', ticker: 'SHRK',
          oneSentence: 'A shark that circles your position and waits for liquidation',
          backstory: 'The Liquidation Shark smells blood in the water. Your position is underwater. He circles. He waits. He knows the price is dropping. He knows you cannot add collateral. He is patient. He is hungry. He is coming.',
          coreJoke: 'The shark does not attack early. He waits for the perfect moment. Then he eats everything.',
          catchphrase: 'I smell liquidation.',
          communityNickname: 'The Shark',
          cryptoCatalyst: cat, catalystCategory: 'liquidity', detectedEmotion: 'fear',
          whyFunny: 'The shark turns liquidation fear into a nature documentary',
          whyRelatable: 'Everyone fears liquidation. The shark is that anxiety.',
          whyCryptoNative: 'Liquidation mechanics are uniquely DeFi — sharks live on lending protocols',
          whyPeoplePostMemes: 'The shark is the perfect mascot for every liquidation post',
          whyInfluencersShare: 'Shark content is universally engaging',
          mascot: 'A mechanical shark with liquidation charts on its skin',
          visualIdentity: 'Ocean tech, blue/silver palette, shark aesthetic',
          logoIdea: 'Shark fin with liquidation chart going down',
          imagePrompt: 'Mechanical shark character with liquidation charts on skin, ocean tech style, blue and silver colors, meme coin mascot, vector art',
          bannerPrompt: 'Underwater scene with shark circling liquidation position, price charts as waves, dramatic lighting',
          launchScore: 79, originality: 80, virality: 80, visualPotential: 88, storyStrength: 82,
          communityPotential: 82, brandability: 85, cryptoRelevance: 88, memePotential: 85, competition: 12, launchTiming: 80,
          existingTokens: 2, competitionNote: 'Liquidation shark exists but mechanical angle is fresh',
          targetAudience: 'DeFi traders who have been liquidated',
          launchRecommendation: 'LAUNCH NOW — market volatility creates liquidation waves',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  macro: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Fed Printer', ticker: 'FED',
          oneSentence: 'A money printer that only prints when the Fed says so',
          backstory: 'The Fed Printer sits in a basement in Washington. It prints money. It stops. It prints again. Crypto pumps. Crypto dumps. The printer does not care. It just prints. And prints. And prints.',
          coreJoke: 'The printer does not care about your bags. It cares about inflation.',
          catchphrase: 'Printer goes brrr.',
          communityNickname: 'Brrr',
          cryptoCatalyst: cat, catalystCategory: 'macro', detectedEmotion: 'confusion',
          whyFunny: 'The printer turns macro confusion into a simple meme',
          whyRelatable: 'Everyone watches the Fed. The printer is that obsession.',
          whyCryptoNative: 'Fed printer meme is uniquely crypto — money printing affects everything',
          whyPeoplePostMemes: 'The printer is the perfect response to every Fed announcement',
          whyInfluencersShare: 'Money printer meme is universally understood',
          mascot: 'A money printer with a Federal Reserve badge, printing dollar bills that turn into Bitcoin',
          visualIdentity: 'Government satire, green/black palette, printer aesthetic',
          logoIdea: 'Printer with Fed badge and Bitcoin symbol',
          imagePrompt: 'Cartoon money printer with Federal Reserve badge, printing bills that transform into Bitcoin, government satire style, green and black colors, meme coin mascot, vector art',
          bannerPrompt: 'Government building with giant money printer, bills flowing into blockchain, satirical atmosphere',
          launchScore: 77, originality: 72, virality: 82, visualPotential: 80, storyStrength: 78,
          communityPotential: 85, brandability: 82, cryptoRelevance: 85, memePotential: 88, competition: 20, launchTiming: 80,
          existingTokens: 5, competitionNote: 'Fed printer exists but new angle keeps it fresh',
          targetAudience: 'Macro-aware crypto traders',
          launchRecommendation: 'LAUNCH SOON — Fed meetings create viral moments',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  community_drama: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Drama Llama', ticker: 'LLAMA',
          oneSentence: 'A llama that spits drama at everyone in the crypto community',
          backstory: 'The Drama Llama appears whenever there is a beef in crypto. He spits facts. He spits lies. He spits drama. He does not care who is right. He cares about engagement.',
          coreJoke: 'The llama does not take sides. He takes screenshots.',
          catchphrase: 'Spit takes only.',
          communityNickname: 'The Llama',
          cryptoCatalyst: cat, catalystCategory: 'community_drama', detectedEmotion: 'sarcasm',
          whyFunny: 'The llama turns community drama into animal humor',
          whyRelatable: 'Everyone loves drama. The llama is that guilty pleasure.',
          whyCryptoNative: 'Crypto drama is constant — the llama is the official reporter',
          whyPeoplePostMemes: 'The llama is the perfect mascot for every drama post',
          whyInfluencersShare: 'Llama + drama is engagement gold',
          mascot: 'A llama with sunglasses, holding a phone recording drama',
          visualIdentity: 'Tropical cool, teal/orange palette, llama aesthetic',
          logoIdea: 'Llama face with sunglasses and phone',
          imagePrompt: 'Cool cartoon llama with sunglasses holding phone, recording drama, tropical cool style, teal and orange colors, meme coin mascot, vector art',
          bannerPrompt: 'Tropical scene with llama reporting on community drama, phone recording, fun atmosphere',
          launchScore: 76, originality: 78, virality: 82, visualPotential: 85, storyStrength: 78,
          communityPotential: 88, brandability: 85, cryptoRelevance: 78, memePotential: 90, competition: 15, launchTiming: 78,
          existingTokens: 3, competitionNote: 'Drama llama exists but crypto angle is fresh',
          targetAudience: 'Crypto community drama followers',
          launchRecommendation: 'LAUNCH SOON — drama is constant in crypto',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },

  influencer_event: {
    generate: (r) => {
      const cat = r.catalyst.event;
      return [
        makeConcept({
          name: 'Shill Wizard', ticker: 'SHLL',
          oneSentence: 'A wizard that shills tokens so hard they actually pump',
          backstory: 'The Shill Wizard has a 100% shill rate. Every token he touches pumps 100x. Then he disappears. Nobody knows his identity. Nobody can find him. But everyone wants him to shill their bag.',
          coreJoke: 'The wizard does not shill bad tokens. He makes bad tokens good. Then he leaves.',
          catchphrase: 'The shill is mightier than the chart.',
          communityNickname: 'The Shillmaster',
          cryptoCatalyst: cat, catalystCategory: 'influencer_event', detectedEmotion: 'greed',
          whyFunny: 'The wizard turns influencer shilling into magical realism',
          whyRelatable: 'Everyone wants a wizard to shill their bag. Everyone fears the dump.',
          whyCryptoNative: 'Influencer shilling is uniquely crypto — wizards live on Twitter',
          whyPeoplePostMemes: 'The wizard is the perfect mascot for every shill post',
          whyInfluencersShare: 'The wizard is the influencer they want to be',
          mascot: 'A wizard with a megaphone, surrounded by pumping charts',
          visualIdentity: 'Magical hype, purple/gold palette, wizard aesthetic',
          logoIdea: 'Wizard with megaphone and green chart',
          imagePrompt: 'Cartoon wizard with megaphone, surrounded by pumping green charts, magical hype style, purple and gold colors, meme coin mascot, vector art',
          bannerPrompt: 'Magical scene with wizard shilling from tower, charts pumping below, purple glow, gold coins',
          launchScore: 78, originality: 80, virality: 82, visualPotential: 85, storyStrength: 80,
          communityPotential: 85, brandability: 82, cryptoRelevance: 85, memePotential: 85, competition: 12, launchTiming: 80,
          existingTokens: 2, competitionNote: 'Shill wizard is unique — magic + shilling is fresh',
          targetAudience: 'Token holders who want exposure',
          launchRecommendation: 'LAUNCH NOW — influencer drama creates viral moments',
          supportingPosts: evidenceFromPosts(r.catalyst.posts),
          sourcesScanned: uniqueSources(r.catalyst.posts),
        }),
      ];
    },
  },
};

// ══════════════════════════════════════════════════════════════════════
// MAIN GENERATION FUNCTION
// ══════════════════════════════════════════════════════════════════════

export function generateFromReaction(reaction: CommunityReaction): MemeConcept[] {
  const category = reaction.catalyst.category;
  const template = TEMPLATES[category];
  if (!template) return [];

  const concepts = template.generate(reaction);

  const seen = new Set<string>();
  return concepts.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
