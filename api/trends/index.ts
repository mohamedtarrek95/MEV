import type { IncomingMessage, ServerResponse } from 'http';
import { loadReport } from './cache.js';

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
    res.statusCode = 204;
    res.end();
    return;
  }
  if ((req.method || 'GET').toUpperCase() !== 'GET') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  const report = await loadReport();
  if (!report) {
    sendJson(res, 503, { error: 'no trend report available; start the worker first', report: null });
    return;
  }
  sendJson(res, 200, { ok: true, report });
}