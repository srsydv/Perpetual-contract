require("dotenv").config();
const { ethers } = require("ethers");

// Set in .env to match your deploy, or defaults from latest deploy
const IMPLEMENTATION = process.env.IMPLEMENTATION_ADDRESS || "0x04dDD3EbBF2A061Bc7D89D2a7E24853A6cC9A8A8";
const PRICE_FEED = process.env.PRICE_FEED_ADDRESS || "0x8Ce022D3901FCc9C3944E00c612Dc5c5C7F7683F";
const COLLATERAL_TOKEN = process.env.COLLATERAL_TOKEN_ADDRESS || "0x799a5570318c0C5Fcfd09b0f573335B5aa8d85Ff";

const iface = new ethers.Interface(["function initialize(address _priceFeed, address _collateralToken)"]);
const initData = iface.encodeFunctionData("initialize", [PRICE_FEED, COLLATERAL_TOKEN]);

module.exports = [IMPLEMENTATION, initData];
