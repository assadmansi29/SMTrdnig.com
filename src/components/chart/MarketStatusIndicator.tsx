import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Globe, X, ChevronDown, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  getMarketScheduleStatus,
  MarketStatusResult,
  getWorldMarketSessions,
  WorldSessionInfo,
  BenchmarkMarketId,
} from '../../utils/marketSchedule';

export interface MarketStatusIndicatorProps {
  marketId?: BenchmarkMarketId | string;
  symbol?: string;
  className?: string;
  compact?: boolean;
  showSymbolTag?: boolean;
  align?: 'left' | 'right';
  id?: string;
}

const BENCHMARK_OPTIONS: { id: BenchmarkMarketId; label: string; sub: string; exchange: string }[] = [
  { id: 'us_core', label: 'Global Market', sub: 'NYSE / NASDAQ', exchange: 'Wall Street Regular Hours' },
  { id: 'cme_futures', label: 'CME Futures', sub: 'Metals & Energy', exchange: 'Globex 23h / Daily Break' },
  { id: 'forex_24_5', label: 'Forex 24/5', sub: 'Currencies OTC', exchange: 'Continuous 24/5 Interbank' },
  { id: 'london_session', label: 'London / EU', sub: 'LSE & Eurex', exchange: 'European Trading Hours' },
  { id: 'tokyo_session', label: 'Tokyo / Asia', sub: 'TSE Nikkei', exchange: 'Asian Trading Session' },
  { id: 'crypto_24_7', label: 'Crypto 24/7', sub: 'Digital Assets', exchange: 'Continuous 24/7 Global' },
];

