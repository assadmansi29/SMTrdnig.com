import React, { useState, useEffect } from 'react';
import { 
  X, 
  LineChart, 
  ExternalLink,
  Clock,
  Paintbrush,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { TradingViewWidget } from './TradingViewWidget';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface ChartSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
  onOpenAdminModal?: (tab?: string, symbol?: string, interval?: string) => void;
}

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

const TIMEFRAMES = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '60', label: '1H' },
  { value: '240', label: '4H' },
  { value: 'D', label: 'DAY' },
  { value: 'W', label: 'Week' },
  { value: 'M', label: 'Month' },
];

export const ChartSimulatorModal: React.FC<ChartSimulatorModalProps> = ({ 
  isOpen, 
  onClose,
  defaultSymbol = 'OANDA:XAUUSD',
  onOpenAdminModal
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isStaff = user?.role === 'super_admin' || user?.role === 'admin';
  const [selectedSymbol, setSelectedSymbol] = useState(defaultSymbol);
  const [activeInterval, setActiveInterval] = useState('15');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Sync selected symbol when defaultSymbol changes or modal opens
  useEffect(() => {
    if (defaultSymbol) {
      setSelectedSymbol(defaultSymbol);
    }
  }, [defaultSymbol, isOpen]);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        setIsFullscreen(!isFullscreen);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0F17] text-slate-200 w-full h-full h-screen w-screen overflow-hidden animate-fadeIn select-none">
      <div className="w-full h-full flex-1 flex flex-col bg-[#0B0F17] overflow-hidden min-h-0 min-w-0">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2 border-b border-slate-800 bg-[#080C14] gap-2 shrink-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-1 rtl:pr-0 rtl:pl-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-md shadow-amber-500/10 shrink-0">
              <div className="w-full h-full bg-[#0E131F] rounded-[7px] flex items-center justify-center text-amber-400">
                <LineChart className="w-4 h-4" />
              </div>
            </div>
            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-1.5 truncate">
                <span>SMTrading<span className="text-amber-400">.pro</span></span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-200 font-semibold text-xs sm:text-sm truncate">{t('chartStudioTitle')}</span>
              </h3>
              <div className="hidden xs:inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-600/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/40 shadow-sm backdrop-blur-sm tracking-wide shrink-0">
                <span>{t('chartStudioBy')}</span>
                <BlueVerifiedBadge size="sm" />
              </div>
              <span className="text-slate-400 text-xs hidden lg:inline font-medium">
                (Smart Money Trading)
              </span>
              <span className="hidden md:inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                {t('chartStudioFeed')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selectedSymbol)}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex text-[11px] text-amber-400 hover:text-amber-300 font-semibold items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
              title="Open full chart on TradingView"
            >
              {t('chartOpenTv')} <ExternalLink className="w-3 h-3 rtl:rotate-180" />
            </a>

            <button
              type="button"
              onClick={toggleBrowserFullscreen}
              className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm"
              title={isFullscreen ? "Exit Fullscreen" : "Full Screen Mode"}
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700/80 hover:border-rose-500/30 text-slate-300 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Close Chart Studio"
              aria-label="Close Chart Studio"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Toolbar & Symbol / Timeframe Bar */}
        <div className="px-3 sm:px-5 py-1.5 bg-[#090D17] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-10">
          
          {/* Quick Symbol Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full lg:max-w-[50%]">
            <span className="text-slate-400 font-mono-num text-[11px] font-semibold uppercase pr-1 hidden sm:inline shrink-0">
              {t('chartSymbol')}:
            </span>
            {POPULAR_SYMBOLS.map((s) => {
              const isSelected = selectedSymbol === s.symbol;
              return (
                <button
                  key={s.symbol}
                  onClick={() => setSelectedSymbol(s.symbol)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono-num font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
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

          {/* Timeframe Interval Controls */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-400 ml-1 mr-0.5 hidden sm:inline" />
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setActiveInterval(tf.value)}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeInterval === tf.value
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Fully Responsive Chart Container: Fills 100% width and height below toolbar */}
        <div className="flex-1 min-h-0 min-w-0 w-full h-full flex flex-col relative bg-[#090D17] overflow-hidden">
          <TradingViewWidget
            symbol={selectedSymbol}
            theme="dark"
            interval={activeInterval}
            timezone="Etc/UTC"
            enableDrawingTools={isStaff}
            hideSideToolbar={!isStaff}
            className="w-full h-full flex-1 min-h-0 min-w-0 rounded-none border-0"
          />
        </div>

      </div>
    </div>
  );
};

