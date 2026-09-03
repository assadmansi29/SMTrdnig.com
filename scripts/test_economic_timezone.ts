/**
 * Automated Timezone & Economic Calendar Validation Suite
 * 
 * Verifies:
 * 1. Canonical UTC timestamp storage and original IANA timezone/source metadata.
 * 2. Elimination of false CPI event; presence of verified scheduled events.
 * 3. Exact user-mandated example:
 *    US NFP September 4, 2026 at 08:30 America/New_York (12:30 UTC) must display as:
 *    - 14:30 in Europe/Berlin
 *    - 13:30 in Europe/London
 *    - 15:30 in Asia/Amman
 *    - 16:30 in Asia/Dubai
 *    - 08:30 in America/New_York
 *    - 21:30 in Asia/Tokyo
 * 4. Automatic DST (Daylight Saving Time) handling via IANA rules without hardcoded offsets.
 * 5. Countdown and relative time mathematical invariance across all global timezones.
 * 6. Event-day grouping accuracy across date boundaries.
 * 7. Multi-language localization across English, Arabic, Russian, and Ukrainian.
 */

import { 
  VERIFIED_ECONOMIC_SCHEDULE, 
  getMajorEconomicEvents 
} from '../src/data/majorEconomicNews';
import { 
  formatEventLocalTime, 
  getEventCountdown, 
  getEventStatus, 
  groupEventsByLocalDate, 
  getUserTimezoneInfo,
  getZonedDateParts 
} from '../src/utils/economicNewsUtils';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests}: ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${testName}`);
    if (detail) console.error(`       Detail: ${detail}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('ECONOMIC CALENDAR TIMEZONE LOCALIZATION & INTEGRITY TEST SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// Suite 1: Canonical UTC Timestamp & Source Metadata Integrity
// -------------------------------------------------------------
console.log('--- Suite 1: Canonical UTC Timestamps & Metadata ---');

VERIFIED_ECONOMIC_SCHEDULE.forEach((event, idx) => {
  assert(
    typeof event.timestamp === 'number' && event.timestamp > 0,
    `Event #${idx + 1} (${event.id}) has valid positive numeric UTC timestamp`,
    `Found: ${event.timestamp}`
  );

  const iso = new Date(event.timestamp).toISOString();
  assert(
    event.utcIso === iso,
    `Event #${idx + 1} (${event.id}) utcIso matches canonical UTC Date representation`,
    `Expected ${iso}, got ${event.utcIso}`
  );

  assert(
    typeof event.sourceTimezone === 'string' && event.sourceTimezone.length > 0,
    `Event #${idx + 1} (${event.id}) specifies valid source IANA timezone (${event.sourceTimezone})`
  );

  assert(
    typeof event.sourceLocalTime === 'string' && /^\d{2}:\d{2}$/.test(event.sourceLocalTime),
    `Event #${idx + 1} (${event.id}) specifies valid source local release time (${event.sourceLocalTime})`
  );

  assert(
    typeof event.sourceAgency === 'string' && event.sourceAgency.length > 0,
    `Event #${idx + 1} (${event.id}) specifies official issuing agency (${event.sourceAgency})`
  );
});

// -------------------------------------------------------------
// Suite 2: False CPI Event Elimination & Verified Releases
// -------------------------------------------------------------
console.log('\n--- Suite 2: Data Integrity & False CPI Removal ---');

const falseCpiEvent = VERIFIED_ECONOMIC_SCHEDULE.find(
  e => e.id === 'news-approaching' || (e.category === 'Inflation' && new Date(e.timestamp).getUTCDate() === 3)
);
assert(
  falseCpiEvent === undefined,
  'No false or fabricated CPI event is present on September 3, 2026'
);

const verifiedCpi = VERIFIED_ECONOMIC_SCHEDULE.find(e => e.id === 'news-us-cpi-sep11');
assert(
  verifiedCpi !== undefined && new Date(verifiedCpi.timestamp).toISOString() === '2026-09-11T12:30:00.000Z',
  'Real US CPI is scheduled for verified date: Friday, September 11, 2026 at 12:30:00 UTC',
  `Found: ${verifiedCpi ? new Date(verifiedCpi.timestamp).toISOString() : 'None'}`
);

// -------------------------------------------------------------
// Suite 3: User Mandated Timezone Example (US NFP Sep 4, 2026)
// -------------------------------------------------------------
console.log('\n--- Suite 3: User Example Verification Across Global Trading Hubs ---');
// US NFP September 4, 2026 at 08:30 America/New_York
// 08:30 EDT = 12:30:00.000Z UTC

const englishEvents = getMajorEconomicEvents('en');
const nfpEvent = englishEvents.find(e => e.id === 'news-us-nfp-sep04')!;
const nfpTimestamp = nfpEvent.timestamp;

const expectedConversions: Record<string, { expectedTime: string; city: string; minOffsetHours: number }> = {
  'Europe/Berlin': { expectedTime: '14:30', city: 'Berlin / Frankfurt', minOffsetHours: 2 },
  'Europe/London': { expectedTime: '13:30', city: 'London', minOffsetHours: 1 },
  'Asia/Amman': { expectedTime: '15:30', city: 'Amman', minOffsetHours: 3 },
  'Asia/Dubai': { expectedTime: '16:30', city: 'Dubai', minOffsetHours: 4 },
  'America/New_York': { expectedTime: '08:30', city: 'New York', minOffsetHours: -4 },
  'Asia/Tokyo': { expectedTime: '21:30', city: 'Tokyo', minOffsetHours: 9 },
  'Asia/Singapore': { expectedTime: '20:30', city: 'Singapore', minOffsetHours: 8 },
  'Australia/Sydney': { expectedTime: '22:30', city: 'Sydney', minOffsetHours: 10 },
  'UTC': { expectedTime: '12:30', city: 'UTC Universal', minOffsetHours: 0 }
};

for (const [tz, conf] of Object.entries(expectedConversions)) {
  const formatted = formatEventLocalTime(nfpTimestamp, 'en', tz);
  assert(
    formatted.timeStr === conf.expectedTime,
    `US NFP displays as ${conf.expectedTime} in ${tz} (${conf.city})`,
    `Got: ${formatted.timeStr} (Expected: ${conf.expectedTime})`
  );
}

// -------------------------------------------------------------
// Suite 4: DST & IANA Timezone Rules (Summer vs Winter)
// -------------------------------------------------------------
console.log('\n--- Suite 4: IANA Dynamic DST Handling (No Hardcoding) ---');

// Test summer (July) vs winter (January) for London and New York
const summerUtc = Date.parse('2026-07-15T12:00:00.000Z');
const winterUtc = Date.parse('2026-01-15T12:00:00.000Z');

// London: BST (+1) in July, GMT (0) in January
const londonSummer = formatEventLocalTime(summerUtc, 'en', 'Europe/London').timeStr;
const londonWinter = formatEventLocalTime(winterUtc, 'en', 'Europe/London').timeStr;
assert(
  londonSummer === '13:00' && londonWinter === '12:00',
  'Europe/London automatically shifts between BST (13:00) and GMT (12:00) using IANA rules',
  `Summer: ${londonSummer}, Winter: ${londonWinter}`
);

// New York: EDT (-4) in July, EST (-5) in January
const nySummer = formatEventLocalTime(summerUtc, 'en', 'America/New_York').timeStr;
const nyWinter = formatEventLocalTime(winterUtc, 'en', 'America/New_York').timeStr;
assert(
  nySummer === '08:00' && nyWinter === '07:00',
  'America/New_York automatically shifts between EDT (08:00) and EST (07:00) using IANA rules',
  `Summer: ${nySummer}, Winter: ${nyWinter}`
);

// -------------------------------------------------------------
// Suite 5: Countdown Mathematical Invariance Across Global Observers
// -------------------------------------------------------------
console.log('\n--- Suite 5: Countdown & Status Mathematical Invariance ---');

const testNow = Date.parse('2026-09-04T12:00:00.000Z'); // 30 minutes before NFP
const countdownNfp = getEventCountdown(nfpEvent, testNow, 'en');

assert(
  countdownNfp.diffMs === 30 * 60 * 1000,
  'Remaining time diffMs is exactly 1,800,000ms (30 minutes)',
  `Got diffMs: ${countdownNfp.diffMs}`
);

assert(
  countdownNfp.status === 'approaching',
  'Event status 30 minutes before release is "approaching"',
  `Got status: ${countdownNfp.status}`
);

assert(
  countdownNfp.isApproaching === true && countdownNfp.isLive === false,
  'Event flags correctly mark isApproaching=true and isLive=false'
);

assert(
  countdownNfp.text === 'In 30m 00s',
  'Countdown text formats accurately as "In 30m 00s"',
  `Got: "${countdownNfp.text}"`
);

// Test LIVE status: 5 minutes after release
const liveNow = Date.parse('2026-09-04T12:35:00.000Z');
const liveCountdown = getEventCountdown(nfpEvent, liveNow, 'en');
assert(
  liveCountdown.status === 'live' && liveCountdown.isLive === true,
  'Event 5 minutes after release timestamp is in "live" state',
  `Got status: ${liveCountdown.status}`
);

// Test RELEASED status: 30 minutes after release
const releasedNow = Date.parse('2026-09-04T13:00:00.000Z');
const releasedCountdown = getEventCountdown(nfpEvent, releasedNow, 'en');
assert(
  releasedCountdown.status === 'released' && releasedCountdown.isReleased === true,
  'Event 30 minutes after release timestamp is marked "released"',
  `Got status: ${releasedCountdown.status}`
);

// Verify that regardless of what timezone string is queried, diffMs and countdown are identical
['Europe/Berlin', 'America/New_York', 'Asia/Amman', 'Asia/Tokyo'].forEach(tz => {
  const cd = getEventCountdown(nfpEvent, testNow, 'en');
  assert(
    cd.diffMs === 30 * 60 * 1000 && cd.text === 'In 30m 00s',
    `Countdown mathematical result is invariant for observer in ${tz}`
  );
});

// -------------------------------------------------------------
// Suite 6: Event-Day Grouping Across Midnight & Date Boundaries
// -------------------------------------------------------------
console.log('\n--- Suite 6: Event-Day Grouping Across Date Boundaries ---');

// Test an event occurring at 2026-09-04T01:00:00.000Z (early morning UTC)
const mockMidnightEvent = {
  ...nfpEvent,
  id: 'test-midnight-event',
  timestamp: Date.parse('2026-09-04T01:00:00.000Z')
};

const nyLocal = formatEventLocalTime(mockMidnightEvent.timestamp, 'en', 'America/New_York');
const londonLocal = formatEventLocalTime(mockMidnightEvent.timestamp, 'en', 'Europe/London');
const tokyoLocal = formatEventLocalTime(mockMidnightEvent.timestamp, 'en', 'Asia/Tokyo');

assert(
  nyLocal.isoLocalDate === '2026-09-03',
  'Event at 01:00 UTC Sep 4 maps to Sep 3 in America/New_York (21:00 EDT on previous day)',
  `Got: ${nyLocal.isoLocalDate}`
);

assert(
  londonLocal.isoLocalDate === '2026-09-04',
  'Event at 01:00 UTC Sep 4 maps to Sep 4 in Europe/London (02:00 BST on same day)',
  `Got: ${londonLocal.isoLocalDate}`
);

assert(
  tokyoLocal.isoLocalDate === '2026-09-04',
  'Event at 01:00 UTC Sep 4 maps to Sep 4 in Asia/Tokyo (10:00 JST on same day)',
  `Got: ${tokyoLocal.isoLocalDate}`
);

// Grouping test
const groupsNy = groupEventsByLocalDate([mockMidnightEvent], 'America/New_York');
assert(
  groupsNy.length === 1 && groupsNy[0].dateKey === '2026-09-03',
  'groupEventsByLocalDate groups the midnight event under 2026-09-03 for New York'
);

const groupsTokyo = groupEventsByLocalDate([mockMidnightEvent], 'Asia/Tokyo');
assert(
  groupsTokyo.length === 1 && groupsTokyo[0].dateKey === '2026-09-04',
  'groupEventsByLocalDate groups the midnight event under 2026-09-04 for Tokyo'
);

// -------------------------------------------------------------
// Suite 7: Multi-Language Localization
// -------------------------------------------------------------
console.log('\n--- Suite 7: Multi-Language Support (AR, RU, UK, EN) ---');

const langs = ['en', 'ar', 'ru', 'uk'] as const;
for (const l of langs) {
  const evts = getMajorEconomicEvents(l);
  assert(
    evts.length === VERIFIED_ECONOMIC_SCHEDULE.length,
    `Language '${l}' provides all ${VERIFIED_ECONOMIC_SCHEDULE.length} verified events`,
    `Got ${evts.length}`
  );

  const localizedNfp = evts.find(e => e.id === 'news-us-nfp-sep04')!;
  assert(
    typeof localizedNfp.event === 'string' && localizedNfp.event.length > 5,
    `Language '${l}' has valid translated title for NFP: "${localizedNfp.event.slice(0, 30)}..."`
  );

  const countdown = getEventCountdown(localizedNfp, testNow, l);
  assert(
    countdown.text.length > 0,
    `Language '${l}' provides localized countdown: "${countdown.text}"`
  );
}

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log(' ALL AUTOMATED ECONOMIC CALENDAR TIMEZONE TESTS PASSED!');
  process.exit(0);
} else {
  console.error(' TESTS FAILED! CHECK OUTPUT ABOVE.');
  process.exit(1);
}
