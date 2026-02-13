const hre = require("hardhat");

// Chainlink ETH/USD price feed addresses per network (see https://docs.chain.link/data-feeds/price-feeds/addresses)
const PRICE_FEED = {
  mainnet: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  sepolia: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
};

async function main() {
  const network = hre.network.name;
  let feedAddress = PRICE_FEED[network];

  if (!feedAddress) {
    const MockAggregator = await hre.ethers.getContractFactory("MockAggregatorV3");
    const initialPrice = 3_000 * 1e8; // 3000 USD with 8 decimals
    const mock = await MockAggregator.deploy(initialPrice);
    await mock.waitForDeployment();
    feedAddress = await mock.getAddress();
    console.log("Mock price feed deployed:", feedAddress);
  }

  // Collateral token address - set via environment variable or use a default
  // For testing, you might want to deploy a mock ERC20 token
  const collateralTokenAddress = process.env.COLLATERAL_TOKEN_ADDRESS;
  if (!collateralTokenAddress) {
    throw new Error("COLLATERAL_TOKEN_ADDRESS environment variable must be set");
  }

  const PerpetualExchange = await hre.ethers.getContractFactory("PerpetualExchange");
  const exchange = await PerpetualExchange.deploy(feedAddress, collateralTokenAddress);
  await exchange.waitForDeployment();
  const addr = await exchange.getAddress();
  console.log("PerpetualExchange deployed to:", addr);
  console.log("Price feed:", feedAddress);
  console.log("Collateral token:", collateralTokenAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
