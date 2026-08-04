import type { Tweet } from './types';
import type { IFeedProvider } from './feedProvider';

/**
 * Deterministic mock feed used as a working fallback/demo so the UI functions
 * even without a live scraper. Generates realistic posts around known meme
 * narratives with varied accounts, engagement and timestamps.
 */
const NARRATIVES: { term: string; patterns: string[] }[] = [
  {
    term: 'dogwifcap',
    patterns: [
      '$DOGC trending hard right now 🚀 community is huge',
      'dogwifcap is the next dogwifhat, insiders all in',
      'just grabbed my $DOGC bag, this one prints',
      'dogwifcap dev is cooking, bonding curve about to fill',
      '$DOGC this is going parabolic after migration',
      'dogwifcap to raydium soon, do not miss',
      'everyone sleeping on dogwifcap while it final stretches',
    ],
  },
  {
    term: 'pepe',
    patterns: [
      '$PEPE frogs are back, meme season starting',
      'pepe chain is live and the green frog pumps',
      'new pepe fork dropping, sniped early',
      '$PEPE community votes bluemeo this cycle',
    ],
  },
  {
    term: 'bonk',
    patterns: [
      '$BONK awakening, dog coin rotation incoming',
      'bonk is not dead, accumulation phase',
      'bonk 2.0 narrative strong',
    ],
  },
  {
    term: 'aiagent',
    patterns: [
      '$AGNT ai agents cooking on chain',
      'aiagent launchpad about to pump hard',
      'ai agents are the meta right now, $AGNT lead',
    ],
  },
  {
    term: 'degen',
    patterns: [
      'degen bets only today, yolo',
      'degenerate solana trading $DEG',
      'degen club alpha drop',
    ],
  },
];

const HANDLES = [
  'apechronicles', 'solflipper', 'mintmaxim', 'gigabrain', 'degendiary',
  'hypergains', 'memelord', 'ctalerts', 'solbuilder', 'wifiq',
];

function hashId(g: string, i: number, handle: string): string {
  let h = 2166136261;
  for (const c of (g + i + handle)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export class MockFeedProvider implements IFeedProvider {
  readonly name = 'mock';

  async fetchTweets(since?: number): Promise<Tweet[]> {
    await new Promise((r) => setTimeout(r, 200));
    const now = Date.now();
    const tweets: Tweet[] = [];
    const used = new Set<string>();

    for (const n of NARRATIVES) {
      const k = n.patterns.length;
      for (let i = 0; i < k; i++) {
        const handle = HANDLES[(i * 3 + k) % HANDLES.length];
        const id = hashId(n.term, i, handle);
        if (used.has(id)) continue;
        used.add(id);
        const createdAt = now - Math.round(Math.random() * 20 * 3600 * 1000);
        if (since && createdAt <= since) continue;
        tweets.push({
          id,
          authorId: handle,
          authorHandle: handle,
          text: n.patterns[i],
          createdAt,
          metrics: {
            likes: Math.round(Math.random() * 1200),
            replies: Math.round(Math.random() * 120),
            reposts: Math.round(Math.random() * 300),
            views: Math.round(Math.random() * 40000),
          },
        });
      }
    }
    return tweets;
  }
}