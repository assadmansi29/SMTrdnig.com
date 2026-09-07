/**
 * Institutional Market Trading Schedule & Real-Time Status Engine
 * Handles accurate multi-asset trading hours, timezones (New York, Frankfurt, UTC),
 * daily maintenance breaks, weekend closures, and holiday schedules.
 */

export type MarketType = 'crypto' | 'metals' | 'forex' | 'index_cfd' | 'us_equity' | 'eu_index' | 'energy';

export interface MarketMetadata {
  type: MarketType;
  categoryName: string;
  exchangeName: string;
  timeZone: string;
  timeZoneLabel: string;
  regularHoursSummary: string;
  dailyBreakSummary?: string;
  is24x7: boolean;
}

export interface MarketStatusResult {
  symbol: string;
  marketType: MarketType;
  metadata: MarketMetadata;
  isOpen: boolean;
  statusLabel: 'OPEN' | 'CLOSED' | 'CLOSING SOON' | 'OPENING SOON';
  countdownText: string;
  nextEventDescription: string;
  nextEventTimestamp?: number;
  localTimeFormatted: string;
  isHoliday: boolean;
  holidayName?: string;
  secondsToNextEvent: number;
}

interface WeeklySession {
  open: number; // minute of week (0 to 10080, Sunday 00:00 = 0)
  close: number;
  name: string;
  isWeekendClose?: boolean;
  nextSessionOpen?: number;
}

const WEEK_MINUTES = 7 * 24 * 60; // 10080 minutes

// Easter calculation algorithm (Meeus/Jones/Butcher)
function getEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function getNthWeekdayOfMonth(year: number, month: number, targetWeekday: number, n: number): number {
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const cur = new Date(Date.UTC(year, month - 1, d));
    if (cur.getUTCMonth() !== month - 1) break;
    if (cur.getUTCDay() === targetWeekday) {
      count++;
      if (count === n) return d;
    }
  }
  return 1;
}

function getLastWeekdayOfMonth(year: number, month: number, targetWeekday: number): number {
  let last = 1;
  for (let d = 1; d <= 31; d++) {
    const cur = new Date(Date.UTC(year, month - 1, d));
    if (cur.getUTCMonth() !== month - 1) break;
    if (cur.getUTCDay() === targetWeekday) {
      last = d;
    }
  }
  return last;
}

/**
 * Check if the given date in target timezone is a US market holiday
 */
export function checkUsHoliday(year: number, month: number, day: number): { isHoliday: boolean; name: string; earlyCloseHour?: number } | null {
  // 1. New Year's Day (Jan 1)
  if (month === 1 && day === 1) return { isHoliday: true, name: "New Year's Day" };

  // 2. Martin Luther King Jr. Day (3rd Monday of Jan)
  if (month === 1 && day === getNthWeekdayOfMonth(year, 1, 1, 3)) {
    return { isHoliday: true, name: 'MLK Jr. Day', earlyCloseHour: 13 };
  }

  // 3. Presidents' Day / Washington's Birthday (3rd Monday of Feb)
  if (month === 2 && day === getNthWeekdayOfMonth(year, 2, 1, 3)) {
    return { isHoliday: true, name: "Presidents' Day", earlyCloseHour: 13 };
  }

  // 4. Good Friday (Friday before Easter)
  const easter = getEasterSunday(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));
  const goodFriday = new Date(easterDate.getTime() - 2 * 86400000);
  if (month === goodFriday.getUTCMonth() + 1 && day === goodFriday.getUTCDate()) {
    return { isHoliday: true, name: 'Good Friday' };
  }

  // 5. Memorial Day (Last Monday of May)
  if (month === 5 && day === getLastWeekdayOfMonth(year, 5, 1)) {
    return { isHoliday: true, name: 'Memorial Day', earlyCloseHour: 13 };
  }

  // 6. Juneteenth (June 19)
  if (month === 6 && day === 19) {
    return { isHoliday: true, name: 'Juneteenth National Day', earlyCloseHour: 13 };
  }

  // 7. US Independence Day (July 4)
  if (month === 7 && day === 4) {
    return { isHoliday: true, name: 'Independence Day', earlyCloseHour: 13 };
  }

  // 8. Labor Day (1st Monday of September)
  if (month === 9 && day === getNthWeekdayOfMonth(year, 9, 1, 1)) {
    return { isHoliday: true, name: 'Labor Day', earlyCloseHour: 13 };
  }

  // 9. Thanksgiving Day (4th Thursday of November)
  if (month === 11 && day === getNthWeekdayOfMonth(year, 11, 4, 4)) {
    return { isHoliday: true, name: 'Thanksgiving Day', earlyCloseHour: 13 };
  }

  // 10. Christmas Day (Dec 25)
  if (month === 12 && day === 25) {
    return { isHoliday: true, name: 'Christmas Day' };
  }

  return null;
}

