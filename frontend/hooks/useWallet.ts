'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { connectWallet, getProvider } from '@/lib/web3';
import { CONFIG } from '@/lib/config';

export const useWallet = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    checkConnection();
    const eth = (window as any).ethereum;
    if (eth) {
      eth.on('accountsChanged', handleAccountsChanged);
      eth.on('chainChanged', () => window.location.reload());
    }
    return () => {
      if (eth) {
        eth.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      try {
        const prov = new ethers.BrowserProvider(eth);
        const accounts = await prov.listAccounts();
        const network = await prov.getNetwork();
        setChainId(Number(network.chainId));
        if (accounts.length > 0) {
          const sig = await prov.getSigner();
          setProvider(prov);
          setSigner(sig);
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

  const switchToSepolia = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CONFIG.chainId.toString(16)}` }],
      });
      window.location.reload();
    } catch (err: any) {
      if (err.code === 4902) {
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${CONFIG.chainId.toString(16)}`,
              chainName: 'Sepolia',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: [CONFIG.rpcUrl],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
        window.location.reload();
      } else {
        throw err;
      }
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
      const { provider: prov, signer: sig, address } = await connectWallet();
      setProvider(prov);
      setSigner(sig);
      setAccount(address);
      const network = await prov.getNetwork();
      setChainId(Number(network.chainId));
    } catch (error: any) {
      throw new Error(error.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const isCorrectNetwork = chainId === CONFIG.chainId;

  return { account, provider, signer, chainId, connect, loading, isCorrectNetwork, switchToSepolia };
};
