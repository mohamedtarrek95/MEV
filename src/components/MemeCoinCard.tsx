import type { ActiveMemeCoin } from '../types';
import { copyToClipboard, shortAddr } from '../utils/format';
import { useToast } from './Toast';

export function MemeCoinCard({ coin }: { coin: ActiveMemeCoin }) {
  const toast = useToast();

  const copy = async () => {
    await copyToClipboard(coin.mintAddress);
    toast.push('success', 'Mint address copied to clipboard');
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-3">
        {coin.image ? (
          <img
            src={coin.image}
            alt={coin.name}
            className="h-10 w-10 rounded-full border border-zinc-800 object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full border border-zinc-800 bg-zinc-800" />
        )}
        <div className="min-w-0">
          <div className="font-mono text-sm font-bold text-zinc-100">
            {coin.name}{' '}
            <span className="text-cyan-400">({coin.ticker})</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-500">{shortAddr(coin.mintAddress, 6, 6)}</span>
            <button
              onClick={() => void copy()}
              className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
            >
              copy
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <iframe
          src={`https://pump.fun/coin/${coin.mintAddress}`}
          title={`${coin.name} price chart`}
          className="h-full w-full"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>

      <a
        href={`https://pump.fun/coin/${coin.mintAddress}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block text-xs text-cyan-400 hover:underline"
      >
        Open on pump.fun ↗
      </a>
    </div>
  );
}
