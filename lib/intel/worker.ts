import { loadReport, saveReport } from './cache.js';
import { createAllProviders } from './providers/index.js';
import { analyzeNarratives } from './engine.js';
import type { IntelReport, RawPost } from './types.js';

export async function runScan(): Promise<IntelReport> {
  const providers = createAllProviders();
  console.log(`[intel] scanning ${providers.length} providers...`);

  const results = await Promise.allSettled(
    providers.map(async (p) => {
      try {
        const posts = await p.fetch();
        console.log(`[intel] ${p.name}: ${posts.length} posts`);
        return { source: p.sourceId, posts };
      } catch (err) {
        console.error(`[intel] ${p.name} failed:`, err instanceof Error ? err.message : err);
        return { source: p.sourceId, posts: [] as RawPost[] };
      }
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

  console.log(`[intel] total posts collected: ${allPosts.length}`);

  const narratives = analyzeNarratives(allPosts);

  const report: IntelReport = {
    generatedAt: Date.now(),
    narratives,
    postsProcessed: allPosts.length,
    sourcesScanned,
    windowHours: 24,
  };

  await saveReport(report);
  console.log(`[intel] scan complete: ${narratives.length} narratives from ${sourcesScanned.length} sources`);
  return report;
}

export async function startWorker(): Promise<void> {
  const intervalMs = Number(process.env.INTEL_REFRESH_MS || 5 * 60 * 1000);
  await runScan();
  setInterval(() => {
    void runScan().catch((err) => {
      console.error('[intel] worker scan failed:', err);
    });
  }, intervalMs);
  console.log(`[intel] worker running, refresh every ${Math.round(intervalMs / 60000)} min`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker().catch((err) => {
    console.error('[intel] worker failed to start:', err);
    process.exit(1);
  });
}
