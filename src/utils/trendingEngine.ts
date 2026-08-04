export interface TrendingCoin {
  id: string;
  name: string;
  ticker: string;
  description: string;
  imageUrl: string;
  mintAddress: string;
  trendingScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  rationale: string;
  quickStats: {
    mentionsLastHour: number;
    volumeChangePct: number;
    ageHours: number;
  };
  source: 'twitter' | 'dexscreener' | 'pumpfun' | 'fallback' | 'merged';
  isLaunched: boolean;
}

export interface RawTwitterData {
  keyword: string;
  mentionCount: number;
  engagement: number;
}

export interface RawDexToken {
  symbol: string;
  name: string;
  address: string;
  chainId: string;
  volumeChange24h: number;
  holders: number;
  pairAge: number;
}

export interface RawPumpToken {
  name: string;
  symbol: string;
  mint: string;
  volume5m: number;
  ageMinutes: number;
}

const AXIOM_BASE = 'https://axiom.trade/?token=';

const RATIONALE_TEMPLATES = [
  'Trending due to {mentions} Twitter mentions in the last hour with {volume}% volume surge. Community momentum is strong.',
  'High social buzz with {mentions} mentions and {volume}% volume increase. The {age}h-old coin is gaining rapid traction.',
  'Viral across crypto Twitter with {mentions} recent mentions. Volume up {volume}% in 24h — classic early-stage pump pattern.',
  'Strong social signal: {mentions} mentions/hour. {volume}% volume spike indicates growing buyer interest.',
  'Rapidly gaining attention with {mentions} hourly mentions and {volume}% volume growth. Age: {age}h.',
];

const FALLBACK_IMAGES = [
  'https://picsum.photos/seed/{seed}/200/200',
  'https://api.dicebear.com/7.x/bottts/svg?seed={seed}',
];

function pickImage(seed: string): string {
  const tpl = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
  return tpl.replace('{seed}', seed.toLowerCase());
}

function generateId(): string {
  return `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildAxiomUrl(mintAddress: string): string {
  return `${AXIOM_BASE}${mintAddress}`;
}

export function isLaunched(mintAddress: string): boolean {
  if (!mintAddress) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mintAddress);
}

export function calculateScore(params: {
  twitterMentions: number;
  dexVolumeChangePct: number;
  pumpVolume5m: number;
  ageHours: number;
}): number {
  const twitterNorm = Math.min(params.twitterMentions / 500, 1) * 40;
  const volumeNorm = Math.min(params.dexVolumeChangePct / 500, 1) * 30;
  const pumpNorm = Math.min(params.pumpVolume5m / 10000, 1) * 20;
  const ageBonus = Math.max(0, (1 - Math.min(params.ageHours, 72) / 72)) * 10;
  return Math.round((twitterNorm + volumeNorm + pumpNorm + ageBonus) * 10) / 10;
}

export function assessRisk(score: number, volumeChange: number): 'Low' | 'Medium' | 'High' {
  let risk = 0;
  if (score < 30) risk += 2;
  else if (score < 60) risk += 1;
  if (volumeChange > 500) risk += 2;
  else if (volumeChange > 200) risk += 1;
  if (risk >= 3) return 'High';
  if (risk >= 1) return 'Medium';
  return 'Low';
}

export function generateRationale(params: {
  mentions: number;
  volume: number;
  age: number;
}): string {
  const tpl = RATIONALE_TEMPLATES[Math.floor(Math.random() * RATIONALE_TEMPLATES.length)];
  return tpl
    .replace('{mentions}', String(params.mentions))
    .replace('{volume}', String(params.volume))
    .replace('{age}', String(Math.round(params.age)));
}

export function buildTrendingCoin(params: {
  name: string;
  ticker: string;
  mintAddress: string;
  imageUrl?: string;
  twitterMentions: number;
  dexVolumeChangePct: number;
  pumpVolume5m: number;
  ageHours: number;
  source: TrendingCoin['source'];
}): TrendingCoin {
  const score = calculateScore({
    twitterMentions: params.twitterMentions,
    dexVolumeChangePct: params.dexVolumeChangePct,
    pumpVolume5m: params.pumpVolume5m,
    ageHours: params.ageHours,
  });

  return {
    id: generateId(),
    name: params.name,
    ticker: params.ticker.toUpperCase().slice(0, 10),
    description: `${params.name} is trending across social and on-chain data. Score: ${score.toFixed(1)}/100.`,
    imageUrl: params.imageUrl || pickImage(params.name),
    mintAddress: params.mintAddress,
    trendingScore: score,
    riskLevel: assessRisk(score, params.dexVolumeChangePct),
    rationale: generateRationale({
      mentions: params.twitterMentions,
      volume: params.dexVolumeChangePct,
      age: params.ageHours,
    }),
    quickStats: {
      mentionsLastHour: params.twitterMentions,
      volumeChangePct: params.dexVolumeChangePct,
      ageHours: params.ageHours,
    },
    source: params.source,
    isLaunched: isLaunched(params.mintAddress),
  };
}

export function rankAndSlice(coins: TrendingCoin[], max = 10): TrendingCoin[] {
  return [...coins].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, max);
}
