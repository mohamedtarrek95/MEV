import type { RawPost, MemeConcept, NarrativeSignal, ConceptReport, PipelineDiagnostics } from './types.js';
import { generateConcepts } from './concepts.js';

// ══════════════════════════════════════════════════════════════════════
// CRYPTO MEME CREATION INTELLIGENCE ENGINE
//
// This engine INVENTS new meme coin concepts.
// It does NOT detect existing memes.
// It does NOT rank existing tokens.
//
// Pipeline:
// 1. Collect posts from crypto + meme sources
// 2. Remove junk (spam, generic news, price movement)
// 3. Classify (crypto / meme / news / rejected)
// 4. Detect narrative signals (emerging themes, emotions)
// 5. Generate NEW concepts from each narrative
// 6. Score each concept
// 7. Return top 15
// ══════════════════════════════════════════════════════════════════════

// ── Section 1: Text Processing ──

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','if','then','else','when','at','by','for',
  'in','on','of','to','from','with','as','is','was','are','were','been','be',
  'have','has','had','do','does','did','will','would','could','should','may',
  'might','shall','can','need','this','that','these','those','i','me','my',
  'we','our','you','your','he','him','his','she','her','it','its','they',
  'them','their','what','which','who','where','when','why','how','all','each',
  'every','both','few','more','most','other','some','such','no','not','only',
  'own','same','so','than','too','very','just','about','above','after','again',
  'also','any','because','before','being','below','between','during','here',
  'into','now','over','out','through','under','up','down','off','once',
  'don','dont','get','got','like','one','two','go','going','know','think',
  'see','come','make','take','give','say','said','put','let','still','even',
  'way','much','back','well','look','first','last','new','right','thing',
  'things','really','yeah','yes','ok','okay','lol','lmao','haha','bro',
]);

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
];

const REJECT_WORDS = new Set([
  'apple','google','microsoft','amazon','netflix','spotify','tesla','spacex',
  'openai','anthropic','meta','nvidia','roblox','fortnite','minecraft',
  'trump','biden','putin','zelensky','modi','macron','congress','senate',
  'president','governor','senator','election','democrat','republican',
  'earthquake','hurricane','pandemic','virus','lockdown',
  'america','united states','china','russia','ukraine','israel',
]);

// ── Section 3: Post Classification ──

type PostClass = 'crypto' | 'meme' | 'news' | 'rejected';

const CRYPTO_WORDS = new Set([
  'bitcoin','btc','ethereum','eth','solana','sol','crypto','blockchain',
  'web3','defi','nft','token','coin','dex','cex','staking','yield',
  'farming','liquidity','swap','pool','bridge','wallet','metamask','phantom',
  'pump.fun','pumpfun','raydium','jupiter','jito','marinade',
  'altcoin','memecoin','meme coin','gem','moon','bullish','bearish',
  'hodl','diamond','paper','whale','bag','bagholder','rekt','rugpull',
  'rug','honeypot','exit liquidity','ape','fomo','fud','shill','dyor',
  'gas','gwei','nonce','mainnet','testnet','layer2','l2','rollup',
]);

const MEME_WORDS = new Set([
  'meme','shitpost','brainrot','sigma','skibidi','gigachad','npc','trollface',
  'pepe','doge','shiba','bonk','wojak','cat','dog','frog','viral','trending',
  'dank','based','cringe','sus','cope','seethe','bussin','sheesh',
]);

function classifyPost(text: string): PostClass {
  const lower = normalizeText(text);

  for (const p of REJECT_PATTERNS) {
    if (p.test(lower)) return 'rejected';
  }

  let rejectScore = 0;
  let cryptoScore = 0;
  let memeScore = 0;
  const words = lower.split(/\s+/);

  for (const w of words) {
    if (REJECT_WORDS.has(w)) rejectScore += 10;
    if (CRYPTO_WORDS.has(w)) cryptoScore += 3;
    if (MEME_WORDS.has(w)) memeScore += 2;
  }

  if (rejectScore >= 15 && rejectScore > cryptoScore && rejectScore > memeScore) return 'rejected';
  if (cryptoScore >= 6) return 'crypto';
  if (memeScore >= 4) return 'meme';
  if (cryptoScore >= 3 || memeScore >= 2) return 'news';
  return 'rejected';
}

