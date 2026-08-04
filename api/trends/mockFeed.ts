import type { Tweet } from './types.js';

const NARRATIVES: { term: string; patterns: string[] }[] = [
  { term: 'dogwifcap', patterns: ['$DOGC trending hard right now', 'dogwifcap is the next dogwifhat', 'just grabbed my $DOGC bag', 'dogwifcap dev is cooking', 'dogwifcap to raydium soon', 'everyone sleeping on dogwifcap'] },
  { term: 'pepe', patterns: ['$PEPE frogs are back', 'pepe chain is live and pumping', 'new pepe fork dropping', '$PEPE community votes bluemeo'] },
  { term: 'bonk', patterns: ['$BONK awakening', 'bonk is not dead accumulation', 'bonk 2.0 narrative strong'] },
  { term: 'aiagent', patterns: ['$AGNT ai agents cooking', 'aiagent launchpad about to pump', 'ai agents are meta $AGNT lead'] },
  { term: 'degen', patterns: ['degen bets only today', 'degenerate solana trading $DEG', 'degen club alpha drop'] },
];

const HANDLES = ['apechronicles', 'solflipper', 'gigabrain', 'degendiary', 'memelord', 'wifiq'];

export class MockFeedProvider {
  readonly name = 'mock';

  async fetchTweets(since?: number): Promise<Tweet[]> {
    await new Promise((r) => setTimeout(r, 100));
    const now = Date.now();
    const out: Tweet[] = [];
    NARRATIVES.forEach((n, ni) => {
      n.patterns.forEach((text, i) => {
        const handle = HANDLES[(i * 3 + ni) % HANDLES.length];
        const createdAt = now - Math.round(Math.random() * 18 * 3600 * 1000);
        if (since && createdAt <= since) return;
        out.push({
          id: `${n.term}-${i}-${handle}`,
          authorId: handle,
          authorHandle: handle,
          text,
          createdAt,
          metrics: {
            likes: Math.round(Math.random() * 1200),
            replies: Math.round(Math.random() * 120),
            reposts: Math.round(Math.random() * 300),
            views: Math.round(Math.random() * 40000),
          },
        });
      });
    });
    return out;
  }
}

export type FeedProvider = PlaywrightXLike | MockFeedProvider;

export interface PlaywrightXLike {
  readonly name: string;
  fetchTweets(since?: number): Promise<Tweet[]>;
}