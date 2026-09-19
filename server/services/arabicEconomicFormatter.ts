import { EconomicEventRecord } from '../db/economicDb';

export interface OutcomeComparison {
  verdict: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  isMeaningful: boolean;
}

/**
 * Standard Arabic mappings for common countries and their national flags.
 */
export const ARABIC_COUNTRIES: Record<string, { arabic: string; flag: string }> = {
  'United States': { arabic: 'الولايات المتحدة', flag: '🇺🇸' },
  'US': { arabic: 'الولايات المتحدة', flag: '🇺🇸' },
  'Euro Area': { arabic: 'منطقة اليورو', flag: '🇪🇺' },
  'Eurozone': { arabic: 'منطقة اليورو', flag: '🇪🇺' },
  'EU': { arabic: 'منطقة اليورو', flag: '🇪🇺' },
  'Germany': { arabic: 'ألمانيا', flag: '🇩🇪' },
  'DE': { arabic: 'ألمانيا', flag: '🇩🇪' },
  'United Kingdom': { arabic: 'المملكة المتحدة', flag: '🇬🇧' },
  'GB': { arabic: 'المملكة المتحدة', flag: '🇬🇧' },
  'UK': { arabic: 'المملكة المتحدة', flag: '🇬🇧' },
  'Japan': { arabic: 'اليابان', flag: '🇯🇵' },
  'JP': { arabic: 'اليابان', flag: '🇯🇵' },
  'Canada': { arabic: 'كندا', flag: '🇨🇦' },
  'CA': { arabic: 'كندا', flag: '🇨🇦' },
  'Australia': { arabic: 'أستراليا', flag: '🇦🇺' },
  'AU': { arabic: 'أستراليا', flag: '🇦🇺' },
  'Switzerland': { arabic: 'سويسرا', flag: '🇨🇭' },
  'CH': { arabic: 'سويسرا', flag: '🇨🇭' },
  'New Zealand': { arabic: 'نيوزيلندا', flag: '🇳🇿' },
  'NZ': { arabic: 'نيوزيلندا', flag: '🇳🇿' },
  'China': { arabic: 'الصين', flag: '🇨🇳' },
  'CN': { arabic: 'الصين', flag: '🇨🇳' },
  'France': { arabic: 'فرنسا', flag: '🇫🇷' },
  'FR': { arabic: 'فرنسا', flag: '🇫🇷' },
  'Italy': { arabic: 'إيطاليا', flag: '🇮🇹' },
  'IT': { arabic: 'إيطاليا', flag: '🇮🇹' },
  'Spain': { arabic: 'إسبانيا', flag: '🇪🇸' },
  'ES': { arabic: 'إسبانيا', flag: '🇪🇸' },
  'Saudi Arabia': { arabic: 'المملكة العربية السعودية', flag: '🇸🇦' },
  'SA': { arabic: 'المملكة العربية السعودية', flag: '🇸🇦' },
  'United Arab Emirates': { arabic: 'الإمارات العربية المتحدة', flag: '🇦🇪' },
  'AE': { arabic: 'الإمارات العربية المتحدة', flag: '🇦🇪' },
  'Turkey': { arabic: 'تركيا', flag: '🇹🇷' },
  'TR': { arabic: 'تركيا', flag: '🇹🇷' },
  'Brazil': { arabic: 'البرازيل', flag: '🇧🇷' },
  'BR': { arabic: 'البرازيل', flag: '🇧🇷' },
  'India': { arabic: 'الهند', flag: '🇮🇳' },
  'IN': { arabic: 'الهند', flag: '🇮🇳' },
  'South Africa': { arabic: 'جنوب أفريقيا', flag: '🇿🇦' },
  'ZA': { arabic: 'جنوب أفريقيا', flag: '🇿🇦' },
  'Global': { arabic: 'عالمي', flag: '🌐' },
  'WW': { arabic: 'عالمي', flag: '🌐' },
};

/**
 * Arabic names for currencies.
 */