// ── Section 4: Narrative Signal Detection ──

const EMOTION_KEYWORDS: Record<string, string[]> = {
  frustration: ['frustrated','annoyed','angry','sick','tired','hate','terrible','worst','broken','scam','rug','rekt','lost','destroyed'],
  excitement: ['excited','amazing','incredible','huge','massive','insane','crazy','wow','unbelievable','moon','rocket','pump','bullish','send it'],
  fear: ['scared','afraid','worried','panic','terrifying','dangerous','risk','hacked','stolen','phishing','malware'],
  humor: ['funny','hilarious','lmao','rofl','joke','meme','shitpost','absurd','ridiculous','unhinged'],
  greed: ['profit','money','rich','wealthy','millionaire','billionaire','gain','pump','dump','buy','sell','hold','diamond'],
  community: ['together','community','group','team','family','army','cult','movement','revolution'],
};

function detectEmotion(posts: RawPost[]): string {
  const emotionCounts: Record<string, number> = {};
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    let count = 0;
    for (const post of posts) {
      const text = normalizeText(`${post.title} ${post.body}`);
      for (const kw of keywords) {
        if (text.includes(kw)) count++;
      }
    }
    emotionCounts[emotion] = count;
  }
  const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[1] > 0 ? sorted[0][0] : 'neutral';
}

function detectNarrativeSignals(posts: RawPost[]): NarrativeSignal[] {
  const THEME_PATTERNS: { pattern: RegExp; theme: string }[] = [
    { pattern: /gas\s*fee|gas\s*price|network\s*fee|transaction\s*fee|eth\s*gas/i, theme: 'gas fee frustration' },
    { pattern: /rug\s*pull|scam|rug|honeypot|exit\s*liquidity/i, theme: 'rug pull fear' },
    { pattern: /artificial\s*intelligence|ai\s*takeover|ai\s*replace|chatgpt|openai|agi|llm|ai\s*agent/i, theme: 'AI narrative' },
    { pattern: /solana|sol\b|phantom|raydium|jito/i, theme: 'Solana ecosystem' },
    { pattern: /meme\s*coin|viral\s*meme|internet\s*meme|shitpost|brainrot/i, theme: 'meme culture' },
    { pattern: /whale|big\s*buyer|large\s*wallet|institution/i, theme: 'whale activity' },
    { pattern: /pump\.?\s*fun|bonding\s*curve|launchpad|token\s*launch/i, theme: 'token launches' },
    { pattern: /fomo|hype|moon|rocket|bull\s*run|bullish|pump\s*it/i, theme: 'hype and FOMO' },
    { pattern: /bear\s*market|crash|dump|fear|panic|sell\s*off|rekt/i, theme: 'bear market fear' },
    { pattern: /wallet|private\s*key|seed\s*phrase|security|hack|stolen/i, theme: 'wallet security' },
    { pattern: /defi|yield|farming|staking|liquidity\s*pool|tvl/i, theme: 'DeFi yields' },
    { pattern: /nft|collectible|digital\s*art|opensea|blur/i, theme: 'NFT culture' },
    { pattern: /layer\s*2|l2|rollup|arbitrum|optimism|base|zksync/i, theme: 'Layer 2 scaling' },
    { pattern: /memecoin|memecoin\s*season|alt\s*season/i, theme: 'memecoin season' },
  ];

  const themeGroups = new Map<string, RawPost[]>();

  for (const post of posts) {
    const text = `${post.title} ${post.body}`;
    for (const { pattern, theme } of THEME_PATTERNS) {
      if (pattern.test(text)) {
        const existing = themeGroups.get(theme) ?? [];
        existing.push(post);
        themeGroups.set(theme, existing);
        break;
      }
    }
  }

  const signals: NarrativeSignal[] = [];
  for (const [theme, themePosts] of themeGroups) {
    if (themePosts.length < 2) continue;
    const authors = new Set(themePosts.map((p) => p.author));
    const sources = new Set(themePosts.map((p) => p.source));
    const emotion = detectEmotion(themePosts);

    const totalEng = themePosts.reduce((s, p) => s + p.likes + p.shares * 2 + p.comments, 0);
    const strength = Math.min(100, Math.round(
      Math.min(themePosts.length / 10, 1) * 30 +
      Math.min(authors.size / 5, 1) * 30 +
      Math.min(sources.size / 2, 1) * 20 +
      Math.min(totalEng / 200, 1) * 20
    ));

    signals.push({
      theme,
      strength,
      postCount: themePosts.length,
      sourceCount: sources.size,
      emotion,
      posts: themePosts,
    });
  }

  return signals.sort((a, b) => b.strength - a.strength);
}

