import React, { useState } from 'react';
import { Activity, Maximize2, Sparkles, TrendingUp, BarChart2, Calendar, ChevronRight, Calculator, ArrowRight, Radio, Tv } from 'lucide-react';
import { TradingViewWidget } from './TradingViewWidget';
import { ChartToolbar, ChartStrategyType } from './chart/ChartToolbar';
import { FearGreedGauge } from './FearGreedGauge';
import { YouTubeLivePlayer } from './YouTubeLivePlayer';
import { EconomicNewsSection } from './EconomicNewsSection';
import { useYouTubeLive } from '../hooks/useYouTubeLive';
import { useTranslation } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { TranslationKey } from '../locales';
import { EconomicEvent, ArticleCategory } from '../types';

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
    symbol: 'BLACKBULL:XAUUSD',
    descKey: 'instGoldDesc'
  },
  {
    id: 'nasdaq',
    nameKey: 'instNasdaqName',
    ticker: 'NAS100',
    symbol: 'BLACKBULL:NAS100',
    descKey: 'instNasdaqDesc'
  },
  {
    id: 'dow',
    nameKey: 'instDowName',
    ticker: 'US30',
    symbol: 'BLACKBULL:US30',
    descKey: 'instDowDesc'
  },
  {
    id: 'dax',
    nameKey: 'instDaxName',
    ticker: 'GER40',
    symbol: 'BLACKBULL:GER40',
    descKey: 'instDaxDesc'
  }
];

const TIMEFRAMES = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '30m', value: '30' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: '1D' },
];

interface LiveTradingSectionProps {
  onOpenChartModal: (symbol?: string) => void;
  onOpenCalendar: () => void;
  onOpenCalculator: () => void;
  onOpenAdminModal?: (tab?: string, symbol?: string, interval?: string) => void;
  activeCategory?: ArticleCategory;
}

