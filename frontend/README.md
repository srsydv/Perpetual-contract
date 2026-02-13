# Perpetual Exchange Frontend

A modern Next.js frontend for the Perpetual Exchange smart contract.

## Features

- ✅ Connect MetaMask wallet
- ✅ Open Long/Short positions with leverage (1x-20x)
- ✅ View real-time ETH/USD price
- ✅ Monitor positions with PnL and margin ratio
- ✅ Add/Remove margin
- ✅ Close positions (partial or full)
- ✅ Calculate max position size and required margin
- ✅ Liquidation warnings
- ✅ Responsive design

## Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Configure environment variables:**
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your contract addresses:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xE296570898A8b41b51Efd6B243A04340551AC182
NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS=0x8702ee970b1175B9E4D1B992c853F4dF3341B5E6
NEXT_PUBLIC_CHAINLINK_FEED=0x694AA1769357215DE4FAC081bf1f309aDC325306
NEXT_PUBLIC_NETWORK=sepolia
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

3. **Run development server:**
```bash
npm run dev
```

4. **Open browser:**
Navigate to http://localhost:3000

## Usage

1. **Connect Wallet:** Click "Connect Wallet" and approve MetaMask connection
2. **Open Position:**
   - Select Long or Short
   - Enter position size (ETH)
   - Adjust leverage slider (1x-20x)
   - Enter margin amount (or use percentage buttons)
   - Click "Open Position"
   - Approve token spending if prompted
3. **Manage Position:**
   - View your position details, PnL, and margin ratio
   - Add margin to reduce liquidation risk
   - Remove margin (if margin ratio stays above 5%)
   - Close position partially or fully

## Contract Functions

- `openPosition(bool isLong, uint256 sizeAbs, uint256 marginAmount)` - Open new position
- `closePosition(uint256 sizeToClose)` - Close position
- `addMargin(uint256 amount)` - Add margin to position
- `removeMargin(uint256 amount)` - Remove margin from position
- `getPosition(address)` - Get position details
- `getMarginRatio(address)` - Get margin ratio
- `isLiquidatable(address)` - Check if position is liquidatable
- `getMarkPrice()` - Get current ETH/USD price
- `calculateMaxPositionSize(uint256 marginAmount, uint256 leverage)` - Calculate max position
- `calculateRequiredMargin(uint256 sizeAbs, uint256 leverage)` - Calculate required margin

## Network

Currently configured for **Sepolia testnet**. To use mainnet:
1. Update contract addresses in `.env.local`
2. Change `NEXT_PUBLIC_NETWORK=mainnet`
3. Update RPC URL

## Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

**Wallet not connecting:**
- Make sure MetaMask is installed
- Check that you're on the correct network (Sepolia)
- Refresh the page

**Transactions failing:**
- Check you have enough ETH for gas
- Ensure you have approved token spending
- Verify contract addresses are correct

**Price not updating:**
- Check RPC URL is correct
- Verify Chainlink feed address
