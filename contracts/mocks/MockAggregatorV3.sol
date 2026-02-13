// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";


contract MockAggregatorV3 is AggregatorV3Interface {
    uint8 public override decimals = 8;
    int256 private _latestAnswer;
    uint256 private _updatedAt;

    constructor(int256 initialAnswer) {
        _latestAnswer = initialAnswer;
        _updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (1, _latestAnswer, block.timestamp - 1, _updatedAt, 1);
    }

    function updateAnswer(int256 newAnswer) external {
        _latestAnswer = newAnswer;
        _updatedAt = block.timestamp;
    }

    function description() external pure override returns (string memory) {
        return "Mock ETH/USD";
    }

    function version() external pure override returns (uint256) {
        return 1;
    }

    function getRoundData(uint80) external pure override returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) {
        revert("Mock");
    }
}
