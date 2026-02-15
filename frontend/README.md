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

Edit `.env.local` (or copy from `.env.local.example`). Use the same addresses as repo README lines 9–12:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xf1d034E8b0973a3ECE2ecbAC7c62bf7664bAf330
NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS=0x799a5570318c0C5Fcfd09b0f573335B5aa8d85Ff
NEXT_PUBLIC_PRICE_FEED=0x8Ce022D3901FCc9C3944E00c612Dc5c5C7F7683F
NEXT_PUBLIC_NETWORK=sepolia
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org
```
Price is read from the contract’s `getMarkPrice()` (proxy uses mock feed above). If you see “Stale price”, run `node scripts/updateMockPrice.js` or the price feed bot so the mock is updated within the last hour.

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
