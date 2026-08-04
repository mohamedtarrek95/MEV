import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IntelReport } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = process.env.INTEL_CACHE_DIR || join(__dirname, '.cache');
const REPORT_FILE = join(CACHE_DIR, 'report.json');
const CACHE_TTL_MS = 30 * 60 * 1000;

function ensureDir(): void {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
}

export async function loadReport(): Promise<IntelReport | null> {
  try {
    const raw = await readFile(REPORT_FILE, 'utf8');
    const report = JSON.parse(raw) as IntelReport;
    if (Date.now() - report.generatedAt > CACHE_TTL_MS) return null;
    return report;
  } catch {
    return null;
  }
}

export async function saveReport(report: IntelReport): Promise<void> {
  ensureDir();
  await writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
}
