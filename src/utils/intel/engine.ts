import type {
  IdeaCluster,
  MemeIdea,
  Post,
  SourceId,
  TokenSuggestion,
} from './types';
import { SOURCES, sourceLabel, sourceWeight, WINDOW_MS } from './sources';
import { meridiemTime } from './time';

// ── stop words ──────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','if','then','else','when','at','by','for',
  'in','on','of','to','from','with','as','is','was','are','were','been','be',
  'have','has','had','do','does','did','will','would','could','should','may',
  'might','shall','can','need','dare','ought','used','this','that','these',
  'those','i','me','my','we','our','you','your','he','him','his','she','her',
  'it','its','they','them','their','what','which','who','whom','whose','where',
  'when','why','how','all','each','every','both','few','more','most','other',
  'some','such','no','not','only','own','same','so','than','too','very','just',
  'about','above','after','again','also','any','because','before','being',
  'below','between','during','here','into','now','over','out','through',
  'under','up','down','off','once','further','then','there','here',
  'don','dont','get','got','like','one','two','go','going','know',
  'think','see','come','make','take','give','say','said','put','let','still',
  'even','way','much','back','well','look','first','last','new','right',
  'thing','things','really','yeah','yes','no','ok','okay','lol','lmao',
  'haha','bro','dude','imho','tbh','ngl','smh','fwiw','fyi','afaik',
  'rt','cc','dm','pm','op','oc','nsfw','spoiler','edit','upvote','downvote',
  'post','comment','thread','sub','subreddit','channel','group','chat',
  'guys','people','someone','everyone','anyone','nothing','everything',
  'does','actually','literally','basically','probably','definitely','maybe',
]);

// ── regex ───────────────────────────────────────────────────────────
const EMOJI_RE = /[\u{1F600}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1FFFF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
const URL_RE = /https?:\/\/[^\s]+/gi;
const PUNCT_RE = /[^\p{L}\p{N}\s]/gu;
const MULTI_SPACE_RE = /\s{2,}/g;

// ── normalization ───────────────────────────────────────────────────
function normalizeText(text: string): string {
  return text
    .replace(URL_RE, '')
    .replace(EMOJI_RE, '')
    .replace(PUNCT_RE, ' ')
    .toLowerCase()
    .replace(MULTI_SPACE_RE, ' ')
    .trim();
}

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

function collapseRepeated(s: string): string {
  return s.replace(/(.)\1{2,}/g, '$1$1');
}

// ── fuzzy matching ──────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[m][n];
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const len = Math.max(a.length, b.length);
  if (len < 3) return false;
  return levenshtein(a, b) <= Math.floor(len * 0.3);
}

// ── phrase extraction ───────────────────────────────────────────────
function extractPhrases(normalized: string): string[] {
  const words = normalized.split(/\s+/).filter((w) => w.length >= 2);
  const filtered = words.filter((w) => !STOP_WORDS.has(w));
  const phrases: string[] = [];
  for (let i = 0; i < filtered.length; i++) {
    phrases.push(filtered[i]);
    if (i + 1 < filtered.length) phrases.push(`${filtered[i]} ${filtered[i + 1]}`);
    if (i + 2 < filtered.length) phrases.push(`${filtered[i]} ${filtered[i + 1]} ${filtered[i + 2]}`);
  }
  return phrases.map(collapseRepeated).filter((p) => {
    const words = p.split(/\s+/);
    return words.every((w) => w.length >= 2);
  });
}

// ── cluster key ─────────────────────────────────────────────────────
function clusterKey(phrase: string): string {
  return normalizeKey(phrase);
}

