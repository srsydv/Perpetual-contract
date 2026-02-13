import { ethers } from 'ethers';

export const PERPETUAL_EXCHANGE_ABI = [
  "function openPosition(bool isLong, uint256 sizeAbs, uint256 marginAmount) external",
  "function closePosition(uint256 sizeToClose) external",
  "function addMargin(uint256 amount) external",
  "function removeMargin(uint256 amount) external",
  "function liquidate(address trader) external",
  "function getPosition(address trader) external view returns (int256 size, uint256 entryPrice, uint256 margin, uint256 lastUpdatedAt)",
  "function getMarginRatio(address trader) external view returns (uint256)",
  "function isLiquidatable(address trader) external view returns (bool)",
  "function getMarkPrice() public view returns (uint256)",
  "function calculateMaxPositionSize(uint256 marginAmount, uint256 leverage) external view returns (uint256 maxSize, uint256 maxNotional, uint256 requiredMargin)",
  "function calculateRequiredMargin(uint256 sizeAbs, uint256 leverage) external view returns (uint256 requiredMargin, uint256 notional)",
  "function getActiveTradesWithHealth() external view returns (address[] memory traders, uint256[] memory healthBps)",
  "function getLiquidatableActiveTrades() external view returns (address[] memory)",
  "function activeTrades(address) external view returns (bool)",
  "event PositionOpened(address indexed trader, bool isLong, uint256 size, uint256 entryPrice, uint256 margin)",
  "event PositionClosed(address indexed trader, uint256 closeSize, uint256 exitPrice, int256 pnl)",
  "event MarginAdded(address indexed trader, uint256 amount)",
  "event MarginRemoved(address indexed trader, uint256 amount)",
  "event Liquidated(address indexed trader, address indexed liquidator, uint256 size, uint256 price)",
];

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

export const getContract = (address: string, abi: any[], signerOrProvider: ethers.Provider | ethers.Signer) => {
  return new ethers.Contract(address, abi, signerOrProvider);
};

export const getPerpetualExchange = (address: string, signerOrProvider: ethers.Provider | ethers.Signer) => {
  return getContract(address, PERPETUAL_EXCHANGE_ABI, signerOrProvider);
};

export const getERC20 = (address: string, signerOrProvider: ethers.Provider | ethers.Signer) => {
  return getContract(address, ERC20_ABI, signerOrProvider);
};
