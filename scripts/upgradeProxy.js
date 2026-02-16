require("dotenv").config();
const hre = require("hardhat");

const PROXY_ADDRESS = "0xf1d034E8b0973a3ECE2ecbAC7c62bf7664bAf330";

async function main() {
  const network = hre.network.name;
  if (network !== "sepolia") {
    throw new Error("This script is for Sepolia. Use --network sepolia");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Upgrader (must be owner):", deployer.address);
  console.log("Proxy to upgrade:", PROXY_ADDRESS);

  // Deploy new implementation
  console.log("\nDeploying new PerpetualExchange implementation...");
  const PerpetualExchange = await hre.ethers.getContractFactory("PerpetualExchange");
  const newImpl = await PerpetualExchange.deploy();
  await newImpl.waitForDeployment();
  const newImplAddress = await newImpl.getAddress();
  console.log("New implementation deployed:", newImplAddress);

  // Connect to proxy (calls delegate to current implementation; implementation has upgradeToAndCall)
  const exchange = PerpetualExchange.attach(PROXY_ADDRESS);
  const data = "0x"; // no call on new impl
  console.log("\nCalling upgradeToAndCall on proxy...");
  const tx = await exchange.upgradeToAndCall(newImplAddress, data);
  await tx.wait();
  console.log("Upgrade tx hash:", tx.hash);

  console.log("\n" + "=".repeat(60));
  console.log("UPGRADE SUCCESSFUL");
  console.log("=".repeat(60));
  console.log("Proxy (unchanged):", PROXY_ADDRESS);
  console.log("New implementation:", newImplAddress);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
