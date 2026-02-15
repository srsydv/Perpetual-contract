'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { getMockCollateral } from '@/lib/contracts';
import { CONFIG } from '@/lib/config';
import { useWallet } from '@/hooks/useWallet';
import toast from 'react-hot-toast';

const COLL_DECIMALS = 18;

export default function MintCollateral() {
  const { account, signer, isCorrectNetwork } = useWallet();
  const [amountInput, setAmountInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMint = async () => {
    const amount = amountInput.trim();
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Enter a valid amount (e.g. 1000)');
      return;
    }
    if (!signer || !account) {
      toast.error('Connect wallet first');
      return;
    }
    setLoading(true);
    try {
      const collateral = getMockCollateral(CONFIG.collateralTokenAddress, signer);
      const amountWei = ethers.parseUnits(amount, COLL_DECIMALS);
      const tx = await collateral.mint(account, amountWei);
      toast.loading('Minting…');
      await tx.wait();
      toast.success(`Minted ${Number(amount).toLocaleString()} ${CONFIG.collateralSymbol}`);
      setAmountInput('');
    } catch (e: unknown) {
      const err = e as { reason?: string; message?: string };
      toast.error(err?.reason || err?.message || 'Mint failed');
    } finally {
      setLoading(false);
    }
  };

  if (!account || !isCorrectNetwork) return null;

  return (
    <details className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden">
      <summary className="px-3 sm:px-4 py-3 min-h-[44px] cursor-pointer text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-200/50 active:bg-slate-200/70 touch-manipulation flex items-center">
        Testing: mint collateral ({CONFIG.collateralSymbol})
      </summary>
      <div className="px-3 sm:px-4 py-3 border-t border-slate-200 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Amount ({CONFIG.collateralSymbol})</label>
          <input
            type="number"
            step="1"
            min="1"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="e.g. 1000"
            className="w-24 sm:w-28 px-3 py-2 min-h-[44px] border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>
        <button
          type="button"
          onClick={handleMint}
          disabled={loading}
          className="min-h-[44px] px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 touch-manipulation"
        >
          {loading ? 'Minting…' : 'Mint'}
        </button>
        <p className="text-xs text-slate-500 w-full mt-1 break-words">
          Mints {CONFIG.collateralSymbol} to your wallet. For testing only.
        </p>
      </div>
    </details>
  );
}
