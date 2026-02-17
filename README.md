# Perpetual Exchange Smart Contract

A decentralized perpetual futures exchange smart contract built on Ethereum, allowing users to trade leveraged positions on ETH/USD with up to 20x leverage.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Features](#key-features)
- [Core Logic & Mechanics](#core-logic--mechanics)
- [Contract Structure](#contract-structure)
- [Functions Reference](#functions-reference)
- [Formulas](#formulas)
- [Security Features](#security-features)
- [Deployment](#deployment)
- [Usage Examples](#usage-examples)

---

## Overview

**PerpetualExchange** is an upgradeable smart contract that enables perpetual futures trading. Users can:
- Open long or short positions on ETH/USD
- Use leverage up to 20x
- Add or remove margin from positions
- Close positions partially or fully
- Liquidate undercollateralized positions

The contract uses Chainlink price feeds (or mocks for testing) to get real-time ETH/USD prices and enforces strict margin requirements to ensure system solvency.

---

## Architecture

### Upgradeability Pattern
- **UUPS (Universal Upgradeable Proxy Standard)**: The contract uses OpenZeppelin's UUPS pattern for upgradeability
- **Proxy Contract**: `ExchangeProxy` (ERC1967Proxy) delegates all calls to the implementation
- **Implementation**: `PerpetualExchange` contains the actual logic
- **Upgrade Authorization**: Only the owner can upgrade the implementation

### Key Components

```
PerpetualExchange
├── Price Feed (AggregatorV3Interface)
│   └── Gets ETH/USD price from Chainlink or mock
├── Collateral Token (IERC20)
│   └── ERC20 token used as margin (e.g., COLL)
├── Position Management
│   ├── Position struct (size, entryPrice, margin)
│   └── Position tracking array
└── Liquidation System
    └── Automatic liquidation when margin ratio < 5%
```

### Dependencies
- **OpenZeppelin Contracts-Upgradeable**: For upgradeability and reentrancy protection
- **Chainlink AggregatorV3Interface**: For price feeds
- **Solidity 0.8.24**: Compiler version

---

## Key Features

### 1. **Leveraged Trading**
- Maximum leverage: **20x**
- Long positions: Profit when price increases
- Short positions: Profit when price decreases
- Position size in ETH units (18 decimals)

### 2. **Margin Management**
- **Maintenance Margin**: 5% (500 basis points)
- Positions below 5% margin ratio can be liquidated
- Users can add or remove margin (with safety checks)

### 3. **Position Aggregation**
- Adding to an existing position uses **Volume-Weighted Average Price (VWAP)**
- Cannot flip position direction in one transaction (must close first)

### 4. **Liquidation**
- Anyone can liquidate positions below maintenance margin
- Liquidator receives the remaining margin as reward
- Batch liquidation support for efficiency

### 5. **Price Oracle**
- Uses Chainlink `AggregatorV3Interface` for price feeds
- Supports per-token price feed configuration
- Staleness check disabled (for testing; can be re-enabled)

---

## Core Logic & Mechanics

### Position Opening Flow

1. **User calls `openPosition(isLong, sizeAbs, marginAmount)`**
2. Contract transfers collateral from user
3. Gets current mark price from oracle
4. Calculates position size (positive for long, negative for short)
5. If existing position:
   - Validates same direction
   - Updates entry price using VWAP
   - Combines sizes
6. Checks leverage: `notional ≤ margin × 20`
7. Stores position and emits event

### Position Closing Flow

1. **User calls `closePosition(sizeToClose)`**
2. Contract gets current mark price
3. Calculates PnL for the closed portion
4. Returns proportional margin + PnL (or margin - loss)
5. Updates position (reduces size/margin or clears if fully closed)

### Margin Ratio Calculation

```solidity
equity = margin + unrealizedPnL
marginRatio = (equity / notional) × 10,000  // in basis points
```

- **Margin ratio ≥ 500 bps (5%)**: Position is healthy
- **Margin ratio < 500 bps**: Position can be liquidated

### Profit & Loss (PnL)

**Long Position:**
```
PnL = size × (exitPrice - entryPrice)
```

**Short Position:**
```
PnL = size × (entryPrice - exitPrice)
```

### Volume-Weighted Average Price (VWAP)

When adding to an existing position:
```
newEntryPrice = (oldNotional + newNotional) / (oldSize + newSize)
```

This ensures fair averaging when increasing position size.

---

## Contract Structure

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PRICE_DECIMALS` | 8 | Price feed decimals (Chainlink standard) |
| `MARGIN_DECIMALS` | 18 | Collateral and size decimals (Ether wei) |
| `MAINTENANCE_MARGIN_BPS` | 500 | 5% maintenance margin (500 basis points) |
| `MAX_LEVERAGE` | 20 | Maximum leverage multiplier |

### Position Struct

```solidity
struct Position {
    int256 size;           // Positive = long, negative = short
    uint256 entryPrice;    // Volume-weighted average entry price (8 decimals)
    uint256 margin;        // Collateral locked (18 decimals)
    uint256 lastUpdatedAt; // Timestamp of last update
}
```

### Storage Variables

- `positions`: Mapping of trader address → Position
- `_positionHolders`: Array of active traders (for enumeration)
- `activeTrades`: Mapping of trader → boolean (active status)
- `priceFeed`: Chainlink price feed aggregator
- `collateralToken`: ERC20 token used as margin
- `owner`: Contract owner (can upgrade and configure)

---

## Functions Reference

### Core Trading Functions

#### `openPosition(bool isLong, uint256 sizeAbs, uint256 marginAmount)`
Opens a new position or adds to an existing one.
- **Parameters:**
  - `isLong`: `true` for long, `false` for short
  - `sizeAbs`: Position size in ETH (18 decimals)
  - `marginAmount`: Collateral amount (18 decimals)
- **Checks:** Leverage ≤ 20x, same direction if existing position
- **Events:** `PositionOpened`

#### `closePosition(uint256 sizeToClose)`
Closes part or all of a position.
- **Parameters:**
  - `sizeToClose`: Amount to close (18 decimals)
- **Returns:** Margin + PnL (or margin - loss)
- **Events:** `PositionClosed`

#### `addMargin(uint256 amount)`
Adds collateral to an existing position.
- **Effect:** Increases margin, improves margin ratio
- **Events:** `MarginAdded`

#### `removeMargin(uint256 amount)`
Removes collateral from a position.
- **Checks:** Margin ratio must stay ≥ 5% after removal
- **Events:** `MarginRemoved`

### Liquidation Functions

#### `liquidate(address trader)`
Liquidates a single undercollateralized position.
- **Reward:** Liquidator receives remaining margin
- **Events:** `Liquidated`

#### `liquidateBatch(address[] calldata traders)`
Liquidates multiple positions in one transaction.
- **Returns:** Number of successful liquidations
- **Gas Efficient:** For liquidators processing many positions

### View Functions

#### `getPosition(address trader)`
Returns position details: size, entryPrice, margin, lastUpdatedAt.

#### `getMarginRatio(address trader)`
Returns margin ratio in basis points (e.g., 1000 = 10%).

#### `isLiquidatable(address trader)`
Returns `true` if position can be liquidated.

#### `getMarkPrice()`
Returns current ETH/USD price from oracle (8 decimals).

#### `calculateRequiredMargin(uint256 sizeAbs, uint256 leverage)`
Calculates minimum margin needed for a position.
- **Returns:** `(requiredMargin, notional)`

#### `calculateMaxPositionSize(uint256 marginAmount, uint256 leverage)`
Calculates maximum position size for given margin and leverage.
- **Returns:** `(maxSize, maxNotional, requiredMargin)`

#### `getActiveTradesWithHealth()`
Returns all active traders and their margin ratios (for monitoring).

#### `getLiquidatableActiveTrades()`
Returns addresses of all liquidatable positions.

### Owner Functions

#### `setTradedToken(address _tradedToken)`
Sets the traded token address (for multi-token support).

#### `setPriceFeedForToken(address token, address feed)`
Configures a price feed for a specific token.

---

## Formulas

For detailed formulas and examples, see **[docs/FORMULAS.md](./docs/FORMULAS.md)**.

### Quick Reference

| Concept | Formula |
|---------|---------|
| **Notional** | `Size × Entry Price` |
| **Required Margin** | `Notional ÷ Leverage` |
| **Max Size** | `Margin × Leverage ÷ Price` |
| **PnL (Long)** | `Size × (Exit - Entry)` |
| **PnL (Short)** | `Size × (Entry - Exit)` |
| **Equity** | `Margin + PnL` |
| **Margin Ratio** | `(Equity / Notional) × 100%` |
| **Liquidatable** | `Margin Ratio < 5%` |

---

## Security Features

### 1. **Reentrancy Protection**
- All state-changing functions use `nonReentrant` modifier
- Uses OpenZeppelin's `ReentrancyGuardUpgradeable`

### 2. **Fee-on-Transfer Token Support**
- Uses balance-before/after pattern to handle tokens with transfer fees
- Only credits actual received amount

### 3. **Liquidity Checks**
- `closePosition` checks contract has enough liquidity before payout
- Reverts with `InsufficientLiquidity` if balance insufficient

### 4. **Leverage Limits**
- Hard cap at 20x leverage
- Enforced on every position open/add

### 5. **Access Control**
- Owner-only functions for configuration
- Upgrade authorization restricted to owner

### 6. **Input Validation**
- Zero size/margin checks
- Position existence checks
- Direction validation (can't flip in one tx)

---

## Deployment

### Prerequisites
- Node.js and npm
- Hardhat
- Private key with Sepolia ETH (for testnet)
- `.env` file with configuration

### Environment Variables

```env
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRICE_FEED_ADDRESS=0x8Ce022D3901FCc9C3944E00c612Dc5c5C7F7683F  # Mock feed
COLLATERAL_TOKEN_ADDRESS=0x799a5570318c0C5Fcfd09b0f573335B5aa8d85Ff  # MockERC20
```

### Deploy Script

```bash
npx hardhat run scripts/deploySimple.js --network sepolia
```

This will:
1. Deploy MockAggregatorV3 (if not provided)
2. Deploy MockERC20 collateral token (if not provided)
3. Deploy PerpetualExchange implementation
4. Deploy ExchangeProxy with initialization
5. Print all addresses

### Upgrade Script

To upgrade the contract:
```bash
npx hardhat run scripts/upgradeProxy.js --network sepolia
```

**Note:** Only the owner can upgrade. The proxy address remains the same; only the implementation changes.

---

## Usage Examples

### Opening a Long Position

```solidity
// 2 ETH long, 10x leverage, 400 COLL margin
perpetualExchange.openPosition(
    true,           // isLong
    parseEther("2"), // sizeAbs
    parseEther("400") // marginAmount
);
```

### Closing a Position

```solidity
// Close 1 ETH (half of 2 ETH position)
perpetualExchange.closePosition(parseEther("1"));
```

### Adding Margin

```solidity
// Add 100 COLL to position
perpetualExchange.addMargin(parseEther("100"));
```

### Checking Position

```solidity
(int256 size, uint256 entryPrice, uint256 margin, uint256 lastUpdated) = 
    perpetualExchange.getPosition(msg.sender);
    
uint256 marginRatio = perpetualExchange.getMarginRatio(msg.sender);
bool canLiquidate = perpetualExchange.isLiquidatable(msg.sender);
```

### Liquidating a Position

```solidity
// Anyone can liquidate undercollateralized positions
perpetualExchange.liquidate(traderAddress);
```

---

## Contract Addresses (Sepolia Testnet)

### Current Deployment
- **Proxy (use this)**: `0xf1d034E8b0973a3ECE2ecbAC7c62bf7664bAf330`
- **Implementation**: `0xEab0ce81ed94f36B10e39E5Af8a10FC58E5Fd974`
- **Price Feed**: `0x8Ce022D3901FCc9C3944E00c612Dc5c5C7F7683F` (MockAggregatorV3)
- **Collateral Token**: `0x799a5570318c0C5Fcfd09b0f573335B5aa8d85Ff` (MockERC20)
- **Owner**: `0xf69F75EB0c72171AfF58D79973819B6A3038f39f`



**View on Etherscan:**
- Proxy: https://sepolia.etherscan.io/address/0xf1d034E8b0973a3ECE2ecbAC7c62bf7664bAf330

---

## Price Feed Bot

For testing, run the price feed bot to keep the mock feed updated:

```bash
node scripts/priceFeedBot.js
```

This bot:
- Fetches ETH/USD price from CoinGecko API
- Updates the mock feed every 15 seconds
- Ensures prices stay fresh for trading

---

## Testing

Run tests with:
```bash
npx hardhat test
```

Test coverage includes:
- Position opening/closing
- Margin management
- Leverage limits
- Liquidation logic
- PnL calculations
- Edge cases

---

## Frontend Integration

The contract is integrated with a Next.js frontend. See `frontend/` directory for:
- Web3 wallet connection (MetaMask)
- Position management UI
- Real-time price chart
- Trading panel with leverage slider

---

## Risk Warnings

⚠️ **This is a testnet deployment for educational purposes.**

- Perpetual trading involves high risk
- Positions can be liquidated if margin ratio falls below 5%
- Maximum leverage is 20x (amplifies both profits and losses)
- Use only funds you can afford to lose
- Always verify contract addresses before interacting

---

## License

MIT License - See LICENSE file for details.

---

## Support & Documentation

- **Formulas Guide**: [docs/FORMULAS.md](./docs/FORMULAS.md)
- **Contract Code**: [contracts/PerpetualExchange.sol](./contracts/PerpetualExchange.sol)
- **Deployment Scripts**: [scripts/](./scripts/)

---

**Built with ❤️ using Solidity, Hardhat, and OpenZeppelin**
