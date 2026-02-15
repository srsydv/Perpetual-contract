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

  if (account && !isCorrectNetwork) {
    return (
      <button
        onClick={switchToSepolia}
        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
      >
        Switch to Sepolia
      </button>
    );
  }

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">Sepolia</span>
        <button
          onClick={copyAddress}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
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
      className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors font-medium"
    >
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
