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
  },
];

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

export function buildSuggestionFromTopic(
  topic: string,
  metrics: {
    twitterEngagement: number;
    dexVolumeChange: number;
    holderCount: number;
    hoursSinceLaunch: number;
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

  return {
    id: generateId(),
    name,
    ticker,
    description: generateDescription(name, topic),
    imageUrl: generateImageUrl(topic),
    trendingScore,
    estimatedCostSol: estimateLaunchCost(),
    riskLevel,
    source: 'generated',
    trendingTopic: topic,
  };
}

export function rankSuggestions(suggestions: MemeSuggestion[]): MemeSuggestion[] {
  return [...suggestions].sort((a, b) => b.trendingScore - a.trendingScore);
}
