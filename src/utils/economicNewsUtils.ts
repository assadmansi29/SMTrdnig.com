import { EconomicEvent, EventImpact, EventStatus } from '../types';

export interface UserTimezoneInfo {
  timeZone: string;
  abbreviation: string;
  offsetString: string;
  displayName: string;
  isAutoDetected: boolean;
}

export interface TradingTimezoneOption {
  timeZone: string;
  label: string;
  region: string;
  flag: string;
}

export const POPULAR_TRADING_TIMEZONES: TradingTimezoneOption[] = [
  { timeZone: 'AUTO', label: 'Auto (Device Local)', region: 'System', flag: '🌐' },
  { timeZone: 'America/New_York', label: 'New York (EDT / EST)', region: 'United States', flag: '🇺🇸' },
  { timeZone: 'Europe/London', label: 'London (BST / GMT)', region: 'United Kingdom', flag: '🇬🇧' },
  { timeZone: 'Europe/Berlin', label: 'Berlin / Frankfurt (CEST / CET)', region: 'Eurozone', flag: '🇩🇪' },
  { timeZone: 'Asia/Amman', label: 'Amman (GMT+3)', region: 'Jordan', flag: '🇯🇴' },
  { timeZone: 'Asia/Dubai', label: 'Dubai (GST GMT+4)', region: 'UAE', flag: '🇦🇪' },
  { timeZone: 'Asia/Tokyo', label: 'Tokyo (JST GMT+9)', region: 'Japan', flag: '🇯🇵' },
  { timeZone: 'Asia/Singapore', label: 'Singapore (SGT GMT+8)', region: 'Singapore', flag: '🇸🇬' },
  { timeZone: 'Australia/Sydney', label: 'Sydney (AEST / AEDT)', region: 'Australia', flag: '🇦🇺' },
  { timeZone: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'Universal', flag: '🌐' }
];

export const getDetectedTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

export const getStoredTimezonePreference = (): string | null => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('smtrading_economic_tz') : null;
  } catch {
    return null;
  }
};

export const setStoredTimezonePreference = (tz: string | null): void => {
  try {
    if (typeof window === 'undefined') return;
    if (!tz || tz === 'AUTO') {
      localStorage.removeItem('smtrading_economic_tz');
    } else {
      localStorage.setItem('smtrading_economic_tz', tz);
    }
  } catch {
    // Gracefully handle storage errors
  }
};

export const getUserTimezoneInfo = (preferredTz?: string | null): UserTimezoneInfo => {
  const isAutoDetected = !preferredTz || preferredTz === 'AUTO';
  const timeZone = isAutoDetected ? getDetectedTimezone() : preferredTz;
  const now = new Date();

  let abbreviation = '';
  let offsetString = '';

  try {
    const partsShort = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(now);
    abbreviation = partsShort.find(p => p.type === 'timeZoneName')?.value || '';
  } catch {
    abbreviation = '';
  }

  try {
    const partsOffset = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(now);
    offsetString = partsOffset.find(p => p.type === 'timeZoneName')?.value || '';
  } catch {
    offsetString = '';
  }

  if (!offsetString && abbreviation.startsWith('GMT')) {
    offsetString = abbreviation;
  }
  if (!offsetString) {
    offsetString = 'UTC';
  }

  let displayName = '';
  if (abbreviation && abbreviation !== offsetString && !offsetString.includes(abbreviation)) {
    displayName = `${timeZone} (${abbreviation}, ${offsetString})`;
  } else {
    displayName = `${timeZone} (${offsetString})`;
  }

  return {
    timeZone,
    abbreviation,
    offsetString,
    displayName,
    isAutoDetected
  };
};

export interface LocalizedEventDateTime {
  timeStr: string; // 24h format e.g. "14:30"
  timeStr12: string; // 12h format e.g. "2:30 PM"
  dateStr: string; // e.g. "Fri, Sep 4"
  fullDateStr: string; // e.g. "Friday, September 4, 2026"
  fullStr: string; // e.g. "Fri, Sep 4 • 14:30"
  relativeDay: 'today' | 'tomorrow' | 'yesterday' | 'date';
  relativeDayLabel: string;
  isoLocalDate: string; // e.g. "2026-09-04"
  timeZone: string;
  abbreviation: string;
  offsetString: string;
}

