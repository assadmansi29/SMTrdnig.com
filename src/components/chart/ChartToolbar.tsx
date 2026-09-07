import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Search,
  Check,
  Layers,
  Grid3X3,
  Divide,
  Maximize2,
  Minimize2,
  ExternalLink,
  X,
  Clock,
  Coins,
  TrendingUp,
  Sparkles,
  BarChart2,
  Globe,
} from 'lucide-react';
import { MarketStatusIndicator } from './MarketStatusIndicator';

export interface ChartInstrument {
  symbol: string;
  name: string;
  ticker: string;
  category: 'Metals' | 'Indices' | 'Forex' | 'Crypto' | 'Futures' | 'Equities' | 'Macro';
  description: string;
}

export const ALL_INSTRUMENTS: ChartInstrument[] = [
  { symbol: 'BLACKBULL:XAUUSD', name: 'Spot Gold / USD (BlackBull)', ticker: 'XAUUSD', category: 'Metals', description: 'Spot Gold / US Dollar' },
  { symbol: 'BLACKBULL:NAS100', name: 'Nasdaq 100 (NAS100)', ticker: 'NAS100', category: 'Indices', description: 'Nasdaq 100 Tech Index' },
  { symbol: 'BLACKBULL:US30', name: 'Dow Jones (US30)', ticker: 'US30', category: 'Indices', description: 'Dow Jones Industrial Average' },
  { symbol: 'BLACKBULL:GER40', name: 'DAX 40 (GER40)', ticker: 'GER40', category: 'Indices', description: 'German DAX 40 Index' },
  { symbol: 'BLACKBULL:EURUSD', name: 'EUR / USD', ticker: 'EURUSD', category: 'Forex', description: 'Euro / US Dollar' },
  { symbol: 'BLACKBULL:GBPUSD', name: 'GBP / USD', ticker: 'GBPUSD', category: 'Forex', description: 'British Pound / US Dollar' },
  { symbol: 'BLACKBULL:BTCUSD', name: 'Bitcoin (BTC/USD)', ticker: 'BTCUSD', category: 'Crypto', description: 'Bitcoin / US Dollar' },
  { symbol: 'CME_MINI:ES1!', name: 'ES Futures (S&P 500)', ticker: 'ES1!', category: 'Futures', description: 'E-mini S&P 500 Index Futures' },
  { symbol: 'CME_MINI:NQ1!', name: 'NQ Futures (Nasdaq)', ticker: 'NQ1!', category: 'Futures', description: 'E-mini Nasdaq 100 Futures' },
  { symbol: 'NASDAQ:NVDA', name: 'NVIDIA Corp', ticker: 'NVDA', category: 'Equities', description: 'NVIDIA Corporation' },
  { symbol: 'TVC:DXY', name: 'US Dollar Index (DXY)', ticker: 'DXY', category: 'Macro', description: 'US Dollar Currency Index' },
];

export interface ChartTimeframe {
  value: string;
  label: string;
  group: 'Minutes' | 'Hours';
}

export const ALL_TIMEFRAMES: ChartTimeframe[] = [
  { value: '1', label: '1m', group: 'Minutes' },
  { value: '5', label: '5m', group: 'Minutes' },
  { value: '15', label: '15m', group: 'Minutes' },
  { value: '30', label: '30m', group: 'Minutes' },
  { value: '60', label: '1H', group: 'Hours' },
  { value: '120', label: '2H', group: 'Hours' },
  { value: '240', label: '4H', group: 'Hours' },
];

export type ChartStrategyType = '144' | 'smc' | 'fib' | null;

