import { createAllProviders } from './lib/intel/providers/index.js';

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
  console.log = origLog;

  // Group posts by source
  const bySource = new Map<string, { author: string; body: string }[]>();
  for (const p of allPosts) {
    const arr = bySource.get(p.source) ?? [];
    arr.push({ author: p.author, body: p.body.slice(0, 80) });
    bySource.set(p.source, arr);
  }
  
  for (const [source, posts] of bySource) {
    const cat = posts[0] ? allPosts.find(p => p.source === source)?.providerCategory : 'unknown';
    console.log(`\n${source} (${cat}): ${posts.length} posts`);
    console.log(`  Authors: ${new Set(posts.map(p => p.author)).size}`);
    console.log(`  Sample: ${posts.slice(0, 2).map(p => `"${p.author}": ${p.body}`).join('\n         ')}`);
  }
  
  // Check if ANY topic appears on multiple social platforms
  const socialPosts = allPosts.filter(p => p.providerCategory === 'social');
  console.log(`\n\nSocial posts: ${socialPosts.length}`);
  
  const byTopic = new Map<string, Set<string>>();
  for (const p of socialPosts) {
    const words = p.body.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    for (const w of words.slice(0, 10)) {
      const sources = byTopic.get(w) ?? new Set();
      sources.add(p.source);
      byTopic.set(w, sources);
    }
  }
  
  const crossPlatform = [...byTopic.entries()].filter(([, sources]) => sources.size >= 2);
  console.log(`\nCross-platform topics (words on 2+ social platforms): ${crossPlatform.length}`);
  for (const [word, sources] of crossPlatform.slice(0, 20)) {
    console.log(`  "${word}" → ${[...sources].join(', ')}`);
  }
}
main();
