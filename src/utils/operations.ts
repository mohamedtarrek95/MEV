import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { getQuote, buildSwapTransaction } from './jupiter';
import { getTokenBalanceRaw, WSOL_MINT } from './solana';
import { sleep } from './format';
import {
  buyPumpCoin,
  getPumpBuyQuote,
  PUMPFUN_DECIMALS,
  sellPumpCoin,
  type SigningWallet,
} from './pumpfun';

export const FEE_BPS = 50;
export const RENT_BUFFER_SOL = 0.005;
export const RENT_BUFFER_SOL_SWEEP = 0.00005;

const MIN_TRANSFER_LAMPORTS = 5000;

function priorityIxs(priorityFeeLamports?: number) {
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

async function waitForConfirmation(connection: Connection, sig: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await connection.getSignatureStatus(sig, { searchTransactionHistory: true });
    const value = status?.value;
    if (value?.err) throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`);
    if (value?.confirmationStatus === 'confirmed' || value?.confirmationStatus === 'finalized') {
      return;
    }
    await sleep(1000);
  }
  throw new Error('Transaction confirmation timed out');
}

async function sendRawAndConfirm(
  connection: Connection,
  tx: Transaction | VersionedTransaction,
  signers: Signer[],
): Promise<string> {
  if (signers.length) {
    (tx as unknown as { sign: (s: Signer[]) => void }).sign(signers);
  }
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    maxRetries: 5,
  });
  await waitForConfirmation(connection, sig);
  return sig;
}

async function transferLamports(
  connection: Connection,
  kp: Keypair,
  toAddr: string,
  lamports: number,
  priorityFeeLamports?: number,
): Promise<void> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: kp.publicKey, blockhash, lastValidBlockHeight });
  tx.add(...priorityIxs(priorityFeeLamports));
  tx.add(
    SystemProgram.transfer({
      fromPubkey: kp.publicKey,
      toPubkey: new PublicKey(toAddr),
      lamports,
    }),
  );
  await sendRawAndConfirm(connection, tx, [kp]);
}

export async function fundWalletTx(
  connection: Connection,
  masterKp: Keypair,
  destPubkey: string,
  amountSol: number,
  priorityFeeLamports?: number,
): Promise<string> {
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: masterKp.publicKey, blockhash, lastValidBlockHeight });
  tx.add(...priorityIxs(priorityFeeLamports));
  tx.add(
    SystemProgram.transfer({
      fromPubkey: masterKp.publicKey,
      toPubkey: new PublicKey(destPubkey),
      lamports,
    }),
  );
  return sendRawAndConfirm(connection, tx, [masterKp]);
}

export async function fundWalletTxWallet(
  connection: Connection,
  wallet: SigningWallet,
  destPubkey: string,
  amountSol: number,
  priorityFeeLamports?: number,
): Promise<string> {
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: wallet.publicKey, blockhash, lastValidBlockHeight });
  tx.add(...priorityIxs(priorityFeeLamports));
  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(destPubkey),
      lamports,
    }),
  );
  const signed = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    maxRetries: 5,
  });
  await waitForConfirmation(connection, sig);
  return sig;
}

export interface BuyResult {
  sig: string;
  avgPrice: number;
  spendLamports: number;
}export async function buyTokenTx(
  connection: Connection,
  walletKp: Keypair,
  mint: string,
  decimals: number,
  priorityFeeLamports?: number,
): Promise<BuyResult> {
  const owner = walletKp.publicKey;
  const solLamports = await connection.getBalance(owner);
  const spend = Math.floor(solLamports - RENT_BUFFER_SOL * LAMPORTS_PER_SOL);
  if (spend <= 0) {
    throw new Error(`Insufficient SOL balance (${solLamports} lamports) to buy`);
  }
  const quote = await getQuote({ inputMint: WSOL_MINT, outputMint: mint, amount: spend });
  const tx = await buildSwapTransaction(quote, owner.toBase58(), priorityFeeLamports);
  const sig = await sendRawAndConfirm(connection, tx, [walletKp]);
  const inSol = spend / LAMPORTS_PER_SOL;
  const outTokens = Number(quote.outAmount) / 10 ** decimals;
  return { sig, avgPrice: outTokens > 0 ? inSol / outTokens : 0, spendLamports: spend };
}

export interface SellResult {
  sig: string;
  solAfter: number;
  sentToMaster: number;
  tokensSold: number;
}

export async function sellTokenTx(
  connection: Connection,
  walletKp: Keypair,
  mint: string,
  decimals: number,
  masterAddr: string,
  feeBps: number,
  priorityFeeLamports?: number,
): Promise<SellResult> {
  const owner = walletKp.publicKey;
  const raw = await getTokenBalanceRaw(connection, owner.toBase58(), mint);
  if (raw <= 0) throw new Error('No token balance to sell');
  const quote = await getQuote({ inputMint: mint, outputMint: WSOL_MINT, amount: raw });
  const tx = await buildSwapTransaction(quote, owner.toBase58(), priorityFeeLamports);
  const sig = await sendRawAndConfirm(connection, tx, [walletKp]);
  const solAfter = await connection.getBalance(owner);
  const send = Math.floor((solAfter * (10000 - feeBps)) / 10000);
  if (send > MIN_TRANSFER_LAMPORTS) {
    await transferLamports(connection, walletKp, masterAddr, send, priorityFeeLamports);
  }
  return { sig, solAfter, sentToMaster: send, tokensSold: raw / 10 ** decimals };
}

export async function sweepWalletTx(
  connection: Connection,
  walletKp: Keypair,
  mint: string,
  destAddr: string,
  priorityFeeLamports?: number,
): Promise<{ tokensSwapped: number }> {
  const owner = walletKp.publicKey;
  let tokensSwapped = 0;
  if (mint) {
    const raw = await getTokenBalanceRaw(connection, owner.toBase58(), mint);
    if (raw > 0) {
      const quote = await getQuote({ inputMint: mint, outputMint: WSOL_MINT, amount: raw });
      const tx = await buildSwapTransaction(quote, owner.toBase58(), priorityFeeLamports);
      await sendRawAndConfirm(connection, tx, [walletKp]);
      tokensSwapped = raw;
    }
  }
  if (destAddr) {
    const bal = await connection.getBalance(owner);
    const send = Math.max(0, bal - Math.round(RENT_BUFFER_SOL_SWEEP * LAMPORTS_PER_SOL));
    if (send > MIN_TRANSFER_LAMPORTS) {
      await transferLamports(connection, walletKp, destAddr, send, priorityFeeLamports);
    }
  }
  return { tokensSwapped };
}

export async function buyPumpTokenTx(
  connection: Connection,
  walletKp: Keypair,
  mint: string,
  solLamports: number,
  priorityFeeLamports?: number,
): Promise<BuyResult> {
  const res = await buyPumpCoin(connection, walletKp, mint, solLamports, priorityFeeLamports);
  const quote = await getPumpBuyQuote(connection, mint, solLamports);
  const outTokens = Number(quote) / 10 ** PUMPFUN_DECIMALS;
  const inSol = solLamports / LAMPORTS_PER_SOL;
  return { sig: res.signature, avgPrice: outTokens > 0 ? inSol / outTokens : 0, spendLamports: solLamports };
}

export async function sellPumpTokenTx(
  connection: Connection,
  walletKp: Keypair,
  mint: string,
  masterAddr: string,
  feeBps: number,
  priorityFeeLamports?: number,
): Promise<SellResult> {
  const owner = walletKp.publicKey;
  const raw = await getTokenBalanceRaw(connection, owner.toBase58(), mint);
  if (raw <= 0) throw new Error('No token balance to sell');
  const res = await sellPumpCoin(connection, walletKp, mint, raw, priorityFeeLamports);
  const solAfter = await connection.getBalance(owner);
  const send = Math.floor((solAfter * (10000 - feeBps)) / 10000);
  if (send > MIN_TRANSFER_LAMPORTS) {
    await transferLamports(connection, walletKp, masterAddr, send, priorityFeeLamports);
  }
  return { sig: res.signature, solAfter, sentToMaster: send, tokensSold: raw / 10 ** PUMPFUN_DECIMALS };
}

export async function sweepWalletPumpTx(
  connection: Connection,
  walletKp: Keypair,
  mint: string,
  destAddr: string,
  priorityFeeLamports?: number,
): Promise<{ tokensSwapped: number }> {
  const owner = walletKp.publicKey;
  let tokensSwapped = 0;
  if (mint) {
    const raw = await getTokenBalanceRaw(connection, owner.toBase58(), mint);
    if (raw > 0) {
      await sellPumpCoin(connection, walletKp, mint, raw, priorityFeeLamports);
      tokensSwapped = raw;
    }
  }
  if (destAddr) {
    const bal = await connection.getBalance(owner);
    const send = Math.max(0, bal - Math.round(RENT_BUFFER_SOL_SWEEP * LAMPORTS_PER_SOL));
    if (send > MIN_TRANSFER_LAMPORTS) {
      await transferLamports(connection, walletKp, destAddr, send, priorityFeeLamports);
    }
  }
  return { tokensSwapped };
}
