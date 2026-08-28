import React, { useState } from 'react';
import { Activity, Maximize2, Sparkles, TrendingUp, BarChart2, Calendar, ChevronRight, Calculator, ArrowRight } from 'lucide-react';
import { TradingViewWidget } from './TradingViewWidget';
import { useTranslation } from '../context/LanguageContext';
import { TranslationKey } from '../locales';
import { EconomicEvent } from '../types';
import { getEconomicEventsByLanguage } from '../data/localizedData';

interface InstrumentOption {
  id: string;
  nameKey: TranslationKey;
  ticker: string;
  symbol: string;
  descKey: TranslationKey;
}

const INSTRUMENTS: InstrumentOption[] = [
  {
    id: 'gold',
    nameKey: 'instGoldName',
    ticker: 'XAUUSD',
    symbol: 'OANDA:XAUUSD',
    descKey: 'instGoldDesc'
  },
  {
    id: 'nasdaq',
    nameKey: 'instNasdaqName',
    ticker: 'NAS100',
    symbol: 'OANDA:NAS100USD',
    descKey: 'instNasdaqDesc'
  },
  {
    id: 'dow',
    nameKey: 'instDowName',
    ticker: 'US30',
    symbol: 'OANDA:US30USD',
    descKey: 'instDowDesc'
  },
  {
    id: 'dax',
    nameKey: 'instDaxName',
    ticker: 'GER40',
    symbol: 'OANDA:DE30EUR',
    descKey: 'instDaxDesc'
  }
];

const TIMEFRAMES = [
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1h', value: '60' },
  { label: '4h', value: '240' },
  { label: '1D', value: 'D' },
];

interface LiveTradingSectionProps {
  onOpenChartModal: (symbol?: string) => void;
  onOpenCalendar: () => void;
  onOpenCalculator: () => void;
  localizedEvents?: EconomicEvent[];
}

