import React from 'react';
import { ShieldCheck, TrendingUp, Sparkles, Mail, Globe, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { ArticleCategory } from '../types';

interface FooterProps {
  onSelectCategory: (category: ArticleCategory) => void;
  onOpenCalculator: () => void;
  onOpenCalendar: () => void;
  onOpenChart: () => void;
  onOpenNewsletter: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onOpenCalculator,
  onOpenCalendar,
  onOpenChart,
  onOpenNewsletter
}) => {
  return (
    <footer className="bg-[#070A10] border-t border-slate-800 text-slate-400 text-xs">
      {/* Top Pre-Footer Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-slate-800/80">
        <div className="bg-gradient-to-r from-[#0C1220] via-[#101728] to-[#0A0E18] border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center justify-center md:justify-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              SMTrading.com Quantitative Network
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Stay ahead of central bank liquidity shifts and order flow imbalances.
            </h3>
            <p className="text-xs text-slate-400">
              Institutional-grade market analysis, volatility skew modeling, and algorithmic frameworks.
            </p>
          </div>

          <button
            onClick={onOpenNewsletter}
            className="shrink-0 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            Subscribe to VIP Alpha Dispatch
          </button>
        </div>
      </div>

      {/* Main Footer Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Brand Col */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E131F] border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 font-mono-num">
              SM
            </div>
            <span className="font-extrabold text-lg text-white">
              SMTrading<span className="text-amber-400">.com</span>
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed pr-6">
            SMTrading.com is an independent quantitative research journal and market intelligence platform delivering institutional analysis on global macro liquidity, price action microstructure, and derivatives volatility.
          </p>

          <div className="flex items-center gap-3 pt-2 text-slate-300">
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono-num text-amber-300">
              EST. 2026
            </span>
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono-num text-emerald-400">
              NYSE / CME / EUREX Feeds
            </span>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h4 className="font-bold text-white uppercase text-xs tracking-wider">Research Sectors</h4>
          <ul className="space-y-2">
            {(['Macro & Liquidity', 'Order Flow & Price Action', 'Algorithmic & Quant', 'FX & Commodities', 'Options & Derivatives', 'Risk & Psychology'] as ArticleCategory[]).map(c => (
              <li key={c}>
                <button
                  onClick={() => {
                    onSelectCategory(c);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-amber-300 transition-colors text-left cursor-pointer"
                >
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Interactive Tools */}
        <div className="space-y-3">
          <h4 className="font-bold text-white uppercase text-xs tracking-wider">Institutional Tools</h4>
          <ul className="space-y-2">
            <li>
              <button onClick={onOpenCalculator} className="hover:text-amber-300 transition-colors text-left flex items-center gap-1">
                Position Sizing & Risk Calculator
              </button>
            </li>
            <li>
              <button onClick={onOpenCalendar} className="hover:text-amber-300 transition-colors text-left flex items-center gap-1">
                Macro Economic Calendar
              </button>
            </li>
            <li>
              <button onClick={onOpenChart} className="hover:text-amber-300 transition-colors text-left flex items-center gap-1">
                Candlestick Pattern Simulator
              </button>
            </li>
            <li>
              <button onClick={onOpenNewsletter} className="hover:text-amber-300 transition-colors text-left flex items-center gap-1">
                VIP Weekly Alpha Dispatch
              </button>
            </li>
          </ul>
        </div>

        {/* Author Desk & Editorial */}
        <div className="space-y-3">
          <h4 className="font-bold text-white uppercase text-xs tracking-wider">Editorial Board</h4>
          <ul className="space-y-1.5 text-slate-400">
            <li>Dr. Alexander Vance (Quant)</li>
            <li>Elena Rostova (Macro & FX)</li>
            <li>Marcus Sterling, CFA (Derivatives)</li>
            <li>Dr. Sarah Chen (Risk Neuroscience)</li>
          </ul>
        </div>
      </div>

      {/* CFTC Rule 4.41 & Financial Risk Disclosure */}
      <div className="bg-[#05070C] border-t border-slate-800/80 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>CFTC & Risk Warning:</strong> Trading futures, equities, options, foreign exchange, and digital assets carries substantial risk of loss and is not suitable for every investor. The high degree of leverage that is often obtainable in commodity trading can work against you as well as for you. Content published on <strong>SMTrading.com</strong> is strictly for educational, informational, and quantitative research purposes and does not constitute financial, investment, or trading advice.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>© 2026 SMTrading.com. All rights reserved.</span>
            <div className="flex gap-4">
              <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-400 cursor-pointer">Editorial Policy</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
