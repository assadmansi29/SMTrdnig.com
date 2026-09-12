import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Flame, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  RotateCw, 
  Check, 
  TrendingUp, 
  ExternalLink,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { EconomicEvent } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useEconomicCalendar } from '../context/EconomicCalendarContext';
import { 
  resolveEffectiveTimezone, 
  getStoredTimezonePreference, 
  setStoredTimezonePreference,
  getTimezoneMeta,
  formatEventInTimezone,
  calculateLiveCountdown,
  normalizeImpact,
  getImpactStyle,
  getCurrencyFlag,
  filterGenuinelyUpcomingEvents,
  POPULAR_TIMEZONES
} from '../utils/economicCalendarUtils';

interface EconomicNewsSectionProps {
  events?: EconomicEvent[];
  onOpenCalendar: () => void;
  onOpenChartModal?: (symbol?: string) => void;
}

export const EconomicNewsSection: React.FC<EconomicNewsSectionProps> = ({
  events: propEvents,
  onOpenCalendar,
  onOpenChartModal
}) => {
  const { isRTL } = useTranslation();
  const { events: contextEvents, isLoading, isRefreshing, refresh } = useEconomicCalendar();
  const allEvents = (propEvents && propEvents.length > 0) ? propEvents : contextEvents;

  // Live ticking clock state (updated every 1s for accurate live countdown)
  const [now, setNow] = useState<number>(Date.now());
  const [activeImpactFilter, setActiveImpactFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('High');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [selectedTz, setSelectedTz] = useState<string>(() => getStoredTimezonePreference());
  const [isTzPickerOpen, setIsTzPickerOpen] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(5);

  // Ticking timer: 1 second interval for exact live countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Effective resolved timezone (auto-detected or user chosen)
  const effectiveTz = useMemo(() => resolveEffectiveTimezone(selectedTz), [selectedTz]);
  const tzMeta = useMemo(() => getTimezoneMeta(effectiveTz, new Date(now)), [effectiveTz, now]);

  const handleSelectTimezone = (tz: string) => {
    setSelectedTz(tz);
    setStoredTimezonePreference(tz);
    setIsTzPickerOpen(false);
  };

  // Strictly filter genuinely upcoming events: timestamp > now.
  // Past events are automatically moved out of this list!
  const upcomingEvents = useMemo(() => {
    return filterGenuinelyUpcomingEvents(allEvents, now, activeImpactFilter);
  }, [allEvents, now, activeImpactFilter]);

  const displayedEvents = useMemo(() => {
    return upcomingEvents.slice(0, visibleCount);
  }, [upcomingEvents, visibleCount]);

  // Next upcoming tier-1 high impact event for the quick banner
  const nextHighImpactEvent = useMemo(() => {
    const highEvents = filterGenuinelyUpcomingEvents(allEvents, now, 'High');
    return highEvents.length > 0 ? highEvents[0] : null;
  }, [allEvents, now]);

  const nextHighCountdown = useMemo(() => {
    if (!nextHighImpactEvent) return null;
    return calculateLiveCountdown(nextHighImpactEvent.timestamp, now);
  }, [nextHighImpactEvent, now]);

  return (
    <div id="economic-news-section" className="bg-[#0B0F19] border border-slate-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl text-slate-200">
      {/* Top Header: Title & Timezone Detector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/70">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white tracking-wide uppercase">
                {isRTL ? 'المفكرة الاقتصادية المباشرة' : 'Live Economic Calendar'}
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {isRTL ? 'مباشر' : 'Live'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isRTL ? 'أحداث السوق القادمة بالتوقيت المحلي الحقيقي' : 'Real-time scheduled catalysts in your local time'}
            </p>
          </div>
        </div>

        {/* Timezone Badge & Manual Refresh */}
        <div className="flex items-center gap-2 relative">
          <div className="relative">
            <button
              id="btn-calendar-tz-picker"
              onClick={() => setIsTzPickerOpen(!isTzPickerOpen)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title={effectiveTz}
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate max-w-[130px]">{tzMeta.offsetString}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Timezone Dropdown */}
            {isTzPickerOpen && (
              <div className="absolute right-0 rtl:left-0 rtl:right-auto top-full mt-1.5 w-64 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {isRTL ? 'اختر التوقيت' : 'Select Timezone'}
                </div>
                <div className="max-h-56 overflow-y-auto py-1">
                  {POPULAR_TIMEZONES.map(tzOpt => {
                    const isSelected = (selectedTz === tzOpt.timeZone) || (selectedTz === 'AUTO' && tzOpt.timeZone === 'AUTO');
                    return (
                      <button
                        key={tzOpt.timeZone}
                        onClick={() => handleSelectTimezone(tzOpt.timeZone)}
                        className={`w-full text-left rtl:text-right px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          isSelected ? 'text-amber-300 font-semibold bg-slate-800/50' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{tzOpt.flag}</span>
                          <span className="truncate">{tzOpt.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            id="btn-calendar-refresh"
            onClick={() => refresh()}
            disabled={isRefreshing || isLoading}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            title={isRTL ? 'تحديث البيانات' : 'Refresh Live Feed'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Next Upcoming High-Impact Catalyst Banner */}
      {nextHighImpactEvent && nextHighCountdown && !nextHighCountdown.isPassed && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950/40 via-[#16121E] to-[#0F172A] border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xl flex-shrink-0">{getCurrencyFlag(nextHighImpactEvent.currency, nextHighImpactEvent.countryCode)}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-tight">
                  {nextHighImpactEvent.currency || nextHighImpactEvent.countryCode} • {nextHighImpactEvent.event}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {isRTL ? 'تأثير قوي' : 'High Impact'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {formatEventInTimezone(nextHighImpactEvent.timestamp, effectiveTz).fullFormatted} ({tzMeta.offsetString})
              </div>
            </div>
          </div>

          {/* Real-time Ticking Countdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 ${nextHighCountdown.badgeClass}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{nextHighCountdown.formatted}</span>
            </div>
          </div>
        </div>
      )}

      {/* Impact Filter Pills */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['High', 'All', 'Medium', 'Low'] as const).map(filter => {
            const isActive = activeImpactFilter === filter;
            return (
              <button
                key={filter}
                id={`filter-impact-${filter.toLowerCase()}`}
                onClick={() => setActiveImpactFilter(filter)}
                className={`px-3 py-1 rounded-lg font-medium text-xs transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {filter === 'High' && (isRTL ? 'عالية التأثير' : 'High Impact')}
                {filter === 'All' && (isRTL ? 'جميع الأحداث' : 'All Impacts')}
                {filter === 'Medium' && (isRTL ? 'متوسطة' : 'Medium')}
                {filter === 'Low' && (isRTL ? 'منخفضة' : 'Low')}
              </button>
            );
          })}
        </div>

        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          {upcomingEvents.length} {isRTL ? 'أحداث قادمة' : 'upcoming'}
        </span>
      </div>

      {/* List of Upcoming Events */}
      <div className="space-y-2">
        {isLoading && upcomingEvents.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <RotateCw className="w-5 h-5 animate-spin mx-auto text-blue-400" />
            <p className="text-xs">{isRTL ? 'جاري تحميل المفكرة الاقتصادية الحية...' : 'Loading live economic calendar...'}</p>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="py-8 text-center text-slate-400 border border-slate-800/80 rounded-xl bg-slate-900/30 p-4">
            <Calendar className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-medium text-slate-300">
              {isRTL ? 'لا توجد أحداث قادمة بهذه المعايير حالياً' : 'No upcoming events matching this filter right now'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {isRTL ? 'تأكد من فتح الأسواق أو اختر "جميع الأحداث" لعرض المزيد' : 'Markets may be closed or try selecting "All Impacts"'}
            </p>
          </div>
        ) : (
          displayedEvents.map(ev => {
            const isExpanded = expandedEventId === ev.id;
            const normImp = normalizeImpact(ev.impact, ev.event);
            const impStyle = getImpactStyle(normImp);
            const timeInfo = formatEventInTimezone(ev.timestamp, effectiveTz);
            const countdown = calculateLiveCountdown(ev.timestamp, now);

            return (
              <div
                key={ev.id}
                id={`economic-card-${ev.id}`}
                className="group border border-slate-800/90 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900/90 rounded-xl p-3 transition-all cursor-pointer"
                onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
              >
                {/* Main Card Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {/* Currency & Flag */}
                    <div className="flex flex-col items-center justify-center w-9 h-9 rounded-lg bg-slate-800/90 border border-slate-700/60 flex-shrink-0">
                      <span className="text-base leading-none">{getCurrencyFlag(ev.currency, ev.countryCode)}</span>
                      <span className="text-[9px] font-bold text-slate-300 mt-0.5">{ev.currency || ev.countryCode}</span>
                    </div>

                    {/* Title & Local Time */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-white group-hover:text-amber-300 transition-colors truncate">
                          {ev.event}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${impStyle.badge}`}>
                          {impStyle.label}
                        </span>
                      </div>

                      {/* Local Time and Date */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                        <span className="font-medium text-slate-300">
                          {timeInfo.dateFormatted} • {timeInfo.timeFormatted}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {tzMeta.offsetString}
                        </span>
                        {ev.utcIso && (
                          <span className="text-slate-500 font-mono text-[10px] hidden sm:inline" title="Exact UTC Time">
                            ({ev.utcIso.split('T')[1].substring(0, 5)} UTC)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Live Countdown Badge */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold flex items-center gap-1 border ${countdown.badgeClass}`}>
                      <Clock className="w-3 h-3" />
                      <span>{countdown.formatted}</span>
                    </div>

                    {/* Forecast / Previous mini info */}
                    <div className="text-[10px] text-slate-400 font-mono">
                      {ev.forecast && ev.forecast !== '—' && <span>Est: {ev.forecast}</span>}
                      {ev.forecast && ev.previous && ev.previous !== '—' && <span className="mx-1 text-slate-600">|</span>}
                      {ev.previous && ev.previous !== '—' && <span>Prev: {ev.previous}</span>}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                    {/* Numbers comparison: Previous vs Consensus Forecast */}
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-center font-mono">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">{isRTL ? 'السابق' : 'Previous'}</div>
                        <div className="text-xs font-semibold text-slate-300 mt-0.5">{ev.previous || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-blue-400 uppercase">{isRTL ? 'التقدير' : 'Forecast'}</div>
                        <div className="text-xs font-semibold text-blue-300 mt-0.5">{ev.forecast || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">{isRTL ? 'الفعلي' : 'Actual'}</div>
                        <div className="text-xs font-semibold text-slate-400 mt-0.5">
                          {ev.actual || (isRTL ? 'قيد الانتظار' : 'Pending')}
                        </div>
                      </div>
                    </div>

                    {/* Why this matters */}
                    {ev.whyItMatters && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-400 bg-slate-800/30 p-2 rounded-lg">
                        <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span>{ev.whyItMatters}</span>
                      </div>
                    )}

                    {/* Affected Assets & Chart Shortcut */}
                    {ev.affectedAssets && ev.affectedAssets.length > 0 && (
                      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">
                            {isRTL ? 'الأصول المتأثرة:' : 'Affected:'}
                          </span>
                          {ev.affectedAssets.map(asset => (
                            <button
                              key={asset}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenChartModal) onOpenChartModal(asset);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-medium transition-colors flex items-center gap-1"
                            >
                              <span>{asset}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          ))}
                        </div>

                        <span className="text-[10px] text-slate-500 font-mono">
                          {isRTL ? 'المصدر:' : 'Source:'} {ev.country}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Show more / pagination if more upcoming events exist */}
      {upcomingEvents.length > visibleCount && (
        <button
          onClick={() => setVisibleCount(prev => prev + 5)}
          className="w-full py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5"
        >
          <span>{isRTL ? `عرض المزيد (${upcomingEvents.length - visibleCount} إضافي)` : `Show More (${upcomingEvents.length - visibleCount} more)`}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Primary Action Button: Open Full Economic Calendar Modal */}
      <button
        id="btn-open-full-calendar"
        onClick={onOpenCalendar}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer"
      >
        <Calendar className="w-4 h-4" />
        <span>{isRTL ? 'فتح المفكرة الاقتصادية الكاملة (جميع الجلسات والنتائج)' : 'Open Full Institutional Economic Calendar'}</span>
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
