'use client';

import WalletButton from '@/components/WalletButton';
import TradingPanel from '@/components/TradingPanel';
import PositionCard from '@/components/PositionCard';
import { usePerpetual } from '@/hooks/usePerpetual';

export default function Home() {
  const { markPrice } = usePerpetual();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Perpetual Exchange</h1>
              <p className="text-sm text-gray-600">Trade ETH/USD perpetual futures</p>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Price Display */}
        <div className="mb-8 text-center">
          <div className="inline-block bg-white rounded-lg shadow-lg px-8 py-4">
            <div className="text-sm text-gray-600 mb-1">ETH/USD Price</div>
            <div className="text-4xl font-bold text-blue-600">
              ${Number(markPrice).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trading Panel */}
          <div>
            <TradingPanel />
          </div>

          {/* Position Card */}
          <div>
            <PositionCard />
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="font-semibold mb-2">1. Connect Wallet</div>
              <p className="text-sm text-gray-600">
                Connect your MetaMask wallet to start trading
              </p>
            </div>
            <div>
              <div className="font-semibold mb-2">2. Open Position</div>
              <p className="text-sm text-gray-600">
                Choose Long or Short, set size and leverage (up to 20x)
              </p>
            </div>
            <div>
              <div className="font-semibold mb-2">3. Manage Position</div>
              <p className="text-sm text-gray-600">
                Monitor your position, add/remove margin, or close anytime
              </p>
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-3">⚠️</div>
            <div>
              <div className="font-semibold text-yellow-800 mb-1">Risk Warning</div>
              <p className="text-sm text-yellow-700">
                Trading perpetual futures involves significant risk. Positions can be liquidated if margin ratio falls below 5%. 
                Only trade with funds you can afford to lose. Maximum leverage is 20x.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
