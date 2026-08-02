import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PnlSnapshot } from '../types';

export function PnlChart({ data }: { data: PnlSnapshot[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-[10px] text-zinc-600">
        Not enough history for chart
      </div>
    );
  }
  return (
    <div className="h-24 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
          <XAxis dataKey="t" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              fontSize: 12,
              fontFamily: 'monospace',
            }}
            labelFormatter={(v) => new Date(Number(v)).toLocaleTimeString()}
            formatter={(value: any) => [`${Number(value).toFixed(4)} SOL`, 'PNL']}
          />
          <Line type="monotone" dataKey="pnlSol" stroke="#34d399" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
