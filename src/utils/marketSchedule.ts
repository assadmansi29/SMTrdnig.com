/**
 * Institutional Real-Time Market Trading Schedule & Real-Time Status Engine
 * Handles accurate multi-asset trading hours, timezones (New York, London, Tokyo, Frankfurt, UTC),
 * daily maintenance breaks, weekend closures, and holiday schedules using real epoch timestamps.
 */

export type MarketType = 'us_equity' | 'metals' | 'forex' | 'index_cfd' | 'crypto' | 'eu_index' | 'energy';

export type BenchmarkMarketId = 'us_core' | 'cme_futures' | 'forex_24_5' | 'london_session' | 'tokyo_session' | 'crypto_24_7';

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

export type DynamicMarketStatus = 'MARKET OPEN' | 'MARKET CLOSED' | 'MARKET WILL OPEN SOON' | 'MARKET WILL CLOSE SOON';

export interface MarketStatusResult {
  symbol?: string;
  marketType: MarketType;
  metadata: MarketMetadata;
  isOpen: boolean;
  /** Exact four dynamic status values required by specification */
  status: DynamicMarketStatus;
  /** Backward compatibility with statusLabel */
  statusLabel: 'OPEN' | 'CLOSED' | 'CLOSING SOON' | 'OPENING SOON';
  /** Primary display text (e.g. "MARKET OPEN", "MARKET WILL CLOSE SOON (25 min)", "MARKET WILL OPEN SOON (18 min)") */
  displayText: string;
  /** Short countdown badge text */
  countdownText: string;
  /** Detailed countdown string */
  countdownDetail: string;
  minutesRemaining: number;
  secondsToNextEvent: number;
  nextEventDescription: string;
  nextEventTimestamp?: number;
  localTimeFormatted: string;
  activeSessionName: string;
  isHoliday: boolean;
  holidayName?: string;
  timeZone: string;
  timeZoneLabel: string;
  userTimeZone: string;
}

export interface SessionInterval {
  openTime: number; // UTC ms
  closeTime: number; // UTC ms
  sessionName: string;
  isDailyBreak?: boolean;
  isHoliday?: boolean;
  holidayName?: string;
}

/**
 * Automatically detect user's local timezone from browser/device using IANA timeZone method.
 */
export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

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
    return { isHoliday: true, name: 'Martin Luther King Jr. Day' };
  }

  // 3. Presidents' Day / Washington's Birthday (3rd Monday of Feb)
  if (month === 2 && day === getNthWeekdayOfMonth(year, 2, 1, 3)) {
    return { isHoliday: true, name: "Presidents' Day" };
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
    return { isHoliday: true, name: 'Memorial Day' };
  }

  // 6. Juneteenth (June 19)
  if (month === 6 && day === 19) {
    return { isHoliday: true, name: 'Juneteenth National Day' };
  }

  // 7. US Independence Day (July 4)
  if (month === 7 && day === 4) {
    return { isHoliday: true, name: 'Independence Day' };
  }

  // 8. Labor Day (1st Monday of September)
  if (month === 9 && day === getNthWeekdayOfMonth(year, 9, 1, 1)) {
    return { isHoliday: true, name: 'Labor Day' };
  }

  // 9. Thanksgiving Day (4th Thursday of November)
  if (month === 11 && day === getNthWeekdayOfMonth(year, 11, 4, 4)) {
    return { isHoliday: true, name: 'Thanksgiving Day' };
  }

  // 10. Christmas Day (Dec 25)
  if (month === 12 && day === 25) {
    return { isHoliday: true, name: 'Christmas Day' };
  }

  return null;
}

/**
 * Convert local date components in a given IANA timezone into an exact UTC millisecond timestamp,
 * seamlessly handling Daylight Saving Time (DST) transitions.
 */