/**
 * Resolve market categorization and metadata by symbol
 */
export function getMarketMetadata(symbol: string): MarketMetadata {
  const sym = (symbol || '').toUpperCase().trim();

  // 1. Crypto
  if (
    sym.includes('BTC') ||
    sym.includes('ETH') ||
    sym.includes('SOL') ||
    sym.includes('XRP') ||
    sym.includes('DOGE') ||
    sym.includes('BNB') ||
    sym.startsWith('BINANCE:') ||
    sym.startsWith('COINBASE:') ||
    sym.startsWith('BYBIT:')
  ) {
    return {
      type: 'crypto',
      categoryName: 'Cryptocurrency',
      exchangeName: 'Binance / Global Crypto',
      timeZone: 'UTC',
      timeZoneLabel: 'UTC',
      regularHoursSummary: '24 hours / 7 days a week (continuous)',
      is24x7: true,
    };
  }

  // 2. Gold & Precious Metals
  if (
    sym.includes('XAU') ||
    sym.includes('GOLD') ||
    sym.includes('XAG') ||
    sym.includes('SILVER') ||
    sym.includes('PLATINUM')
  ) {
    return {
      type: 'metals',
      categoryName: 'Spot Precious Metals',
      exchangeName: 'CME / OTC Loco London',
      timeZone: 'America/New_York',
      timeZoneLabel: 'New York (EDT/EST)',
      regularHoursSummary: 'Sun 18:00 – Fri 17:00 NY',
      dailyBreakSummary: 'Daily Maintenance Break: 17:00 – 18:00 NY (Mon–Thu)',
      is24x7: false,
    };
  }

  // 3. Energy / Crude Oil
  if (sym.includes('OIL') || sym.includes('BRENT') || sym.includes('WTI') || sym.includes('WTICO')) {
    return {
      type: 'energy',
      categoryName: 'Energy & Commodities',
      exchangeName: 'NYMEX / CME Globex',
      timeZone: 'America/New_York',
      timeZoneLabel: 'New York (EDT/EST)',
      regularHoursSummary: 'Sun 18:00 – Fri 17:00 NY',
      dailyBreakSummary: 'Daily Break: 17:00 – 18:00 NY',
      is24x7: false,
    };
  }

  // 4. US Index Futures & CFDs
  if (
    sym.includes('NAS100') ||
    sym.includes('US30') ||
    sym.includes('SPX500') ||
    sym.includes('NQ') ||
    sym.includes('ES') ||
    sym.includes('YM') ||
    sym.includes('DXY')
  ) {
    return {
      type: 'index_cfd',
      categoryName: 'Index Futures & CFD',
      exchangeName: 'CME Globex / CBOE',
      timeZone: 'America/New_York',
      timeZoneLabel: 'New York (EDT/EST)',
      regularHoursSummary: 'Sun 18:00 – Fri 17:00 NY',
      dailyBreakSummary: 'Daily Maintenance Break: 17:00 – 18:00 NY (Mon–Thu)',
      is24x7: false,
    };
  }

  // 5. European Indices (DAX / GER40)
  if (sym.includes('GER40') || sym.includes('DE30') || sym.includes('DAX')) {
    return {
      type: 'eu_index',
      categoryName: 'European Equity Index',
      exchangeName: 'Eurex / Frankfurt (Xetra)',
      timeZone: 'Europe/Berlin',
      timeZoneLabel: 'Frankfurt (CET/CEST)',
      regularHoursSummary: 'Mon–Fri 01:15 – 22:00 CET (CFD)',
      dailyBreakSummary: 'Weekend Closure: Fri 22:00 – Mon 01:15 CET',
      is24x7: false,
    };
  }

  // 6. Forex (Currencies)
  if (
    sym.includes('EUR') ||
    sym.includes('GBP') ||
    sym.includes('JPY') ||
    sym.includes('AUD') ||
    sym.includes('CAD') ||
    sym.includes('CHF') ||
    sym.includes('NZD') ||
    sym.startsWith('FX:')
  ) {
    return {
      type: 'forex',
      categoryName: 'Foreign Exchange (FX)',
      exchangeName: 'Interbank OTC',
      timeZone: 'America/New_York',
      timeZoneLabel: 'New York (EDT/EST)',
      regularHoursSummary: 'Sun 17:00 – Fri 17:00 NY (continuous 24/5)',
      dailyBreakSummary: 'Continuous 24h trading Monday through Friday',
      is24x7: false,
    };
  }

  // 7. Default to US Equities (Stocks)
  return {
    type: 'us_equity',
    categoryName: 'US Equities',
    exchangeName: 'NYSE / NASDAQ',
    timeZone: 'America/New_York',
    timeZoneLabel: 'New York (EDT/EST)',
    regularHoursSummary: 'Mon–Fri 09:30 – 16:00 NY (Regular Trading Hours)',
    dailyBreakSummary: 'Closed Evenings, Weekends & Federal Holidays',
    is24x7: false,
  };
}

