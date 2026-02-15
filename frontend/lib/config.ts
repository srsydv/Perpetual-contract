export const SEPOLIA_CHAIN_ID = 11155111;

export const CONFIG = {
  chainId: SEPOLIA_CHAIN_ID,
  exchangeAddress:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
      ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
      : '0xf1d034E8b0973a3ECE2ecbAC7c62bf7664bAf330',
  collateralTokenAddress:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS
      ? process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS
      : '0x799a5570318c0C5Fcfd09b0f573335B5aa8d85Ff',
  collateralSymbol: 'COLL',
  rpcUrl:
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_RPC_URL
      ? process.env.NEXT_PUBLIC_RPC_URL
      : 'https://rpc.sepolia.org',
};
