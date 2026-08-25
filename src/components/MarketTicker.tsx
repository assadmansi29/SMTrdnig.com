import React, { useEffect, useState } from 'react';
import { MarketTickerItem } from '../types';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface MarketTickerProps {
  tickers: MarketTickerItem[];
  onSelectTicker?: (ticker: MarketTickerItem) => void;
}

export const MarketTicker: React.FC<MarketTickerProps> = ({ tickers, onSelectTicker }) => {
  const [liveTickers, setLiveTickers] = useState<MarketTickerItem[]>(tickers);
  const [flashKey, setFlashKey] = useState<string | null>(null);

  // Micro subtle tick oscillation to give real live market feel
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * liveTickers.length);
      const target = liveTickers[randomIndex];
      const deltaPercent = (Math.random() - 0.48) * 0.08; // slight jitter
      const newPrice = target.price * (1 + deltaPercent / 100);
      const newChange = target.change + (newPrice - target.price);
      const newChangePercent = target.changePercent + deltaPercent;

      setLiveTickers(prev => prev.map((t, idx) => {
        if (idx === randomIndex) {
          return {
            ...t,
            price: Number(newPrice.toFixed(target.category === 'Forex' ? 4 : target.category === 'Rates' ? 3 : 2)),
            change: Number(newChange.toFixed(target.category === 'Forex' ? 4 : 2)),
            changePercent: Number(newChangePercent.toFixed(2)),
          };
        }
        return t;
      }));

      setFlashKey(target.symbol);
      setTimeout(() => setFlashKey(null), 800);
    }, 2400);

    return () => clearInterval(interval);
  }, [liveTickers]);

  return (
    <div className="bg-[#070A0F] border-b border-slate-800/80 text-xs py-2 px-4 overflow-hidden relative select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Live Badge */}
        <div className="hidden md:flex items-center gap-2 pr-4 border-r border-slate-800 text-slate-400 font-mono-num shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-300 flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            Live Alpha Feed
          </span>
        </div>

        {/* Scrolling Tickers */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-6 px-4">
          {liveTickers.map((item) => {
            const isPositive = item.changePercent >= 0;
            const isFlashing = flashKey === item.symbol;

            return (
              <button
                key={item.symbol}
                onClick={() => onSelectTicker?.(item)}
                className={`flex items-center gap-2.5 py-0.5 px-2 rounded hover:bg-slate-800/50 transition-colors whitespace-nowrap text-left cursor-pointer group ${
                  isFlashing ? (isPositive ? 'bg-emerald-950/40' : 'bg-rose-950/40') : ''
                }`}
              >
                <span className="font-semibold text-slate-200 group-hover:text-amber-400 transition-colors">
                  {item.symbol}
                </span>

                <span className="font-mono-num font-medium text-slate-300">
                  {item.category === 'Forex' ? item.price.toFixed(4) :
                   item.category === 'Rates' ? `${item.price.toFixed(3)}%` :
                   `$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>

                <span
                  className={`flex items-center text-[11px] font-mono-num font-semibold ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5" />
                  )}
                  {isPositive ? '+' : ''}
                  {item.changePercent.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Market Sessions status */}
        <div className="hidden lg:flex items-center gap-4 pl-4 border-l border-slate-800 text-[11px] text-slate-400 shrink-0 font-mono-num">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>NY <strong className="text-slate-200">OPEN</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>LON <strong className="text-slate-200">OPEN</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            <span className="text-slate-500">TYO CLSD</span>
          </div>
        </div>
      </div>
    </div>
  );
};
