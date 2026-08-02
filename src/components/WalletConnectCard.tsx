import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import type { BundleApi } from '../hooks/useBundle';

function networkLabel(endpoint: string): string {
  if (endpoint.includes('mainnet')) return 'Mainnet';
  if (endpoint.includes('devnet')) return 'Devnet';
  if (endpoint.includes('testnet')) return 'Testnet';
  return endpoint.replace(/^https?:\/\//, '');
}

export function WalletConnectCard({ api }: { api: BundleApi }) {
  const { publicKey, connected, wallet, connecting } = useWallet();
  const addr = publicKey?.toBase58() ?? '';
  const short = addr ? `${addr.slice(0, 5)}...${addr.slice(-4)}` : '';
  const endpoint = api.connection?.rpcEndpoint ?? '';

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Connected Wallet (Master)
          </div>
          {connected ? (
            <div className="mt-2 font-mono text-sm text-emerald-300">{short}</div>
          ) : (
            <div className="mt-2 text-sm text-zinc-500">
              {connecting ? 'Connecting...' : 'No wallet connected'}
            </div>
          )}
        </div>
        <WalletMultiButton />
      </div>
      {connected ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-600">Address</div>
            <div className="truncate font-mono text-xs text-zinc-300">{addr}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-600">SOL Balance</div>
            <div className="font-mono text-sm text-zinc-100">{api.masterSolBalance.toFixed(4)} SOL</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-600">Network</div>
            <div className="font-mono text-xs text-zinc-300">{networkLabel(endpoint)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-600">Wallet</div>
            <div className="font-mono text-xs text-zinc-300">{wallet?.adapter.name ?? '—'}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
