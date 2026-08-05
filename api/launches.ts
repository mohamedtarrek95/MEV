import type { IncomingMessage, ServerResponse } from 'http';
import { scanLaunches } from '../lib/launch/engine.js';

const STALE_MS = 5 * 1000;

let refreshLock = false;
let lastReport: Awaited<ReturnType<typeof scanLaunches>> | null = null;
let lastRefreshAt = 0;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3, s-maxage=3');
  res.end(JSON.stringify(body));
}

async function doRefresh() {
  if (refreshLock && lastReport && Date.now() - lastRefreshAt < STALE_MS) {
    return lastReport;
  }
  refreshLock = true;
  try {
    const result = await scanLaunches();
    lastReport = result;
    lastRefreshAt = Date.now();
    return result;
  } finally {
    refreshLock = false;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if ((req.method || 'GET').toUpperCase() === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept');
    res.statusCode = 204;
    res.end();
    return;
  }
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);
  const action = url.searchParams.get('action');

  if (action === 'health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (action === 'refresh') {
    try {
      const result = await doRefresh();
      sendJson(res, 200, {
        ok: true,
        report: result.report,
      });
    } catch (err) {
      console.error('[api] refresh failed:', err);
      sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  if (!action || action === 'launches') {
    try {
      let result = lastReport;
      if (!result || Date.now() - lastRefreshAt > STALE_MS) {
        result = await doRefresh();
      }
      if (!result) {
        sendJson(res, 200, { ok: true, report: null, message: 'Scanning...' });
        return;
      }
      sendJson(res, 200, { ok: true, report: result.report });
    } catch (err) {
      console.error('[api] launches error:', err);
      sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  sendJson(res, 400, { error: 'missing ?action=launches or ?action=refresh' });
}
