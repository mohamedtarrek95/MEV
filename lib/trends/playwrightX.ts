import { createRequire } from 'node:module';
import type { Tweet } from './types.js';

interface MinimalPage {
  goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<void>;
  waitForSelector(sel: string, opts?: { timeout?: number }): Promise<void>;
  evaluate<T = unknown>(fn: string): Promise<T>;
  close(): Promise<void>;
}

interface MinimalBrowser {
  close(): Promise<void>;
  newPage(): Promise<MinimalPage>;
}
interface MinimalBrowserType {
  launch(opts?: { headless?: boolean }): Promise<MinimalBrowser>;
}

/**
 * Playwright-based provider for X (Twitter). Loaded lazily so the build never
 * hard-depends on `playwright`. If the browser cannot be launched, or X blocks
 * the session (login wall / 403), `fetchTweets` throws and the worker falls
 * back to the mock provider.
 */
export class PlaywrightXProvider {
  readonly name = 'playwright-x';
  private browserPromise: Promise<MinimalBrowser> | null = null;

  private async getBrowser(): Promise<MinimalBrowser> {
    if (this.browserPromise) return this.browserPromise;
    this.browserPromise = (async () => {
      const require = createRequire(import.meta.url);
      const mod = require('playwright') as { chromium?: MinimalBrowserType };
      if (!mod.chromium) throw new Error('playwright package is not installed');
      return mod.chromium.launch({ headless: true });
    })();
    return this.browserPromise;
  }

  async fetchTweets(since?: number): Promise<Tweet[]> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.goto('https://x.com/search?q=lang%3Aen%20until%3Anow&src=typed_query', {
        waitUntil: 'domcontentloaded',
        timeout: 45000,
      });
      await page.waitForSelector('[data-testid="tweet"]', { timeout: 20000 });
      const tweets = await page.evaluate<unknown>(
        `(() => {
          const out = [];
          const nodes = document.querySelectorAll('[data-testid="tweet"]');
          for (const el of nodes) {
            const textEl = el.querySelector('[data-testid="tweetText"]');
            const text = textEl ? textEl.textContent : '';
            const timeEl = el.querySelector('time');
            const createdAt = timeEl && timeEl.getAttribute('datetime')
              ? new Date(timeEl.getAttribute('datetime')).getTime()
              : Date.now();
            out.push({ id: el.getAttribute('data-tweet-id') || String(Math.random()), text, createdAt });
          }
          return out;
        })()`,
      );
      const rows = Array.isArray(tweets)
        ? (tweets as { id?: string; text?: string; createdAt?: number }[])
        : [];
      return rows
        .filter((r) => r.text && (!since || (r.createdAt ?? 0) > since))
        .map((r, i) => ({
          id: r.id ?? `${Date.now()}-${i}`,
          authorId: 'unknown',
          authorHandle: 'unknown',
          text: r.text ?? '',
          createdAt: r.createdAt ?? Date.now(),
          metrics: { likes: 0, replies: 0, reposts: 0, views: 0 },
        }));
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    if (this.browserPromise) {
      const b = await this.browserPromise.catch(() => null);
      if (b) await b.close().catch(() => undefined);
      this.browserPromise = null;
    }
  }
}
