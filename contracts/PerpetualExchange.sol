// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PerpetualExchange is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    AggregatorV3Interface public priceFeed;
    IERC20 public collateralToken;

    uint256 public constant PRICE_DECIMALS = 8;
    uint256 public constant MARGIN_DECIMALS = 18;
    uint256 public constant MAINTENANCE_MARGIN_BPS = 500; 
    uint256 public constant MAX_LEVERAGE = 20;

    struct Position {
        int256 size;           
        uint256 entryPrice;    
        uint256 margin;        
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
    error InsufficientLiquidity();

    address public owner;
    address public tradedToken;
    mapping(address => address) public priceFeedByToken;

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _priceFeed, address _collateralToken) external initializer {
        if (_priceFeed == address(0)) revert InvalidPriceFeed();
        if (_collateralToken == address(0)) revert InvalidCollateralToken();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        owner = msg.sender;
        priceFeed = AggregatorV3Interface(_priceFeed);
        collateralToken = IERC20(_collateralToken);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

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
        // if (block.timestamp - updatedAt > 3600) revert StalePrice(); // 1 hour staleness
        return uint256(answer);
    }

    function openPosition(bool isLong, uint256 sizeAbs, uint256 marginAmount) external nonReentrant {
        if (sizeAbs == 0) revert ZeroSize();
        if (marginAmount == 0) revert ZeroMargin();

        uint256 balBefore = collateralToken.balanceOf(address(this));
        if (!collateralToken.transferFrom(msg.sender, address(this), marginAmount)) revert TransferFailed();
        uint256 received = collateralToken.balanceOf(address(this)) - balBefore;
        if (received == 0) revert TransferFailed();

        uint256 price = getMarkPrice();
        int256 size = isLong ? int256(sizeAbs) : -int256(sizeAbs);

        Position storage pos = positions[msg.sender];
        uint256 totalMargin = pos.margin + received;

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

        if (_notional(pos) > totalMargin * MAX_LEVERAGE) revert ExceedsMaxLeverage();

        emit PositionOpened(msg.sender, isLong, sizeAbs, price, received);
    }

    function closePosition(uint256 sizeToClose) external nonReentrant {
        Position storage pos = positions[msg.sender];
        if (pos.size == 0) revert NoPosition();
        uint256 sizeAbs = _abs(pos.size);
        if (sizeToClose == 0 || sizeToClose > sizeAbs) revert ZeroSize();

        uint256 exitPrice = getMarkPrice();
        int256 pnl = _pnl(pos.size, pos.entryPrice, exitPrice, sizeToClose);
        uint256 marginToReturn = (pos.margin * sizeToClose) / sizeAbs;
        uint256 totalPayout = marginToReturn + (pnl >= 0 ? uint256(pnl) : 0);
        if (pnl < 0) {
            uint256 loss = uint256(-pnl);
            if (loss > marginToReturn) totalPayout = 0;
            else totalPayout = marginToReturn - loss;
        }

        pos.margin -= marginToReturn;
        if (sizeToClose == sizeAbs) {
            pos.size = 0;
            pos.entryPrice = 0;
            pos.lastUpdatedAt = 0;
            _removePositionHolder(msg.sender);
        } else {
            pos.size = pos.size > 0 ? int256(sizeAbs - sizeToClose) : -int256(sizeAbs - sizeToClose);
            pos.lastUpdatedAt = block.timestamp;
        }

        uint256 balance = collateralToken.balanceOf(address(this));
        if (balance < totalPayout) revert InsufficientLiquidity();
        emit PositionClosed(msg.sender, sizeToClose, exitPrice, pnl);
        if (!collateralToken.transfer(msg.sender, totalPayout)) revert TransferFailed();
    }

    function addMargin(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroMargin();
        Position storage pos = positions[msg.sender];
        if (pos.size == 0) revert NoPosition();
        uint256 balBefore = collateralToken.balanceOf(address(this));
        if (!collateralToken.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        uint256 received = collateralToken.balanceOf(address(this)) - balBefore;
        if (received == 0) revert TransferFailed();
        pos.margin += received;
        pos.lastUpdatedAt = block.timestamp;
        emit MarginAdded(msg.sender, received);
    }

    function removeMargin(uint256 amount) external nonReentrant {
        Position storage pos = positions[msg.sender];
        if (pos.size == 0) revert NoPosition();
        pos.margin -= amount;
        pos.lastUpdatedAt = block.timestamp;
        if (_marginRatio(pos) < MAINTENANCE_MARGIN_BPS) revert InsufficientMargin();
        emit MarginRemoved(msg.sender, amount);
        if (!collateralToken.transfer(msg.sender, amount)) revert TransferFailed();
    }

    /**
     * @notice Liquidate a position that is below maintenance margin.
     */
    function liquidate(address trader) external nonReentrant {
        Position storage pos = positions[trader];
        if (pos.size == 0) revert NoPosition();
        if (_marginRatio(pos) >= MAINTENANCE_MARGIN_BPS) revert PositionNotLiquidatable();

        uint256 price = getMarkPrice();
        uint256 sizeAbs = _abs(pos.size);
        pos.size = 0;
        pos.entryPrice = 0;
        uint256 marginForLiquidator = pos.margin;
        pos.margin = 0;
        pos.lastUpdatedAt = 0;
        _removePositionHolder(trader);

        if (collateralToken.balanceOf(address(this)) < marginForLiquidator) revert InsufficientLiquidity();
        emit Liquidated(trader, msg.sender, sizeAbs, price);
        if (!collateralToken.transfer(msg.sender, marginForLiquidator)) revert TransferFailed();
    }

    function getPosition(address trader) external view returns (int256 size, uint256 entryPrice, uint256 margin, uint256 lastUpdatedAt) {
        Position storage pos = positions[trader];
        return (pos.size, pos.entryPrice, pos.margin, pos.lastUpdatedAt);
    }

    function getMarginRatio(address trader) external view returns (uint256) {
        return _marginRatio(positions[trader]);
    }

    function isLiquidatable(address trader) external view returns (bool) {
        Position storage pos = positions[trader];
        if (pos.size == 0) return false;
        return _marginRatio(pos) < MAINTENANCE_MARGIN_BPS;
    }

    function getPositionHolderCount() external view returns (uint256) {
        return _positionHolders.length;
    }

    function getPositionHolder(uint256 index) external view returns (address) {
        require(index < _positionHolders.length, "Index out of bounds");
        return _positionHolders[index];
    }

    function getActiveTradesWithHealth() external view returns (address[] memory traders, uint256[] memory healthBps) {
        uint256 n = _positionHolders.length;
        traders = new address[](n);
        healthBps = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            address trader = _positionHolders[i];
            traders[i] = trader;
            Position storage pos = positions[trader];
            healthBps[i] = pos.size == 0 ? type(uint256).max : _marginRatio(pos);
        }
        return (traders, healthBps);
    }

    function getLiquidatableActiveTrades() external view returns (address[] memory liquidatable) {
        uint256 n = _positionHolders.length;
        uint256 count = 0;
        for (uint256 i = 0; i < n; i++) {
            address trader = _positionHolders[i];
            Position storage pos = positions[trader];
            if (pos.size != 0 && _marginRatio(pos) < MAINTENANCE_MARGIN_BPS) {
                count++;
            }
        }
        liquidatable = new address[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < n; i++) {
            address trader = _positionHolders[i];
            Position storage pos = positions[trader];
            if (pos.size != 0 && _marginRatio(pos) < MAINTENANCE_MARGIN_BPS) {
                liquidatable[j] = trader;
                j++;
            }
        }
        return liquidatable;
    }

    function checkLiquidatableBatch(address[] calldata traders) external view returns (address[] memory liquidatableAddresses) {
        uint256 count = 0;
        for (uint256 i = 0; i < traders.length; i++) {
            Position storage pos = positions[traders[i]];
            if (pos.size != 0 && _marginRatio(pos) < MAINTENANCE_MARGIN_BPS) {
                count++;
            }
        }
        
        liquidatableAddresses = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < traders.length; i++) {
            Position storage pos = positions[traders[i]];
            if (pos.size != 0 && _marginRatio(pos) < MAINTENANCE_MARGIN_BPS) {
                liquidatableAddresses[index] = traders[i];
                index++;
            }
        }
        return liquidatableAddresses;
    }


    function liquidateBatch(address[] calldata traders) external nonReentrant returns (uint256 successCount) {
        for (uint256 i = 0; i < traders.length; i++) {
            Position storage pos = positions[traders[i]];
            if (pos.size == 0) continue;
            if (_marginRatio(pos) >= MAINTENANCE_MARGIN_BPS) continue;
            
            uint256 price = getMarkPrice();
            uint256 sizeAbs = _abs(pos.size);
            uint256 marginForLiquidator = pos.margin;
            
            // Clear position
            pos.size = 0;
            pos.entryPrice = 0;
            pos.margin = 0;
            pos.lastUpdatedAt = 0;
            _removePositionHolder(traders[i]);

            if (collateralToken.balanceOf(address(this)) >= marginForLiquidator) {
                emit Liquidated(traders[i], msg.sender, sizeAbs, price);
                if (collateralToken.transfer(msg.sender, marginForLiquidator)) {
                    successCount++;
                }
            }
        }
        return successCount;
    }

    function calculateMaxPositionSize(uint256 marginAmount, uint256 leverage) external view returns (
        uint256 maxSize,
        uint256 maxNotional,
        uint256 requiredMargin
    ) {
        if (marginAmount == 0) return (0, 0, 0);
        
        uint256 price = getMarkPrice();
        
        if (leverage > MAX_LEVERAGE) leverage = MAX_LEVERAGE;
        
        maxNotional = (marginAmount * leverage) / (10 ** MARGIN_DECIMALS);
        
        
        maxSize = (maxNotional * (10 ** PRICE_DECIMALS)) / price;
        
        
        requiredMargin = marginAmount;
        
        return (maxSize, maxNotional, requiredMargin);
    }

    function calculateRequiredMargin(uint256 sizeAbs, uint256 leverage) external view returns (
        uint256 requiredMargin,
        uint256 notional
    ) {
        if (sizeAbs == 0 || leverage == 0) return (0, 0);
        
        uint256 price = getMarkPrice();
        
        notional = (sizeAbs * price) / (10 ** PRICE_DECIMALS);
        
        // notional is already in 18 decimals; required margin = notional / leverage
        requiredMargin = notional / leverage;
        
        if (leverage > MAX_LEVERAGE) {
            requiredMargin = notional / MAX_LEVERAGE;
        }
        
        return (requiredMargin, notional);
    }

    function _notional(Position storage pos) internal view returns (uint256) {
        return (_abs(pos.size) * pos.entryPrice) / (10 ** PRICE_DECIMALS);
    }

    function _marginRatio(Position storage pos) internal view returns (uint256) {
        uint256 notional = _notional(pos);
        if (notional == 0) return type(uint256).max;
        uint256 price = getMarkPrice();
        int256 pnl = _pnl(pos.size, pos.entryPrice, price, _abs(pos.size));
        uint256 equity = pos.margin;
        if (pnl >= 0) equity += uint256(pnl);
        else if (uint256(-pnl) >= pos.margin) return 0;
        else equity = pos.margin - uint256(-pnl);
        return (equity * 10_000) / notional;
    }

    function _pnl(int256 size, uint256 entryPrice, uint256 exitPrice, uint256 sizeAbs) internal pure returns (int256) {
        uint256 priceDiff;
        if (size > 0) {
            
            if (exitPrice >= entryPrice) {
                priceDiff = exitPrice - entryPrice;
                return int256((sizeAbs * priceDiff) / (10 ** PRICE_DECIMALS));
            } else {
                priceDiff = entryPrice - exitPrice;
                return -int256((sizeAbs * priceDiff) / (10 ** PRICE_DECIMALS));
            }
        } else {
            // Short: profit when exitPrice < entryPrice
            if (entryPrice >= exitPrice) {
                priceDiff = entryPrice - exitPrice;
                return int256((sizeAbs * priceDiff) / (10 ** PRICE_DECIMALS));
            } else {
                priceDiff = exitPrice - entryPrice;
                return -int256((sizeAbs * priceDiff) / (10 ** PRICE_DECIMALS));
            }
        }
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
