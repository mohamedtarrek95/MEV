import { createAllProviders } from './lib/intel/providers/index.js';
import { analyzeNarratives } from './lib/intel/engine.js';

const origLog = console.log;
console.log = (..._args: any[]) => {};

function timeIt(label: string, fn: () => void) {
  const t = Date.now();
  fn();
  console.log = origLog;
  console.log(`${label}: ${Date.now() - t}ms`);
  console.log = (..._args: any[]) => {};
}

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
  console.log = origLog;
  console.log(`Posts: ${allPosts.length}`);
  console.log = (..._args: any[]) => {};

  const t1 = Date.now();
  const narratives = analyzeNarratives(allPosts);
  console.log = origLog;
  console.log(`Total analysis: ${Date.now() - t1}ms`);
  console.log(`Narratives: ${narratives.length}`);
  for (const n of narratives) {
    console.log(`  - ${n.name} (score=${n.score}, platforms=${n.topPlatforms.join(',')}, human=${n.humanAuthors.length})`);
  }
}
main();