export const getZonedDateParts = (timestamp: number | Date, timeZone: string) => {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const findPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  return {
    year: findPart('year'),
    month: findPart('month'),
    day: findPart('day'),
    hour: findPart('hour'),
    minute: findPart('minute'),
    second: findPart('second')
  };
};

export const formatEventLocalTime = (
  timestamp: number,
  lang: string = 'en',
  targetTimeZone?: string,
  nowMs: number = Date.now()
): LocalizedEventDateTime => {
  const timeZone = targetTimeZone || getDetectedTimezone();
  const date = new Date(timestamp);
  const localeCode = lang === 'ar' ? 'ar-EG' : lang === 'ru' ? 'ru-RU' : lang === 'uk' ? 'uk-UA' : 'en-US';

  // 24-hour time string (strictly standard for institutional economic calendars)
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);

  // 12-hour alternative
  const timeStr12 = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);

  // Localized date string
  const dateStr = new Intl.DateTimeFormat(localeCode, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);

  const fullDateStr = new Intl.DateTimeFormat(localeCode, {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);

  // Calculate local date parts in target timeZone
  const pEvt = getZonedDateParts(timestamp, timeZone);
  const pNow = getZonedDateParts(nowMs, timeZone);

  const isoLocalDate = `${pEvt.year}-${String(pEvt.month).padStart(2, '0')}-${String(pEvt.day).padStart(2, '0')}`;

  const dEvtUtcDay = Date.UTC(pEvt.year, pEvt.month - 1, pEvt.day);
  const dNowUtcDay = Date.UTC(pNow.year, pNow.month - 1, pNow.day);
  const dayDiff = Math.round((dEvtUtcDay - dNowUtcDay) / 86400000);

  let relativeDay: 'today' | 'tomorrow' | 'yesterday' | 'date' = 'date';
  let relativeDayLabel = dateStr;

  if (dayDiff === 0) {
    relativeDay = 'today';
    relativeDayLabel = lang === 'ar' ? 'اليوم' : lang === 'ru' ? 'Сегодня' : lang === 'uk' ? 'Сьогодні' : 'Today';
  } else if (dayDiff === 1) {
    relativeDay = 'tomorrow';
    relativeDayLabel = lang === 'ar' ? 'غداً' : lang === 'ru' ? 'Завтра' : lang === 'uk' ? 'Завтра' : 'Tomorrow';
  } else if (dayDiff === -1) {
    relativeDay = 'yesterday';
    relativeDayLabel = lang === 'ar' ? 'أمس' : lang === 'ru' ? 'Вчера' : lang === 'uk' ? 'Вчора' : 'Yesterday';
  }

  const tzInfo = getUserTimezoneInfo(timeZone);

  return {
    timeStr,
    timeStr12,
    dateStr,
    fullDateStr,
    fullStr: `${dateStr} • ${timeStr}`,
    relativeDay,
    relativeDayLabel,
    isoLocalDate,
    timeZone,
    abbreviation: tzInfo.abbreviation,
    offsetString: tzInfo.offsetString
  };
};

export const getEventStatus = (event: EconomicEvent, now: number): EventStatus => {
  if (event.statusOverride) return event.statusOverride;

  if (!event.timestamp) {
    return event.actual && event.actual !== '-' ? 'released' : 'upcoming';
  }

  const diff = event.timestamp - now;

  // If ended more than 15 mins ago: released
  if (diff < -15 * 60 * 1000) {
    return 'released';
  }

  // If between 0 and 15 mins after release time: LIVE
  if (diff <= 0 && diff >= -15 * 60 * 1000) {
    return 'live';
  }

  // If approaching within 60 minutes: Approaching warning!
  if (diff > 0 && diff <= 60 * 60 * 1000) {
    return 'approaching';
  }

  return 'upcoming';
};

