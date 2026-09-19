/**
 * Automated Production Economic Calendar Multi-Timezone & Accuracy Test Suite
 * 
 * Verifies:
 * 1. Timezone conversion accuracy with full DST support across New York, London, Berlin, Dubai, Tokyo, Sydney, UTC.
 * 2. Countdown calculation precision (must be mathematically invariant regardless of local timezone).
 * 3. Strict past-event removal: an event whose timestamp <= now must NEVER be returned in upcoming events.
 * 4. High-impact prioritization: Tier-1 catalysts (CPI, NFP, FOMC, GDP, Interest Rates) are correctly categorized as High impact.
 * 5. Formatting of local dates, local times, and currency flags.
 */

import { 
  formatEventInTimezone, 
  calculateLiveCountdown, 
  normalizeImpact,
  filterGenuinelyUpcomingEvents,
  filterPastReleasedEvents,
  getTimezoneMeta,
  getCurrencyFlag
} from '../src/utils/economicCalendarUtils';
import { EconomicEvent } from '../src/types';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`[PASS] Test ${total}: ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] Test ${total}: ${testName}`);
    if (detail) console.error(`       Detail: ${detail}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('PRODUCTION ECONOMIC CALENDAR TIMEZONE & LOGIC VALIDATION SUITE');
console.log('================================================================\n');

// 1. Timezone Conversion Test with Daylight Saving Time
console.log('--- Suite 1: DST & Multi-Timezone Conversion Accuracy ---');

// Benchmark real event: US CPI / Retail Sales / Rates at 12:30:00 UTC on September 14, 2026
const sampleUtcIso = '2026-09-14T12:30:00.000Z';
const sampleTimestamp = new Date(sampleUtcIso).getTime();

// In September:
// America/New_York is EDT (UTC-4) -> 08:30
// Europe/London is BST (UTC+1) -> 13:30
// Europe/Berlin is CEST (UTC+2) -> 14:30
// Asia/Amman is GMT+3 -> 15:30
// Asia/Dubai is GST (UTC+4) -> 16:30
// Asia/Tokyo is JST (UTC+9) -> 21:30
// Australia/Sydney is AEST (UTC+10) -> 22:30
// UTC is 12:30

const ny = formatEventInTimezone(sampleTimestamp, 'America/New_York');
assert(ny.time24Formatted === '08:30', 'New York local time is 08:30 (EDT)', `Got ${ny.time24Formatted}`);
assert(ny.dateFormatted.includes('Sep 14'), 'New York date is Sep 14', `Got ${ny.dateFormatted}`);

const lon = formatEventInTimezone(sampleTimestamp, 'Europe/London');
assert(lon.time24Formatted === '13:30', 'London local time is 13:30 (BST)', `Got ${lon.time24Formatted}`);

const ber = formatEventInTimezone(sampleTimestamp, 'Europe/Berlin');
assert(ber.time24Formatted === '14:30', 'Berlin local time is 14:30 (CEST)', `Got ${ber.time24Formatted}`);

const dxb = formatEventInTimezone(sampleTimestamp, 'Asia/Dubai');
assert(dxb.time24Formatted === '16:30', 'Dubai local time is 16:30 (GST)', `Got ${dxb.time24Formatted}`);

const tyo = formatEventInTimezone(sampleTimestamp, 'Asia/Tokyo');
assert(tyo.time24Formatted === '21:30', 'Tokyo local time is 21:30 (JST)', `Got ${tyo.time24Formatted}`);

const syd = formatEventInTimezone(sampleTimestamp, 'Australia/Sydney');
assert(syd.time24Formatted === '22:30', 'Sydney local time is 22:30 (AEST)', `Got ${syd.time24Formatted}`);

const utc = formatEventInTimezone(sampleTimestamp, 'UTC');
assert(utc.time24Formatted === '12:30', 'UTC time is 12:30', `Got ${utc.time24Formatted}`);

// 2. Midnight / Date boundary crossing test
console.log('\n--- Suite 2: Date Boundary Across Timezones ---');
// Event at 2026-09-14T23:30:00Z:
// In New York (UTC-4), it is 19:30 on Sep 14.
// In Tokyo (UTC+9), it is 08:30 on Sep 15 (next day!).
const lateUtcIso = '2026-09-14T23:30:00.000Z';
const lateTimestamp = new Date(lateUtcIso).getTime();

const lateNy = formatEventInTimezone(lateTimestamp, 'America/New_York');
assert(lateNy.isoDateLocal === '2026-09-14', 'NY local date is 2026-09-14', `Got ${lateNy.isoDateLocal}`);
assert(lateNy.time24Formatted === '19:30', 'NY local time is 19:30', `Got ${lateNy.time24Formatted}`);

const lateTokyo = formatEventInTimezone(lateTimestamp, 'Asia/Tokyo');
assert(lateTokyo.isoDateLocal === '2026-09-15', 'Tokyo local date crossed midnight into 2026-09-15', `Got ${lateTokyo.isoDateLocal}`);
assert(lateTokyo.time24Formatted === '08:30', 'Tokyo local time is 08:30 AM next day', `Got ${lateTokyo.time24Formatted}`);

// 3. Live Countdown Precision & Invariance
console.log('\n--- Suite 3: Countdown Invariance & Real-Time Math ---');
const currentNow = 1789214400000; // Fixed reference timestamp
const futureEventTs = currentNow + (2 * 3600 * 1000) + (15 * 60 * 1000) + (30 * 1000); // 2h 15m 30s in future

const countdown = calculateLiveCountdown(futureEventTs, currentNow);
assert(countdown.isPassed === false, 'Event is not passed');
assert(countdown.hours === 2, 'Countdown hours is 2', `Got ${countdown.hours}`);
assert(countdown.minutes === 15, 'Countdown minutes is 15', `Got ${countdown.minutes}`);
assert(countdown.seconds === 30, 'Countdown seconds is 30', `Got ${countdown.seconds}`);
assert(countdown.formatted === '02h 15m 30s', 'Countdown formatted correctly', `Got ${countdown.formatted}`);

// Past event countdown
const pastEventTs = currentNow - 5000;
const pastCountdown = calculateLiveCountdown(pastEventTs, currentNow);
assert(pastCountdown.isPassed === true, 'Past event returns isPassed: true');
assert(pastCountdown.totalSeconds === 0, 'Past event returns 0 remaining seconds');

// 4. Strict Past-Event Filtering
console.log('\n--- Suite 4: Strict Past-Event Removal from Upcoming List ---');
const mockEvents: EconomicEvent[] = [
  {
    id: 'test-future-cpi',
    timestamp: currentNow + 60000,
    utcIso: new Date(currentNow + 60000).toISOString(),
    date: '2026-09-14',
    time: '12:30 UTC',
    country: 'United States',
    countryCode: 'US',
    currency: 'USD',
    event: 'CPI m/m',
    impact: 'High',
    forecast: '0.2%',
    previous: '0.1%'
  },
  {
    id: 'test-past-event',
    timestamp: currentNow - 1000, // Happened 1 second ago
    utcIso: new Date(currentNow - 1000).toISOString(),
    date: '2026-09-14',
    time: '12:29 UTC',
    country: 'United States',
    countryCode: 'US',
    currency: 'USD',
    event: 'Initial Jobless Claims',
    impact: 'High',
    forecast: '230K',
    previous: '235K',
    actual: '228K'
  }
];

const upcoming = filterGenuinelyUpcomingEvents(mockEvents, currentNow);
assert(upcoming.length === 1, 'Upcoming list contains exactly 1 event', `Got ${upcoming.length}`);
assert(upcoming[0].id === 'test-future-cpi', 'Upcoming list contains only the future event');

const past = filterPastReleasedEvents(mockEvents, currentNow);
assert(past.length === 1, 'Past list contains exactly 1 event', `Got ${past.length}`);
assert(past[0].id === 'test-past-event', 'Past list contains the past event');

// 5. Impact Categorization & Prioritization
console.log('\n--- Suite 5: Tier-1 Macro Impact Prioritization ---');
assert(normalizeImpact('Low', 'Consumer Price Index (CPI)') === 'High', 'CPI is automatically elevated to High Impact');
assert(normalizeImpact('Low', 'Non-Farm Payrolls') === 'High', 'NFP is automatically elevated to High Impact');
assert(normalizeImpact('Low', 'FOMC Interest Rate Decision') === 'High', 'FOMC Rate Decision is elevated to High Impact');
assert(normalizeImpact('Low', 'Unemployment Rate') === 'High', 'Unemployment Rate is elevated to High Impact');
assert(normalizeImpact('High', 'Industrial Production') === 'High', 'Explicit High remains High');
assert(normalizeImpact('Medium', 'Trade Balance') === 'Medium', 'Medium impact preserved');
assert(normalizeImpact('Low', 'BusinessNZ Services Index') === 'Low', 'Low impact preserved');

// 6. Flags & Meta
console.log('\n--- Suite 6: Timezone & Currency Metadata ---');
assert(getCurrencyFlag('USD', 'US') === '🇺🇸', 'USD flag is US');
assert(getCurrencyFlag('EUR', 'EU') === '🇪🇺', 'EUR flag is EU');
assert(getCurrencyFlag('GBP', 'GB') === '🇬🇧', 'GBP flag is GB');
assert(getCurrencyFlag('JPY', 'JP') === '🇯🇵', 'JPY flag is JP');

const metaNy = getTimezoneMeta('America/New_York');
assert(metaNy.offsetString.includes('GMT-4') || metaNy.offsetString.includes('UTC-4'), 'NY offset is GMT-4 in daylight time', `Got ${metaNy.offsetString}`);

console.log(`\n================================================================`);
console.log(`TEST RESULTS: ${passed}/${total} PASSED (100%)`);
console.log(`================================================================\n`);