interface ChartToolbarProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  currentInterval: string;
  onSelectInterval: (interval: string) => void;
  activeStrategy: ChartStrategyType;
  onSelectStrategy: (strategy: ChartStrategyType) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onClose?: () => void;
  showModalControls?: boolean;
  className?: string;
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  currentSymbol,
  onSelectSymbol,
  currentInterval,
  onSelectInterval,
  activeStrategy,
  onSelectStrategy,
  isFullscreen = false,
  onToggleFullscreen,
  onClose,
  showModalControls = false,
  className = '',
}) => {
  const [isInstrumentMenuOpen, setIsInstrumentMenuOpen] = useState(false);
  const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false);
  const [instrumentSearch, setInstrumentSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  const instrumentDropdownRef = useRef<HTMLDivElement>(null);
  const timeframeDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        instrumentDropdownRef.current &&
        !instrumentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsInstrumentMenuOpen(false);
      }
      if (
        timeframeDropdownRef.current &&
        !timeframeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTimeframeMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsInstrumentMenuOpen(false);
        setIsTimeframeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-focus search input when instrument dropdown opens
  useEffect(() => {
    if (isInstrumentMenuOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setInstrumentSearch('');
      setSelectedCategoryFilter('All');
    }
  }, [isInstrumentMenuOpen]);

  // Current instrument metadata
  const currentInstrument =
    ALL_INSTRUMENTS.find((i) => i.symbol === currentSymbol) || {
      symbol: currentSymbol,
      name: currentSymbol.replace('BLACKBULL:', ''),
      ticker: currentSymbol.replace('BLACKBULL:', '').replace(/[^A-Z0-9]/g, ''),
      category: 'Metals' as const,
      description: currentSymbol,
    };

  // Current timeframe label
  const currentTimeframe =
    ALL_TIMEFRAMES.find((tf) => tf.value === currentInterval) || {
      value: currentInterval,
      label: currentInterval.endsWith('D') || currentInterval.endsWith('W') || currentInterval.endsWith('M')
        ? currentInterval
        : `${currentInterval}m`,
      group: 'Minutes' as const,
    };

  // Filter instruments by search & category
  const filteredInstruments = ALL_INSTRUMENTS.filter((inst) => {
    const matchesCategory =
      selectedCategoryFilter === 'All' || inst.category === selectedCategoryFilter;
    const q = instrumentSearch.trim().toLowerCase();
    if (!q) return matchesCategory;
    const matchesSearch =
      inst.name.toLowerCase().includes(q) ||
      inst.ticker.toLowerCase().includes(q) ||
      inst.symbol.toLowerCase().includes(q) ||
      inst.category.toLowerCase().includes(q) ||
      inst.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', 'Metals', 'Indices', 'Forex', 'Crypto', 'Futures', 'Equities', 'Macro'];

  const getCategoryDotColor = (category: string) => {
    switch (category) {
      case 'Metals':
        return 'bg-amber-400';
      case 'Indices':
        return 'bg-sky-400';
      case 'Forex':
        return 'bg-emerald-400';
      case 'Crypto':
        return 'bg-orange-400';
      case 'Futures':
        return 'bg-violet-400';
      case 'Equities':
        return 'bg-cyan-400';
      case 'Macro':
        return 'bg-pink-400';
      default:
        return 'bg-slate-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Metals':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      case 'Indices':
        return <TrendingUp className="w-3.5 h-3.5 text-sky-400" />;
      case 'Forex':
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Crypto':
        return <Coins className="w-3.5 h-3.5 text-orange-400" />;
      case 'Futures':
        return <Layers className="w-3.5 h-3.5 text-violet-400" />;
      case 'Equities':
        return <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getTradingViewExternalUrl = (sym: string) => {
    const raw = sym.replace('BLACKBULL:', '').replace('CME_MINI:', '').replace('NASDAQ:', '').replace('TVC:', '');
    return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym || raw)}`;
  };

  return (
    <div
      id="chart-top-toolbar"
      className={`bg-[#080C14] border-b border-[#131B2E] px-3 py-2 flex items-center justify-between gap-2.5 text-xs select-none relative z-30 transition-colors ${className}`}
    >
      {/* LEFT SECTION: Modern TradingView-Style Bar */}
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        
        {/* 1. ONE Compact Clickable Instrument Button with Professional Dropdown */}
        <div className="relative" ref={instrumentDropdownRef}>
          <button
            id="btn-instrument-selector"
            type="button"
            onClick={() => {
              setIsInstrumentMenuOpen((prev) => !prev);
              setIsTimeframeMenuOpen(false);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] ${
              isInstrumentMenuOpen
                ? 'bg-slate-800 border-amber-500/60 text-white ring-1 ring-amber-500/30'
                : 'bg-[#0E1526] hover:bg-[#151F36] border-[#1E293B] hover:border-slate-600 text-slate-100'
            }`}
            title="Click to search and change financial instrument"
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${getCategoryDotColor(currentInstrument.category)} animate-pulse`} />
              <span className="font-semibold tracking-tight truncate max-w-[140px] sm:max-w-[200px] md:max-w-none text-white">
                {currentInstrument.name}
              </span>
            </span>
            <span className="hidden md:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-400 border border-slate-700/60">
              {currentInstrument.category}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                isInstrumentMenuOpen ? 'rotate-180 text-amber-400' : ''
              }`}
            />
          </button>

          {/* Instrument Dropdown Menu */}
          {isInstrumentMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-[310px] sm:w-[380px] bg-[#0A0F1D] border border-slate-700/80 rounded-xl shadow-2xl p-2.5 z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
              {/* Search Bar */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={instrumentSearch}
                  onChange={(e) => setInstrumentSearch(e.target.value)}
                  placeholder="Search symbol (e.g. Gold, US30, BTC)..."
                  className="w-full bg-[#11192E] border border-slate-700/90 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
                />
                {instrumentSearch && (
                  <button
                    onClick={() => setInstrumentSearch('')}
                    className="absolute right-2 text-slate-400 hover:text-white p-0.5 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Category Pills Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px] border-b border-slate-800/80">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors font-medium cursor-pointer ${
                      selectedCategoryFilter === cat
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Instruments List */}
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {filteredInstruments.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    No instruments found matching "{instrumentSearch}"
                  </div>
                ) : (
                  filteredInstruments.map((inst) => {
                    const isSelected = inst.symbol === currentSymbol;
                    return (
                      <button
                        key={inst.symbol}
                        type="button"
                        onClick={() => {
                          onSelectSymbol(inst.symbol);
                          setIsInstrumentMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-sm'
                            : 'hover:bg-[#131C33] text-slate-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1 rounded bg-slate-800/80 shrink-0">
                            {getCategoryIcon(inst.category)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-white">
                                {inst.ticker}
                              </span>
                              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800/90 text-slate-400 border border-slate-700/50">
                                {inst.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {inst.name}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. ONE Compact Clickable Timeframe Button with Dropdown */}
        <div className="relative" ref={timeframeDropdownRef}>
          <button
            id="btn-timeframe-selector"
            type="button"
            onClick={() => {
              setIsTimeframeMenuOpen((prev) => !prev);
              setIsInstrumentMenuOpen(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] ${
              isTimeframeMenuOpen
                ? 'bg-slate-800 border-amber-500/60 text-white ring-1 ring-amber-500/30'
                : 'bg-[#0E1526] hover:bg-[#151F36] border-[#1E293B] hover:border-slate-600 text-amber-300'
            }`}
            title="Click to change chart timeframe"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400/80" />
            <span className="tracking-wide text-xs">{currentTimeframe.label}</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                isTimeframeMenuOpen ? 'rotate-180 text-amber-400' : ''
              }`}
            />
          </button>

          {/* Timeframe Dropdown Menu */}
          {isTimeframeMenuOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-[#0A0F1D] border border-slate-700/80 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
              {/* Grouped Timeframes */}
              {(['Minutes', 'Hours'] as const).map((group) => {
                const groupItems = ALL_TIMEFRAMES.filter((tf) => tf.group === group);
                return (
                  <div key={group} className="space-y-1">
                    <div className="text-[10px] font-mono uppercase text-slate-400 px-2 py-0.5 tracking-wider font-semibold">
                      {group}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {groupItems.map((tf) => {
                        const isSelected = tf.value === currentInterval;
                        return (
                          <button
                            key={tf.value}
                            type="button"
                            onClick={() => {
                              onSelectInterval(tf.value);
                              setIsTimeframeMenuOpen(false);
                            }}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                                : 'hover:bg-[#131C33] text-slate-300 border border-transparent'
                            }`}
                          >
                            <span>{tf.label}</span>
                            {isSelected && <Check className="w-3 h-3 text-amber-400 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subtle Divider */}
        <div className="h-5 w-px bg-slate-800/80 mx-0.5 hidden sm:block" />

        {/* 3. Three Independent Strategy Views: 144 Strategy, SMC Strategy, Fibonacci Strategy */}
        <div className="flex items-center gap-1.5">
          {/* 144 Strategy View */}
          <button
            id="btn-strategy-144"
            type="button"
            onClick={() => {
              onSelectStrategy(activeStrategy === '144' ? null : '144');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] ${
              activeStrategy === '144'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/40'
                : 'bg-[#0E1526] hover:bg-[#151F36] border-[#1E293B] hover:border-amber-500/40 text-slate-300 hover:text-amber-300'
            }`}
            title="144 Strategy: Open clean chart view with saved 144 Strategy analysis"
          >
            <Grid3X3 className={`w-3.5 h-3.5 ${activeStrategy === '144' ? 'text-amber-300' : 'text-amber-400'}`} />
            <span>144 Strategy</span>
            {activeStrategy === '144' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          {/* SMC Strategy View */}
          <button
            id="btn-strategy-smc"
            type="button"
            onClick={() => {
              onSelectStrategy(activeStrategy === 'smc' ? null : 'smc');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] ${
              activeStrategy === 'smc'
                ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.25)] ring-1 ring-sky-400/40'
                : 'bg-[#0E1526] hover:bg-[#151F36] border-[#1E293B] hover:border-sky-500/40 text-slate-300 hover:text-sky-300'
            }`}
            title="SMC Strategy: Open clean chart view with saved SMC Strategy analysis"
          >
            <Layers className={`w-3.5 h-3.5 ${activeStrategy === 'smc' ? 'text-sky-300' : 'text-sky-400'}`} />
            <span>SMC Strategy</span>
            {activeStrategy === 'smc' && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            )}
          </button>

          {/* Fibonacci Strategy View */}
          <button
            id="btn-strategy-fib"
            type="button"
            onClick={() => {
              onSelectStrategy(activeStrategy === 'fib' ? null : 'fib');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98] ${
              activeStrategy === 'fib'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/40'
                : 'bg-[#0E1526] hover:bg-[#151F36] border-[#1E293B] hover:border-emerald-500/40 text-slate-300 hover:text-emerald-300'
            }`}
            title="Fibonacci Strategy: Open clean chart view with saved Fibonacci Strategy analysis"
          >
            <Divide className={`w-3.5 h-3.5 ${activeStrategy === 'fib' ? 'text-emerald-300' : 'text-emerald-400'}`} />
            <span>Fibonacci Strategy</span>
            {activeStrategy === 'fib' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

      </div>

      {/* RIGHT SECTION: Market Status & Quick Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* Professional Compact Market Status Indicator */}
        <MarketStatusIndicator 
          id="chart-toolbar-market-status-button"
          symbol={currentSymbol} 
          compact={true}
          align="right"
        />

        {/* External TradingView Link */}
        <a
          href={getTradingViewExternalUrl(currentSymbol)}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0E1526] hover:bg-[#151F36] border border-[#1E293B] hover:border-slate-600 text-slate-300 hover:text-white transition-all text-xs cursor-pointer"
          title="Open in full TradingView browser tab"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden lg:inline">TradingView</span>
        </a>

        {/* Fullscreen Toggle (Optional in Modal) */}
        {onToggleFullscreen && (
          <button
            id="btn-toolbar-fullscreen"
            type="button"
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-lg bg-[#0E1526] hover:bg-[#151F36] border border-[#1E293B] hover:border-slate-600 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Close Button (if showModalControls) */}
        {showModalControls && onClose && (
          <button
            id="btn-toolbar-close"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition-all cursor-pointer"
            title="Close Chart"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
