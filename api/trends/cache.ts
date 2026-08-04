import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TrendsReport, Tweet } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = process.env.TRENDS_CACHE_DIR || join(__dirname, '.cache');
const REPORT_FILE = join(CACHE_DIR, 'report.json');
const TWEETS_FILE = join(CACHE_DIR, 'tweets.json');

function ensureDir(): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

export async function loadTweets(): Promise<Tweet[]> {
  try {
    const raw = await readFile(TWEETS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { tweets: Tweet[]; timestamp: number };
    const windowMs = 24 * 3600 * 1000;
    if (Date.now() - parsed.timestamp > windowMs) return [];
    return parsed.tweets;
  } catch {
    return [];
  }
}

export async function saveTweets(tweets: Tweet[]): Promise<void> {
  ensureDir();
  await writeFile(TWEETS_FILE, JSON.stringify({ tweets, timestamp: Date.now() }), 'utf8');
}

export async function loadReport(): Promise<TrendsReport | null> {
  try {
    const raw = await readFile(REPORT_FILE, 'utf8');
    return JSON.parse(raw) as TrendsReport;
  } catch {
    return null;
  }
}

export async function saveReport(report: TrendsReport): Promise<void> {
  ensureDir();
  await writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
}

export function cacheFilePaths(): { report: string; tweets: string } {
  return { report: REPORT_FILE, tweets: TWEETS_FILE };
}