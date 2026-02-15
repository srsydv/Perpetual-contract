export const SEPOLIA_CHAIN_ID = 11155111;

// Canonical deployment (README.md lines 9-12): proxy uses mock price feed 0x8Ce022...
const DEFAULT_EXCHANGE = '0xf1d034E8b0973a3ECE2ecbAC7c62bf7664bAf330';
const DEFAULT_COLLATERAL = '0x799a5570318c0C5Fcfd09b0f573335B5aa8d85Ff';
const DEFAULT_PRICE_FEED = '0x8Ce022D3901FCc9C3944E00c612Dc5c5C7F7683F';

export const CONFIG = {
  chainId: SEPOLIA_CHAIN_ID,
  exchangeAddress:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
      ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
      : DEFAULT_EXCHANGE,
  collateralTokenAddress:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS
      ? process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS
      : DEFAULT_COLLATERAL,
  priceFeedAddress:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PRICE_FEED
      ? process.env.NEXT_PUBLIC_PRICE_FEED
      : DEFAULT_PRICE_FEED,
  collateralSymbol: 'COLL',
  rpcUrl:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RPC_URL
      ? process.env.NEXT_PUBLIC_RPC_URL
      : 'https://eth-sepolia.g.alchemy.com/v2/jROdUKjJxmz2XYwNpS5Ik',
};
