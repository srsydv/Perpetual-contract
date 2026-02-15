export const SEPOLIA_CHAIN_ID = 11155111;

export const CONFIG = {
  chainId: SEPOLIA_CHAIN_ID,
  exchangeAddress:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
      ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
      : '0xD9312E5D56f3fb5f7ab7096c5F75E0bd4850d7Ff',
  collateralTokenAddress:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS
      ? process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS
      : '0xb43945aF94c0F4a59b7C55258270D96dcfb77Ed7',
  collateralSymbol: 'COLL',
  rpcUrl:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RPC_URL
      ? process.env.NEXT_PUBLIC_RPC_URL
      : 'https://rpc.sepolia.org',
};