export const MarketStatusIndicator: React.FC<MarketStatusIndicatorProps> = ({
  marketId: initialMarketId = 'us_core',
  symbol,
  className = '',
  compact = false,
  showSymbolTag = false,
  align = 'left',
  id,
}) => {
  // Use either the explicit marketId, or map symbol if provided, default to 'us_core' (Core Global Market)
  const [selectedMarketId, setSelectedMarketId] = useState<string>(symbol || initialMarketId);
  const [status, setStatus] = useState<MarketStatusResult>(() =>
    getMarketScheduleStatus(symbol || initialMarketId)
  );
  const [worldSessions, setWorldSessions] = useState<WorldSessionInfo[]>(() => getWorldMarketSessions());
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Sync when props change
  useEffect(() => {
    setSelectedMarketId(symbol || initialMarketId);
  }, [symbol, initialMarketId]);

  // Update schedule status and world sessions every second in real time
  useEffect(() => {
    const update = () => {
      setStatus(getMarketScheduleStatus(selectedMarketId));
      setWorldSessions(getWorldMarketSessions());
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [selectedMarketId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDetails]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDetails) {
        setShowDetails(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetails]);

  // Styling based strictly on the 4 canonical market states:
  // 1. "MARKET OPEN"
  // 2. "MARKET CLOSED"
  // 3. "MARKET WILL OPEN SOON"
  // 4. "MARKET WILL CLOSE SOON"
  const getStatusStyles = () => {
    switch (status.status) {
      case 'MARKET OPEN':
        return {
          badgeBorder: 'border-emerald-500/40 hover:border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
          badgeBg: 'bg-[#071B12]/85 hover:bg-[#092418]',
          dot: 'bg-emerald-400 shadow-[0_0_6px_#34d399]',
          dotAnimation: 'animate-pulse',
          titleText: 'text-emerald-400 font-bold',
          detailText: 'text-emerald-300/90 font-medium',
          pillTag: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        };
      case 'MARKET WILL CLOSE SOON':
        return {
          badgeBorder: 'border-amber-500/60 hover:border-amber-500/90 shadow-[0_0_14px_rgba(245,158,11,0.25)]',
          badgeBg: 'bg-[#1F1403]/90 hover:bg-[#2B1B04]',
          dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
          dotAnimation: 'animate-ping',
          titleText: 'text-amber-400 font-extrabold',
          detailText: 'text-amber-200 font-bold',
          pillTag: 'bg-amber-500/25 text-amber-300 border-amber-500/40',
        };
      case 'MARKET WILL OPEN SOON':
        return {
          badgeBorder: 'border-cyan-500/60 hover:border-cyan-500/90 shadow-[0_0_14px_rgba(6,182,212,0.25)]',
          badgeBg: 'bg-[#031A21]/90 hover:bg-[#05252F]',
          dot: 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]',
          dotAnimation: 'animate-ping',
          titleText: 'text-cyan-400 font-extrabold',
          detailText: 'text-cyan-200 font-bold',
          pillTag: 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40',
        };
      case 'MARKET CLOSED':
      default:
        return {
          badgeBorder: 'border-rose-500/40 hover:border-rose-500/65 shadow-[0_0_10px_rgba(244,63,94,0.12)]',
          badgeBg: 'bg-[#18080C]/85 hover:bg-[#220B10]',
          dot: 'bg-rose-400 shadow-[0_0_5px_#f43f5e]',
          dotAnimation: '',
          titleText: 'text-rose-400 font-bold',
          detailText: 'text-rose-300/85 font-medium',
          pillTag: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        };
    }
  };

  const styles = getStatusStyles();

  // Compact label computation matching user specification:
  // e.g. "MARKET OPEN", "CLOSES IN 42 MIN", "MARKET WILL OPEN IN 18 MIN"
  const getBadgeContent = () => {
    if (compact) {
      if (status.status === 'MARKET WILL CLOSE SOON') {
        return (
          <span className={`tracking-wide font-bold ${styles.titleText}`}>
            CLOSES IN {status.minutesRemaining} MIN
          </span>
        );
      }
      if (status.status === 'MARKET WILL OPEN SOON') {
        return (
          <span className={`tracking-wide font-bold ${styles.titleText}`}>
            MARKET WILL OPEN IN {status.minutesRemaining} MIN
          </span>
        );
      }
      if (status.status === 'MARKET OPEN') {
        return (
          <span className={`tracking-wide font-bold ${styles.titleText}`}>
            MARKET OPEN
          </span>
        );
      }
      return (
        <span className={`tracking-wide font-bold ${styles.titleText}`}>
          MARKET CLOSED
        </span>
      );
    }

    return (
      <div className="flex items-center gap-1.5 leading-none">
        <span className={`tracking-wider ${styles.titleText}`}>
          {status.status}
        </span>

        {status.status === 'MARKET WILL CLOSE SOON' && (
          <span className="text-amber-300 font-extrabold bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px] border border-amber-500/30">
            {status.minutesRemaining} min
          </span>
        )}

        {status.status === 'MARKET WILL OPEN SOON' && (
          <span className="text-cyan-300 font-extrabold bg-cyan-500/20 px-1.5 py-0.5 rounded text-[10px] border border-cyan-500/30">
            {status.minutesRemaining} min
          </span>
        )}

        {(status.status === 'MARKET OPEN' || status.status === 'MARKET CLOSED') && (
          <>
            <span className="text-slate-600 select-none">·</span>
            <span className={`${styles.detailText} text-[10px] whitespace-nowrap`}>
              {status.countdownText}
            </span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Professional Market Status Trigger Button */}
      <button
        id={id || 'market-status-indicator-button'}
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        title={`Live Market Status: ${status.status} — Click for Real-Time Session Schedule & Global Clocks`}
        className={`group flex items-center ${
          compact ? 'gap-1.5 px-2 py-0.5 text-[10px]' : 'gap-2 px-3 py-1.5 text-[11px]'
        } rounded-full border font-mono transition-all duration-200 cursor-pointer select-none backdrop-blur-md shrink-0 whitespace-nowrap ${styles.badgeBg} ${styles.badgeBorder}`}
      >
        {/* Pulsing indicator status beacon */}
        <span className="relative flex h-2 w-2 items-center justify-center shrink-0">
          {styles.dotAnimation && (
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-80 ${styles.dot} ${styles.dotAnimation}`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${styles.dot}`} />
        </span>

        {/* Dynamic Status Text */}
        {getBadgeContent()}

        <ChevronDown className={`w-2.5 h-2.5 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 shrink-0 ${showDetails ? 'rotate-180' : ''}`} />
      </button>

      {/* Centered Modal rendered into document.body - Standardized with Header Trading Tools positioning */}
      {showDetails && typeof document !== 'undefined' && createPortal(
        <div
          id={`modal-market-status-${id || 'global'}`}
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowDetails(false)}
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-emerald-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-white tracking-tight truncate flex items-center gap-1.5">
                    Real-Time Market Status
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </h3>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    Institutional Multi-Session Schedule Engine
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
                aria-label="Close market status"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Dynamic Status Highlight Banner */}
            <div className={`my-2 p-3 rounded-xl border flex flex-col gap-1.5 ${styles.badgeBg} ${styles.badgeBorder}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${styles.dot} ${styles.dotAnimation}`} />
                  <span className={`text-xs ${styles.titleText}`}>{status.status}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{status.localTimeFormatted}</span>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug">
                {status.nextEventDescription}
              </p>

              {status.isHoliday && (
                <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>US Market Holiday: {status.holidayName || 'Observed Holiday'}</span>
                </div>
              )}
            </div>

            {/* World Market Sessions Live Tracker */}
            <div className="mb-2">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-cyan-400" />
                  Global World Sessions (Live)
                </span>
                <span className="text-[9px] text-slate-500">Auto-sync 1s</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {worldSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-2 rounded-xl border transition-all ${
                      session.isOpen
                        ? 'bg-emerald-950/30 border-emerald-500/30'
                        : 'bg-[#0E1524] border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-slate-200 flex items-center gap-1">
                        <span>{session.flag}</span>
                        <span>{session.name}</span>
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                          session.isOpen
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        }`}
                      >
                        {session.statusText}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center justify-between">
                      <span>{session.hours}</span>
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                      Time: {session.localTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Benchmark Selector */}
            <div className="mb-2">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Active Benchmark Schedule:
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {BENCHMARK_OPTIONS.map((item) => {
                  const isSelected = selectedMarketId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedMarketId(item.id)}
                      className={`p-1.5 rounded-lg text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold shadow-sm'
                          : 'bg-[#0E1524] hover:bg-[#151F33] text-slate-300 border border-slate-800'
                      }`}
                    >
                      <div className="text-[10px] font-mono truncate">{item.label}</div>
                      <div className="text-[8px] text-slate-400 truncate">{item.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Schedule Details */}
            <div className="pt-2 border-t border-[#1A2338] space-y-1.5 text-[10px] text-slate-400 font-mono">
              <div className="flex justify-between">
                <span>Exchange / Market:</span>
                <span className="text-slate-200">{status.metadata.exchangeName}</span>
              </div>
              <div className="flex justify-between">
                <span>Session Timezone:</span>
                <span className="text-slate-200">{status.metadata.timeZoneLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>Trading Hours:</span>
                <span className="text-slate-200">{status.metadata.regularHoursSummary}</span>
              </div>
              {status.metadata.dailyBreakSummary && (
                <div className="flex justify-between text-amber-300/90">
                  <span>Break Schedule:</span>
                  <span>{status.metadata.dailyBreakSummary}</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MarketStatusIndicator;
