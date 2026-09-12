import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Flame, 
  AlertTriangle, 
  Globe, 
  RotateCw, 
  Check, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ChevronDown, 
  ChevronUp, 
  Info, 
  ArrowUpRight,
  SlidersHorizontal
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
  filterPastReleasedEvents,
  POPULAR_TIMEZONES
} from '../utils/economicCalendarUtils';

interface EconomicCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  events?: EconomicEvent[];
}

export const EconomicCalendarModal: React.FC<EconomicCalendarModalProps> = ({
  isOpen,
  onClose,
  events: propEvents
}) => {
  const { isRTL } = useTranslation();
  const { events: contextEvents, isLoading, isRefreshing, refresh } = useEconomicCalendar();
  const allEvents = (propEvents && propEvents.length > 0) ? propEvents : contextEvents;

  // Active View Tab: 'upcoming' vs 'released'
  const [activeTab, setActiveTab] = useState<'upcoming' | 'released'>('upcoming');
  const [activeImpactFilter, setActiveImpactFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('High');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Timezone state
  const [selectedTz, setSelectedTz] = useState<string>(() => getStoredTimezonePreference());
  const [isTzPickerOpen, setIsTzPickerOpen] = useState<boolean>(false);

  // Live ticking clock (ticking every 1s)
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const effectiveTz = useMemo(() => resolveEffectiveTimezone(selectedTz), [selectedTz]);
  const tzMeta = useMemo(() => getTimezoneMeta(effectiveTz, new Date(now)), [effectiveTz, now]);

  const handleSelectTimezone = (tz: string) => {
    setSelectedTz(tz);
    setStoredTimezonePreference(tz);
    setIsTzPickerOpen(false);
  };

  // Base list depending on active tab
  const baseList = useMemo(() => {
    if (activeTab === 'upcoming') {
      return filterGenuinelyUpcomingEvents(allEvents, now, activeImpactFilter);
    } else {
      return filterPastReleasedEvents(allEvents, now, activeImpactFilter);
    }
  }, [allEvents, activeTab, now, activeImpactFilter]);

  // Apply currency and search query filters
  const filteredEvents = useMemo(() => {
    return baseList.filter(ev => {
      if (selectedCurrency !== 'All') {
        const evCur = (ev.currency || '').toUpperCase();
        if (evCur !== selectedCurrency) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ev.event.toLowerCase().includes(q);
        const matchesCountry = ev.country.toLowerCase().includes(q);
        const matchesCurrency = (ev.currency || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCountry && !matchesCurrency) return false;
      }
      return true;
    });
  }, [baseList, selectedCurrency, searchQuery]);

  // Group events by local date in user's active timezone
  const groupedByLocalDate = useMemo(() => {
    const groups: { dateKey: string; dateTitle: string; events: EconomicEvent[] }[] = [];
    const groupMap = new Map<string, EconomicEvent[]>();

    for (const ev of filteredEvents) {
      const timeInfo = formatEventInTimezone(ev.timestamp, effectiveTz);
      const dateKey = timeInfo.isoDateLocal || 'other';
      if (!groupMap.has(dateKey)) {
        groupMap.set(dateKey, []);
      }
      groupMap.get(dateKey)!.push(ev);
    }

    groupMap.forEach((evList, dateKey) => {
      if (evList.length > 0) {
        const sampleTime = formatEventInTimezone(evList[0].timestamp, effectiveTz);
        let dateTitle = sampleTime.dateFormatted;
        if (sampleTime.isToday) {
          dateTitle = isRTL ? `اليوم • ${sampleTime.dateFormatted}` : `Today • ${sampleTime.dateFormatted}`;
        } else if (sampleTime.isTomorrow) {
          dateTitle = isRTL ? `غداً • ${sampleTime.dateFormatted}` : `Tomorrow • ${sampleTime.dateFormatted}`;
        }
        groups.push({ dateKey, dateTitle, events: evList });
      }
    });

    return groups;
  }, [filteredEvents, effectiveTz, isRTL]);

  const majorCurrencies = ['All', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD', 'CNY'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="economic-calendar-modal-content"
        className="bg-[#0A0E17] border border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-200"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-[#0F1626] to-[#0A0E17] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {isRTL ? 'المفكرة الاقتصادية المؤسسية' : 'Institutional Economic Calendar'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {isRTL ? 'بيانات حقيقية مباشرة' : 'Real-Time Feed'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRTL 
                  ? 'جدول ومواعيد إصدارات الاقتصاد الكلي العالمي بالتوقيت المحلي بدعم التوقيت الصيفي' 
                  : 'Global macroeconomic releases synchronized in your local timezone with full DST support'}
              </p>
            </div>
          </div>

          {/* Timezone Selector & Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Timezone picker dropdown */}
            <div className="relative">
              <button
                id="modal-btn-tz-select"
                onClick={() => setIsTzPickerOpen(!isTzPickerOpen)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="max-w-[140px] truncate">{tzMeta.display}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isTzPickerOpen && (
                <div className="absolute right-0 rtl:left-0 rtl:right-auto top-full mt-2 w-72 bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {isRTL ? 'اختر النطاق الزمني' : 'Select Timezone'}
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {POPULAR_TIMEZONES.map(tzOpt => {
                      const isSelected = (selectedTz === tzOpt.timeZone) || (selectedTz === 'AUTO' && tzOpt.timeZone === 'AUTO');
                      return (
                        <button
                          key={tzOpt.timeZone}
                          onClick={() => handleSelectTimezone(tzOpt.timeZone)}
                          className={`w-full text-left rtl:text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                            isSelected ? 'text-amber-300 font-bold bg-slate-800/60' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span>{tzOpt.flag}</span>
                            <span className="truncate">{tzOpt.label}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Manual Sync Button */}
            <button
              id="modal-btn-refresh"
              onClick={() => refresh()}
              disabled={isRefreshing || isLoading}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
              title={isRTL ? 'تحديث فوري' : 'Sync Live Market Data'}
            >
              <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            {/* Modal Close Button */}
            <button
              id="modal-btn-close"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 hover:text-rose-400 border border-slate-700/80 text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Mode Tabs (Upcoming Catalysts vs Recent Released Results) */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-800 bg-[#090D15] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="tab-upcoming-events"
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'upcoming'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isRTL ? 'الأحداث القادمة (عد تنازلي مباشر)' : 'Upcoming Catalysts (Live Countdown)'}</span>
            </button>

            <button
              id="tab-released-events"
              onClick={() => setActiveTab('released')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'released'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isRTL ? 'النتائج الصادرة مؤخراً' : 'Recent Releases & Outcomes'}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'ابحث عن حدث، دولة، عملة...' : 'Search event, currency, country...'}
              className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 rtl:left-2.5 rtl:right-auto top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills Bar: Impact & Currency */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#080B12] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Impact filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 uppercase mr-1 rtl:ml-1 rtl:mr-0">
              {isRTL ? 'التأثير:' : 'Impact:'}
            </span>
            {(['High', 'All', 'Medium', 'Low'] as const).map(imp => {
              const isActive = activeImpactFilter === imp;
              return (
                <button
                  key={imp}
                  onClick={() => setActiveImpactFilter(imp)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {imp === 'High' && (isRTL ? '🔥 عالي التأثير (CPI/NFP/فائدة)' : '🔥 High Impact (CPI/NFP/Rates)')}
                  {imp === 'All' && (isRTL ? 'الكل' : 'All Impacts')}
                  {imp === 'Medium' && (isRTL ? 'متوسط' : 'Medium')}
                  {imp === 'Low' && (isRTL ? 'منخفض' : 'Low')}
                </button>
              );
            })}
          </div>

          {/* Major Currency Selectors */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 uppercase mr-1 rtl:ml-1 rtl:mr-0">
              {isRTL ? 'العملة:' : 'Currency:'}
            </span>
            {majorCurrencies.map(cur => {
              const isSelected = selectedCurrency === cur;
              return (
                <button
                  key={cur}
                  onClick={() => setSelectedCurrency(cur)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {cur}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Table Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading && filteredEvents.length === 0 ? (
            <div className="py-16 text-center space-y-3 text-slate-400">
              <RotateCw className="w-8 h-8 animate-spin mx-auto text-blue-400" />
              <p className="text-sm">{isRTL ? 'جاري مزامنة المفكرة الاقتصادية...' : 'Synchronizing live economic calendar...'}</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-16 text-center border border-slate-800/80 rounded-2xl bg-slate-900/30 p-8 space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-slate-600" />
              <h4 className="text-sm font-semibold text-slate-300">
                {isRTL ? 'لا توجد أحداث تطابق هذا الفلتر' : 'No economic events match the current filter'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {activeTab === 'upcoming'
                  ? (isRTL ? 'لا توجد أحداث قادمة بهذه المعايير في الأيام القادمة. جرب تبديل التأثير إلى "الكل" أو اختيار عملة أخرى.' : 'No upcoming scheduled catalysts in the next window for this filter. Try selecting "All Impacts" or another currency.')
                  : (isRTL ? 'لا توجد نتائج سابقة مسجلة بهذه المعايير.' : 'No past releases found matching this filter.')}
              </p>
            </div>
          ) : (
            groupedByLocalDate.map(group => (
              <div key={group.dateKey} className="space-y-2.5">
                {/* Date Header Separator */}
                <div className="sticky top-0 z-10 flex items-center justify-between py-1.5 px-3 rounded-lg bg-[#0F172A]/90 backdrop-blur-sm border border-slate-800 text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>{group.dateTitle}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 font-normal">
                    {group.events.length} {isRTL ? 'أحداث' : 'events'} • {tzMeta.offsetString}
                  </span>
                </div>

                {/* Events list within this date */}
                <div className="space-y-2">
                  {group.events.map(ev => {
                    const isExpanded = expandedEventId === ev.id;
                    const normImp = normalizeImpact(ev.impact, ev.event);
                    const impStyle = getImpactStyle(normImp);
                    const timeInfo = formatEventInTimezone(ev.timestamp, effectiveTz);
                    const countdown = calculateLiveCountdown(ev.timestamp, now);

                    return (
                      <div
                        key={ev.id}
                        id={`modal-card-${ev.id}`}
                        onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                        className={`border rounded-xl p-3 sm:p-4 transition-all cursor-pointer ${
                          isExpanded
                            ? 'bg-slate-900 border-slate-700 shadow-lg'
                            : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Primary Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Time, Flag, Title */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                            {/* Local Time badge */}
                            <div className="flex flex-col items-center justify-center px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex-shrink-0 min-w-[70px]">
                              <span className="text-xs font-mono font-bold text-white tracking-tight">
                                {timeInfo.timeFormatted}
                              </span>
                              <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                                {tzMeta.offsetString}
                              </span>
                            </div>

                            {/* Currency & Flag */}
                            <div className="flex flex-col items-center justify-center w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/60 flex-shrink-0">
                              <span className="text-base leading-none">{getCurrencyFlag(ev.currency, ev.countryCode)}</span>
                              <span className="text-[9px] font-bold text-slate-300 mt-0.5">{ev.currency || ev.countryCode}</span>
                            </div>

                            {/* Event Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs sm:text-sm text-white hover:text-amber-300 transition-colors truncate">
                                  {ev.event}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${impStyle.badge}`}>
                                  {impStyle.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                                <span>{ev.country}</span>
                                {ev.category && (
                                  <>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-slate-500">{ev.category}</span>
                                  </>
                                )}
                                {ev.utcIso && (
                                  <>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-slate-500 font-mono text-[10px]">
                                      {ev.utcIso.split('T')[1].substring(0, 5)} UTC
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Numbers or Countdown */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                            {/* Forecast & Previous */}
                            <div className="flex items-center gap-3 text-xs font-mono">
                              <div className="text-right rtl:text-left">
                                <div className="text-[10px] text-slate-500 uppercase">{isRTL ? 'السابق' : 'Prev'}</div>
                                <div className="text-slate-300 font-medium">{ev.previous || '—'}</div>
                              </div>
                              <div className="text-right rtl:text-left">
                                <div className="text-[10px] text-blue-400 uppercase">{isRTL ? 'التقدير' : 'Forecast'}</div>
                                <div className="text-blue-300 font-semibold">{ev.forecast || '—'}</div>
                              </div>

                              {/* Actual (if in released tab or published) */}
                              {(activeTab === 'released' || ev.actual) && (
                                <div className="text-right rtl:text-left pl-2 border-l border-slate-800">
                                  <div className="text-[10px] text-emerald-400 uppercase">{isRTL ? 'الفعلي' : 'Actual'}</div>
                                  <div className="text-emerald-300 font-bold text-sm">
                                    {ev.actual || '—'}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Live Countdown badge for Upcoming tab */}
                            {activeTab === 'upcoming' && (
                              <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border ${countdown.badgeClass}`}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>{countdown.formatted}</span>
                              </div>
                            )}

                            {/* Outcome Badge for released tab */}
                            {activeTab === 'released' && ev.outcome && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                ev.outcome === 'beat' 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                  : ev.outcome === 'miss' 
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              }`}>
                                {ev.outcome}
                              </span>
                            )}

                            {/* Expand toggle */}
                            <div className="text-slate-500">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Expanded institutional details */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-800 space-y-3 text-xs text-slate-300">
                            {/* Why this matters */}
                            {ev.whyItMatters && (
                              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                                  <Info className="w-3.5 h-3.5" />
                                  <span>{isRTL ? 'الأثر التداولي والتفسير الاقتصادي:' : 'Trading Impact & Macro Context:'}</span>
                                </div>
                                <p className="text-slate-300 text-xs leading-relaxed">{ev.whyItMatters}</p>
                              </div>
                            )}

                            {/* Affected Currency Pairs and Indices */}
                            {ev.affectedAssets && ev.affectedAssets.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-semibold text-slate-400">
                                  {isRTL ? 'الأصول الأكثر تأثراً بالتقلبات:' : 'Most Volatile Traded Assets:'}
                                </span>
                                {ev.affectedAssets.map(asset => (
                                  <span
                                    key={asset}
                                    className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-mono text-[11px] font-semibold border border-slate-700"
                                  >
                                    {asset}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-[#090D15] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>
              {isRTL ? 'جميع الأوقات محولة تلقائياً بدقة إلى' : 'All event times automatically localized to'}:{' '}
              <strong className="text-white">{effectiveTz}</strong> ({tzMeta.offsetString})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-slate-500">
              {filteredEvents.length} {isRTL ? 'أحداث معروضة' : 'events displayed'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
