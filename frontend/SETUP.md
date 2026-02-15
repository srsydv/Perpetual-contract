# Frontend Setup Guide

## Quick Start

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment is already configured** with your deployed contract addresses in `.env.local`

4. **Start development server:**
```bash
npm run dev
```

5. **Open browser:**
Go to http://localhost:3000

## What's Included

✅ **Complete Next.js Frontend** with:
- Wallet connection (MetaMask)
- Trading interface (Long/Short positions)
- Position management dashboard
- Real-time price updates
- Margin management
- PnL tracking
- Liquidation warnings

## Features

### Trading Panel
- Open Long/Short positions
- Adjustable leverage (1x-20x)
- Position size calculator
- Required margin calculator
- Max position size calculator

### Position Dashboard
- View current position details
- Real-time PnL calculation
- Margin ratio monitoring
- Liquidation warnings
- Add/Remove margin
- Close position (partial or full)

### Real-time Updates
- ETH/USD price updates every 10 seconds
- Position data refreshes every 5 seconds
- Automatic balance updates

## Contract Integration

The frontend is fully integrated with your deployed contracts:
- **PerpetualExchange (proxy)**: `0xf1d034E8b0973a3ECE2ecbAC7c62bf7664bAf330`
- **Collateral Token**: `0x799a5570318c0C5Fcfd09b0f573335B5aa8d85Ff`
- **Price Feed (mock, used by proxy)**: `0x8Ce022D3901FCc9C3944E00c612Dc5c5C7F7683F`

## Testing

1. Make sure you have Sepolia ETH for gas
2. Make sure you have collateral tokens (MockERC20)
3. Connect MetaMask wallet
4. Approve token spending when opening first position
5. Start trading!

## Troubleshooting

**Module not found errors:**
- Run `npm install` again
- Delete `node_modules` and `.next` folders, then reinstall

**Contract calls failing:**
- Check MetaMask is connected to Sepolia network
- Verify contract addresses in `.env.local`
- Check RPC URL is working

**Price not showing:**
- Verify Chainlink feed address
- Check RPC connection
