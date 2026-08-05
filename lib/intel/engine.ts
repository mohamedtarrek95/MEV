import type { RawPost, MemeConcept, CryptoCatalyst, CommunityReaction, ConceptReport, PipelineDiagnostics, CatalystCategory, CommunityEmotion } from './types.js';
import { generateFromReaction } from './concepts.js';

// ══════════════════════════════════════════════════════════════════════
// CRYPTO MEME CREATION ENGINE
//
// 7-step pipeline:
// 1. Collect posts from crypto-native sources
// 2. Filter to crypto-only content
// 3. Detect crypto catalysts (real events)
// 4. Detect community emotions
// 5. Extract reactions (jokes, sarcasm, nicknames)
// 6. Transform into meme coin characters
// 7. Quality gate + return top concepts
// ══════════════════════════════════════════════════════════════════════

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

// ── STEP 2: Crypto Classification ──

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
  'bonding curve','launch sniper','bot war','sandwich','mev',
];

function isCryptoPost(text: string): boolean {
  const lower = normalizeText(text);
  let score = 0;
  for (const s of CRYPTO_SIGNALS) {
    if (lower.includes(s)) score += 3;
  }
  return score >= 4;
}

// ── STEP 3: Catalyst Detection ──

interface CatalystRule {
  pattern: RegExp;
  category: CatalystCategory;
}

const CATALYST_RULES: CatalystRule[] = [
  { pattern: /(?:hack|exploit|drain|stolen|phishing|scam)\s*(?:\$\d+|million|thousand|wallet|exchange)/i, category: 'exchange_hack' },
  { pattern: /bridge\s*(?:exploit|hack|drain|attack|vulnerability)/i, category: 'bridge_exploit' },
  { pattern: /(?:bitcoin|eth|solana)\s*etf|etf\s*(?:approved|denied|filed|launch)/i, category: 'etf' },
  { pattern: /(?:sec|cftc|regulation|regulatory|compliance|ban|legal)/i, category: 'regulation' },
  { pattern: /whale\s*(?:buy|sell|move|dump|accumulate|transfer|wallet|alert)/i, category: 'whale_movement' },
  { pattern: /ai\s*(?:crypto|token|agent|trading|replace|takeover|sentient|autonomous|model)/i, category: 'ai' },
  { pattern: /(?:gaming|game|play.?to.?earn|gaming\s*token|web3\s*game)/i, category: 'gaming' },
  { pattern: /solana\s*(?:upgrade|update|v\d|fork|launch|validator)/i, category: 'solana_upgrade' },
  { pattern: /ethereum\s*(?:upgrade|update|v\d|fork|dencun|pectra|merge)/i, category: 'ethereum_upgrade' },
  { pattern: /(?:meme\s*coin|memecoin)\s*(?:season|mania|wave|run|rotation)/i, category: 'memecoin_mania' },
  { pattern: /gas\s*(?:fee|price|spike|high|insane|crazy|expensive)/i, category: 'gas_fees' },
  { pattern: /(?:solana|network|rpc)\s*(?:congestion|slow|down|outage|spam|failed|clogged)/i, category: 'network_congestion' },
  { pattern: /pump\.?\s*fun|bonding\s*curve|launch\s*sniper|token\s*launch/i, category: 'pumpfun' },
  { pattern: /(?:defi|yield|farming|tvl|liquidity\s*pool|impermanent\s*loss|rug\s*pull)/i, category: 'defi' },
  { pattern: /(?:nft|collectible|digital\s*art|opensea|blur|nft\s*market)/i, category: 'nft' },
  { pattern: /(?:stablecoin|usdt|usdc|dai|tether|circle|depeg)/i, category: 'stablecoins' },
  { pattern: /(?:layer\s*2|l2|rollup|arbitrum|optimism|base|zksync|scroll)/i, category: 'layer2' },
  { pattern: /(?:security|hack|vulnerability|exploit|drain|phishing)/i, category: 'security' },
  { pattern: /(?:liquidity|pool|rug|drain|exit|withdraw)/i, category: 'liquidity' },
  { pattern: /(?:macro|fed|interest\s*rate|inflation|recession|tariff|trade\s*war)/i, category: 'macro' },
  { pattern: /(?:drama|fight|beef|controversy|scandal|community\s*split)/i, category: 'community_drama' },
  { pattern: /(?:influencer|kols?|key\s*opinion|shill|promot|endors)/i, category: 'influencer_event' },
];

