'use client';

import { useWallet } from '@/hooks/useWallet';
import { useState } from 'react';

export default function WalletButton() {
  const { account, connect, loading, isCorrectNetwork, switchToSepolia } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const btnBase = 'min-h-[44px] min-w-[44px] px-4 py-2.5 rounded-lg transition-colors font-medium touch-manipulation';
  if (account && !isCorrectNetwork) {
    return (
      <button
        onClick={switchToSepolia}
        className={`${btnBase} bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700`}
      >
        Switch to Sepolia
      </button>
    );
  }

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-sm text-slate-500 bg-slate-100 px-2 py-1.5 rounded min-h-[44px] flex items-center">Sepolia</span>
        <button
          onClick={copyAddress}
          className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800`}
        >
          {copied ? 'Copied!' : `${account.slice(0, 6)}...${account.slice(-4)}`}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={loading}
      className={`${btnBase} bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-700 disabled:opacity-50`}
    >
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
