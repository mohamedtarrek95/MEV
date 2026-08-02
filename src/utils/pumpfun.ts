import { AnchorProvider } from '@coral-xyz/anchor';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
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

export interface SigningWallet {
  publicKey: PublicKey;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) => Promise<T[]>;
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

function safeJson(data: unknown): string {
  try {
    return JSON.stringify(
      data,
      (_key, value) =>
        typeof value === 'bigint'
          ? `${value.toString()}n`
          : value instanceof PublicKey
            ? value.toBase58()
            : value,
      2,
    );
  } catch {
    return String(data);
  }
}

export function logFullError(scope: string, fn: string, step: string, err: unknown): void {
  console.error(`[pumpfun:error] scope=${scope} fn=${fn} step=${step}`);
  if (err instanceof Error) {
    console.error(`[pumpfun:error] name=${err.name}`);
    console.error(`[pumpfun:error] message=${err.message}`);
    console.error(`[pumpfun:error] stack:\n${err.stack ?? '(no stack)'}`);
  } else {
    console.error(`[pumpfun:error] thrown value: ${safeJson(err)}`);
  }
  try {
    const own: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(err as object)) {
      if (key === 'name' || key === 'message' || key === 'stack') continue;
      own[key] = (err as Record<string, unknown>)[key];
    }
    if (Object.keys(own).length > 0) {
      console.error(
        `[pumpfun:error] full error object (RPC/HTTP response, simulation logs):\n${safeJson(own)}`,
      );
    }
  } catch {
    /* ignore */
  }
}

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
  console.log('PumpFun Connection:', connection.rpcEndpoint);
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

function pumpPriorityIxs(priorityFeeLamports?: number) {
  const ixs = [];
  if (priorityFeeLamports && priorityFeeLamports > 0) {
    const units = 400_000;
    ixs.push(ComputeBudgetProgram.setComputeUnitLimit({ units }));
    ixs.push(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Math.max(1, Math.floor((priorityFeeLamports * 1_000_000) / units)),
      }),
    );
  }
  return ixs;
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

