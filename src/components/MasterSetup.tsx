import { useState, type ReactNode } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { Spinner } from './Spinner';

const inputCls =
  'w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function btn(colors: string): string {
  return `inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${colors}`;
}

interface Props {
  api: BundleApi;
  onOpenSweep: () => void;
}

export function MasterSetup({ api, onOpenSweep }: Props) {
  const [showKey, setShowKey] = useState(false);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field label="Master Wallet Private Key (Base58)">
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={api.masterKey}
              spellCheck={false}
              autoComplete="off"
              placeholder="Enter Base58 private key..."
              onChange={(e) => {
                const v = e.target.value;
                api.setMasterKey(v);
                api.deriveFromKey(v);
              }}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="shrink-0 rounded-md border border-zinc-800 px-3 text-xs text-zinc-400 hover:bg-zinc-800"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>

        <Field label="Master Wallet Public Address">
          <input
            value={api.masterPub}
            readOnly
            placeholder="Auto-filled from private key"
            className={`${inputCls} cursor-not-allowed text-zinc-500`}
          />
        </Field>

        <Field label="RPC Endpoint">
          <input
            value={api.rpcUrl}
            spellCheck={false}
            onChange={(e) => api.setRpcUrl(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Token Mint Address">
          <input
            value={api.tokenMint}
            spellCheck={false}
            placeholder="e.g. public key of the token mint..."
            onChange={(e) => api.setTokenMint(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="SOL per Bundle Wallet (amount in SOL, e.g., 0.05)">
          <input
            type="number"
            min="0"
            step="0.001"
            value={api.solPerWallet}
            onChange={(e) => api.setSolPerWallet(parseFloat(e.target.value) || 0)}
            className={inputCls}
          />
        </Field>

        <Field label="Priority Fee (SOL, optional)">
          <input
            type="number"
            min="0"
            step="0.000001"
            value={api.priorityFee}
            onChange={(e) => api.setPriorityFee(parseFloat(e.target.value) || 0)}
            className={inputCls}
          />
        </Field>

        <Field label="Number of Wallets">
          <input
            type="number"
            min="1"
            max="30"
            value={api.walletCount}
            onChange={(e) =>
              api.setWalletCount(Math.max(1, Math.floor(parseInt(e.target.value, 10) || 1)))
            }
            className={inputCls}
          />
        </Field>

        <Field label="Withdrawal Address (sweep destination)">
          <input
            value={api.withdrawAddr}
            spellCheck={false}
            placeholder="Defaults to master address"
            onChange={(e) => api.setWithdrawAddr(e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={api.autoBuy}
              onChange={(e) => api.setAutoBuy(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Auto-buy token after funding
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-5">
        <button
          onClick={() => void api.createWallets()}
          disabled={api.busy}
          className={btn('bg-emerald-600 text-zinc-950 hover:bg-emerald-500')}
        >
          {api.busy ? <Spinner className="h-4 w-4" /> : null}
          Create Bundle Wallets (N)
        </button>
        <button
          onClick={() => void api.buyBundle()}
          disabled={api.busy || api.wallets.length === 0}
          className={btn('bg-cyan-700 text-zinc-950 hover:bg-cyan-600')}
        >
          Buy Bundle
        </button>
        <button
          onClick={() => void api.sellAll()}
          disabled={api.busy || api.wallets.length === 0}
          className={btn('bg-amber-600 text-zinc-950 hover:bg-amber-500')}
        >
          Sell All Bundles
        </button>
        <button
          onClick={onOpenSweep}
          disabled={api.busy || api.wallets.length === 0}
          className={btn('bg-red-700 text-white hover:bg-red-600')}
        >
          Emergency Sell All (Master Sweep)
        </button>
        <button
          onClick={api.reset}
          disabled={api.busy}
          className={btn('bg-zinc-800 text-zinc-200 hover:bg-zinc-700')}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