// ── aggregate into clusters ─────────────────────────────────────────
function clusterPosts(posts: Post[]): IdeaCluster[] {
  const map = new Map<string, IdeaCluster>();

  for (const post of posts) {
    const tokens = extractTokens(post.text);
    const seen = new Set<string>();

    for (const token of tokens) {
      const key = clusterKey(token);
      if (seen.has(key)) continue;
      seen.add(key);

      let c = map.get(key);
      if (!c) {
        c = {
          key,
          canonicalName: token,
          tokens: [token],
          posts: [],
          firstSeen: post.timestamp,
          lastSeen: post.timestamp,
          authors: new Set(),
          platforms: new Set(),
          totalMentions: 0,
          totalEngagement: 0,
        };
        map.set(key, c);
      }
      c.posts.push(post);
      c.authors.add(post.author);
      c.platforms.add(post.sourceId);
      c.totalMentions += 1;
      c.totalEngagement += post.likes + post.shares * 2 + post.comments;
      c.firstSeen = Math.min(c.firstSeen, post.timestamp);
      c.lastSeen = Math.max(c.lastSeen, post.timestamp);
    }
  }

  const clusters = [...map.values()];
  const merged = new Set<string>();

  for (let i = 0; i < clusters.length; i++) {
    if (merged.has(clusters[i].key)) continue;
    for (let j = i + 1; j < clusters.length; j++) {
      if (merged.has(clusters[j].key)) continue;
      if (similar(clusters[i].key, clusters[j].key)) {
        clusters[i].tokens.push(...clusters[j].tokens);
        clusters[i].posts.push(...clusters[j].posts);
        for (const a of clusters[j].authors) clusters[i].authors.add(a);
        for (const p of clusters[j].platforms) clusters[i].platforms.add(p);
        clusters[i].totalMentions += clusters[j].totalMentions;
        clusters[i].totalEngagement += clusters[j].totalEngagement;
        clusters[i].firstSeen = Math.min(clusters[i].firstSeen, clusters[j].firstSeen);
        clusters[i].lastSeen = Math.max(clusters[i].lastSeen, clusters[j].lastSeen);
        if (clusters[j].canonicalName.length > clusters[i].canonicalName.length) {
          clusters[i].canonicalName = clusters[j].canonicalName;
        }
        merged.add(clusters[j].key);
      }
    }
  }

  return clusters.filter((c) => !merged.has(c.key));
}

function extractTokens(text: string): string[] {
  return extractPhrases(normalizeText(text));
}

// ── category detection ──────────────────────────────────────────────
const WORD_MAP: Record<string, string> = {
  cat:'animal',dog:'animal',hamster:'animal',mouse:'animal',frog:'animal',
  duck:'animal',chicken:'animal',cow:'animal',pig:'animal',sheep:'animal',
  goat:'animal',horse:'animal',bear:'animal',wolf:'animal',fox:'animal',
  rabbit:'animal',bunny:'animal',turtle:'animal',penguin:'animal',whale:'animal',
  shark:'animal',crab:'animal',octopus:'animal',bee:'animal',snake:'animal',
  dinosaur:'animal',dragon:'animal',unicorn:'animal',llama:'animal',alpaca:'animal',
  gorilla:'animal',monkey:'animal',ape:'animal',elephant:'animal',lion:'animal',
  tiger:'animal',koala:'animal',panda:'animal',sloth:'animal',narwhal:'animal',
  axolotl:'animal',gecko:'animal',lizard:'animal',
  ai:'tech',robot:'tech',quantum:'tech',cyber:'tech',blockchain:'tech',
  nft:'tech',defi:'tech',web3:'tech',metaverse:'tech',neural:'tech',
  gpu:'tech',mining:'tech',token:'tech',laser:'tech',neon:'tech',
  hologram:'tech',drone:'tech',chip:'tech',matrix:'tech',algorithm:'tech',
  ninja:'action',warrior:'action',samurai:'action',pirate:'action',viking:'action',
  knight:'action',assassin:'action',
  space:'space',moon:'space',mars:'space',rocket:'space',star:'space',
  galaxy:'space',cosmic:'space',alien:'space',ufo:'space',orbit:'space',
  banana:'food',pizza:'food',taco:'food',sushi:'food',ramen:'food',
  waffle:'food',donut:'food',cookie:'food',chocolate:'food',avocado:'food',
  pixel:'retro',retro:'retro','8bit':'retro',vintage:'retro',arcade:'retro',
  dark:'dark',shadow:'dark',void:'dark',cursed:'dark',haunted:'dark',
  anime:'anime',manga:'anime',kawaii:'anime',
  celebrity:'celebrity',famous:'celebrity',icon:'celebrity',
  political:'political',meme:'meme',viral:'meme',trending:'meme',catchphrase:'meme',
};

