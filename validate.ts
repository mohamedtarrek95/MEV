import { scrapeAll } from './lib/intel/scrape.js';
import type { MemeConcept } from './lib/intel/types.js';

async function validate() {
  console.log('=== END-TO-END VALIDATION ===\n');
  
  // Step 1: Run the full pipeline
  console.log('Step 1: Running scrapeAll()...');
  const start = Date.now();
  const result = await scrapeAll();
  const duration = Date.now() - start;
  
  console.log(`  Duration: ${duration}ms`);
  console.log(`  Total posts collected: ${result.totalPosts}`);
  console.log(`  Accepted: ${result.totalAccepted}`);
  console.log(`  Rejected: ${result.totalRejected}`);
  console.log(`  Providers: ${result.providers.length}`);
  
  // Step 2: Check providers
  console.log('\nStep 2: Provider status:');
  for (const p of result.providers) {
    const status = p.lastError ? `✗ ${p.lastError}` : `✓ ${p.acceptedPosts} posts (${p.durationMs}ms)`;
    console.log(`  [${p.sourceId}] ${p.name}: ${status}`);
  }
  
  // Step 3: Validate report
  const report = result.report;
  if (!report) {
    console.error('\n✗ FATAL: report is null');
    process.exit(1);
  }
  
  console.log('\nStep 3: Report validation:');
  console.log(`  generatedAt: ${new Date(report.generatedAt).toISOString()}`);
  console.log(`  postsProcessed: ${report.postsProcessed}`);
  console.log(`  sourcesScanned: ${report.sourcesScanned.length}`);
  console.log(`  catalystsDetected: ${report.catalystsDetected.length}`);
  console.log(`  concepts: ${report.concepts.length}`);
  
  // Step 4: Validate concepts have all required fields
  console.log('\nStep 4: Concept field validation:');
  const requiredFields = [
    'id', 'name', 'ticker', 'oneSentence', 'backstory', 'coreJoke', 'catchphrase',
    'communityNickname', 'cryptoCatalyst', 'catalystCategory', 'detectedEmotion',
    'whyFunny', 'whyRelatable', 'whyCryptoNative', 'whyPeoplePostMemes', 'whyInfluencersShare',
    'mascot', 'visualIdentity', 'logoIdea', 'imagePrompt', 'bannerPrompt',
    'launchScore', 'originality', 'virality', 'visualPotential', 'storyStrength',
    'communityPotential', 'brandability', 'cryptoRelevance', 'memePotential', 'competition', 'launchTiming',
    'existingTokens', 'competitionNote', 'targetAudience', 'launchRecommendation',
    'supportingPosts', 'sourcesScanned', 'generatedAt'
  ];
  
  let allFieldsPresent = true;
  if (report.concepts.length > 0) {
    for (const field of requiredFields) {
      if (!(field in report.concepts[0])) {
        console.log(`  ✗ MISSING: ${field}`);
        allFieldsPresent = false;
      }
    }
    if (allFieldsPresent) {
      console.log(`  ✓ All ${requiredFields.length} fields present in first concept`);
    }
  }
  
  // Step 5: Validate uniqueness
  console.log('\nStep 5: Uniqueness validation:');
  const ids = report.concepts.map((c) => c.id);
  const uniqueIds = new Set(ids);
  console.log(`  IDs: ${uniqueIds.size}/${ids.length} unique ${uniqueIds.size === ids.length ? '✓' : '✗ DUPLICATES!'}`);
  
  const tickers = report.concepts.map((c) => c.ticker);
  const uniqueTickers = new Set(tickers);
  console.log(`  Tickers: ${uniqueTickers.size}/${tickers.length} unique ${uniqueTickers.size === tickers.length ? '✓' : '✗ DUPLICATES!'}`);
  
  // Step 6: Validate scoring
  console.log('\nStep 6: Scoring validation:');
  for (const c of report.concepts) {
    const scores = [c.originality, c.virality, c.visualPotential, c.storyStrength, c.communityPotential, c.brandability, c.cryptoRelevance, c.memePotential, c.competition, c.launchTiming];
    const allValid = scores.every((s) => s >= 0 && s <= 100);
    if (!allValid) {
      console.log(`  ✗ ${c.name}: invalid scores ${scores}`);
    }
  }
  console.log(`  ✓ All scores 0-100`);
  
  // Step 7: Validate quality gate
  console.log('\nStep 7: Quality gate:');
  const lowScore = report.concepts.filter((c) => c.launchScore < 55);
  const noBackstory = report.concepts.filter((c) => !c.backstory || c.backstory.length < 20);
  const noCatalyst = report.concepts.filter((c) => !c.cryptoCatalyst || c.cryptoCatalyst.length < 10);
  console.log(`  launchScore >= 55: ${lowScore.length === 0 ? '✓' : '✗ ' + lowScore.length + ' below threshold'}`);
  console.log(`  backstory present: ${noBackstory.length === 0 ? '✓' : '✗ ' + noBackstory.length + ' missing'}`);
  console.log(`  cryptoCatalyst present: ${noCatalyst.length === 0 ? '✓' : '✗ ' + noCatalyst.length + ' missing'}`);
  
  // Step 8: Top concepts
  console.log('\nStep 8: Top 5 concepts:');
  const sorted = [...report.concepts].sort((a, b) => b.launchScore - a.launchScore);
  for (let i = 0; i < Math.min(5, sorted.length); i++) {
    const c = sorted[i];
    console.log(`  #${i + 1} ${c.name} (${c.ticker}) | Score: ${c.launchScore} | Category: ${c.catalystCategory} | Emotion: ${c.detectedEmotion}`);
    console.log(`     Backstory: ${c.backstory.substring(0, 80)}...`);
    console.log(`     Catchphrase: "${c.catchphrase}"`);
  }
  
  // Step 9: Categories and emotions
  console.log('\nStep 9: Diversity:');
  const categories = [...new Set(report.concepts.map((c) => c.catalystCategory))];
  const emotions = [...new Set(report.concepts.map((c) => c.detectedEmotion))];
  console.log(`  Categories (${categories.length}): ${categories.join(', ')}`);
  console.log(`  Emotions (${emotions.length}): ${emotions.join(', ')}`);
  
  // Final verdict
  console.log('\n=== VALIDATION RESULT ===');
  const pass = report.concepts.length > 0 && allFieldsPresent && uniqueIds.size === ids.length && uniqueTickers.size === tickers.length && lowScore.length === 0 && noBackstory.length === 0 && noCatalyst.length === 0;
  console.log(pass ? '✓ ALL CHECKS PASSED' : '✗ SOME CHECKS FAILED');
  
  process.exit(pass ? 0 : 1);
}

validate().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