export const ARABIC_CURRENCIES: Record<string, string> = {
  USD: 'USD (الدولار الأمريكي)',
  EUR: 'EUR (اليورو)',
  GBP: 'GBP (الجنيه الإسترليني)',
  JPY: 'JPY (الين الياباني)',
  CAD: 'CAD (الدولار الكندي)',
  AUD: 'AUD (الدولار الأسترالي)',
  NZD: 'NZD (الدولار النيوزيلندي)',
  CHF: 'CHF (الفرنك السويسري)',
  CNY: 'CNY (اليوان الصيني)',
  SAR: 'SAR (الريال السعودي)',
  AED: 'AED (الدرهم الإماراتي)',
};

/**
 * Arabic names for trading timezones.
 */
export const ARABIC_TIMEZONE_NAMES: Record<string, string> = {
  'Asia/Riyadh': 'مكة المكرمة (GMT+3)',
  'Asia/Amman': 'عمّان (GMT+3)',
  'Asia/Dubai': 'دبي (GMT+4)',
  'Asia/Kuwait': 'الكويت (GMT+3)',
  'Asia/Qatar': 'الدوحة (GMT+3)',
  'Africa/Cairo': 'القاهرة (GMT+3)',
  'Europe/London': 'لندن (BST/GMT)',
  'Europe/Berlin': 'برلين / فرانكفورت (CET)',
  'America/New_York': 'نيويورك (EST/EDT)',
  'UTC': 'التوقيت العالمي (UTC)',
};

/**
 * Exact dictionary of professional Arabic financial terms for macroeconomic releases.
 */