function detectCategory(phrase: string): string {
  const words = phrase.split(/\s+/);
  const scores: Record<string, number> = {};
  for (const w of words) {
    const cat = WORD_MAP[w];
    if (cat) scores[cat] = (scores[cat] ?? 0) + 1;
  }
  if (phrase.includes('quantum') || phrase.includes('cyber') || phrase.includes('neon')) scores.cyber = (scores.cyber ?? 0) + 2;
  if (phrase.includes('pixel') || phrase.includes('retro') || phrase.includes('8bit')) scores.retro = (scores.retro ?? 0) + 2;
  if (phrase.includes('moon') || phrase.includes('rocket')) scores.space = (scores.space ?? 0) + 2;
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    const cat = sorted[0][0];
    const LABELS: Record<string, string> = {
      animal: 'Animals', tech: 'Technology', action: 'Action', space: 'Space',
      food: 'Food', retro: 'Retro Gaming', dark: 'Dark Humor', anime: 'Anime',
      celebrity: 'Celebrity', political: 'Political', meme: 'Internet Meme',
    };
    return LABELS[cat] ?? 'General Meme';
  }
  return 'General Meme';
}

// ── token generation ────────────────────────────────────────────────
const NAME_PREFIXES = [
  'Mega','Ultra','Super','Hyper','Turbo','Epic','Legendary','Cosmic','Neon',
  'Pixel','Retro','Cyber','Quantum','Galaxy','Stellar','Atomic','Turbo',
  'Supreme','Alpha','Omega','Prime','Shadow','Void','Neon','Laser','Turbo',
  'Happy','Funny','Wild','Crazy','Silly','Derpy','Chonky','Smol','Big',
];

const NAME_SUFFIXES = [
  'Coin','Token','Inu','Floki','Elon','Safe','Moon','Shib','Doge',
  'Cat','Dog','Frog','Peanut','Wojak','Pepe','Bonk','Ape','Bull',
];

function generateTokenName(narrative: string): string {
  const words = narrative.split(/\s+/);
  if (words.length === 1) {
    const w = words[0];
    const prefix = NAME_PREFIXES[Math.abs(hashCode(w)) % NAME_PREFIXES.length];
    return `${prefix} ${capitalize(w)}`;
  }
  if (words.length === 2) {
    return `${capitalize(words[0])} ${capitalize(words[1])}`;
  }
  return words.map(capitalize).join(' ');
}

function generateSymbol(name: string): string {
  const words = name.split(/\s+/);
  if (words.length === 1) {
    const w = words[0];
    return w.length <= 6 ? w.toUpperCase() : w.slice(0, 6).toUpperCase();
  }
  const acronym = words.map((w) => w[0]).join('').toUpperCase();
  if (acronym.length >= 2 && acronym.length <= 6) return acronym;
  return words[0].slice(0, 4).toUpperCase() + words[1].slice(0, 2).toUpperCase();
}