// ── Section 5: Concept Scoring Refinement ──

function refineScores(concepts: MemeConcept[], signals: NarrativeSignal[]): MemeConcept[] {
  return concepts.map((c) => {
    const signal = signals.find((s) => s.theme === c.narrative);
    if (!signal) return c;

    // Boost score if signal is strong
    const signalBoost = Math.round(signal.strength / 10);

    // Boost if multiple sources
    const sourceBoost = signal.sourceCount >= 3 ? 5 : signal.sourceCount >= 2 ? 3 : 0;

    // Boost if high engagement
    const totalEng = signal.posts.reduce((s, p) => s + p.likes + p.shares * 2 + p.comments, 0);
    const engBoost = totalEng > 100 ? 5 : totalEng > 50 ? 3 : 0;

    const launchScore = Math.min(100, c.launchScore + signalBoost + sourceBoost + engBoost);

    return {
      ...c,
      launchScore,
      viralityScore: Math.min(100, c.viralityScore + signalBoost),
      narrativeStrength: Math.min(100, c.narrativeStrength + signalBoost),
      communityFit: Math.min(100, c.communityFit + sourceBoost),
    };
  });
}

// ── Section 6: Main Analysis ──

const MAX_CONCEPTS = 15;

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
  L(`  Platforms:       ${allSources.size} (${[...allSources].join(', ')})`);
  L('');

  // Stage 1: Classify
  const windowStart = now - 24 * 3600 * 1000;
  const recent = posts.filter((p) => p.timestamp > windowStart);

  let cryptoCount = 0, memeCount = 0, newsCount = 0, rejectedCount = 0;
  const classified: RawPost[] = [];

  for (const post of recent) {
    const text = `${post.title} ${post.body}`;
    const cls = classifyPost(text);
    switch (cls) {
      case 'crypto': cryptoCount++; classified.push(post); break;
      case 'meme': memeCount++; classified.push(post); break;
      case 'news': newsCount++; classified.push(post); break;
      case 'rejected': rejectedCount++; break;
    }
  }

  L(SEP);
  L('  STAGE 1: CLASSIFY POSTS');
  L(SEP);
  L(`  Recent posts:     ${recent.length}`);
  L(`  Crypto:           ${cryptoCount}`);
  L(`  Meme:             ${memeCount}`);
  L(`  News:             ${newsCount}`);
  L(`  Rejected:         ${rejectedCount}`);
  L('');

  // Stage 2: Detect Narrative Signals
  const signals = detectNarrativeSignals(classified);

  L(SEP);
  L('  STAGE 2: DETECT NARRATIVE SIGNALS');
  L(SEP);
  L(`  Narratives found: ${signals.length}`);
  for (const s of signals.slice(0, 10)) {
    L(`  "${s.theme}" — strength=${s.strength} posts=${s.postCount} sources=${s.sourceCount} emotion=${s.emotion}`);
  }
  L('');

  // Stage 3: Generate Concepts
  const rawConcepts = generateConcepts(signals);

  L(SEP);
  L('  STAGE 3: GENERATE CONCEPTS');
  L(SEP);
  L(`  Raw concepts:     ${rawConcepts.length}`);
  L('');

  // Stage 4: Refine Scores
  const concepts = refineScores(rawConcepts, signals);
  concepts.sort((a, b) => b.launchScore - a.launchScore);
  const top15 = concepts.slice(0, MAX_CONCEPTS);

  L(SEP);
  L('  STAGE 4: SCORE AND RANK');
  L(SEP);
  L(`  Final concepts:   ${top15.length}`);
  for (let i = 0; i < top15.length; i++) {
    const c = top15[i];
    L(`  #${i + 1}: "${c.name}" (${c.ticker}) — launch=${c.launchScore} originality=${c.originalityScore} virality=${c.viralityScore} visual=${c.visualPotential} brand=${c.brandability}`);
  }
  L(SEP);

  return top15;
}
