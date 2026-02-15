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
  const { markPrice, priceHistory, priceLoadError, hasContract } = usePerpetual();

  const data = priceHistory.map(({ time, price }) => ({
    time,
    price: Math.round(price * 100) / 100,
    label: formatTime(time),
  }));

  const currentPrice = Number(markPrice);
  const minP = data.length ? Math.min(...data.map((d) => d.price)) : currentPrice;
  const maxP = data.length ? Math.max(...data.map((d) => d.price)) : currentPrice;
  // Use a tight minimum range (~0.15%) so small price moves from the bot are visible on the chart
  const minRange = currentPrice * 0.0015;
  const range = Math.max(maxP - minP, minRange);
  const pad = range * 0.1;
  const domain = [minP - pad, maxP + pad];

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">ETH/USD Mark Price</h2>
          <span className="text-xs sm:text-sm text-slate-500">From contract · updates every 3s</span>
        </div>
        <div className="h-[220px] sm:h-[280px] flex flex-col items-center justify-center text-slate-600 bg-slate-50 rounded-xl px-3 sm:px-4">
          {priceLoadError === 'stale' || priceLoadError === 'error' ? (
            <>
              <p className="font-medium text-amber-700 mb-2">
                {priceLoadError === 'stale' ? 'Price feed is stale' : 'Could not load price'}
              </p>
              <p className="text-sm text-center max-w-md mb-2">
                Run the price feed bot from project root so the contract’s mock is updated within 1 hour:
              </p>
              <p className="text-xs text-center text-slate-500 max-w-md">
                <code className="bg-slate-200 px-1 py-0.5 rounded">node scripts/priceFeedBot.js</code>
              </p>
              <p className="text-xs text-center text-slate-500 max-w-md mt-1">
                If the bot is already running, check its console for “Exchange proxy uses this feed: OK”. If it says WARNING, set MOCK_PRICE_FEED_ADDRESS in .env to the feed the exchange uses.
              </p>
            </>
          ) : !hasContract ? (
            <p className="text-center">Connecting to Sepolia… Refresh the page if this persists.</p>
          ) : (
            <>
              <p className="mb-2">Loading price from contract…</p>
              <p className="text-xs text-slate-600">No price? Run <code className="bg-slate-200 px-1 py-0.5 rounded">node scripts/priceFeedBot.js</code> from project root.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-4 sm:p-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 mb-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-800">ETH/USD Mark Price</h2>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-xs sm:text-sm text-slate-500">Live from contract</span>
          <span className="text-lg sm:text-xl font-bold text-slate-800 tabular-nums">${currentPrice.toFixed(2)}</span>
        </div>
      </div>
      <div className="h-[220px] sm:h-[280px] w-full min-h-0">
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
      <p className="text-xs text-slate-400 mt-2 break-words">
        Chart from getMarkPrice() every 3s · same price for open/close
      </p>
    </div>
  );
}