function detectCatalysts(posts: RawPost[]): CryptoCatalyst[] {
  const groups = new Map<CatalystCategory, RawPost[]>();

  for (const post of posts) {
    const text = `${post.title} ${post.body}`;
    for (const { pattern, category } of CATALYST_RULES) {
      if (pattern.test(text)) {
        const existing = groups.get(category) ?? [];
        existing.push(post);
        groups.set(category, existing);
        break;
      }
    }
  }

  const EMOTION_WORDS: Record<CommunityEmotion, string[]> = {
    fear: ['scared','afraid','worried','panic','terrifying','danger','hack','drain','stolen','rugged'],
    greed: ['moon','pump','send','gem','early','profit','rich','gain','buy','dump'],
    excitement: ['amazing','incredible','huge','massive','insane','crazy','wow','unbelievable','bullish'],
    fomo: ['fomo','missed','late','early','now','urgent','hurry','last chance'],
    hope: ['hope','believe','future','change','revolution','finally','soon'],
    frustration: ['frustrated','annoyed','angry','sick','tired','hate','terrible','broken','slow','failed'],
    sarcasm: ['sure','right','totally','definitely','wow','genius','brilliant','obviously'],
    irony: ['ironic','irony','funny','coincidence','lol','lmao','hilarious'],
    anger: ['angry','furious','outraged','unacceptable','scam','fraud','steal','rob'],
    disbelief: ['unbelievable','insane','crazy','no way','wtf','cant believe','shocking'],
    relief: ['relief','finally','safe','secure','back','recovered','saved'],
    hype: ['hype','wave','era','massive','huge','incredible','rocket','moon','launch'],
    confusion: ['confused','confusing','unclear','what','huh','explain','dont understand'],
  };

  const catalysts: CryptoCatalyst[] = [];
  for (const [category, catPosts] of groups) {
    if (catPosts.length < 2) continue;

    const totalEng = catPosts.reduce((s, p) => s + p.likes + p.shares * 2 + p.comments, 0);
    const authors = new Set(catPosts.map((p) => p.author));
    const sources = new Set(catPosts.map((p) => p.source));

    const severity = Math.min(100, Math.round(
      Math.min(catPosts.length / 8, 1) * 30 +
      Math.min(authors.size / 5, 1) * 30 +
      Math.min(sources.size / 2, 1) * 20 +
      Math.min((totalEng || 0) / 200, 1) * 20
    ));

    const allText = catPosts.map((p) => normalizeText(`${p.title} ${p.body}`)).join(' ');
    let bestEmotion: CommunityEmotion = 'confusion';
    let bestCount = 0;
    for (const [emotion, keywords] of Object.entries(EMOTION_WORDS)) {
      let count = 0;
      for (const kw of keywords) {
        if (allText.includes(kw)) count++;
      }
      if (count > bestCount) { bestCount = count; bestEmotion = emotion as CommunityEmotion; }
    }

    catalysts.push({
      id: `cat-${category}-${Date.now()}`,
      event: catPosts[0].title,
      category,
      severity,
      posts: catPosts,
      dominantEmotion: bestEmotion,
    });
  }

  return catalysts.sort((a, b) => b.severity - a.severity);
}

// ── STEP 4+5: Emotion + Reaction Extraction ──

function extractReactions(catalysts: CryptoCatalyst[]): CommunityReaction[] {
  return catalysts.map((catalyst) => {
    const posts = catalyst.posts;
    const allText = posts.map((p) => `${p.title} ${p.body}`).join(' ');

    const jokes = posts
      .filter((p) => {
        const t = normalizeText(`${p.title} ${p.body}`);
        return t.includes('lmao') || t.includes('funny') || t.includes('joke') || t.includes('meme') || t.includes('hilarious') || t.includes('lol');
      })
      .map((p) => p.title)
      .slice(0, 5);

    const sarcasticComments = posts
      .filter((p) => {
        const t = normalizeText(`${p.title} ${p.body}`);
        return t.includes('sure') || t.includes('right') || t.includes('totally') || t.includes('definitely') || t.includes('wow') || t.includes('genius') || t.includes('obviously');
      })
      .map((p) => p.title)
      .slice(0, 5);

    const nicknameMatches = allText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [];
    const funnyNicknames = [...new Set(nicknameMatches)]
      .filter((n) => n.length > 3 && n.length < 30)
      .slice(0, 5);

    const emotionalThemes: string[] = [];
    const THEME_PATTERNS: [RegExp, string][] = [
      [/(?:everyone|all|nobody)\s+(?:complains?|hates?|frustrated)/i, 'collective frustration'],
      [/(?:moon|send|pump|rocket|wave)/i, 'hype and excitement'],
      [/(?:rekt|lost|destroyed|rugged|scammed)/i, 'pain and loss'],
      [/(?:bot|sniper|mev|front.?run|gaming)/i, 'unfair gaming'],
      [/(?:hack|exploit|drain|stolen|phishing)/i, 'security fear'],
      [/(?:slow|down|broken|fail|error|timeout)/i, 'infrastructure failure'],
      [/(?:whale|manipulation|dump|insider)/i, 'manipulation anger'],
    ];
    for (const [pattern, theme] of THEME_PATTERNS) {
      if (pattern.test(allText)) emotionalThemes.push(theme);
    }

    return { catalyst, jokes, sarcasticComments, funnyNicknames, emotionalThemes };
  });
}

