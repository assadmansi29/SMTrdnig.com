import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  group: 'Minutes' | 'Hours' | 'Daily';
}

export const ALL_TIMEFRAMES: ChartTimeframe[] = [
  { value: '1', label: '1m', group: 'Minutes' },
  { value: '5', label: '5m', group: 'Minutes' },
  { value: '15', label: '15m', group: 'Minutes' },
  { value: '30', label: '30m', group: 'Minutes' },
  { value: '60', label: '1H', group: 'Hours' },
  { value: '120', label: '2H', group: 'Hours' },
  { value: '240', label: '4H', group: 'Hours' },
  { value: '1D', label: '1D', group: 'Daily' },
];

export const QUICK_TIMEFRAMES: { value: string; label: string }[] = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1H' },
  { value: '240', label: '4H' },
  { value: '1D', label: '1D' },
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

  // Lock body scroll when any toolbar modal is open
  useEffect(() => {
    if (isInstrumentMenuOpen || isTimeframeMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isInstrumentMenuOpen, isTimeframeMenuOpen]);

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

          {/* Centered Instrument Selector Modal */}
          {isInstrumentMenuOpen && typeof document !== 'undefined' && createPortal(
            <div
              id="modal-instrument-selector"
              className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
              onClick={() => setIsInstrumentMenuOpen(false)}
            >
              <div
                className="w-full max-w-lg bg-[#0C111C] border-t sm:border border-slate-700/90 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-200 text-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle Bar on mobile */}
                <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden mb-2" />

                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                      <BarChart2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-white truncate">Select Market Instrument</h3>
                      <p className="text-xs text-slate-400 font-mono truncate">Live Institutional Multi-Asset Feed</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsInstrumentMenuOpen(false)}
                    className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                    aria-label="Close instrument selector"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={instrumentSearch}
                    onChange={(e) => setInstrumentSearch(e.target.value)}
                    placeholder="Search symbol (e.g. Gold, US30, BTC, EURUSD)..."
                    className="w-full bg-[#11192E] border border-slate-700/90 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono"
                  />
                  {instrumentSearch && (
                    <button
                      type="button"
                      onClick={() => setInstrumentSearch('')}
                      className="absolute right-3 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs border-b border-slate-800/80">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg whitespace-nowrap transition-colors font-medium cursor-pointer ${
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
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                  {filteredInstruments.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
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
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200 shadow-sm'
                              : 'hover:bg-[#131C33] text-slate-200 border border-slate-800/60 bg-[#0E1524]/60'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 rounded-lg bg-slate-800/90 shrink-0">
                              {getCategoryIcon(inst.category)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-white">
                                  {inst.ticker}
                                </span>
                                <span className="text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-400 border border-slate-700/50">
                                  {inst.category}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {inst.name}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="p-1 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* 2. Direct Quick Timeframe Switcher (1m, 5m, 15m, 1H, 4H, 1D) + Dropdown */}
        <div className="flex items-center bg-[#0E1526] p-0.5 rounded-lg border border-[#1E293B]">
          <div className="flex items-center gap-0.5">
            {QUICK_TIMEFRAMES.map((tf) => {
              const isSelected = tf.value === currentInterval;
              return (
                <button
                  key={tf.value}
                  id={`btn-timeframe-${tf.value}`}
                  type="button"
                  onClick={() => onSelectInterval(tf.value)}
                  className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
                  }`}
                  title={`Switch to ${tf.label} timeframe`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* More Timeframes Dropdown Button */}
          <div className="relative" ref={timeframeDropdownRef}>
            <button
              id="btn-timeframe-selector"
              type="button"
              onClick={() => {
                setIsTimeframeMenuOpen((prev) => !prev);
                setIsInstrumentMenuOpen(false);
              }}
              className={`p-1 rounded text-xs transition-colors cursor-pointer flex items-center gap-0.5 ${
                isTimeframeMenuOpen || !QUICK_TIMEFRAMES.some((q) => q.value === currentInterval)
                  ? 'text-amber-400 bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title="All Timeframes"
            >
              {!QUICK_TIMEFRAMES.some((q) => q.value === currentInterval) && (
                <span className="text-xs font-mono font-bold text-amber-300 px-1">{currentTimeframe.label}</span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isTimeframeMenuOpen ? 'rotate-180 text-amber-400' : ''
                }`}
              />
            </button>

            {/* Centered Timeframe Selector Modal */}
            {isTimeframeMenuOpen && typeof document !== 'undefined' && createPortal(
              <div
                id="modal-timeframe-selector"
                className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
                onClick={() => setIsTimeframeMenuOpen(false)}
              >
                <div
                  className="w-full max-w-sm bg-[#0C111C] border-t sm:border border-slate-700/90 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-200 text-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Handle Bar on mobile */}
                  <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden mb-2" />

                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
                      <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-white truncate">Select Timeframe</h3>
                        <p className="text-xs text-slate-400 font-mono truncate">Chart Interval Scale</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTimeframeMenuOpen(false)}
                      className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                      aria-label="Close timeframe selector"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Grouped Timeframes */}
                  {(['Minutes', 'Hours', 'Daily'] as const).map((group) => {
                    const groupItems = ALL_TIMEFRAMES.filter((tf) => tf.group === group);
                    if (groupItems.length === 0) return null;
                    return (
                      <div key={group} className="space-y-1.5">
                        <div className="text-xs font-mono uppercase text-slate-400 px-1 py-0.5 tracking-wider font-semibold">
                          {group}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
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
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                                  isSelected
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                                    : 'bg-[#0E1524] hover:bg-slate-800 text-slate-300 border-slate-800'
                                }`}
                              >
                                <span>{tf.label}</span>
                                {isSelected && <Check className="w-4 h-4 text-amber-400 stroke-[3]" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>,
              document.body
            )}
          </div>
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
            <span className="hidden sm:inline">144 Strategy</span>
            <span className="sm:hidden">144</span>
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
            title="SMC Strategy: Smart Money Concepts (LuxAlgo) with BOS, CHoCH, Order Blocks, and FVGs"
          >
            <Layers className={`w-3.5 h-3.5 ${activeStrategy === 'smc' ? 'text-sky-300' : 'text-sky-400'}`} />
            <span className="hidden sm:inline">SMC Strategy</span>
            <span className="sm:hidden">SMC</span>
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
            <span className="hidden sm:inline">Fibonacci Strategy</span>
            <span className="sm:hidden">Fib</span>
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
