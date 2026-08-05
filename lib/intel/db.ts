import { createClient, type RedisClientType } from 'redis';
import type { ConceptReport } from './types.js';

const REDIS_URL = process.env.REDIS_URL;
const REPORT_KEY = 'launch:report';
const CONCEPTS_PREFIX = 'launch:concepts:';
const CONCEPTS_INDEX = 'launch:concepts:index';
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

export async function saveReport(report: ConceptReport): Promise<void> {
  if (!REDIS_URL) return;
  const c = await getClient();

  const existing = (await c.sendCommand(['ZRANGE', CONCEPTS_INDEX, '0', '-1'])) as string[];
  const pipeline = c.multi();
  pipeline.set(REPORT_KEY, JSON.stringify(report), { EX: REPORT_TTL });

  for (const id of existing) {
    pipeline.del(`${CONCEPTS_PREFIX}${id}`);
  }
  pipeline.del(CONCEPTS_INDEX);

  for (const concept of report.concepts) {
    pipeline.hSet(`${CONCEPTS_PREFIX}${concept.id}`, {
      id: concept.id,
      name: concept.name,
      ticker: concept.ticker,
      oneSentence: concept.oneSentence,
      launchScore: String(concept.launchScore),
      originality: String(concept.originality),
      virality: String(concept.virality),
      visualPotential: String(concept.visualPotential),
      storyStrength: String(concept.storyStrength),
      brandability: String(concept.brandability),
      communityPotential: String(concept.communityPotential),
      competition: String(concept.competition),
      coreJoke: concept.coreJoke,
      detectedEmotion: concept.detectedEmotion,
      mascot: concept.mascot,
      cryptoCatalyst: concept.cryptoCatalyst,
    });
    pipeline.zAdd(CONCEPTS_INDEX, { score: concept.launchScore, value: concept.id });
    pipeline.expire(`${CONCEPTS_PREFIX}${concept.id}`, REPORT_TTL);
  }
  pipeline.expire(CONCEPTS_INDEX, REPORT_TTL);

  await pipeline.exec();
  console.log(`[db] saved report: ${report.concepts.length} concepts, ${report.postsProcessed} posts`);
}

export async function loadReport(): Promise<ConceptReport | null> {
  if (!REDIS_URL) return null;
  try {
    const c = await getClient();
    const raw = await c.get(REPORT_KEY);
    if (!raw) return null;
    const report = JSON.parse(raw) as ConceptReport;
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

export async function disconnect(): Promise<void> {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
  }
}
