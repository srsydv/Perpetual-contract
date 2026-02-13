
const hre = require("hardhat");
const { ethers } = require("ethers");
const https = require("https");
const http = require("http");

const BOT_FEED_ADDRESS = process.env.BOT_FEED_ADDRESS || "";
const PRICE_API = (process.env.PRICE_API || "coingecko").toLowerCase();
const API_KEY = process.env.API_KEY || "";
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || "60000", 10);
const MIN_PRICE_CHANGE = parseFloat(process.env.MIN_PRICE_CHANGE || "0.1");
const CHAINLINK_ETH_FEED = process.env.CHAINLINK_ETH_FEED || "";

let lastPrice = null;

async function fetchCoinGecko() {
  return new Promise((resolve, reject) => {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const price = json.ethereum?.usd;
          if (!price) reject(new Error("No price in CoinGecko response"));
          else resolve(price);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function fetchBinance() {
  return new Promise((resolve, reject) => {
    const url = "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT";
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const price = parseFloat(json.price);
          if (!price) reject(new Error("No price in Binance response"));
          else resolve(price);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function fetchCoinMarketCap() {
  if (!API_KEY) throw new Error("API_KEY required for CoinMarketCap");
  return new Promise((resolve, reject) => {
    const url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH&convert=USD";
    https.get(url, { headers: { "X-CMC_PRO_API_KEY": API_KEY } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const price = json.data?.ETH?.quote?.USD?.price;
          if (!price) reject(new Error("No price in CoinMarketCap response"));
          else resolve(price);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function fetchCryptoCompare() {
  const apiKey = API_KEY || "demo"; 
  return new Promise((resolve, reject) => {
    const url = `https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD&api_key=${apiKey}`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const price = json.USD;
          if (!price) reject(new Error("No price in CryptoCompare response"));
          else resolve(price);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function fetchChainlink(provider) {
  if (!CHAINLINK_ETH_FEED) throw new Error("CHAINLINK_ETH_FEED required for Chainlink API");
  const AGGREGATOR_ABI = [
    "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
  ];
  const feed = new ethers.Contract(CHAINLINK_ETH_FEED, AGGREGATOR_ABI, provider);
  const { answer } = await feed.latestRoundData();
  return Number(answer) / 1e8;
}

async function fetchEthPrice(provider) {
  switch (PRICE_API) {
    case "coingecko":
      return await fetchCoinGecko();
    case "binance":
      return await fetchBinance();
    case "coinmarketcap":
      return await fetchCoinMarketCap();
    case "cryptocompare":
      return await fetchCryptoCompare();
    case "chainlink":
      return await fetchChainlink(provider);
    default:
      throw new Error(`Unknown API: ${PRICE_API}. Use: coingecko, binance, coinmarketcap, cryptocompare, chainlink`);
  }
}

async function main() {
  if (!BOT_FEED_ADDRESS) {
    console.error("Set BOT_FEED_ADDRESS");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = process.env.PRIVATE_KEY
    ? new ethers.Wallet(process.env.PRIVATE_KEY, provider)
    : (await hre.ethers.getSigners())[0];

  const BotFeed = await hre.ethers.getContractFactory("BotUpdatablePriceFeed");
  const botFeed = BotFeed.attach(BOT_FEED_ADDRESS).connect(signer);

  console.log("Price Feed Bot: Fetching ETH price from API and updating BotUpdatablePriceFeed");
  console.log("  API:", PRICE_API);
  console.log("  Bot feed:", BOT_FEED_ADDRESS);
  console.log("  Updater:", await signer.getAddress());
  console.log("  Interval:", INTERVAL_MS, "ms");
  console.log("  Min price change:", MIN_PRICE_CHANGE + "%\n");

  async function update() {
    try {
      const priceUsd = await fetchEthPrice(provider);
      const priceIn8Decimals = BigInt(Math.round(priceUsd * 1e8));

      // Check if price changed significantly
      if (lastPrice !== null) {
        const changePercent = Math.abs((priceUsd - lastPrice) / lastPrice) * 100;
        if (changePercent < MIN_PRICE_CHANGE) {
          console.log(new Date().toISOString(), `Price unchanged: $${priceUsd.toFixed(2)} (${changePercent.toFixed(3)}% change, min ${MIN_PRICE_CHANGE}%)`);
          return;
        }
      }

      const tx = await botFeed.updatePrice(priceIn8Decimals);
      await tx.wait();
      lastPrice = priceUsd;
      console.log(new Date().toISOString(), `✅ Updated dummy token price = $${priceUsd.toFixed(2)} USD (from ${PRICE_API})`);
    } catch (e) {
      console.error(new Date().toISOString(), "❌ Update failed:", e.message);
    }
  }

  await update();
  setInterval(update, INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
