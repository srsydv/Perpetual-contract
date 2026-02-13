'use client';

import { useWallet } from '@/hooks/useWallet';
import { useState } from 'react';

export default function WalletButton() {
  const { account, connect, loading } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={copyAddress}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
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
      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
