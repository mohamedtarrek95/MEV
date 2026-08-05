import { createAllProviders } from './lib/intel/providers/index.js';

const origLog = console.log;
console.log = (..._args: any[]) => {};

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 2);
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

  const socialPosts = allPosts.filter(p => p.providerCategory === 'social');
  
  // Build bigram -> sources map
  const bigramSources = new Map<string, Set<string>>();
  const bigramAuthors = new Map<string, Set<string>>();
  
  for (const post of socialPosts) {
    const sentences = `${post.title} ${post.body}`.split(/[.!?\n]+/).filter(s => s.trim().length > 8);
    const seenBigrams = new Set<string>();
    
    for (const sentence of sentences) {
      const words = tokenize(sentence);
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        const key = phrase.replace(/[^a-z0-9\s]/g, '').trim();
        if (key.length < 4 || seenBigrams.has(key)) continue;
        seenBigrams.add(key);
        
        const sources = bigramSources.get(key) ?? new Set();
        sources.add(post.source);
        bigramSources.set(key, sources);
        
        const authors = bigramAuthors.get(key) ?? new Set();
        authors.add(post.author);
        bigramAuthors.set(key, authors);
      }
    }
  }
  
  // Find bigrams on 2+ social platforms with 2+ human authors
  const qualifying = [...bigramSources.entries()]
    .filter(([, sources]) => sources.size >= 2)
    .map(([bigram, sources]) => ({
      bigram,
      sources: [...sources],
      authors: bigramAuthors.get(bigram)?.size ?? 0,
    }))
    .sort((a, b) => b.authors - a.authors);
  
  console.log(`\nTotal unique bigrams: ${bigramSources.size}`);
  console.log(`Bigrams on 2+ social platforms: ${qualifying.length}`);
  
  for (const q of qualifying.slice(0, 30)) {
    console.log(`  "${q.bigram}" → platforms: ${q.sources.join(', ')} | authors: ${q.authors}`);
  }
}
main();