const EXACT_EVENT_TRANSLATIONS: Record<string, string> = {
  // Consumer Prices & Inflation
  'Consumer Price Index (CPI)': 'مؤشر أسعار المستهلك (CPI)',
  'Consumer Price Index': 'مؤشر أسعار المستهلك (CPI)',
  'CPI': 'مؤشر أسعار المستهلك (CPI)',
  'CPI MoM': 'مؤشر أسعار المستهلك شهرياً (CPI)',
  'CPI YoY': 'مؤشر أسعار المستهلك سنوياً (CPI)',
  'Core CPI': 'مؤشر أسعار المستهلكين الأساسي (Core CPI)',
  'Core CPI MoM': 'مؤشر أسعار المستهلكين الأساسي شهرياً (Core CPI)',
  'Core CPI YoY': 'مؤشر أسعار المستهلكين الأساسي سنوياً (Core CPI)',
  'PCE Price Index': 'مؤشر نفقات الاستهلاك الشخصي (PCE)',
  'Core PCE Price Index': 'مؤشر أسعار نفقات الاستهلاك الشخصي الأساسي (Core PCE)',
  'Core PCE Price Index MoM': 'مؤشر نفقات الاستهلاك الشخصي الأساسي شهرياً (Core PCE)',
  'Core PCE Price Index YoY': 'مؤشر نفقات الاستهلاك الشخصي الأساسي سنوياً (Core PCE)',
  'Producer Price Index (PPI)': 'مؤشر أسعار المنتجين (PPI)',
  'Producer Price Index': 'مؤشر أسعار المنتجين (PPI)',
  'PPI': 'مؤشر أسعار المنتجين (PPI)',
  'Core PPI': 'مؤشر أسعار المنتجين الأساسي (Core PPI)',
  'Harmonised Index of Consumer Prices (HICP)': 'مؤشر أسعار المستهلكين المنسق الأوروبي (HICP)',
  'HICP': 'مؤشر أسعار المستهلكين المنسق (HICP)',

  // Employment & Labor Market
  'Nonfarm Payrolls': 'تقرير الوظائف غير الزراعية (NFP)',
  'Non-Farm Payrolls': 'تقرير الوظائف غير الزراعية (NFP)',
  'NFP': 'تقرير الوظائف غير الزراعية (NFP)',
  'Unemployment Rate': 'معدل البطالة',
  'ADP Nonfarm Employment Change': 'تغير التوظيف بالقطاع الخاص غير الزراعي (ADP)',
  'Initial Jobless Claims': 'طلبات الإعانة من البطالة الأسبوعية',
  'Continuing Jobless Claims': 'طلبات الإعانة المستمرة من البطالة',
  'Average Hourly Earnings': 'متوسط الأجور في الساعة',
  'Average Hourly Earnings MoM': 'متوسط الأجور في الساعة شهرياً',
  'Average Hourly Earnings YoY': 'متوسط الأجور في الساعة سنوياً',
  'JOLTs Job Openings': 'فرص العمل الشاغرة (JOLTs)',
  'Employment Change': 'التغير في التوظيف',
  'Claimant Count Change': 'التغير في طلبات إعانة البطالة',

  // Central Banks & Interest Rates
  'Fed Interest Rate Decision': 'قرار الفائدة الصادر عن البنك الفيدرالي الأمريكي',
  'Interest Rate Decision': 'قرار الفائدة الرسمي',
  'Fed Funds Rate': 'سعر الفائدة على الأموال الفيدرالية',
  'FOMC Statement': 'بيان اللجنة الفيدرالية للسوق المفتوحة (FOMC)',
  'FOMC Press Conference': 'المؤتمر الصحفي للبنك الفيدرالي الأمريكي (FOMC)',
  'FOMC Economic Projections': 'التوقعات الاقتصادية للجنة الفيدرالية للسوق المفتوحة',
  'FOMC Meeting Minutes': 'محضر اجتماع اللجنة الفيدرالية للسوق المفتوحة',
  'FOMC Minutes': 'محضر اجتماع الفيدرالي الأمريكي',
  'ECB Interest Rate Decision': 'قرار الفائدة الصادر عن البنك المركزي الأوروبي (ECB)',
  'ECB Monetary Policy Statement': 'بيان السياسة النقدية للبنك المركزي الأوروبي',
  'ECB Press Conference': 'المؤتمر الصحفي للبنك المركزي الأوروبي',
  'BOE Interest Rate Decision': 'قرار الفائدة الصادر عن بنك إنجلترا (BOE)',
  'BOJ Interest Rate Decision': 'قرار الفائدة الصادر عن بنك اليابان (BOJ)',
  'BOJ Monetary Policy Statement': 'بيان السياسة النقدية لبنك اليابان (BOJ)',
  'BOJ Press Conference': 'المؤتمر الصحفي لبنك اليابان',
  'RBA Interest Rate Decision': 'قرار الفائدة الصادر عن بنك الاحتياطي الأسترالي (RBA)',
  'BOC Interest Rate Decision': 'قرار الفائدة الصادر عن بنك كندا (BOC)',
  'SNB Interest Rate Decision': 'قرار الفائدة الصادر عن البنك الوطني السويسري (SNB)',
  'RBNZ Interest Rate Decision': 'قرار الفائدة الصادر عن بنك الاحتياطي النيوزيلندي (RBNZ)',

  // Economic Growth & Output
  'Gross Domestic Product (GDP)': 'الناتج المحلي الإجمالي (GDP)',
  'Gross Domestic Product': 'الناتج المحلي الإجمالي (GDP)',
  'GDP': 'الناتج المحلي الإجمالي (GDP)',
  'GDP QoQ': 'الناتج المحلي الإجمالي ربع سنوياً (GDP)',
  'GDP YoY': 'الناتج المحلي الإجمالي سنوياً (GDP)',
  'Retail Sales': 'مبيعات التجزئة (Retail Sales)',
  'Core Retail Sales': 'مبيعات التجزئة الأساسية (Core Retail Sales)',
  'Retail Sales MoM': 'مبيعات التجزئة شهرياً (Retail Sales)',
  'Retail Sales YoY': 'مبيعات التجزئة سنوياً (Retail Sales)',
  'Durable Goods Orders': 'طلبيات السلع المعمرة',
  'Core Durable Goods Orders': 'طلبيات السلع المعمرة الأساسية',
  'Trade Balance': 'الميزان التجاري',
  'Current Account': 'الحساب الجاري',
  'Industrial Production': 'الإنتاج الصناعي',
  'Manufacturing Production': 'الإنتاج التصنيعي',

  // PMIs & Sentiment
  'ISM Manufacturing PMI': 'مؤشر مديري المشتريات الصناعي ISM',
  'ISM Non-Manufacturing PMI': 'مؤشر مديري المشتريات الخدمي ISM',
  'ISM Services PMI': 'مؤشر مديري المشتريات الخدمي ISM',
  'S&P Global Manufacturing PMI': 'مؤشر مديري المشتريات الصناعي S&P',
  'S&P Global Services PMI': 'مؤشر مديري المشتريات لقطاع الخدمات S&P',
  'S&P Global Composite PMI': 'مؤشر مديري المشتريات المركب S&P',
  'Manufacturing PMI': 'مؤشر مديري المشتريات الصناعي',
  'Services PMI': 'مؤشر مديري المشتريات لقطاع الخدمات',
  'CB Consumer Confidence': 'مؤشر ثقة المستهلك (CB)',
  'Consumer Confidence': 'مؤشر ثقة المستهلك',
  'Michigan Consumer Sentiment': 'مؤشر ميتشيغان لثقة المستهلك',
  'ZEW Economic Sentiment': 'مؤشر ZEW لمعنويات الاقتصاد الألماني',
  'Ifo Business Climate': 'مؤشر Ifo لمناخ الأعمال الألماني',

  // Housing & Commodities
  'Building Permits': 'تصاريح البناء',
  'Housing Starts': 'المنازل المبدوء بناؤها',
  'Existing Home Sales': 'مبيعات المنازل القائمة',
  'New Home Sales': 'مبيعات المنازل الجديدة',
  'Crude Oil Inventories': 'مخزونات النفط الخام الأمريكية (EIA)',
  'OPEC Meeting': 'اجتماع منظمة أوبك (OPEC)',
};