async function waitForConfirmation(
  connection: Connection,
  sig: string,
  scope = 'waitForConfirmation',
  timeoutMs = 60_000,
): Promise<void> {
  const t0 = Date.now();
  let lastStatus: string | undefined;
  while (Date.now() - t0 < timeoutMs) {
    let status;
    try {
      status = await connection.getSignatureStatus(sig, { searchTransactionHistory: true });
    } catch (err) {
      logFullError(scope, 'connection.getSignatureStatus', 'poll confirmation status', err);
      throw err;
    }
    const value = status?.value;
    if (value?.err) {
      console.error(
        `[pumpfun:error] transaction ${sig} FAILED on-chain (elapsed ${Date.now() - t0}ms)`,
      );
      console.error(
        `[pumpfun:error] full RPC getSignatureStatus response:\n${safeJson(status)}`,
      );
      throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`);
    }
    if (value?.confirmationStatus === 'confirmed' || value?.confirmationStatus === 'finalized') {
      console.log(
        `[pumpfun:step] confirmation poll status=${value.confirmationStatus} elapsed=${Date.now() - t0}ms`,
      );
      return;
    }
    lastStatus = value?.confirmationStatus ?? 'notfound';
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error(
    `[pumpfun:error] confirmation TIMED OUT after ${timeoutMs}ms sig=${sig} lastStatus=${lastStatus}`,
  );
  throw new Error('Transaction confirmation timed out');
}

async function buildAndSendWalletTx(
  connection: Connection,
  wallet: SigningWallet,
  instructionsTx: Transaction,
  extraSigners: Keypair[],
  priorityFeeLamports?: number,
  scope = 'buildAndSendWalletTx',
): Promise<string> {
  const t0 = Date.now();
  const full = new Transaction();
  const priorityIx = pumpPriorityIxs(priorityFeeLamports);
  if (priorityIx.length) full.add(...priorityIx);
  full.add(instructionsTx);
  full.feePayer = wallet.publicKey;
  console.log(
    `[pumpfun:step] STEP 4 transaction built feePayer=${wallet.publicKey.toBase58()} instructions=${full.instructions.length} priorityFeeLamports=${priorityFeeLamports ?? 0} extraSigners=[${extraSigners.map((k) => k.publicKey.toBase58()).join(', ')}] (elapsed ${Date.now() - t0}ms)`,
  );

  console.log(`[pumpfun:step] STEP 5 latest blockhash requested (elapsed ${Date.now() - t0}ms)`);
  let blockhash;
  try {
    blockhash = await connection.getLatestBlockhash('confirmed');
  } catch (err) {
    logFullError(scope, 'connection.getLatestBlockhash', 'STEP 5 latest blockhash requested', err);
    throw err;
  }
  full.recentBlockhash = blockhash.blockhash;
  full.lastValidBlockHeight = blockhash.lastValidBlockHeight;
  console.log(
    `[pumpfun:step] STEP 6 latest blockhash received blockhash=${blockhash.blockhash} lastValidBlockHeight=${blockhash.lastValidBlockHeight} (elapsed ${Date.now() - t0}ms)`,
  );

  for (const kp of extraSigners) full.partialSign(kp);

  let signed: Transaction;
  try {
    signed = await wallet.signTransaction(full);
  } catch (err) {
    logFullError(scope, 'wallet.signTransaction', 'STEP 7 transaction signed', err);
    throw err;
  }
  for (const kp of extraSigners) {
    if (!signed.signatures.some((s) => s.publicKey.equals(kp.publicKey) && s.signature)) {
      console.log(`[pumpfun:step] re-signing missing extra signer ${kp.publicKey.toBase58()}`);
      signed.partialSign(kp);
    }
  }
  console.log(
    `[pumpfun:step] STEP 7 transaction signed signatures=[${signed.signatures
      .map((s) => `${s.publicKey.toBase58()}${s.signature ? ':signed' : ':unsigned'}`)
      .join(', ')}] (elapsed ${Date.now() - t0}ms)`,
  );

  let serialized: Uint8Array;
  try {
    serialized = signed.serialize();
  } catch (err) {
    logFullError(scope, 'signed.serialize', 'serialize signed transaction', err);
    throw err;
  }

  console.log(
    `[pumpfun:step] STEP 8 transaction sent skipPreflight=false maxRetries=5 bytes=${serialized.length} (elapsed ${Date.now() - t0}ms)`,
  );
  let sig: string;
  try {
    sig = await connection.sendRawTransaction(serialized, {
      skipPreflight: false,
      maxRetries: 5,
    });
  } catch (err) {
    logFullError(scope, 'connection.sendRawTransaction', 'STEP 8/9 send raw transaction', err);
    throw err;
  }
  console.log(
    `[pumpfun:step] STEP 9 transaction signature sig=${sig} solscan=https://solscan.io/tx/${sig} (elapsed ${Date.now() - t0}ms)`,
  );

  await waitForConfirmation(connection, sig, scope);
  console.log(
    `[pumpfun:step] STEP 10 confirmation received sig=${sig} (elapsed ${Date.now() - t0}ms)`,
  );
  return sig;
}

export async function createMemeCoin(
  connection: Connection,
  creatorWallet: SigningWallet,
  metadata: MemeCoinMetadata,
  priorityFeeLamports?: number,
): Promise<CreateMemeCoinResult> {
  const t0 = Date.now();
  const sdk = pumpfunSdk(connection);
  sdk.createTokenMetadata = uploadMetadataToPump;
  const mintKp = Keypair.generate();
  console.log(
    `[pumpfun:step] createMemeCoin entered mint=${mintKp.publicKey.toBase58()} creator=${creatorWallet.publicKey.toBase58()} priorityFeeLamports=${priorityFeeLamports ?? 0}`,
  );

  const file = await imageUrlToBlob(metadata.imageUrl);
  let metadataRes;
  try {
    metadataRes = await sdk.createTokenMetadata({
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      file,
    });
  } catch (err) {
    logFullError('createMemeCoin', 'sdk.createTokenMetadata', 'STEP 1 metadata upload', err);
    throw err;
  }
  const uri = metadataRes?.metadataUri ?? metadataRes?.uri;
  console.log(
    `[pumpfun:step] STEP 1 metadataUri received uri=${uri ?? '(MISSING)'} raw=${safeJson(metadataRes)} (elapsed ${Date.now() - t0}ms)`,
  );
  if (!uri) throw new Error('Metadata upload did not return a URI');

  console.log(
    `[pumpfun:step] STEP 2 createAndBuy() entered name=${metadata.name} symbol=${metadata.symbol} (elapsed ${Date.now() - t0}ms)`,
  );

  let createTx: Transaction;
  try {
    createTx = await sdk.getCreateInstructions(
      creatorWallet.publicKey,
      metadata.name,
      metadata.symbol,
      uri,
      mintKp,
    );
  } catch (err) {
    logFullError('createMemeCoin', 'sdk.getCreateInstructions', 'STEP 3 getCreateInstructions()', err);
    throw err;
  }
  console.log(
    `[pumpfun:step] STEP 3 getCreateInstructions() done instructions=${createTx.instructions.length} sdkFeePayer=${createTx.feePayer?.toBase58() ?? 'none'} sdkSignatures=[${createTx.signatures
      .filter((s) => s.signature)
      .map((s) => s.publicKey.toBase58())
      .join(', ')}] (elapsed ${Date.now() - t0}ms)`,
  );

  const signature = await buildAndSendWalletTx(
    connection,
    creatorWallet,
    createTx,
    [mintKp],
    priorityFeeLamports,
    'createMemeCoin',
  );

  console.log(
    `[pumpfun:step] createMemeCoin DONE mint=${mintKp.publicKey.toBase58()} sig=${signature} total=${Date.now() - t0}ms`,
  );
  return { mint: mintKp.publicKey.toBase58(), signature };
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

export async function buyPumpCoinWithWallet(
  connection: Connection,
  wallet: SigningWallet,
  mint: string,
  solLamports: number,
  priorityFeeLamports?: number,
): Promise<PumpBuyResult> {
  const t0 = Date.now();
  console.log(
    `[pumpfun:step] buyPumpCoinWithWallet entered buyer=${wallet.publicKey.toBase58()} mint=${mint} solLamports=${solLamports} priorityFeeLamports=${priorityFeeLamports ?? 0}`,
  );
  const sdk = pumpfunSdk(connection);
  const mintPub = new PublicKey(mint);
  let tokensReceived: bigint;
  try {
    tokensReceived = await getPumpBuyQuote(connection, mint, solLamports);
  } catch (err) {
    logFullError('buyPumpCoinWithWallet', 'getPumpBuyQuote', 'get buy quote', err);
    throw err;
  }
  console.log(
    `[pumpfun:step] buyPumpCoinWithWallet quote tokensReceived=${tokensReceived.toString()} (elapsed ${Date.now() - t0}ms)`,
  );
  let tx: Transaction;
  try {
    tx = await sdk.getBuyInstructionsBySolAmount(
      wallet.publicKey,
      mintPub,
      BigInt(solLamports),
      500n,
      'confirmed',
    );
  } catch (err) {
    logFullError('buyPumpCoinWithWallet', 'sdk.getBuyInstructionsBySolAmount', 'get buy instructions', err);
    throw err;
  }
  console.log(
    `[pumpfun:step] buyPumpCoinWithWallet getBuyInstructions done instructions=${tx.instructions.length} (elapsed ${Date.now() - t0}ms)`,
  );
  const signature = await buildAndSendWalletTx(
    connection,
    wallet,
    tx,
    [],
    priorityFeeLamports,
    'buyPumpCoinWithWallet',
  );
  console.log(
    `[pumpfun:step] buyPumpCoinWithWallet DONE sig=${signature} tokensReceived=${tokensReceived.toString()} (elapsed ${Date.now() - t0}ms)`,
  );
  return { signature, tokensReceived };
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