/**
 * Build weekly session time blocks in minute-of-week coordinates (0 = Sun 00:00, 10080 = end of week)
 */
function getWeeklySessions(marketType: MarketType): WeeklySession[] {
  switch (marketType) {
    case 'metals':
    case 'energy':
    case 'index_cfd': {
      // CME Globex Schedule:
      // Opens Sunday 18:00 NY.
      // Runs daily until 17:00 NY with 1-hour maintenance break 17:00–18:00 NY.
      // Closes Friday 17:00 NY for the weekend.
      return [
        { open: 0 * 1440 + 18 * 60, close: 1 * 1440 + 17 * 60, name: 'Sun-Mon Session' },
        { open: 1 * 1440 + 18 * 60, close: 2 * 1440 + 17 * 60, name: 'Mon-Tue Session' },
        { open: 2 * 1440 + 18 * 60, close: 3 * 1440 + 17 * 60, name: 'Tue-Wed Session' },
        { open: 3 * 1440 + 18 * 60, close: 4 * 1440 + 17 * 60, name: 'Wed-Thu Session' },
        { open: 4 * 1440 + 18 * 60, close: 5 * 1440 + 17 * 60, name: 'Thu-Fri Session', isWeekendClose: true },
      ];
    }
    case 'forex': {
      // Forex 24/5: Opens Sunday 17:00 NY, Closes Friday 17:00 NY without daily breaks
      return [
        { open: 0 * 1440 + 17 * 60, close: 5 * 1440 + 17 * 60, name: '24/5 Forex Session', isWeekendClose: true },
      ];
    }
    case 'us_equity': {
      // US Stocks: Mon-Fri 09:30 to 16:00 NY
      return [
        { open: 1 * 1440 + 9 * 60 + 30, close: 1 * 1440 + 16 * 60, name: 'Monday Session' },
        { open: 2 * 1440 + 9 * 60 + 30, close: 2 * 1440 + 16 * 60, name: 'Tuesday Session' },
        { open: 3 * 1440 + 9 * 60 + 30, close: 3 * 1440 + 16 * 60, name: 'Wednesday Session' },
        { open: 4 * 1440 + 9 * 60 + 30, close: 4 * 1440 + 16 * 60, name: 'Thursday Session' },
        { open: 5 * 1440 + 9 * 60 + 30, close: 5 * 1440 + 16 * 60, name: 'Friday Session', isWeekendClose: true },
      ];
    }
    case 'eu_index': {
      // European Index (DE30/GER40): Mon-Fri 01:15 to 22:00 CET
      return [
        { open: 1 * 1440 + 1 * 60 + 15, close: 1 * 1440 + 22 * 60, name: 'Monday Session' },
        { open: 2 * 1440 + 1 * 60 + 15, close: 2 * 1440 + 22 * 60, name: 'Tuesday Session' },
        { open: 3 * 1440 + 1 * 60 + 15, close: 3 * 1440 + 22 * 60, name: 'Wednesday Session' },
        { open: 4 * 1440 + 1 * 60 + 15, close: 4 * 1440 + 22 * 60, name: 'Thursday Session' },
        { open: 5 * 1440 + 1 * 60 + 15, close: 5 * 1440 + 22 * 60, name: 'Friday Session', isWeekendClose: true },
      ];
    }
    case 'crypto':
    default:
      return [];
  }
}

