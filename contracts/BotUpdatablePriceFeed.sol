// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract BotUpdatablePriceFeed is AggregatorV3Interface {
    uint8 public override decimals = 8;
    int256 private _latestAnswer;
    uint256 private _updatedAt;
    uint80 private _roundId = 1;

    address public updater;

    event PriceUpdated(int256 price, uint256 updatedAt);

    constructor(int256 initialPrice, address _updater) {
        _latestAnswer = initialPrice;
        _updatedAt = block.timestamp;
        updater = _updater;
    }

    function updatePrice(int256 newPrice) external {
        require(updater == address(0) || msg.sender == updater, "Only updater");
        require(newPrice > 0, "Invalid price");
        _latestAnswer = newPrice;
        _updatedAt = block.timestamp;
        _roundId++;
        emit PriceUpdated(newPrice, _updatedAt);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _latestAnswer, _updatedAt - 1, _updatedAt, _roundId);
    }

    function description() external pure override returns (string memory) {
        return "Bot-updated price (e.g. dummy token = ETH)";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80)
        external
        pure
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        revert("Not implemented");
    }
}
