import { AnchorProvider } from '@coral-xyz/anchor';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
  PumpFunSDK,
  type CreateTokenMetadata,
  type PriorityFee,
  type TransactionResult,
} from 'pumpdotfun-sdk';

const METADATA_UPLOAD_ENDPOINT = '/api/pump/upload';

export interface PumpMetadataUploadResult {
  metadataUri?: string;
  image?: string;
  name?: string;
  symbol?: string;
  [key: string]: unknown;
}

export async function uploadMetadataToPump(create: CreateTokenMetadata): Promise<PumpMetadataUploadResult> {
  const formData = new FormData();
  formData.append('file', create.file, 'image.png');
  formData.append('name', create.name);
  formData.append('symbol', create.symbol);
  formData.append('description', create.description);
  formData.append('twitter', create.twitter ?? '');
  formData.append('telegram', create.telegram ?? '');
  formData.append('website', create.website ?? '');
  formData.append('showName', 'true');

  console.log(`[pumpfun] uploading metadata to ${METADATA_UPLOAD_ENDPOINT}`, {
    name: create.name,
    symbol: create.symbol,
    description: create.description,
    twitter: create.twitter ?? '',
    telegram: create.telegram ?? '',
    website: create.website ?? '',
    file: { filename: 'image.png', size: create.file.size, type: create.file.type },
  });

  const resp = await fetch(METADATA_UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: formData,
  });

  const text = await resp.text();
  console.log(`[pumpfun] metadata upload response ${resp.status}`, text.slice(0, 1000));

  if (!resp.ok) {
    throw new Error(`Metadata upload failed (HTTP ${resp.status}): ${text || 'no response body'}`);
  }
  if (!text) {
    throw new Error('Metadata upload returned an empty response');
  }
  try {
    return JSON.parse(text) as PumpMetadataUploadResult;
  } catch {
    throw new Error(`Metadata upload returned invalid JSON: ${text}`);
  }
}

export const PUMPFUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
export const PUMPFUN_DECIMALS = 6;

export interface MemeCoinMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
}

export interface CreateMemeCoinResult {
  mint: string;
  signature: string;
}

export interface PumpBuyResult {
  signature: string;
  tokensReceived: bigint;
}

export interface PumpSellResult {
  signature: string;
  solReceived: bigint;
}

const PLACEHOLDER_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function dummyWallet(kp: Keypair) {
  return {
    publicKey: kp.publicKey,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      (tx as unknown as { sign: (s: Keypair[]) => void }).sign([kp]);
      return tx;
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
      txs.forEach((tx) => (tx as unknown as { sign: (s: Keypair[]) => void }).sign([kp]));
      return txs;
    },
  };
}

export function pumpfunSdk(connection: Connection): PumpFunSDK {
  const provider = new AnchorProvider(connection, dummyWallet(Keypair.generate()), {
    commitment: 'confirmed',
    skipPreflight: false,
  });
  return new PumpFunSDK(provider);
}

export function pumpPriorityFee(priorityFeeLamports?: number): PriorityFee | undefined {
  if (!priorityFeeLamports || priorityFeeLamports <= 0) return undefined;
  const unitLimit = 400_000;
  const unitPrice = Math.max(1, Math.floor((priorityFeeLamports * 1_000_000) / unitLimit));
  return { unitLimit, unitPrice };
}

function pumpError(res: TransactionResult): string {
  if (res.error) {
    if (res.error instanceof Error) return res.error.message;
    try {
      return JSON.stringify(res.error);
    } catch {
      return String(res.error);
    }
  }
  return 'Pump.fun transaction failed (unknown error)';
}

async function imageUrlToBlob(imageUrl?: string): Promise<Blob> {
  if (imageUrl) {
    try {
      const resp = await fetch(imageUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        if (blob && blob.size > 0) return blob;
      }
    } catch {
      /* fall through to placeholder */
    }
  }
  const bytes = Uint8Array.from(atob(PLACEHOLDER_PNG_B64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'image/png' });
}

