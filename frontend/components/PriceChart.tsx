'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { usePerpetual } from '@/hooks/usePerpetual';

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function PriceChart() {
  const { markPrice, priceHistory, priceLoadError } = usePerpetual();

  const data = priceHistory.map(({ time, price }) => ({
    time,
    price: Math.round(price * 100) / 100,
    label: formatTime(time),
  }));

  const currentPrice = Number(markPrice);
  const minP = data.length ? Math.min(...data.map((d) => d.price)) : currentPrice;
  const maxP = data.length ? Math.max(...data.map((d) => d.price)) : currentPrice;
  const pad = Math.max((maxP - minP) * 0.1, currentPrice * 0.002);
  const domain = [minP - pad, maxP + pad];

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">ETH/USD Mark Price</h2>
          <span className="text-sm text-slate-500">From contract · updates every 3s</span>
        </div>
        <div className="h-[280px] flex flex-col items-center justify-center text-slate-600 bg-slate-50 rounded-xl px-4">
          {priceLoadError === 'stale' ? (
            <>
              <p className="font-medium text-amber-700 mb-2">Price feed is stale (older than 1 hour)</p>
              <p className="text-sm text-center max-w-md">
                If you use MockAggregatorV3, run once per hour:{" "}
                <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs break-all">
                  npx hardhat run scripts/updateMockPrice.js --network sepolia
                </code>
              </p>
            </>
          ) : priceLoadError ? (
            <p className="text-center">Could not load price. Check console and network (Sepolia).</p>
          ) : (
            <p>Loading price from contract...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">ETH/USD Mark Price</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Live from contract</span>
          <span className="text-xl font-bold text-slate-800 tabular-nums">${currentPrice.toFixed(2)}</span>
        </div>
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(ts) => formatTime(ts)}
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#94a3b8"
            />
            <YAxis
              domain={domain}
              tickFormatter={(v) => `$${v.toFixed(2)}`}
              tick={{ fontSize: 11, fill: '#64748b' }}
              stroke="#94a3b8"
              width={56}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: 'none',
                borderRadius: '12px',
                color: '#f1f5f9',
              }}
              labelFormatter={(ts) => formatTime(ts)}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={300}
            />
            <ReferenceDot
              x={data[data.length - 1]?.time}
              y={data[data.length - 1]?.price}
              r={4}
              fill="#059669"
              stroke="#fff"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Chart built from contract getMarkPrice() every 3s · same price used for opening/closing positions
      </p>
    </div>
  );
}
