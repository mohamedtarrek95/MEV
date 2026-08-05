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
  
  const now = Date.now();
  const WINDOW = 24 * 3600 * 1000;
  const recent = allPosts.filter((p) => now - p.timestamp <= WINDOW);
  console.log(`Recent posts: ${recent.length}`);
  
  // Count sentences per post
  let totalSentences = 0;
  let totalBigrams = 0;
  for (const post of recent) {
    const allText = `${post.title} ${post.body}`;
    const sentences = allText.split(/[.!?\n]+/).filter((s) => s.trim().length > 8);
    totalSentences += sentences.length;
    for (const sentence of sentences) {
      const words = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length >= 2);
      totalBigrams += Math.max(0, words.length - 1);
    }
  }
  console.log(`Total sentences: ${totalSentences}`);
  console.log(`Estimated bigrams/clusters: ${totalBigrams}`);
}
main();