export const LiveTradingSection: React.FC<LiveTradingSectionProps> = ({ 
  onOpenChartModal,
  onOpenCalendar,
  onOpenCalculator,
  onOpenAdminModal,
  activeCategory = 'All'
}) => {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const canAnalyzeCharts = isSuperAdmin || isAdmin;
  const isStaff = canAnalyzeCharts;

  const [selectedSymbol, setSelectedSymbol] = useState<string>('BLACKBULL:XAUUSD');
  const [selectedInterval, setSelectedInterval] = useState<string>('15');
  const [activeStrategy, setActiveStrategy] = useState<ChartStrategyType>(null);
  const [viewMode, setViewMode] = useState<'stream' | 'chart' | 'both'>('both');

  console.log('[FLOW: Step 2 - selectedSymbol State in LiveTradingSection]:', selectedSymbol);

  const {
    isLive,
    stream,
    channel,
    message,
    status,
    isLoading,
    isRefreshing,
    checkedAt,
    refresh
  } = useYouTubeLive();

  const rawBroker = selectedSymbol.includes(':') ? selectedSymbol.split(':')[0] : 'BlackBull';
  const brokerName =
    rawBroker === 'BLACKBULL' ? 'BlackBull' :
    rawBroker === 'OANDA' ? 'OANDA' :
    rawBroker === 'BINANCE' ? 'Binance' :
    rawBroker === 'CME_MINI' || rawBroker === 'CME' ? 'CME' :
    rawBroker === 'CAPITALCOM' ? 'Capital.com' :
    rawBroker === 'NASDAQ' ? 'NASDAQ' :
    rawBroker || 'BlackBull';

  // When inside "Support" or "VIP Signals", completely hide the entire Live Trading Section (including live stream and terminal)
  if (activeCategory === 'Support' || activeCategory === 'VIP Signals') {
    return null;
  }

  // When inside "LIVE Trade", hide LIVE TERMINAL, Catalysts, and Proprietary Trading Tools
  const hideTerminalAndTools = activeCategory === 'LIVE Trade';

  return (
    <section id="live-tradingview-terminal" className="space-y-4">
      {/* 1. Dynamic YouTube Live Trade Stream / Status Player */}
      <div className="max-w-[800px] mx-auto w-full">
        <YouTubeLivePlayer
          isLive={isLive}
          stream={stream}
          channel={channel}
          message={message}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          checkedAt={checkedAt}
          onRefresh={refresh}
        />
      </div>

      {/* 2. Terminal Title & Instrument Selector Bar + Embedded Chart (Hidden in LIVE Trade, VIP Signals & Support) */}
      {!hideTerminalAndTools && (
        <>
          {/* Top Live Terminal Badge & Full Studio Trigger */}
          <div className="flex items-center justify-between gap-3 bg-[#080C14] px-4 py-2.5 rounded-2xl border border-slate-800 shadow-xl max-w-[800px] mx-auto w-full">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] font-mono-num font-bold text-amber-300 uppercase tracking-wider">
                  {t('terminalLiveBadge')}
                </span>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">
                Real-Time {brokerName} Market Feed
              </span>
            </div>

            {/* Fullscreen TradingView Studio Modal */}
            <button
              onClick={() => onOpenChartModal(selectedSymbol)}
              className="flex items-center gap-1.5 bg-[#0E1526] hover:bg-[#152038] text-cyan-300 hover:text-cyan-200 px-3 py-1.5 rounded-xl border border-cyan-500/30 text-xs font-medium transition-colors cursor-pointer shadow-sm"
              title={t('terminalStudioTitle')}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-semibold">{t('terminalStudioMode')}</span>
            </button>
          </div>

          {/* Quick Instrument Switcher Pills (Gold, Nasdaq, Dow Jones, DAX) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none max-w-[800px] mx-auto w-full">
            {INSTRUMENTS.map((inst) => {
              const isSelected =
                selectedSymbol === inst.symbol ||
                (selectedSymbol.includes(':') && selectedSymbol.split(':')[1] === inst.ticker);
              return (
                <button
                  key={inst.id}
                  id={`btn-live-inst-${inst.id}`}
                  onClick={() => {
                    console.log('[FLOW: Step 1 - Button Click in LiveTradingSection]:', { id: inst.id, ticker: inst.ticker, targetSymbol: inst.symbol, previousSymbol: selectedSymbol });
                    setSelectedSymbol(inst.symbol);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer shadow-sm ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 font-bold shadow-amber-500/10'
                      : 'bg-[#080C14] hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className="font-mono font-bold">{inst.ticker}</span>
                  <span className="text-[10px] text-slate-400 hidden xs:inline">
                    {inst.id === 'gold' ? 'Gold' : inst.id === 'nasdaq' ? 'Nasdaq 100' : inst.id === 'dow' ? 'Dow 30' : 'DAX 40'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Embedded Real-Time TradingView Chart with Modern Toolbar */}
          <div className="rounded-2xl overflow-hidden border border-slate-800/90 shadow-2xl bg-[#090D17] max-w-[800px] mx-auto w-full h-[560px] flex flex-col min-h-0 min-w-0" dir="ltr">
            <ChartToolbar
              currentSymbol={selectedSymbol}
              onSelectSymbol={setSelectedSymbol}
              currentInterval={selectedInterval}
              onSelectInterval={setSelectedInterval}
              activeStrategy={activeStrategy}
              onSelectStrategy={setActiveStrategy}
            />
            <TradingViewWidget
              symbol={selectedSymbol}
              interval={selectedInterval}
              onSelectInterval={setSelectedInterval}
              enableDrawingTools={canAnalyzeCharts}
              hideSideToolbar={!canAnalyzeCharts}
              activeStrategy={activeStrategy}
              onSelectStrategy={setActiveStrategy}
              height="100%"
              className="w-full h-full flex-1 min-h-0 min-w-0 rounded-none border-0"
            />
          </div>

          {/* Under Chart: Upcoming High-Impact Catalysts, Risk Sentiment & Proprietary Trading Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[800px] mx-auto w-full items-start">
            {/* Column 1: MAJOR ECONOMIC NEWS & SMTRADING RISK SENTIMENT */}
            <div className="space-y-4 flex flex-col">
              {/* 1. MAJOR MARKET-MOVING ECONOMIC NEWS */}
              <EconomicNewsSection
                onOpenCalendar={onOpenCalendar}
                onOpenChartModal={onOpenChartModal}
              />

              {/* SMTrading Risk Sentiment (Positioned under Economic News) */}
              <FearGreedGauge />
            </div>

            {/* Column 2: PROPRIETARY TRADING TOOLS */}
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
                    onClick={() => onOpenChartModal(selectedSymbol)}
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
        </>
      )}
    </section>
  );
};


