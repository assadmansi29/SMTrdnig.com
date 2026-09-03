import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Filter, 
  Globe, 
  Flame, 
  Radio, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Check,
  Building,
  RotateCcw
} from 'lucide-react';
import { EconomicEvent } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { 
  getUserTimezoneInfo, 
  formatEventLocalTime, 
  getEventCountdown, 
  getImpactBadgeStyle,
  groupEventsByLocalDate,
  POPULAR_TRADING_TIMEZONES,
  getStoredTimezonePreference,
  setStoredTimezonePreference,
  getDetectedTimezone
} from '../utils/economicNewsUtils';

interface EconomicCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EconomicEvent[];
}

export const EconomicCalendarModal: React.FC<EconomicCalendarModalProps> = ({
  isOpen,
  onClose,
  events
}) => {
  const { t, language, isRTL } = useTranslation();
  const [filterImpact, setFilterImpact] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>('news-us-nfp-sep04');
  const [now, setNow] = useState<number>(Date.now());
  const [selectedTz, setSelectedTz] = useState<string>(() => {
    return getStoredTimezonePreference() || 'AUTO';
  });
  const [isTzDropdownOpen, setIsTzDropdownOpen] = useState(false);

  // Real-time ticking timer for countdowns
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Re-check detected timezone when window gains focus or visibility changes
  useEffect(() => {
    if (!isOpen) return;
    const handleFocus = () => {
      setNow(Date.now());
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const tzInfo = getUserTimezoneInfo(selectedTz);
  const activeTz = tzInfo.timeZone;
  const detectedTz = getDetectedTimezone();

  const handleSelectTz = (tz: string) => {
    setSelectedTz(tz);
    setStoredTimezonePreference(tz);
    setIsTzDropdownOpen(false);
  };

  const filteredEvents = events.filter(e => {
    if (filterImpact === 'All') return true;
    if (filterImpact === 'Extreme') return e.impact === 'Extreme';
    if (filterImpact === 'High') return e.impact === 'High';
    if (filterImpact === 'Medium') return e.impact === 'Medium';
    if (filterImpact === 'Low') return e.impact === 'Low';
    if (filterImpact === 'Upcoming') {
      const { status } = getEventCountdown(e, now, language);
      return status === 'upcoming' || status === 'approaching' || status === 'live';
    }
    if (filterImpact === 'Released') {
      const { status } = getEventCountdown(e, now, language);
      return status === 'released';
    }
    return true;
  });

  // Calculate event-day grouping strictly from canonical UTC timestamps converted to user timezone
  const dayGroups = groupEventsByLocalDate(filteredEvents, activeTz, language, now);

  const approachingEvent = events.find(e => getEventCountdown(e, now, language).isApproaching);
  const liveEvent = events.find(e => getEventCountdown(e, now, language).isLive);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-[#0D121F] border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden text-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* 1. Header with Timezone Selector */}
        <div className="sticky top-0 z-20 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-[#090D17] shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                <Flame className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate flex items-center gap-2">
                  <span>{t('calModalTitle')}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                  <span className="text-slate-400 hidden sm:inline">{t('calModalSubtitle')}</span>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span className="text-emerald-400 font-mono-num text-[11px] font-medium">
                    Verified Tier-1 Economic Calendar
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
              aria-label="Close economic calendar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Timezone Switcher Toolbar */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 flex items-center gap-1 font-mono-num text-[11px]">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  {t('ecoYourTzLabel')}:
                </span>
                <button
                  type="button"
                  onClick={() => setIsTzDropdownOpen(!isTzDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 font-mono-num font-semibold text-xs cursor-pointer transition-all shadow-sm"
                >
                  <span>{tzInfo.isAutoDetected ? `🌐 Auto (${tzInfo.displayName})` : tzInfo.displayName}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isTzDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {!tzInfo.isAutoDetected && (
                  <button
                    type="button"
                    onClick={() => handleSelectTz('AUTO')}
                    title={`Reset to auto-detected local device timezone (${detectedTz})`}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span className="hidden sm:inline">Reset to Local</span>
                  </button>
                )}
              </div>

              {/* Timezone Dropdown Menu */}
              {isTzDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsTzDropdownOpen(false)} 
                  />
                  <div className="absolute left-0 rtl:left-auto rtl:right-0 top-full mt-1.5 z-40 w-72 sm:w-80 bg-[#0B0F19] border border-cyan-500/30 rounded-xl shadow-2xl p-2 max-h-72 overflow-y-auto space-y-1 animate-fadeIn">
                    <div className="px-2.5 py-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Institutional Trading Desks & Regions
                    </div>
                    {POPULAR_TRADING_TIMEZONES.map(option => {
                      const isSelected = selectedTz === option.timeZone || (option.timeZone === 'AUTO' && selectedTz === 'AUTO');
                      const optInfo = getUserTimezoneInfo(option.timeZone === 'AUTO' ? detectedTz : option.timeZone);
                      return (
                        <button
                          key={option.timeZone}
                          type="button"
                          onClick={() => handleSelectTz(option.timeZone)}
                          className={`w-full text-left rtl:text-right px-3 py-2 rounded-lg text-xs font-mono-num flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' 
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-sm">{option.flag}</span>
                            <div className="truncate">
                              <div className="font-semibold leading-tight">{option.label}</div>
                              <div className="text-[10px] text-slate-400 font-normal truncate">
                                {option.timeZone === 'AUTO' ? `Device Local: ${detectedTz} (${optInfo.offsetString})` : `${optInfo.timeZone} • ${optInfo.offsetString}`}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 ml-2 rtl:mr-2 rtl:ml-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="text-[11px] text-cyan-300 font-mono-num flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>
                {t('ecoLocalTimeLabel')}:{' '}
                <strong className="text-white">
                  {new Intl.DateTimeFormat('en-US', {
                    timeZone: activeTz,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  }).format(new Date(now))}
                </strong>
                <span className="text-slate-400 ml-1">({tzInfo.abbreviation || tzInfo.offsetString})</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Approaching or Live Catalyst Banner */}
        {liveEvent && (
          <div className="bg-gradient-to-r from-rose-950/90 via-[#230C1C] to-rose-950/90 border-b border-rose-500/70 px-4 sm:px-6 py-2.5 flex items-center gap-2.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-ping shrink-0"></span>
            <span className="bg-rose-500 text-white font-black px-2 py-0.5 rounded text-[10px] uppercase">
              {t('ecoStatusLive')}
            </span>
            <span className="font-bold text-white truncate">{liveEvent.event}</span>
            <span className="text-rose-200 text-[11px] hidden md:inline ml-auto rtl:mr-auto rtl:ml-0">
              {t('ecoLiveAlertDesc')}
            </span>
          </div>
        )}

        {!liveEvent && approachingEvent && (
          <div className="bg-gradient-to-r from-amber-950/90 via-[#261A0A] to-amber-950/90 border-b border-amber-500/70 px-4 sm:px-6 py-2.5 flex items-center gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] uppercase">
              {t('ecoApproachingAlert')}: {getEventCountdown(approachingEvent, now, language).text}
            </span>
            <span className="font-bold text-white truncate">{approachingEvent.event}</span>
            <span className="text-amber-200 text-[11px] hidden md:inline ml-auto rtl:mr-auto rtl:ml-0">
              {t('ecoApproachingAlertDesc')}
            </span>
          </div>
        )}

        {/* 3. Filter Controls */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#0B0F19] border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 flex items-center gap-1 mr-1 rtl:mr-0 rtl:ml-1">
              <Filter className="w-3.5 h-3.5" /> {t('calImpactLabel')}
            </span>
            {[
              { key: 'All', label: t('ecoFilterAll') },
              { key: 'Extreme', label: t('ecoFilterExtreme') },
              { key: 'High', label: t('ecoFilterHigh') },
              { key: 'Medium', label: t('ecoFilterMedium') },
              { key: 'Upcoming', label: t('ecoFilterUpcomingOnly') },
              { key: 'Released', label: t('ecoFilterReleasedOnly') },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilterImpact(item.key)}
                className={`text-xs px-2.5 py-1 rounded-lg font-mono-num transition-all cursor-pointer ${
                  filterImpact === item.key
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400 font-mono-num">
            {filteredEvents.length} Verified Releases
          </span>
        </div>

        {/* 4. Events Grouped By Local Calendar Day */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <p className="text-sm">No economic events matching current filters.</p>
              <button
                onClick={() => setFilterImpact('All')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            dayGroups.map((group) => (
              <div key={group.dateKey} className="space-y-3">
                {/* Day Header */}
                <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <h4 className="font-bold text-xs sm:text-sm text-slate-200 uppercase tracking-wider font-mono-num">
                      {group.dateLabel}
                    </h4>
                  </div>
                  {group.relativeDay === 'today' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px] uppercase font-mono-num">
                      {group.relativeLabel}
                    </span>
                  )}
                  {group.relativeDay === 'tomorrow' && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] uppercase font-mono-num">
                      {group.relativeLabel}
                    </span>
                  )}
                  {group.relativeDay === 'yesterday' && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-medium text-[10px] uppercase font-mono-num">
                      {group.relativeLabel}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 ml-auto rtl:mr-auto rtl:ml-0 font-mono-num">
                    {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                {/* Day Events */}
                <div className="space-y-3">
                  {group.events.map((evt) => {
                    const isExpanded = expandedId === evt.id;
                    const { text: countdownText, status, isApproaching, isLive } = getEventCountdown(evt, now, language);
                    const localTime = formatEventLocalTime(evt.timestamp, language, activeTz, now);
                    const style = getImpactBadgeStyle(evt.impact);

                    return (
                      <div
                        key={evt.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isLive
                            ? 'bg-gradient-to-b from-[#1E0B19] to-[#0A0E18] border-rose-500 shadow-xl shadow-rose-950/20'
                            : isApproaching
                            ? 'bg-gradient-to-b from-[#221608] to-[#0A0E18] border-amber-500 shadow-xl shadow-amber-950/20'
                            : isExpanded
                            ? 'bg-[#0E1528] border-amber-400/50 shadow-lg'
                            : 'bg-[#090D17] hover:bg-slate-800/40 border-slate-800'
                        }`}
                      >
                        {/* Clickable Header Card */}
                        <div
                          onClick={() => toggleExpand(evt.id)}
                          className="p-3.5 sm:p-4 cursor-pointer flex flex-col gap-2.5"
                        >
                          {/* Top Row: Country, Local Time (in user's timezone), Impact, Status Badge */}
                          <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-mono-num">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Country */}
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-bold text-[11px] border border-slate-700">
                                {evt.countryCode === 'US' ? '🇺🇸 US' : evt.countryCode === 'EU' ? '🇪🇺 EU' : evt.countryCode === 'JP' ? '🇯🇵 JP' : evt.countryCode === 'GB' ? '🇬🇧 UK' : evt.countryCode}
                              </span>

                              {/* Localized Time in User's Timezone */}
                              <span className="text-amber-300 font-bold flex items-center gap-1.5 text-xs sm:text-sm">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>{localTime.timeStr}</span>
                                <span className="text-[10px] text-cyan-300 font-normal">
                                  ({tzInfo.abbreviation || tzInfo.offsetString})
                                </span>
                              </span>

                              {/* Category */}
                              {evt.category && (
                                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  {evt.category}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Impact Level: Extreme / High / Medium / Low */}
                              <span className={`px-2.5 py-0.5 rounded-md text-[11px] uppercase tracking-wider ${style.badgeClass}`}>
                                {evt.impact === 'Extreme' ? `⚡ ${t('ecoImpactExtreme')}` : evt.impact === 'High' ? t('ecoImpactHigh') : evt.impact === 'Medium' ? t('ecoImpactMedium') : t('ecoImpactLow')}
                              </span>

                              {/* Live / Approaching / Countdown / Released Badge */}
                              {isLive ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-600 text-white font-black text-[11px] uppercase tracking-wider animate-pulse shadow-md">
                                  <Radio className="w-3 h-3" />
                                  {t('ecoStatusLive')}
                                </span>
                              ) : isApproaching ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider animate-pulse shadow-md">
                                  <AlertTriangle className="w-3 h-3" />
                                  {countdownText}
                                </span>
                              ) : status === 'released' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
                                  ✓ {t('ecoStatusReleased')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-cyan-300 font-bold text-[11px]">
                                  ⏱ {countdownText}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Middle Row: Event Title + Toggle Chevron */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-bold text-sm sm:text-base text-white hover:text-amber-300 transition-colors leading-snug">
                                {evt.event}
                              </h4>
                              {evt.sourceLocalTime && evt.sourceTimezone && (
                                <div className="text-[11px] text-slate-400 font-mono-num flex items-center gap-1.5 mt-0.5">
                                  <Building className="w-3 h-3 text-slate-500" />
                                  <span>
                                    Official Source Release: <strong>{evt.sourceLocalTime}</strong> {evt.sourceTimezone}
                                    {evt.sourceAgency ? ` • ${evt.sourceAgency}` : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                            <button 
                              type="button" 
                              aria-label="Toggle details"
                              className="text-slate-400 hover:text-amber-300 p-1 shrink-0"
                            >
                              {isExpanded ? <ChevronUp className="w-5 h-5 text-amber-400" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                          </div>

                          {/* Bottom Row: Previous / Forecast / Actual Bar */}
                          <div className="grid grid-cols-3 gap-2.5 pt-1.5 border-t border-slate-800/80 text-center font-mono-num">
                            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('ecoPreviousLabel')}</span>
                              <span className="text-xs sm:text-sm text-slate-200 font-bold">{evt.previous}</span>
                            </div>
                            <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('ecoForecastLabel')}</span>
                              <span className="text-xs sm:text-sm text-amber-300 font-extrabold">{evt.forecast}</span>
                            </div>
                            <div className={`p-2 rounded-xl border ${
                              evt.actual 
                                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                                : 'bg-slate-950/60 border-slate-800/80 text-slate-500'
                            }`}>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('ecoActualLabel')}</span>
                              <span className="text-xs sm:text-sm font-black">
                                {evt.actual ? evt.actual : '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 5. Expanded View: Institutional Analysis */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/60 space-y-3 animate-fadeIn text-xs">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                                <Info className="w-4 h-4" />
                                <span>{t('ecoWhyItMattersTitle')}</span>
                              </div>
                              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed bg-[#0B0F19] p-3 rounded-xl border border-slate-800/90 shadow-inner">
                                {evt.whyItMatters || t('calVolNote')}
                              </p>
                            </div>

                            {/* Key Affected Assets */}
                            {evt.affectedAssets && evt.affectedAssets.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap pt-1">
                                <span className="text-xs text-slate-400 uppercase font-mono-num font-semibold">
                                  {t('ecoAffectedAssetsLabel')}:
                                </span>
                                {evt.affectedAssets.map(asset => (
                                  <span
                                    key={asset}
                                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-mono-num font-bold text-cyan-300"
                                  >
                                    {asset}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Canonical Metadata Display */}
                            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono-num text-slate-400 flex items-center justify-between flex-wrap gap-2">
                              <span>Canonical UTC Timestamp: <strong className="text-slate-300">{evt.utcIso || new Date(evt.timestamp).toISOString()}</strong></span>
                              <span>Source IANA Timezone: <strong className="text-amber-300">{evt.sourceTimezone || 'N/A'}</strong></span>
                            </div>

                            {/* Directional bias / note */}
                            <div className="flex items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/80 text-slate-400">
                              <span className="text-emerald-400 font-medium">
                                ↑ {t('ecoMarketBiasBullish')}
                              </span>
                              <span className="text-slate-500 font-mono-num text-[11px]">
                                SMTrading Macro Desk Feed
                              </span>
                            </div>
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

        {/* 6. Footer */}
        <div className="px-4 sm:px-6 py-3 bg-[#090D17] border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 truncate">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{t('calVolNote')}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition-colors font-bold cursor-pointer shrink-0 shadow-sm"
          >
            {t('calDone')}
          </button>
        </div>
      </div>
    </div>
  );
};
