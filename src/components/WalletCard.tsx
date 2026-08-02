import { useState } from 'react';
import type { BundleWallet, WalletStatus } from '../types';
import { copyToClipboard, formatPct, formatSol, formatToken, shortAddr } from '../utils/format';
import { useToast } from './Toast';
import { Spinner } from './Spinner';
import { PnlChart } from './PnlChart';

interface Props {
  wallet: BundleWallet;
  price: number;
  disabled?: boolean;
  onSell: (w: BundleWallet) => void;
  onDelete: (w: BundleWallet) => void;
}

function StatusBadge({ status, kind }: { status: WalletStatus; kind: 'buy' | 'sell' }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-cyan-400">
        <Spinner className="h-3 w-3" />
        {kind === 'buy' ? 'buying' : 'selling'}
      </span>
    );
  }
  if (status === 'success') {
    return <span className="text-emerald-400">{kind === 'buy' ? 'Bought ✅' : 'Sold ✅'}</span>;
  }
  if (status === 'failed') {
    return <span className="text-red-400">{kind === 'buy' ? 'Buy failed' : 'Sell failed'}</span>;
  }
  return <span className="text-zinc-600">{kind === 'buy' ? 'Idle' : 'Holding'}</span>;
}

function CopyBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
      title="Copy"
    >
      copy
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-zinc-950/60 px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className="font-mono text-[11px] text-zinc-300">{value}</div>
    </div>
  );
}

export function WalletCard({ wallet: w, price, disabled, onSell, onDelete }: Props) {
  const toast = useToast();
  const [showSecret, setShowSecret] = useState(false);

  const copy = async (text: string, label: string) => {
    await copyToClipboard(text);
    toast.push('success', `${label} copied to clipboard`);
  };

  const tokenValue = w.tokenBalance * price;
  const pnl = w.returnedToMaster + w.solBalance + tokenValue - w.initialInvested;
  const pnlPct = w.initialInvested > 0 ? (pnl / w.initialInvested) * 100 : 0;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-500">#{w.index}</span>
        <StatusBadge status={w.buyStatus} kind="buy" />
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="font-mono text-sm text-emerald-400">{shortAddr(w.publicKey, 6, 6)}</span>
        <CopyBtn onClick={() => void copy(w.publicKey, 'Address')} />
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="max-w-[180px] truncate font-mono text-[10px] text-zinc-600">
          {showSecret ? w.secretKey : '••••••••••••••••••••'}
        </span>
        <button
          onClick={() => setShowSecret((s) => !s)}
          className="text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          {showSecret ? 'hide' : 'show'}
        </button>
        <CopyBtn onClick={() => void copy(w.secretKey, 'Secret key')} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat label="SOL Balance" value={formatSol(w.solBalance)} />
        <Stat label="Token Balance" value={formatToken(w.tokenBalance)} />
        <Stat
          label="Avg Buy Price"
          value={w.averageBuyPrice > 0 ? `${w.averageBuyPrice.toPrecision(6)} SOL` : '—'}
        />
        <Stat label="Token Value" value={formatSol(tokenValue)} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-zinc-500">PNL</span>
        <span className={`font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatSol(pnl)} ({formatPct(pnlPct)})
        </span>
      </div>

      <div className="mt-2">
        <PnlChart data={w.history} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusBadge status={w.sellStatus} kind="sell" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDelete(w)}
            disabled={disabled || w.sellStatus === 'pending'}
            className="rounded bg-red-600/20 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-600/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete
          </button>
          <button
            onClick={() => onSell(w)}
            disabled={disabled || w.sellStatus === 'pending' || w.tokenBalance <= 0}
            className="rounded bg-amber-600/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-600/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sell
          </button>
        </div>
      </div>

      {w.lastError && (
        <div className="mt-2 rounded bg-red-950/40 px-2 py-1 text-[10px] text-red-300">
          {w.lastError}
        </div>
      )}
    </div>
  );
}
