
const { ethers } = require("ethers");

const IMPLEMENTATION = "0x8871CdEeccD43D570dF8502422eCCF00cfD1E5F2";
const PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const COLLATERAL_TOKEN = "0xb43945aF94c0F4a59b7C55258270D96dcfb77Ed7";

const iface = new ethers.Interface(["function initialize(address _priceFeed, address _collateralToken)"]);
const initData = iface.encodeFunctionData("initialize", [PRICE_FEED, COLLATERAL_TOKEN]);

module.exports = [IMPLEMENTATION, initData];
