import React, { useState, useEffect, useRef } from 'react';
import { Clock, Globe, Calendar, X, AlertCircle, ChevronDown } from 'lucide-react';
import { getMarketScheduleStatus, MarketStatusResult, getMarketMetadata } from '../../utils/marketSchedule';

export interface MarketStatusIndicatorProps {
  symbol?: string;
  className?: string;
  compact?: boolean;
  showSymbolTag?: boolean;
  align?: 'left' | 'right';
  id?: string;
}

const PRESET_MARKETS = [
  { symbol: 'OANDA:XAUUSD', label: 'Gold (XAU)', tag: 'GOLD', type: 'Metals' },
  { symbol: 'BINANCE:BTCUSDT', label: 'Bitcoin (BTC)', tag: 'BTC', type: 'Crypto 24/7' },
  { symbol: 'OANDA:EURUSD', label: 'EUR / USD', tag: 'EUR', type: 'Forex 24/5' },
  { symbol: 'OANDA:NAS100USD', label: 'Nasdaq 100', tag: 'NAS', type: 'US Index' },
  { symbol: 'NVDA', label: 'US Equities', tag: 'STOCKS', type: 'NYSE/NASDAQ' },
];

export const MarketStatusIndicator: React.FC<MarketStatusIndicatorProps> = ({
  symbol: initialSymbol = 'OANDA:XAUUSD',
  className = '',
  compact = false,
  showSymbolTag = false,
  align = 'left',
  id,
}) => {
  const [activeSymbol, setActiveSymbol] = useState<string>(initialSymbol);
  const [status, setStatus] = useState<MarketStatusResult>(() => getMarketScheduleStatus(initialSymbol));
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync when initialSymbol prop changes
  useEffect(() => {
    setActiveSymbol(initialSymbol);
  }, [initialSymbol]);

  // Update schedule status every second in real time
  useEffect(() => {
    setStatus(getMarketScheduleStatus(activeSymbol));

    const timer = setInterval(() => {
      setStatus(getMarketScheduleStatus(activeSymbol));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSymbol]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowDetails(false);
      }
    };
    if (showDetails) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDetails]);

  // Color schemes based on market status
  const getStatusStyles = () => {
    switch (status.statusLabel) {
      case 'OPEN':
        return {
          badgeBorder: 'border-emerald-500/35 hover:border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.12)]',
          badgeBg: 'bg-emerald-950/40 hover:bg-emerald-950/70',
          dot: 'bg-emerald-400 shadow-[0_0_6px_#34d399]',
          dotAnimation: 'animate-pulse',
          text: 'text-emerald-400 font-semibold',
          countdownText: 'text-emerald-300 font-medium',
          tagBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'CLOSING SOON':
        return {
          badgeBorder: 'border-amber-500/50 hover:border-amber-500/80 shadow-[0_0_14px_rgba(245,158,11,0.22)]',
          badgeBg: 'bg-amber-950/50 hover:bg-amber-950/75',
          dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
          dotAnimation: 'animate-ping',
          text: 'text-amber-400 font-bold',
          countdownText: 'text-amber-200 font-semibold',
          tagBg: 'bg-amber-500/25 text-amber-300 border-amber-500/40',
        };
      case 'OPENING SOON':
        return {
          badgeBorder: 'border-cyan-500/50 hover:border-cyan-500/80 shadow-[0_0_14px_rgba(6,182,212,0.22)]',
          badgeBg: 'bg-cyan-950/50 hover:bg-cyan-950/75',
          dot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
          dotAnimation: 'animate-ping',
          text: 'text-cyan-400 font-bold',
          countdownText: 'text-cyan-200 font-semibold',
          tagBg: 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40',
        };
      case 'CLOSED':
      default:
        return {
          badgeBorder: 'border-rose-500/35 hover:border-rose-500/55 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
          badgeBg: 'bg-rose-950/30 hover:bg-rose-950/55',
          dot: 'bg-rose-400 shadow-[0_0_4px_#f43f5e]',
          dotAnimation: '',
          text: 'text-rose-400 font-semibold',
          countdownText: 'text-rose-300/85 font-medium',
          tagBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        };
    }
  };

  const styles = getStatusStyles();

  // Find tag representation of symbol
  const matchedPreset = PRESET_MARKETS.find((p) => p.symbol === activeSymbol);
  const symbolDisplayTag = matchedPreset ? matchedPreset.tag : activeSymbol.split(':').pop()?.substring(0, 6) || 'MKT';

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={popoverRef}>
      {/* Professional Interactive Pill Badge */}
      <button
        id={id || `market-status-${activeSymbol.replace(/[^a-zA-Z0-9]/g, '-')}`}
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        title={`Institutional Market Schedule & Trading Hours for ${activeSymbol} (Click for full session schedule)`}
        className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-all duration-200 cursor-pointer select-none backdrop-blur-md ${styles.badgeBg} ${styles.badgeBorder}`}
      >
        {/* Optional Symbol Tag (e.g. GOLD, BTC, FX) */}
        {showSymbolTag && (
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider font-mono ${styles.tagBg}`}>
            {symbolDisplayTag}
          </span>
        )}

        {/* Pulsing indicator dot */}
        <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
          {styles.dotAnimation && (
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.dot} ${styles.dotAnimation}`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${styles.dot}`} />
        </span>

        {/* Status text (OPEN / CLOSED / CLOSING / OPENS SOON) */}
        <span className={`tracking-wider ${styles.text}`}>
          {status.statusLabel === 'CLOSING SOON'
            ? 'CLOSING'
            : status.statusLabel === 'OPENING SOON'
            ? 'OPENS SOON'
            : status.statusLabel}
        </span>

        <span className="text-slate-600 dark:text-slate-500 select-none">·</span>

        {/* Dynamic Countdown Text (e.g. "Closes in 25 min", "Opens in 18 min", "Closes in 1h 40m", "24/7") */}
        <span className={`${styles.countdownText} whitespace-nowrap`}>
          {status.countdownText}
        </span>

        <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
      </button>

      {/* Institutional Schedule Details Popover */}
      {showDetails && (
        <div
          className={`absolute top-full mt-2 w-84 bg-[#0B0F19]/98 border border-[#1E293B] rounded-2xl shadow-2xl shadow-black/80 z-50 p-4 text-xs text-slate-300 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1A2338]">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#131D33] text-amber-400 shadow-inner">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h4 className="font-bold text-slate-100 leading-none">{status.metadata.categoryName}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{status.metadata.exchangeName}</p>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-[#1A2338] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Preset Market Selector Pills */}
          <div className="mt-3">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Select Market:
            </div>
            <div className="grid grid-cols-3 gap-1">
              {PRESET_MARKETS.map((preset) => {
                const isSelected = preset.symbol === activeSymbol;
                return (
                  <button
                    key={preset.symbol}
                    type="button"
                    onClick={() => setActiveSymbol(preset.symbol)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all text-left flex flex-col cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-[#121927] hover:bg-[#182236] text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span className="leading-tight">{preset.tag}</span>
                    <span className="text-[8px] text-slate-400 font-sans">{preset.type}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Live State Card */}
          <div className="my-3 p-2.5 rounded-xl bg-[#070A10] border border-[#172033] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${styles.dot} ${styles.dotAnimation}`} />
              <div>
                <div className="font-semibold text-[11px] text-slate-200 flex items-center gap-1.5">
                  <span className={styles.text}>{status.statusLabel}</span>
                  {status.isHoliday && (
                    <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {status.holidayName || 'Market Holiday'}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{status.nextEventDescription}</div>
              </div>
            </div>

            <div className="text-right font-mono">
              <div className={`text-xs font-bold ${styles.text}`}>{status.countdownText}</div>
              <div className="text-[9px] text-slate-400">real-time sync</div>
            </div>
          </div>

          {/* Market Clock & Timezone Details */}
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center justify-between py-1 border-b border-[#141C2E]">
              <span className="text-slate-400 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-500" /> Exchange Clock:
              </span>
              <span className="font-mono text-slate-200 font-semibold">{status.localTimeFormatted}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-[#141C2E]">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" /> Trading Schedule:
              </span>
              <span className="text-slate-200 font-mono text-[10px] text-right">{status.metadata.regularHoursSummary}</span>
            </div>

            {status.metadata.dailyBreakSummary && (
              <div className="flex items-start justify-between py-1 border-b border-[#141C2E]">
                <span className="text-slate-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" /> Maintenance Break:
                </span>
                <span className="text-amber-300/90 font-mono text-[10px] text-right max-w-[160px]">
                  {status.metadata.dailyBreakSummary}
                </span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-3 pt-2.5 border-t border-[#131D33] flex items-center justify-between text-[10px] text-slate-400">
            <span>Timezone: {status.metadata.timeZoneLabel}</span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Clock
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
