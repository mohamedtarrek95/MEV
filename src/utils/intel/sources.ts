import type { SourceId, SourceMeta } from './types';

export const SOURCES: Record<SourceId, SourceMeta> = {
  reddit: { id: 'reddit', label: 'Reddit', weight: 0.85, category: 'social' },
  telegram: { id: 'telegram', label: 'Telegram', weight: 0.8, category: 'social' },
  bluesky: { id: 'bluesky', label: 'Bluesky', weight: 0.75, category: 'social' },
  mastodon: { id: 'mastodon', label: 'Mastodon', weight: 0.7, category: 'social' },
  nitter: { id: 'nitter', label: 'Nitter', weight: 0.65, category: 'social' },
  cryptoForums: { id: 'cryptoForums', label: 'Crypto Forums', weight: 0.8, category: 'crypto' },
  discordAnnouncements: { id: 'discordAnnouncements', label: 'Discord', weight: 0.75, category: 'crypto' },
  cryptoNews: { id: 'cryptoNews', label: 'Crypto News', weight: 0.9, category: 'crypto' },
  communityBoards: { id: 'communityBoards', label: 'Community Boards', weight: 0.7, category: 'crypto' },
};

export const ALL_SOURCE_IDS: SourceId[] = Object.keys(SOURCES) as SourceId[];

export const WINDOW_HOURS = 24;
export const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;
export const REFRESH_MS = 4 * 60 * 1000;

export function sourceLabel(id: SourceId): string {
  return SOURCES[id]?.label ?? id;
}

export function sourceWeight(id: SourceId): number {
  return SOURCES[id]?.weight ?? 0.5;
}

export function sourceCategory(id: SourceId): string {
  return SOURCES[id]?.category ?? 'social';
}
