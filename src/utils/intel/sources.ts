export const SOURCE_LABELS: Record<string, string> = {
  reddit: 'Reddit',
  bluesky: 'Bluesky',
  hackerNews: 'Hacker News',
  github: 'GitHub',
  mastodon: 'Mastodon',
  lemmy: 'Lemmy',
};

export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const REFRESH_MS = 5 * 60 * 1000;

export function sourceLabel(id: string): string {
  return SOURCE_LABELS[id] ?? id;
}
