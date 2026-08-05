/**
 * Provider diagnostics — tests each provider independently, prints exact rejection reasons.
 * Run: npx tsx diagnose-providers.ts
 */
import { RedditProvider } from './lib/intel/providers/reddit.js';
import { BlueskyProvider } from './lib/intel/providers/bluesky.js';
import { HackerNewsProvider } from './lib/intel/providers/hackernews.js';
import { DexScreenerProvider } from './lib/intel/providers/dexscreener.js';
import { CoinGeckoProvider } from './lib/intel/providers/coingecko.js';
import { GitHubProvider } from './lib/intel/providers/github.js';
import { MastodonProvider } from './lib/intel/providers/mastodon.js';
import { LemmyProvider } from './lib/intel/providers/lemmy.js';
import type { RawPost } from './lib/intel/types.js';

const ONE_DAY_AGO = Date.now() - 24 * 3600 * 1000;

function diagnosePost(p: RawPost): { accepted: boolean; reason: string } {
  if (!p.body || !p.body.trim()) return { accepted: false, reason: 'body is empty' };
  if (p.body.trim().length <= 5) return { accepted: false, reason: `body too short (${p.body.trim().length} chars): "${p.body.trim()}"` };
  if (p.timestamp <= ONE_DAY_AGO) return { accepted: false, reason: `timestamp older than 24h: ${new Date(p.timestamp).toISOString()}` };
  return { accepted: true, reason: '' };
}

async function testProvider(name: string, provider: { fetch(): Promise<RawPost[]> }) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'═'.repeat(60)}`);

  const start = Date.now();
  let posts: RawPost[] = [];
  let error: string | null = null;
  try {
    posts = await provider.fetch();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  const duration = Date.now() - start;

  if (error) {
    console.log(`  ERROR: ${error}`);
    console.log(`  Duration: ${duration}ms`);
    return;
  }

  console.log(`  Fetched: ${posts.length} posts`);
  console.log(`  Duration: ${duration}ms`);

  if (posts.length === 0) {
    console.log(`  REASON: Provider returned 0 posts (API may be rate-limited, blocked, or empty)`);
    return;
  }

  // Analyze each post
  let accepted = 0;
  let rejected = 0;
  const rejectReasons: Record<string, number> = {};
  const authorSet = new Set<string>();

  for (const p of posts) {
    authorSet.add(p.author);
    const result = diagnosePost(p);
    if (result.accepted) {
      accepted++;
    } else {
      rejected++;
      rejectReasons[result.reason] = (rejectReasons[result.reason] ?? 0) + 1;
    }
  }

  console.log(`  Authors: ${authorSet.size} unique (${[...authorSet].slice(0, 5).join(', ')}${authorSet.size > 5 ? '...' : ''})`);
  console.log(`  Accepted: ${accepted}`);
  console.log(`  Rejected: ${rejected}`);

  if (Object.keys(rejectReasons).length > 0) {
    console.log(`  Rejection reasons:`);
    for (const [reason, count] of Object.entries(rejectReasons).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${count}x: ${reason}`);
    }
  }

  // Show sample posts
  console.log(`  Sample posts (first 3):`);
  for (const p of posts.slice(0, 3)) {
    const r = diagnosePost(p);
    console.log(`    [${r.accepted ? '✓' : '✗'}] author="${p.author}" body="${p.body.slice(0, 80)}..." timestamp=${new Date(p.timestamp).toISOString()}`);
  }
}

async function main() {
  console.log('PROVIDER DIAGNOSTICS\n');

  await testProvider('Reddit', new RedditProvider());
  await testProvider('Bluesky', new BlueskyProvider());
  await testProvider('Hacker News', new HackerNewsProvider());
  await testProvider('DexScreener', new DexScreenerProvider());
  await testProvider('CoinGecko', new CoinGeckoProvider());
  await testProvider('GitHub', new GitHubProvider());
  await testProvider('Mastodon', new MastodonProvider());
  await testProvider('Lemmy', new LemmyProvider());
}

main().catch(console.error);
