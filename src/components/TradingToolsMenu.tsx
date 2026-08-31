import React, { useState, useRef, useEffect } from 'react';
import { 
  CandlestickChart, 
  ChevronDown, 
  LineChart, 
  Calculator, 
  Calendar, 
  ArrowRight, 
  Sparkles,
  X
} from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface TradingToolsMenuProps {
  onOpenChart: () => void;
  onOpenCalculator: () => void;
  onOpenCalendar: () => void;
  compact?: boolean;
  className?: string;
}

export const TradingToolsMenu: React.FC<TradingToolsMenuProps> = ({
  onOpenChart,
  onOpenCalculator,
  onOpenCalendar,
  compact = false,
  className = ''
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Only close desktop dropdown if click is outside
        if (window.innerWidth >= 768) {
          setIsOpen(false);
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when mobile sheet is open
      if (window.innerWidth < 768) {
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSelect = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left w-full ${className}`} ref={menuRef}>
      {/* Unified "Tools" Trigger Button */}
      <button
        id="btn-trading-tools"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={t('navTradingToolsTitle')}
        className={`w-full flex items-center justify-between gap-1 sm:gap-1.5 ${
          compact ? 'px-2 py-1.5 rounded-lg text-[11px]' : 'px-2 py-1 rounded-xl text-xs'
        } font-bold transition-all border cursor-pointer select-none group whitespace-nowrap shadow-xs ${
          isOpen
            ? 'bg-gradient-to-r from-[#111A2D] to-[#182440] border-amber-400 text-white shadow-amber-500/10'
            : 'bg-[#0E1424] hover:bg-[#131B30] text-slate-200 hover:text-white border-slate-700/80 hover:border-amber-400/60'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0">
          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md bg-gradient-to-br from-amber-400/20 to-emerald-400/20 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <CandlestickChart className="w-2.5 h-2.5 text-amber-400 group-hover:text-amber-300 group-hover:scale-105 transition-transform" />
          </div>
          <span className="tracking-tight truncate text-[11px] sm:text-xs">{t('navTradingTools')}</span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-[8px] font-mono-num font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 py-0.2 rounded leading-none">
            3
          </span>
          <ChevronDown
            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 group-hover:text-amber-300 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-amber-400' : ''
            }`}
          />
        </div>
      </button>

      {/* 1. Desktop Floating Dropdown Popover (md: and up) */}
      {isOpen && (
        <div 
          id="menu-trading-tools-dropdown-desktop"
          className="hidden md:block absolute ltr:right-0 rtl:left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[#0B0F17]/98 backdrop-blur-xl border border-slate-700/90 shadow-2xl shadow-black/90 p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Banner */}
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('navTradingTools')}
              </span>
            </div>
            <span className="text-[10px] font-mono-num text-slate-400">Institutional Suite</span>
          </div>

          <div className="p-1 space-y-1 mt-1">
            {/* 1. TradingView Studio */}
            <button
              id="btn-tool-tradingview-studio"
              onClick={() => handleSelect(onOpenChart)}
              className="w-full text-left rtl:text-right p-2.5 rounded-xl hover:bg-slate-800/80 transition-all group flex items-start gap-3 cursor-pointer border border-transparent hover:border-cyan-500/30"
            >
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-cyan-500/20 group-hover:border-cyan-400 transition-all">
                <LineChart className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {t('navChartStudio')}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono-num">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-1">
                  {t('navTradingToolsStudioDesc')}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 self-center" />
            </button>

            {/* 2. Risk Calculator */}
            <button
              id="btn-tool-risk-calculator"
              onClick={() => handleSelect(onOpenCalculator)}
              className="w-full text-left rtl:text-right p-2.5 rounded-xl hover:bg-slate-800/80 transition-all group flex items-start gap-3 cursor-pointer border border-transparent hover:border-amber-500/30"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500/20 group-hover:border-amber-400 transition-all">
                <Calculator className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                    {t('navRiskCalculator')}
                  </span>
                  <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono-num">
                    LOT RISK
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-1">
                  {t('navTradingToolsCalcDesc')}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 self-center" />
            </button>

            {/* 3. Economic Calendar */}
            <button
              id="btn-tool-economic-calendar"
              onClick={() => handleSelect(onOpenCalendar)}
              className="w-full text-left rtl:text-right p-2.5 rounded-xl hover:bg-slate-800/80 transition-all group flex items-start gap-3 cursor-pointer border border-transparent hover:border-emerald-500/30"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500/20 group-hover:border-emerald-400 transition-all">
                <Calendar className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                    {t('navCalendar')}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono-num">
                    MACRO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-1">
                  {t('navTradingToolsCalDesc')}
                </p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 self-center" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Mobile Full-Screen Bottom Sheet / Dialog (< md) - Escapes all overflow bounds */}
      {isOpen && (
        <div 
          id="menu-trading-tools-modal-mobile"
          className="md:hidden fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0C111C] border border-slate-700/90 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black p-4 space-y-3 animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <CandlestickChart className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {t('navTradingTools')}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">Institutional Analysis Suite</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close tools menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tool Options */}
            <div className="space-y-2 pt-1">
              {/* Option 1: TradingView Chart Studio */}
              <button
                type="button"
                onClick={() => handleSelect(onOpenChart)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 text-left rtl:text-right transition-all group active:scale-[0.99]"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/20 group-hover:border-cyan-400 transition-all">
                  <LineChart className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                      {t('navChartStudio')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono-num">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      LIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {t('navTradingToolsStudioDesc')}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 self-center" />
              </button>

              {/* Option 2: Position & Risk Calculator */}
              <button
                type="button"
                onClick={() => handleSelect(onOpenCalculator)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 text-left rtl:text-right transition-all group active:scale-[0.99]"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 group-hover:border-amber-400 transition-all">
                  <Calculator className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-amber-300">
                      {t('navRiskCalculator')}
                    </span>
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono-num">
                      LOT RISK
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {t('navTradingToolsCalcDesc')}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 self-center" />
              </button>

              {/* Option 3: Economic Macro Calendar */}
              <button
                type="button"
                onClick={() => handleSelect(onOpenCalendar)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 text-left rtl:text-right transition-all group active:scale-[0.99]"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 group-hover:border-emerald-400 transition-all">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      {t('navCalendar')}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono-num">
                      MACRO
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    {t('navTradingToolsCalDesc')}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 self-center" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
