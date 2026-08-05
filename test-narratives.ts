import { createAllProviders } from './lib/intel/providers/index.js';
import { analyzeNarratives } from './lib/intel/engine.js';

async function main() {
  const providers = createAllProviders();
  const allPosts = [];
  for (const p of providers) {
    try {
      const posts = await Promise.race([
        p.fetch(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), p.timeoutMs ?? 12000)),
      ]);
      allPosts.push(...posts);
      console.log(`${p.name}: ${posts.length} posts`);
    } catch (e) {
      console.log(`${p.name}: ERROR ${(e as Error).message}`);
    }
  }
  console.log(`\nTotal: ${allPosts.length} posts`);
  
  const socialPosts = allPosts.filter(p => p.providerCategory === 'social');
  const marketPosts = allPosts.filter(p => p.providerCategory === 'market');
  console.log(`Social: ${socialPosts.length}, Market: ${marketPosts.length}`);
  
  const narratives = analyzeNarratives(allPosts);
  console.log(`\nNarratives: ${narratives.length}`);
  for (const n of narratives) {
    console.log(`  - ${n.name} (score=${n.score}, platforms=${n.topPlatforms.join(',')}, human=${n.humanAuthors.length})`);
  }
}
main();
