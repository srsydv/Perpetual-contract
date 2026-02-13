'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { connectWallet, getProvider } from '@/lib/web3';

export const useWallet = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          setProvider(provider);
          setSigner(signer);
          setAccount(accounts[0].address);
        } else {
          setProvider(getProvider());
        }
      } catch (error) {
        console.error('Error checking connection:', error);
        setProvider(getProvider());
      }
    } else {
      setProvider(getProvider());
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null);
      setSigner(null);
    } else {
      checkConnection();
    }
  };

  const connect = async () => {
    setLoading(true);
    try {
      const { provider, signer, address } = await connectWallet();
      setProvider(provider);
      setSigner(signer);
      setAccount(address);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  return { account, provider, signer, connect, loading };
};
