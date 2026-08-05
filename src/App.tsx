import { useState } from 'react';
import { useBundle } from './hooks/useBundle';
import type { BundleWallet } from './types';
import { MasterSetup } from './components/MasterSetup';
import { SummaryCard } from './components/SummaryCard';
import { WalletCard } from './components/WalletCard';
import { ProgressBar } from './components/ProgressBar';
import { ConfirmModal } from './components/ConfirmModal';
import { PumpLaunchpad } from './components/PumpLaunchpad';
import { LaunchRadar } from './components/LaunchRadar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { formatToken } from './utils/format';

type Tab = 'bundle' | 'pump' | 'suggest';

export default function App() {
  const b = useBundle();
  const [tab, setTab] = useState<Tab>('bundle');
  const [sweepOpen, setSweepOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BundleWallet | null>(null);

  const requestDelete = (w: BundleWallet) => {
    if (w.tokenBalance > 0 && b.tokenMint) {
      setDeleteTarget(w);
    } else {
      void b.deleteWallet(w.id, false);
    }
  };

  const tabCls = (active: boolean) =>
    `rounded-md px-4 py-2 font-mono text-sm font-semibold transition-colors ${
      active
        ? 'bg-fuchsia-600 text-white'
        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
    }`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-zinc-100">
            MEV <span className="text-emerald-400">Bundle</span> Control
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Multi-wallet Solana execution terminal</p>
        </header>

        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
          ⚠ WARNING: Bundle wallet private keys are stored in plaintext in this browser's
          localStorage and memory. Master-wallet transactions are signed by your connected wallet.
          This tool is for testing / educational use only. Never run it with funds you are not
          prepared to lose.
        </div>

        <nav className="mb-6 flex gap-2">
          <button onClick={() => setTab('bundle')} className={tabCls(tab === 'bundle')}>
            Bundle Dashboard
          </button>
          <button onClick={() => setTab('pump')} className={tabCls(tab === 'pump')}>
            Pump.fun Launchpad
          </button>
          <button onClick={() => setTab('suggest')} className={tabCls(tab === 'suggest')}>
            Launch Radar
          </button>
        </nav>

        {tab === 'bundle' ? (
          <>
            <MasterSetup api={b} onOpenSweep={() => setSweepOpen(true)} />

            <div className="mt-6">
              <SummaryCard wallets={b.wallets} price={b.price} />
            </div>

            {b.sellAllProgress && (
              <div className="mt-6">
                <ProgressBar
                  value={b.sellAllProgress.current}
                  max={b.sellAllProgress.total}
                  label={b.sellAllProgress.label}
                />
              </div>
            )}

            <section className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-zinc-400">
                  Bundle Wallets
                </h2>
                <span className="text-xs text-zinc-600">{b.wallets.length} total</span>
              </div>

              {b.wallets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 py-16 text-center text-sm text-zinc-600">
                  No wallets created yet. Connect a wallet and hit &quot;Create Bundle Wallets (N)&quot;
                  to fund and auto-buy.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {b.wallets.map((w) => (
                    <WalletCard
                      key={w.id}
                      wallet={w}
                      price={b.price}
                      disabled={b.busy}
                      onSell={b.sellWallet}
                      onDelete={requestDelete}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : tab === 'pump' ? (
          <PumpLaunchpad api={b} />
        ) : (
          <ErrorBoundary label="Launch Radar">
            <LaunchRadar />
          </ErrorBoundary>
        )}

        <ConfirmModal
          open={sweepOpen}
          title="Emergency Sell All (Bundle Sweep)"
          message={`This will sell EVERY token balance from all ${b.wallets.length} bundle wallets back to SOL and send all proceeds to:\n\n${
            b.withdrawAddr || b.masterPub
          }\n\nThis is irreversible. Proceed?`}
          confirmLabel="Sweep Everything"
          busy={b.busy}
          onCancel={() => setSweepOpen(false)}
          onConfirm={() => {
            setSweepOpen(false);
            void b.emergencySweep();
          }}
        />

        <ConfirmModal
          open={deleteTarget !== null}
          title="Delete Bundle Wallet"
          message={
            deleteTarget
              ? `Wallet #${deleteTarget.index} currently holds ${formatToken(
                  deleteTarget.tokenBalance,
                )} tokens.\n\nSell all tokens (via ${
                  b.activeMemeCoin && b.tokenMint === b.activeMemeCoin.mintAddress
                    ? 'Pump.fun bonding curve'
                    : 'Jupiter'
                }) and transfer the SOL to the master wallet before deleting?`
              : ''
          }
          confirmLabel="Sell & Delete"
          busy={b.busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            const t = deleteTarget;
            setDeleteTarget(null);
            if (t) void b.deleteWallet(t.id, true);
          }}
        />
      </div>
    </div>
  );
}
