'use client';

import WalletButton from '@/components/WalletButton';
import TradingPanel from '@/components/TradingPanel';
import PositionCard from '@/components/PositionCard';
import PriceChart from '@/components/PriceChart';
import { useWallet } from '@/hooks/useWallet';

export default function Home() {
  const { account, isCorrectNetwork } = useWallet();

  return (
    <main className="min-h-screen">
      <header className="bg-white/80 backdrop-blur border-b border-slate-200/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Perpetual Exchange</h1>
              <p className="text-sm text-slate-500">ETH/USD · Sepolia</p>
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {account && !isCorrectNetwork && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-center">
            Please switch to Sepolia in your wallet to trade.
          </div>
        )}

        <div className="mb-6">
          <PriceChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <TradingPanel />
          </div>
          <div>
            <PositionCard />
          </div>
        </div>

        <div className="mt-8 bg-white/90 backdrop-blur rounded-2xl shadow-lg border border-slate-200/80 p-6">
          <h3 className="text-lg font-bold mb-4 text-slate-800">How it works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="font-semibold mb-2 text-slate-700">1. Connect & approve</div>
              <p className="text-sm text-slate-600">
                Connect MetaMask on Sepolia and approve COLL for the exchange.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-2 text-slate-700">2. Open position</div>
              <p className="text-sm text-slate-600">
                Go long or short with margin and leverage (1x–20x). Size is in ETH units.
              </p>
            </div>
            <div>
              <div className="font-semibold mb-2 text-slate-700">3. Manage</div>
              <p className="text-sm text-slate-600">
                Add or remove margin, close part or all of your position anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-amber-50/80 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-lg">⚠️</span>
            <div>
              <div className="font-semibold text-amber-900 mb-1">Risk warning</div>
              <p className="text-sm text-amber-800">
                Perpetual trading is risky. Positions can be liquidated if margin ratio falls below 5%. 
                Use only funds you can afford to lose. Max leverage 20x.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
