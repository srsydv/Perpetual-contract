// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PerpetualExchange {
    AggregatorV3Interface public immutable priceFeed;
    IERC20 public immutable collateralToken;

    uint256 public constant PRICE_DECIMALS = 8;
    uint256 public constant MARGIN_DECIMALS = 18;
    uint256 public constant MAINTENANCE_MARGIN_BPS = 500; // 5%
    uint256 public constant MAX_LEVERAGE = 20;

    struct Position {
        int256 size;           // in 18 decimals, + long, - short (in base units)
        uint256 entryPrice;    // 8 decimals from Chainlink
        uint256 margin;        // 18 decimals (wei)
        uint256 lastUpdatedAt;
    }

    mapping(address => Position) public positions;
    address[] private _positionHolders;
    mapping(address => bool) public activeTrades;
    mapping(address => uint256) private _positionHolderIndex;

    event PositionOpened(address indexed trader, bool isLong, uint256 size, uint256 entryPrice, uint256 margin);
    event PositionClosed(address indexed trader, uint256 closeSize, uint256 exitPrice, int256 pnl);
    event MarginAdded(address indexed trader, uint256 amount);
    event MarginRemoved(address indexed trader, uint256 amount);
    event Liquidated(address indexed trader, address indexed liquidator, uint256 size, uint256 price);

    error InvalidPriceFeed();
    error InvalidCollateralToken();
    error StalePrice();
    error ZeroSize();
    error ZeroMargin();
    error ExceedsMaxLeverage();
    error NoPosition();
    error InsufficientMargin();
    error PositionNotLiquidatable();
    error TransferFailed();
    error OnlyOwner();

    address public owner;
    address public tradedToken;
    mapping(address => address) public priceFeedByToken;

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _priceFeed, address _collateralToken) {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();
        if (_collateralToken == address(0)) revert InvalidCollateralToken();
        owner = msg.sender;
        priceFeed = AggregatorV3Interface(_priceFeed);
        collateralToken = IERC20(_collateralToken);
    }

    function setTradedToken(address _tradedToken) external onlyOwner {
        tradedToken = _tradedToken;
    }

    function setPriceFeedForToken(address token, address feed) external onlyOwner {
        priceFeedByToken[token] = feed;
    }

    function _getPriceFeed() internal view returns (AggregatorV3Interface) {
        if (tradedToken != address(0) && priceFeedByToken[tradedToken] != address(0)) {
            return AggregatorV3Interface(priceFeedByToken[tradedToken]);
        }
        return priceFeed;
    }

    function getMarkPrice() public view returns (uint256) {
        AggregatorV3Interface feed = _getPriceFeed();
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        if (answer <= 0) revert InvalidPriceFeed();
        if (block.timestamp - updatedAt > 3600) revert StalePrice(); // 1 hour staleness
        return uint256(answer);
    }

    function openPosition(bool isLong, uint256 sizeAbs, uint256 marginAmount) external {
        if (sizeAbs == 0) revert ZeroSize();
        if (marginAmount == 0) revert ZeroMargin();

        if (!collateralToken.transferFrom(msg.sender, address(this), marginAmount)) revert TransferFailed();

        uint256 price = getMarkPrice();
        int256 size = isLong ? int256(sizeAbs) : -int256(sizeAbs);

        Position storage pos = positions[msg.sender];
        uint256 totalMargin = pos.margin + marginAmount;

        if (pos.size != 0) {
            require(
                (isLong && pos.size > 0) || (!isLong && pos.size < 0),
                "Cannot flip position in one tx; close first"
            );
            uint256 prevNotional = _abs(pos.size) * pos.entryPrice;
            uint256 newNotional = sizeAbs * price;
            pos.entryPrice = (prevNotional + newNotional) / ( _abs(pos.size) + sizeAbs );
            pos.size = pos.size + size;
        } else {
            pos.entryPrice = price;
            pos.size = size;
            _positionHolders.push(msg.sender);
            _positionHolderIndex[msg.sender] = _positionHolders.length;
            activeTrades[msg.sender] = true;
        }

        pos.margin = totalMargin;
        pos.lastUpdatedAt = block.timestamp;

        
        emit PositionOpened(msg.sender, isLong, sizeAbs, price, marginAmount);
    }
    

    function _pnl(int256 size, uint256 entryPrice, uint256 exitPrice, uint256 sizeAbs) internal pure returns (int256) {
        if (size > 0) return int256((sizeAbs * (exitPrice - entryPrice)) / (10 ** PRICE_DECIMALS));
        return int256((sizeAbs * (entryPrice - exitPrice)) / (10 ** PRICE_DECIMALS));
    }

    function _abs(int256 x) internal pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }

    function _removePositionHolder(address trader) internal {
        uint256 idx = _positionHolderIndex[trader];
        if (idx == 0) return;
        uint256 last = _positionHolders.length;
        if (idx != last) {
            address lastTrader = _positionHolders[last - 1];
            _positionHolders[idx - 1] = lastTrader;
            _positionHolderIndex[lastTrader] = idx;
        }
        _positionHolders.pop();
        _positionHolderIndex[trader] = 0;
        activeTrades[trader] = false;
    }
}
