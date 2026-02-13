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

  if (!position || position.size === '0') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Your Position</h2>
        <div className="text-center py-8 text-gray-500">
          No open position
        </div>
      </div>
    );
  }

  const isLong = Number(position.size) > 0;
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Your Position</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            isLong ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {isLong ? 'LONG' : 'SHORT'}
        </span>
      </div>

      {/* Position Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-600">Size</div>
          <div className="text-lg font-semibold">{sizeAbs.toFixed(4)} ETH</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Entry Price</div>
          <div className="text-lg font-semibold">${Number(position.entryPrice).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Margin</div>
          <div className="text-lg font-semibold">{Number(position.margin).toFixed(4)} USDC</div>
        </div>
        <div>
          <div className="text-sm text-gray-600">Mark Price</div>
          <div className="text-lg font-semibold">${Number(markPrice).toFixed(2)}</div>
        </div>
      </div>

      {/* PnL */}
      <div className={`p-4 rounded-lg mb-4 ${pnl >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="text-sm text-gray-600">Unrealized PnL</div>
        <div className={`text-2xl font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
        </div>
      </div>

      {/* Margin Ratio */}
      <div className={`p-4 rounded-lg mb-4 ${isLiquidatable ? 'bg-red-50' : 'bg-blue-50'}`}>
        <div className="text-sm text-gray-600">Margin Ratio</div>
        <div className={`text-xl font-bold ${isLiquidatable ? 'text-red-600' : 'text-blue-600'}`}>
          {marginRatio}%
        </div>
        {isLiquidatable && (
          <div className="text-sm text-red-600 mt-1">⚠️ Position is liquidatable!</div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Close Position */}
        <div>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              value={closeSize}
              onChange={(e) => setCloseSize(e.target.value)}
              placeholder="Size to close (ETH)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => setCloseSize(sizeAbs.toString())}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              Max
            </button>
          </div>
          <button
            onClick={handleClosePosition}
            disabled={loading || !closeSize}
            className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            Close Position
          </button>
        </div>

        {/* Add/Remove Margin */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowAddMargin(!showAddMargin);
              setShowRemoveMargin(false);
            }}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Add Margin
          </button>
          <button
            onClick={() => {
              setShowRemoveMargin(!showRemoveMargin);
              setShowAddMargin(false);
            }}
            className="flex-1 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Remove Margin
          </button>
        </div>

        {showAddMargin && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <input
              type="number"
              value={marginAmount}
              onChange={(e) => setMarginAmount(e.target.value)}
              placeholder="Amount (USDC)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddMargin}
                disabled={loading || !marginAmount}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowAddMargin(false);
                  setMarginAmount('');
                }}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showRemoveMargin && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <input
              type="number"
              value={marginAmount}
              onChange={(e) => setMarginAmount(e.target.value)}
              placeholder="Amount (USDC)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleRemoveMargin}
                disabled={loading || !marginAmount}
                className="flex-1 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowRemoveMargin(false);
                  setMarginAmount('');
                }}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
