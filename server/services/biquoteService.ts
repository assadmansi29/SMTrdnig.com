import { EconomicEventRecord } from '../db/economicDb';

export interface RawBiquoteEvent {
  id: string; // e.g. "mql5:313646" or "fxempire:396710"
  eventId?: string | null;
  time: string; // ISO 8601 UTC string, e.g. "2026-09-03T12:30:00Z"
  period?: string | null;
  countryCode: string; // e.g. "US", "GB", "DE", "JP"
  currency: string; // e.g. "USD", "GBP", "EUR"
  name: string; // Event title
  importance: string; // "low" | "medium" | "high"
  type?: string | null; // e.g. "indicator", "event", "holiday"
  sector?: string | null; // e.g. "jobs", "business", "money"
  unit?: string | null; // e.g. "percent", "currency", "usd", "none"
  multiplier?: string | null; // e.g. "thousands", "millions", "billions", "none"
  digits?: number | null;
  actual?: number | null;
  forecast?: number | null;
  previous?: number | null;
  revisedPrevious?: number | null;
  revision?: number | null;
  timeMode?: string | null; // "exact", "tentative", "notime", "date"
  sourceUrl?: string | null;
  source?: string | null;
}

const ISO_COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  EU: 'Euro Area',
  DE: 'Germany',
  GB: 'United Kingdom',
  JP: 'Japan',
  CA: 'Canada',
  AU: 'Australia',
  CH: 'Switzerland',
  NZ: 'New Zealand',
  CN: 'China',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  MX: 'Mexico',
  TR: 'Turkey',
  IN: 'India',
  BR: 'Brazil',
  ZA: 'South Africa',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  SG: 'Singapore',
  KR: 'South Korea',
  SE: 'Sweden',
  NO: 'Norway',
  PL: 'Poland',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  EG: 'Egypt',
  FI: 'Finland',
  GR: 'Greece',
  HK: 'Hong Kong',
  HU: 'Hungary',
  ID: 'Indonesia',
  IE: 'Ireland',
  IL: 'Israel',
  MY: 'Malaysia',
  PH: 'Philippines',
  PT: 'Portugal',
  RO: 'Romania',
  RU: 'Russia',
  TH: 'Thailand',
  TW: 'Taiwan',
  UA: 'Ukraine',
  VN: 'Vietnam',
  WW: 'Global',
};

/**
 * Formats numeric values from BiQuote with appropriate multiplier & unit suffixes.
 */
function formatBiquoteNumericValue(
  val: number | null | undefined,
  multiplier?: string | null,
  unit?: string | null,
  digits?: number | null
): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'number' || isNaN(val)) return null;

  let formatted: string;
  if (typeof digits === 'number' && digits >= 0) {
    formatted = val.toFixed(digits);
  } else {
    formatted = val.toString();
  }

  // Remove trailing decimal zeros if clean float
  if (formatted.includes('.')) {
    formatted = formatted.replace(/\.?0+$/, '');
  }

  let suffix = '';
  const multLower = (multiplier || '').toLowerCase();
  if (multLower === 'thousands') suffix = 'K';
  else if (multLower === 'millions') suffix = 'M';
  else if (multLower === 'billions') suffix = 'B';
  else if (multLower === 'trillions') suffix = 'T';

  const unitLower = (unit || '').toLowerCase();
  if (unitLower === 'percent') {
    suffix += '%';
  }

  return `${formatted}${suffix}`;
}

