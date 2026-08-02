import type { IncomingMessage, ServerResponse } from 'http';
import type { Readable } from 'stream';
import Busboy from 'busboy';

const PUMPFUN_IPFS_URL = process.env.PUMPFUN_IPFS_URL || 'https://pump.fun/api/ipfs';
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 20);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

const MAX_NAME_LENGTH = 32;
const MAX_SYMBOL_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
]);

interface UploadedFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

interface ParsedForm {
  fields: Record<string, string>;
  file?: UploadedFile;
}

class PumpFunHttpError extends Error {
  statusCode: number;
  responseBody: string;

  constructor(statusCode: number, responseBody: string) {
    super(`Pump.fun returned HTTP ${statusCode}`);
    this.name = 'PumpFunHttpError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function sendRaw(res: ServerResponse, status: number, body: string, contentType: string): void {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.end(body);
}

function isAllowedOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (host) {
    const sameOrigin = `https://${host}`;
    const sameOriginHttp = `http://${host}`;
    if (origin === sameOrigin || origin === sameOriginHttp) return true;
    if (origin.startsWith(`${sameOrigin}/`) || origin.startsWith(`${sameOriginHttp}/`)) return true;
  }
  return false;
}

const rateBuckets = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (rateBuckets.size > 5000) {
    for (const [key, arr] of rateBuckets) {
      const kept = arr.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (kept.length === 0) rateBuckets.delete(key);
      else rateBuckets.set(key, kept);
    }
  }
  const arr = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, arr);
    return true;
  }
  arr.push(now);
  rateBuckets.set(ip, arr);
  return false;
}

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseMultipart(req: IncomingMessage): Promise<ParsedForm> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({
      headers: req.headers,
      limits: {
        fileSize: MAX_UPLOAD_BYTES,
        files: 1,
        fields: 20,
        fieldNameSize: 128,
        fieldSize: 64 * 1024,
      },
    });
    const fields: Record<string, string> = {};
    let file: UploadedFile | undefined;
    let tooLarge = false;

    bb.on('file', (name: string, stream: Readable, info: { filename: string; mimeType: string }) => {
      const chunks: Buffer[] = [];
      let size = 0;
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_UPLOAD_BYTES) {
          tooLarge = true;
          stream.resume();
          return;
        }
        chunks.push(chunk);
      });
      stream.on('end', () => {
        if (!tooLarge) {
          file = { buffer: Buffer.concat(chunks), filename: info.filename, mimetype: info.mimeType };
        }
      });
    });

    bb.on('field', (name: string, value: string) => {
      fields[name] = value;
    });

    bb.on('error', (err: unknown) => reject(err));

    bb.on('close', () => {
      if (tooLarge) {
        reject(Object.assign(new Error('image file too large'), { statusCode: 413 }));
        return;
      }
      resolve({ fields, file });
    });

    req.pipe(bb);
  });
}

function validateForm(form: ParsedForm): string | null {
  const { fields, file } = form;
  if (!file) return 'Image file is required.';
  if (file.buffer.length === 0) return 'Image file is empty.';
  if (file.buffer.length > MAX_UPLOAD_BYTES) return 'Image file exceeds the size limit.';
  const mime = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return `Unsupported image format: ${mime || 'unknown'}. Use PNG, JPG, GIF or WEBP.`;
  }

  const name = (fields.name || '').trim();
  if (!name) return 'Token name is required.';
  if (name.length > MAX_NAME_LENGTH) return `Token name must be ${MAX_NAME_LENGTH} characters or fewer.`;

  const symbol = (fields.symbol || '').trim();
  if (!symbol) return 'Token symbol is required.';
  if (symbol.length > MAX_SYMBOL_LENGTH) {
    return `Token symbol must be ${MAX_SYMBOL_LENGTH} characters or fewer.`;
  }

  if ((fields.description || '').length > MAX_DESCRIPTION_LENGTH) {
    return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`;
  }

  for (const key of ['twitter', 'telegram', 'website']) {
    const value = fields[key];
    if (value && !isValidUrl(value)) return `${key} is not a valid URL.`;
  }
  return null;
}

async function forwardToPump(
  fields: Record<string, string>,
  file: UploadedFile,
): Promise<{ status: number; body: unknown; raw: string }> {
  const form = new FormData();
  form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.filename || 'image.png');
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }

  console.log(`[pump/upload] forwarding to ${PUMPFUN_IPFS_URL}`, {
    fields,
    file: { filename: file.filename, mimetype: file.mimetype, size: file.buffer.length },
  });

  let resp: Response;
  try {
    resp = await fetch(PUMPFUN_IPFS_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'User-Agent': 'mev-bundle-backend/1.0' },
      body: form,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[pump/upload] network error reaching Pump.fun: ${msg}`);
    throw new Error(`Could not reach Pump.fun IPFS service: ${msg}`);
  }

  const text = await resp.text();
  console.log(`[pump/upload] Pump.fun responded ${resp.status}: ${text.slice(0, 1000)}`);

  if (!resp.ok) {
    throw new PumpFunHttpError(resp.status, text);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: resp.status, body: parsed, raw: text };
}

function readableError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes('too large')) return 'Image file exceeds the size limit.';
    if (m.includes('fetch failed') || m.includes('enotfound') || m.includes('econn')) {
      return 'Could not reach Pump.fun. Please try again shortly.';
    }
    return err.message;
  }
  return String(err);
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const origin = req.headers.origin || null;
  const host = req.headers.host || null;
  const method = (req.method || 'GET').toUpperCase();

  const setCors = () => {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  };

  if (method === 'OPTIONS') {
    if (!isAllowedOrigin(origin, host)) {
      sendJson(res, 403, { error: 'origin not allowed' });
      return;
    }
    res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (method !== 'POST') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  if (!isAllowedOrigin(origin, host)) {
    sendJson(res, 403, { error: 'origin not allowed' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(ip)) {
    console.warn(`[pump/upload] rate limited for ${ip}`);
    sendJson(res, 429, { error: 'Too many upload attempts. Please try again later.' });
    return;
  }

  let form: ParsedForm;
  try {
    form = await parseMultipart(req);
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode ?? 400;
    console.warn(`[pump/upload] multipart parse failed: ${readableError(err)}`);
    sendJson(res, status, { error: readableError(err) });
    return;
  }

  console.log('[pump/upload] incoming request', {
    origin,
    host,
    method,
    fields: form.fields,
    file: form.file
      ? { filename: form.file.filename, mimetype: form.file.mimetype, size: form.file.buffer.length }
      : null,
  });

  const validationError = validateForm(form);
  if (validationError) {
    console.warn(`[pump/upload] validation failed: ${validationError}`);
    sendJson(res, 400, { error: validationError });
    return;
  }

  try {
    const result = await forwardToPump(form.fields, form.file as UploadedFile);
    setCors();
    console.log(`[pump/upload] returning success status=${result.status}`);
    sendJson(res, result.status, result.body);
  } catch (err) {
    setCors();
    if (err instanceof PumpFunHttpError) {
      const trimmed = err.responseBody.trim();
      const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');
      console.log(
        `[pump/upload] returning Pump.fun error status=${err.statusCode} body=${err.responseBody.slice(0, 1000)}`,
      );
      sendRaw(
        res,
        err.statusCode,
        err.responseBody,
        isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
      );
      return;
    }
    console.error('[pump/upload] forwarding failed:', err);
    sendJson(res, 502, { error: (err as Error)?.message ?? String(err) });
  }
}
