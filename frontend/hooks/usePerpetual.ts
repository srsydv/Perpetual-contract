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
  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>([]);
  const [priceLoadError, setPriceLoadError] = useState<string | null>(null);
  const [position, setPosition] = useState<any>(null);
  const [marginRatio, setMarginRatio] = useState<string>('0');
  const [isLiquidatable, setIsLiquidatable] = useState(false);
  const [collateralBalance, setCollateralBalance] = useState<string>('0');
  const [loading, setLoading] = useState(false);

  const MAX_PRICE_POINTS = 120; // ~6 min at 3s interval

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

  const PRICE_FETCH_TIMEOUT_MS = 12000;
  const STALE_PRICE_ERROR_SELECTOR = '0x19abf40e'; // StalePrice() from contract

  const fetchMarkPrice = useCallback(async () => {
    if (!contract) return;
    try {
      setPriceLoadError(null);
      const price = await Promise.race([
        contract.getMarkPrice(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), PRICE_FETCH_TIMEOUT_MS)
        ),
      ]);
      const priceStr = formatUnits(price, 8);
      const priceNum = Number(priceStr);
      setMarkPrice(priceStr);
      setPriceHistory((prev) => {
        // Only add a point when price changed so the chart shows steps (bot updates ~15s), not a flat line
        const last = prev[prev.length - 1];
        if (last != null && last.price === priceNum) return prev;
        const next = [...prev, { time: Date.now(), price: priceNum }];
        return next.length > MAX_PRICE_POINTS ? next.slice(-MAX_PRICE_POINTS) : next;
      });
      sessionStorage.removeItem('priceErrorLogged');
    } catch (error: any) {
      const data = error?.data ?? error?.info?.error?.data ?? '';
      const msg = String(error?.reason ?? error?.message ?? error?.code ?? '');
      const isStale =
        data === STALE_PRICE_ERROR_SELECTOR ||
        /StalePrice|0x19abf40e/i.test(String(data)) ||
        /stale|revert|timeout/i.test(msg);
      setPriceLoadError(isStale ? 'stale' : 'error');
      setMarkPrice('0');
      // Log only once per session for same error to avoid flooding console (2081+ errors)
      if (!sessionStorage.getItem('priceErrorLogged')) {
        sessionStorage.setItem('priceErrorLogged', '1');
        console.warn(
          isStale
            ? 'Price feed stale: keep node scripts/priceFeedBot.js running from project root (same feed as contract).'
            : 'Error fetching mark price:',
          error
        );
      }
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
    if (!contract) return;
    fetchMarkPrice();
    // When price is stale, poll every 30s to avoid hammering the node and flooding console
    const intervalMs = priceLoadError === 'stale' ? 30000 : 3000;
    const interval = setInterval(fetchMarkPrice, intervalMs);
    return () => clearInterval(interval);
  }, [contract, fetchMarkPrice, priceLoadError]);

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

  /** Normalize to human COLL; values >= 1e15 are treated as wei. */
  const toHumanMargin = (val: string | number): number => {
    const n = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(n)) return 0;
    if (n >= 1e15) return n / 1e18; // wei -> human
    return n;
  };

  const PRICE_DECIMALS = BigInt(8);
  const MAX_LEVERAGE = BigInt(20);
  const TEN_8 = BigInt(10) ** BigInt(8);

  const openPosition = async (isLong: boolean, sizeAbs: string, marginAmount: string, leverage: number) => {
    if (!contract || !signer || !account) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const userMarginNum = toHumanMargin(marginAmount);
      const sizeWei = parseEther(sizeAbs);

      // Re-fetch required margin at send time (tests use fixed mock price; live price can move)
      const fresh = await calculateRequiredMargin(sizeAbs, leverage);
      const freshRequired = fresh ? toHumanMargin(fresh.requiredMargin) : 0;
      // Use 1.5x buffer so price move between read and tx doesn't cause ExceedsMaxLeverage
      const safeMarginNewOnly = freshRequired > 0
        ? Math.max(userMarginNum * 1.15, freshRequired * 1.5)
        : userMarginNum * 1.15;
      const safeMarginHuman = safeMarginNewOnly >= 1e15 ? safeMarginNewOnly / 1e18 : safeMarginNewOnly;
      let marginWithBuffer = safeMarginHuman.toFixed(6);

      // If user has an existing position in the same direction, contract checks COMBINED position
      const [pos, price] = await Promise.all([
        contract.getPosition(account),
        contract.getMarkPrice(),
      ]);
      const existingSize = pos[0];
      const entryPrice = pos[1];
      const existingMarginWei = pos[2];
      const zero = BigInt(0);
      const sameDirection =
        (isLong && existingSize > zero) || (!isLong && existingSize < zero);
      if (sameDirection && existingSize !== zero) {
        const currentSizeAbs = existingSize < zero ? -existingSize : existingSize;
        const currentNotional = (currentSizeAbs * entryPrice) / TEN_8;
        const newNotional = (sizeWei * price) / TEN_8;
        const totalNotional = currentNotional + newNotional;
        const requiredTotalMarginWei = totalNotional / MAX_LEVERAGE;
        const marginToAddWei = requiredTotalMarginWei > existingMarginWei
          ? requiredTotalMarginWei - existingMarginWei
          : zero;
        if (marginToAddWei > zero) {
          const marginToAddWithBuffer = (marginToAddWei * BigInt(120)) / BigInt(100);
          const marginFromBuffer = parseEther(marginWithBuffer);
          const marginWeiRequired = marginToAddWithBuffer > marginFromBuffer
            ? marginToAddWithBuffer
            : marginFromBuffer;
          marginWithBuffer = formatEther(marginWeiRequired);
        }
      }

      const marginWei = parseEther(marginWithBuffer);

      const allowance = await checkAllowance();
      if (Number(allowance) < Number(marginWithBuffer)) {
        toast.loading('Approving tokens...');
        await approveCollateral(marginWithBuffer);
      }

      const tx = await contract.openPosition(isLong, sizeWei, marginWei);
      toast.loading('Opening position...');
      await tx.wait();
      toast.success('Position opened successfully!');
      await fetchPosition();
      await fetchCollateralBalance();
      return tx;
    } catch (error: any) {
      const data = error?.data ?? error?.info?.error?.data;
      const msg = error?.reason ?? error?.message ?? '';
      const isExceedsLeverage = data === '0x6979bd5a' || /ExceedsMaxLeverage|6979bd5a/i.test(msg || String(data));
      if (isExceedsLeverage) {
        toast.error('Margin too low: price may have moved. Use at least Required margin (we add 15% when sending). Try again or reduce size.');
      } else {
        toast.error(error.reason || 'Failed to open position');
      }
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
      const [requiredMarginRaw, notionalRaw] = await contract.calculateRequiredMargin(
        parseEther(sizeAbs),
        leverage
      );
      return {
        requiredMargin: formatEther(requiredMarginRaw),
        notional: formatEther(notionalRaw),
      };
    } catch (error) {
      console.error('Error calculating required margin:', error);
      return null;
    }
  };

  return {
    markPrice,
    priceHistory,
    priceLoadError,
    hasContract: !!contract,
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