export async function createMemeCoin(
  connection: Connection,
  creatorKp: Keypair,
  metadata: MemeCoinMetadata,
  priorityFeeLamports?: number,
): Promise<CreateMemeCoinResult> {
  const sdk = pumpfunSdk(connection);
  sdk.createTokenMetadata = uploadMetadataToPump;
  const mintKp = Keypair.generate();
  const file = await imageUrlToBlob(metadata.imageUrl);
  const res = await sdk.createAndBuy(
    creatorKp,
    mintKp,
    {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      file,
    },
    0n,
    500n,
    pumpPriorityFee(priorityFeeLamports),
    'confirmed',
    'confirmed',
  );
  if (!res.success) throw new Error(pumpError(res));
  console.log(
    `[pumpfun] coin created mint=${mintKp.publicKey.toBase58()} sig=${res.signature ?? ''}`,
  );
  return { mint: mintKp.publicKey.toBase58(), signature: res.signature ?? '' };
}

export async function getPumpBuyQuote(
  connection: Connection,
  mint: string,
  solLamports: number,
): Promise<bigint> {
  const sdk = pumpfunSdk(connection);
  const bc = await sdk.getBondingCurveAccount(new PublicKey(mint));
  if (!bc) throw new Error('Bonding curve account not found for this coin');
  return bc.getBuyPrice(BigInt(solLamports));
}

export async function getPumpSellQuote(
  connection: Connection,
  mint: string,
  tokenBaseUnits: number,
): Promise<bigint> {
  const sdk = pumpfunSdk(connection);
  const bc = await sdk.getBondingCurveAccount(new PublicKey(mint));
  if (!bc) throw new Error('Bonding curve account not found for this coin');
  const global = await sdk.getGlobalAccount();
  return bc.getSellPrice(BigInt(tokenBaseUnits), global.feeBasisPoints);
}

export async function buyPumpCoin(
  connection: Connection,
  buyerKp: Keypair,
  mint: string,
  solLamports: number,
  priorityFeeLamports?: number,
): Promise<PumpBuyResult> {
  const sdk = pumpfunSdk(connection);
  const mintPub = new PublicKey(mint);
  const tokensReceived = await getPumpBuyQuote(connection, mint, solLamports);
  const res = await sdk.buy(
    buyerKp,
    mintPub,
    BigInt(solLamports),
    500n,
    pumpPriorityFee(priorityFeeLamports),
    'confirmed',
    'confirmed',
  );
  if (!res.success) throw new Error(pumpError(res));
  return { signature: res.signature ?? '', tokensReceived };
}

export async function sellPumpCoin(
  connection: Connection,
  sellerKp: Keypair,
  mint: string,
  tokenBaseUnits: number,
  priorityFeeLamports?: number,
): Promise<PumpSellResult> {
  const sdk = pumpfunSdk(connection);
  const mintPub = new PublicKey(mint);
  const solReceived = await getPumpSellQuote(connection, mint, tokenBaseUnits);
  const res = await sdk.sell(
    sellerKp,
    mintPub,
    BigInt(tokenBaseUnits),
    500n,
    pumpPriorityFee(priorityFeeLamports),
    'confirmed',
    'confirmed',
  );
  if (!res.success) throw new Error(pumpError(res));
  return { signature: res.signature ?? '', solReceived };
}

export async function getPumpTokenPriceInSol(connection: Connection, mint: string): Promise<number> {
  try {
    const sdk = pumpfunSdk(connection);
    const bc = await sdk.getBondingCurveAccount(new PublicKey(mint));
    if (!bc) return 0;
    const global = await sdk.getGlobalAccount();
    const oneTokenBase = 10 ** PUMPFUN_DECIMALS;
    const priceLamports = bc.getSellPrice(BigInt(oneTokenBase), global.feeBasisPoints);
    return Number(priceLamports) / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}
