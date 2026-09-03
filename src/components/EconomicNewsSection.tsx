import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Radio, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  TrendingUp, 
  Zap, 
  Flame,
  Info,
  ExternalLink
} from 'lucide-react';
import { EconomicEvent, EventImpact } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { 
  getUserTimezoneInfo, 
  formatEventLocalTime, 
  getEventCountdown, 
  getImpactBadgeStyle 
} from '../utils/economicNewsUtils';

interface EconomicNewsSectionProps {
  events: EconomicEvent[];
  onOpenCalendar: () => void;
  onOpenChartModal?: (symbol?: string) => void;
}

export const EconomicNewsSection: React.FC<EconomicNewsSectionProps> = ({
  events,
  onOpenCalendar,
  onOpenChartModal
}) => {
  const { t, language, isRTL } = useTranslation();
  const [now, setNow] = useState<number>(Date.now());
  const [filterImpact, setFilterImpact] = useState<string>('All');
  const [expandedEventId, setExpandedEventId] = useState<string | null>('news-approaching');

  // Real-time ticking counter every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const tzInfo = getUserTimezoneInfo();

  // Filter events
  const filteredEvents = events.filter(evt => {
    if (filterImpact === 'All') return true;
    if (filterImpact === 'Extreme') return evt.impact === 'Extreme';
    if (filterImpact === 'High') return evt.impact === 'High';
    if (filterImpact === 'Medium') return evt.impact === 'Medium';
    if (filterImpact === 'Low') return evt.impact === 'Low';
    if (filterImpact === 'Upcoming') {
      const { status } = getEventCountdown(evt, now);
      return status === 'upcoming' || status === 'approaching' || status === 'live';
    }
    if (filterImpact === 'Released') {
      const { status } = getEventCountdown(evt, now);
      return status === 'released';
    }
    return true;
  });

  // Check if any event is approaching or live to highlight top alert
  const approachingEvent = events.find(e => getEventCountdown(e, now).isApproaching);
  const liveEvent = events.find(e => getEventCountdown(e, now).isLive);

  const toggleExpand = (id: string) => {
    setExpandedEventId(prev => (prev === id ? null : id));
  };

  return (
    <div className="bg-[#0D1322] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* 1. Header Bar with Local Timezone Display */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <span>{t('newsSectionTitle')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
              <Globe className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate" title={tzInfo.displayName}>
                {t('ecoYourTzLabel')}: <strong className="text-cyan-300 font-mono-num font-semibold">{tzInfo.displayName}</strong>
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenCalendar}
          className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-lg border border-amber-500/30"
        >
          <span>{t('widgetViewAll')}</span>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </button>
      </div>

      {/* 2. Urgent Live or Approaching Warning Banner */}
      {liveEvent && (
        <div className="bg-gradient-to-r from-rose-950/80 via-[#1A0B18] to-rose-950/80 border-2 border-rose-500/80 rounded-xl p-3 shadow-lg shadow-rose-950/30 flex items-start gap-2.5 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping mt-1 shrink-0"></span>
          <div className="min-w-0 flex-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-rose-500 text-white px-2 py-0.5 rounded font-black text-[10px] tracking-wider uppercase">
                {t('ecoStatusLive')}
              </span>
              <span className="font-bold text-rose-200">{liveEvent.event}</span>
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
              {t('ecoLiveAlertDesc')}
            </p>
          </div>
        </div>
      )}

      {!liveEvent && approachingEvent && (
        <div className="bg-gradient-to-r from-amber-950/70 via-[#1F170A] to-amber-950/70 border-2 border-amber-500/80 rounded-xl p-3 shadow-lg shadow-amber-950/30 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="min-w-0 flex-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded font-black text-[10px] tracking-wider uppercase">
                {t('ecoStatusApproaching')}: {getEventCountdown(approachingEvent, now).text}
              </span>
              <span className="font-bold text-amber-200">{approachingEvent.event}</span>
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
              {t('ecoApproachingAlertDesc')}
            </p>
          </div>
        </div>
      )}

      {/* 3. Fast Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar" dir="ltr">
        {[
          { key: 'All', label: t('ecoFilterAll') },
          { key: 'Extreme', label: t('ecoFilterExtreme') },
          { key: 'High', label: t('ecoFilterHigh') },
          { key: 'Upcoming', label: t('ecoFilterUpcomingOnly') },
          { key: 'Released', label: t('ecoFilterReleasedOnly') }
        ].map(item => {
          const isActive = filterImpact === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setFilterImpact(item.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-num font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 4. Streamlined Event Cards */}
      <div className="space-y-2.5">
        {filteredEvents.slice(0, 4).map((evt) => {
          const isExpanded = expandedEventId === evt.id;
          const { text: countdownText, status, isApproaching, isLive } = getEventCountdown(evt, now);
          const localTime = evt.timestamp ? formatEventLocalTime(evt.timestamp, language) : null;
          const style = getImpactBadgeStyle(evt.impact);

          return (
            <div
              key={evt.id}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isLive
                  ? 'bg-gradient-to-b from-[#180A14] to-[#0A0D18] border-rose-500/70 shadow-lg shadow-rose-950/20'
                  : isApproaching
                  ? 'bg-gradient-to-b from-[#1C150A] to-[#0A0D18] border-amber-500/60 shadow-lg shadow-amber-950/20'
                  : isExpanded
                  ? 'bg-[#0E1528] border-amber-400/40 shadow-md'
                  : 'bg-[#090D17] hover:bg-slate-800/40 border-slate-800/90'
              }`}
            >
              {/* Event Summary Bar */}
              <div 
                onClick={() => toggleExpand(evt.id)}
                className="p-3 cursor-pointer flex flex-col gap-2"
              >
                {/* Top Meta Line: Time & Status Badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono-num">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Country Badge */}
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px] border border-slate-700">
                      {evt.countryCode === 'US' ? '🇺🇸 US' : evt.countryCode === 'EU' ? '🇪🇺 EU' : evt.countryCode === 'JP' ? '🇯🇵 JP' : evt.countryCode === 'GB' ? '🇬🇧 UK' : evt.countryCode}
                    </span>

                    {/* Localized Date & Time (User Timezone) */}
                    <span className="text-amber-300 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {localTime ? localTime.fullStr : `${evt.date} • ${evt.time}`}
                    </span>
                  </div>

                  {/* Impact & Status Badges */}
                  <div className="flex items-center gap-1.5">
                    {/* Impact Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${style.badgeClass}`}>
                      {evt.impact === 'Extreme' ? `⚡ ${t('ecoImpactExtreme')}` : evt.impact === 'High' ? t('ecoImpactHigh') : evt.impact === 'Medium' ? t('ecoImpactMedium') : t('ecoImpactLow')}
                    </span>

                    {/* Status / Countdown Badge */}
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider animate-pulse shadow-sm">
                        <Radio className="w-2.5 h-2.5" />
                        {t('ecoStatusLive')}
                      </span>
                    ) : isApproaching ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm animate-pulse">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {countdownText}
                      </span>
                    ) : status === 'released' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
                        ✓ {t('ecoStatusReleased')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-cyan-300 font-bold text-[10px]">
                        ⏱ {countdownText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Name */}
                <div className="flex items-start justify-between gap-2">
                  <h5 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 leading-snug">
                    {evt.event}
                  </h5>
                  <button 
                    type="button"
                    aria-label="Toggle event details"
                    className="text-slate-400 hover:text-amber-300 transition-colors shrink-0 p-0.5"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Metrics row: Previous / Forecast / Actual */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/70 text-center font-mono-num">
                  <div className="bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">{t('ecoPreviousLabel')}</span>
                    <span className="text-xs text-slate-200 font-semibold">{evt.previous}</span>
                  </div>
                  <div className="bg-slate-950/50 p-1.5 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">{t('ecoForecastLabel')}</span>
                    <span className="text-xs text-amber-300 font-bold">{evt.forecast}</span>
                  </div>
                  <div className={`p-1.5 rounded-lg border ${
                    evt.actual 
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-500'
                  }`}>
                    <span className="text-[10px] text-slate-400 block">{t('ecoActualLabel')}</span>
                    <span className="text-xs font-black">
                      {evt.actual ? evt.actual : `—`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Expanded Details: Institutional "Why It Matters" */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-slate-800/80 bg-slate-950/40 space-y-2.5 animate-fadeIn text-xs">
                  {/* Why It Matters */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                      <Info className="w-3.5 h-3.5" />
                      <span>{t('ecoWhyItMattersTitle')}</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed bg-[#0B0F19] p-2.5 rounded-xl border border-slate-800">
                      {evt.whyItMatters || t('calVolNote')}
                    </p>
                  </div>

                  {/* Key Affected Assets */}
                  {evt.affectedAssets && evt.affectedAssets.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-slate-400 uppercase font-mono-num">
                        {t('ecoAffectedAssetsLabel')}:
                      </span>
                      {evt.affectedAssets.map(asset => (
                        <button
                          key={asset}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenChartModal) {
                              if (asset.includes('XAU')) onOpenChartModal('OANDA:XAUUSD');
                              else if (asset.includes('NAS')) onOpenChartModal('OANDA:NAS100USD');
                              else if (asset.includes('US30')) onOpenChartModal('OANDA:US30USD');
                              else onOpenChartModal();
                            }
                          }}
                          className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[10px] font-mono-num font-bold text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
                        >
                          {asset}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Market Bias / Rule of Thumb */}
                  <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                    <span className="text-emerald-400 font-medium">
                      ↑ {t('ecoMarketBiasBullish')}
                    </span>
                    <button
                      onClick={onOpenCalendar}
                      className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {t('widgetViewAll')} <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
