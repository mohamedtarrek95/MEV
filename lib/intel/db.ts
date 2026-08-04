import { createClient, type RedisClientType } from 'redis';
import type { IntelReport } from './types.js';

const REDIS_URL = process.env.REDIS_URL;
const REPORT_KEY = 'intel:report';
const NARRATIVES_PREFIX = 'intel:narratives:';
const NARRATIVES_INDEX = 'intel:narratives:index';
const RAW_POSTS_KEY = 'intel:raw-posts';
const REPORT_TTL = 24 * 60 * 60;

let client: RedisClientType | null = null;

export function hasRedis(): boolean {
  return !!REDIS_URL;
}

async function getClient(): Promise<RedisClientType> {
  if (client && client.isOpen) return client;
  client = createClient({
    url: REDIS_URL!,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
      connectTimeout: 10_000,
    },
  });
  client.on('error', (err) => console.error('[db] redis error:', err.message));
  await client.connect();
  return client;
}

export async function saveReport(report: IntelReport): Promise<void> {
  if (!REDIS_URL) return;
  const c = await getClient();

  const existing = (await c.sendCommand(['ZRANGE', NARRATIVES_INDEX, '0', '-1'])) as string[];
  const pipeline = c.multi();
  pipeline.set(REPORT_KEY, JSON.stringify(report), { EX: REPORT_TTL });

  for (const id of existing) {
    pipeline.del(`${NARRATIVES_PREFIX}${id}`);
  }
  pipeline.del(NARRATIVES_INDEX);

  for (const n of report.narratives) {
    pipeline.hSet(`${NARRATIVES_PREFIX}${n.id}`, {
      id: n.id,
      narrative: n.narrative,
      trendScore: String(n.trendScore),
      mentionCount: String(n.mentionCount),
      growthPct: String(n.growthPct),
      uniqueAuthors: String(n.uniqueAuthors),
      sourcesFound: JSON.stringify(n.sourcesFound),
      sourceCount: String(n.sourceCount),
      firstDetected: String(n.firstDetected),
      lastSeen: String(n.lastSeen),
      confidencePct: String(n.confidencePct),
      reason: n.reason,
      evidence: JSON.stringify(n.evidence),
      category: n.category,
      topPostTitles: JSON.stringify(n.topPostTitles),
    });
    pipeline.zAdd(NARRATIVES_INDEX, { score: n.trendScore, value: n.id });
    pipeline.expire(`${NARRATIVES_PREFIX}${n.id}`, REPORT_TTL);
  }
  pipeline.expire(NARRATIVES_INDEX, REPORT_TTL);

  if (report.postsProcessed > 0) {
    pipeline.set(RAW_POSTS_KEY, JSON.stringify({
      count: report.postsProcessed,
      sources: report.sourcesScanned,
    }), { EX: REPORT_TTL });
  }

  await pipeline.exec();
  console.log(`[db] saved report: ${report.narratives.length} narratives, ${report.postsProcessed} posts`);
}

export async function loadReport(): Promise<IntelReport | null> {
  if (!REDIS_URL) return null;
  try {
    const c = await getClient();
    const raw = await c.get(REPORT_KEY);
    if (!raw) return null;
    const report = JSON.parse(raw) as IntelReport;
    if (Date.now() - report.generatedAt > REPORT_TTL * 1000) return null;
    return report;
  } catch (err) {
    console.error('[db] loadReport failed:', err);
    return null;
  }
}

export async function healthCheck(): Promise<boolean> {
  if (!REDIS_URL) return false;
  try {
    const c = await getClient();
    const pong = await c.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

export async function cleanup(): Promise<void> {
  if (!REDIS_URL) return;
  try {
    const c = await getClient();
    const found = (await c.sendCommand(['SCAN', '0', 'MATCH', `${NARRATIVES_PREFIX}*`, 'COUNT', '200'])) as [string, string[]];
    const keys = found[1] || [];
    for (const key of keys) {
      const ttl = (await c.sendCommand(['TTL', key])) as number;
      if (ttl === -1) await c.del(key);
    }
  } catch { /* best effort */ }
}

export async function disconnect(): Promise<void> {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
  }
}
