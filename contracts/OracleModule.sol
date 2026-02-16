// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IOracleRouter {
    function price(address token) external view returns (uint256);       // 1 token in USD, 1e18 precision
    function isPriceStale(address token) external view returns (bool);   // true if any underlying feed is stale
}

interface IERC20Metadata {
    function decimals() external view returns (uint8);
}

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract OracleModule is Initializable, UUPSUpgradeable, IOracleRouter {
    struct FeedCfg {
        AggregatorV3Interface aggregator;  
        uint256 heartbeat;                 
        bool exists;
    }

    struct EthRouteCfg {
        AggregatorV3Interface tokenEthAgg; 
        bool invert;                       
        uint256 heartbeat;
        bool exists;
    }

    address public WETH;

    FeedCfg public ethUsd;


    mapping(address => FeedCfg) public tokenUsd;


    mapping(address => EthRouteCfg) public tokenEthRoute;

    address public owner;

    event OwnerUpdated(address indexed);
    event SetEthUsd(address indexed agg, uint256 heartbeat);
    event SetTokenUsd(address indexed token, address indexed agg, uint256 heartbeat);
    event SetTokenEthRoute(address indexed token, address indexed agg, bool invert, uint256 heartbeat);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    function initialize(address _weth) public initializer {
        __UUPSUpgradeable_init();
        require(_weth != address(0), "BAD_WETH");
        owner = msg.sender;
        WETH = _weth;
    }

    function setOwner(address _owner) external onlyOwner {
        require(_owner != address(0), "BAD_OWNER");
        owner = _owner;
        emit OwnerUpdated(_owner);
    }


    function setEthUsd(address agg, uint256 heartbeat) external onlyOwner {
        require(agg != address(0) && heartbeat > 0, "BAD_PARAMS");
        ethUsd = FeedCfg(AggregatorV3Interface(agg), heartbeat, true);
        emit SetEthUsd(agg, heartbeat);
    }


    function setTokenUsd(address token, address agg, uint256 heartbeat) external onlyOwner {
        require(token != address(0) && agg != address(0) && heartbeat > 0, "BAD_PARAMS");
        tokenUsd[token] = FeedCfg(AggregatorV3Interface(agg), heartbeat, true);
        emit SetTokenUsd(token, agg, heartbeat);
    }


    function setTokenEthRoute(address token, address agg, bool invert, uint256 heartbeat) external onlyOwner {
        require(token != address(0) && agg != address(0) && heartbeat > 0, "BAD_PARAMS");
        tokenEthRoute[token] = EthRouteCfg(AggregatorV3Interface(agg), invert, heartbeat, true);
        emit SetTokenEthRoute(token, agg, invert, heartbeat);
    }


    function price(address token) external view override returns (uint256) {
        require(token != address(0), "BAD_TOKEN");

        
        if (token == WETH) {
            return _readUsd(ethUsd);
        }

        
        if (tokenUsd[token].exists) {
            return _readUsd(tokenUsd[token]); 
        }

        
        if (tokenEthRoute[token].exists) {
            uint256 tokenPerEth1e18 = _readTokenPerEth(tokenEthRoute[token]); 
            require(ethUsd.exists, "NO_ETH_USD");
            uint256 ethUsd1e18 = _readUsd(ethUsd); 
            return (ethUsd1e18 * 1e18) / tokenPerEth1e18;
        }

        return 0;
    }


    function isPriceStale(address token) external view override returns (bool) {
        if (token == WETH) return _isStale(ethUsd);

        if (tokenUsd[token].exists) return _isStale(tokenUsd[token]);

        if (tokenEthRoute[token].exists) {
            if (_isStale(tokenEthRoute[token])) return true;
            if (!ethUsd.exists || _isStale(ethUsd)) return true;
            return false;
        }

        return true;
    }

    function _readUsd(FeedCfg memory cfg) internal view returns (uint256) {
        require(cfg.exists, "NO_USD_FEED");
        (uint256 answer, uint256 updatedAt, uint8 d) = _readRaw(cfg.aggregator);
        require(!_tooOld(updatedAt, cfg.heartbeat), "USD_FEED_STALE");

        require(answer > 0, "BAD_USD_ANSWER");
        return _scale(answer, d, 18);
    }


    function _readTokenPerEth(EthRouteCfg memory cfg) internal view returns (uint256) {
        (uint256 answer, uint256 updatedAt, uint8 d) = _readRaw(cfg.tokenEthAgg);
        require(!_tooOld(updatedAt, cfg.heartbeat), "TOKEN_ETH_STALE");
        require(answer > 0, "BAD_TOKEN_ETH_ANSWER");

        uint256 v = _scale(answer, d, 18); 
        if (cfg.invert) {
            return (1e36) / v;
        }
        return v;
    }

    function _readRaw(AggregatorV3Interface agg) internal view returns (uint256 answer, uint256 updatedAt, uint8 d) {
        (, int256 ans,, uint256 upd,) = agg.latestRoundData();
        require(ans > 0, "NEG_OR_ZERO");
        answer = uint256(ans);
        updatedAt = upd;
        d = agg.decimals();
    }

    function _isStale(FeedCfg memory cfg) internal view returns (bool) {
        if (!cfg.exists) return true;
        (, , , uint256 upd,) = cfg.aggregator.latestRoundData();
        return _tooOld(upd, cfg.heartbeat);
    }

    function _isStale(EthRouteCfg memory cfg) internal view returns (bool) {
        if (!cfg.exists) return true;
        (, , , uint256 upd,) = cfg.tokenEthAgg.latestRoundData();
        return _tooOld(upd, cfg.heartbeat);
    }


    function _tooOld(uint256 updatedAt, uint256 heartbeat) internal view returns (bool) {
        return updatedAt == 0 || block.timestamp > updatedAt + heartbeat;
    }


    function _scale(uint256 x, uint8 fromDec, uint8 toDec) internal pure returns (uint256) {
        if (fromDec == toDec) return x;
        if (fromDec < toDec) return x * 10 ** (toDec - fromDec);
        return x / 10 ** (fromDec - toDec);
    }

 
    function _authorizeUpgrade(address /*newImplementation*/) internal view override {
        require(msg.sender == owner, "NOT_OWNER");
    }

    uint256[50] private __gap;
}