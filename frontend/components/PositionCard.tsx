'use client';

import { usePerpetual } from '@/hooks/usePerpetual';
import { useState } from 'react';

export default function PositionCard() {
  const {
    position,
    markPrice,
    marginRatio,
    isLiquidatable,
    closePosition,
    addMargin,
    removeMargin,
    loading,
  } = usePerpetual();

  const [closeSize, setCloseSize] = useState('');
  const [marginAmount, setMarginAmount] = useState('');
  const [showAddMargin, setShowAddMargin] = useState(false);
  const [showRemoveMargin, setShowRemoveMargin] = useState(false);

  if (!position || Number(position.size) === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-slate-800">Your Position</h2>
        <div className="text-center py-8 sm:py-10 text-slate-500 text-sm sm:text-base">
          No open position. Open a long or short above.
        </div>
      </div>
    );
  }

  const isLong = position.isLong === true;
  const sizeAbs = Math.abs(Number(position.size));
  const pnl = isLong
    ? (Number(markPrice) - Number(position.entryPrice)) * sizeAbs
    : (Number(position.entryPrice) - Number(markPrice)) * sizeAbs;
  const pnlPercent = ((Number(markPrice) - Number(position.entryPrice)) / Number(position.entryPrice)) * 100 * (isLong ? 1 : -1);

  const handleClosePosition = async () => {
    if (!closeSize || Number(closeSize) <= 0) {
      alert('Please enter valid size to close');
      return;
    }
    try {
      await closePosition(closeSize);
      setCloseSize('');
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddMargin = async () => {
    if (!marginAmount || Number(marginAmount) <= 0) {
      alert('Please enter valid margin amount');
      return;
    }
    try {
      await addMargin(marginAmount);
      setMarginAmount('');
      setShowAddMargin(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveMargin = async () => {
    if (!marginAmount || Number(marginAmount) <= 0) {
      alert('Please enter valid margin amount');
      return;
    }
    try {
      await removeMargin(marginAmount);
      setMarginAmount('');
      setShowRemoveMargin(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-4 sm:p-6">
      <div className="flex justify-between items-center gap-2 mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800">Your Position</h2>
        <span
          className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold shrink-0 ${
            isLong ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {isLong ? 'LONG' : 'SHORT'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <div className="text-xs sm:text-sm text-slate-500">Size</div>
          <div className="text-base sm:text-lg font-semibold text-slate-800 tabular-nums break-all">{sizeAbs.toFixed(4)} ETH</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-slate-500">Entry</div>
          <div className="text-base sm:text-lg font-semibold text-slate-800 tabular-nums">${Number(position.entryPrice).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-slate-500">Margin</div>
          <div className="text-base sm:text-lg font-semibold text-slate-800 tabular-nums break-all">{Number(position.margin).toFixed(4)} COLL</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-slate-500">Mark</div>
          <div className="text-base sm:text-lg font-semibold text-slate-800 tabular-nums">${Number(markPrice).toFixed(2)}</div>
        </div>
      </div>

      <div className={`p-3 sm:p-4 rounded-xl mb-4 ${pnl >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
        <div className="text-xs sm:text-sm text-slate-500">Unrealized PnL</div>
        <div className={`text-xl sm:text-2xl font-bold tabular-nums ${pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
        </div>
      </div>

      <div className={`p-4 rounded-xl mb-4 ${isLiquidatable ? 'bg-red-50' : 'bg-slate-50'}`}>
        <div className="text-sm text-slate-500">Margin ratio</div>
        <div className={`text-xl font-bold tabular-nums ${isLiquidatable ? 'text-red-600' : 'text-slate-800'}`}>
          {marginRatio}%
        </div>
        {isLiquidatable && (
          <div className="text-sm text-red-600 mt-1">⚠️ Position is liquidatable</div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              value={closeSize}
              onChange={(e) => setCloseSize(e.target.value)}
              placeholder="Size to close (ETH)"
              className="flex-1 min-w-0 px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
            />
            <button
              type="button"
              onClick={() => setCloseSize(sizeAbs.toString())}
              className="min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl text-sm font-medium text-slate-700 touch-manipulation shrink-0"
            >
              Max
            </button>
          </div>
          <button
            type="button"
            onClick={handleClosePosition}
            disabled={loading || !closeSize}
            className="w-full min-h-[48px] py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors font-semibold touch-manipulation"
          >
            Close Position
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAddMargin(!showAddMargin);
              setShowRemoveMargin(false);
            }}
            className="flex-1 min-h-[48px] py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-colors font-semibold touch-manipulation"
          >
            Add Margin
          </button>
          <button
            type="button"
            onClick={() => {
              setShowRemoveMargin(!showRemoveMargin);
              setShowAddMargin(false);
            }}
            className="flex-1 min-h-[48px] py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 active:bg-amber-700 transition-colors font-semibold touch-manipulation"
          >
            Remove Margin
          </button>
        </div>

        {showAddMargin && (
          <div className="p-3 sm:p-4 bg-slate-50 rounded-xl">
            <input
              type="number"
              value={marginAmount}
              onChange={(e) => setMarginAmount(e.target.value)}
              placeholder="Amount (COLL)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl mb-2 bg-white min-w-0"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddMargin}
                disabled={loading || !marginAmount}
                className="flex-1 min-h-[44px] py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 font-medium touch-manipulation"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => { setShowAddMargin(false); setMarginAmount(''); }}
                className="flex-1 min-h-[44px] py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 active:bg-slate-400 font-medium touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showRemoveMargin && (
          <div className="p-3 sm:p-4 bg-slate-50 rounded-xl">
            <input
              type="number"
              value={marginAmount}
              onChange={(e) => setMarginAmount(e.target.value)}
              placeholder="Amount (COLL)"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl mb-2 bg-white min-w-0"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRemoveMargin}
                disabled={loading || !marginAmount}
                className="flex-1 min-h-[44px] py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 font-medium touch-manipulation"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => { setShowRemoveMargin(false); setMarginAmount(''); }}
                className="flex-1 min-h-[44px] py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 active:bg-slate-400 font-medium touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
