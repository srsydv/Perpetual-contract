/**
 * Bot: fetches ETH/USD from API and updates MockAggregatorV3.
 * Uses explicit nonce and waits for each tx to be confirmed to avoid RPC "in-flight limit".
 *
 * Run from project root: node scripts/priceFeedBot.js
 * .env: PRIVATE_KEY, SEPOLIA_RPC_URL (optional), MOCK_PRICE_FEED_ADDRESS (optional)
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { ethers } = require("ethers");

const MOCK_FEED_ADDRESS = process.env.MOCK_PRICE_FEED_ADDRESS || "0x8Ce022D3901FCc9C3944E00c612Dc5c5C7F7683F";
const EXCHANGE_PROXY = process.env.PERPETUAL_EXCHANGE_PROXY || "0xf1d034E8b0973a3ECE2ecbAC7c62bf7664bAf330";
const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "https://rpc.sepolia.org";
const INTERVAL_MS = 15000; // one update per block on Sepolia (~12s) + buffer
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MOCK_ABI = [
  "function updateAnswer(int256 newAnswer) external",
  "function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80)",
];
const EXCHANGE_ABI = ["function priceFeed() external view returns (address)"];

async function getEthUsdPrice() {
  const urls = [
    "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const price = url.includes("binance") ? Number(data.price) : Number(data.ethereum?.usd ?? data.ethereum);
      if (price > 0 && Number.isFinite(price)) return price;
    } catch (e) {
      continue;
    }
  }
  throw new Error("Could not fetch ETH/USD from any API");
}

async function main() {
  const pk = process.env.PRIVATE_KEY || process.env.PK;
  if (!pk) {
    console.error("Missing PRIVATE_KEY or PK in .env (project root)");
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(pk.startsWith("0x") ? pk : `0x${pk}`, provider);
  const mock = new ethers.Contract(MOCK_FEED_ADDRESS, MOCK_ABI, wallet);

  console.log("Price feed bot started");
  console.log("  Mock feed (we update this):", MOCK_FEED_ADDRESS);
  console.log("  RPC:                      ", RPC_URL.replace(/\/\/[^@]+@/, "//***@"));
  console.log("  Wallet:                   ", wallet.address);
  console.log("  Interval:                 ", INTERVAL_MS / 1000, "sec (after each tx confirmed)");

  // Verify exchange proxy uses this mock so app stops reverting with StalePrice
  try {
    const exchange = new ethers.Contract(EXCHANGE_PROXY, EXCHANGE_ABI, provider);
    const feedUsedByExchange = await exchange.priceFeed();
    const match = feedUsedByExchange.toLowerCase() === MOCK_FEED_ADDRESS.toLowerCase();
    if (!match) {
      console.warn("  WARNING: Exchange proxy", EXCHANGE_PROXY, "uses feed", feedUsedByExchange, "but we update", MOCK_FEED_ADDRESS);
      console.warn("  Set MOCK_PRICE_FEED_ADDRESS=" + feedUsedByExchange + " in .env so the app gets updates.");
    } else {
      console.log("  Exchange proxy uses this feed: OK");
    }
    const [, , , updatedAt] = await mock.latestRoundData();
    const ageSec = Math.floor(Date.now() / 1000) - Number(updatedAt);
    if (ageSec > 3600) console.warn("  Mock last updated", Math.floor(ageSec / 60), "min ago (stale). First update in", INTERVAL_MS / 1000, "s.");
    else console.log("  Mock last updated", Math.floor(ageSec / 60), "min ago");
  } catch (e) {
    console.warn("  Could not verify exchange feed:", e.message);
  }
  console.log("");

  for (;;) {
    try {
      const priceUsd = await getEthUsdPrice();
      const price8 = BigInt(Math.round(priceUsd * 1e8));
      // Use confirmed nonce so we never stack; RPC in-flight limit is not hit
      const nonce = await provider.getTransactionCount(wallet.address, "confirmed");
      const tx = await mock.updateAnswer(price8, { nonce });
      const receipt = await tx.wait();
      if (receipt && receipt.status === 0) {
        console.error("[", new Date().toISOString(), "] Tx reverted:", tx.hash);
      } else {
        const ts = new Date().toISOString();
        console.log(`[${ts}] Updated: $${priceUsd.toFixed(2)} (tx: ${tx.hash})`);
      }
    } catch (e) {
      console.error("[", new Date().toISOString(), "] Error:", e.message || e);
      await sleep(5000); // back off on error before retry
    }
    await sleep(INTERVAL_MS);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