export function makeZonedTimestamp(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): number {
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const getOffsetMs = (date: Date) => {
    const parts = fmt.formatToParts(date);
    const p = (type: string) => parseInt(parts.find(x => x.type === type)?.value || '0', 10);
    const asLocalUtc = Date.UTC(p('year'), p('month') - 1, p('day'), p('hour'), p('minute'), p('second'));
    return asLocalUtc - date.getTime();
  };

  const initialOffset = getOffsetMs(new Date(guessUtc));
  let finalUtc = guessUtc - initialOffset;
  const refinedOffset = getOffsetMs(new Date(finalUtc));
  if (refinedOffset !== initialOffset) {
    finalUtc = guessUtc - refinedOffset;
  }
  return finalUtc;
}

/**
 * Format duration into clean display
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
 * Resolve market metadata for benchmark identifiers or instrument symbols
 */
export function getMarketMetadata(symbolOrBenchmark: string): MarketMetadata {
  const sym = (symbolOrBenchmark || '').toUpperCase().trim();

  // 1. Crypto
  if (
    sym === 'CRYPTO' ||
    sym === 'CRYPTO_24_7' ||
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

  // 2. Metals & Commodities (CME Globex)
  if (
    sym === 'CME_FUTURES' ||
    sym.includes('XAU') ||
    sym.includes('GOLD') ||
    sym.includes('XAG') ||
    sym.includes('SILVER') ||
    sym.includes('PLATINUM') ||
    sym.includes('OIL') ||
    sym.includes('BRENT') ||
    sym.includes('WTI')
  ) {
    return {
      type: 'metals',
      categoryName: 'Spot Metals & Commodities',
      exchangeName: 'CME Globex / NYMEX',
      timeZone: 'America/New_York',
      timeZoneLabel: 'New York (EDT/EST)',
      regularHoursSummary: 'Sun 18:00 – Fri 17:00 NY',
      dailyBreakSummary: 'Daily Maintenance Break: 17:00 – 18:00 NY (Mon–Thu)',
      is24x7: false,
    };
  }

  // 3. US Index CFDs & Futures (Nasdaq 100, Dow Jones 30, S&P 500)
  if (
    sym.includes('NAS100') ||
    sym.includes('US30') ||
    sym.includes('US3O') ||
    sym.includes('SPX500') ||
    sym.includes('ES1!') ||
    sym.includes('NQ1!') ||
    sym.includes('NASDAQ') ||
    sym.includes('DOW')
  ) {
    return {
      type: 'index_cfd',
      categoryName: 'US Index Futures & CFDs',
      exchangeName: 'CME Globex / BlackBull Markets',
      timeZone: 'America/New_York',
      timeZoneLabel: 'New York (EDT/EST)',
      regularHoursSummary: 'Sun 18:00 – Fri 17:00 NY',
      dailyBreakSummary: 'Daily Maintenance Break: 17:00 – 18:00 NY (Mon–Thu)',
      is24x7: false,
    };
  }

  // 4. European Market / Indices
  if (
    sym === 'LONDON_SESSION' ||
    sym.includes('GER40') ||
    sym.includes('DE30') ||
    sym.includes('DAX') ||
    sym.includes('UK100') ||
    sym.includes('FTSE')
  ) {
    return {
      type: 'eu_index',
      categoryName: 'European Markets',
      exchangeName: 'London LSE / Eurex Frankfurt',
      timeZone: 'Europe/London',
      timeZoneLabel: 'London (GMT/BST)',
      regularHoursSummary: 'Mon–Fri 08:00 – 16:30 London',
      dailyBreakSummary: 'Closed Evenings & Weekends',
      is24x7: false,
    };
  }

  // 4. Asian / Tokyo Market
  if (sym === 'TOKYO_SESSION' || sym.includes('NIKKEI') || sym.includes('JP225') || sym.includes('TSE')) {
    return {
      type: 'us_equity',
      categoryName: 'Tokyo Asian Session',
      exchangeName: 'Tokyo Stock Exchange (TSE)',
      timeZone: 'Asia/Tokyo',
      timeZoneLabel: 'Tokyo (JST)',
      regularHoursSummary: 'Mon–Fri 09:00 – 15:00 JST',
      dailyBreakSummary: 'Closed Evenings & Weekends',
      is24x7: false,
    };
  }

  // 5. Forex 24/5
  if (
    sym === 'FOREX_24_5' ||
    sym === 'FOREX' ||
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
      exchangeName: 'Interbank OTC Global',
      timeZone: 'America/New_York',
      timeZoneLabel: 'New York (EDT/EST)',
      regularHoursSummary: 'Sun 17:00 – Fri 17:00 NY (24/5)',
      dailyBreakSummary: 'Continuous 24h trading Monday through Friday',
      is24x7: false,
    };
  }

  // 6. Default: Global Financial Market / US Core Regular Trading Hours (NYSE/NASDAQ Wall Street)
  return {
    type: 'us_equity',
    categoryName: 'Core Financial Market',
    exchangeName: 'NYSE / NASDAQ (Wall Street)',
    timeZone: 'America/New_York',
    timeZoneLabel: 'New York (EDT/EST)',
    regularHoursSummary: 'Mon–Fri 09:30 – 16:00 NY (Regular Trading Hours)',
    dailyBreakSummary: 'Closed Evenings, Weekends & Federal Holidays',
    is24x7: false,
  };
}

