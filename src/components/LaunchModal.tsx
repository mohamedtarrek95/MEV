import { useState, type ReactNode } from 'react';
import type { BundleApi } from '../hooks/useBundle';
import { Spinner } from './Spinner';

const inputCls =
  'w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed';

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

export interface LaunchModalData {
  name: string;
  ticker: string;
  description: string;
  imageUrl: string;
  buyAmount: number;
}

interface LaunchModalProps {
  open: boolean;
  title?: string;
  initialData?: Partial<LaunchModalData>;
  busy: boolean;
  onLaunch: (data: LaunchModalData) => void;
  onCancel: () => void;
}

export function LaunchModal({
  open,
  title = 'Launch Meme Coin',
  initialData,
  busy,
  onLaunch,
  onCancel,
}: LaunchModalProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [ticker, setTicker] = useState(initialData?.ticker ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? '');
  const [buyAmount, setBuyAmount] = useState(initialData?.buyAmount ?? 0.1);

  const canLaunch = !busy && name.trim().length > 0 && ticker.trim().length > 0 && buyAmount > 0;

  const handleLaunch = () => {
    if (!canLaunch) return;
    onLaunch({
      name: name.trim(),
      ticker: ticker.trim().toUpperCase(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      buyAmount,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-cyan-500/30 bg-zinc-900 p-6 shadow-2xl">
        <h3 className="font-mono text-lg font-bold text-cyan-400">{title}</h3>

        <div className="mt-5 grid gap-4">
          <Field label="Coin Name">
            <input
              value={name}
              placeholder="e.g. DogeMoon"
              maxLength={32}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              className={inputCls}
            />
          </Field>

          <Field label="Ticker Symbol (max 10)">
            <input
              value={ticker}
              placeholder="e.g. DOGEM"
              maxLength={10}
              spellCheck={false}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              disabled={busy}
              className={inputCls}
            />
          </Field>

          <Field label="Description (optional)">
            <textarea
              value={description}
              placeholder="Short description of your meme coin"
              rows={3}
              maxLength={500}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              className={`${inputCls} resize-none`}
            />
          </Field>

          <Field label="Image URL (optional)">
            <input
              value={imageUrl}
              placeholder="https://.../image.png"
              spellCheck={false}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={busy}
              className={inputCls}
            />
            {imageUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-[10px] text-zinc-600">Preview</span>
              </div>
            )}
          </Field>

          <Field label="Initial Buy Amount (SOL)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={buyAmount}
              onChange={(e) => setBuyAmount(parseFloat(e.target.value) || 0)}
              disabled={busy}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={!canLaunch}
            className="inline-flex items-center gap-2 rounded-md bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Spinner className="h-4 w-4" /> : null}
            Launch Now
          </button>
        </div>
      </div>
    </div>
  );
}
