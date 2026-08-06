export interface EnrichedCoin {
  mint: string;
  name: string;
  ticker: string;
  image: string;
  launchTime: number;
  ageSeconds: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  volume1h: number;
  volume5m: number;
  buys24h: number;
  sells24h: number;
  buys1h: number;
  sells1h: number;
  buys5m: number;
  sells5m: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  topHolderPct: number;
  creator: string;
  creatorRugCount: number;
  creatorCoinCount: number;
  website: string;
  twitter: string;
  telegram: string;
  imageDex: string;
  pumpfunUrl: string;
  dexscreenerUrl: string;
  axiomUrl: string;
  priceChange1h: number;
  priceChange5m: number;
}

export interface NarrativeCluster {
  narrative: string;
  rootKeyword: string;
  variants: string[];
  count: number;
  firstLaunch: number;
  lastLaunch: number;
  uniqueCreators: string[];
  coins: EnrichedCoin[];
  avgMarketCap: number;
  avgVolume: number;
  avgBuyers: number;
  launchVelocity: number;
  avgLifetimeSeconds: number;
  repeatedLaunchScore: number;
  creatorDiversity: number;
}

export interface LaunchWarning {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface LaunchCoin {
  coin: EnrichedCoin;
  launchScore: number;
  probability: string;
  scoreBreakdown: {
    buyerGrowth: number;
    holderGrowth: number;
    walletDiversity: number;
    volumeScore: number;
    narrativeScore: number;
    liquidityScore: number;
    socialScore: number;
  };
  narrativeCluster: NarrativeCluster | null;
  warnings: LaunchWarning[];
  trend: 'rising' | 'stable' | 'falling' | 'new';
}

export interface NarrativeRanking {
  narrative: string;
  rootKeyword: string;
  count: number;
  uniqueCreators: number;
  variants: string[];
  avgMarketCap: number;
  avgVolume: number;
  launchVelocity: number;
  trend: 'rising' | 'stable' | 'falling' | 'new';
  coins: EnrichedCoin[];
}

export interface LaunchReport {
  generatedAt: number;
  coins: LaunchCoin[];
  narratives: NarrativeRanking[];
  totalScanned: number;
  timeWindow: string;
  providers: Array<{ name: string; sourceId: string; requests: number; collected: number; durationMs: number; lastError: string | null }>;
  diagnostics: {
    pumpfunCount: number;
    dexscreenerCount: number;
    enrichedCount: number;
    narrativeClusters: number;
    warningsFired: number;
  };
}
