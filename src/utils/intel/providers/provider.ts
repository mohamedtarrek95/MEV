import type { SourceObservation, SourceId, Chain } from '../types';
import { WINDOW_MS } from '../sources';

/** A source must return raw observations from the last 24h, already public-only. */
export interface ISourceProvider {
  readonly sourceId: SourceId;
  fetch(since?: number): Promise<SourceObservation[]>;
}

export const CHAIN: Record<string, Chain> = {
  PUMP: 'solana',
  SOL: 'solana',
  RAY: 'solana',
  BASED: 'base',
  ETH: 'eth',
  BSC: 'bsc',
  ARB: 'arbitrum',
};

export function inWindow(ts: number, now = Date.now()): boolean {
  return now - ts <= WINDOW_MS;
}