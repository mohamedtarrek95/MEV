import type { IncomingMessage, ServerResponse } from 'http';
import { loadReport as loadIntelReport, hasRedis, healthCheck } from '../lib/intel/db.js';

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
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

  if (action === 'health') {
    const dbOk = hasRedis() ? await healthCheck() : false;
    sendJson(res, 200, { ok: true, redis: dbOk });
    return;
  }

  if (action === 'intel') {
    if (!hasRedis()) {
      sendJson(res, 200, {
        ok: true,
        report: null,
        source: 'intel',
        message: 'REDIS_URL not configured. Deploy worker to populate data.',
      });
      return;
    }

    try {
      const report = await loadIntelReport();
      if (!report) {
        sendJson(res, 200, {
          ok: true,
          report: null,
          source: 'intel',
          message: 'No verified narratives found during the last 24 hours.',
        });
        return;
      }
      sendJson(res, 200, { ok: true, report, source: 'intel' });
    } catch (err) {
      console.error('[api] intel report fetch failed:', err);
      sendJson(res, 500, { ok: false, error: 'Failed to load report' });
    }
    return;
  }

  sendJson(res, 400, { error: 'missing ?action=intel or ?action=health' });
}
