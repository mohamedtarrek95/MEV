export interface ScoreBreakdown {
  twitterMentions: number;
  dexVolumeChangePct: number;
  newHolders: number;
  hoursSinceLaunch: number;
}

export interface Rationale {
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  liquidity: 'High' | 'Medium' | 'Low';
  developerActivity: 'Active' | 'Inactive';
  verdict: string;
  breakdown: ScoreBreakdown;
}

export interface MemeSuggestion {
  id: string;
  name: string;
  ticker: string;
  description: string;
  imageUrl: string;
  trendingScore: number;
  estimatedCostSol: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  source: string;
  trendingTopic: string;
  mintAddress: string;
  rationale: Rationale;
}

export interface CoinDraft {
  id: string;
  createdAt: number;
  name: string;
  ticker: string;
  description: string;
  imageUrl: string;
  buyAmount: number;
  sourceSuggestionId?: string;
}

export interface TwitterData {
  keywords: string[];
  engagementScore: number;
  topTweets: { text: string; engagement: number }[];
}

export interface DexScreenerToken {
  symbol: string;
  name: string;
  volume24h: number;
  volumeChange24h: number;
  holders: number;
  address: string;
}

const PLACEHOLDER_MINT_PREFIX = 'SOLANA_PLACEHOLDER_';

const ANIMALS = [
  'Doge', 'Pepe', 'Shiba', 'Cat', 'Frog', 'Monkey', 'Whale',
  'Bear', 'Bull', 'Hawk', 'Wolf', 'Fox', 'Tiger', 'Lion',
  'Penguin', 'Owl', 'Raccoon', 'Panda', 'Hamster', 'Capybara',
];

const ACTIONS = [
  'Moon', 'Rocket', 'Flash', 'Dash', 'Blaze', 'Storm',
  'Surge', 'Pump', 'Rise', 'Fly', 'Spin', 'Bolt',
  'Crash', 'Smash', 'Rush', 'Zoom', 'Blast', 'Wave',
];

const ADJECTIVES = [
  'Super', 'Mega', 'Ultra', 'Turbo', 'Hyper', 'Epic',
  'Chad', 'Giga', 'Alpha', 'Neon', 'Cosmic', 'Quantum',
];

const TEMPLATES = [
  '{name} is the next big meme coin on Solana. Inspired by {topic}. Join the revolution!',
  'The ultimate {topic} token on Solana. {name} is taking over crypto Twitter!',
  '{name} combines the power of {topic} with Solana speed. To the moon!',
  'Born from the viral {topic} trend, {name} is the people\'s coin on Solana.',
  '{name} - the {topic} meme coin that\'s breaking the internet. Don\'t miss out!',
];

const PLACEHOLDER_IMAGES = [
  'https://picsum.photos/seed/{seed}/200/200',
  'https://api.dicebear.com/7.x/punks/svg?seed={seed}',
  'https://api.dicebear.com/7.x/bottts/svg?seed={seed}',
];

const SENTIMENT_KEYWORDS = {
  positive: ['moon', 'pump', 'bullish', 'gem', 'launch', 'rocket', 'gain', 'breakout', 'surge', 'boom'],
  negative: ['rug', 'dump', 'crash', 'scam', 'bear', 'loss', 'down', 'rekt', 'exit', 'sell'],
};

export function buildDexScreenerUrl(mintAddress: string): string {
  if (mintAddress.startsWith(PLACEHOLDER_MINT_PREFIX)) {
    return 'https://dexscreener.com/solana';
  }
  return `https://dexscreener.com/solana/${mintAddress}`;
}

export function isPlaceholderMint(mintAddress: string): boolean {
  return mintAddress.startsWith(PLACEHOLDER_MINT_PREFIX);
}

export function generatePlaceholderMint(id: string): string {
  return `${PLACEHOLDER_MINT_PREFIX}${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase()}`;
}

