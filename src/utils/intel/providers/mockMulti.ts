import type { Post, SourceId } from '../types';
import { ALL_SOURCE_IDS } from '../sources';
import type { ISourceProvider } from '../types';

// ── meme idea seeds ─────────────────────────────────────────────────
interface MemeSeed {
  name: string;
  aliases: string[];
}

const SEEDS: MemeSeed[] = [
  { name: 'Space Hamster', aliases: ['spacehamster','space hamster','astronaut hamster','hamster in space','hamster astronaut'] },
  { name: 'Quantum Banana', aliases: ['quantumbanana','quantum banana','banana quantum','banana split dimensions'] },
  { name: 'Pixel Dragon', aliases: ['pixeldragon','pixel dragon','8bit dragon','retro dragon','pixel fire drake'] },
  { name: 'Ninja Cactus', aliases: ['ninjacactus','ninja cactus','cactus ninja','stabby plant','martial arts cactus'] },
  { name: 'Cyber Penguin', aliases: ['cyberpenguin','cyber penguin','neon penguin','hacker penguin','glitch penguin'] },
  { name: 'Moon Cow', aliases: ['mooncow','moon cow','lunar cow','moon moo','cosmic bovine'] },
  { name: 'Disco Llama', aliases: ['discollama','disco llama','groovy llama','dance llama','party llama'] },
  { name: 'Quantum Frog', aliases: ['quantumfrog','quantum frog','superposition frog','schrodinger frog','alive dead frog'] },
  { name: 'Crypto Cat', aliases: ['cryptocat','crypto cat','blockchain cat','hodl cat','diamond paws'] },
  { name: 'Meme Lord Gecko', aliases: ['memelord gecko','gecko meme','lizard king','gecko lord','meme gecko'] },
  { name: 'Neon Narwhal', aliases: ['neonnarwhal','neon narwhal','glow narwhal','laser narwhal','cosmic horn'] },
  { name: 'Void Cat', aliases: ['voidcat','void cat','dark cat','shadow kitty','black hole cat'] },
  { name: 'Bubble Wrap Dog', aliases: ['bubblewrapdog','bubble wrap dog','pop pup','bouncy puppy'] },
  { name: 'Retro Robot', aliases: ['retrorobot','retro robot','vintage bot','tin robot','classic android'] },
  { name: 'Galaxy Snail', aliases: ['galaxysnail','galaxy snail','cosmic snail','space slug','star trail snail'] },
  { name: 'Viking Cat', aliases: ['vikingcat','viking cat','norse cat','helmet cat','longship kitty'] },
  { name: 'Pixel Pizza', aliases: ['pixelpizza','pixel pizza','8bit pizza','retro slice','digital dough'] },
  { name: 'Neon Mushroom', aliases: ['neonmushroom','neon mushroom','glow shroom','cyber fungi','glowing caps'] },
  { name: 'Laser Shark', aliases: ['lasershark','laser shark','beam shark','shark with lasers','photon shark'] },
  { name: 'Time Travel Taco', aliases: ['timetraveltaco','time travel taco','temporal taco','chronos taco','taco paradox'] },
];

// ── post templates ──────────────────────────────────────────────────
interface Tpl { text: string; likes: [number,number]; shares: [number,number]; comments: [number,number] }

