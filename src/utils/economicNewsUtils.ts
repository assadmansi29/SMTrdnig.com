import { EconomicEvent, EventImpact, EventStatus } from '../types';

export interface UserTimezoneInfo {
  timeZone: string;
  abbreviation: string;
  offsetString: string;
  displayName: string;
}

export const getUserTimezoneInfo = (): UserTimezoneInfo => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const now = new Date();
    
    // Formatted timezone short code (e.g. EDT, GMT+3, CEST)
    let abbreviation = '';
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone }).formatToParts(now);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      abbreviation = tzPart ? tzPart.value : '';
    } catch {
      abbreviation = '';
    }

    // Offset in minutes
    const offsetMin = -now.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offsetMin) / 60);
    const mins = Math.abs(offsetMin) % 60;
    const offsetString = `GMT${sign}${hours}${mins ? `:${mins < 10 ? '0' : ''}${mins}` : ''}`;

    const displayName = abbreviation ? `${timeZone} (${abbreviation}, ${offsetString})` : `${timeZone} (${offsetString})`;

    return {
      timeZone,
      abbreviation,
      offsetString,
      displayName
    };
  } catch {
    return {
      timeZone: 'Local',
      abbreviation: 'Local',
      offsetString: 'GMT',
      displayName: 'Local Time'
    };
  }
};

export interface LocalizedEventDateTime {
  timeStr: string;
  dateStr: string;
  fullStr: string;
  relativeDay: 'today' | 'tomorrow' | 'yesterday' | 'date';
}

export const formatEventLocalTime = (
  timestamp: number,
  lang: string = 'en'
): LocalizedEventDateTime => {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if today / tomorrow
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  let relativeDay: 'today' | 'tomorrow' | 'yesterday' | 'date' = 'date';
  if (isSameDay(date, now)) relativeDay = 'today';
  else if (isSameDay(date, tomorrow)) relativeDay = 'tomorrow';
  else if (isSameDay(date, yesterday)) relativeDay = 'yesterday';

  const localeCode = lang === 'ar' ? 'ar-EG' : lang === 'ru' ? 'ru-RU' : lang === 'uk' ? 'uk-UA' : 'en-US';

  const timeStr = date.toLocaleTimeString(localeCode, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: lang === 'en'
  });

  const dateStr = date.toLocaleDateString(localeCode, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return {
    timeStr,
    dateStr,
    fullStr: `${dateStr} • ${timeStr}`,
    relativeDay
  };
};

export const getEventStatus = (event: EconomicEvent, now: number): EventStatus => {
  if (event.statusOverride) return event.statusOverride;

  if (!event.timestamp) {
    return event.actual && event.actual !== '-' ? 'released' : 'upcoming';
  }

  const diff = event.timestamp - now;

  // If ended more than 15 mins ago and actual exists or was completed
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
}

export const getEventCountdown = (event: EconomicEvent, now: number): EventCountdownInfo => {
  const status = getEventStatus(event, now);
  const diffMs = (event.timestamp || now) - now;

  if (status === 'live') {
    return {
      text: 'LIVE NOW',
      diffMs,
      status,
      isApproaching: false,
      isLive: true,
      isReleased: false
    };
  }

  if (status === 'released') {
    return {
      text: 'Released',
      diffMs,
      status,
      isApproaching: false,
      isLive: false,
      isReleased: true
    };
  }

  // Upcoming or Approaching countdown calculation
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let text = '';
  if (days > 0) {
    text = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    text = `${hours}h ${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  } else if (minutes > 0) {
    text = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  } else {
    text = `${seconds}s`;
  }

  return {
    text: status === 'approaching' ? `In ${text}` : `In ${text}`,
    diffMs,
    status,
    isApproaching: status === 'approaching',
    isLive: false,
    isReleased: false
  };
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