/**
 * Format duration into clean, institutional display:
 * - "< 60 min": "25 min" or "18 min"
 * - ">= 60 min and < 24h": "1h 41m"
 * - ">= 24h": "1d 6h"
 */
export function formatTimeRemaining(totalSeconds: number, fullWordMinute = false): string {
  if (totalSeconds <= 0) return '0 min';

  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days >= 1) {
    return `${days}d ${remainingHours}h`;
  }

  if (hours >= 1) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  const minLabel = fullWordMinute ? 'min' : 'min';
  return `${Math.max(1, minutes)} ${minLabel}`;
}

/**
 * Get comprehensive, real-time market status for any symbol
 */
export function getMarketScheduleStatus(symbol: string, currentDate: Date = new Date()): MarketStatusResult {
  const metadata = getMarketMetadata(symbol);

  // 1. Crypto is always open 24/7/365
  if (metadata.is24x7) {
    const localTime = currentDate.toLocaleTimeString('en-US', {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return {
      symbol,
      marketType: metadata.type,
      metadata,
      isOpen: true,
      statusLabel: 'OPEN',
      countdownText: '24/7',
      nextEventDescription: 'Trades continuously 24/7 without session closures',
      localTimeFormatted: `${localTime} UTC`,
      isHoliday: false,
      secondsToNextEvent: 0,
    };
  }

  // Deconstruct local time in the market's specific exchange timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: metadata.timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    timeZoneName: 'short',
    hour12: false,
  }).formatToParts(currentDate);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const weekday = weekdayMap[getPart('weekday')] ?? 1;
  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);
  const tzShort = getPart('timeZoneName') || (metadata.timeZone === 'UTC' ? 'UTC' : 'NY');

  const localTimeFormatted = `${getPart('weekday')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(
    2,
    '0'
  )}:${String(second).padStart(2, '0')} ${tzShort}`;

  // Check US Holidays for US equities and CME markets
  const holiday = metadata.timeZone === 'America/New_York' ? checkUsHoliday(year, month, day) : null;

  // If US Equities on a holiday, market is closed for the day
  if (metadata.type === 'us_equity' && holiday) {
    return {
      symbol,
      marketType: metadata.type,
      metadata,
      isOpen: false,
      statusLabel: 'CLOSED',
      countdownText: `Holiday (${holiday.name})`,
      nextEventDescription: `Closed for ${holiday.name}. Reopens next business day 09:30 NY`,
      localTimeFormatted,
      isHoliday: true,
      holidayName: holiday.name,
      secondsToNextEvent: 86400,
    };
  }

  // Evaluate weekly session intervals
  const minuteOfWeek = weekday * 1440 + hour * 60 + minute;
  const sessions = getWeeklySessions(metadata.type);

  // Check if currently inside an open session
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];

    // Handle early close on holidays for CME products
    let closeMinute = s.close;
    if (holiday?.earlyCloseHour && (metadata.type === 'metals' || metadata.type === 'index_cfd' || metadata.type === 'energy')) {
      const holidayCloseMin = weekday * 1440 + holiday.earlyCloseHour * 60;
      if (closeMinute > holidayCloseMin && minuteOfWeek < holidayCloseMin) {
        closeMinute = holidayCloseMin;
      }
    }

    if (minuteOfWeek >= s.open && minuteOfWeek < closeMinute) {
      const minutesRemaining = closeMinute - minuteOfWeek - 1;
      const secondsRemaining = 60 - second;
      const totalSec = Math.max(0, minutesRemaining * 60 + secondsRemaining);

      const isClosingSoon = totalSec <= 45 * 60; // 45 minutes or less until close
      const isWeekend = s.isWeekendClose;

      const countdownText = isClosingSoon
        ? `Closes in ${formatTimeRemaining(totalSec, true)}`
        : `Closes in ${formatTimeRemaining(totalSec)}`;

      const nextEventDescription = isWeekend
        ? `Weekend Market Close (Reopens Sunday)`
        : metadata.type === 'metals' || metadata.type === 'index_cfd' || metadata.type === 'energy'
        ? `Daily 1-Hour Maintenance Break at 17:00 NY`
        : `Session Closes at scheduled time`;

      return {
        symbol,
        marketType: metadata.type,
        metadata,
        isOpen: true,
        statusLabel: isClosingSoon ? 'CLOSING SOON' : 'OPEN',
        countdownText,
        nextEventDescription,
        nextEventTimestamp: Date.now() + totalSec * 1000,
        localTimeFormatted,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
        secondsToNextEvent: totalSec,
      };
    }
  }

  // If not open, the market is currently CLOSED. Calculate exact countdown until next open.
  let nextSession: WeeklySession | null = null;
  let minDiffMinutes = Infinity;

  for (const s of sessions) {
    let diff = s.open - minuteOfWeek;
    if (diff <= 0) {
      diff += WEEK_MINUTES; // Wraps into next calendar week
    }
    if (diff < minDiffMinutes) {
      minDiffMinutes = diff;
      nextSession = s;
    }
  }

  const minutesUntilOpen = minDiffMinutes - 1;
  const secondsRemaining = 60 - second;
  const totalSecUntilOpen = Math.max(0, minutesUntilOpen * 60 + secondsRemaining);

  const isOpeningSoon = totalSecUntilOpen <= 45 * 60; // 45 minutes or less until opening

  let countdownText = '';
  if (isOpeningSoon) {
    countdownText = `Opens in ${formatTimeRemaining(totalSecUntilOpen, true)}`;
  } else if (totalSecUntilOpen < 24 * 3600) {
    countdownText = `Opens in ${formatTimeRemaining(totalSecUntilOpen)}`;
  } else {
    // Weekend closure: e.g. Opens Sun 18:00 NY
    const openDayName = metadata.type === 'metals' || metadata.type === 'index_cfd' || metadata.type === 'forex' ? 'Sun' : 'Mon';
    const openHour = metadata.type === 'forex' ? '17:00' : metadata.type === 'metals' || metadata.type === 'index_cfd' ? '18:00' : '09:30';
    countdownText = `Opens ${openDayName} ${openHour} (${formatTimeRemaining(totalSecUntilOpen)})`;
  }

  const isDailyBreak =
    (metadata.type === 'metals' || metadata.type === 'index_cfd' || metadata.type === 'energy') &&
    weekday >= 1 &&
    weekday <= 4 &&
    hour === 17;

  const nextEventDescription = isDailyBreak
    ? 'Daily 17:00–18:00 NY Maintenance Break. Trading resumes at 18:00 NY.'
    : weekday === 5 || weekday === 6 || (weekday === 0 && hour < 17)
    ? 'Weekend Market Closure. All order execution resumes at Sunday market open.'
    : `Market Closed. Reopens at next scheduled session.`;

  return {
    symbol,
    marketType: metadata.type,
    metadata,
    isOpen: false,
    statusLabel: isOpeningSoon ? 'OPENING SOON' : 'CLOSED',
    countdownText,
    nextEventDescription,
    nextEventTimestamp: Date.now() + totalSecUntilOpen * 1000,
    localTimeFormatted,
    isHoliday: !!holiday,
    holidayName: holiday?.name,
    secondsToNextEvent: totalSecUntilOpen,
  };
}