function generateDescription(name: string, narrative: string, category: string): string {
  const desc: Record<string, string[]> = {
    'Animals': [
      `${name} is the cutest meme coin on Solana. Born from the viral ${narrative} trend, it combines adorable animals with degen energy.`,
      `${name} brings the ${narrative} meme to the blockchain. Cute, chaotic, and ready to moon.`,
    ],
    'Technology': [
      `${name} is an AI-powered meme coin inspired by the ${narrative} trend. The future of funny is here.`,
      `${name} merges cutting-edge tech memes with crypto culture. ${narrative} goes on-chain.`,
    ],
    'Space': [
      `${name} is going to the moon — literally. Born from the ${narrative} viral movement, this token has cosmic ambitions.`,
      `${name} combines space exploration memes with degen crypto culture. ${narrative} on Solana.`,
    ],
    'Food': [
      `${name} is the tastiest meme coin on the blockchain. Inspired by the ${narrative} trend, it's recipe for gains.`,
      `${name} serves up hot meme energy from the ${narrative} movement. Delicious gains ahead.`,
    ],
    'Retro Gaming': [
      `${name} is a pixel-perfect meme coin inspired by ${narrative}. 8-bit vibes, 100x energy.`,
      `${name} brings retro gaming nostalgia to crypto. Born from the ${narrative} trend.`,
    ],
    'Dark Humor': [
      `${name} is the darkest meme coin on Solana. Born from the ${narrative} trend, it embraces the void.`,
      `${name} takes ${narrative} memes to the blockchain. Dark, chaotic, unforgettable.`,
    ],
    'Action': [
      `${name} is an action-packed meme coin inspired by ${narrative}. Ready for battle, ready to moon.`,
      `${name} brings warrior energy to the meme coin space. ${narrative} goes on-chain.`,
    ],
    'Internet Meme': [
      `${name} is the ultimate internet meme coin. Born from the ${narrative} viral movement.`,
      `${name} captures the essence of ${narrative} in token form. Pure meme energy.`,
    ],
  };
  const options = desc[category] ?? [
    `${name} is a viral meme coin inspired by the ${narrative} trend. The next big thing on Solana.`,
    `${name} captures the ${narrative} meme energy in token form. Community-driven, meme-powered.`,
  ];
  return options[Math.abs(hashCode(narrative)) % options.length];
}

function generateTheme(category: string, narrative: string): string {
  const themes: Record<string, string[]> = {
    'Animals': ['Cute & Chaotic', 'Adorable Degen', 'Animal Meme Madness'],
    'Technology': ['AI Meme', 'Cyber Meme', 'Tech Humor'],
    'Space': ['Cosmic Meme', 'To The Moon', 'Space Humor'],
    'Food': ['Tasty Meme', 'Food Humor', 'Delicious Degen'],
    'Retro Gaming': ['8-Bit Meme', 'Pixel Art Humor', 'Retro Vibes'],
    'Dark Humor': ['Dark Meme', 'Void Humor', 'Edgy Crypto'],
    'Action': ['Action Meme', 'Battle Humor', 'Warrior Vibes'],
    'Internet Meme': ['Pure Meme', 'Viral Humor', 'Internet Culture'],
    'General Meme': ['Meme Energy', 'Viral Humor', 'Community Meme'],
  };
  const options = themes[category] ?? themes['General Meme'];
  return options[Math.abs(hashCode(narrative)) % options.length];
}

function generateLore(name: string, narrative: string, category: string): string {
  const lores: Record<string, string[]> = {
    'Animals': [
      `In the early days of Solana, a ${narrative} appeared in a viral post. Nobody knew where it came from, but within hours, it was everywhere. ${name} was born from this moment — a tribute to the internet's ability to turn anything into a legend.`,
      `The ${narrative} meme started as a single post on Reddit. Within 6 hours, it had spread to 5 platforms. ${name} carries the spirit of that viral moment — proof that the best memes come from the community.`,
    ],
    'Technology': [
      `As AI tools became mainstream, the ${narrative} meme emerged from the intersection of tech anxiety and humor. ${name} immortalizes this cultural moment on the blockchain.`,
      `The ${narrative} trend started in tech circles and quickly went mainstream. ${name} captures the absurdity of our AI-powered future.`,
    ],
    'Space': [
      `The ${narrative} meme took flight when a Reddit post combined space imagery with crypto culture. ${name} is the tokenization of that cosmic dream.`,
      `From a single viral image of ${narrative} to a movement — ${name} represents the community's journey to the moon.`,
    ],
    'Food': [
      `The ${narrative} meme started as a joke about food and crypto. ${name} turns that joke into the tastiest token on Solana.`,
      `A single post about ${narrative} went viral. ${name} was created to immortalize this delicious moment in meme history.`,
    ],
  };
  const options = lores[category] ?? [
    `The ${narrative} meme emerged organically across multiple platforms. ${name} was created to capture this viral moment before it becomes mainstream.`,
    `What started as a simple post about ${narrative} became a cultural phenomenon. ${name} is the community's answer to the question: "What if we tokenized this?"`,
  ];
  return options[Math.abs(hashCode(narrative + name)) % options.length];
}

