import { scanLaunches } from './lib/launch/engine.js';

async function validate() {
  console.log('=== LAUNCH RADAR VALIDATION ===\n');

  const start = Date.now();
  const { report } = await scanLaunches();
  const duration = Date.now() - start;

  console.log(`Duration: ${duration}ms`);
  console.log(`Generated: ${new Date(report.generatedAt).toISOString()}`);
  console.log(`Total scanned: ${report.totalScanned}`);
  console.log(`Candidates: ${report.coins.length}`);
  console.log(`Diagnostics:`, report.diagnostics);
  console.log('');

  // Provider status
  console.log('--- Providers ---');
  for (const p of report.providers) {
    console.log(`  ${p.name}: ${p.collected} collected, ${p.durationMs}ms${p.lastError ? ` ERR: ${p.lastError}` : ''}`);
  }
  console.log('');

  // Validate fields
  console.log('--- Field Validation ---');
  if (report.coins.length > 0) {
    const c = report.coins[0];
    const required = ['mint', 'name', 'ticker', 'image', 'launchTime', 'ageSeconds', 'marketCap', 'liquidity', 'volume24h', 'buys24h', 'sells24h', 'creator', 'pumpfunUrl', 'dexscreenerUrl', 'axiomUrl'];
    for (const f of required) {
      if (!(f in c.coin)) console.log(`  MISSING: coin.${f}`);
    }
    if (c.launchScore === undefined) console.log('  MISSING: launchScore');
    if (c.probability === undefined) console.log('  MISSING: probability');
    if (c.scoreBreakdown === undefined) console.log('  MISSING: scoreBreakdown');
    if (c.warnings === undefined) console.log('  MISSING: warnings');
    if (c.trend === undefined) console.log('  MISSING: trend');
    console.log('  All required fields present');
  }
  console.log('');

  // Top 10
  console.log('--- Top 10 Candidates ---');
  for (let i = 0; i < Math.min(10, report.coins.length); i++) {
    const c = report.coins[i];
    const age = c.coin.ageSeconds < 60 ? `${Math.round(c.coin.ageSeconds)}s` : `${Math.round(c.coin.ageSeconds / 60)}m`;
    const warnStr = c.warnings.length > 0 ? ` ⚠ ${c.warnings.length} warnings` : '';
    console.log(`  #${i + 1} ${c.coin.name} (${c.coin.ticker}) | Score: ${c.launchScore} | Prob: ${c.probability} | Age: ${age} | MC: $${c.coin.marketCap.toFixed(0)}${warnStr}`);
    if (c.nameCluster && c.nameCluster.count > 1) {
      console.log(`       Repeated: ${c.nameCluster.count}x | Creators: ${c.nameCluster.uniqueCreators.length}`);
    }
  }
  console.log('');

  // Uniqueness
  const mints = report.coins.map((c) => c.coin.mint);
  const uniqueMints = new Set(mints);
  console.log(`Uniqueness: ${uniqueMints.size}/${mints.length} unique mints ${uniqueMints.size === mints.length ? '✓' : '✗ DUPLICATES!'}`);

  // Score range
  const scores = report.coins.map((c) => c.launchScore);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  console.log(`Score range: ${minScore} - ${maxScore}`);
  console.log(`All scores 0-100: ${scores.every((s) => s >= 0 && s <= 100) ? '✓' : '✗'}`);

  // Warnings
  const totalWarnings = report.coins.reduce((s, c) => s + c.warnings.length, 0);
  console.log(`Total warnings: ${totalWarnings}`);

  // Trends
  const trends = report.coins.reduce((acc, c) => { acc[c.trend] = (acc[c.trend] || 0) + 1; return acc; }, {} as Record<string, number>);
  console.log('Trends:', JSON.stringify(trends));

  console.log('\n=== VALIDATION RESULT ===');
  const pass = report.coins.length > 0 && uniqueMints.size === mints.length && scores.every((s) => s >= 0 && s <= 100);
  console.log(pass ? '✓ ALL CHECKS PASSED' : '✗ SOME CHECKS FAILED');

  process.exit(pass ? 0 : 1);
}

validate().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
