'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { getMockPriceFeed } from '@/lib/contracts';
import { CONFIG } from '@/lib/config';
import { useWallet } from '@/hooks/useWallet';
import toast from 'react-hot-toast';

const PRICE_DECIMALS = 8;

export default function MockPriceTester() {
  const { account, signer, isCorrectNetwork } = useWallet();
  const [priceInput, setPriceInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePrice = async () => {
    const price = priceInput.trim();
    if (!price || Number.isNaN(Number(price)) || Number(price) <= 0) {
      toast.error('Enter a valid price (e.g. 2100)');
      return;
    }
    if (!signer) {
      toast.error('Connect wallet first');
      return;
    }
    setLoading(true);
    try {
      const mock = getMockPriceFeed(CONFIG.priceFeedAddress, signer);
      const value8 = BigInt(Math.round(Number(price) * 10 ** PRICE_DECIMALS));
      const tx = await mock.updateAnswer(value8);
      toast.loading('Updating mock price…');
      await tx.wait();
      toast.success(`Mock price set to $${Number(price).toFixed(2)}`);
      setPriceInput('');
    } catch (e: any) {
      toast.error(e?.reason || e?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!account || !isCorrectNetwork) return null;

  return (
    <details className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden">
      <summary className="px-3 sm:px-4 py-3 min-h-[44px] cursor-pointer text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-200/50 active:bg-slate-200/70 touch-manipulation flex items-center">
        Testing: update mock price manually
      </summary>
      <div className="px-3 sm:px-4 py-3 border-t border-slate-200 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">ETH/USD price ($)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="e.g. 2100"
            className="w-24 sm:w-28 px-3 py-2 min-h-[44px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>
        <button
          type="button"
          onClick={handleUpdatePrice}
          disabled={loading}
          className="min-h-[44px] px-4 py-2 text-sm font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-700 active:bg-slate-800 disabled:opacity-50 touch-manipulation"
        >
          {loading ? 'Updating…' : 'Update price'}
        </button>
        <p className="text-xs text-slate-500 w-full mt-1 break-words">
          Updates mock feed at {CONFIG.priceFeedAddress.slice(0, 10)}… For testing only.
        </p>
      </div>
    </details>
  );
}
