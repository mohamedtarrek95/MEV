import type { IncomingMessage, ServerResponse } from 'http';
import { loadReport as loadTrendsReport } from '../lib/trends/cache.js';
import { loadReport as loadIntelReport } from '../lib/intel/cache.js';

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
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

  if (action === 'trends') {
    const report = await loadTrendsReport();
    if (!report) {
      sendJson(res, 200, { ok: true, report: null, source: 'trends' });
      return;
    }
    sendJson(res, 200, { ok: true, report, source: 'trends' });
    return;
  }

  if (action === 'intel') {
    const report = await loadIntelReport();
    if (!report) {
      sendJson(res, 200, { ok: true, report: null, source: 'intel', message: 'No report yet. Start the worker: npm run intel:worker' });
      return;
    }
    sendJson(res, 200, { ok: true, report, source: 'intel' });
    return;
  }

  sendJson(res, 400, { error: 'missing ?action=trends or ?action=intel' });
}
