'use client';

import { useState, useEffect } from 'react';
import { usePerpetual } from '@/hooks/usePerpetual';
import { parseEther, formatEther } from 'ethers';

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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Open Position</h2>

      {/* Long/Short Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setIsLong(true)}
          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
            isLong
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Long
        </button>
        <button
          onClick={() => setIsLong(false)}
          className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
            !isLong
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Short
        </button>
      </div>

      {/* Current Price */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">Mark Price</div>
        <div className="text-2xl font-bold">${Number(markPrice).toFixed(2)}</div>
      </div>

      {/* Position Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Position Size (ETH)</label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="0.0"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {maxSize && (
          <div className="text-xs text-gray-500 mt-1">
            Max: {Number(maxSize).toFixed(4)} ETH
          </div>
        )}
      </div>

      {/* Leverage */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Leverage: {leverage}x
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1x</span>
          <span>20x</span>
        </div>
      </div>

      {/* Margin */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Margin Amount</label>
        <input
          type="number"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
          placeholder="0.0"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="flex gap-2 mt-2">
          {[10, 25, 50, 100].map((percent) => (
            <button
              key={percent}
              onClick={() => setPercentage(percent)}
              className="flex-1 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              {percent}%
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Balance: {Number(collateralBalance).toFixed(4)} USDC
        </div>
        {requiredMargin && (
          <div className="text-xs text-blue-600 mt-1">
            Required: {Number(requiredMargin).toFixed(4)} USDC
          </div>
        )}
      </div>

      {/* Notional Value */}
      {size && markPrice && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-gray-600">Notional Value</div>
          <div className="text-lg font-semibold">
            ${(Number(size) * Number(markPrice)).toFixed(2)}
          </div>
        </div>
      )}

      {/* Open Position Button */}
      <button
        onClick={handleOpenPosition}
        disabled={loading || !size || !margin}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
          isLong
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? 'Processing...' : `Open ${isLong ? 'Long' : 'Short'} Position`}
      </button>
    </div>
  );
}
