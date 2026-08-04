import type { Post, SourceId } from '../types';
import { ALL_SOURCE_IDS } from '../sources';
import type { ISourceProvider } from '../types';

// ── meme idea seeds ─────────────────────────────────────────────────
interface MemeSeed {
  name: string;
  aliases: string[];
  description: string;
  category: string;
}

const SEEDS: MemeSeed[] = [
  { name: 'Space Hamster', aliases: ['spacehamster', 'space hamster', 'astronaut hamster', 'hamster in space'], description: 'Hamsters in tiny astronaut suits riding rockets to the moon', category: 'animals' },
  { name: 'Quantum Banana', aliases: ['quantumbanana', 'quantum banana', 'quantum banana peel', 'banana split across dimensions'], description: 'A banana that exists in multiple dimensions simultaneously', category: 'food' },
  { name: 'Pixel Dragon', aliases: ['pixeldragon', 'pixel dragon', '8bit dragon', 'retro dragon'], description: 'A retro 8-bit dragon breathing pixel fire', category: 'retro' },
  { name: 'Ninja Cactus', aliases: ['ninjacactus', 'ninja cactus', 'cactus ninja', 'stabby plant'], description: 'A cactus wearing a ninja headband throwing needles', category: 'action' },
  { name: 'Cyber Penguin', aliases: ['cyberpenguin', 'cyber penguin', 'neon penguin', 'hacker penguin'], description: 'A penguin in a neon cyberpunk outfit hacking the mainframe', category: 'cyber' },
  { name: 'Moon Cow', aliases: ['mooncow', 'moon cow', 'lunar cow', 'moon moo'], description: 'A cow standing on the moon looking down at Earth', category: 'space' },
  { name: 'Disco Llama', aliases: ['discollama', 'disco llama', 'groovy llama', 'dance llama'], description: 'A llama with a disco ball head and flared pants', category: 'animals' },
  { name: 'Quantum Frog', aliases: ['quantumfrog', 'quantum frog', 'superposition frog', 'schrödinger frog'], description: 'A frog that is both alive and dead in a box', category: 'tech' },
  { name: 'Crypto Cat', aliases: ['cryptocat', 'crypto cat', 'blockchain cat', 'hodl cat'], description: 'A cat wearing sunglasses holding a diamond hands sign', category: 'animals' },
  { name: 'Meme Lord Gecko', aliases: ['memelord gecko', 'gecko meme', 'lizard king', 'gecko lord'], description: 'A gecko sitting on a throne of memes', category: 'animals' },
  { name: 'Neon Narwhal', aliases: ['neonnarwhal', 'neon narwhal', 'glow narwhal', 'laser narwhal'], description: 'A narwhal with a glowing neon horn shooting lasers', category: 'animals' },
  { name: 'Void Cat', aliases: ['voidcat', 'void cat', 'dark cat', 'shadow kitty'], description: 'A completely black cat with glowing eyes emerging from the void', category: 'dark' },
  { name: 'Bubble Wrap Dog', aliases: ['bubblewrapdog', 'bubble wrap dog', 'pop pup'], description: 'A dog made entirely of bubble wrap, every step makes a popping sound', category: 'meme' },
  { name: 'Retro Robot', aliases: ['retrorobot', 'retro robot', 'vintage bot', 'tin robot'], description: 'A 1950s style tin robot doing modern tasks', category: 'retro' },
  { name: 'Galaxy Snail', aliases: ['galaxysnail', 'galaxy snail', 'cosmic snail', 'space slug'], description: 'A snail leaving a trail of stars across the galaxy', category: 'space' },
  { name: 'Viking Cat', aliases: ['vikingcat', 'viking cat', 'norse cat', 'cat with horn helmet'], description: 'A cat wearing a viking helmet sailing a tiny longship', category: 'animals' },
  { name: 'Pixel Pizza', aliases: ['pixelpizza', 'pixel pizza', '8bit pizza', 'retro slice'], description: 'A pixel-art pizza slice with each topping being a different meme', category: 'food' },
  { name: 'Neon Mushroom', aliases: ['neonmushroom', 'neon mushroom', 'glow shroom', 'cyber fungi'], description: 'A glowing neon mushroom from a cyberpunk forest', category: 'tech' },
  { name: 'Laser Shark', aliases: ['lasershark', 'laser shark', 'beam shark', 'shark with lasers'], description: 'A shark with actual laser beams attached to its head', category: 'action' },
  { name: 'Time Travel Taco', aliases: ['timetraveltaco', 'time travel taco', 'temporal taco', 'chronos taco'], description: 'A taco that travels through time, appearing in historical photos', category: 'food' },
];