/**
 * Generate real-world trading session intervals for a market across a rolling date window.
 */
function generateMarketSessions(metadata: MarketMetadata, centerDate: Date): SessionInterval[] {
  if (metadata.is24x7) {
    return [];
  }

  const timeZone = metadata.timeZone;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour12: false,
  }).formatToParts(centerDate);

  const getP = (t: string) => parts.find(x => x.type === t)?.value || '';
  const baseYear = parseInt(getP('year'), 10);
  const baseMonth = parseInt(getP('month'), 10);
  const baseDay = parseInt(getP('day'), 10);

  const sessions: SessionInterval[] = [];

  // Rolling window: -3 days to +10 days
  for (let offset = -3; offset <= 10; offset++) {
    const refUtc = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay + offset, 12, 0, 0));
    const y = refUtc.getUTCFullYear();
    const m = refUtc.getUTCMonth() + 1;
    const d = refUtc.getUTCDate();
    const dayOfWeek = refUtc.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    const holiday = timeZone === 'America/New_York' ? checkUsHoliday(y, m, d) : null;

    if (metadata.type === 'us_equity') {
      // US Equities: Mon-Fri 09:30 to 16:00 NY
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Closed on full federal holidays
        if (!holiday) {
          const openMs = makeZonedTimestamp(y, m, d, 9, 30, timeZone);
          const closeMs = makeZonedTimestamp(y, m, d, 16, 0, timeZone);
          sessions.push({
            openTime: openMs,
            closeTime: closeMs,
            sessionName: 'US Core Market Regular Session',
          });
        }
      }
    } else if (metadata.type === 'metals' || metadata.type === 'index_cfd' || metadata.type === 'energy') {
      // CME Globex:
      // Sunday open 18:00 NY -> Monday 17:00 NY
      // Mon-Thu daily break 17:00-18:00 NY, reopen 18:00 NY -> next day 17:00 NY
      // Friday closes 17:00 NY for the weekend
      if (dayOfWeek === 0) {
        // Sunday
        const openMs = makeZonedTimestamp(y, m, d, 18, 0, timeZone);
        // Runs until Monday 17:00 (or holiday)
        const monRef = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
        const monHoliday = checkUsHoliday(monRef.getUTCFullYear(), monRef.getUTCMonth() + 1, monRef.getUTCDate());
        const closeH = monHoliday ? 13 : 17; // holiday early close at 13:00 NY if holiday
        const closeMs = makeZonedTimestamp(monRef.getUTCFullYear(), monRef.getUTCMonth() + 1, monRef.getUTCDate(), closeH, 0, timeZone);
        sessions.push({
          openTime: openMs,
          closeTime: closeMs,
          sessionName: 'CME Globex Sunday-Monday Session',
        });
      } else if (dayOfWeek >= 1 && dayOfWeek <= 4) {
        // Mon, Tue, Wed, Thu evenings: opens at 18:00 NY
        const openMs = makeZonedTimestamp(y, m, d, 18, 0, timeZone);
        const nextRef = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
        const nextHoliday = checkUsHoliday(nextRef.getUTCFullYear(), nextRef.getUTCMonth() + 1, nextRef.getUTCDate());
        // Friday closes at 17:00 for weekend
        const closeH = dayOfWeek === 4 ? 17 : (nextHoliday ? 13 : 17);
        const closeMs = makeZonedTimestamp(nextRef.getUTCFullYear(), nextRef.getUTCMonth() + 1, nextRef.getUTCDate(), closeH, 0, timeZone);
        sessions.push({
          openTime: openMs,
          closeTime: closeMs,
          sessionName: 'CME Globex Session',
        });
      }
    } else if (metadata.type === 'forex') {
      // Forex 24/5: Opens Sunday 17:00 NY, closes Friday 17:00 NY
      if (dayOfWeek === 0) {
        const openMs = makeZonedTimestamp(y, m, d, 17, 0, timeZone);
        const friRef = new Date(Date.UTC(y, m - 1, d + 5, 12, 0, 0));
        const closeMs = makeZonedTimestamp(friRef.getUTCFullYear(), friRef.getUTCMonth() + 1, friRef.getUTCDate(), 17, 0, timeZone);
        sessions.push({
          openTime: openMs,
          closeTime: closeMs,
          sessionName: 'Forex 24/5 Interbank Session',
        });
      }
    } else if (metadata.type === 'eu_index') {
      // European / London: Mon-Fri 08:00 to 16:30 London
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const openMs = makeZonedTimestamp(y, m, d, 8, 0, timeZone);
        const closeMs = makeZonedTimestamp(y, m, d, 16, 30, timeZone);
        sessions.push({
          openTime: openMs,
          closeTime: closeMs,
          sessionName: 'European Regular Session',
        });
      }
    }
  }

  sessions.sort((a, b) => a.openTime - b.openTime);
  return sessions;
}