export function generateId(): string {
  return `sug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateImageSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function generateImageUrl(topic: string): string {
  const template = PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
  return template.replace('{seed}', `${topic.toLowerCase()}-${generateImageSeed()}`);
}

export function generateCoinName(topic: string): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  return `${animal}${action}`;
}

export function generateTicker(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return cleaned.slice(0, 5) || 'MEME';
}

export function generateDescription(name: string, topic: string): string {
  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  return template.replace(/\{name\}/g, name).replace(/\{topic\}/g, topic);
}

export function calculateTrendingScore(params: {
  twitterEngagement: number;
  dexVolumeChange: number;
  holderCount: number;
  hoursSinceLaunch: number;
}): number {
  const twitterNorm = Math.min(params.twitterEngagement / 10000, 1) * 40;
  const volumeNorm = Math.min(params.dexVolumeChange / 200, 1) * 30;
  const holderNorm = Math.min(params.holderCount / 1000, 1) * 20;
  const recencyBonus = Math.max(0, (1 - params.hoursSinceLaunch / 168)) * 10;
  return Math.round(twitterNorm + volumeNorm + holderNorm + recencyBonus);
}

export function assessRiskLevel(params: {
  trendingScore: number;
  volumeChange: number;
  holderCount: number;
  hoursSinceLaunch: number;
}): 'Low' | 'Medium' | 'High' {
  let risk = 0;
  if (params.trendingScore < 40) risk += 2;
  else if (params.trendingScore < 70) risk += 1;
  if (params.volumeChange > 500) risk += 2;
  else if (params.volumeChange > 200) risk += 1;
  if (params.holderCount < 50) risk += 2;
  else if (params.holderCount < 200) risk += 1;
  if (params.hoursSinceLaunch < 1) risk += 1;
  if (risk >= 4) return 'High';
  if (risk >= 2) return 'Medium';
  return 'Low';
}

export function estimateLaunchCost(baseSOL: number = 0.02): number {
  return baseSOL + Math.random() * 0.01;
}

export function analyzeSentiment(texts: string[]): 'Positive' | 'Neutral' | 'Negative' {
  let positive = 0;
  let negative = 0;
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const kw of SENTIMENT_KEYWORDS.positive) {
      if (lower.includes(kw)) positive++;
    }
    for (const kw of SENTIMENT_KEYWORDS.negative) {
      if (lower.includes(kw)) negative++;
    }
  }
  if (positive > negative + 2) return 'Positive';
  if (negative > positive + 2) return 'Negative';
  return 'Neutral';
}

export function generateRationale(params: {
  topic: string;
  twitterEngagement: number;
  dexVolumeChange: number;
  holderCount: number;
  hoursSinceLaunch: number;
  trendingScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  isReal: boolean;
}): Rationale {
  const sentiment = params.isReal
    ? (['Positive', 'Neutral', 'Negative'] as const)[Math.floor(Math.random() * 3)]
    : params.trendingScore > 70 ? 'Positive' : params.trendingScore > 45 ? 'Neutral' : 'Negative';

  const liquidity: 'High' | 'Medium' | 'Low' = params.holderCount > 500
    ? 'High'
    : params.holderCount > 150
      ? 'Medium'
      : 'Low';

  const devActivity: 'Active' | 'Inactive' = params.hoursSinceLaunch < 24 ? 'Active' : 'Inactive';

  const sentimentWord = sentiment === 'Positive' ? 'bullish' : sentiment === 'Negative' ? 'cautious' : 'mixed';
  const riskWord = params.riskLevel === 'Low' ? 'lower-risk' : params.riskLevel === 'Medium' ? 'moderate-risk' : 'higher-risk';

  let verdict: string;
  if (params.isReal) {
    verdict = `This coin shows ${sentimentWord} community sentiment with ${liquidity.toLowerCase()} liquidity. Developer activity is ${devActivity.toLowerCase()}. A ${riskWord} opportunity for quick action.`;
  } else {
    verdict = `This coin is trending due to high Twitter engagement around ${params.topic}. The market is showing ${sentimentWord} sentiment, making it a ${riskWord} opportunity.`;
  }

  return {
    sentiment,
    liquidity,
    developerActivity: devActivity,
    verdict,
    breakdown: {
      twitterMentions: params.twitterEngagement,
      dexVolumeChangePct: params.dexVolumeChange,
      newHolders: params.holderCount,
      hoursSinceLaunch: params.hoursSinceLaunch,
    },
  };
}

export function buildSuggestionFromTopic(
  topic: string,
  metrics: {
    twitterEngagement: number;
    dexVolumeChange: number;
    holderCount: number;
    hoursSinceLaunch: number;
    mintAddress?: string;
  },
): MemeSuggestion {
  const name = generateCoinName(topic);
  const ticker = generateTicker(name);
  const trendingScore = calculateTrendingScore(metrics);
  const riskLevel = assessRiskLevel({
    trendingScore,
    volumeChange: metrics.dexVolumeChange,
    holderCount: metrics.holderCount,
    hoursSinceLaunch: metrics.hoursSinceLaunch,
  });
  const id = generateId();
  const mintAddress = metrics.mintAddress || generatePlaceholderMint(id);

  return {
    id,
    name,
    ticker,
    description: generateDescription(name, topic),
    imageUrl: generateImageUrl(topic),
    trendingScore,
    estimatedCostSol: estimateLaunchCost(),
    riskLevel,
    source: metrics.mintAddress ? 'dexscreener' : 'generated',
    trendingTopic: topic,
    mintAddress,
    rationale: generateRationale({
      topic,
      twitterEngagement: metrics.twitterEngagement,
      dexVolumeChange: metrics.dexVolumeChange,
      holderCount: metrics.holderCount,
      hoursSinceLaunch: metrics.hoursSinceLaunch,
      trendingScore,
      riskLevel,
      isReal: !!metrics.mintAddress,
    }),
  };
}

export function rankSuggestions(suggestions: MemeSuggestion[]): MemeSuggestion[] {
  return [...suggestions].sort((a, b) => b.trendingScore - a.trendingScore);
}

const MOCK_SCORE_BREAKDOWN: ScoreBreakdown = {
  twitterMentions: 3200,
  dexVolumeChangePct: 180,
  newHolders: 340,
  hoursSinceLaunch: 12,
};

const MOCK_RATIONALE_TEMPLATES: Rationale[] = [
  {
    sentiment: 'Positive',
    liquidity: 'Medium',
    developerActivity: 'Active',
    verdict: 'Strong community interest with growing holder base. Moderate liquidity suggests early-stage momentum. Good for a quick flip.',
    breakdown: MOCK_SCORE_BREAKDOWN,
  },
  {
    sentiment: 'Neutral',
    liquidity: 'Low',
    developerActivity: 'Inactive',
    verdict: 'High Twitter buzz but thin liquidity and low dev activity. High-risk play — could moon or dump.',
    breakdown: { ...MOCK_SCORE_BREAKDOWN, dexVolumeChangePct: 95, newHolders: 80 },
  },
  {
    sentiment: 'Positive',
    liquidity: 'High',
    developerActivity: 'Active',
    verdict: 'Excellent fundamentals: strong liquidity, active development, and positive sentiment. One of the safer bets in meme territory.',
    breakdown: { ...MOCK_SCORE_BREAKDOWN, twitterMentions: 7800, dexVolumeChangePct: 320, newHolders: 890, hoursSinceLaunch: 4 },
  },
];

export const MOCK_SUGGESTIONS: MemeSuggestion[] = [
  {
    id: 'mock-1',
    name: 'DogeMoon',
    ticker: 'DOGEM',
    description: 'DogeMoon is the next big meme coin on Solana. Inspired by the Doge community. Join the revolution!',
    imageUrl: 'https://picsum.photos/seed/dogemoon/200/200',
    trendingScore: 87,
    estimatedCostSol: 0.02,
    riskLevel: 'Medium',
    source: 'mock',
    trendingTopic: 'Doge',
    mintAddress: generatePlaceholderMint('mock-1'),
    rationale: MOCK_RATIONALE_TEMPLATES[0],
  },
  {
    id: 'mock-2',
    name: 'PepeRocket',
    ticker: 'PEPER',
    description: 'PepeRocket is the ultimate frog token on Solana. PepeRocket is taking over crypto Twitter!',
    imageUrl: 'https://picsum.photos/seed/peperocket/200/200',
    trendingScore: 92,
    estimatedCostSol: 0.02,
    riskLevel: 'High',
    source: 'mock',
    trendingTopic: 'Pepe',
    mintAddress: generatePlaceholderMint('mock-2'),
    rationale: MOCK_RATIONALE_TEMPLATES[1],
  },
  {
    id: 'mock-3',
    name: 'ShibaStorm',
    ticker: 'SHIST',
    description: 'ShibaStorm combines the power of Shib with Solana speed. To the moon!',
    imageUrl: 'https://picsum.photos/seed/shibastorm/200/200',
    trendingScore: 74,
    estimatedCostSol: 0.02,
    riskLevel: 'Medium',
    source: 'mock',
    trendingTopic: 'Shib',
    mintAddress: generatePlaceholderMint('mock-3'),
    rationale: MOCK_RATIONALE_TEMPLATES[2],
  },
  {
    id: 'mock-4',
    name: 'CatBolt',
    ticker: 'CATBT',
    description: 'Born from the viral cat meme trend, CatBolt is the people\'s coin on Solana.',
    imageUrl: 'https://picsum.photos/seed/catbolt/200/200',
    trendingScore: 68,
    estimatedCostSol: 0.02,
    riskLevel: 'Low',
    source: 'mock',
    trendingTopic: 'Cat',
    mintAddress: generatePlaceholderMint('mock-4'),
    rationale: MOCK_RATIONALE_TEMPLATES[0],
  },
  {
    id: 'mock-5',
    name: 'FrogFlash',
    ticker: 'FROGF',
    description: 'FrogFlash - the frog meme coin that\'s breaking the internet. Don\'t miss out!',
    imageUrl: 'https://picsum.photos/seed/frogflash/200/200',
    trendingScore: 81,
    estimatedCostSol: 0.02,
    riskLevel: 'High',
    source: 'mock',
    trendingTopic: 'Frog',
    mintAddress: generatePlaceholderMint('mock-5'),
    rationale: MOCK_RATIONALE_TEMPLATES[1],
  },
  {
    id: 'mock-6',
    name: 'GigaWhale',
    ticker: 'GIGAW',
    description: 'GigaWhale is the next big meme coin on Solana. Inspired by whale movements. Join the revolution!',
    imageUrl: 'https://picsum.photos/seed/gigawhale/200/200',
    trendingScore: 76,
    estimatedCostSol: 0.02,
    riskLevel: 'Medium',
    source: 'mock',
    trendingTopic: 'Whale',
    mintAddress: generatePlaceholderMint('mock-6'),
    rationale: MOCK_RATIONALE_TEMPLATES[2],
  },
  {
    id: 'mock-7',
    name: 'ChadBull',
    ticker: 'CHADB',
    description: 'ChadBull is the ultimate alpha token on Solana. ChadBull is taking over crypto Twitter!',
    imageUrl: 'https://picsum.photos/seed/chadbull/200/200',
    trendingScore: 89,
    estimatedCostSol: 0.02,
    riskLevel: 'High',
    source: 'mock',
    trendingTopic: 'Chad',
    mintAddress: generatePlaceholderMint('mock-7'),
    rationale: MOCK_RATIONALE_TEMPLATES[1],
  },
  {
    id: 'mock-8',
    name: 'NeonFox',
    ticker: 'NEONF',
    description: 'NeonFox combines the power of Neon vibes with Solana speed. To the moon!',
    imageUrl: 'https://picsum.photos/seed/neonfox/200/200',
    trendingScore: 71,
    estimatedCostSol: 0.02,
    riskLevel: 'Low',
    source: 'mock',
    trendingTopic: 'Neon',
    mintAddress: generatePlaceholderMint('mock-8'),
    rationale: MOCK_RATIONALE_TEMPLATES[0],
  },
];