/**
 * Translates an English economic event name into a clean, professional Arabic financial term.
 */
export function translateEventToArabic(eventName: string): string {
  const trimmed = eventName.trim();
  if (EXACT_EVENT_TRANSLATIONS[trimmed]) {
    return EXACT_EVENT_TRANSLATIONS[trimmed];
  }

  // Check case-insensitive match in dictionary
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(EXACT_EVENT_TRANSLATIONS)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }

  // Smart heuristic rule-based translation for complex / localized title variants
  if (lower.includes('consumer price index') || lower.includes('cpi')) {
    if (lower.includes('core')) return 'مؤشر أسعار المستهلكين الأساسي (Core CPI)';
    return 'مؤشر أسعار المستهلك (CPI)';
  }
  if (lower.includes('nonfarm') || lower.includes('non-farm')) {
    return 'تقرير الوظائف غير الزراعية (NFP)';
  }
  if (lower.includes('unemployment rate')) {
    return 'معدل البطالة (Unemployment Rate)';
  }
  if (lower.includes('interest rate') || lower.includes('policy rate')) {
    return `قرار الفائدة الرسمي (${trimmed})`;
  }
  if (lower.includes('fomc statement')) {
    return 'بيان اللجنة الفيدرالية للسوق المفتوحة (FOMC)';
  }
  if (lower.includes('fomc press conference')) {
    return 'المؤتمر الصحفي للبنك الفيدرالي الأمريكي';
  }
  if (lower.includes('fomc minutes') || lower.includes('meeting minutes')) {
    return 'محضر اجتماع الفيدرالي الأمريكي';
  }
  if (lower.includes('gdp') || lower.includes('gross domestic product')) {
    return 'الناتج المحلي الإجمالي (GDP)';
  }
  if (lower.includes('producer price') || lower.includes('ppi')) {
    if (lower.includes('core')) return 'مؤشر أسعار المنتجين الأساسي (Core PPI)';
    return 'مؤشر أسعار المنتجين (PPI)';
  }
  if (lower.includes('retail sales')) {
    if (lower.includes('core')) return 'مبيعات التجزئة الأساسية (Core Retail Sales)';
    return 'مبيعات التجزئة (Retail Sales)';
  }
  if (lower.includes('jobless claims')) {
    if (lower.includes('continuing')) return 'طلبات الإعانة المستمرة من البطالة';
    return 'طلبات الإعانة من البطالة الأسبوعية';
  }
  if (lower.includes('pmi')) {
    if (lower.includes('manufacturing')) return `مؤشر مديري المشتريات الصناعي (${trimmed})`;
    if (lower.includes('services') || lower.includes('non-manufacturing')) return `مؤشر مديري المشتريات الخدمي (${trimmed})`;
    return `مؤشر مديري المشتريات (${trimmed})`;
  }
  if (lower.includes('consumer confidence') || lower.includes('consumer sentiment')) {
    return `مؤشر ثقة المستهلك (${trimmed})`;
  }
  if (lower.includes('durable goods')) {
    return 'طلبيات السلع المعمرة';
  }
  if (lower.includes('trade balance')) {
    return 'الميزان التجاري';
  }
  if (lower.includes('crude oil')) {
    return 'مخزونات النفط الخام الأمريكية (EIA)';
  }
  if (lower.includes('home sales') || lower.includes('building permits')) {
    return `بيانات الإسكان والبناء (${trimmed})`;
  }

  // Fallback: preserve original with clean Arabic label
  return trimmed;
}