/**
 * Get comprehensive, real-time market status calculating exact dynamic states:
 * - “MARKET OPEN”
 * - “MARKET CLOSED”
 * - “MARKET WILL OPEN SOON” (approaching opening, showing exact remaining minutes)
 * - “MARKET WILL CLOSE SOON” (approaching closing, showing exact remaining minutes)
 */
export function getMarketScheduleStatus(
  symbolOrMarketId: string = 'us_core',
  currentDate: Date = new Date()
): MarketStatusResult {
  const metadata = getMarketMetadata(symbolOrMarketId);
  const nowMs = currentDate.getTime();
  const userTz = getUserTimeZone();

  // Crypto is continuous 24/7/365
  if (metadata.is24x7) {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      hour12: false,
    });
    const parts = timeFormatter.formatToParts(currentDate);
    const getP = (t: string) => parts.find(x => x.type === t)?.value || '';
    const localTimeFormatted = `${getP('weekday')} ${getP('hour')}:${getP('minute')}:${getP('second')} ${getP('timeZoneName') || userTz}`;

    return {
      symbol: symbolOrMarketId,
      marketType: metadata.type,
      metadata,
      isOpen: true,
      status: 'MARKET OPEN',
      statusLabel: 'OPEN',
      displayText: 'MARKET OPEN',
      countdownText: '24/7',
      countdownDetail: 'Continuous 24/7/365 trading',
      minutesRemaining: 999999,
      secondsToNextEvent: 0,
      nextEventDescription: 'Trades continuously without session closures',
      localTimeFormatted,
      activeSessionName: 'Global Crypto 24/7',
      isHoliday: false,
      timeZone: metadata.timeZone,
      timeZoneLabel: metadata.timeZoneLabel,
      userTimeZone: userTz,
    };
  }

  // User local time formatting
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    hour12: false,
  });
  const parts = timeFormatter.formatToParts(currentDate);
  const getP = (t: string) => parts.find(x => x.type === t)?.value || '';
  const localTimeFormatted = `${getP('weekday')} ${getP('hour')}:${getP('minute')}:${getP('second')} ${getP('timeZoneName') || userTz}`;

  // Check if today is a US market holiday
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: metadata.timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour12: false,
  }).formatToParts(currentDate);
  const y = parseInt(dateParts.find(x => x.type === 'year')?.value || '2026', 10);
  const m = parseInt(dateParts.find(x => x.type === 'month')?.value || '9', 10);
  const d = parseInt(dateParts.find(x => x.type === 'day')?.value || '7', 10);

  const holiday = metadata.timeZone === 'America/New_York' ? checkUsHoliday(y, m, d) : null;

  const sessions = generateMarketSessions(metadata, currentDate);
  const activeSession = sessions.find(s => nowMs >= s.openTime && nowMs < s.closeTime);

  // 1. If currently inside an open session
  if (activeSession) {
    const msRemaining = Math.max(0, activeSession.closeTime - nowMs);
    const secondsRemaining = Math.max(0, Math.floor(msRemaining / 1000));
    const minutesRemaining = Math.max(1, Math.ceil(secondsRemaining / 60));

    // Approaching closing time: 45 minutes or less
    if (minutesRemaining <= 45) {
      const displayText = `MARKET WILL CLOSE SOON (${minutesRemaining} min)`;
      const countdownText = `Closes in ${minutesRemaining} min`;
      return {
        symbol: symbolOrMarketId,
        marketType: metadata.type,
        metadata,
        isOpen: true,
        status: 'MARKET WILL CLOSE SOON',
        statusLabel: 'CLOSING SOON',
        displayText,
        countdownText,
        countdownDetail: countdownText,
        minutesRemaining,
        secondsToNextEvent: secondsRemaining,
        nextEventDescription: `Session closes at scheduled time in ${minutesRemaining} minutes`,
        nextEventTimestamp: activeSession.closeTime,
        localTimeFormatted,
        activeSessionName: activeSession.sessionName,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
        timeZone: metadata.timeZone,
        timeZoneLabel: metadata.timeZoneLabel,
        userTimeZone: userTz,
      };
    }

    const durationStr = formatTimeRemaining(secondsRemaining);
    const countdownText = `Closes in ${durationStr}`;
    return {
      symbol: symbolOrMarketId,
      marketType: metadata.type,
      metadata,
      isOpen: true,
      status: 'MARKET OPEN',
      statusLabel: 'OPEN',
      displayText: 'MARKET OPEN',
      countdownText,
      countdownDetail: countdownText,
      minutesRemaining,
      secondsToNextEvent: secondsRemaining,
      nextEventDescription: `Session active. Closes in ${durationStr}`,
      nextEventTimestamp: activeSession.closeTime,
      localTimeFormatted,
      activeSessionName: activeSession.sessionName,
      isHoliday: !!holiday,
      holidayName: holiday?.name,
      timeZone: metadata.timeZone,
      timeZoneLabel: metadata.timeZoneLabel,
      userTimeZone: userTz,
    };
  }

  // 2. Currently CLOSED. Find next upcoming session
  const nextSession = sessions.find(s => s.openTime > nowMs);

  if (!nextSession) {
    return {
      symbol: symbolOrMarketId,
      marketType: metadata.type,
      metadata,
      isOpen: false,
      status: 'MARKET CLOSED',
      statusLabel: 'CLOSED',
      displayText: 'MARKET CLOSED',
      countdownText: holiday ? `Holiday (${holiday.name})` : 'Closed',
      countdownDetail: holiday ? `Closed for ${holiday.name}` : 'Market currently closed',
      minutesRemaining: 0,
      secondsToNextEvent: 86400,
      nextEventDescription: holiday ? `Market closed for ${holiday.name}.` : 'Market closed.',
      localTimeFormatted,
      activeSessionName: 'Closed',
      isHoliday: !!holiday,
      holidayName: holiday?.name,
      timeZone: metadata.timeZone,
      timeZoneLabel: metadata.timeZoneLabel,
      userTimeZone: userTz,
    };
  }

  const msUntilOpen = Math.max(0, nextSession.openTime - nowMs);
  const secondsUntilOpen = Math.max(0, Math.floor(msUntilOpen / 1000));
  const minutesUntilOpen = Math.max(1, Math.ceil(secondsUntilOpen / 60));

  // Format next open day/time in user's local timezone
  const openDateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: userTz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(new Date(nextSession.openTime));

  // Approaching opening time: 45 minutes or less
  if (minutesUntilOpen <= 45) {
    const displayText = `MARKET WILL OPEN SOON (${minutesUntilOpen} min)`;
    const countdownText = `Opens in ${minutesUntilOpen} min`;
    return {
      symbol: symbolOrMarketId,
      marketType: metadata.type,
      metadata,
      isOpen: false,
      status: 'MARKET WILL OPEN SOON',
      statusLabel: 'OPENING SOON',
      displayText,
      countdownText,
      countdownDetail: countdownText,
      minutesRemaining: minutesUntilOpen,
      secondsToNextEvent: secondsUntilOpen,
      nextEventDescription: `Next trading session begins in ${minutesUntilOpen} minutes at ${openDateParts}`,
      nextEventTimestamp: nextSession.openTime,
      localTimeFormatted,
      activeSessionName: 'Pre-Open / Opening Soon',
      isHoliday: !!holiday,
      holidayName: holiday?.name,
      timeZone: metadata.timeZone,
      timeZoneLabel: metadata.timeZoneLabel,
      userTimeZone: userTz,
    };
  }

  const durationStr = formatTimeRemaining(secondsUntilOpen);
  const countdownText = `Opens ${openDateParts} (${durationStr})`;

  return {
    symbol: symbolOrMarketId,
    marketType: metadata.type,
    metadata,
    isOpen: false,
    status: 'MARKET CLOSED',
    statusLabel: 'CLOSED',
    displayText: 'MARKET CLOSED',
    countdownText,
    countdownDetail: `Opens ${openDateParts} (in ${durationStr})`,
    minutesRemaining: minutesUntilOpen,
    secondsToNextEvent: secondsUntilOpen,
    nextEventDescription: holiday
      ? `Closed for ${holiday.name}. Resumes ${openDateParts} (in ${durationStr})`
      : `Trading resumes ${openDateParts} (in ${durationStr})`,
    nextEventTimestamp: nextSession.openTime,
    localTimeFormatted,
    activeSessionName: 'Market Closed',
    isHoliday: !!holiday,
    holidayName: holiday?.name,
    timeZone: metadata.timeZone,
    timeZoneLabel: metadata.timeZoneLabel,
    userTimeZone: userTz,
  };
}

