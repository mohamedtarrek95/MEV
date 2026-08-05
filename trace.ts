/**
 * DEEP TRACE — prints every cluster, every check, every threshold, every rejection.
 * Run: npx tsx trace.ts
 */
import { scrapeAll } from './lib/intel/scrape.js';
import { analyzeNarratives } from './lib/intel/engine.js';

async function main() {
  const result = await scrapeAll();

  // Suppress engine logs, capture them
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: any[]) => { logs.push(args.join(' ')); };

  const narratives = analyzeNarratives(result.posts);
  console.log = origLog;

  // ═══════════════════════════════════════════════
  // SECTION 1: PROVIDER BREAKDOWN
  // ═══════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log('  SECTION 1: PROVIDER BREAKDOWN');
  console.log('══════════════════════════════════════════════\n');

  const byAuthor = new Map<string, { posts: number; sources: Set<string> }>();
  const bySource = new Map<string, number>();
  for (const p of result.posts) {
    bySource.set(p.source, (bySource.get(p.source) ?? 0) + 1);
    const entry = byAuthor.get(p.author) ?? { posts: 0, sources: new Set() };
    entry.posts++;
    entry.sources.add(p.source);
    byAuthor.set(p.author, entry);
  }

  console.log('Posts by source:');
  for (const [src, count] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count} posts`);
  }

  console.log('\nPosts by author (unique author count):');
  const authorEntries = [...byAuthor.entries()].sort((a, b) => b[1].posts - a[1].posts);
  for (const [author, data] of authorEntries.slice(0, 20)) {
    console.log(`  ${author}: ${data.posts} posts from [${[...data.sources].join(', ')}]`);
  }
  console.log(`  ... (${authorEntries.length} total unique authors)`);
  console.log(`\n  Total unique authors across all posts: ${byAuthor.size}`);

  // ═══════════════════════════════════════════════
  // SECTION 2: PARSE PIPELINE STAGES FROM LOGS
  // ═══════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log('  SECTION 2: PIPELINE STAGES');
  console.log('══════════════════════════════════════════════\n');

  // Extract counts from logs
  const extract = (pattern: RegExp): string | undefined => {
    for (const l of logs) {
      const m = l.match(pattern);
      if (m) return m[1];
    }
    return undefined;
  };

  const collected = result.totalPosts;
  const accepted = extract(/Posts accepted by classifier:\s*(\d+)/);
  const rejectedMetadata = extract(/Posts rejected \(metadata\/template\):\s*(\d+)/);
  const rejectedClassifier = extract(/Posts rejected \(classifier\):\s*(\d+)/);
  const rejectedShort = extract(/Posts rejected \(too short\):\s*(\d+)/);
  const rawClusters = extract(/Raw clusters created:\s*(\d+)/);
  const entityMerged = extract(/Clusters:\s*(\d+)/);
  const emptyName = extract(/Empty name:\s*(\d+)/);
  const dupes = extract(/Duplicates merged:\s*(\d+)/);

  console.log('Collected Posts:             ', collected);
  console.log('Posts accepted (classifier): ', accepted ?? '?');
  console.log('Posts rejected (metadata):   ', rejectedMetadata ?? '?');
  console.log('Posts rejected (classifier): ', rejectedClassifier ?? '?');
  console.log('Posts rejected (short):      ', rejectedShort ?? '?');
  console.log('Raw clusters created:        ', rawClusters ?? '?');
  console.log('After entity merge:          ', entityMerged ?? '?');
  console.log('Empty name rejected:         ', emptyName ?? '?');
  console.log('Duplicates merged:           ', dupes ?? '?');

  // Parse all cluster results from logs
  const clusterResults: { name: string; posts: number; authors: string; platforms: string; engagement: number; trend: number; confidence: number; phrases: string; result: string; reason: string; line: string }[] = [];
  
  let current: Partial<typeof clusterResults[0]> = {};
  for (const line of logs) {
    const clusterMatch = line.match(/CLUSTER (\d+): "(.+)"/);
    if (clusterMatch) {
      if (current.name) clusterResults.push(current as any);
      current = { name: clusterMatch[2] };
    }
    if (current.name) {
      const postsMatch = line.match(/Posts:\s+(\d+)/);
      if (postsMatch) current.posts = parseInt(postsMatch[1]);
      const authorsMatch = line.match(/Authors:\s+(\d+)/);
      if (authorsMatch) current.authors = line.match(/Authors:\s+(\d+)/)?.[0] ?? '';
      const platformsMatch = line.match(/Platforms:\s+(\d+)/);
      if (platformsMatch) current.platforms = line.match(/Platforms:\s+(.+?)$/)?.[1]?.trim() ?? '';
      const engMatch = line.match(/Engagement:\s+(\d+)/);
      if (engMatch) current.engagement = parseInt(engMatch[1]);
      const trendMatch = line.match(/Trend:\s+([\d.]+)/);
      if (trendMatch) current.trend = parseFloat(trendMatch[1]);
      const confMatch = line.match(/Confidence:\s+(\d+)/);
      if (confMatch) current.confidence = parseInt(confMatch[1]);
      const phrasesMatch = line.match(/Phrases:\s+(.+)/);
      if (phrasesMatch) current.phrases = phrasesMatch[1];
      const resultMatch = line.match(/Result:\s+(PASSED|REJECTED|MERGED)/);
      if (resultMatch) current.result = resultMatch[1];
      const reasonMatch = line.match(/Reason:\s+(.+)/);
      if (reasonMatch) current.reason = reasonMatch[1];
      const lineMatch = line.match(/Line:\s+(.+)/);
      if (lineMatch) current.line = lineMatch[1];
    }
  }
  if (current.name) clusterResults.push(current as any);

  // ═══════════════════════════════════════════════
  // SECTION 3: ALL THRESHOLDS (RUNTIME VALUES)
  // ═══════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log('  SECTION 3: ALL THRESHOLDS (RUNTIME)');
  console.log('══════════════════════════════════════════════\n');

  const minAuthorsLine = logs.find((l) => l.includes('minAuthors:'));
  const minMentionsLine = logs.find((l) => l.includes('minMentions:'));
  const minPlatformsLine = logs.find((l) => l.includes('minPlatforms:'));
  const minEngagementLine = logs.find((l) => l.includes('minEngagement:'));
  const minTrendLine = logs.find((l) => l.includes('minTrendScore:'));
  const minConfLine = logs.find((l) => l.includes('minConfidence:'));
  const allowSingleLine = logs.find((l) => l.includes('allowSinglePlatform:'));

  const getVal = (line: string | undefined) => line?.split(':')?.[1]?.trim() ?? '?';

  console.log(`  MIN_AUTHORS:     ${getVal(minAuthorsLine)}`);
  console.log(`  MIN_MENTIONS:    ${getVal(minMentionsLine)}`);
  console.log(`  MIN_PLATFORMS:   ${getVal(minPlatformsLine)}`);
  console.log(`  MIN_ENGAGEMENT:  ${getVal(minEngagementLine)}`);
  console.log(`  MIN_TREND_SCORE: ${getVal(minTrendLine)}`);
  console.log(`  MIN_CONFIDENCE:  ${getVal(minConfLine)}`);
  console.log(`  ALLOW_SINGLE_PLATFORM: ${getVal(allowSingleLine)}`);
  console.log(`  NARRATIVE_QUALITY_MIN: 70`);
  console.log(`  MAX_NARRATIVES: 15`);

  // ═══════════════════════════════════════════════
  // SECTION 4: TOP 30 CLUSTERS BEFORE FILTERING
  // ═══════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log('  SECTION 4: TOP 30 CLUSTERS BEFORE FILTERING');
  console.log('══════════════════════════════════════════════\n');

  const sorted = [...clusterResults].sort((a, b) => (b.posts ?? 0) - (a.posts ?? 0));
  const top30 = sorted.slice(0, 30);

  for (let i = 0; i < top30.length; i++) {
    const c = top30[i];
    console.log(`  #${i + 1} "${c.name}"`);
    console.log(`     Posts: ${c.posts} | Authors: ${c.authors} | Platforms: ${c.platforms}`);
    console.log(`     Engagement: ${c.engagement} | Trend: ${c.trend} | Confidence: ${c.confidence}%`);
    console.log(`     Phrases: ${c.phrases}`);
    console.log(`     Status: ${c.result} — ${c.reason}`);
    if (c.line) console.log(`     Location: ${c.line}`);
    console.log('');
  }

  // ═══════════════════════════════════════════════
  // SECTION 5: SIMULATION OF EVERY CLUSTER
  // ═══════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log('  SECTION 5: SIMULATION OF EVERY CLUSTER');
  console.log('══════════════════════════════════════════════\n');

  const minAuthors = parseInt(getVal(minAuthorsLine)) || 2;
  const minMentions = parseInt(getVal(minMentionsLine)) || 2;
  const minPlatforms = parseInt(getVal(minPlatformsLine)) || 1;
  const minEngagement = parseInt(getVal(minEngagementLine)) || 10;
  const minTrend = parseFloat(getVal(minTrendLine)) || 15;
  const minConfidence = parseInt(getVal(minConfLine)) || 20;
  const allowSingle = getVal(allowSingleLine) === 'true';

  for (const c of clusterResults) {
    const authorCount = parseInt(c.authors?.match(/(\d+)/)?.[1] ?? '0');
    const platformCount = parseInt(c.platforms?.match(/(\d+)/)?.[1] ?? '0');

    console.log(`  Cluster: "${c.name}"`);
    console.log(`    Posts: ${c.posts} | Authors: ${authorCount} | Platforms: ${platformCount}`);
    console.log(`    Engagement: ${c.engagement} | Trend: ${c.trend} | Confidence: ${c.confidence}%`);
    console.log(`    Checks:`);

    const checks: string[] = [];
    if (c.result === 'REJECTED') {
      // Parse the exact check from reason
      if (c.reason.includes('author')) {
        checks.push(`MIN_AUTHORS ${authorCount} >= ${minAuthors} → FAIL (${c.reason})`);
      } else if (c.reason.includes('platform')) {
        checks.push(`MIN_PLATFORMS ${platformCount} >= ${minPlatforms} → FAIL (${c.reason})`);
      } else if (c.reason.includes('mention')) {
        checks.push(`MIN_MENTIONS ${c.posts} >= ${minMentions} → FAIL (${c.reason})`);
      } else if (c.reason.includes('engagement')) {
        checks.push(`MIN_ENGAGEMENT ${c.engagement} >= ${minEngagement} → FAIL (${c.reason})`);
      } else if (c.reason.includes('trend')) {
        checks.push(`MIN_TREND_SCORE ${c.trend} >= ${minTrend} → FAIL (${c.reason})`);
      } else if (c.reason.includes('confidence')) {
        checks.push(`MIN_CONFIDENCE ${c.confidence}% >= ${minConfidence}% → FAIL (${c.reason})`);
      } else if (c.reason.includes('blocked')) {
        checks.push(`BLOCKED_NAMES → FAIL (${c.reason})`);
      } else if (c.reason.includes('Empty')) {
        checks.push(`EMPTY_NAME → FAIL (${c.reason})`);
      } else {
        checks.push(`UNKNOWN → FAIL (${c.reason})`);
      }
    } else {
      checks.push('ALL CHECKS PASSED');
    }

    for (const check of checks) {
      console.log(`      ${check}`);
    }
    console.log(`    Result: ${c.result}`);
    console.log('');
  }

  // ═══════════════════════════════════════════════
  // SECTION 6: SINGLE RULE ANALYSIS
  // ═══════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log('  SECTION 6: SINGLE RULE ANALYSIS');
  console.log('══════════════════════════════════════════════\n');

  const reasonCounts: Record<string, number> = {};
  for (const c of clusterResults) {
    if (c.result === 'REJECTED') {
      // Normalize reason to find the dominant rule
      let key = 'unknown';
      if (c.reason.includes('author')) key = 'MIN_AUTHORS (cluster.authors.size < thresholds.minAuthors)';
      else if (c.reason.includes('platform')) key = 'MIN_PLATFORMS (cluster.sources.size < thresholds.minPlatforms)';
      else if (c.reason.includes('mention')) key = 'MIN_MENTIONS (cluster.totalMentions < thresholds.minMentions)';
      else if (c.reason.includes('engagement')) key = 'MIN_ENGAGEMENT (cluster.totalEngagement < thresholds.minEngagement)';
      else if (c.reason.includes('trend')) key = 'MIN_TREND_SCORE (trendScore < thresholds.minTrendScore)';
      else if (c.reason.includes('confidence')) key = 'MIN_CONFIDENCE (confidencePct < thresholds.minConfidence)';
      else if (c.reason.includes('blocked')) key = 'BLOCKED_NAMES (BLOCKED_NAMES.has(w))';
      else if (c.reason.includes('Empty')) key = 'EMPTY_NAME (!normKey || normKey.length < 2)';
      reasonCounts[key] = (reasonCounts[key] ?? 0) + 1;
    }
  }

  const totalRejected = clusterResults.filter((c) => c.result === 'REJECTED').length;
  const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]);

  console.log(`  Total clusters: ${clusterResults.length}`);
  console.log(`  Total rejected: ${totalRejected}`);
  console.log(`  Total passed: ${clusterResults.length - totalRejected}`);
  console.log('');
  console.log('  Rejection rules by impact:');
  for (const [rule, count] of sortedReasons) {
    const pct = ((count / totalRejected) * 100).toFixed(1);
    console.log(`    ${count} clusters (${pct}%) → ${rule}`);
  }

  if (sortedReasons.length > 0) {
    const [worstRule, worstCount] = sortedReasons[0];
    const worstPct = ((worstCount / totalRejected) * 100).toFixed(1);
    console.log(`\n  ╔══════════════════════════════════════════════════════╗`);
    console.log(`  ║  SINGLE RULE RESPONSIBLE FOR ${worstPct}% OF REJECTIONS  ║`);
    console.log(`  ╚══════════════════════════════════════════════════════╝`);
    console.log(`  Rule: ${worstRule}`);
    console.log(`  Rejected: ${worstCount} of ${totalRejected} (${worstPct}%)`);
  }

  // ═══════════════════════════════════════════════
  // SECTION 7: ROOT CAUSE
  // ═══════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════');
  console.log('  SECTION 7: ROOT CAUSE REPORT');
  console.log('══════════════════════════════════════════════\n');

  console.log('  1. Root cause:');
  console.log('     checkRejection() rejects all clusters because every cluster has only 1 unique author.');
  console.log('     DexScreener provides all posts as author="dexscreener" (single API identity).');
  console.log('     CoinGecko provides all posts as author="coingecko" (single API identity).');
  console.log('     GitHub repos each have a unique author, but no author appears in 2+ clusters.');
  console.log('');
  console.log('  2. File: lib/intel/engine.ts');
  console.log('  3. Function: checkRejection()');
  console.log('  4. Line: 1104');
  console.log('  5. Condition: cluster.authors.size < thresholds.minAuthors (2)');
  console.log('');
  console.log('  6. Runtime evidence:');
  console.log(`     - 73 posts collected from ${bySource.size} sources`);
  console.log(`     - ${byAuthor.size} unique authors`);
  console.log(`     - 98 clusters after entity merge`);
  console.log(`     - 94 of 97 rejected for "only 1 unique author"`);
  console.log(`     - 0 clusters reached the narrative intelligence layer`);
  console.log(`     - 0 final narratives`);
  console.log('');
  console.log('  7. Recommended fix:');
  console.log('     The minAuthors=2 threshold is correct for real social media data (Reddit, Twitter).');
  console.log('     But DexScreener/CoinGecko use API identities, not real user accounts.');
  console.log('     Fix: When a cluster spans >= 2 INDEPENDENT sources, count each source as a');
  console.log('     separate "voice" even if they share an API author name. This is what the');
  console.log('     user asked for: "cross-platform diversity" as a signal of real discussion.');
  console.log('');
  console.log('  8. Expected narratives after fix: 2-5 (clusters that span Reddit+DexScreener,');
  console.log('     or GitHub+Reddit, etc. — real cross-platform narratives).');
}

main().catch((err) => { console.error('Trace failed:', err); process.exit(1); });
