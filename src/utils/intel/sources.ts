import type { SourceId, SourceMeta } from './types';

export const SOURCES: Record<SourceId, SourceMeta> = {
  reddit:              { id: 'reddit',              label: 'Reddit',              weight: 0.85, category: 'social' },
  telegram:            { id: 'telegram',            label: 'Telegram',            weight: 0.80, category: 'social' },
  bluesky:             { id: 'bluesky',             label: 'Bluesky',             weight: 0.75, category: 'social' },
  mastodon:            { id: 'mastodon',            label: 'Mastodon',            weight: 0.70, category: 'social' },
  nitter:              { id: 'nitter',              label: 'Nitter',              weight: 0.65, category: 'social' },
  cryptoNews:          { id: 'cryptoNews',          label: 'Crypto News',          weight: 0.90, category: 'news' },
  aiNews:              { id: 'aiNews',              label: 'AI News',              weight: 0.85, category: 'news' },
  gamingNews:          { id: 'gamingNews',          label: 'Gaming News',          weight: 0.80, category: 'news' },
  techNews:            { id: 'techNews',            label: 'Tech News',            weight: 0.85, category: 'news' },
  entertainmentNews:   { id: 'entertainmentNews',   label: 'Entertainment News',   weight: 0.75, category: 'news' },
  memeWebsites:        { id: 'memeWebsites',        label: 'Meme Sites',           weight: 0.80, category: 'community' },
  publicForums:        { id: 'publicForums',        label: 'Public Forums',        weight: 0.70, category: 'community' },
};

export const ALL_SOURCE_IDS: SourceId[] = Object.keys(SOURCES) as SourceId[];

export const WINDOW_HOURS = 24;
export const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;
export const REFRESH_MS = 5 * 60 * 1000;

export function sourceLabel(id: SourceId): string {
  return SOURCES[id]?.label ?? id;
}

export function sourceWeight(id: SourceId): number {
  return SOURCES[id]?.weight ?? 0.5;
}
