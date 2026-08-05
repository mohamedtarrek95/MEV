import { createAllProviders } from './providers/index.js';
import { analyzeNarratives } from './engine.js';
import { saveReport, disconnect, hasRedis } from './db.js';
import type { NarrativeReport, RawPost } from './types.js';

const REFRESH_MS = Number(process.env.INTEL_REFRESH_MS || 5 * 60 * 1000);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

async function fetchWithRetry(provider: { name: string; sourceId: string; fetch(): Promise<RawPost[]> }, attempt = 0): Promise<RawPost[]> {
  try {
    return await provider.fetch();
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.warn(`[launch-engine] ${provider.name} failed (attempt ${attempt + 1}), retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return fetchWithRetry(provider, attempt + 1);
    }
    console.error(`[launch-engine] ${provider.name} failed after ${MAX_RETRIES + 1} attempts:`, err instanceof Error ? err.message : err);
    return [];
  }
}

export async function runScan(): Promise<NarrativeReport> {
  const providers = createAllProviders();
  console.log(`[launch-engine] scanning ${providers.length} meme sources...`);

  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const posts = await fetchWithRetry(p);
      console.log(`[launch-engine] ${p.name}: ${posts.length} posts`);
      return { source: p.sourceId, posts };
    }),
  );

  const allPosts: RawPost[] = [];
  const sourcesScanned: string[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') {
      allPosts.push(...r.value.posts);
      if (r.value.posts.length > 0) sourcesScanned.push(r.value.source);
    }
  }

  console.log(`[launch-engine] total posts collected: ${allPosts.length} from ${sourcesScanned.length} sources`);

  const opportunities = analyzeNarratives(allPosts);
  console.log(`[launch-engine] analysis complete: ${opportunities.length} launch opportunities`);

  const report: NarrativeReport = {
    generatedAt: Date.now(),
    opportunities,
    postsProcessed: allPosts.length,
    sourcesScanned,
    windowHours: 24,
    diagnostics: {
      collectedPosts: allPosts.length,
      memePosts: 0,
      culturalPosts: 0,
      rejectedPosts: 0,
      phrasesExtracted: 0,
      narrativeClusters: 0,
      passedFilter: opportunities.length,
      topOpportunities: opportunities.length,
      pipelineFlow: [],
    },
  };

  if (hasRedis()) {
    await saveReport(report);
  } else {
    console.log('[launch-engine] no REDIS_URL set, skipping database save (local mode)');
  }

  return report;
}

function shutdown(signal: string) {
  console.log(`[launch-engine] received ${signal}, shutting down...`);
  void disconnect().then(() => process.exit(0));
}

export async function startWorker(): Promise<void> {
  console.log(`[launch-engine] worker starting, refresh every ${Math.round(REFRESH_MS / 60000)} min`);
  console.log(`[launch-engine] redis: ${hasRedis() ? 'connected' : 'not configured (local mode)'}`);

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await runScan().catch((err) => {
    console.error('[launch-engine] initial scan failed:', err);
  });

  setInterval(() => {
    void runScan().catch((err) => {
      console.error('[launch-engine] scan failed:', err);
    });
  }, REFRESH_MS);

  console.log('[launch-engine] worker running');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker().catch((err) => {
    console.error('[launch-engine] worker failed to start:', err);
    process.exit(1);
  });
}