export interface EventCountdownInfo {
  text: string;
  diffMs: number;
  status: EventStatus;
  isApproaching: boolean;
  isLive: boolean;
  isReleased: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const getEventCountdown = (
  event: EconomicEvent, 
  now: number, 
  lang: string = 'en'
): EventCountdownInfo => {
  const status = getEventStatus(event, now);
  const diffMs = (event.timestamp || now) - now;

  if (status === 'live') {
    const liveText = lang === 'ar' ? 'مباشر الآن' : lang === 'ru' ? 'В прямом эфире' : lang === 'uk' ? 'Наживо' : 'LIVE NOW';
    return {
      text: liveText,
      diffMs,
      status,
      isApproaching: false,
      isLive: true,
      isReleased: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };
  }

  if (status === 'released') {
    const releasedText = lang === 'ar' ? 'صدرت' : lang === 'ru' ? 'Опубликовано' : lang === 'uk' ? 'Опубліковано' : 'Released';
    return {
      text: releasedText,
      diffMs,
      status,
      isApproaching: false,
      isLive: false,
      isReleased: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };
  }

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let timeString = '';
  if (days > 0) {
    timeString = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    timeString = `${hours}h ${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  } else if (minutes > 0) {
    timeString = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  } else {
    timeString = `${seconds}s`;
  }

  const prefix = lang === 'ar' ? 'خلال ' : lang === 'ru' ? 'Через ' : lang === 'uk' ? 'Через ' : 'In ';
  const text = `${prefix}${timeString}`;

  return {
    text,
    diffMs,
    status,
    isApproaching: status === 'approaching',
    isLive: false,
    isReleased: false,
    days,
    hours,
    minutes,
    seconds
  };
};

export interface EventDayGroup {
  dateKey: string;
  dateLabel: string;
  shortDateLabel: string;
  relativeDay: 'today' | 'tomorrow' | 'yesterday' | 'date';
  relativeLabel: string;
  events: EconomicEvent[];
}

export const groupEventsByLocalDate = (
  events: EconomicEvent[],
  timeZone: string = getDetectedTimezone(),
  lang: string = 'en',
  nowMs: number = Date.now()
): EventDayGroup[] => {
  const groupsMap = new Map<string, EconomicEvent[]>();
  const metaMap = new Map<string, { dateLabel: string; shortDateLabel: string; relativeDay: 'today' | 'tomorrow' | 'yesterday' | 'date'; relativeLabel: string }>();

  // Sort events chronologically by canonical timestamp
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

  for (const evt of sortedEvents) {
    const formatted = formatEventLocalTime(evt.timestamp, lang, timeZone, nowMs);
    const dateKey = formatted.isoLocalDate;

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, []);
      metaMap.set(dateKey, {
        dateLabel: formatted.fullDateStr,
        shortDateLabel: formatted.dateStr,
        relativeDay: formatted.relativeDay,
        relativeLabel: formatted.relativeDayLabel
      });
    }

    groupsMap.get(dateKey)!.push(evt);
  }

  const result: EventDayGroup[] = [];
  for (const [dateKey, groupedEvts] of groupsMap.entries()) {
    const meta = metaMap.get(dateKey)!;
    result.push({
      dateKey,
      dateLabel: meta.dateLabel,
      shortDateLabel: meta.shortDateLabel,
      relativeDay: meta.relativeDay,
      relativeLabel: meta.relativeLabel,
      events: groupedEvts
    });
  }

  // Sort groups by dateKey ascending
  result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return result;
};

export const getImpactBadgeStyle = (impact: EventImpact) => {
  switch (impact) {
    case 'Extreme':
      return {
        bg: 'bg-gradient-to-r from-rose-500/20 to-purple-500/20',
        text: 'text-rose-300',
        border: 'border-rose-500/50 shadow-sm shadow-rose-500/10',
        dot: 'bg-rose-400',
        badgeClass: 'bg-gradient-to-r from-rose-950/80 to-purple-950/80 text-rose-300 border border-rose-500/50 font-black'
      };
    case 'High':
      return {
        bg: 'bg-rose-500/15',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
        dot: 'bg-rose-500',
        badgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
      };
    case 'Medium':
      return {
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/30',
        dot: 'bg-amber-400',
        badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
      };
    case 'Low':
    default:
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-300',
        border: 'border-blue-500/20',
        dot: 'bg-blue-400',
        badgeClass: 'bg-blue-500/10 text-blue-300 border border-blue-500/20 font-medium'
      };
  }
};
