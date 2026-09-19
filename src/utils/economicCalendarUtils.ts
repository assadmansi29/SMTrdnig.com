import { EconomicEvent, EventImpact } from '../types';

export interface TimezoneOption {
  timeZone: string;
  label: string;
  region: string;
  flag: string;
}

export const POPULAR_TIMEZONES: TimezoneOption[] = [
  { timeZone: 'AUTO', label: 'Auto-Detect (Local Device)', region: 'Local', flag: '🌐' },
  { timeZone: 'America/New_York', label: 'New York (EDT / EST)', region: 'United States', flag: '🇺🇸' },
  { timeZone: 'Europe/London', label: 'London (BST / GMT)', region: 'United Kingdom', flag: '🇬🇧' },
  { timeZone: 'Europe/Berlin', label: 'Frankfurt / Berlin (CEST / CET)', region: 'Eurozone', flag: '🇩🇪' },
  { timeZone: 'Asia/Dubai', label: 'Dubai (GST GMT+4)', region: 'Gulf / UAE', flag: '🇦🇪' },
  { timeZone: 'Asia/Riyadh', label: 'Riyadh (AST GMT+3)', region: 'Saudi Arabia', flag: '🇸🇦' },
  { timeZone: 'Asia/Amman', label: 'Amman (GMT+3)', region: 'Jordan', flag: '🇯🇴' },
  { timeZone: 'Asia/Tokyo', label: 'Tokyo (JST GMT+9)', region: 'Japan', flag: '🇯🇵' },
  { timeZone: 'Asia/Singapore', label: 'Singapore / Hong Kong (SGT / HKT)', region: 'Asia-Pacific', flag: '🇸🇬' },
  { timeZone: 'Australia/Sydney', label: 'Sydney (AEST / AEDT)', region: 'Australia', flag: '🇦🇺' },
  { timeZone: 'UTC', label: 'UTC (Universal Coordinated Time)', region: 'Global', flag: '🌐' }
];

/**
 * Returns the browser's automatically detected IANA timezone.
 */
export const getDetectedTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/**
 * Reads user timezone preference from localStorage (defaults to AUTO).
 */
export const getStoredTimezonePreference = (): string => {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('smtrading_calendar_tz');
      if (stored) return stored;
    }
  } catch {
    // Ignore storage restrictions
  }
  return 'AUTO';
};

/**
 * Saves user timezone preference in localStorage.
 */
export const setStoredTimezonePreference = (tz: string): void => {
  try {
    if (typeof window !== 'undefined') {
      if (tz === 'AUTO') {
        localStorage.removeItem('smtrading_calendar_tz');
      } else {
        localStorage.setItem('smtrading_calendar_tz', tz);
      }
    }
  } catch {
    // Ignore storage restrictions
  }
};

/**
 * Resolves active effective timezone: if user selected AUTO or nothing, uses detected timezone.
 */
export const resolveEffectiveTimezone = (preferredTz?: string): string => {
  if (!preferredTz || preferredTz === 'AUTO') {
    return getDetectedTimezone();
  }
  return preferredTz;
};

/**
 * Returns detailed timezone meta info (abbreviation, offset string, display name)
 * with full Daylight Saving Time (DST) support.
 */
export const getTimezoneMeta = (timeZone: string, atDate: Date = new Date()) => {
  let abbreviation = '';
  let offsetString = '';

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short'
    }).formatToParts(atDate);
    abbreviation = parts.find(p => p.type === 'timeZoneName')?.value || '';
  } catch {
    abbreviation = '';
  }

  try {
    const partsOffset = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset'
    }).formatToParts(atDate);
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

  return {
    timeZone,
    abbreviation,
    offsetString,
    display: `${timeZone.replace('_', ' ')} (${offsetString}${abbreviation && abbreviation !== offsetString ? ` • ${abbreviation}` : ''})`
  };
};

/**
 * Formats event date and time into the user's specified local timezone.
 * Supported by native browser Intl with full DST awareness.
 */