/**
 * World Trading Sessions Live Tracker
 */
export interface WorldSessionInfo {
  id: string;
  name: string;
  city: string;
  flag: string;
  timeZone: string;
  hours: string;
  isOpen: boolean;
  localTime: string;
  statusText: string;
  countdownText: string;
}

function getDateInTz(year: number, month: number, day: number, hour: number, minute: number, tz: string): Date {
  let utcMs = Date.UTC(year, month, day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const d = new Date(utcMs);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const getP = (t: string) => parseInt(parts.find(x => x.type === t)?.value || '0', 10);
    const tzYear = getP('year');
    const tzMonth = getP('month') - 1;
    const tzDay = getP('day');
    const tzHour = getP('hour');
    const tzMin = getP('minute');
    
    const tzAsUtcMs = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin, 0);
    const targetAsUtcMs = Date.UTC(year, month, day, hour, minute, 0);
    const diff = targetAsUtcMs - tzAsUtcMs;
    utcMs += diff;
    if (Math.abs(diff) < 1000) break;
  }
  return new Date(utcMs);
}

function getSessionEvent(currentDate: Date, tz: string, openH: number, openM: number, closeH: number, closeM: number) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    hour12: false,
  });
  const parts = formatter.formatToParts(currentDate);
  const getP = (t: string) => parts.find(x => x.type === t)?.value || '';
  
  const year = parseInt(getP('year'), 10);
  const month = parseInt(getP('month'), 10) - 1;
  const day = parseInt(getP('day'), 10);
  const hour = parseInt(getP('hour'), 10);
  const minute = parseInt(getP('minute'), 10);
  const weekday = getP('weekday');
  
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const minOfDay = hour * 60 + minute;
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;
  
  const isOpen = !isWeekend && minOfDay >= openMin && minOfDay < closeMin;
  
  let targetDate: Date;
  if (isOpen) {
    targetDate = getDateInTz(year, month, day, closeH, closeM, tz);
  } else {
    let testOpen = getDateInTz(year, month, day, openH, openM, tz);
    if (!isWeekend && minOfDay < openMin && testOpen.getTime() > currentDate.getTime()) {
      targetDate = testOpen;
    } else {
      let d = new Date(year, month, day);
      d.setDate(d.getDate() + 1);
      while (true) {
        const w = d.getDay();
        if (w !== 0 && w !== 6) {
          targetDate = getDateInTz(d.getFullYear(), d.getMonth(), d.getDate(), openH, openM, tz);
          if (targetDate.getTime() > currentDate.getTime()) {
            break;
          }
        }
        d.setDate(d.getDate() + 1);
      }
    }
  }
  
  const diffMs = targetDate.getTime() - currentDate.getTime();
  const totalMins = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  
  let timeStr = '';
  if (days > 0) {
    timeStr = `${days}d ${hours}h ${mins}m`;
  } else if (hours > 0) {
    timeStr = `${hours}h ${mins}m`;
  } else {
    timeStr = `${mins}m`;
  }
  
  const countdownText = isOpen ? `Closes in ${timeStr}` : `Opens in ${timeStr}`;
  
  return {
    isOpen,
    statusText: isOpen ? 'OPEN' : 'CLOSED',
    countdownText,
  };
}

