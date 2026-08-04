/** Levenshtein edit distance for fuzzy spelling merging. */
export function levenshtein(a: string, b: string): number {
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

function threshold(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return Math.floor(len * 0.25);
}

/**
 * Returns the canonical key that `token` should merge into given an existing
 * set of keys (or the token itself if no fuzzy match). Variants like
 * "pepe", "PePe!", "peep" collapse onto one key.
 */
export function mergeFuzzyToken<T>(token: string, keys: Map<string, T>): string {
  let best = token;
  let bestDist = Infinity;
  for (const [key] of keys) {
    if (token === key) return key;
    const dist = levenshtein(token, key);
    if (dist <= threshold(Math.max(token.length, key.length)) && dist < bestDist) {
      bestDist = dist;
      best = key;
    }
  }
  return best;
}