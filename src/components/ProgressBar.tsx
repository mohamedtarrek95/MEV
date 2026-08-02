interface Props {
  value: number;
  max: number;
  label?: string;
}

export function ProgressBar({ value, max, label }: Props) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-mono text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-500">
          {value} / {max}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