function generateMascot(name: string, narrative: string, category: string): string {
  const mascots: Record<string, string[]> = {
    'Animals': [
      `A cute ${narrative} wearing sunglasses and holding a diamond.`,
      `An adorable ${narrative} in a tiny astronaut suit.`,
      `A chonky ${narrative} with laser eyes and a crown.`,
    ],
    'Technology': [
      `A robot ${narrative} with glowing circuits and a degen grin.`,
      `A futuristic ${narrative} with holographic displays.`,
      `An AI-powered ${narrative} with neural network patterns.`,
    ],
    'Space': [
      `A cosmic ${narrative} floating in a sea of stars.`,
      `A rocket-powered ${narrative} heading to the moon.`,
      `A galactic ${narrative} with a trail of stardust.`,
    ],
    'Food': [
      `A delicious ${narrative} with a golden glow.`,
      `A tasty ${narrative} wearing a chef hat.`,
      `A gourmet ${narrative} with sparkle effects.`,
    ],
    'Retro Gaming': [
      `A pixel-art ${narrative} in 8-bit style.`,
      `A retro ${narrative} with arcade aesthetics.`,
      `A chiptune ${narrative} with neon colors.`,
    ],
    'Dark Humor': [
      `A shadowy ${narrative} with glowing red eyes.`,
      `A void ${narrative} emerging from darkness.`,
      `A cursed ${narrative} with an eerie aura.`,
    ],
  };
  const options = mascots[category] ?? [
    `A cool ${narrative} with sunglasses and a degen attitude.`,
    `A chad ${narrative} with diamond hands.`,
    `A legendary ${narrative} with cosmic energy.`,
  ];
  return options[Math.abs(hashCode(narrative + 'mascot')) % options.length];
}

function generateColorPalette(category: string, narrative: string): string[] {
  const palettes: Record<string, string[][]> = {
    'Animals': [['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96E6A1'],['#FF9A9E','#FAD0C4','#A18CD1','#FBC2EB','#A6C1EE']],
    'Technology': [['#00F5FF','#7B2FFF','#FF0080','#00FF88','#FFD700'],['#0D1117','#21262D','#58A6FF','#3FB950','#F78166']],
    'Space':[['#0B0B3B','#1A1A6C','#4A00E0','#8E2DE2','#FF6B6B'],['#000428','#004E92','#00B4DB','#0083B0','#00D2FF']],
    'Food':[['#FFD700','#FF6347','#FF4500','#FFA500','#FFDAB9'],['#FFE5B4','#FFDAB9','#FFB6C1','#FFA07A','#98FB98']],
    'Retro Gaming':[['#FF00FF','#00FFFF','#FFD700','#FF6B6B','#4ECDC4'],['#FF1493','#00CED1','#FFD700','#32CD32','#FF4500']],
    'Dark Humor':[['#1A1A2E','#16213E','#0F3460','#E94560','#533483'],['#0D0D0D','#1A1A1A','#333333','#FF0000','#FFD700']],
  };
  const options = palettes[category] ?? [['#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96E6A1']];
  return options[Math.abs(hashCode(narrative)) % options.length];
}

function generateLogoPrompt(name: string, narrative: string, mascot: string, palette: string[]): string {
  return `${mascot} Logo design, ${palette.join(', ')} color palette, vector style, transparent background, high detail, professional crypto token art, clean lines, bold colors`;
}

