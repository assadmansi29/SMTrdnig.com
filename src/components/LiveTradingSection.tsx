import React, { useState } from 'react';
import { Activity, Maximize2, Sparkles, TrendingUp, BarChart2 } from 'lucide-react';
import { TradingViewWidget } from './TradingViewWidget';
import { useTranslation } from '../context/LanguageContext';
import { TranslationKey } from '../locales';

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
}

export const LiveTradingSection: React.FC<LiveTradingSectionProps> = ({ onOpenChartModal }) => {
  const { t } = useTranslation();
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentOption>(INSTRUMENTS[0]);
  const [selectedInterval, setSelectedInterval] = useState<string>('15');

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
    </section>
  );
};

