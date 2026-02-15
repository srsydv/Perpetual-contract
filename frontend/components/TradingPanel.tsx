'use client';

import { useState, useEffect } from 'react';
import { usePerpetual } from '@/hooks/usePerpetual';
import { parseEther } from 'ethers';

export default function TradingPanel() {
  const {
    markPrice,
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
          setRequiredMargin(result.requiredMargin);
          setMargin(result.requiredMargin);
        }
      });
    }
  }, [size, leverage, calculateRequiredMargin]);

  const handleOpenPosition = async () => {
    if (!size || !margin) {
      alert('Please enter size and margin');
      return;
    }
    try {
      await openPosition(isLong, size, margin);
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
        <div className="text-2xl font-bold text-slate-800 tabular-nums">${Number(markPrice).toFixed(2)}</div>
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
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-slate-700">Margin (COLL)</label>
        <input
          type="number"
          value={margin}
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
          Balance: {Number(collateralBalance).toFixed(4)} COLL
        </div>
        {requiredMargin && (
          <div className="text-xs text-emerald-600 mt-1">Required: {Number(requiredMargin).toFixed(4)} COLL</div>
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
        disabled={loading || !size || !margin}
        className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
          isLong ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
        } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
      >
        {loading ? 'Processing...' : `Open ${isLong ? 'Long' : 'Short'}`}
      </button>
    </div>
  );
}