/**
 * Formats country into flag and Arabic country title.
 */
export function getArabicCountryInfo(country: string): { name: string; flag: string } {
  const match = ARABIC_COUNTRIES[country] || ARABIC_COUNTRIES[country.trim()];
  if (match) return { name: match.arabic, flag: match.flag };

  // Heuristics
  const cLower = country.toLowerCase();
  if (cLower.includes('united states') || cLower === 'us') return { name: 'الولايات المتحدة', flag: '🇺🇸' };
  if (cLower.includes('euro') || cLower === 'eu') return { name: 'منطقة اليورو', flag: '🇪🇺' };
  if (cLower.includes('united kingdom') || cLower === 'uk' || cLower === 'gb') return { name: 'المملكة المتحدة', flag: '🇬🇧' };
  if (cLower.includes('japan') || cLower === 'jp') return { name: 'اليابان', flag: '🇯🇵' };
  if (cLower.includes('germany') || cLower === 'de') return { name: 'ألمانيا', flag: '🇩🇪' };
  if (cLower.includes('canada') || cLower === 'ca') return { name: 'كندا', flag: '🇨🇦' };
  if (cLower.includes('australia') || cLower === 'au') return { name: 'أستراليا', flag: '🇦🇺' };

  return { name: country, flag: '🌐' };
}

/**
 * Returns importance label in Arabic.
 * Tier 1/Very High (importance >= 4 or top macro releases) -> عالية جداً
 * High (importance = 3) -> عالية جداً / عالية
 */
export function getArabicImportanceLabel(importance: number, eventName: string): string {
  const evLower = eventName.toLowerCase();
  const isTier1 =
    importance >= 4 ||
    evLower.includes('cpi') ||
    evLower.includes('nonfarm') ||
    evLower.includes('interest rate') ||
    evLower.includes('fomc') ||
    evLower.includes('gdp') ||
    evLower.includes('unemployment');

  if (isTier1 || importance >= 3) {
    return 'عالية جداً';
  }
  if (importance === 2) {
    return 'متوسطة';
  }
  return 'منخفضة';
}

/**
 * Extracts a numeric value from string representations like "2.8%", "$150K", "3.1M".
 */
export function parseNumericValue(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[^0-9.-]/g, '').trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Evaluates whether an economic release result is better, worse, or aligned with forecast.
 */
