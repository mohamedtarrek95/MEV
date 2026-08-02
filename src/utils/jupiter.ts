import {
  createJupiterApiClient,
  QuoteGetRequest,
  QuoteGetSwapModeEnum,
  QuoteResponse,
  SwapRequest,
  SwapResponse,
} from '@jup-ag/api';
import { LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { WSOL_MINT } from './solana';

const jupiterApi = createJupiterApiClient();

export interface QuoteOpts {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}

export async function getQuote(opts: QuoteOpts): Promise<QuoteResponse> {
  const req: QuoteGetRequest = {
    inputMint: opts.inputMint,
    outputMint: opts.outputMint,
    amount: opts.amount,
    slippageBps: opts.slippageBps ?? 300,
    swapMode: QuoteGetSwapModeEnum.ExactIn,
  };
  const quote = await jupiterApi.quoteGet(req);
  if (!quote) throw new Error('Jupiter returned no route for this swap');
  return quote;
}

export async function buildSwapTransaction(
  route: QuoteResponse,
  userPublicKey: string,
  prioritizationFeeLamports?: number,
): Promise<VersionedTransaction> {
  const req: SwapRequest = {
    quoteResponse: route,
    userPublicKey,
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
  };
  if (prioritizationFeeLamports && prioritizationFeeLamports > 0) {
    (req as unknown as { prioritizationFeeLamports: number }).prioritizationFeeLamports =
      prioritizationFeeLamports;
  }
  const res: SwapResponse = await jupiterApi.swapPost({ swapRequest: req });
  return VersionedTransaction.deserialize(Buffer.from(res.swapTransaction, 'base64'));
}

export async function getTokenPriceInSol(mint: string, decimals = 9): Promise<number> {
  try {
    const resp = await fetch(`https://api.jup.ag/price/v2?ids=${mint}&vsToken=${WSOL_MINT}`);
    const json = (await resp.json()) as { data?: Record<string, { price?: string }> };
    const p = Number(json?.data?.[mint]?.price);
    if (isFinite(p) && p > 0) return p;
  } catch {
    /* fall back to quote-based pricing */
  }
  try {
    const quote = await getQuote({ inputMint: mint, outputMint: WSOL_MINT, amount: 10 ** decimals });
    return Number(quote.outAmount) / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}