// ── post templates per source ───────────────────────────────────────
interface PostTemplate {
  text: string;
  likes: [number, number];
  shares: [number, number];
  comments: [number, number];
}

const REDDIT_TEMPLATES: PostTemplate[] = [
  { text: 'yo has anyone else noticed {ALIAS} blowing up lately? i keep seeing it everywhere', likes: [20, 500], shares: [5, 80], comments: [10, 200] },
  { text: 'not gonna lie {ALIAS} is the funniest thing i\'ve seen this week. someone make this a coin', likes: [50, 1200], shares: [10, 150], comments: [20, 400] },
  { text: 'just saw {ALIAS} on my timeline for the 5th time today. this is actually trending huh', likes: [15, 300], shares: [3, 50], comments: [8, 120] },
  { text: '{ALIAS} meme compilation when?? i need more of this content', likes: [30, 800], shares: [8, 100], comments: [15, 300] },
  { text: 'calling it now {ALIAS} is going to be the next big meme. screenshot this', likes: [40, 900], shares: [12, 200], comments: [25, 500] },
  { text: 'my friend just showed me {ALIAS} and i haven\'t stopped laughing. we need a sub for this', likes: [25, 600], shares: [6, 90], comments: [12, 250] },
  { text: 'seriously though {ALIAS} is underrated content. why isn\'t anyone talking about this', likes: [10, 200], shares: [2, 30], comments: [5, 80] },
  { text: '{ALIAS} is peak internet culture. we truly live in the best timeline', likes: [60, 1500], shares: [15, 250], comments: [30, 600] },
];

const TELEGRAM_TEMPLATES: PostTemplate[] = [
  { text: 'guys {ALIAS} is everywhere rn, check it out before normies find it', likes: [5, 100], shares: [3, 60], comments: [8, 150] },
  { text: 'just discovered {ALIAS} meme. this is gold. sharing with the group', likes: [10, 200], shares: [8, 120], comments: [12, 200] },
  { text: '{ALIAS} is trending in 3 different groups i\'m in. signal or noise?', likes: [8, 150], shares: [4, 80], comments: [15, 250] },
  { text: 'someone just dropped a {ALIAS} meme in general chat and now everyone is making variations', likes: [12, 250], shares: [6, 100], comments: [10, 180] },
  { text: 'ngl {ALIAS} might be the next big thing. the engagement is insane', likes: [15, 300], shares: [10, 150], comments: [8, 130] },
  { text: '{ALIAS} content is fire. who started this trend?', likes: [6, 120], shares: [3, 50], comments: [12, 200] },
];

const BLUESKY_TEMPLATES: PostTemplate[] = [
  { text: 'the {ALIAS} discourse is my favorite timeline. never change internet', likes: [8, 180], shares: [4, 70], comments: [6, 120] },
  { text: 'just saw {ALIAS} for the first time and i need everyone to see this immediately', likes: [12, 250], shares: [8, 130], comments: [10, 180] },
  { text: '{ALIAS} is proof that the internet still has creativity left. we\'re so back', likes: [20, 400], shares: [10, 180], comments: [15, 280] },
  { text: 'can we talk about how {ALIAS} went from 0 to everywhere in like 6 hours?', likes: [15, 300], shares: [6, 100], comments: [12, 220] },
  { text: '{ALIAS} discourse is wild. some people love it some people hate it. i love it', likes: [10, 200], shares: [5, 80], comments: [8, 150] },
];

const MASTODON_TEMPLATES: PostTemplate[] = [
  { text: 'toot about {ALIAS}: this is the kind of content that makes me love the fediverse', likes: [3, 60], shares: [2, 40], comments: [4, 80] },
  { text: 'just discovered {ALIAS} through a boost. the internet is amazing sometimes', likes: [5, 100], shares: [4, 70], comments: [6, 100] },
  { text: '{ALIAS} is trending across multiple instances. this is organic internet culture at its best', likes: [8, 150], shares: [6, 100], comments: [5, 90] },
  { text: 'the {ALIAS} meme is spreading. saw it on 3 different timelines today', likes: [4, 80], shares: [3, 50], comments: [4, 70] },
];

