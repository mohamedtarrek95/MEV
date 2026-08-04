export const SOURCE_LABELS: Record<string, string> = {
  reddit: 'Reddit',
  bluesky: 'Bluesky',
  hackerNews: 'Hacker News',
  dexscreener: 'DexScreener',
  coingecko: 'CoinGecko',
  github: 'GitHub',
  telegram: 'Telegram',
  mastodon: 'Mastodon',
  nitter: 'Nitter',
  cryptoNews: 'Crypto News',
  aiNews: 'AI News',
  gamingNews: 'Gaming News',
  techNews: 'Tech News',
  entertainmentNews: 'Entertainment News',
  memeWebsites: 'Meme Sites',
  publicForums: 'Public Forums',
};

export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const REFRESH_MS = 5 * 60 * 1000;

export function sourceLabel(id: string): string {
  return SOURCE_LABELS[id] ?? id;
}
