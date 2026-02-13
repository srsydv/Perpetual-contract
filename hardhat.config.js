require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Helper to format private key
function getPrivateKey() {
  const pk = process.env.PRIVATE_KEY || process.env.PK;
  if (!pk) return [];
  // Remove 0x if present, then add it back (ensures single 0x)
  const formatted = pk.startsWith('0x') ? pk : `0x${pk}`;
  return [formatted];
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || `https://eth-sepolia.g.alchemy.com/v2/rB2CQbcQlNubEmgJCgxDR`,
      chainId: 11155111,
      accounts: getPrivateKey(),
      timeout: 60000, // 60 seconds timeout
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: `TN3DX6Y6IU2C1H3ZCHGQJKD7MHUQZGKRMP`,
  },
};