const T: Record<SourceId, Tpl[]> = {
  reddit: [
    { text:'yo has anyone else noticed {A} blowing up lately? i keep seeing it everywhere', likes:[20,500], shares:[5,80], comments:[10,200] },
    { text:'not gonna lie {A} is the funniest thing ive seen this week. someone make this a coin', likes:[50,1200], shares:[10,150], comments:[20,400] },
    { text:'just saw {A} on my timeline for the 5th time today. this is actually trending huh', likes:[15,300], shares:[3,50], comments:[8,120] },
    { text:'{A} meme compilation when?? i need more of this content', likes:[30,800], shares:[8,100], comments:[15,300] },
    { text:'calling it now {A} is going to be the next big meme. screenshot this', likes:[40,900], shares:[12,200], comments:[25,500] },
    { text:'my friend just showed me {A} and i havent stopped laughing. we need a sub for this', likes:[25,600], shares:[6,90], comments:[12,250] },
    { text:'seriously though {A} is underrated content. why isnt anyone talking about this', likes:[10,200], shares:[2,30], comments:[5,80] },
    { text:'{A} is peak internet culture. we truly live in the best timeline', likes:[60,1500], shares:[15,250], comments:[30,600] },
  ],
  telegram: [
    { text:'guys {A} is everywhere rn check it out before normies find it', likes:[5,100], shares:[3,60], comments:[8,150] },
    { text:'just discovered {A} meme this is gold sharing with the group', likes:[10,200], shares:[8,120], comments:[12,200] },
    { text:'{A} is trending in 3 different groups im in signal or noise?', likes:[8,150], shares:[4,80], comments:[15,250] },
    { text:'someone just dropped a {A} meme in general chat and now everyone is making variations', likes:[12,250], shares:[6,100], comments:[10,180] },
    { text:'ngl {A} might be the next big thing the engagement is insane', likes:[15,300], shares:[10,150], comments:[8,130] },
    { text:'{A} content is fire who started this trend?', likes:[6,120], shares:[3,50], comments:[12,200] },
  ],
  bluesky: [
    { text:'the {A} discourse is my favorite timeline never change internet', likes:[8,180], shares:[4,70], comments:[6,120] },
    { text:'just saw {A} for the first time and i need everyone to see this immediately', likes:[12,250], shares:[8,130], comments:[10,180] },
    { text:'{A} is proof that the internet still has creativity left. were so back', likes:[20,400], shares:[10,180], comments:[15,280] },
    { text:'can we talk about how {A} went from 0 to everywhere in like 6 hours?', likes:[15,300], shares:[6,100], comments:[12,220] },
    { text:'{A} discourse is wild some people love it some people hate it. i love it', likes:[10,200], shares:[5,80], comments:[8,150] },
  ],
  mastodon: [
    { text:'toot about {A} this is the kind of content that makes me love the fediverse', likes:[3,60], shares:[2,40], comments:[4,80] },
    { text:'just discovered {A} through a boost the internet is amazing sometimes', likes:[5,100], shares:[4,70], comments:[6,100] },
    { text:'{A} is trending across multiple instances this is organic internet culture at its best', likes:[8,150], shares:[6,100], comments:[5,90] },
    { text:'the {A} meme is spreading saw it on 3 different timelines today', likes:[4,80], shares:[3,50], comments:[4,70] },
  ],
  nitter: [
    { text:'everyone is talking about {A} today the timeline is blessed', likes:[10,200], shares:[8,150], comments:[5,100] },
    { text:'just saw {A} on my explore page why is this everywhere rn', likes:[6,120], shares:[4,80], comments:[8,150] },
    { text:'{A} is the content i signed up for pure internet gold', likes:[15,300], shares:[10,200], comments:[6,120] },
  ],
  cryptoNews: [
    { text:'viral meme alert {A} is taking over social media could be the next big crypto narrative', likes:[25,500], shares:[15,300], comments:[20,400] },
    { text:'market watch {A} trend detected across multiple platforms early movers could benefit', likes:[30,600], shares:[18,350], comments:[25,500] },
    { text:'breaking {A} meme goes viral crypto community already discussing token potential', likes:[40,800], shares:[20,400], comments:[30,600] },
    { text:'trend watch {A} is the hottest meme on the internet right now heres why it matters', likes:[35,700], shares:[16,320], comments:[22,450] },
  ],
  aiNews: [
    { text:'the {A} meme is taking over AI circles. engineers are sharing it in every slack channel', likes:[20,400], shares:[12,200], comments:[15,300] },
    { text:'{A} went viral in the AI community. even the researchers are laughing', likes:[15,300], shares:[8,150], comments:[10,200] },
    { text:'just saw {A} trending on AI twitter. this crossover is gold', likes:[18,350], shares:[10,180], comments:[12,250] },
  ],
  gamingNews: [
    { text:'{A} memes are flooding gaming communities. everyone wants this as a game character', likes:[20,400], shares:[12,200], comments:[15,300] },
    { text:'the gaming community is obsessed with {A}. speedrunners are making montages', likes:[15,300], shares:[8,150], comments:[10,200] },
    { text:'{A} is the hottest thing in gaming memes right now. every discord is talking about it', likes:[18,350], shares:[10,180], comments:[12,250] },
  ],
  techNews: [
    { text:'{A} is trending in tech circles. developers are turning it into side projects', likes:[20,400], shares:[12,200], comments:[15,300] },
    { text:'the tech community cant stop talking about {A}. hackathon teams are building {A} apps', likes:[15,300], shares:[8,150], comments:[10,200] },
    { text:'{A} went viral in tech twitter. even the CTOs are sharing memes about it', likes:[18,350], shares:[10,180], comments:[12,250] },
  ],
  entertainmentNews: [
    { text:'{A} is everywhere in entertainment news. late night hosts are making jokes about it', likes:[25,500], shares:[15,300], comments:[20,400] },
    { text:'celebrities are posting about {A}. this meme has gone fully mainstream', likes:[30,600], shares:[18,350], comments:[25,500] },
    { text:'{A} is the biggest entertainment meme of the week. every fan account is posting it', likes:[20,400], shares:[12,200], comments:[15,300] },
  ],
  memeWebsites: [
    { text:'{A} is number one on the meme charts today. heres a compilation of the best ones', likes:[30,600], shares:[18,350], comments:[20,400] },
    { text:'{A} meme of the day. this ones going to be legendary', likes:[20,400], shares:[12,200], comments:[15,300] },
    { text:'top {A} memes this week. the internet never disappoints', likes:[25,500], shares:[15,300], comments:[18,350] },
  ],
  publicForums: [
    { text:'anyone else seeing {A} memes everywhere? might be worth watching', likes:[8,150], shares:[5,90], comments:[12,200] },
    { text:'{A} is trending in meme circles. if someone launches a token for this it could be huge', likes:[12,250], shares:[8,130], comments:[15,250] },
    { text:'hot take {A} has the potential to be a billion dollar meme if tokenized early', likes:[20,400], shares:[12,200], comments:[25,400] },
    { text:'the {A} narrative is building. early detection could mean serious gains', likes:[10,200], shares:[6,100], comments:[10,180] },
  ],
};

