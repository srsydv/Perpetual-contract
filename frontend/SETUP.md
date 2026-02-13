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
- **PerpetualExchange**: `0xE296570898A8b41b51Efd6B243A04340551AC182`
- **Collateral Token**: `0x8702ee970b1175B9E4D1B992c853F4dF3341B5E6`
- **Chainlink Feed**: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

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
