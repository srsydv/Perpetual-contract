import { ethers } from 'ethers';
import { CONFIG } from '@/lib/config';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const connectWallet = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  return { provider, signer, address };
};

export const getProvider = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return new ethers.JsonRpcProvider(CONFIG.rpcUrl);
};

export const formatEther = (value: bigint) => {
  return ethers.formatEther(value);
};

export const parseEther = (value: string) => {
  return ethers.parseEther(value);
};

export const formatUnits = (value: bigint, decimals: number = 18) => {
  return ethers.formatUnits(value, decimals);
};

export const parseUnits = (value: string, decimals: number = 18) => {
  return ethers.parseUnits(value, decimals);
};
