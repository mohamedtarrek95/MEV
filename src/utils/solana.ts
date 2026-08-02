import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import type { BundleWallet } from '../types';

export const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

export function connectionFor(rpc: string): Connection {
  return new Connection(rpc, 'confirmed');
}

export function keypairFromSecret(secretB58: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(secretB58.trim()));
}

export function encodeSecret(secret: Uint8Array): string {
  return bs58.encode(secret);
}

export function createWallet(index: number): BundleWallet {
  const kp = Keypair.generate();
  return {
    id: kp.publicKey.toBase58(),
    index,
    publicKey: kp.publicKey.toBase58(),
    secretKey: bs58.encode(kp.secretKey),
    createdAt: Date.now(),
    funded: false,
    initialInvested: 0,
    fundedTx: null,
    buyStatus: 'idle',
    buyTx: null,
    sellStatus: 'idle',
    solBalance: 0,
    tokenBalance: 0,
    tokenDecimals: 9,
    averageBuyPrice: 0,
    pnlSol: 0,
    pnlPct: 0,
    returnedToMaster: 0,
    lastError: null,
    history: [],
  };
}

export async function getSolBalance(connection: Connection, pubkey: string): Promise<number> {
  try {
    return (await connection.getBalance(new PublicKey(pubkey))) / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}

export async function getTokenDecimals(connection: Connection, mint: string): Promise<number> {
  try {
    const info = await connection.getParsedAccountInfo(new PublicKey(mint));
    const data = (
      info.value as { data?: { parsed?: { info?: { decimals?: number } } } } | null
    )?.data;
    const decimals = data?.parsed?.info?.decimals;
    return typeof decimals === 'number' ? decimals : 9;
  } catch {
    return 9;
  }
}

export async function getTokenBalanceRaw(
  connection: Connection,
  owner: string,
  mint: string,
): Promise<number> {
  try {
    const resp = await connection.getTokenAccountsByOwner(new PublicKey(owner), {
      mint: new PublicKey(mint),
    });
    if (!resp.value.length) return 0;
    const amt = (
      resp.value[0].account.data as {
        parsed?: { info?: { tokenAmount?: { amount?: string } } };
      }
    ).parsed?.info?.tokenAmount?.amount;
    return Number(amt) || 0;
  } catch {
    return 0;
  }
}

export async function getTokenBalanceUi(
  connection: Connection,
  owner: string,
  mint: string,
): Promise<number> {
  try {
    const resp = await connection.getTokenAccountsByOwner(new PublicKey(owner), {
      mint: new PublicKey(mint),
    });
    if (!resp.value.length) return 0;
    const ui = (
      resp.value[0].account.data as {
        parsed?: { info?: { tokenAmount?: { uiAmount?: number } } };
      }
    ).parsed?.info?.tokenAmount?.uiAmount;
    return typeof ui === 'number' ? ui : 0;
  } catch {
    return 0;
  }
}