const NITTER_TEMPLATES: PostTemplate[] = [
  { text: 'everyone is talking about {ALIAS} today. the timeline is blessed', likes: [10, 200], shares: [8, 150], comments: [5, 100] },
  { text: 'just saw {ALIAS} on my explore page. why is this everywhere rn', likes: [6, 120], shares: [4, 80], comments: [8, 150] },
  { text: '{ALIAS} is the content i signed up for. pure internet gold', likes: [15, 300], shares: [10, 200], comments: [6, 120] },
];

const CRYPTO_FORUM_TEMPLATES: PostTemplate[] = [
  { text: 'anyone else seeing {ALIAS} memes everywhere? might be worth watching', likes: [8, 150], shares: [5, 90], comments: [12, 200] },
  { text: '{ALIAS} is trending in meme circles. if someone launches a token for this it could be huge', likes: [12, 250], shares: [8, 130], comments: [15, 250] },
  { text: 'hot take: {ALIAS} has the potential to be a billion dollar meme if tokenized early', likes: [20, 400], shares: [12, 200], comments: [25, 400] },
  { text: 'the {ALIAS} narrative is building. early detection could mean serious gains', likes: [10, 200], shares: [6, 100], comments: [10, 180] },
];

const DISCORD_TEMPLATES: PostTemplate[] = [
  { text: 'just dropped in the announcements: {ALIAS} is getting traction. keep your eyes peeled', likes: [3, 50], shares: [2, 30], comments: [5, 80] },
  { text: 'server chat is going crazy about {ALIAS}. even the mods are laughing', likes: [5, 100], shares: [3, 50], comments: [8, 130] },
  { text: '{ALIAS} memes are being shared in every channel. this is definitely trending', likes: [4, 80], shares: [2, 40], comments: [6, 100] },
];

const CRYPTO_NEWS_TEMPLATES: PostTemplate[] = [
  { text: 'viral meme alert: {ALIAS} is taking over social media. could be the next big crypto narrative', likes: [25, 500], shares: [15, 300], comments: [20, 400] },
  { text: 'market watch: {ALIAS} trend detected across multiple platforms. early movers could benefit', likes: [30, 600], shares: [18, 350], comments: [25, 500] },
  { text: 'breaking: {ALIAS} meme goes viral. crypto community already discussing token potential', likes: [40, 800], shares: [20, 400], comments: [30, 600] },
  { text: 'trend watch: {ALIAS} is the hottest meme on the internet right now. here\'s why it matters', likes: [35, 700], shares: [16, 320], comments: [22, 450] },
];

const COMMUNITY_TEMPLATES: PostTemplate[] = [
  { text: 'has anyone noticed {ALIAS} is getting more popular? the organic growth is real', likes: [5, 100], shares: [3, 60], comments: [8, 150] },
  { text: '{ALIAS} is the talk of the town in multiple communities. this could be big', likes: [8, 160], shares: [5, 90], comments: [10, 180] },
  { text: 'just saw {ALIAS} mentioned in 3 different forums today. definitely trending upward', likes: [6, 120], shares: [4, 70], comments: [7, 130] },
  { text: 'the {ALIAS} trend is real and accelerating. get in early or miss out', likes: [10, 200], shares: [6, 100], comments: [12, 200] },
];

const SOURCE_TEMPLATES: Record<SourceId, PostTemplate[]> = {
  reddit: REDDIT_TEMPLATES,
  telegram: TELEGRAM_TEMPLATES,
  bluesky: BLUESKY_TEMPLATES,
  mastodon: MASTODON_TEMPLATES,
  nitter: NITTER_TEMPLATES,
  cryptoForums: CRYPTO_FORUM_TEMPLATES,
  discordAnnouncements: DISCORD_TEMPLATES,
  cryptoNews: CRYPTO_NEWS_TEMPLATES,
  communityBoards: COMMUNITY_TEMPLATES,
};

