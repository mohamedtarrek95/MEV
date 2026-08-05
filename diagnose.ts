/**
 * Diagnostic script — traces every pipeline stage with counts.
 * Run: npx tsx diagnose.ts
 * Does NOT modify any engine code — only captures console output.
 */
import { scrapeAll } from './lib/intel/scrape.js';
import { analyzeNarratives } from './lib/intel/engine.js';

async function main() {
  console.log('\n========== PIPELINE DIAGNOSTIC ==========\n');

  console.log('[diag] Scraping all providers...');
  const result = await scrapeAll();
  console.log(`[diag] Scrape complete: ${result.totalPosts} posts collected\n`);

  // Capture all console.log output from analyzeNarratives
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: any[]) => {
    logs.push(args.join(' '));
    origLog(...args);
  };

  const narratives = analyzeNarratives(result.posts);

  // Restore
  console.log = origLog;

  // Print a clean pipeline summary
  console.log('\n========== PIPELINE STAGE COUNTS ==========\n');

  // Find key lines in the logs
  const findLog = (pattern: RegExp) => logs.find((l) => pattern.test(l));

  const collectedLine = findLog(/^.*Total:\s+\d+/m);
  const acceptedLine = findLog(/Posts accepted by classifier/);
  const rawClustersLine = findLog(/Raw clusters created/);
  const entityMergedLine = findLog(/After entity merge.*Clusters:/i) ?? findLog(/Clusters:\s+\d+\s*$/m);
  const emptyNameLine = findLog(/Empty name/);
  const dupLine = findLog(/Duplicates merged/);

  // Find rejection breakdown
  const rejectLines = logs.filter((l) => /^\s+\d+\s*→/.test(l));

  // Find narrative intelligence
  const intelPassedLine = findLog(/Passed:\s+\d+/);
  const intelRejectedLine = findLog(/Rejected:\s+\d+/);

  console.log('Posts collected:           ', result.totalPosts);
  console.log('Posts accepted (classifier):', acceptedLine?.match(/accepted by classifier:\s+(\d+)/)?.[1] ?? '?');
  console.log('Raw clusters created:       ', rawClustersLine?.match(/Raw clusters created:\s+(\d+)/)?.[1] ?? '?');
  console.log('Clusters after entity merge:', entityMergedLine?.match(/Clusters:\s+(\d+)/)?.[1] ?? '?');
  console.log('Empty name rejected:        ', emptyNameLine?.match(/Empty name:\s+(\d+)/)?.[1] ?? '?');
  console.log('Duplicates merged:          ', dupLine?.match(/Duplicates merged:\s+(\d+)/)?.[1] ?? '?');
  console.log('');

  console.log('--- Rejection Breakdown (Stage 4: checkRejection) ---');
  for (const line of rejectLines) {
    console.log('  ', line.trim());
  }
  console.log('');

  console.log('--- Narrative Intelligence Layer (Stage 6) ---');
  console.log('Passed:  ', intelPassedLine?.match(/Passed:\s+(\d+)/)?.[1] ?? '?');
  console.log('Rejected:', intelRejectedLine?.match(/Rejected:\s+(\d+)/)?.[1] ?? '?');
  console.log('');

  // Find each cluster's narrative intelligence result
  const clusterIntelLines: string[] = [];
  let inClusterSection = false;
  for (const line of logs) {
    if (line.includes('NARRATIVE INTELLIGENCE LAYER')) {
      inClusterSection = true;
      continue;
    }
    if (inClusterSection && line.includes('CLUSTER') && line.includes('Result:')) {
      clusterIntelLines.push(line.trim());
    }
    if (inClusterSection && (line.includes('Passed:') || line.includes('REJECTED') || line.includes('PASSED'))) {
      if (line.includes('Result:')) clusterIntelLines.push(line.trim());
    }
  }

  // Find all "Result:" lines from the NARRATIVE INTELLIGENCE section
  let inIntelSection = false;
  const intelResults: string[] = [];
  for (const line of logs) {
    if (line.includes('NARRATIVE INTELLIGENCE LAYER')) {
      inIntelSection = true;
      continue;
    }
    if (inIntelSection && line.includes('Result:')) {
      intelResults.push(line.trim());
    }
    if (inIntelSection && line.startsWith('════')) {
      inIntelSection = false;
    }
  }

  console.log('--- Per-Cluster Narrative Intelligence Results ---');
  for (const r of intelResults) {
    console.log('  ', r);
  }
  console.log('');

  console.log('--- Final Narratives Returned ---');
  console.log('Count:', narratives.length);
  if (narratives.length > 0) {
    for (const n of narratives) {
      console.log(`  #${n.narrative} — Quality: ${n.qualityScore} — ${n.narrativeWhy}`);
    }
  }
  console.log('');

  // Print the "WHY ZERO NARRATIVES" section if present
  const whyZeroStart = logs.findIndex((l) => l.includes('WHY ZERO NARRATIVES'));
  if (whyZeroStart >= 0) {
    console.log('========== WHY ZERO NARRATIVES ==========');
    for (let i = whyZeroStart + 1; i < logs.length; i++) {
      if (logs[i].startsWith('════')) break;
      console.log(logs[i]);
    }
  }

  console.log('\n========== END DIAGNOSTIC ==========\n');
}

main().catch((err) => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});
