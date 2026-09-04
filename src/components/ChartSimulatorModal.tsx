import React, { useState, useEffect } from 'react';
import { 
  X, 
  LineChart, 
  Layers, 
  Eye, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Crosshair, 
  BarChart3,
  ExternalLink,
  Columns,
  Maximize2,
  SlidersHorizontal,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { TradingViewWidget } from './TradingViewWidget';
import { ChartAnalysisOverlay } from './ChartAnalysisOverlay';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface ChartSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  onOpenAdminModal?: (tab?: string, symbol?: string, interval?: string) => void;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  label?: string;
}

const SAMPLE_CANDLES: Candle[] = [
  { time: '09:30', open: 5890, high: 5902, low: 5885, close: 5900, volume: 1420 },
  { time: '10:00', open: 5900, high: 5914, low: 5895, close: 5910, volume: 1950, label: 'Liquidity Sweep' },
  { time: '10:30', open: 5910, high: 5912, low: 5888, close: 5892, volume: 2400 },
  { time: '11:00', open: 5892, high: 5898, low: 5880, close: 5885, volume: 3100, label: 'Iceberg Absorption' },
  { time: '11:30', open: 5885, high: 5905, low: 5882, close: 5902, volume: 2800 },
  { time: '12:00', open: 5902, high: 5922, low: 5900, close: 5918, volume: 2100 },
  { time: '12:30', open: 5918, high: 5930, low: 5915, close: 5928, volume: 1800 },
  { time: '13:00', open: 5928, high: 5945, low: 5924, close: 5942, volume: 3400, label: 'Breakout Expansion' },
  { time: '13:30', open: 5942, high: 5954, low: 5938, close: 5948, volume: 2900 },
  { time: '14:00', open: 5948, high: 5962, low: 5944, close: 5958, volume: 3800 },
  { time: '14:30', open: 5958, high: 5970, low: 5952, close: 5965, volume: 4100 },
  { time: '15:00', open: 5965, high: 5975, low: 5960, close: 5972, volume: 3600, label: 'Target 2 Met' },
];

const POPULAR_SYMBOLS = [
  { symbol: 'OANDA:XAUUSD', name: 'Spot Gold / USD', category: 'Metals' },
  { symbol: 'OANDA:NAS100USD', name: 'Nasdaq 100 (NAS100)', category: 'Indices' },
  { symbol: 'OANDA:US30USD', name: 'Dow Jones (US30)', category: 'Indices' },
  { symbol: 'OANDA:DE30EUR', name: 'DAX 40 (GER40)', category: 'Indices' },
  { symbol: 'CME_MINI:ES1!', name: 'ES Futures (S&P 500)', category: 'Futures' },
  { symbol: 'CME_MINI:NQ1!', name: 'NQ Futures (Nasdaq)', category: 'Futures' },
  { symbol: 'BINANCE:BTCUSDT', name: 'BTC / USDT Perp', category: 'Crypto' },
  { symbol: 'FX:EURUSD', name: 'EUR / USD', category: 'Forex' },
  { symbol: 'NASDAQ:NVDA', name: 'NVIDIA Corp', category: 'Equities' },
  { symbol: 'TVC:DXY', name: 'US Dollar Index (DXY)', category: 'Macro' },
];