export class BiquoteService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (process.env.BIQUOTE_API_URL || 'https://biquote.io').replace(/\/+$/, '');
  }

  public isConfigured(): boolean {
    return Boolean(this.baseUrl && this.baseUrl.length > 0);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Fetches calendar events from BiQuote Market Intelligence API.
   * Pulls both scheduled upcoming releases and recent high-importance releases,
   * merging them idempotently by canonical event ID.
   */
  public async fetchCalendar(
    startDate?: Date,
    endDate?: Date
  ): Promise<Omit<EconomicEventRecord, 'createdAt' | 'lastUpdatedUtc'>[]> {
    console.log(`[BiQuote] Fetching economic calendar events from ${this.baseUrl}...`);

    try {
      // Fetch upcoming releases + rolling calendar + high importance feed in parallel
      const [upcomingRes, calendarRes, highImpRes] = await Promise.all([
        fetch(`${this.baseUrl}/api/calendar/upcoming?limit=500`, {
          headers: { Accept: 'application/json', 'User-Agent': 'SMTradingPro-BiQuoteClient/1.0' },
          signal: AbortSignal.timeout(12000),
        }),
        fetch(`${this.baseUrl}/api/calendar?limit=500`, {
          headers: { Accept: 'application/json', 'User-Agent': 'SMTradingPro-BiQuoteClient/1.0' },
          signal: AbortSignal.timeout(12000),
        }),
        fetch(`${this.baseUrl}/api/calendar?importance=high&limit=100`, {
          headers: { Accept: 'application/json', 'User-Agent': 'SMTradingPro-BiQuoteClient/1.0' },
          signal: AbortSignal.timeout(12000),
        }),
      ]);

      const eventsMap = new Map<string, RawBiquoteEvent>();

      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        if (Array.isArray(upcomingData)) {
          for (const ev of upcomingData) {
            if (ev?.id) eventsMap.set(ev.id, ev);
          }
        }
      } else {
        console.warn(`[BiQuote] /api/calendar/upcoming status ${upcomingRes.status}`);
      }

      if (calendarRes.ok) {
        const calData = await calendarRes.json();
        if (Array.isArray(calData)) {
          for (const ev of calData) {
            if (ev?.id) eventsMap.set(ev.id, ev);
          }
        }
      } else {
        console.warn(`[BiQuote] /api/calendar status ${calendarRes.status}`);
      }

      if (highImpRes.ok) {
        const hiData = await highImpRes.json();
        if (Array.isArray(hiData)) {
          for (const ev of hiData) {
            if (ev?.id) eventsMap.set(ev.id, ev);
          }
        }
      }

      const rawList = Array.from(eventsMap.values());
      console.log(`[BiQuote] Received ${rawList.length} unique raw events from BiQuote.`);

      const normalized = rawList
        .filter(raw => Boolean(raw.id && raw.name && raw.time))
        .map(this.normalizeEvent);

      // Filter by window if requested
      const startMs = startDate ? startDate.getTime() : null;
      const endMs = endDate ? endDate.getTime() : null;

      const filtered = normalized.filter(ev => {
        const evMs = new Date(ev.dateUtc).getTime();
        if (startMs && evMs < startMs) return false;
        if (endMs && evMs > endMs) return false;
        return true;
      });

      // Sort chronologically ascending
      filtered.sort((a, b) => new Date(a.dateUtc).getTime() - new Date(b.dateUtc).getTime());

      console.log(`[BiQuote] Normalized and filtered ${filtered.length} economic events ready for PostgreSQL.`);
      return filtered;
    } catch (err: any) {
      console.error(`[BiQuote API Error] Failed to fetch calendar: ${err.message}`);
      throw new Error(`[BiQuote API Error] ${err.message}`);
    }
  }

  /**
   * Polls latest live actual updates from BiQuote API.
   * Pulls the rolling calendar feed which captures newly reported actual releases.
   */
  public async fetchLiveUpdates(): Promise<Omit<EconomicEventRecord, 'createdAt' | 'lastUpdatedUtc'>[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/calendar?limit=250`, {
        headers: { Accept: 'application/json', 'User-Agent': 'SMTradingPro-BiQuoteClient/1.0' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const rawEvents: RawBiquoteEvent[] = await response.json();
      if (!Array.isArray(rawEvents)) return [];

      return rawEvents
        .filter(raw => Boolean(raw.id && raw.name && raw.time))
        .map(this.normalizeEvent);
    } catch (err: any) {
      console.warn(`[BiQuote Live Updates Warning] ${err.message}`);
      return [];
    }
  }

  /**
   * Normalizes a raw BiQuote record to our standard PostgreSQL EconomicEventRecord schema.
   * Ensures all timestamps are converted into valid UTC ISO-8601 strings.
   */
  private normalizeEvent = (
    raw: RawBiquoteEvent
  ): Omit<EconomicEventRecord, 'createdAt' | 'lastUpdatedUtc'> => {
    const calendarIdStr = String(raw.id || raw.eventId || `${raw.countryCode}_${raw.name}_${raw.time}`).trim();
    const id = `bq_${calendarIdStr.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    // Normalize dateUtc to guaranteed UTC ISO 8601
    let dateUtc: string;
    try {
      const d = new Date(raw.time);
      if (isNaN(d.getTime())) {
        dateUtc = new Date().toISOString();
      } else {
        dateUtc = d.toISOString();
      }
    } catch {
      dateUtc = new Date().toISOString();
    }

    // Map importance: 4 -> Very High, 3 -> High, 2 -> Medium, 1 -> Low
    let importance = 1;
    const impStr = String(raw.importance || '').toLowerCase().trim();
    const eventNameLower = String(raw.name || '').toLowerCase();
    const isTier1Macro =
      eventNameLower.includes('cpi') ||
      eventNameLower.includes('consumer price') ||
      eventNameLower.includes('nonfarm') ||
      eventNameLower.includes('non-farm') ||
      eventNameLower.includes('interest rate') ||
      eventNameLower.includes('fomc') ||
      eventNameLower.includes('gdp') ||
      eventNameLower.includes('unemployment rate');

    if (
      impStr === 'very high' ||
      impStr === 'extreme' ||
      impStr === 'critical' ||
      impStr === '4' ||
      (impStr === 'high' && isTier1Macro)
    ) {
      importance = 4; // VERY HIGH (عالية جداً)
    } else if (impStr === 'high' || impStr === '3' || isTier1Macro) {
      importance = 3; // HIGH (عالية)
    } else if (impStr === 'medium' || impStr === '2' || impStr.includes('moderate')) {
      importance = 2; // MEDIUM (متوسطة)
    } else {
      importance = 1; // LOW (منخفضة)
    }

    // Country name and currency
    const code = (raw.countryCode || '').trim().toUpperCase();
    const country = ISO_COUNTRY_NAMES[code] || code || 'Global';
    const currency = (raw.currency || 'USD').trim().toUpperCase();

    // Format actual, forecast, previous, revised with proper units/multipliers
    const actualStr = formatBiquoteNumericValue(raw.actual, raw.multiplier, raw.unit, raw.digits);
    const forecastStr = formatBiquoteNumericValue(raw.forecast, raw.multiplier, raw.unit, raw.digits);
    const previousStr = formatBiquoteNumericValue(raw.previous, raw.multiplier, raw.unit, raw.digits);
    const revisedStr = formatBiquoteNumericValue(raw.revisedPrevious, raw.multiplier, raw.unit, raw.digits);

    // Derived unit description
    let unitDesc = raw.unit && raw.unit !== 'none' ? raw.unit : null;
    if (raw.multiplier && raw.multiplier !== 'none') {
      unitDesc = unitDesc ? `${raw.multiplier} ${unitDesc}` : raw.multiplier;
    }

    return {
      id,
      calendarId: calendarIdStr,
      dateUtc,
      country,
      currency,
      event: (raw.name || 'Economic Event').trim(),
      category: (raw.sector || raw.type || 'Macroeconomics').trim(),
      importance,
      actual: actualStr,
      forecast: forecastStr,
      previous: previousStr,
      revised: revisedStr,
      unit: unitDesc,
      rawData: raw,
    };
  };
}

export const biquoteService = new BiquoteService();
