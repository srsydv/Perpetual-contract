'use client';

import { useState, useEffect } from 'react';
import { usePerpetual } from '@/hooks/usePerpetual';
import { parseEther, formatEther } from 'ethers';
import toast from 'react-hot-toast';

/** Display COLL/margin in human form; if value looks like raw wei (>1e15), format it. */
function displayColl(value: string | null | undefined): string {
  if (value == null || value === '') return '0';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n >= 1e15) return formatEther(BigInt(Math.round(n)));
  return n.toFixed(4);
}

/** Ensure margin is human-readable; contract returns 18-decimals (wei), we show COLL. */
function toCollDisplay(value: string): string {
  if (!value || value === '') return value;
  const n = Number(value);
  if (Number.isFinite(n) && n >= 1e15) return formatEther(BigInt(Math.round(n)));
  return value;
}

export default function TradingPanel() {
  const {
    markPrice,
    priceLoadError,
    collateralBalance,
    openPosition,
    calculateRequiredMargin,
    calculateMaxPosition,
    loading,
  } = usePerpetual();

  const [isLong, setIsLong] = useState(true);
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [margin, setMargin] = useState('');
  const [requiredMargin, setRequiredMargin] = useState<string | null>(null);
  const [maxSize, setMaxSize] = useState<string | null>(null);

  useEffect(() => {
    if (margin && leverage) {
      calculateMaxPosition(margin, leverage).then((result) => {
        if (result) {
          setMaxSize(result.maxSize);
        }
      });
    }
  }, [margin, leverage, calculateMaxPosition]);

  useEffect(() => {
    if (size && leverage) {
      calculateRequiredMargin(size, leverage).then((result) => {
        if (result) {
          const marginHuman = toCollDisplay(result.requiredMargin);
          setRequiredMargin(marginHuman);
          // 8% buffer so tx doesn't revert (rounding + price move between calc and execution)
          const withBuffer = (Number(marginHuman) * 1.08).toFixed(4);
          setMargin(withBuffer);
        }
      });
    }
  }, [size, leverage, calculateRequiredMargin]);

  const marginNum = Number(margin);
  const requiredNum = requiredMargin ? Number(requiredMargin) : 0;
  const marginOk = requiredNum <= 0 || marginNum >= requiredNum * 0.99;
  // Only allow Open when we have required margin and a valid price (no stale feed)
  const canOpen = !!(
    size &&
    margin &&
    requiredNum > 0 &&
    marginOk &&
    !loading &&
    !priceLoadError &&
    Number(markPrice) > 0
  );

  const handleOpenPosition = async () => {
    if (!size || !margin) {
      toast.error('Enter position size and margin');
      return;
    }
    if (requiredNum > 0 && !marginOk) {
      toast.error(`Use at least ${requiredNum.toFixed(2)} COLL (Required). You have ${marginNum.toFixed(2)} COLL.`);
      return;
    }
    try {
      await openPosition(isLong, size, margin, leverage);
      setSize('');
      setMargin('');
    } catch (error) {
      console.error(error);
    }
  };

  const setPercentage = (percent: number) => {
    const amount = (Number(collateralBalance) * percent / 100).toFixed(4);
    setMargin(amount);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6">
      <h2 className="text-xl font-bold mb-6 text-slate-800">Open Position</h2>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setIsLong(true)}
          className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
            isLong
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setIsLong(false)}
          className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
            !isLong
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Short
        </button>
      </div>

      <div className="mb-4 p-4 bg-slate-50 rounded-xl">
        <div className="text-sm text-slate-500">Mark Price</div>
        {priceLoadError ? (
          <>
            <div className="text-lg font-semibold text-amber-700">
              {priceLoadError === 'stale' ? 'Feed stale' : 'Price unavailable'}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Keep the bot running from project root: <code className="bg-slate-200 px-1 rounded">node scripts/priceFeedBot.js</code>. If it’s already running, check the bot console for “Exchange proxy uses this feed: OK” and that it’s updating the same mock as the contract.
            </p>
          </>
        ) : (
          <div className="text-2xl font-bold text-slate-800 tabular-nums">${Number(markPrice).toFixed(2)}</div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-slate-700">Position size (ETH)</label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0.0"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 bg-white"
        />
        {maxSize && (
          <div className="text-xs text-slate-500 mt-1">Max: {Number(maxSize).toFixed(4)} ETH</div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-slate-700">Leverage: {leverage}x</label>
        <input
          type="range"
          min="1"
          max="20"
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none bg-slate-200 accent-emerald-600"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>1x</span>
          <span>20x</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Higher leverage = less margin needed for same size (max 20x).</p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-slate-700">Margin (COLL)</label>
        <input
          type="number"
          value={Number(margin) >= 1e15 ? toCollDisplay(margin) : margin}
          onChange={(e) => setMargin(e.target.value)}
          placeholder="0.0"
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 bg-white"
        />
        <div className="flex gap-2 mt-2">
          {[10, 25, 50, 100].map((percent) => (
            <button
              key={percent}
              onClick={() => setPercentage(percent)}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-slate-700"
            >
              {percent}%
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Balance: {displayColl(collateralBalance)} COLL
        </div>
        {requiredMargin && (
          <div className="text-xs text-emerald-600 mt-1">Required: {displayColl(requiredMargin)} COLL</div>
        )}
      </div>

      {size && markPrice && (
        <div className="mb-4 p-3 bg-slate-50 rounded-xl">
          <div className="text-sm text-slate-500">Notional</div>
          <div className="text-lg font-semibold text-slate-800 tabular-nums">
            ${(Number(size) * Number(markPrice)).toFixed(2)}
          </div>
        </div>
      )}

      <button
        onClick={handleOpenPosition}
        disabled={!canOpen}
        className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
          isLong ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
        } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
      >
        {loading
          ? 'Processing...'
          : requiredNum > 0 && !marginOk
            ? `Use ≥ ${requiredNum.toFixed(0)} COLL`
            : `Open ${isLong ? 'Long' : 'Short'}`}
      </button>

      <details className="mt-4 text-sm text-slate-600 border border-slate-200 rounded-xl overflow-hidden">
        <summary className="px-4 py-2 bg-slate-50 cursor-pointer font-medium">How this trade works (example)</summary>
        <div className="px-4 py-3 space-y-2 border-t border-slate-200">
          <p><strong>Example:</strong> 2 ETH long, 2x leverage, entry $2000. Notional = 2 × $2000 = $4000. Required margin = $4000 ÷ 2 = <strong>2000 COLL</strong>. You lock 2000 COLL.</p>
          <p><strong>If price goes 10% up</strong> (to $2200): PnL = (2200 − 2000) × 2 = <strong>+$400 profit</strong>. Your equity = 2000 + 400 = $2400. You can close and get margin + PnL back.</p>
          <p><strong>Same 2 ETH at 3x:</strong> Required margin = $4000 ÷ 3 ≈ <strong>1333 COLL</strong>. If price +10%, PnL still +$400; equity = 1333 + 400 = $1733. Higher leverage = less margin, same dollar PnL per move.</p>
          <p className="text-xs text-slate-500">If price drops, PnL is negative; if equity ÷ notional &lt; 5%, position can be liquidated. Always use at least the &quot;Required&quot; margin (we add a buffer when sending).</p>
        </div>
      </details>
    </div>
  );
}
