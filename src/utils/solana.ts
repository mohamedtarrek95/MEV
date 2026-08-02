import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import type { BundleWallet } from '../types';

const envRpc = (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined)?.trim();

export const DEFAULT_RPC =
  envRpc || 'https://mainnet.helius-rpc.com/?api-key=8f5ecd9c-6e46-42dc-9691-f807e5f89558';
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

const DEPRECATED_RPCS = ['api.mainnet-beta.solana.com', 'solana-rpc.publicnode.com'];

export function isDeprecatedRpc(rpc: string): boolean {
  return DEPRECATED_RPCS.some((d) => rpc.includes(d));
}

// Logs every JSON-RPC request (URL, headers, body) and converts HTTP error
// responses into a descriptive error instead of a raw fetch failure.
export async function rpcFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  console.log(
    `[rpc] POST ${url}\n  headers: ${JSON.stringify(init?.headers ?? {})}\n  body: ${String(init?.body ?? '')}`,
  );
  const res = await fetch(input, init);
  if (res.status >= 400 && res.status !== 429) {
    let text = '';
    try {
      text = await res.clone().text();
    } catch {
      /* ignore */
    }
    console.error(
      `[rpc] ${url} rejected: HTTP ${res.status} ${res.statusText}${text ? `\n  body: ${text.slice(0, 500)}` : ''}`,
    );
    throw new Error(
      `RPC endpoint rejected the request (HTTP ${res.status}${res.statusText ? ' ' + res.statusText : ''})`,
    );
  }
  return res;
}

export function connectionFor(rpc: string): Connection {
  const connection = new Connection(rpc, { commitment: 'confirmed', fetch: rpcFetch });
  console.log('Using Solana RPC:', connection.rpcEndpoint);
  return connection;
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