function generateBannerPrompt(name: string, narrative: string, category: string): string {
  const banners: Record<string, string[]> = {
    'Animals': [`Vibrant banner featuring ${narrative} characters in a cartoon world, colorful, playful, community vibes`, `Wide banner with adorable ${narrative} mascots in a crypto trading environment, fun energy`],
    'Technology': [`Futuristic banner with ${narrative} theme, neon lights, digital circuits, AI aesthetics`, `Cyberpunk-style banner featuring ${narrative} in a tech environment, glowing effects`],
    'Space': [`Cosmic banner with ${narrative} floating in space, stars, nebulae, moon in background`, `Galaxy-themed banner featuring ${narrative} on a rocket, cosmic energy, vibrant colors`],
    'Food': [`Delicious banner with ${narrative} theme, vibrant food colors, fun cartoon style`, `Tasty banner featuring ${narrative} characters in a kitchen environment, warm colors`],
    'Retro Gaming': [`Pixel-art banner with ${narrative} in 8-bit style, arcade aesthetics, nostalgic vibes`, `Retro gaming banner featuring ${narrative} with chiptune aesthetics, neon colors`],
    'Dark Humor': [`Dark atmospheric banner with ${narrative} theme, moody lighting, mysterious vibes`, `Edgy banner featuring ${narrative} in a dark environment, glowing accents`],
  };
  const options = banners[category] ?? [`Wide banner with ${narrative} theme, vibrant colors, community energy, professional crypto art`];
  return options[Math.abs(hashCode(narrative + 'banner')) % options.length];
}

function generateWebsiteStyle(category: string, narrative: string): string {
  const styles: Record<string, string[]> = {
    'Animals': ['Playful cartoon theme with bright colors', 'Cute pastel design with animal illustrations', 'Fun and energetic with character art'],
    'Technology': ['Sleek dark theme with neon accents', 'Futuristic glassmorphism with tech elements', 'Clean minimal design with AI aesthetics'],
    'Space': ['Cosmic dark theme with starfield background', 'Galaxy-inspired with nebula gradients', 'Deep space aesthetic with glowing elements'],
    'Food': ['Warm vibrant theme with food-inspired colors', 'Playful cartoon style with appetizing visuals', 'Fun and tasty design with golden accents'],
    'Retro Gaming': ['Pixel-art retro arcade theme', '8-bit inspired with neon colors', 'Nostalgic gaming aesthetic with chiptune vibes'],
    'Dark Humor': ['Dark moody theme with red accents', 'Edgy gothic-inspired design', 'Mysterious dark aesthetic with glow effects'],
  };
  const options = styles[category] ?? ['Modern meme coin design with bold colors and community focus'];
  return options[Math.abs(hashCode(narrative + 'web')) % options.length];
}

function generateSocialBio(name: string, narrative: string, category: string): string {
  const bios: Record<string, string[]> = {
    'Animals': [`${name} — The cutest meme on Solana. Born from ${narrative}. Community-driven, meme-powered. 🐾`, `${name} — ${narrative} goes on-chain. Cute, chaotic, degen. 🐾`],
    'Technology': [`${name} — AI memes meet crypto. ${narrative} on Solana. The future is funny. 🤖`, `${name} — ${narrative} tokenized. Tech memes, degen gains. 🤖`],
    'Space': [`${name} — ${narrative} on Solana. Going to the moon. Cosmic memes. 🚀`, `${name} — The ${narrative} meme coin. Space vibes, degen energy. 🚀`],
    'Food': [`${name} — ${narrative} on Solana. Tasty memes, delicious gains. 🍌`, `${name} — The tastiest meme coin. ${narrative} vibes. 🍌`],
    'Retro Gaming': [`${name} — ${narrative} on Solana. 8-bit memes, 100x energy. 🎮`, `${name} — Pixel-perfect meme coin. ${narrative} vibes. 🎮`],
    'Dark Humor': [`${name} — ${narrative} on Solana. Dark memes, void energy. 👁️`, `${name} — The darkest meme coin. ${narrative} vibes. 👁️`],
  };
  const options = bios[category] ?? [`${name} — ${narrative} on Solana. Meme energy, degen gains. 🚀`];
  return options[Math.abs(hashCode(narrative + 'bio')) % options.length];
}

