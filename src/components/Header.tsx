import React from 'react';
import { ArticleCategory } from '../types';
import { 
  Search, 
  Bookmark, 
  Calculator, 
  Calendar, 
  LineChart, 
  Sparkles,
  Layers,
  ChevronDown,
  ShieldCheck
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';

interface HeaderProps {
  activeCategory: ArticleCategory;
  onSelectCategory: (category: ArticleCategory) => void;
  savedArticlesCount: number;
  onOpenSavedModal: () => void;
  onOpenSearchModal: () => void;
  onOpenCalculator: () => void;
  onOpenCalendar: () => void;
  onOpenChart: () => void;
  onOpenNewsletter: () => void;
}

const CATEGORIES: ArticleCategory[] = [
  'All',
  'Macro & Liquidity',
  'Order Flow & Price Action',
  'Algorithmic & Quant',
  'FX & Commodities',
  'Options & Derivatives',
  'Risk & Psychology'
];

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  savedArticlesCount,
  onOpenSavedModal,
  onOpenSearchModal,
  onOpenCalculator,
  onOpenCalendar,
  onOpenChart,
  onOpenNewsletter
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800">
      {/* Top Branding Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onSelectCategory('All')}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            {/* Custom High-Tech Monogram Badge */}
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-[1px] shadow-lg shadow-amber-500/10">
              <div className="w-full h-full bg-[#0E131F] rounded-[11px] flex items-center justify-center relative overflow-hidden group-hover:bg-[#131a2a] transition-colors">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent opacity-50"></div>
                <span className="font-bold text-lg tracking-tighter bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent font-mono-num">
                  SM
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-black text-xl sm:text-2xl tracking-tight text-white group-hover:text-amber-300 transition-colors flex items-center">
                  SMTrading<span className="text-amber-400">.com</span>
                </span>
                <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-600/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/35 shadow-sm backdrop-blur-sm tracking-wide">
                  <span>by ABU ASAD ALMANSI</span>
                  <BlueVerifiedBadge size="sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                <span className="text-slate-200 font-semibold tracking-wider text-[10px] uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                  Smart Money Trading
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 hidden sm:inline">Institutional Order Flow & Quantitative SMC</span>
              </div>
            </div>
          </button>
        </div>

        {/* Action Controls & Utilities */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Quick Search Button */}
          <button
            onClick={onOpenSearchModal}
            className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg border border-slate-800 transition-all text-xs font-medium cursor-pointer"
            title="Search Articles & Strategy Models"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Search Alpha...</span>
            <kbd className="hidden sm:inline-block bg-slate-800 text-[10px] text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono-num">
              ⌘K
            </kbd>
          </button>

          {/* Institutional Tools Dropdown / Buttons */}
          <div className="hidden md:flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <button
              onClick={onOpenCalculator}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-amber-300 bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-800 transition-colors cursor-pointer"
              title="Position Size & Risk Calculator"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>Risk Calculator</span>
            </button>

            <button
              onClick={onOpenCalendar}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-amber-300 bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-800 transition-colors cursor-pointer"
              title="Macro Economic Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Calendar</span>
            </button>

            <button
              onClick={onOpenChart}
              className="flex items-center gap-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/50 px-2.5 py-1.5 rounded-md border border-cyan-500/30 transition-colors cursor-pointer shadow-sm"
              title="Live TradingView Chart & SMC Simulator"
            >
              <LineChart className="w-3.5 h-3.5 text-cyan-400" />
              <span>TradingView Studio</span>
            </button>
          </div>

          {/* Bookmarks Drawer Trigger */}
          <button
            onClick={onOpenSavedModal}
            className="relative p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-colors cursor-pointer"
            title="Saved Reading List"
          >
            <Bookmark className="w-4 h-4" />
            {savedArticlesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-mono-num font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                {savedArticlesCount}
              </span>
            )}
          </button>

          {/* Newsletter Subscribe CTA */}
          <button
            onClick={onOpenNewsletter}
            className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span>VIP Alpha Dispatch</span>
          </button>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <div className="bg-[#090D14] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