// ── author names ────────────────────────────────────────────────────
const AUTHORS: Record<SourceId, string[]> = {
  reddit: ['u/CryptoDegenerate', 'u/MemeHunter420', 'u/DeFiWizard', 'u/BlockchainBro', 'u/SolanaFanboy', 'u/MemeLord99', 'u/GemFinder', 'u/WalletWarrior', 'u/TokenSniper', 'u/ViralVibes'],
  telegram: ['@CryptoAlpha', '@MemeScout', '@DeFiAlpha', '@TokenGuru', '@SolanaWhale', '@MemeCoinSniper', '@AlphaCaller', '@CryptoInsider'],
  bluesky: ['@vibes.bsky', '@crypto.bsky', '@meme.bsky', '@web3.bsky', '@viral.bsky', '@trend.bsky'],
  mastodon: ['@crypto@mastodon.social', '@memes@fosstodon.org', '@web3@techhub.social', '@viral@mastodon.online'],
  nitter: ['@MemeTracker', '@CryptoSignals', '@ViralWatch', '@TrendAlert', '@MemeCoinDaily'],
  cryptoForums: ['CryptoForum_User', 'DeFi_Degen', 'MemeCoin_Hunter', 'TokenScout', 'AlphaSeeker'],
  discordAnnouncements: ['MemeBot', 'TrendAlert', 'AlphaNotify'],
  cryptoNews: ['CryptoNewsDesk', 'MemeCoinWeekly', 'DeFiPulse', 'Web3Trends', 'TokenReporter'],
  communityBoards: ['CommunityMod', 'AlphaCaller', 'MemeScout', 'TrendRadar'],
};

// ── seeded random ───────────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── provider ────────────────────────────────────────────────────────
export class MockMultiSourceProvider implements ISourceProvider {
  sourceId: SourceId;
  private seed: number;
  private ideaCount: number;

  constructor(sourceId: SourceId, opts?: { seed?: number; ideaCount?: number }) {
    this.sourceId = sourceId;
    this.seed = opts?.seed ?? 42;
    this.ideaCount = opts?.ideaCount ?? 8;
  }

  async fetch(): Promise<Post[]> {
    const rand = seededRandom(this.seed + this.sourceId.charCodeAt(0) * 1000);
    const templates = SOURCE_TEMPLATES[this.sourceId];
    const authors = AUTHORS[this.sourceId];
    const now = Date.now();
    const posts: Post[] = [];

    // pick which ideas this source focuses on
    const selectedSeeds: MemeSeed[] = [];
    const indices = new Set<number>();
    while (indices.size < Math.min(this.ideaCount, SEEDS.length)) {
      indices.add(Math.floor(rand() * SEEDS.length));
    }
    for (const idx of indices) {
      selectedSeeds.push(SEEDS[idx]);
    }

    // generate 4-12 posts per source
    const postCount = 4 + Math.floor(rand() * 9);
    for (let i = 0; i < postCount; i++) {
      const seed = selectedSeeds[Math.floor(rand() * selectedSeeds.length)];
      const template = templates[Math.floor(rand() * templates.length)];
      const author = authors[Math.floor(rand() * authors.length)];
      const alias = seed.aliases[Math.floor(rand() * seed.aliases.length)];
      const text = template.text.replace(/\{ALIAS\}/g, alias);

      const ageMs = Math.floor(rand() * 20 * 3600000); // 0-20 hours ago
      const timestamp = now - ageMs;

      const lerp = (range: [number, number]) =>
        Math.round(range[0] + rand() * (range[1] - range[0]));

      posts.push({
        id: `${this.sourceId}-${i}-${seed.name.replace(/\s+/g, '-').toLowerCase()}`,
        sourceId: this.sourceId,
        author,
        text,
        url: `https://example.com/post/${i}`,
        timestamp,
        likes: lerp(template.likes),
        shares: lerp(template.shares),
        comments: lerp(template.comments),
      });
    }

    return posts;
  }
}

// ── factory: one provider per source ────────────────────────────────
export function createAllProviders(opts?: { seed?: number; ideaCount?: number }): MockMultiSourceProvider[] {
  return ALL_SOURCE_IDS.map(
    (id) => new MockMultiSourceProvider(id, opts),
  );
}