function generateLaunchTags(name: string, narrative: string, category: string): string[] {
  const base = ['meme', 'solana', 'crypto', 'viral'];
  const catTags: Record<string, string[]> = {
    'Animals': ['animal', 'cute', 'funny'],
    'Technology': ['ai', 'tech', 'future'],
    'Space': ['space', 'moon', 'cosmic'],
    'Food': ['food', 'tasty', 'funny'],
    'Retro Gaming': ['retro', 'pixel', 'gaming'],
    'Dark Humor': ['dark', 'edgy', 'void'],
    'Action': ['action', 'battle', 'warrior'],
    'Internet Meme': ['meme', 'viral', 'trending'],
  };
  const words = narrative.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
  const cat = catTags[category] ?? ['meme'];
  return [...new Set([...base, ...cat, ...words])].slice(0, 8);
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

function capitalize(s: string): string {
  return s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ── scoring ─────────────────────────────────────────────────────────
function computeGrowthPct(cluster: IdeaCluster, now: number): number {
  const half = WINDOW_MS / 2;
  const recent = cluster.posts.filter((p) => now - p.timestamp <= half).length;
  const older = cluster.posts.length - recent;
  if (older === 0) return recent > 0 ? 100 + recent * 20 : 0;
  return Math.round(((recent - older) / older) * 100);
}

function computeVelocity(cluster: IdeaCluster): number {
  const spanHours = Math.max((cluster.lastSeen - cluster.firstSeen) / 3600000, 0.5);
  return cluster.totalMentions / spanHours;
}

function computeTrendScore(cluster: IdeaCluster, now: number): number {
  const mentionScore = Math.min(cluster.totalMentions / 500, 1);
  const growthPct = computeGrowthPct(cluster, now);
  const growthScore = Math.min(Math.max(growthPct, 0) / 500, 1);
  const velocity = computeVelocity(cluster);
  const velocityScore = Math.min(velocity / 20, 1);
  const platformScore = Math.min(cluster.platforms.size / 6, 1);
  const authorScore = Math.min(cluster.authors.size / 100, 1);
  const ageHours = (now - cluster.lastSeen) / 3600000;
  const recencyBoost = Math.max(0, 1 - ageHours / 24);
  const reliability = [...cluster.platforms].reduce((sum, id) => sum + sourceWeight(id), 0) / Math.max(cluster.platforms.size, 1);

  const raw =
    mentionScore * 0.25 +
    growthScore * 0.2 +
    velocityScore * 0.2 +
    platformScore * 0.15 +
    authorScore * 0.1 +
    recencyBoost * 0.05 +
    reliability * 0.05;

  return Math.round(raw * 1000) / 10;
}

function computeConfidence(cluster: IdeaCluster, now: number): number {
  const platformPct = Math.min(cluster.platforms.size / 6, 1);
  const mentionPct = Math.min(cluster.totalMentions / 300, 1);
  const growthPct = Math.min(Math.max(computeGrowthPct(cluster, now), 0) / 400, 1);
  const authorPct = Math.min(cluster.authors.size / 80, 1);
  return Math.round((platformPct * 0.35 + mentionPct * 0.25 + growthPct * 0.25 + authorPct * 0.15) * 100);
}

// ── reason / evidence ───────────────────────────────────────────────
function generateReason(cluster: IdeaCluster, now: number): string {
  const growth = computeGrowthPct(cluster, now);
  const velocity = computeVelocity(cluster);
  const parts: string[] = [];
  if (growth > 200) parts.push(`Mentions surged +${growth}% in the last 12 hours`);
  else if (growth > 100) parts.push(`Mentions doubled in the last 12 hours (+${growth}%)`);
  else if (growth > 0) parts.push(`Steady growth of +${growth}% in recent hours`);
  if (velocity > 10) parts.push(`${Math.round(velocity)} mentions/hour — extremely hot`);
  else if (velocity > 3) parts.push(`${Math.round(velocity)} mentions/hour — fast rising`);
  if (cluster.platforms.size >= 4) parts.push(`Cross-platform viral spread across ${cluster.platforms.size} sources`);
  else if (cluster.platforms.size >= 2) parts.push(`Picking up on ${cluster.platforms.size} independent platforms`);
  if (cluster.authors.size > 50) parts.push(`${cluster.authors.size} unique creators discussing this idea`);
  if (parts.length === 0) parts.push(`First seen ${Math.round((now - cluster.firstSeen) / 3600000)}h ago with ${cluster.totalMentions} mentions`);
  return parts.join('. ') + '.';
}

function generateEvidence(cluster: IdeaCluster, now: number): string[] {
  const evidence: string[] = [];
  const byPlatform = new Map<SourceId, number>();
  for (const p of cluster.posts) byPlatform.set(p.sourceId, (byPlatform.get(p.sourceId) ?? 0) + 1);
  const sorted = [...byPlatform.entries()].sort((a, b) => b[1] - a[1]);
  for (const [id, count] of sorted.slice(0, 5)) evidence.push(`${sourceLabel(id)}: ${count} mentions`);
  const growth = computeGrowthPct(cluster, now);
  if (growth > 0) evidence.push(`Growth: +${growth}% in last 12h`);
  const velocity = computeVelocity(cluster);
  if (velocity > 1) evidence.push(`Velocity: ${Math.round(velocity * 10) / 10} mentions/hour`);
  evidence.push(`First detected: ${Math.round((now - cluster.firstSeen) / 3600000)}h ago (${meridiemTime(cluster.firstSeen)})`);
  const topAuthors = [...new Set(cluster.posts.map((p) => p.author))].slice(0, 3);
  if (topAuthors.length > 0) evidence.push(`Active voices: ${topAuthors.join(', ')}`);
  return evidence;
}

// ── main export ─────────────────────────────────────────────────────
export interface BuildMemeIdeasInput {
  posts: Post[];
  now?: number;
}

export function buildMemeIdeas(input: BuildMemeIdeasInput): MemeIdea[] {
  const now = input.now ?? Date.now();
  const recent = input.posts.filter((p) => now - p.timestamp <= WINDOW_MS);
  const clusters = clusterPosts(recent);
  const ideas: MemeIdea[] = [];

  for (const cluster of clusters) {
    if (cluster.totalMentions < 3) continue;
    if (cluster.platforms.size < 2) continue;

    const trendScore = computeTrendScore(cluster, now);
    if (trendScore < 5) continue;

    const growthPct = computeGrowthPct(cluster, now);
    const confidencePct = computeConfidence(cluster, now);
    const category = detectCategory(cluster.canonicalName);
    const narrative = capitalize(cluster.canonicalName);

    const tokenName = generateTokenName(narrative);
    const symbol = generateSymbol(tokenName);
    const description = generateDescription(tokenName, narrative, category);
    const theme = generateTheme(category, narrative);
    const lore = generateLore(tokenName, narrative, category);
    const mascot = generateMascot(tokenName, narrative, category);
    const colorPalette = generateColorPalette(category, narrative);
    const logoPrompt = generateLogoPrompt(tokenName, narrative, mascot, colorPalette);
    const bannerPrompt = generateBannerPrompt(tokenName, narrative, category);
    const websiteStyle = generateWebsiteStyle(category, narrative);
    const socialBio = generateSocialBio(tokenName, narrative, category);
    const launchTags = generateLaunchTags(tokenName, narrative, category);

    ideas.push({
      id: `${cluster.key}-${now}`,
      narrative,
      trendScore,
      mentionCount: cluster.totalMentions,
      growthPct,
      uniqueAuthors: cluster.authors.size,
      platformsFound: [...cluster.platforms],
      platformCount: cluster.platforms.size,
      firstDetected: cluster.firstSeen,
      lastSeen: cluster.lastSeen,
      confidencePct,
      reason: generateReason(cluster, now),
      evidence: generateEvidence(cluster, now),
      category,
      token: {
        name: tokenName,
        symbol,
        description,
        theme,
        lore,
        mascot,
        colorPalette,
        logoPrompt,
        bannerPrompt,
        websiteStyle,
        socialBio,
        launchTags,
      },
    });
  }

  return ideas.sort((a, b) => b.trendScore - a.trendScore);
}