// ── author names ────────────────────────────────────────────────────
const AUTHORS: Record<SourceId, string[]> = {
  reddit:['u/CryptoDegenerate','u/MemeHunter420','u/DeFiWizard','u/BlockchainBro','u/SolanaFanboy','u/MemeLord99','u/GemFinder','u/WalletWarrior','u/TokenSniper','u/ViralVibes'],
  telegram:['@CryptoAlpha','@MemeScout','@DeFiAlpha','@TokenGuru','@SolanaWhale','@MemeCoinSniper','@AlphaCaller','@CryptoInsider'],
  bluesky:['@vibes.bsky','@crypto.bsky','@meme.bsky','@web3.bsky','@viral.bsky','@trend.bsky'],
  mastodon:['@crypto@mastodon.social','@memes@fosstodon.org','@web3@techhub.social','@viral@mastodon.online'],
  nitter:['@MemeTracker','@CryptoSignals','@ViralWatch','@TrendAlert','@MemeCoinDaily'],
  cryptoNews:['CryptoNewsDesk','MemeCoinWeekly','DeFiPulse','Web3Trends','TokenReporter'],
  aiNews:['AITrendWatch','NeuralDigest','AIWeekly','DeepLearningNews','AIBuzz'],
  gamingNews:['GameMemeDaily','DegenGamer','PixelNews','GameViral','GameCulture'],
  techNews:['TechBuzz','HackerNews','DevMemes','TechViral','CodeCulture'],
  entertainmentNews:['EntertainViral','MemeCentral','PopCultureDaily','ViralBuzz','TrendWatch'],
  memeWebsites:['MemeKing','ViralMemes','MemeDaily','InternetGold','MemeHQ'],
  publicForums:['CryptoForum_User','DeFi_Degen','MemeCoin_Hunter','TokenScout','AlphaSeeker'],
};

// ── seeded random ───────────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// ── provider ────────────────────────────────────────────────────────
export class MockMultiSourceProvider implements ISourceProvider {
  sourceId: SourceId;
  private seed: number;
  private ideaCount: number;

  constructor(sourceId: SourceId, opts?: { seed?: number; ideaCount?: number }) {
    this.sourceId = sourceId;
    this.seed = opts?.seed ?? 42;
    this.ideaCount = opts?.ideaCount ?? 10;
  }

  async fetch(): Promise<Post[]> {
    const rand = seededRandom(this.seed + this.sourceId.charCodeAt(0) * 1000);
    const templates = T[this.sourceId];
    const authors = AUTHORS[this.sourceId];
    const now = Date.now();
    const posts: Post[] = [];

    const selected: MemeSeed[] = [];
    const indices = new Set<number>();
    while (indices.size < Math.min(this.ideaCount, SEEDS.length)) indices.add(Math.floor(rand() * SEEDS.length));
    for (const idx of indices) selected.push(SEEDS[idx]);

    const postCount = 4 + Math.floor(rand() * 9);
    for (let i = 0; i < postCount; i++) {
      const seed = selected[Math.floor(rand() * selected.length)];
      const tpl = templates[Math.floor(rand() * templates.length)];
      const author = authors[Math.floor(rand() * authors.length)];
      const alias = seed.aliases[Math.floor(rand() * seed.aliases.length)];
      const text = tpl.text.replace(/\{A\}/g, alias);
      const ageMs = Math.floor(rand() * 20 * 3600000);
      const lerp = (r: [number,number]) => Math.round(r[0] + rand() * (r[1] - r[0]));

      posts.push({
        id: `${this.sourceId}-${i}-${seed.name.replace(/\s+/g,'-').toLowerCase()}`,
        sourceId: this.sourceId,
        author,
        text,
        url: `https://example.com/post/${i}`,
        timestamp: now - ageMs,
        likes: lerp(tpl.likes),
        shares: lerp(tpl.shares),
        comments: lerp(tpl.comments),
      });
    }
    return posts;
  }
}

export function createAllProviders(opts?: { seed?: number; ideaCount?: number }): MockMultiSourceProvider[] {
  return ALL_SOURCE_IDS.map((id) => new MockMultiSourceProvider(id, opts));
}