// ── STEP 6: Quality Gate ──

function passesQualityGate(concept: MemeConcept): boolean {
  const cryptoTerms = ['crypto','bitcoin','ethereum','solana','defi','nft','token','wallet','gas','hack','exploit','pump','moon','whale','bot','mev','rpc','network','launch','trade','dex','cex','stake','farm','yield','liquidity','bridge','l2','rollup','etf','sec','ai','agent','congestion','fee','sandwich','front-run','sniper'];
  const conceptText = `${concept.name} ${concept.oneSentence} ${concept.backstory} ${concept.coreJoke} ${concept.cryptoCatalyst} ${concept.whyCryptoNative}`.toLowerCase();
  let hasCryptoTerm = false;
  for (const t of cryptoTerms) {
    if (conceptText.includes(t)) { hasCryptoTerm = true; break; }
  }
  if (!hasCryptoTerm) return false;
  if (!concept.cryptoCatalyst || concept.cryptoCatalyst.length < 10) return false;
  if (!concept.backstory || concept.backstory.length < 20) return false;
  if (!concept.coreJoke || concept.coreJoke.length < 10) return false;
  if (concept.launchScore < 55) return false;
  return true;
}

// ── STEP 7: Main Pipeline ──

const MAX_CONCEPTS = 15;

export function analyzeNarratives(posts: RawPost[]): MemeConcept[] {
  const now = Date.now();
  const L = (msg: string) => console.log(`[launch-engine] ${msg}`);
  const SEP = '════════════════════════════════════════════════════════════';

  const allAuthors = new Set<string>();
  const allSources = new Set<string>();
  for (const p of posts) { allAuthors.add(p.author); allSources.add(p.source); }

  L(SEP);
  L('  CRYPTO MEME CREATION ENGINE');
  L(SEP);
  L(`  Total posts:     ${posts.length}`);
  L(`  Authors:         ${allAuthors.size}`);
  L(`  Platforms:       ${allSources.size}`);
  L('');

  // Step 1-2: Filter
  const windowStart = now - 24 * 3600 * 1000;
  const recent = posts.filter((p) => p.timestamp > windowStart);
  const cryptoPosts = recent.filter((p) => isCryptoPost(`${p.title} ${p.body}`));

  L(SEP);
  L('  STEP 1-2: COLLECT + FILTER');
  L(SEP);
  L(`  Recent:          ${recent.length}`);
  L(`  Crypto-only:     ${cryptoPosts.length}`);
  L(`  Rejected:        ${recent.length - cryptoPosts.length}`);
  L('');

  // Step 3: Detect catalysts
  const catalysts = detectCatalysts(cryptoPosts);

  L(SEP);
  L('  STEP 3: DETECT CRYPTO CATALYSTS');
  L(SEP);
  L(`  Catalysts:       ${catalysts.length}`);
  for (const c of catalysts.slice(0, 10)) {
    L(`  [${c.category}] "${c.event}" severity=${c.severity} emotion=${c.dominantEmotion}`);
  }
  L('');

  // Step 4-5: Extract reactions
  const reactions = extractReactions(catalysts);

  L(SEP);
  L('  STEP 4-5: EMOTIONS + REACTIONS');
  L(SEP);
  L(`  Reactions:       ${reactions.length}`);
  for (const r of reactions.slice(0, 10)) {
    L(`  [${r.catalyst.category}] jokes=${r.jokes.length} sarcasm=${r.sarcasticComments.length} nicknames=${r.funnyNicknames.length}`);
  }
  L('');

  // Step 6: Generate concepts
  let allConcepts: MemeConcept[] = [];
  for (const reaction of reactions) {
    const concepts = generateFromReaction(reaction);
    allConcepts.push(...concepts);
  }

  L(SEP);
  L('  STEP 6: GENERATE CONCEPTS');
  L(SEP);
  L(`  Raw concepts:    ${allConcepts.length}`);
  L('');

  // Step 7: Quality gate
  const passed = allConcepts.filter(passesQualityGate);
  const rejected = allConcepts.length - passed.length;

  L(SEP);
  L('  STEP 7: QUALITY GATE');
  L(SEP);
  L(`  Passed:          ${passed.length}`);
  L(`  Rejected:        ${rejected}`);
  L('');

  passed.sort((a, b) => b.launchScore - a.launchScore);
  const top = passed.slice(0, MAX_CONCEPTS);

  L(SEP);
  L('  FINAL RESULTS');
  L(SEP);
  L(`  High-conviction: ${top.length}`);
  for (let i = 0; i < top.length; i++) {
    const c = top[i];
    L(`  #${i + 1}: "${c.name}" (${c.ticker}) launch=${c.launchScore} catalyst="${c.cryptoCatalyst}"`);
  }
  L(SEP);

  return top;
}
