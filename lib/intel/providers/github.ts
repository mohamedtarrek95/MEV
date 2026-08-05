import type { ITrendProvider, RawPost } from '../types.js';

export class GitHubProvider implements ITrendProvider {
  readonly name = 'GitHub Trending';
  readonly sourceId = 'github';
  readonly category = 'social' as const;

  async fetch(): Promise<RawPost[]> {
    const posts: RawPost[] = [];
    try {
      const date = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
      const url = `https://api.github.com/search/repositories?q=created:>${date}+stars:>50&sort=stars&order=desc&per_page=20`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json() as {
        items?: Array<{
          full_name: string;
          description?: string;
          html_url: string;
          stargazers_count: number;
          language?: string;
          topics?: string[];
          created_at: string;
        }>;
      };
      for (const repo of (data.items ?? []).slice(0, 20)) {
        const desc = (repo.description ?? '').trim();
        if (!desc) continue;
        posts.push({
          id: `gh-${repo.full_name}`,
          source: 'github',
          author: repo.full_name.split('/')[0],
          title: desc.slice(0, 100),
          body: desc,
          url: repo.html_url,
          timestamp: new Date(repo.created_at).getTime(),
          likes: repo.stargazers_count,
          shares: 0,
          comments: 0,
          providerCategory: 'social',
        });
      }
    } catch { /* return empty */ }
    return posts;
  }
}
