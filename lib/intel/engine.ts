import type { RawPost, MemeConcept, CryptoCatalyst, CommunityReaction, ConceptReport, PipelineDiagnostics } from './types.js';
import { generateFromReaction } from './concepts.js';

// ══════════════════════════════════════════════════════════════════════
// CRYPTO MEME CREATION INTELLIGENCE ENGINE
//
// Pipeline:
// 1. Collect posts from crypto + meme sources
// 2. Remove junk
// 3. Detect crypto catalysts (real events)
// 4. Extract community reactions (jokes, sarcasm, emotions)
// 5. Transform reactions into meme coin concepts
// 6. Quality gate: "Would I spend 2 SOL on this?"
// 7. Return top concepts (max 15, fewer if quality is low)
// ══════════════════════════════════════════════════════════════════════

// ── Section 1: Text Processing ──

const URL_RE = /https?:\/\/[^\s]+/gi;
const EMOJI_RE = /[\u{1F600}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu;
const PUNCT_RE = /[^\p{L}\p{N}\s]/gu;

function normalizeText(text: string): string {
  return text
    .replace(URL_RE, ' ')
    .replace(EMOJI_RE, ' ')
    .replace(PUNCT_RE, ' ')
    .toLowerCase()
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ── Section 2: Rejection Filters ──

const REJECT_PATTERNS: RegExp[] = [
  /\b(trending|trend)\s+(on|in|now|today)\b/i,
  /\brank\s*#?\d/i,
  /\b(top|bottom)\s+(gainers?|losers?|coins?|tokens?)\b/i,
  /\b24\s*h\s*(change|gain|loss|volume)\b/i,
  /\b(price|market)\s*(change|cap|pair)\b/i,
  /\b(volume|liquidity|fdv|tvl|apy|apr)\b/i,
  /\bnew\s+(pairs?|listings?|coins?|tokens?)\b/i,
  /\b(pull request|merge request|commit|branch|release)\b/i,
  /\b(vulnerability|cve|security patch)\b/i,
  /\b(weather|temperature|forecast)\b/i,
  /\b(stock|bond|etf|earnings|revenue|profit|loss|ipo)\b/i,
  /\b(bankruptcy|debt|inflation|gdp|federal reserve|treasury)\b/i,
  /\b(war|conflict|nuclear|missile|sanctions|tariff)\b/i,
  /\b(earthquake|hurricane|pandemic|virus|lockdown)\b/i,
  /\b(nba|nfl|mlb|soccer|football|basketball|baseball)\b/i,
  /\b(movie|film|tv show|netflix series|celebrity|gossip)\b/i,
];

const REJECT_WORDS = new Set([
  'apple','google','microsoft','amazon','netflix','spotify','tesla','spacex',
  'openai','anthropic','meta','nvidia','roblox','fortnite','minecraft',
  'trump','biden','putin','zelensky','modi','macron','congress','senate',
  'president','governor','senator','election','democrat','republican',
  'earthquake','hurricane','pandemic','virus','lockdown',
  'america','united states','china','russia','ukraine','israel',
  'cat','dog','frog','duck','bear','panda','penguin','shark','whale',
]);

// ── Section 3: Post Classification ──

function isCryptoPost(text: string): boolean {
  const lower = normalizeText(text);
  const CRYPTO_SIGNALS = [
    'bitcoin','btc','ethereum','eth','solana','sol','crypto','blockchain',
    'web3','defi','nft','token','coin','dex','cex','staking','yield',
    'farming','liquidity','swap','pool','bridge','wallet','metamask','phantom',
    'pump.fun','pumpfun','raydium','jupiter','jito','marinade',
    'altcoin','memecoin','meme coin','moon','bullish','bearish',
    'hodl','diamond','paper','whale','bag','rekt','rug','rugpull',
    'honeypot','exit liquidity','ape','fomo','fud','shill','dyor',
    'gas','gwei','nonce','mainnet','testnet','layer2','l2','rollup',
    'base','arbitrum','optimism','zksync','hyperliquid',
    'hack','exploit','drain','stolen','phishing',
    'etf','regulation','sec','cftc',
  ];
  let score = 0;
  for (const w of CRYPTO_SIGNALS) {
    if (lower.includes(w)) score += 3;
  }
  return score >= 4;
}

// ── Section 4: Catalyst Detection ──

interface CatalystPattern {
  pattern: RegExp;
  category: string;
  emotionKeywords: string[];
}

const CATALYST_PATTERNS: CatalystPattern[] = [
  // Solana ecosystem
  { pattern: /solana\s*(?:congestion|slow|down|outage|spam|failed|rpc|error|clogged)/i, category: 'solana', emotionKeywords: ['frustrated','angry','broken','slow','failed','stuck'] },
  { pattern: /solana\s*(?:pump|moon|surge|rally|explode|rip|blast)/i, category: 'solana', emotionKeywords: ['hype','bullish','moon','rocket','send','pump'] },

  // Hack / Exploit
  { pattern: /(?:hack|exploit|drain|stolen|phishing|scam|drained|lost)\s*(?:\$\d+|million|thousand|wallet|account)/i, category: 'hack', emotionKeywords: ['scared','panic','rekt','lost','destroyed','rugged'] },

  // Pump.fun
  { pattern: /pump\.?\s*fun|bonding\s*curve|launch\s*sniper|bot\s*war|sniper\s*bot/i, category: 'pumpfun', emotionKeywords: ['greed','fomo','gaming','bot','snipe','front-run'] },

  // AI crypto
  { pattern: /ai\s*(?:crypto|token|agent|trading|replace|takeover|sentient|autonomous)/i, category: 'ai', emotionKeywords: ['wonder','fear','excitement','future','replace','intelligence'] },

  // DeFi
  { pattern: /(?:defi|yield|farming|tvl|liquidity\s*pool|impermanent\s*loss|rug\s*pull)/i, category: 'defi', emotionKeywords: ['greed','risk','yield','farm','loss','rekt'] },

  // Whale activity
  { pattern: /whale\s*(?:buy|sell|move|dump|accumulate|transfer|wallet)/i, category: 'whale', emotionKeywords: ['fomo','fear','follow','manipulation','dump','moon'] },

  // ETF / Regulation
  { pattern: /(?:etf|sec|regulation|approved|denied|compliance)/i, category: 'regulation', emotionKeywords: ['hype','fear','uncertainty','bullish','bearish','adopt'] },

  // Gas fees
  { pattern: /gas\s*(?:fee|price|spike|high|insane|crazy|expensive)/i, category: 'gas', emotionKeywords: ['frustrated','angry','expensive','broken','unfair'] },

  // RPC / Network issues
  { pattern: /(?:rpc|network|node)\s*(?:down|error|fail|slow|timeout|broken)/i, category: 'network', emotionKeywords: ['frustrated','broken','unreliable','down','fail'] },

  // New launch / token
  { pattern: /(?:new|launch|listing)\s*(?:token|coin|pair|dex|exchange)/i, category: 'launch', emotionKeywords: ['fomo','hype','early','moon','gem'] },

  // Bot wars / MEV
  { pattern: /(?:bot|mev|sandwich|front.?run|extract|arb)/i, category: 'mev', emotionKeywords: ['anger','unfair','predatory','steal','gaming'] },

  // Meme season
  { pattern: /(?:meme\s*season|alt\s*season|memecoin\s*season|degen\s*season)/i, category: 'memeseason', emotionKeywords: ['greed','hype','fomo','moon','rotate'] },
];

function detectCatalysts(posts: RawPost[]): CryptoCatalyst[] {
  const catalystGroups = new Map<string, RawPost[]>();

  for (const post of posts) {
    const text = `${post.title} ${post.body}`;
    for (const { pattern, category } of CATALYST_PATTERNS) {
      if (pattern.test(text)) {
        const existing = catalystGroups.get(category) ?? [];
        existing.push(post);
        catalystGroups.set(category, existing);
        break;
      }
    }
  }

  const catalysts: CryptoCatalyst[] = [];
  for (const [category, catPosts] of catalystGroups) {
    if (catPosts.length < 2) continue;

    const totalEng = catPosts.reduce((s, p) => s + p.likes + p.shares * 2 + p.comments, 0);
    const authors = new Set(catPosts.map((p) => p.author));
    const sources = new Set(catPosts.map((p) => p.source));

    const severity = Math.min(100, Math.round(
      Math.min(catPosts.length / 8, 1) * 30 +
      Math.min(authors.size / 5, 1) * 30 +
      Math.min(sources.size / 2, 1) * 20 +
      Math.min(totalEng / 200, 1) * 20
    ));

    // Detect dominant emotion
    const emotionMap: Record<string, string[]> = {
      frustration: ['frustrated','angry','broken','slow','failed','stuck','hate','terrible'],
      greed: ['moon','pump','send','gem','early','profit','rich','gain'],
      fear: ['scared','panic','rekt','lost','destroyed','hack','drain','rug'],
      hype: ['bullish','hype','wave','era','massive','huge','incredible'],
      humor: ['lmao','funny','joke','meme','hilarious','absurd','ridiculous'],
    };

    const allText = catPosts.map((p) => normalizeText(`${p.title} ${p.body}`)).join(' ');
    let bestEmotion = 'neutral';
    let bestCount = 0;
    for (const [emotion, keywords] of Object.entries(emotionMap)) {
      let count = 0;
      for (const kw of keywords) {
        if (allText.includes(kw)) count++;
      }
      if (count > bestCount) { bestCount = count; bestEmotion = emotion; }
    }

    catalysts.push({
      id: `catalyst-${category}-${Date.now()}`,
      event: catPosts[0].title,
      category,
      severity,
      posts: catPosts,
      dominantEmotion: bestEmotion,
    });
  }

  return catalysts.sort((a, b) => b.severity - a.severity);
}

// ── Section 5: Reaction Extraction ──

function extractReactions(catalysts: CryptoCatalyst[]): CommunityReaction[] {
  return catalysts.map((catalyst) => {
    const posts = catalyst.posts;
    const allText = posts.map((p) => `${p.title} ${p.body}`).join(' ');

    // Extract jokes (posts with high engagement + humor signals)
    const jokes = posts
      .filter((p) => {
        const t = normalizeText(`${p.title} ${p.body}`);
        return t.includes('lmao') || t.includes('funny') || t.includes('joke') || t.includes('meme') || t.includes('hilarious');
      })
      .map((p) => p.title)
      .slice(0, 5);

    // Extract sarcastic comments
    const sarcasticComments = posts
      .filter((p) => {
        const t = normalizeText(`${p.title} ${p.body}`);
        return t.includes('sure') || t.includes('right') || t.includes('totally') || t.includes('definitely') || t.includes('wow') || t.includes('genius');
      })
      .map((p) => p.title)
      .slice(0, 5);

    // Extract nicknames (capitalized proper nouns near crypto terms)
    const nicknameMatches = allText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [];
    const funnyNicknames = [...new Set(nicknameMatches)]
      .filter((n) => n.length > 3 && n.length < 30)
      .slice(0, 5);

    // Extract emotional themes
    const emotionalThemes: string[] = [];
    const EMOTION_PATTERNS: [RegExp, string][] = [
      [/(?:everyone|all|nobody|everyone)\s+(?:complains?|hates?|frustrated|angry)/i, 'collective frustration'],
      [/(?:moon|send|pump|rocket|wave)/i, 'hype and excitement'],
      [/(?:rekt|lost|destroyed|rugged|scammed)/i, 'pain and loss'],
      [/(?:bot|sniper|mev|front.?run|gaming)/i, 'unfair gaming'],
      [/(?:hack|exploit|drain|stolen|phishing)/i, 'security fear'],
      [/(?:slow|down|broken|fail|error|timeout)/i, 'infrastructure frustration'],
      [/(?:whale|manipulation|dump|insider)/i, 'manipulation anger'],
    ];
    for (const [pattern, theme] of EMOTION_PATTERNS) {
      if (pattern.test(allText)) emotionalThemes.push(theme);
    }

    return {
      catalyst,
      jokes,
      sarcasticComments,
      funnyNicknames,
      emotionalThemes,
      viralScreenshots: [],
    };
  });
}

// ── Section 6: Quality Gate ──

function passesQualityGate(concept: MemeConcept): boolean {
  // Must be crypto-native
  const cryptoTerms = ['crypto','bitcoin','ethereum','solana','defi','nft','token','wallet','gas','hack','exploit','pump','moon','whale','bot','mev','rpc','network','launch','trade','dex','cex','stake','farm','yield','liquidity','bridge','l2','rollup','etf','sec','ai','agent'];
  const conceptText = `${concept.name} ${concept.oneSentence} ${concept.memeStory} ${concept.coreJoke} ${concept.cryptoCatalyst}`.toLowerCase();
  let hasCryptoTerm = false;
  for (const t of cryptoTerms) {
    if (conceptText.includes(t)) { hasCryptoTerm = true; break; }
  }
  if (!hasCryptoTerm) return false;

  // Must have a real catalyst
  if (!concept.cryptoCatalyst || concept.cryptoCatalyst.length < 10) return false;

  // Must have a real joke
  if (!concept.coreJoke || concept.coreJoke.length < 10) return false;

  // Launch score must be high enough
  if (concept.launchScore < 55) return false;

  return true;
}

// ── Section 7: Main Analysis ──

const MAX_CONCEPTS = 15;
const MIN_HIGH_CONVICTION = 55;

export function analyzeNarratives(posts: RawPost[]): MemeConcept[] {
  const now = Date.now();
  const L = (msg: string) => console.log(`[launch-engine] ${msg}`);
  const SEP = '════════════════════════════════════════════════════════════';

  const allAuthors = new Set<string>();
  const allSources = new Set<string>();
  for (const p of posts) { allAuthors.add(p.author); allSources.add(p.source); }

  L(SEP);
  L('  CRYPTO MEME CREATION INTELLIGENCE ENGINE');
  L(SEP);
  L(`  Total posts:     ${posts.length}`);
  L(`  Authors:         ${allAuthors.size}`);
  L(`  Platforms:       ${allSources.size}`);
  L('');

  // Stage 1: Filter to crypto posts only
  const windowStart = now - 24 * 3600 * 1000;
  const recent = posts.filter((p) => p.timestamp > windowStart);
  const cryptoPosts = recent.filter((p) => isCryptoPost(`${p.title} ${p.body}`));

  L(SEP);
  L('  STAGE 1: FILTER CRYPTO POSTS');
  L(SEP);
  L(`  Recent posts:     ${recent.length}`);
  L(`  Crypto posts:     ${cryptoPosts.length}`);
  L(`  Rejected:         ${recent.length - cryptoPosts.length}`);
  L('');

  // Stage 2: Detect catalysts
  const catalysts = detectCatalysts(cryptoPosts);

  L(SEP);
  L('  STAGE 2: DETECT CRYPTO CATALYSTS');
  L(SEP);
  L(`  Catalysts found:  ${catalysts.length}`);
  for (const c of catalysts.slice(0, 10)) {
    L(`  [${c.category}] "${c.event}" — severity=${c.severity} emotion=${c.dominantEmotion} posts=${c.posts.length}`);
  }
  L('');

  // Stage 3: Extract reactions
  const reactions = extractReactions(catalysts);

  L(SEP);
  L('  STAGE 3: EXTRACT COMMUNITY REACTIONS');
  L(SEP);
  L(`  Reactions:        ${reactions.length}`);
  for (const r of reactions.slice(0, 10)) {
    L(`  [${r.catalyst.category}] jokes=${r.jokes.length} sarcasm=${r.sarcasticComments.length} nicknames=${r.funnyNicknames.length} themes=${r.emotionalThemes.length}`);
  }
  L('');

  // Stage 4: Generate concepts from reactions
  let allConcepts: MemeConcept[] = [];
  for (const reaction of reactions) {
    const concepts = generateFromReaction(reaction);
    allConcepts.push(...concepts);
  }

  L(SEP);
  L('  STAGE 4: GENERATE CONCEPTS');
  L(SEP);
  L(`  Raw concepts:     ${allConcepts.length}`);
  L('');

  // Stage 5: Quality gate
  const passed = allConcepts.filter(passesQualityGate);
  const rejected = allConcepts.length - passed.length;

  L(SEP);
  L('  STAGE 5: QUALITY GATE');
  L(SEP);
  L(`  Passed:           ${passed.length}`);
  L(`  Rejected:         ${rejected}`);
  L('');

  // Stage 6: Rank and return
  passed.sort((a, b) => b.launchScore - a.launchScore);
  const top = passed.slice(0, MAX_CONCEPTS);

  L(SEP);
  L('  FINAL RESULTS');
  L(SEP);
  L(`  High-conviction:  ${top.length}`);
  for (let i = 0; i < top.length; i++) {
    const c = top[i];
    L(`  #${i + 1}: "${c.name}" (${c.ticker}) — launch=${c.launchScore} catalyst="${c.cryptoCatalyst}"`);
  }
  L(SEP);

  return top;
}
