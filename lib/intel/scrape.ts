import { createAllProviders } from './providers/index.js';
import { analyzeNarratives } from './engine.js';
import type { IntelReport, RawPost, ITrendProvider } from './types.js';

export interface ProviderStatus {
  name: string;
  sourceId: string;
  requests: number;
  collectedPosts: number;
  acceptedPosts: number;
  rejectedPosts: number;
  httpStatus: number | null;
  lastSuccess: number | null;
  lastError: string | null;
  durationMs: number;
}

export interface ScrapeResult {
  posts: RawPost[];
  report: IntelReport | null;
  providers: ProviderStatus[];
  totalPosts: number;
  totalAccepted: number;
  totalRejected: number;
  scrapedAt: number;
  durationMs: number;
}

const FETCH_TIMEOUT_MS = 8_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1_500;

async function fetchProvider(provider: ITrendProvider): Promise<{ posts: RawPost[]; status: ProviderStatus }> {
  const status: ProviderStatus = {
    name: provider.name,
    sourceId: provider.sourceId,
    requests: 0,
    collectedPosts: 0,
    acceptedPosts: 0,
    rejectedPosts: 0,
    httpStatus: null,
    lastSuccess: null,
    lastError: null,
    durationMs: 0,
  };

  const start = Date.now();
  const timeoutMs = provider.timeoutMs ?? FETCH_TIMEOUT_MS;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    status.requests++;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const posts = await Promise.race([
        provider.fetch(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => reject(new Error(`Timeout after ${timeoutMs}ms`)));
        }),
      ]);

      clearTimeout(timer);

      const now = Date.now();
      const oneDayAgo = now - 24 * 3600 * 1000;

      status.collectedPosts = posts.length;
      const valid = posts.filter((p) => p.body && p.body.trim().length > 5 && p.timestamp > oneDayAgo);
      status.acceptedPosts = valid.length;
      status.rejectedPosts = posts.length - valid.length;
      status.httpStatus = 200;
      status.lastSuccess = now;
      status.durationMs = now - start;

      console.log(
        `[scrape] ✓ ${provider.name}: ${status.collectedPosts} collected, ${status.acceptedPosts} accepted, ${status.rejectedPosts} rejected (${status.durationMs}ms)`,
      );

      return { posts: valid, status };
    } catch (err) {
      status.lastError = err instanceof Error ? err.message : String(err);
      status.httpStatus = null;
      console.error(
        `[scrape] ✗ ${provider.name} attempt ${attempt + 1}: ${status.lastError}`,
      );

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }

  status.durationMs = Date.now() - start;
  console.log(
    `[scrape] ✗ ${provider.name}: FAILED after ${status.requests} requests — ${status.lastError}`,
  );
  return { posts: [], status };
}

export async function scrapeAll(): Promise<ScrapeResult> {
  const overallStart = Date.now();
  const providers = createAllProviders();
  console.log(`[scrape] starting scan of ${providers.length} providers...`);

  const results = await Promise.allSettled(providers.map((p) => fetchProvider(p)));

  const allPosts: RawPost[] = [];
  const providerStatuses: ProviderStatus[] = [];
  let totalCollected = 0;
  let totalAccepted = 0;
  let totalRejected = 0;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      allPosts.push(...r.value.posts);
      providerStatuses.push(r.value.status);
      totalCollected += r.value.status.collectedPosts;
      totalAccepted += r.value.status.acceptedPosts;
      totalRejected += r.value.status.rejectedPosts;
    }
  }

  const narratives = analyzeNarratives(allPosts);
  const now = Date.now();

  const report: IntelReport = {
    generatedAt: now,
    narratives,
    postsProcessed: allPosts.length,
    sourcesScanned: providerStatuses.filter((s) => s.acceptedPosts > 0).map((s) => s.sourceId),
    windowHours: 24,
  };

  const durationMs = now - overallStart;
  console.log(
    `[scrape] complete: ${allPosts.length} posts, ${narratives.length} narratives, ${durationMs}ms total`,
  );
  for (const s of providerStatuses) {
    console.log(
      `[scrape]   ${s.name}: requests=${s.requests} collected=${s.collectedPosts} accepted=${s.acceptedPosts} rejected=${s.rejectedPosts} http=${s.httpStatus ?? 'N/A'} duration=${s.durationMs}ms${s.lastError ? ` error="${s.lastError}"` : ''}`,
    );
  }

  return {
    posts: allPosts,
    report,
    providers: providerStatuses,
    totalPosts: allPosts.length,
    totalAccepted,
    totalRejected,
    scrapedAt: now,
    durationMs,
  };
}