export function evaluateEconomicOutcome(
  eventName: string,
  actualStr: string | null,
  forecastStr: string | null
): OutcomeComparison {
  const actual = parseNumericValue(actualStr);
  const forecast = parseNumericValue(forecastStr);

  if (actual === null || forecast === null) {
    return {
      verdict: 'تم إصدار البيانات الرسمية (غير قابلة للمقارنة الرقمية المباشرة)',
      sentiment: 'neutral',
      isMeaningful: false,
    };
  }

  const evLower = eventName.toLowerCase();

  // 1. Labor Slack / Unemployment / Jobless Claims: LOWER is better
  const isLaborSlack =
    evLower.includes('unemployment') ||
    evLower.includes('jobless claims') ||
    evLower.includes('claimant');

  if (isLaborSlack) {
    if (actual < forecast) {
      return {
        verdict: `🟢 النتيجة أفضل من المتوقع (انخفاض معدل البطالة/طلبات الإعانة - إيجابي للعملة)`,
        sentiment: 'positive',
        isMeaningful: true,
      };
    } else if (actual > forecast) {
      return {
        verdict: `🔴 النتيجة أسوأ من المتوقع (ارتفاع معدل البطالة/طلبات الإعانة - سلبي للعملة)`,
        sentiment: 'negative',
        isMeaningful: true,
      };
    } else {
      return {
        verdict: `⚪ النتيجة مطابقة للتوقعات تماماً (${actualStr})`,
        sentiment: 'neutral',
        isMeaningful: true,
      };
    }
  }

  // 2. Inflation: CPI, PPI, PCE
  const isInflation =
    evLower.includes('cpi') ||
    evLower.includes('inflation') ||
    evLower.includes('pce') ||
    evLower.includes('ppi') ||
    evLower.includes('consumer price');

  if (isInflation) {
    if (actual > forecast) {
      return {
        verdict: `🔴 النتيجة أعلى من المتوقع (${actualStr} مقابل متوقع ${forecastStr} - استمرار الضغوط التضخمية)`,
        sentiment: 'negative',
        isMeaningful: true,
      };
    } else if (actual < forecast) {
      return {
        verdict: `🟢 النتيجة أقل من المتوقع (${actualStr} مقابل متوقع ${forecastStr} - تراجع وتيرة التضخم)`,
        sentiment: 'positive',
        isMeaningful: true,
      };
    } else {
      return {
        verdict: `⚪ النتيجة مطابقة للتوقعات تماماً (${actualStr})`,
        sentiment: 'neutral',
        isMeaningful: true,
      };
    }
  }

  // 3. Central Bank Interest Rates
  const isInterestRate =
    evLower.includes('interest rate') ||
    evLower.includes('fed funds') ||
    evLower.includes('policy rate');

  if (isInterestRate) {
    if (actual > forecast) {
      return {
        verdict: `🔺 قرار برفع الفائدة بأعلى من التقديرات (تشديد نقدي - دعم مباشر للعملة)`,
        sentiment: 'positive',
        isMeaningful: true,
      };
    } else if (actual < forecast) {
      return {
        verdict: `🔻 قرار بخفض الفائدة بأكثر من التقديرات (تيسير نقدي)`,
        sentiment: 'negative',
        isMeaningful: true,
      };
    } else {
      return {
        verdict: `⚪ قرار الفائدة مطابق للتوقعات (${actualStr})`,
        sentiment: 'neutral',
        isMeaningful: true,
      };
    }
  }

  // 4. Standard Economic Growth & Activity: GDP, NFP, Retail Sales, PMI, Orders (HIGHER is better)
  if (actual > forecast) {
    return {
      verdict: `🟢 النتيجة أفضل من المتوقع (${actualStr} مقابل متوقع ${forecastStr} - إيجابي للعملة)`,
      sentiment: 'positive',
      isMeaningful: true,
    };
  } else if (actual < forecast) {
    return {
      verdict: `🔴 النتيجة أسوأ من المتوقع (${actualStr} مقابل متوقع ${forecastStr} - سلبي للعملة)`,
      sentiment: 'negative',
      isMeaningful: true,
    };
  } else {
    return {
      verdict: `⚪ النتيجة مطابقة للتوقعات تماماً (${actualStr})`,
      sentiment: 'neutral',
      isMeaningful: true,
    };
  }
}

/**
 * Formats a release date into 24-hour time and timezone title in Arabic.
 */
