/**
 * Simple deployment script for PerpetualExchange
 * 
 * Automatically deploys MockERC20 collateral token if not provided.
 * 
 * Usage:
 *   PRIVATE_KEY=0x... npx hardhat run scripts/deploySimple.js --network sepolia
 * 
 * Or with existing collateral token:
 *   PRIVATE_KEY=0x... COLLATERAL_TOKEN_ADDRESS=0x... npx hardhat run scripts/deploySimple.js --network sepolia
 * 
 * For local testing (auto-deploys mock price feed and collateral token):
 *   npx hardhat run scripts/deploySimple.js
 */

require("dotenv").config();
const hre = require("hardhat");

// Chainlink ETH/USD price feed addresses
const CHAINLINK_FEEDS = {
  mainnet: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  sepolia: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
};

async function main() {
  const network = hre.network.name;
  console.log("Deploying to network:", network);

  // Get deployer signer - Hardhat should load it from config
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No signer available. Make sure PRIVATE_KEY is set in .env file and hardhat.config.js is configured correctly."
    );
  }
  const deployer = signers[0];

  console.log("Deployer address:", deployer.address);

  let balance;
  try {
    balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");
  } catch (error) {
    if (error.code === "UND_ERR_HEADERS_TIMEOUT" || error.message.includes("timeout")) {
      console.error("\n❌ RPC connection timeout!");
      console.error("Please use your own RPC URL:");
      console.error("  export SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY");
      console.error("  export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY");
      throw new Error("RPC timeout - use your own RPC endpoint");
    }
    throw error;
  }

  if (balance === 0n && network !== "hardhat") {
    throw new Error("Insufficient balance. Get Sepolia ETH from faucet: https://sepoliafaucet.com/");
  }

  // Get price feed address
  let priceFeedAddress = CHAINLINK_FEEDS[network];
  
  // If no Chainlink feed for this network, deploy mock
  if (!priceFeedAddress) {
    console.log("No Chainlink feed for", network, "- deploying mock price feed...");
    const MockAggregator = await hre.ethers.getContractFactory("MockAggregatorV3");
    const initialPrice = 3000 * 1e8; // $3000 with 8 decimals
    const mockFeed = await MockAggregator.deploy(initialPrice);
    await mockFeed.waitForDeployment();
    priceFeedAddress = await mockFeed.getAddress();
    console.log("✅ Mock price feed deployed:", priceFeedAddress);
  } else {
    console.log("Using Chainlink feed:", priceFeedAddress);
  }

  // Deploy or use existing collateral token
  let collateralTokenAddress = process.env.COLLATERAL_TOKEN_ADDRESS;
  
  // Treat zero address as "not provided"
  if (!collateralTokenAddress || collateralTokenAddress === "0x0000000000000000000000000000000000000000" || collateralTokenAddress === hre.ethers.ZeroAddress) {
    console.log("No collateral token provided - deploying MockERC20...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const collateralToken = await MockERC20.deploy("Collateral Token", "COLL", 18);
    await collateralToken.waitForDeployment();
    collateralTokenAddress = await collateralToken.getAddress();
    console.log("✅ MockERC20 (Collateral) deployed:", collateralTokenAddress);
    console.log("   Name: Collateral Token (COLL)");
    console.log("   Decimals: 18");
    console.log("   Total Supply: 1,000,000 tokens (minted to deployer)");
  } else {
    console.log("Using existing collateral token:", collateralTokenAddress);
  }
  console.log("");

  // Deploy PerpetualExchange (upgradeable: implementation + proxy)
  console.log("Deploying PerpetualExchange (implementation)...");
  const PerpetualExchange = await hre.ethers.getContractFactory("PerpetualExchange");
  const impl = await PerpetualExchange.deploy();
  await impl.waitForDeployment();
  console.log("Deploying proxy and initializing...");
  const ExchangeProxy = await hre.ethers.getContractFactory("ExchangeProxy");
  const initData = PerpetualExchange.interface.encodeFunctionData("initialize", [
    priceFeedAddress,
    collateralTokenAddress,
  ]);
  const proxy = await ExchangeProxy.deploy(await impl.getAddress(), initData);
  await proxy.waitForDeployment();
  const exchange = PerpetualExchange.attach(await proxy.getAddress());
  const exchangeAddress = await exchange.getAddress();

  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT SUCCESSFUL");
  console.log("=".repeat(60));
  console.log("PerpetualExchange:", exchangeAddress);
  console.log("Price Feed:", priceFeedAddress);
  console.log("Collateral Token:", collateralTokenAddress);
  console.log("Owner:", deployer.address);
  
  if (network === "sepolia" || network === "mainnet") {
    console.log("\nView on Etherscan:");
    const explorer = network === "mainnet" ? "etherscan.io" : "sepolia.etherscan.io";
    console.log(`https://${explorer}/address/${exchangeAddress}`);
  }
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
