'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getPerpetualExchange, getERC20 } from '@/lib/contracts';
import { formatEther, parseEther, formatUnits } from 'ethers';
import { useWallet } from './useWallet';
import { CONFIG } from '@/lib/config';
import toast from 'react-hot-toast';

const CONTRACT_ADDRESS = CONFIG.exchangeAddress;
const COLLATERAL_TOKEN_ADDRESS = CONFIG.collateralTokenAddress;

export const usePerpetual = () => {
  const { account, provider, signer } = useWallet();
  const [markPrice, setMarkPrice] = useState<string>('0');
  const [position, setPosition] = useState<any>(null);
  const [marginRatio, setMarginRatio] = useState<string>('0');
  const [isLiquidatable, setIsLiquidatable] = useState(false);
  const [collateralBalance, setCollateralBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const contract = signer 
    ? getPerpetualExchange(CONTRACT_ADDRESS, signer)
    : provider 
    ? getPerpetualExchange(CONTRACT_ADDRESS, provider)
    : null;

  const collateralToken = signer
    ? getERC20(COLLATERAL_TOKEN_ADDRESS, signer)
    : provider
    ? getERC20(COLLATERAL_TOKEN_ADDRESS, provider)
    : null;

  const fetchMarkPrice = useCallback(async () => {
    if (!contract) return;
    try {
      const price = await contract.getMarkPrice();
      setMarkPrice(formatUnits(price, 8)); // Chainlink uses 8 decimals
    } catch (error) {
      console.error('Error fetching mark price:', error);
    }
  }, [contract]);

  const fetchPosition = useCallback(async () => {
    if (!contract || !account) return;
    try {
      const [size, entryPrice, margin, lastUpdatedAt] = await contract.getPosition(account);
      const ratio = await contract.getMarginRatio(account);
      const liquidatable = await contract.isLiquidatable(account);
      
      if (size === BigInt(0)) {
        setPosition(null);
        setMarginRatio('0');
        setIsLiquidatable(false);
        return;
      }
      const sizeFormatted = formatEther(size >= BigInt(0) ? size : -size);
      setPosition({
        size: sizeFormatted,
        sizeRaw: size.toString(),
        isLong: size >= BigInt(0),
        entryPrice: formatUnits(entryPrice, 8),
        margin: formatEther(margin),
        lastUpdatedAt: lastUpdatedAt.toString(),
      });
      setMarginRatio((Number(ratio) / 100).toFixed(2));
      setIsLiquidatable(liquidatable);
    } catch (error) {
      console.error('Error fetching position:', error);
    }
  }, [contract, account]);

  const fetchCollateralBalance = useCallback(async () => {
    if (!collateralToken || !account) return;
    try {
      const balance = await collateralToken.balanceOf(account);
      setCollateralBalance(formatEther(balance));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, [collateralToken, account]);

  useEffect(() => {
    if (contract) {
      fetchMarkPrice();
      const interval = setInterval(fetchMarkPrice, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [contract, fetchMarkPrice]);

  useEffect(() => {
    if (account) {
      fetchPosition();
      fetchCollateralBalance();
      const interval = setInterval(() => {
        fetchPosition();
        fetchCollateralBalance();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [account, fetchPosition, fetchCollateralBalance]);

  const approveCollateral = async (amount: string) => {
    if (!collateralToken || !signer) throw new Error('Wallet not connected');
    try {
      const tx = await collateralToken.approve(CONTRACT_ADDRESS, parseEther(amount));
      await tx.wait();
      toast.success('Approval successful');
      return tx;
    } catch (error: any) {
      toast.error(error.reason || 'Approval failed');
      throw error;
    }
  };

  const checkAllowance = async () => {
    if (!collateralToken || !account) return '0';
    try {
      const allowance = await collateralToken.allowance(account, CONTRACT_ADDRESS);
      return formatEther(allowance);
    } catch (error) {
      return '0';
    }
  };

  const openPosition = async (isLong: boolean, sizeAbs: string, marginAmount: string) => {
    if (!contract || !signer) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      // Check and approve if needed
      const allowance = await checkAllowance();
      if (Number(allowance) < Number(marginAmount)) {
        toast.loading('Approving tokens...');
        await approveCollateral(marginAmount);
      }

      const tx = await contract.openPosition(isLong, parseEther(sizeAbs), parseEther(marginAmount));
      toast.loading('Opening position...');
      await tx.wait();
      toast.success('Position opened successfully!');
      await fetchPosition();
      await fetchCollateralBalance();
      return tx;
    } catch (error: any) {
      toast.error(error.reason || 'Failed to open position');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const closePosition = async (sizeToClose: string) => {
    if (!contract || !signer) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const tx = await contract.closePosition(parseEther(sizeToClose));
      toast.loading('Closing position...');
      await tx.wait();
      toast.success('Position closed successfully!');
      await fetchPosition();
      await fetchCollateralBalance();
      return tx;
    } catch (error: any) {
      toast.error(error.reason || 'Failed to close position');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addMargin = async (amount: string) => {
    if (!contract || !signer) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const allowance = await checkAllowance();
      if (Number(allowance) < Number(amount)) {
        await approveCollateral(amount);
      }

      const tx = await contract.addMargin(parseEther(amount));
      toast.loading('Adding margin...');
      await tx.wait();
      toast.success('Margin added successfully!');
      await fetchPosition();
      await fetchCollateralBalance();
      return tx;
    } catch (error: any) {
      toast.error(error.reason || 'Failed to add margin');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeMargin = async (amount: string) => {
    if (!contract || !signer) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const tx = await contract.removeMargin(parseEther(amount));
      toast.loading('Removing margin...');
      await tx.wait();
      toast.success('Margin removed successfully!');
      await fetchPosition();
      await fetchCollateralBalance();
      return tx;
    } catch (error: any) {
      toast.error(error.reason || 'Failed to remove margin');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const calculateMaxPosition = async (marginAmount: string, leverage: number) => {
    if (!contract) return null;
    try {
      const [maxSize, maxNotional, requiredMargin] = await contract.calculateMaxPositionSize(
        parseEther(marginAmount),
        leverage
      );
      return {
        maxSize: formatEther(maxSize),
        maxNotional: formatEther(maxNotional),
        requiredMargin: formatEther(requiredMargin),
      };
    } catch (error) {
      console.error('Error calculating max position:', error);
      return null;
    }
  };

  const calculateRequiredMargin = async (sizeAbs: string, leverage: number) => {
    if (!contract) return null;
    try {
      const [requiredMargin, notional] = await contract.calculateRequiredMargin(
        parseEther(sizeAbs),
        leverage
      );
      return {
        requiredMargin: formatEther(requiredMargin),
        notional: formatEther(notional),
      };
    } catch (error) {
      console.error('Error calculating required margin:', error);
      return null;
    }
  };

  return {
    markPrice,
    position,
    marginRatio,
    isLiquidatable,
    collateralBalance,
    loading,
    openPosition,
    closePosition,
    addMargin,
    removeMargin,
    calculateMaxPosition,
    calculateRequiredMargin,
    approveCollateral,
    checkAllowance,
    refresh: () => {
      fetchMarkPrice();
      fetchPosition();
      fetchCollateralBalance();
    },
  };
};