export const LiveTradingSection: React.FC<LiveTradingSectionProps> = ({ 
  onOpenChartModal,
  onOpenCalendar,
  onOpenCalculator,
  localizedEvents
}) => {
  const { t, language } = useTranslation();
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentOption>(INSTRUMENTS[0]);
  const [selectedInterval, setSelectedInterval] = useState<string>('15');

  const events = localizedEvents || getEconomicEventsByLanguage(language);

  return (
    <section id="live-tradingview-terminal" className="space-y-3.5">
      {/* Terminal Title & Instrument Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080C14] p-3 sm:p-3.5 rounded-2xl border border-slate-800 shadow-xl">
        
        {/* Left: Section Badge & Instrument Selector (4 Options) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl mr-1 rtl:mr-0 rtl:ml-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono-num font-bold text-amber-300 uppercase tracking-wider">
              {t('terminalLiveBadge')}
            </span>
          </div>

          {INSTRUMENTS.map((inst, index) => {
            const isSelected = selectedInstrument.id === inst.id;
            return (
              <button
                key={inst.id}
                onClick={() => setSelectedInstrument(inst)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono-num font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 border border-amber-300'
                    : 'bg-[#0E1526] hover:bg-[#131D33] text-slate-300 hover:text-white border border-slate-700/80'
                }`}
                title={t(inst.descKey)}
              >
                <span className={`text-[10px] px-1 py-0.2 rounded font-mono-num ${
                  isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-400'
                }`}>
                  {index + 1}
                </span>
                <span>{t(inst.nameKey)}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Timeframe & Fullscreen Trigger */}
        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center bg-[#0E1526] p-0.5 rounded-xl border border-slate-800 text-xs font-mono-num" dir="ltr">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setSelectedInterval(tf.value)}
                className={`px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ${
                  selectedInterval === tf.value
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Fullscreen TradingView Studio Modal */}
          <button
            onClick={() => onOpenChartModal(selectedInstrument.symbol)}
            className="flex items-center gap-1.5 bg-[#0E1526] hover:bg-[#152038] text-cyan-300 hover:text-cyan-200 px-3 py-1.5 rounded-xl border border-cyan-500/30 text-xs font-medium transition-colors cursor-pointer shadow-sm"
            title={t('terminalStudioTitle')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px] font-semibold">{t('terminalStudioMode')}</span>
          </button>
        </div>
      </div>

      {/* Embedded Professional Trading Chart Display */}
      <div className="rounded-2xl overflow-hidden border border-slate-800/90 shadow-2xl bg-[#090D17] max-w-[800px] mx-auto w-full" dir="ltr">
        <TradingViewWidget
          symbol={selectedInstrument.symbol}
          interval={selectedInterval}
          height="300px"
          className="min-h-[300px]"
        />
      </div>

      {/* Under Chart: Upcoming High-Impact Catalysts & Proprietary Trading Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[800px] mx-auto w-full items-stretch">
        {/* 1. UPCOMING HIGH-IMPACT CATALYSTS */}
        <div className="bg-[#0D1322] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                  {t('widgetCatalystsTitle')}
                </h4>
              </div>
              <button
                onClick={onOpenCalendar}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center cursor-pointer transition-colors"
              >
                {t('widgetViewAll')} <ChevronRight className="w-3 h-3 ml-0.5 rtl:rotate-180" />
              </button>
            </div>

            <div className="space-y-2 mt-3">
              {events.slice(0, 3).map(evt => (
                <div
                  key={evt.id}
                  onClick={onOpenCalendar}
                  className="p-2.5 bg-[#090D17] hover:bg-slate-800/50 rounded-xl border border-slate-800/80 cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono-num">
                    <span className="text-amber-400 font-semibold">{evt.countryCode} • {evt.time}</span>
                    <span className="bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded uppercase font-bold text-[9px]">
                      {evt.impact === 'High' ? t('ecoImpactHigh') : evt.impact === 'Medium' ? t('ecoImpactMedium') : t('ecoImpactLow')}
                    </span>
                  </div>
                  <h5 className="font-semibold text-xs text-slate-200 line-clamp-1">
                    {evt.event}
                  </h5>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. PROPRIETARY TRADING TOOLS */}
        <div className="bg-gradient-to-br from-[#0D1322] to-[#121A2E] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Calculator className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                {t('widgetToolsTitle')}
              </h4>
            </div>

            <div className="space-y-2 mt-3">
              <button
                onClick={onOpenCalculator}
                className="w-full text-left rtl:text-right p-3 rounded-xl bg-[#090D17] hover:bg-slate-800/70 border border-slate-800 hover:border-amber-400/30 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors block">
                    {t('widgetPosToolTitle')}
                  </span>
                  <span className="text-[11px] text-slate-400">{t('widgetPosToolSubtitle')}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 ml-2 rtl:mr-2 rtl:ml-0" />
              </button>

              <button
                onClick={() => onOpenChartModal(selectedInstrument.symbol)}
                className="w-full text-left rtl:text-right p-3 rounded-xl bg-gradient-to-r from-[#090D17] to-[#0d1627] hover:bg-slate-800/70 border border-cyan-500/20 hover:border-cyan-400/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors block">
                      {t('widgetChartToolTitle')}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <span className="text-[11px] text-slate-400">{t('widgetChartToolSubtitle')}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 ml-2 rtl:mr-2 rtl:ml-0" />
              </button>

              <button
                onClick={onOpenCalendar}
                className="w-full text-left rtl:text-right p-3 rounded-xl bg-gradient-to-r from-[#090D17] to-[#0d1e1c] hover:bg-slate-800/70 border border-emerald-500/20 hover:border-emerald-400/40 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors block">
                    {t('navCalendar')}
                  </span>
                  <span className="text-[11px] text-slate-400">{t('navTradingToolsCalDesc')}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 ml-2 rtl:mr-2 rtl:ml-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