export const formatEventInTimezone = (timestamp: number, timeZone: string, locale: string = 'en-US') => {
  const dateObj = new Date(timestamp);
  if (isNaN(dateObj.getTime())) {
    return {
      dateFormatted: '—',
      timeFormatted: '—',
      fullFormatted: '—',
      dayOfWeek: '—',
      isToday: false,
      isTomorrow: false
    };
  }

  try {
    // Local date formatter
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    // Local time formatter (e.g., 08:30 AM)
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // 24-hour time formatter for institutional clarity
    const time24Formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const dayFormatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: 'long'
    });

    // Determine today / tomorrow in the target timezone
    const nowTargetDateStr = new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
    const eventTargetDateStr = new Intl.DateTimeFormat('en-CA', { timeZone }).format(dateObj);

    const isToday = nowTargetDateStr === eventTargetDateStr;

    // Check tomorrow in target timezone
    const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrowTargetDateStr = new Intl.DateTimeFormat('en-CA', { timeZone }).format(tomorrowDate);
    const isTomorrow = tomorrowTargetDateStr === eventTargetDateStr;

    const dateFormatted = dateFormatter.format(dateObj);
    const timeFormatted = timeFormatter.format(dateObj);
    const time24Formatted = time24Formatter.format(dateObj);
    const dayOfWeek = dayFormatter.format(dateObj);

    return {
      dateFormatted,
      timeFormatted,
      time24Formatted,
      fullFormatted: `${dateFormatted} • ${timeFormatted}`,
      dayOfWeek,
      isToday,
      isTomorrow,
      isoDateLocal: eventTargetDateStr
    };
  } catch (err) {
    // Fallback if unexpected timezone string
    return {
      dateFormatted: dateObj.toLocaleDateString(),
      timeFormatted: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      time24Formatted: dateObj.toTimeString().substring(0, 5),
      fullFormatted: dateObj.toLocaleString(),
      dayOfWeek: '',
      isToday: false,
      isTomorrow: false,
      isoDateLocal: dateObj.toISOString().split('T')[0]
    };
  }
};

export interface LiveCountdown {
  isPassed: boolean;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  badgeClass: string;
  isUrgent: boolean; // < 15 minutes
  isApproaching: boolean; // < 2 hours
}

/**
 * Calculates accurate live countdown from target event timestamp and current real-time.
 * Returns isPassed: true when the event has occurred.
 */
