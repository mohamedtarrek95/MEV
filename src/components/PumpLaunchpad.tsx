import { useState, type ReactNode } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { Spinner } from './Spinner';
import { ProgressBar } from './ProgressBar';
import { MemeCoinCard } from './MemeCoinCard';

const inputCls =
  'w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30';

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

export function PumpLaunchpad({ api }: { api: BundleApi }) {
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buyAmount, setBuyAmount] = useState(0.1);

  const canLaunch = !api.busy && name.trim().length > 0 && ticker.trim().length > 0 && buyAmount > 0;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="mb-1 font-mono text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Meme Coin Creation (Pump.fun)
      </h2>
      <p className="mb-5 text-xs text-zinc-600">
        Creates a token on Pump.fun using the connected wallet, then bundle-buys with every funded
        bundle wallet. Program ID:{' '}
        <span className="font-mono text-zinc-500">6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P</span>
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Coin Name">
          <input
            value={name}
            placeholder="e.g. DogeKiller"
            maxLength={32}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Coin Ticker (max 10 chars)">
          <input
            value={ticker}
            placeholder="e.g. DKILL"
            maxLength={10}
            spellCheck={false}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className={inputCls}
          />
        </Field>

        <Field label="Coin Description (optional)">
          <input
            value={description}
            placeholder="Short description of your meme coin"
            onChange={(e) => setDescription(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Coin Image URL (optional – upload or link)">
          <input
            value={imageUrl}
            placeholder="https://.../image.png"
            spellCheck={false}
            onChange={(e) => setImageUrl(e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Initial Buy Amount (SOL) – master buys its own coin">
          <input
            type="number"
            min="0"
            step="0.01"
            value={buyAmount}
            onChange={(e) => setBuyAmount(parseFloat(e.target.value) || 0)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() =>
            void api.launchMemeCoin(name, ticker, description, imageUrl, buyAmount)
          }
          disabled={!canLaunch}
          className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {api.busy ? <Spinner className="h-4 w-4" /> : null}
          Launch Meme Coin &amp; Bundle Buy
        </button>
        {api.activeMemeCoin && !api.busy ? (
          <span className="text-xs text-zinc-500">
            Active coin: <span className="font-mono text-cyan-400">{api.activeMemeCoin.ticker}</span> —{' '}
            {api.wallets.filter((w) => w.funded).length} funded wallets will buy it
          </span>
        ) : null}
      </div>

      {api.pumpProgress && (
        <div className="mt-5">
          {api.pumpProgress.total > 0 ? (
            <ProgressBar
              value={api.pumpProgress.current}
              max={api.pumpProgress.total}
              label={api.pumpProgress.label}
            />
          ) : (
            <div className="inline-flex items-center gap-2 rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/30 px-4 py-2 text-xs font-mono text-fuchsia-200">
              <Spinner className="h-3.5 w-3.5" />
              {api.pumpProgress.label}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-zinc-800 pt-5">
        <h3 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Active Meme Coin
        </h3>
        {api.activeMemeCoin ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <MemeCoinCard coin={api.activeMemeCoin} />
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Launch Summary
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-zinc-600">Name</div>
                  <div className="font-mono text-zinc-300">{api.activeMemeCoin.name}</div>
                </div>
                <div>
                  <div className="text-zinc-600">Ticker</div>
                  <div className="font-mono text-zinc-300">{api.activeMemeCoin.ticker}</div>
                </div>
                <div>
                  <div className="text-zinc-600">Mint</div>
                  <div className="truncate font-mono text-zinc-300">{api.activeMemeCoin.mintAddress}</div>
                </div>
                <div>
                  <div className="text-zinc-600">Token Mint (tracked)</div>
                  <div className="truncate font-mono text-zinc-300">
                    {api.tokenMint === api.activeMemeCoin.mintAddress ? 'Active bundle token' : '—'}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
                Selling all tokens while this coin is active uses the Pump.fun bonding-curve sell
                logic instead of Jupiter. Sells send SOL (minus a {50 / 100}% fee) to the master
                wallet.
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 py-10 text-center text-sm text-zinc-600">
            No coin launched yet. Fill in the form above and hit &quot;Launch Meme Coin &amp; Bundle
            Buy&quot;.
          </div>
        )}
      </div>
    </section>
  );
}
