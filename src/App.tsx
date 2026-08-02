import { useState } from 'react';
import { useBundle } from './hooks/useBundle';
import { MasterSetup } from './components/MasterSetup';
import { SummaryCard } from './components/SummaryCard';
import { WalletCard } from './components/WalletCard';
import { ProgressBar } from './components/ProgressBar';
import { ConfirmModal } from './components/ConfirmModal';

export default function App() {
  const b = useBundle();
  const [sweepOpen, setSweepOpen] = useState(false);

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
          ⚠ WARNING: Private keys are stored in plaintext in this browser's localStorage and memory.
          This tool is for testing / educational use only. Never run it with funds you are not
          prepared to lose.
        </div>

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
              No wallets created yet. Enter a master key and hit &quot;Create Bundle Wallets
              (N)&quot;.
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
                />
              ))}
            </div>
          )}
        </section>

        <ConfirmModal
          open={sweepOpen}
          title="Emergency Sell All (Master Sweep)"
          message={`This will use the MASTER private key to sell EVERY token balance from all ${b.wallets.length} bundle wallets (and the master wallet itself) back to SOL and send all proceeds to:\n\n${
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
      </div>
    </div>
  );
}
