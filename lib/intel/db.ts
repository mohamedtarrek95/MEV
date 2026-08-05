import { createClient, type RedisClientType } from 'redis';
import type { NarrativeReport } from './types.js';

const REDIS_URL = process.env.REDIS_URL;
const REPORT_KEY = 'launch:report';
const OPPORTUNITIES_PREFIX = 'launch:opportunities:';
const OPPORTUNITIES_INDEX = 'launch:opportunities:index';
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

export async function saveReport(report: NarrativeReport): Promise<void> {
  if (!REDIS_URL) return;
  const c = await getClient();

  const existing = (await c.sendCommand(['ZRANGE', OPPORTUNITIES_INDEX, '0', '-1'])) as string[];
  const pipeline = c.multi();
  pipeline.set(REPORT_KEY, JSON.stringify(report), { EX: REPORT_TTL });

  for (const id of existing) {
    pipeline.del(`${OPPORTUNITIES_PREFIX}${id}`);
  }
  pipeline.del(OPPORTUNITIES_INDEX);

  for (const opp of report.opportunities) {
    pipeline.hSet(`${OPPORTUNITIES_PREFIX}${opp.id}`, {
      id: opp.id,
      narrative: opp.narrative,
      canonicalEntity: opp.canonicalEntity,
      launchScore: String(opp.launchScore),
      viralityScore: String(opp.viralityScore),
      memeStrength: String(opp.memeStrength),
      growthVelocity: String(opp.growthVelocity),
      communityDiversity: String(opp.communityDiversity),
      crossPlatformSpread: String(opp.crossPlatformSpread),
      originalityScore: String(opp.originalityScore),
      mentionCount: String(opp.mentionCount),
      uniqueAuthors: String(opp.uniqueAuthors),
      sourcesFound: JSON.stringify(opp.sourcesFound),
      sourceCount: String(opp.sourceCount),
      firstDetected: String(opp.firstDetected),
      lastSeen: String(opp.lastSeen),
      momentum: String(opp.momentum),
      imagePotential: String(opp.imagePotential),
      brandability: String(opp.brandability),
      mascotPotential: String(opp.mascotPotential),
      tickerQuality: String(opp.tickerQuality),
      launchProbability: String(opp.launchProbability),
      reason: opp.reason,
      whySelected: opp.whySelected,
      evidence: JSON.stringify(opp.evidence),
      category: opp.category,
      competition: JSON.stringify(opp.competition),
      topPostTitles: JSON.stringify(opp.topPostTitles),
      aliases: JSON.stringify(opp.aliases),
    });
    pipeline.zAdd(OPPORTUNITIES_INDEX, { score: opp.launchScore, value: opp.id });
    pipeline.expire(`${OPPORTUNITIES_PREFIX}${opp.id}`, REPORT_TTL);
  }
  pipeline.expire(OPPORTUNITIES_INDEX, REPORT_TTL);

  await pipeline.exec();
  console.log(`[db] saved report: ${report.opportunities.length} opportunities, ${report.postsProcessed} posts`);
}

export async function loadReport(): Promise<NarrativeReport | null> {
  if (!REDIS_URL) return null;
  try {
    const c = await getClient();
    const raw = await c.get(REPORT_KEY);
    if (!raw) return null;
    const report = JSON.parse(raw) as NarrativeReport;
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