export const ChartSimulatorModal: React.FC<ChartSimulatorModalProps> = ({ 
  isOpen, 
  onClose,
  defaultSymbol = 'OANDA:XAUUSD',
  onOpenAdminModal
}) => {
  const { t, isRTL } = useTranslation();
  const { user } = useAuth();
  const isStaff = user?.role === 'super_admin' || user?.role === 'admin';
  const [selectedSymbol, setSelectedSymbol] = useState(defaultSymbol);
  const [viewLayout, setViewLayout] = useState<'split' | 'tv-only' | 'smc-only'>('split');
  const [activeInterval, setActiveInterval] = useState('15');
  
  // Sync selected symbol when defaultSymbol changes or modal opens
  useEffect(() => {
    if (defaultSymbol) {
      setSelectedSymbol(defaultSymbol);
    }
  }, [defaultSymbol, isOpen]);
  
  // SMC Simulator states
  const [showSMA, setShowSMA] = useState(true);
  const [showEMA, setShowEMA] = useState(true);
  const [showOrderBlocks, setShowOrderBlocks] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState<'5M' | '15M' | '1H' | '4H' | '1D'>('15M');
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(SAMPLE_CANDLES[SAMPLE_CANDLES.length - 1]);

  if (!isOpen) return null;

  // Chart calculation parameters for SMC Simulator
  const minPrice = 5875;
  const maxPrice = 5985;
  const priceRange = maxPrice - minPrice;
  const chartHeight = 240;
  const chartWidth = 520;

  const getY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
  };

  const candleSpacing = chartWidth / SAMPLE_CANDLES.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0B0F17] border border-slate-700/80 rounded-2xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-slate-800 bg-[#080C14] gap-2 shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-1 rtl:pr-0 rtl:pl-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-md shadow-amber-500/10 shrink-0">
              <div className="w-full h-full bg-[#0E131F] rounded-[11px] flex items-center justify-center text-amber-400">
                <LineChart className="w-5 h-5" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-xl text-white flex items-center gap-1.5 truncate">
                  <span>SMTrading<span className="text-amber-400">.pro</span></span>
                  <span className="text-slate-600">/</span>
                  <span className="text-slate-200 font-semibold text-xs sm:text-base truncate">{t('chartStudioTitle')}</span>
                </h3>
                <div className="hidden xs:inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-600/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/40 shadow-sm backdrop-blur-sm tracking-wide shrink-0">
                  <span>{t('chartStudioBy')}</span>
                  <BlueVerifiedBadge size="sm" />
                </div>
                <span className="text-slate-400 text-xs hidden md:inline font-medium">
                  (Smart Money Trading)
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {t('chartStudioFeed')}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {t('chartStudioDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Close Chart Studio"
              aria-label="Close Chart Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Toolbar & Symbol Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#090D17] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Quick Symbol Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-slate-400 font-mono-num text-[11px] font-semibold uppercase pr-1 hidden sm:inline">
              {t('chartSymbol')}:
            </span>
            {POPULAR_SYMBOLS.map((s) => {
              const isSelected = selectedSymbol === s.symbol;
              return (
                <button
                  key={s.symbol}
                  onClick={() => setSelectedSymbol(s.symbol)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono-num font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>

          {/* View Mode Controls (TradingView Left / SMC Right / Full) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewLayout('split')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === 'split'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Split layout: TradingView.com chart on left + SMC Order Flow on right"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('chartSplitLayout')}</span>
                <span className="sm:hidden">Split</span>
              </button>

              <button
                onClick={() => setViewLayout('tv-only')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === 'tv-only'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="TradingView.com 100% Full Chart"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('chartTvFull')}</span>
                <span className="sm:hidden">TV</span>
              </button>

              <button
                onClick={() => setViewLayout('smc-only')}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewLayout === 'smc-only'
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Smart Money Concepts Simulator Only"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('chartSmcEngine')}</span>
                <span className="sm:hidden">SMC</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Chart Canvas Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#070A10]">
          <div className={`grid gap-4 h-full ${
            viewLayout === 'split' 
              ? 'grid-cols-1 lg:grid-cols-12 min-h-[580px]' 
              : 'grid-cols-1 min-h-[580px]'
          }`}>
            
            {/* LEFT PANEL: TradingView.com Live Chart */}
            {(viewLayout === 'split' || viewLayout === 'tv-only') && (
              <div className={`${
                viewLayout === 'split' ? 'lg:col-span-7' : 'w-full'
              } flex flex-col bg-[#090D17] rounded-xl border border-slate-800 overflow-hidden shadow-lg min-h-[480px]`}>
                
                {/* Panel Label Bar */}
                <div className="px-4 py-2 bg-[#0A0F1A] border-b border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-bold text-white tracking-wide">
                      {t('chartLiveTvChart')}
                    </span>
                    <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono-num text-[10px] font-bold">
                      {selectedSymbol}
                    </span>
                  </div>
                  <a
                    href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selectedSymbol)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    {t('chartOpenTv')} <ExternalLink className="w-3 h-3 rtl:rotate-180" />
                  </a>
                </div>

                {/* Institutional SMC Analysis Overlay */}
                <div className="p-2.5 pb-0">
                  <ChartAnalysisOverlay
                    symbol={selectedSymbol}
                    interval={activeInterval}
                    onOpenAnalysisStudio={onOpenAdminModal ? () => {
                      onClose();
                      onOpenAdminModal('tradingview_studio', selectedSymbol, activeInterval);
                    } : undefined}
                    isAdmin={isStaff}
                  />
                </div>

                {/* Actual Real-Time TradingView Widget */}
                <div className="flex-1 w-full h-[520px]">
                  <TradingViewWidget
                    key={`${selectedSymbol}_${activeInterval}_${isStaff}`}
                    symbol={selectedSymbol}
                    theme="dark"
                    interval={activeInterval}
                    timezone="Etc/UTC"
                    enableDrawingTools={isStaff}
                  />
                </div>
              </div>
            )}

            {/* RIGHT PANEL: Smart Money Concepts & Order Flow Simulator */}
            {(viewLayout === 'split' || viewLayout === 'smc-only') && (
              <div className={`${
                viewLayout === 'split' ? 'lg:col-span-5' : 'w-full'
              } flex flex-col bg-[#090D17] rounded-xl border border-slate-800 overflow-hidden shadow-lg`}>
                
                {/* Right Panel Subheader */}
                <div className="px-4 py-2.5 bg-[#0A0F1A] border-b border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block">
                        {t('chartOrderFlowTitle')}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-amber-300 font-medium">
                          {t('chartSmcArchitecture')}
                        </span>
                        <BlueVerifiedBadge size="xs" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Indicators toggle strip */}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono-num">
                    <button
                      onClick={() => setShowOrderBlocks(!showOrderBlocks)}
                      className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                        showOrderBlocks
                          ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40 font-bold'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {t('chartObZones')}
                    </button>
                    <button
                      onClick={() => setShowVolume(!showVolume)}
                      className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                        showVolume
                          ? 'bg-purple-400/20 text-purple-300 border-purple-400/40 font-bold'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {t('chartVolProfile')}
                    </button>
                  </div>
                </div>

                {/* Candlestick Diagnostics Readout */}
                {hoveredCandle && (
                  <div className="px-4 py-2 bg-[#06080E] border-b border-slate-800 text-[10px] font-mono-num flex flex-wrap items-center justify-between gap-2 text-slate-400">
                    <span>T: <strong className="text-slate-200">{hoveredCandle.time}</strong></span>
                    <span>O: <strong className="text-slate-200">{hoveredCandle.open}</strong></span>
                    <span>H: <strong className="text-emerald-400">{hoveredCandle.high}</strong></span>
                    <span>L: <strong className="text-rose-400">{hoveredCandle.low}</strong></span>
                    <span>C: <strong className="text-amber-300">{hoveredCandle.close}</strong></span>
                    <span>V: <strong className="text-slate-200">{hoveredCandle.volume}</strong></span>
                  </div>
                )}

                {/* SVG Visualizer Canvas */}
                <div className="p-4 bg-[#070A10] relative flex-1 flex flex-col justify-center select-none overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight + (showVolume ? 50 : 0)}`}
                    className="w-full h-[260px] overflow-visible"
                  >
                    {/* Background Grid Lines */}
                    {[5880, 5900, 5920, 5940, 5960].map((level) => {
                      const y = getY(level);
                      return (
                        <g key={level}>
                          <line
                            x1="0"
                            y1={y}
                            x2={chartWidth}
                            y2={y}
                            stroke="#1e293b"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                          />
                          <text
                            x={chartWidth - 5}
                            y={y - 4}
                            fill="#64748b"
                            fontSize="9"
                            textAnchor="end"
                            fontFamily="JetBrains Mono"
                          >
                            {level}.00
                          </text>
                        </g>
                      );
                    })}

                    {/* Institutional Order Block Demand Zone */}
                    {showOrderBlocks && (
                      <g>
                        <rect
                          x="0"
                          y={getY(5895)}
                          width={chartWidth}
                          height={getY(5880) - getY(5895)}
                          fill="rgba(16, 185, 129, 0.12)"
                          stroke="rgba(16, 185, 129, 0.4)"
                          strokeDasharray="2 2"
                        />
                        <text
                          x="8"
                          y={getY(5883)}
                          fill="#34d399"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono"
                        >
                          SMC Demand Order Block (Abu Asad Model)
                        </text>
                      </g>
                    )}

                    {/* Candles */}
                    {SAMPLE_CANDLES.map((c, i) => {
                      const isBullish = c.close >= c.open;
                      const x = i * candleSpacing + candleSpacing / 2;
                      const yOpen = getY(c.open);
                      const yClose = getY(c.close);
                      const yHigh = getY(c.high);
                      const yLow = getY(c.low);

                      const topY = Math.min(yOpen, yClose);
                      const bodyHeight = Math.max(Math.abs(yClose - yOpen), 3);
                      const color = isBullish ? '#10b981' : '#f43f5e';

                      return (
                        <g
                          key={c.time}
                          onMouseEnter={() => setHoveredCandle(c)}
                          className="cursor-pointer group"
                        >
                          {/* Hover backdrop */}
                          <rect
                            x={x - candleSpacing / 2}
                            y="0"
                            width={candleSpacing}
                            height={chartHeight}
                            fill="transparent"
                            className="hover:fill-slate-800/40"
                          />

                          {/* Wick */}
                          <line
                            x1={x}
                            y1={yHigh}
                            x2={x}
                            y2={yLow}
                            stroke={color}
                            strokeWidth="1.5"
                          />

                          {/* Candle Body */}
                          <rect
                            x={x - 7}
                            y={topY}
                            width={14}
                            height={bodyHeight}
                            fill={color}
                            rx="1"
                          />

                          {/* Volume Bar */}
                          {showVolume && (
                            <rect
                              x={x - 5}
                              y={chartHeight + 40 - (c.volume / 4500) * 35}
                              width={10}
                              height={(c.volume / 4500) * 35}
                              fill={isBullish ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)'}
                              rx="1"
                            />
                          )}

                          {/* Annotation Flag */}
                          {c.label && (
                            <g>
                              <circle cx={x} cy={yHigh - 10} r="2.5" fill="#f59e0b" />
                              <line x1={x} y1={yHigh - 7} x2={x} y2={yHigh} stroke="#f59e0b" strokeWidth="1" />
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* SMA & EMA */}
                    {showSMA && (
                      <path
                        d="M 20 180 Q 130 170, 240 140 T 500 40"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                        opacity="0.9"
                      />
                    )}
                    {showEMA && (
                      <path
                        d="M 20 190 Q 140 185, 260 150 T 500 60"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="1.5"
                        opacity="0.9"
                      />
                    )}
                  </svg>
                </div>

                {/* SMC Analytical Insights Box */}
                <div className="p-3.5 bg-[#0A0E18] border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      {t('chartSmcChecklist')}
                    </span>
                    <span className="text-[10px] font-mono-num text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      {t('chartHighProbEdge')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-num">
                    <div className="p-2 bg-[#06080E] rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">{t('chartMarketStructure')}:</span>
                      <span className="text-emerald-400 font-bold">Bullish BOS Confirmed</span>
                    </div>
                    <div className="p-2 bg-[#06080E] rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">{t('chartFvgImbalance')}:</span>
                      <span className="text-amber-300 font-bold">5,898 - 5,906 Filled</span>
                    </div>
                    <div className="p-2 bg-[#06080E] rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">{t('chartCvdAbsorption')}:</span>
                      <span className="text-cyan-300 font-bold">+1,420 Delta Inflow</span>
                    </div>
                    <div className="p-2 bg-[#06080E] rounded-lg border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">{t('chartInvalidation')}:</span>
                      <span className="text-rose-400 font-bold">5,878.50 Swing Low</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Summary Bar */}
        <div className="px-4 sm:px-6 py-3 bg-[#080C14] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3 flex-wrap text-[11px]">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <strong>Smart Money Trading</strong> by Abu Asad Almansi
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">
              {t('chartFooterRealtime')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              {t('chartCloseStudio')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