export function getWorldMarketSessions(currentDate: Date = new Date()): WorldSessionInfo[] {
  const getTzTime = (tz: string) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
      hour12: false,
    });
    const parts = formatter.formatToParts(currentDate);
    const getP = (t: string) => parts.find(x => x.type === t)?.value || '';
    return `${getP('hour')}:${getP('minute')}:${getP('second')} ${getP('timeZoneName') || ''}`;
  };

  const nyEvent = getSessionEvent(currentDate, 'America/New_York', 9, 30, 16, 0);
  const lonEvent = getSessionEvent(currentDate, 'Europe/London', 8, 0, 16, 30);
  const tokEvent = getSessionEvent(currentDate, 'Asia/Tokyo', 9, 0, 15, 0);
  const sydEvent = getSessionEvent(currentDate, 'Australia/Sydney', 10, 0, 16, 0);

  return [
    {
      id: 'ny',
      name: 'New York',
      city: 'Wall Street / CME',
      flag: '🇺🇸',
      timeZone: 'America/New_York',
      hours: nyEvent.countdownText,
      isOpen: nyEvent.isOpen,
      localTime: getTzTime('America/New_York'),
      statusText: nyEvent.statusText,
      countdownText: nyEvent.countdownText,
    },
    {
      id: 'lon',
      name: 'London',
      city: 'LSE / Europe',
      flag: '🇬🇧',
      timeZone: 'Europe/London',
      hours: lonEvent.countdownText,
      isOpen: lonEvent.isOpen,
      localTime: getTzTime('Europe/London'),
      statusText: lonEvent.statusText,
      countdownText: lonEvent.countdownText,
    },
    {
      id: 'tok',
      name: 'Tokyo',
      city: 'TSE / Asia',
      flag: '🇯🇵',
      timeZone: 'Asia/Tokyo',
      hours: tokEvent.countdownText,
      isOpen: tokEvent.isOpen,
      localTime: getTzTime('Asia/Tokyo'),
      statusText: tokEvent.statusText,
      countdownText: tokEvent.countdownText,
    },
    {
      id: 'syd',
      name: 'Sydney',
      city: 'ASX / Pacific',
      flag: '🇦🇺',
      timeZone: 'Australia/Sydney',
      hours: sydEvent.countdownText,
      isOpen: sydEvent.isOpen,
      localTime: getTzTime('Australia/Sydney'),
      statusText: sydEvent.statusText,
      countdownText: sydEvent.countdownText,
    },
  ];
}
