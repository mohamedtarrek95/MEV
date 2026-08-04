/**
 * Normalizes tweet text into searchable tokens.
 * - Lowercases everything
 * - Removes URLs, emojis, punctuation
 * - Removes stop words
 */

export const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or',
  'our', 'she', 'so', 'than', 'that', 'the', 'their', 'them', 'there', 'these',
  'they', 'this', 'to', 'us', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'who', 'will', 'with', 'you', 'your', 'get', 'got', 'go', 'going',
  'just', 'like', 'lol', 'omg', 'please', 'see', 'say', 'said', 'one', 'two',
  'new', 'now', 'today', 'will', 'still', 'via', 'dont', 'didnt', 'im', 'youre',
  'co', 'com', 'http', 'https', 'www', 'rt', 'mt', 'amp', 'x', 'twitter',
]);

const URL_RE = /https?:\/\/\S+|www\.\S+/gi;
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{1F1E0}-\u{1F1FF}]/gu;
const PUNCT_RE = /[^\p{L}\p{N}]+/gu;

export function stripUrls(text: string): string {
  return text.replace(URL_RE, ' ');
}

export function stripEmojis(text: string): string {
  return text.replace(EMOJI_RE, ' ');
}

export function stripPunctuation(text: string): string {
  return text.replace(PUNCT_RE, ' ');
}

export function normalizeText(text: string): string {
  return stripPunctuation(stripEmojis(stripUrls(text))).toLowerCase();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/** Detect cashtag tickers like $PEPE or $WIF and all-caps words (common meme tickers). */
export function detectTickers(text: string): string[] {
  const cashtags = [...text.matchAll(/\$([a-zA-Z0-9]{2,10})\b/g)].map((m) => m[1].toLowerCase());
  const caps = [...text.matchAll(/\b([A-Z]{2,10})\b/g)].map((m) => m[1].toLowerCase());
  return [...new Set([...cashtags, ...caps])];
}

export function detectHashtags(text: string): string[] {
  return [...text.matchAll(/#([\p{L}\p{N}_]{2,40})/gu)].map((m) => m[1].toLowerCase());
}
