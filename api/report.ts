import type { IncomingMessage, ServerResponse } from 'http';
import { loadReport, saveReport, hasRedis, healthCheck } from '../lib/intel/db.js';
import { scrapeAll, type ScrapeResult } from '../lib/intel/scrape.js';

const STALE_MS = 5 * 60 * 1000;

let refreshLock = false;
let lastScrape: ScrapeResult | null = null;
let lastRefreshAt = 0;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
  res.end(JSON.stringify(body));
}

async function doRefresh(): Promise<ScrapeResult> {
  if (refreshLock && lastScrape && Date.now() - lastRefreshAt < STALE_MS) {
    return lastScrape;
  }
  refreshLock = true;
  try {
    const result = await scrapeAll();
    lastScrape = result;
    lastRefreshAt = Date.now();
    if (hasRedis() && result.report) {
      await saveReport(result.report).catch((err) => {
        console.error('[api] redis save failed:', err);
      });
    }
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
    const dbOk = hasRedis() ? await healthCheck() : false;
    sendJson(res, 200, { ok: true, redis: dbOk });
    return;
  }

  if (action === 'status') {
    const dbOk = hasRedis() ? await healthCheck() : false;
    let conceptCount = 0;
    if (hasRedis()) {
      try {
        const r = await loadReport();
        if (r) conceptCount = r.concepts.length;
      } catch { /* ignore */ }
    }
    sendJson(res, 200, {
      ok: true,
      redis: dbOk,
      redisConfigured: hasRedis(),
      lastRefreshAt,
      isRefreshing: refreshLock,
      lastScrape: lastScrape
        ? {
            scrapedAt: lastScrape.scrapedAt,
            durationMs: lastScrape.durationMs,
            totalPosts: lastScrape.totalPosts,
            totalAccepted: lastScrape.totalAccepted,
            totalRejected: lastScrape.totalRejected,
            concepts: lastScrape.report?.concepts.length ?? 0,
            providers: lastScrape.providers,
          }
        : null,
      reportConcepts: conceptCount,
    });
    return;
  }

  if (action === 'refresh') {
    try {
      const result = await doRefresh();
      sendJson(res, 200, {
        ok: true,
        report: result.report,
        scrape: {
          durationMs: result.durationMs,
          totalPosts: result.totalPosts,
          totalAccepted: result.totalAccepted,
          totalRejected: result.totalRejected,
          providers: result.providers,
        },
      });
    } catch (err) {
      console.error('[api] refresh failed:', err);
      sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  if (action === 'intel') {
    try {
      let report = hasRedis() ? await loadReport() : null;
      if (!report || Date.now() - report.generatedAt > STALE_MS) {
        console.log('[api] data stale or missing, triggering scan...');
        const result = await doRefresh();
        report = result.report;
      }
      if (!report) {
        sendJson(res, 200, {
          ok: true,
          report: null,
          source: 'intel',
          message: 'No concepts found. The engine is scanning for emerging narratives.',
        });
        return;
      }
      sendJson(res, 200, { ok: true, report, source: 'intel' });
    } catch (err) {
      console.error('[api] intel error:', err);
      sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }

  sendJson(res, 400, { error: 'missing ?action=intel, ?action=status, ?action=health, or ?action=refresh' });
}
