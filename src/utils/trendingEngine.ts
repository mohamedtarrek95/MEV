export interface FinalStretchToken {
  name: string;
  symbol: string;
  mint: string;
  imageUri: string;
  usdMarketCap: number;
  progressPct: number;
  creator: string;
  createdAt: string;
}

export interface MigratedToken {
  name: string;
  symbol: string;
  mint: string;
  imageUri: string;
  migratedAt: string;
}

export interface MigrationCandidate {
  id: string;
  name: string;
  ticker: string;
  mintAddress: string;
  imageUrl: string;
  previousMigrations: number;
  progressPct: number;
  migrationScore: number;
  rationale: string;
  similarNames: string[];
  isLaunched: boolean;
}

const AXIOM_BASE = 'https://axiom.trade/?token=';

function normalizeForFuzzy(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_\-./\\|,!?~`'"@#$%^&*()+=\[\]{}<>:;]+/g, '')
    .replace(/[^\w]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeForFuzzy(a);
  const nb = normalizeForFuzzy(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return false;
  const dist = levenshtein(na, nb);
  const threshold = maxLen <= 4 ? 1 : maxLen <= 8 ? 2 : Math.floor(maxLen * 0.25);
  return dist <= threshold;
}

export function buildAxiomUrl(mintAddress: string): string {
  return `${AXIOM_BASE}${mintAddress}`;
}

export function calculateMigrationScore(params: {
  previousMigrations: number;
  progressPct: number;
}): number {
  const migrationWeight = Math.min(params.previousMigrations / 5, 1) * 60;
  const progressWeight = (params.progressPct / 100) * 40;
  return Math.round((migrationWeight + progressWeight) * 10) / 10;
}

const RATIONALE_TEMPLATES = [
  'This name has migrated {count} time{plural} before on Pump.fun. Currently at {progress}% progress toward migration — pattern suggests high probability of success.',
  'Strong migration history: {count} previous successful migration{plural} with similar naming. Final Stretch at {progress}% — approaching the bonding curve completion.',
  'Recurring pattern detected — {count} prior token{plural} with this name reached migration. Current progress: {progress}%. Names with repeat migrations often perform well.',
  'Historical repeat: {count} previous migration{plural} for this name pattern. Sitting at {progress}% in Final Stretch, this is a high-conviction play.',
];

export function generateMigrationRationale(params: {
  count: number;
  progress: number;
  names: string[];
}): string {
  const tpl = RATIONALE_TEMPLATES[Math.floor(Math.random() * RATIONALE_TEMPLATES.length)];
  const plural = params.count === 1 ? '' : 's';
  return tpl
    .replace('{count}', String(params.count))
    .replace('{plural}', plural)
    .replace('{progress}', String(Math.round(params.progress)));
}

function generateId(): string {
  return `mc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildMigrationCandidate(params: {
  token: FinalStretchToken;
  previousMigrations: number;
  similarNames: string[];
  progressPct: number;
}): MigrationCandidate {
  const score = calculateMigrationScore({
    previousMigrations: params.previousMigrations,
    progressPct: params.progressPct,
  });

  return {
    id: generateId(),
    name: params.token.name,
    ticker: params.token.symbol,
    mintAddress: params.token.mint,
    imageUrl: params.token.imageUri || `https://picsum.photos/seed/${params.token.symbol}/200/200`,
    previousMigrations: params.previousMigrations,
    progressPct: params.progressPct,
    migrationScore: score,
    rationale: generateMigrationRationale({
      count: params.previousMigrations,
      progress: params.progressPct,
      names: params.similarNames,
    }),
    similarNames: params.similarNames,
    isLaunched: true,
  };
}

export function rankCandidates(candidates: MigrationCandidate[], max = 20): MigrationCandidate[] {
  return [...candidates]
    .sort((a, b) => {
      if (b.previousMigrations !== a.previousMigrations) {
        return b.previousMigrations - a.previousMigrations;
      }
      return b.progressPct - a.progressPct;
    })
    .slice(0, max);
}
