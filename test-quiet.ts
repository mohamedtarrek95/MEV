import { createAllProviders } from './lib/intel/providers/index.js';
import { analyzeNarratives } from './lib/intel/engine.js';

// Suppress verbose engine logging
const origLog = console.log;
console.log = (..._args: any[]) => {};

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
    } catch (e) { /* skip */ }
  }
  
  const narratives = analyzeNarratives(allPosts);
  console.log = origLog;
  
  console.log(`Posts: ${allPosts.length}, Narratives: ${narratives.length}`);
  for (const n of narratives) {
    console.log(`  - ${n.name} (score=${n.score}, platforms=${n.topPlatforms.join(',')}, human=${n.humanAuthors.length}, social=${n.socialPlatforms.length})`);
  }
}
main();
