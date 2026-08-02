import type { BundleWallet } from '../types';
import { formatPct, formatSol } from '../utils/format';

interface Props {
  wallets: BundleWallet[];
  price: number;
}

export function SummaryCard({ wallets, price }: Props) {
  const totalInvested = wallets.reduce((sum, w) => sum + w.initialInvested, 0);
  const holdings = wallets.reduce((sum, w) => sum + w.solBalance + w.tokenBalance * price, 0);
  const returnedToMaster = wallets.reduce((sum, w) => sum + w.returnedToMaster, 0);
  const totalReturned = returnedToMaster + holdings;
  const activeWallets = wallets.filter((w) => w.funded).length;
  const netPnl = totalReturned - totalInvested;
  const netPnlPct = totalInvested > 0 ? (netPnl / totalInvested) * 100 : 0;

  const items = [
    { label: 'Total SOL Invested', value: formatSol(totalInvested) },
    { label: 'Total SOL Returned', value: formatSol(totalReturned) },
    {
      label: 'Net PNL (SOL)',
      value: `${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(4)} SOL`,
      tone: netPnl >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    {
      label: 'Net PNL (%)',
      value: formatPct(netPnlPct),
      tone: netPnlPct >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    { label: 'Active Wallets', value: `${activeWallets} / ${wallets.length}` },
  ];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Portfolio Summary
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {items.map((it) => (
          <div key={it.label} className="rounded-lg bg-zinc-950/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-600">{it.label}</div>
            <div className={`mt-1 font-mono text-sm ${it.tone ?? 'text-zinc-200'}`}>{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