export const calculateLiveCountdown = (eventTimestamp: number, currentNow: number): LiveCountdown => {
  const diffMs = eventTimestamp - currentNow;

  if (diffMs <= 0) {
    return {
      isPassed: true,
      totalSeconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '00:00:00',
      badgeClass: 'text-slate-400 bg-slate-800/80 border-slate-700',
      isUrgent: false,
      isApproaching: false
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isUrgent = totalSeconds < 900; // < 15 mins
  const isApproaching = totalSeconds < 7200; // < 2 hours

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  } else if (hours > 0) {
    formatted = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  } else {
    formatted = `${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  let badgeClass = 'text-slate-300 bg-slate-800/80 border-slate-700';
  if (isUrgent) {
    badgeClass = 'text-rose-400 bg-rose-500/15 border-rose-500/40 animate-pulse';
  } else if (isApproaching) {
    badgeClass = 'text-amber-400 bg-amber-500/15 border-amber-500/40';
  }

  return {
    isPassed: false,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    formatted,
    badgeClass,
    isUrgent,
    isApproaching
  };
};

/**
 * Distinguishes High, Medium, Low impact cleanly.
 * Extreme & High tier are marked as High-Impact for critical macroeconomic tracking.
 */
export const normalizeImpact = (impact: string, eventName?: string): 'High' | 'Medium' | 'Low' => {
  const imp = (impact || '').toLowerCase().trim();
  const name = (eventName || '').toLowerCase();

  const isTier1Name =
    name.includes('cpi') ||
    name.includes('consumer price') ||
    name.includes('non-farm') ||
    name.includes('nonfarm') ||
    name.includes('interest rate') ||
    name.includes('rate decision') ||
    name.includes('fomc') ||
    name.includes('gdp') ||
    name.includes('unemployment rate') ||
    name.includes('pce');

  if (imp === 'extreme' || imp === 'high' || isTier1Name) {
    return 'High';
  }
  if (imp === 'medium' || imp === 'moderate') {
    return 'Medium';
  }
  return 'Low';
};

export const getImpactStyle = (impact: 'High' | 'Medium' | 'Low' | EventImpact) => {
  const norm = normalizeImpact(impact);
  switch (norm) {
    case 'High':
      return {
        label: 'High Impact',
        badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
        dot: 'bg-rose-500',
        indicator: 'text-rose-400',
        ring: 'ring-rose-500/30'
      };
    case 'Medium':
      return {
        label: 'Medium Impact',
        badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        dot: 'bg-amber-400',
        indicator: 'text-amber-400',
        ring: 'ring-amber-500/30'
      };
    case 'Low':
    default:
      return {
        label: 'Low Impact',
        badge: 'bg-slate-800 text-slate-400 border border-slate-700',
        dot: 'bg-slate-500',
        indicator: 'text-slate-400',
        ring: 'ring-slate-700'
      };
  }
};

/**
 * Resolves country flags & flags for currency
 */
export const getCurrencyFlag = (currency?: string, countryCode?: string): string => {
  const cur = (currency || '').toUpperCase();
  const code = (countryCode || '').toUpperCase();

  if (cur === 'USD' || code === 'US') return '🇺🇸';
  if (cur === 'EUR' || code === 'EU' || code === 'DE' || code === 'FR' || code === 'IT' || code === 'ES') return '🇪🇺';
  if (cur === 'GBP' || code === 'GB' || code === 'UK') return '🇬🇧';
  if (cur === 'JPY' || code === 'JP') return '🇯🇵';
  if (cur === 'CAD' || code === 'CA') return '🇨🇦';
  if (cur === 'AUD' || code === 'AU') return '🇦🇺';
  if (cur === 'CHF' || code === 'CH') return '🇨🇭';
  if (cur === 'NZD' || code === 'NZ') return '🇳🇿';
  if (cur === 'CNY' || code === 'CN') return '🇨🇳';
  return '🌐';
};

/**
 * Pure filter of genuinely upcoming events.
 * Strictest guarantee: event.timestamp MUST be greater than currentNow.
 * Eliminates all past, expired, or stale events.
 */
export const filterGenuinelyUpcomingEvents = (
  events: EconomicEvent[],
  currentNow: number,
  impactFilter: 'All' | 'High' | 'Medium' | 'Low' = 'All'
): EconomicEvent[] => {
  if (!Array.isArray(events)) return [];

  const seen = new Set<string>();
  const upcoming: EconomicEvent[] = [];

  for (const ev of events) {
    if (!ev || typeof ev.timestamp !== 'number' || isNaN(ev.timestamp)) continue;

    // Strict future check: must be strictly > currentNow
    if (ev.timestamp <= currentNow) continue;

    // Deduplicate by unique event signature
    const sig = ev.id || `${ev.country}_${ev.currency}_${ev.event}_${ev.timestamp}`;
    if (seen.has(sig)) continue;
    seen.add(sig);

    // Apply impact filter if requested
    if (impactFilter !== 'All') {
      const norm = normalizeImpact(ev.impact, ev.event);
      if (norm !== impactFilter) continue;
    }

    upcoming.push(ev);
  }

  // Sort ascending by earliest upcoming timestamp
  return upcoming.sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Pure filter of past/released events.
 * Guaranteed: event.timestamp <= currentNow.
 */
export const filterPastReleasedEvents = (
  events: EconomicEvent[],
  currentNow: number,
  impactFilter: 'All' | 'High' | 'Medium' | 'Low' = 'All'
): EconomicEvent[] => {
  if (!Array.isArray(events)) return [];

  const seen = new Set<string>();
  const past: EconomicEvent[] = [];

  for (const ev of events) {
    if (!ev || typeof ev.timestamp !== 'number' || isNaN(ev.timestamp)) continue;

    // Must be in the past or released
    const hasActual = Boolean(ev.actual && ev.actual !== '—' && ev.actual !== '-');
    if (ev.timestamp > currentNow && !hasActual) continue;

    const sig = ev.id || `${ev.country}_${ev.currency}_${ev.event}_${ev.timestamp}`;
    if (seen.has(sig)) continue;
    seen.add(sig);

    if (impactFilter !== 'All') {
      const norm = normalizeImpact(ev.impact, ev.event);
      if (norm !== impactFilter) continue;
    }

    past.push(ev);
  }

  // Sort descending by most recent past timestamp
  return past.sort((a, b) => b.timestamp - a.timestamp);
};
