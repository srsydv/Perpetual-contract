
/**
 * Refresh the MockAggregatorV3 so the exchange stops reverting with StalePrice.
 * Run at least once per hour, or after deploying the mock.
 *
 * Usage:
 *   npx hardhat run scripts/updateMockPrice.js --network sepolia
 *
 * Optional .env:
 *   MOCK_PRICE_FEED_ADDRESS  - default: 0x8Ce022D3901FCc9C3944E00c612Dc5c5C7F7683F
 *   MOCK_PRICE_USD           - default: 3000 (price in dollars, 8 decimals applied)
 */
require("dotenv").config();
const hre = require("hardhat");

const MOCK_FEED_ADDRESS = process.env.MOCK_PRICE_FEED_ADDRESS || "0x8Ce022D3901FCc9C3944E00c612Dc5c5C7F7683F";
const PRICE_USD = Number(process.env.MOCK_PRICE_USD) || 3000;

async function main() {
  const signers = await hre.ethers.getSigners();
  if (!signers.length) throw new Error("No signer (set PRIVATE_KEY in .env)");
  const mock = await hre.ethers.getContractAt("MockAggregatorV3", MOCK_FEED_ADDRESS, signers[0]);
  const value = BigInt(Math.round(PRICE_USD * 1e8));
  const tx = await mock.updateAnswer(value);
  await tx.wait();
  console.log("Mock price feed updated:", MOCK_FEED_ADDRESS);
  console.log("Price set to:", PRICE_USD, "USD (tx:", tx.hash, ")");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