export function formatTimeInTimezone(dateUtcIso: string, timezone?: string): { time24: string; tzLabel: string } {
  const d = new Date(dateUtcIso);
  const targetTz = (timezone && timezone.trim()) ? timezone.trim() : 'UTC';

  let time24 = '12:00';
  try {
    time24 = d.toLocaleTimeString('en-GB', {
      timeZone: targetTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    time24 = d.toISOString().substring(11, 16);
  }

  const tzLabel = ARABIC_TIMEZONE_NAMES[targetTz] || targetTz;
  return { time24, tzLabel };
}

/**
 * Generates the professional Arabic reminder message matching the user's exact specification.
 *
 * Example:
 * 🚨 تنبيه اقتصادي مهم جداً
 * 🇺🇸 الولايات المتحدة
 * 📊 مؤشر أسعار المستهلك (CPI)
 * 🔴 الأهمية: عالية جداً
 * ⏰ متبقي ساعة على صدور الخبر
 * 🕐 وقت الإصدار: 14:30 بتوقيت مكة المكرمة
 * 📈 المتوقع: 2.8%
 * 📉 السابق: 2.9%
 */
export function generateArabicReminderMessage(
  event: EconomicEventRecord,
  minutesBefore: number,
  targetTimezone: string = 'UTC'
): string {
  const { name: countryName, flag: countryFlag } = getArabicCountryInfo(event.country);
  const eventNameArabic = translateEventToArabic(event.event);
  const importanceLabel = getArabicImportanceLabel(event.importance, event.event);
  const { time24, tzLabel } = formatTimeInTimezone(event.dateUtc, targetTimezone);

  // Time remaining phrasing
  let remainingPhrase = `⏰ متبقي ${minutesBefore} دقيقة على صدور الخبر`;
  if (minutesBefore === 60) {
    remainingPhrase = '⏰ متبقي ساعة على صدور الخبر';
  } else if (minutesBefore === 30) {
    remainingPhrase = '⏰ متبقي 30 دقيقة على صدور الخبر';
  } else if (minutesBefore === 5) {
    remainingPhrase = '⏰ متبقي 5 دقائق على صدور الخبر';
  }

  const forecastValue = event.forecast ? `${event.forecast}${event.unit ? ' ' + event.unit : ''}` : 'غير محدد';
  const previousValue = event.previous ? `${event.previous}${event.unit ? ' ' + event.unit : ''}` : 'غير محدد';
  const currencyDisplay = ARABIC_CURRENCIES[event.currency] || event.currency;

  const lines = [
    `🚨 <b>تنبيه اقتصادي مهم جداً</b>`,
    `${countryFlag} <b>${escapeHtml(countryName)}</b>`,
    `📊 <b>${escapeHtml(eventNameArabic)}</b>`,
    `🔴 <b>الأهمية:</b> ${importanceLabel}`,
    `<b>${remainingPhrase}</b>`,
    `🕐 <b>وقت الإصدار:</b> <code>${time24}</code> بتوقيت ${tzLabel}`,
    `📈 <b>المتوقع:</b> <code>${escapeHtml(forecastValue)}</code>`,
    `📉 <b>السابق:</b> <code>${escapeHtml(previousValue)}</code>`,
    `💵 <b>العملة:</b> <code>${escapeHtml(currencyDisplay)}</code>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚠️ <i>تنبيه للمتداولين: قد يشهد السوق تقلبات حادة واتساعاً في الفوارق السعرية (Spreads) على الذهب (XAUUSD) والمؤشرات والعملات أثناء الصدور. يُرجى إدارة المخاطر وتحديد أحجام العقود بدقة.</i>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 <a href="https://smtrading.pro">منصة SMTrading Pro</a>`,
  ];

  return lines.join('\n');
}

/**
 * Generates the separate Arabic Live Release broadcast message.
 */
export function generateArabicLiveReleaseMessage(
  event: EconomicEventRecord,
  targetTimezone: string = 'UTC'
): string {
  const { name: countryName, flag: countryFlag } = getArabicCountryInfo(event.country);
  const eventNameArabic = translateEventToArabic(event.event);
  const importanceLabel = getArabicImportanceLabel(event.importance, event.event);
  const { time24, tzLabel } = formatTimeInTimezone(event.dateUtc, targetTimezone);
  const currencyDisplay = ARABIC_CURRENCIES[event.currency] || event.currency;

  const actualValue = event.actual ? `${event.actual}${event.unit ? ' ' + event.unit : ''}` : 'تم الصدور';
  const forecastValue = event.forecast ? `${event.forecast}${event.unit ? ' ' + event.unit : ''}` : 'غير محدد';
  const previousValue = event.previous ? `${event.previous}${event.unit ? ' ' + event.unit : ''}` : 'غير محدد';

  const outcome = evaluateEconomicOutcome(event.event, event.actual, event.forecast);

  const lines = [
    `⚡ <b>صدور البيانات الاقتصادية الرسمية</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `${countryFlag} <b>${escapeHtml(countryName)}</b>`,
    `📊 <b>${escapeHtml(eventNameArabic)}</b>`,
    `🔴 <b>الأهمية:</b> ${importanceLabel}`,
    `🕐 <b>وقت الصدور:</b> <code>${time24}</code> بتوقيت ${tzLabel}`,
    `💵 <b>العملة:</b> <code>${escapeHtml(currencyDisplay)}</code>`,
    ``,
    `📋 <b>النتائج الرسمية الصادرة:</b>`,
    `• <b>الحقيقي (الفعلي):</b> <b>${escapeHtml(actualValue)}</b>`,
    `• <b>التقديري (المتوقع):</b> <code>${escapeHtml(forecastValue)}</code>`,
    `• <b>السابق:</b> <code>${escapeHtml(previousValue)}</code>`,
    ...(event.revised ? [`• <b>المعدل السابق:</b> <code>${escapeHtml(event.revised)}${event.unit ? ' ' + escapeHtml(event.unit) : ''}</code>`] : []),
    ``,
    `<b>نتيجة الخبر:</b>`,
    outcome.verdict,
    ``,
    `💡 <b>سياق SMC والتحليل المؤسسي:</b>`,
    `<i>راقب مناطق السيولة والـ Order Blocks وفجوات القيمة العادلة (FVG) على فريم 15m و 1h لتحديد اتجاه السيولة المؤسسية.</i>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 <a href="https://smtrading.pro">منصة SMTrading Pro</a>`,
  ];

  return lines.join('\n');
}

/**
 * Formats a diagnostic test alert in professional Arabic.
 */
export function generateArabicTestMessage(callerUsername: string, targetTimezone: string = 'UTC'): string {
  const now = new Date();
  const utcTime = now.toUTCString();
  const { time24, tzLabel } = formatTimeInTimezone(now.toISOString(), targetTimezone);

  const lines = [
    `🤖 <b>SMTrading.pro | اختبار نظام بوت الأخبار الاقتصادية</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `✅ <b>الحالة:</b> متصل ويعمل بنجاح مع قاعدة بيانات PostgreSQL`,
    `👤 <b>المشرف المنفذ:</b> @${escapeHtml(callerUsername)}`,
    `⏰ <b>توقيت الخادم (UTC):</b> <code>${escapeHtml(utcTime)}</code>`,
    `🌐 <b>التوقيت المعتمد للتنبيهات:</b> <code>${time24}</code> (بتوقيت ${tzLabel})`,
    `📡 <b>مزود البيانات:</b> BiQuote Market Intelligence (biquote.io)`,
    `🔔 <b>قواعد الإرسال الآلية النشطة:</b>`,
    `  • تنبيه قبل ساعة (60 دقيقة) من صدور الخبر`,
    `  • تنبيه قبل 30 دقيقة من صدور الخبر`,
    `  • تنبيه قبل 5 دقائق من صدور الخبر`,
    `  • بث فوري للأرقام الفعلية فور الصدور ومقارنتها بالتوقعات`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 <a href="https://smtrading.pro">منصة SMTrading Pro</a>`,
  ];

  return lines.join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
