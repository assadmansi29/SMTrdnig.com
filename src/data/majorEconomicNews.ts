import { EconomicEvent } from '../types';
import { LanguageCode } from '../locales';

// Canonical Verified Economic Events Schedule for September 2026
// Every event stores:
// - timestamp: canonical UTC epoch timestamp in milliseconds
// - utcIso: exact ISO-8601 UTC timestamp string
// - sourceTimezone: issuing country/institution's official IANA timezone
// - sourceLocalTime: official release time in source agency's local clock
// - sourceAgency: official institutional issuing agency
export const VERIFIED_ECONOMIC_SCHEDULE = [
  {
    id: 'news-jobless-claims-sep03',
    timestamp: Date.parse('2026-09-03T12:30:00.000Z'),
    utcIso: '2026-09-03T12:30:00.000Z',
    sourceTimezone: 'America/New_York',
    sourceLocalTime: '08:30',
    sourceAgency: 'U.S. Department of Labor (DOL)',
    country: 'United States',
    countryCode: 'US',
    category: 'Employment' as const,
    impact: 'Medium' as const,
    forecast: '230K',
    previous: '232K',
    actual: '227K',
    affectedAssets: ['USD', 'US Treasuries', 'XAUUSD']
  },
  {
    id: 'news-ism-services-sep03',
    timestamp: Date.parse('2026-09-03T14:00:00.000Z'),
    utcIso: '2026-09-03T14:00:00.000Z',
    sourceTimezone: 'America/New_York',
    sourceLocalTime: '10:00',
    sourceAgency: 'Institute for Supply Management (ISM)',
    country: 'United States',
    countryCode: 'US',
    category: 'Growth' as const,
    impact: 'High' as const,
    forecast: '51.1',
    previous: '51.4',
    actual: '51.5',
    affectedAssets: ['SPX500', 'NAS100', 'USD', 'US30']
  },
  {
    id: 'news-us-nfp-sep04',
    timestamp: Date.parse('2026-09-04T12:30:00.000Z'),
    utcIso: '2026-09-04T12:30:00.000Z',
    sourceTimezone: 'America/New_York',
    sourceLocalTime: '08:30',
    sourceAgency: 'U.S. Bureau of Labor Statistics (BLS)',
    country: 'United States',
    countryCode: 'US',
    category: 'Employment' as const,
    impact: 'Extreme' as const,
    forecast: '165K',
    previous: '142K',
    actual: undefined,
    affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30', 'US10Y']
  },
  {
    id: 'news-ecb-rate-sep10',
    timestamp: Date.parse('2026-09-10T12:15:00.000Z'),
    utcIso: '2026-09-10T12:15:00.000Z',
    sourceTimezone: 'Europe/Frankfurt',
    sourceLocalTime: '14:15',
    sourceAgency: 'European Central Bank (ECB)',
    country: 'Eurozone',
    countryCode: 'EU',
    category: 'Central Bank' as const,
    impact: 'Extreme' as const,
    forecast: '3.50%',
    previous: '3.75%',
    actual: undefined,
    affectedAssets: ['EURUSD', 'GER40', 'EURGBP']
  },
  {
    id: 'news-us-cpi-sep11',
    timestamp: Date.parse('2026-09-11T12:30:00.000Z'),
    utcIso: '2026-09-11T12:30:00.000Z',
    sourceTimezone: 'America/New_York',
    sourceLocalTime: '08:30',
    sourceAgency: 'U.S. Bureau of Labor Statistics (BLS)',
    country: 'United States',
    countryCode: 'US',
    category: 'Inflation' as const,
    impact: 'Extreme' as const,
    forecast: '2.6%',
    previous: '2.9%',
    actual: undefined,
    affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'SPX500']
  },
  {
    id: 'news-fomc-rate-sep16',
    timestamp: Date.parse('2026-09-16T18:00:00.000Z'),
    utcIso: '2026-09-16T18:00:00.000Z',
    sourceTimezone: 'America/New_York',
    sourceLocalTime: '14:00',
    sourceAgency: 'Federal Open Market Committee (FOMC)',
    country: 'United States',
    countryCode: 'US',
    category: 'Central Bank' as const,
    impact: 'Extreme' as const,
    forecast: '5.00%',
    previous: '5.25%',
    actual: undefined,
    affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30', 'US10Y']
  },
  {
    id: 'news-boe-rate-sep17',
    timestamp: Date.parse('2026-09-17T11:00:00.000Z'),
    utcIso: '2026-09-17T11:00:00.000Z',
    sourceTimezone: 'Europe/London',
    sourceLocalTime: '12:00',
    sourceAgency: 'Bank of England (BOE)',
    country: 'United Kingdom',
    countryCode: 'GB',
    category: 'Central Bank' as const,
    impact: 'High' as const,
    forecast: '5.00%',
    previous: '5.00%',
    actual: undefined,
    affectedAssets: ['GBPUSD', 'UK100', 'EURGBP']
  },
  {
    id: 'news-boj-rate-sep18',
    timestamp: Date.parse('2026-09-18T03:00:00.000Z'),
    utcIso: '2026-09-18T03:00:00.000Z',
    sourceTimezone: 'Asia/Tokyo',
    sourceLocalTime: '12:00',
    sourceAgency: 'Bank of Japan (BOJ)',
    country: 'Japan',
    countryCode: 'JP',
    category: 'Central Bank' as const,
    impact: 'Extreme' as const,
    forecast: '0.25%',
    previous: '0.25%',
    actual: undefined,
    affectedAssets: ['USDJPY', 'JP225', 'Global Risk Assets']
  },
  {
    id: 'news-us-gdp-sep24',
    timestamp: Date.parse('2026-09-24T12:30:00.000Z'),
    utcIso: '2026-09-24T12:30:00.000Z',
    sourceTimezone: 'America/New_York',
    sourceLocalTime: '08:30',
    sourceAgency: 'U.S. Bureau of Economic Analysis (BEA)',
    country: 'United States',
    countryCode: 'US',
    category: 'Growth' as const,
    impact: 'High' as const,
    forecast: '3.0%',
    previous: '2.8%',
    actual: undefined,
    affectedAssets: ['SPX500', 'NAS100', 'USD', 'US30']
  },
  {
    id: 'news-us-pce-sep25',
    timestamp: Date.parse('2026-09-25T12:30:00.000Z'),
    utcIso: '2026-09-25T12:30:00.000Z',
    sourceTimezone: 'America/New_York',
    sourceLocalTime: '08:30',
    sourceAgency: 'U.S. Bureau of Economic Analysis (BEA)',
    country: 'United States',
    countryCode: 'US',
    category: 'Inflation' as const,
    impact: 'High' as const,
    forecast: '0.2%',
    previous: '0.2%',
    actual: undefined,
    affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US10Y']
  }
];

export const getMajorEconomicEvents = (lang: LanguageCode): EconomicEvent[] => {
  if (lang === 'ar') {
    return [
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[0],
        date: '3 سبتمبر 2026',
        time: 'صدرت',
        country: 'الولايات المتحدة',
        event: 'طلبات إعانة البطالة الأمريكية الأسبوعية (Initial Jobless Claims)',
        whyItMatters: 'مؤشر أسبوعي عالي الوتيرة لرصد وتيرة تسريحات العمالة. أي زيادة غير متوقعة تدل على بداية تباطؤ في قطاع التوظيف الأمريكي.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[1],
        date: '3 سبتمبر 2026',
        time: 'صدرت',
        country: 'الولايات المتحدة',
        event: 'مؤشر مديري المشتريات للخدمات ISM Services PMI',
        whyItMatters: 'يقيس نبض قطاع الخدمات الذي يشكل أكثر من ثلثي النشاط الاقتصادي الأمريكي. القراءة فوق 50 تعني التوسع وتدعم استقرار أسواق الأسهم والدولار.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[2],
        date: '4 سبتمبر 2026',
        time: '12:30 UTC',
        country: 'الولايات المتحدة',
        event: 'تقرير الوظائف غير الزراعية (NFP) ومعدل البطالة الأمريكي',
        whyItMatters: 'أهم تقرير لصحة سوق العمل الأمريكي. القوة المفاجئة في الوظائف تعني ضغوطاً أجرية مستمرة وتأجيل خفض الفائدة، مما يشعل تقلبات سريعة في الفوركس والذهب.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[3],
        date: '10 سبتمبر 2026',
        time: '12:15 UTC',
        country: 'منطقة اليورو',
        event: 'قرار سعر الفائدة للبنك المركزي الأوروبي (ECB Rate Decision)',
        whyItMatters: 'يحدد السياسة النقدية لمنطقة اليورو. أي تغيير غير متوقع يؤثر بشكل مباشر على زوج EUR/USD ومؤشر الداكس الألماني GER40.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[4],
        date: '11 سبتمبر 2026',
        time: '12:30 UTC',
        country: 'الولايات المتحدة',
        event: 'مؤشر أسعار المستهلكين الأساسي للتضخم (US CPI YoY)',
        whyItMatters: 'المؤشر الحقيقي والرسمي المعتمد لقياس التضخم الاستهلاكي في الولايات المتحدة. صدور قراءة أعلى من المتوقع يدفع الفيدرالي للتشديد مما يدعم الدولار ويضغط على الذهب.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[5],
        date: '16 سبتمبر 2026',
        time: '18:00 UTC',
        country: 'الولايات المتحدة',
        event: 'بيان وقرار سعر الفائدة الصادر عن الفيدرالي الأمريكي (FOMC)',
        whyItMatters: 'يحدد سعر الفائدة تكلفة الاقتراض عالمياً وتدفق السيولة النقدية. هو المحرك الأول لقوة الدولار (DXY)، الذهب (XAUUSD)، وعوائد السندات ومؤشرات الأسهم.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[6],
        date: '17 سبتمبر 2026',
        time: '11:00 UTC',
        country: 'المملكة المتحدة',
        event: 'قرار سعر الفائدة لبنك إنجلترا (Bank of England Rate Decision)',
        whyItMatters: 'يحدد أسعار الفائدة والسياسة النقدية للجنيه الإسترليني، المؤثر الرئيسي على زوج GBP/USD ومؤشر فوتسي 100.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[7],
        date: '18 سبتمبر 2026',
        time: '03:00 UTC',
        country: 'اليابان',
        event: 'قرار الفائدة وسياسة منحنى العائد لبنك اليابان (BoJ Policy Rate)',
        whyItMatters: 'محفز رئيسي لتفكيك صفقات الين (Carry Trade). رفع الفائدة اليابانية يسبب حركات حادة في USD/JPY وموجات ارتداد في أسواق الأسهم العالمية.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[8],
        date: '24 سبتمبر 2026',
        time: '12:30 UTC',
        country: 'الولايات المتحدة',
        event: 'الناتج المحلي الإجمالي الأمريكي السنوي (US Advance GDP)',
        whyItMatters: 'المقياس الشامل لوتيرة نمو أكبر اقتصاد في العالم. النمو القوي يدعم شهية المخاطرة، بينما التباطؤ يثير مخاوف الركود وتدفق الملاذات الآمنة.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[9],
        date: '25 سبتمبر 2026',
        time: '12:30 UTC',
        country: 'الولايات المتحدة',
        event: 'مؤشر نفقات الاستهلاك الشخصي الأساسي (Core PCE Price Index)',
        whyItMatters: 'المقياس المفضل لدى الفيدرالي لمتابعة التضخم. صدور نتيجة متطابقة مع التوقعات يمنح الأسواق استقراراً مؤقتاً في توقعات خفض الفائدة.'
      }
    ];
  }

  if (lang === 'ru') {
    return [
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[0],
        date: '3 сентября 2026',
        time: 'Опубликовано',
        country: 'США',
        event: 'Первичные заявки на пособие по безработице в США (Initial Jobless Claims)',
        whyItMatters: 'Еженедельный индикатор увольнений. Рост числа заявок указывает на охлаждение американского рынка труда.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[1],
        date: '3 сентября 2026',
        time: 'Опубликовано',
        country: 'США',
        event: 'Индекс деловой активности в сфере услуг США (ISM Services PMI)',
        whyItMatters: 'Отражает состояние доминирующего сектора экономики США. Значение выше 50 пунктов подтверждает устойчивость экономики.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[2],
        date: '4 сентября 2026',
        time: '12:30 UTC',
        country: 'США',
        event: 'Количество новых рабочих мест вне с/х (NFP) и уровень безработицы',
        whyItMatters: 'Главный отчет о состоянии рынка труда США. Сильный прирост занятости сигнализирует об устойчивости экономики и вызывает резкие импульсы в валютах и золоте.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[3],
        date: '10 сентября 2026',
        time: '12:15 UTC',
        country: 'Еврозона',
        event: 'Решение ЕЦБ по базовой процентной ставке (ECB Rate Decision)',
        whyItMatters: 'Определяет стоимость кредитования в еврозоне. Главный катализатор волатильности для пары EUR/USD и немецкого индекса DAX (GER40).'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[4],
        date: '11 сентября 2026',
        time: '12:30 UTC',
        country: 'США',
        event: 'Базовый индекс потребительских цен (US CPI YoY Inflation)',
        whyItMatters: 'Официальный отчет по потребительской инфляции от BLS. Превышение прогноза вынуждает ФРС сохранять жесткость, укрепляя доллар.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[5],
        date: '16 сентября 2026',
        time: '18:00 UTC',
        country: 'США',
        event: 'Решение ФРС по процентной ставке и экономические прогнозы FOMC',
        whyItMatters: 'Определяет базовую стоимость заимствований в мировой экономике. Прямой триггер ликвидности для курса доллара (DXY), золота (XAUUSD) и акций.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[6],
        date: '17 сентября 2026',
        time: '11:00 UTC',
        country: 'Великобритания',
        event: 'Решение Банка Англии по процентной ставке (BOE Bank Rate)',
        whyItMatters: 'Определяет курс монетарной политики Великобритании и динамику фунта стерлингов (GBP/USD, EUR/GBP).'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[7],
        date: '18 сентября 2026',
        time: '03:00 UTC',
        country: 'Япония',
        event: 'Решение Банка Японии по ставке и кривой доходности (BoJ Policy Rate)',
        whyItMatters: 'Главный триггер для динамики операций carry trade с иеной. Повышение ставок вызывает мощные сдвиги в паре USD/JPY.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[8],
        date: '24 сентября 2026',
        time: '12:30 UTC',
        country: 'США',
        event: 'Предварительный ВВП США в годовом исчислении (Advance GDP)',
        whyItMatters: 'Комплексная оценка экономического роста США. Уверенный рост поддерживает спрос на акции, замедление стимулирует защитные активы.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[9],
        date: '25 сентября 2026',
        time: '12:30 UTC',
        country: 'США',
        event: 'Базовый ценовой индекс расходов на личное потребление (Core PCE)',
        whyItMatters: 'Главный ориентир инфляции для Федеральной резервной системы. Любое отклонение напрямую меняет ожидания по снижению ставок.'
      }
    ];
  }

  if (lang === 'uk') {
    return [
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[0],
        date: '3 вересня 2026',
        time: 'Опубліковано',
        country: 'США',
        event: 'Первинні заявки на допомогу з безробіття (US Jobless Claims)',
        whyItMatters: 'Щотижневий швидкий показник динаміки звільнень у США. Зростання звернень вказує на охолодження ринку праці.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[1],
        date: '3 вересня 2026',
        time: 'Опубліковано',
        country: 'США',
        event: 'Індекс ділової активності у сфері послуг США (ISM Services PMI)',
        whyItMatters: 'Ключовий індикатор сфери послуг, яка формує понад 70% економіки США. Показник вище 50 сигналізує про стійке зростання.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[2],
        date: '4 вересня 2026',
        time: '12:30 UTC',
        country: 'США',
        event: 'Кількість нових робочих місць (NFP) та рівень безробіття в США',
        whyItMatters: 'Головний місячний звіт ринку праці США. Сильний приріст свідчить про стійкість економіки та провокує швидке перепозиціонування на ринках.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[3],
        date: '10 вересня 2026',
        time: '12:15 UTC',
        country: 'Єврозона',
        event: 'Рішення ЄЦБ щодо базової процентної ставки (ECB Rate Decision)',
        whyItMatters: 'Визначає монетарні умови у Єврозоні. Першочерговий катализатор волатильності для курсу EUR/USD та німецького індексу DAX (GER40).'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[4],
        date: '11 вересня 2026',
        time: '12:30 UTC',
        country: 'США',
        event: 'Індекс споживчих цін США (US CPI YoY Inflation)',
        whyItMatters: 'Офіційний місячний звіт споживчої інфляції від BLS. Вищі за прогноз цифри стимулюють посилення долара США та тиск на золото.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[5],
        date: '16 вересня 2026',
        time: '18:00 UTC',
        country: 'США',
        event: 'Рішення ФРС США щодо процентної ставки та пресконференція FOMC',
        whyItMatters: 'Формує вартість запозичень для всієї глобальної фінансової системи. Безпосередньо спрямовує рух долара, золота та індексів.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[6],
        date: '17 вересня 2026',
        time: '11:00 UTC',
        country: 'Велика Британія',
        event: 'Рішення Банку Англії щодо базової ставки (BOE Bank Rate)',
        whyItMatters: 'Визначає вартість запозичень фунта стерлінгів та задає тренд для котирувань пари GBP/USD та індексу FTSE 100.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[7],
        date: '18 вересня 2026',
        time: '03:00 UTC',
        country: 'Японія',
        event: 'Рішення Банку Японії щодо відсоткової ставки (BoJ Policy Rate)',
        whyItMatters: 'Головний тригер згортання операцій carry trade з ієною. Зміна курсу політики спричиняє потужні коливання в USD/JPY та світових активах.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[8],
        date: '24 вересня 2026',
        time: '12:30 UTC',
        country: 'США',
        event: 'Попередній ВВП США у річному обчисленні (Advance GDP)',
        whyItMatters: 'Комплексна оцінка економічного зростання США. Позитивні дані підтримують фондові індекси, уповільнення активує попит на захисні активи.'
      },
      {
        ...VERIFIED_ECONOMIC_SCHEDULE[9],
        date: '25 вересня 2026',
        time: '12:30 UTC',
        country: 'США',
        event: 'Базовий ціновий індекс витрат на особисте споживання (Core PCE)',
        whyItMatters: 'Пріоритетний індикатор інфляції для Федеральної резервної системи. Визначає подальшу траєкторію пом’якшення політики.'
      }
    ];
  }

  // English (default)
  return [
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[0],
      date: 'Sep 3, 2026',
      time: 'Released',
      country: 'United States',
      event: 'US Initial Jobless Claims (Weekly Filings)',
      whyItMatters: 'High-frequency weekly pulse on US layoffs. Significant unexpected surges indicate early cracks in aggregate employment conditions.'
    },
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[1],
      date: 'Sep 3, 2026',
      time: 'Released',
      country: 'United States',
      event: 'US ISM Services PMI (Non-Manufacturing)',
      whyItMatters: 'Barometer for the services sector which accounts for over 70% of the US economy. Readings above 50 demonstrate economic expansion.'
    },
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[2],
      date: 'Sep 4, 2026',
      time: '12:30 UTC',
      country: 'United States',
      event: 'Non-Farm Payrolls (NFP) & US Unemployment Rate',
      whyItMatters: 'Primary monthly pulse of US labor market health. Strong payroll expansion signals robust demand and persistent wage pressures, triggering rapid repricing across interest rate futures, gold, and FX pairs.'
    },
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[3],
      date: 'Sep 10, 2026',
      time: '12:15 UTC',
      country: 'Eurozone',
      event: 'ECB Main Refinancing Operations Rate Decision',
      whyItMatters: 'Determines the lending rate for the Eurozone economy. Signals policy divergence between the ECB and Federal Reserve, acting as the primary catalyst for EUR/USD and DAX 40.'
    },
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[4],
      date: 'Sep 11, 2026',
      time: '12:30 UTC',
      country: 'United States',
      event: 'US Consumer Price Index (CPI YoY & Core MoM)',
      whyItMatters: 'The official premier barometer for consumer inflation. Higher-than-expected readings force the Fed to maintain tight policy, boosting the Dollar while heavily pressuring risk assets, index futures, and gold.'
    },
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[5],
      date: 'Sep 16, 2026',
      time: '18:00 UTC',
      country: 'United States',
      event: 'FOMC Interest Rate Decision & Economic Projections (SEP)',
      whyItMatters: 'Sets the benchmark cost of borrowing for the global economy. Directly dictates liquidity flows, shaping the trajectory of the US Dollar (DXY), Gold (XAUUSD), Treasury yields, and equity valuations.'
    },
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[6],
      date: 'Sep 17, 2026',
      time: '11:00 UTC',
      country: 'United Kingdom',
      event: 'Bank of England (BOE) Official Bank Rate Decision',
      whyItMatters: 'Sets benchmark interest rate for the British Pound, dictating market expectations for UK inflation, gilts, GBP/USD, and the FTSE 100.'
    },
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[7],
      date: 'Sep 18, 2026',
      time: '03:00 UTC',
      country: 'Japan',
      event: 'Bank of Japan Policy Rate & Yield Framework',
      whyItMatters: 'Catalyst for global yen carry-trade unwinds. Shifts in BoJ policy trigger massive cross-border capital repatriation, impacting USD/JPY, global yields, and US equities.'
    },
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[8],
      date: 'Sep 24, 2026',
      time: '12:30 UTC',
      country: 'United States',
      event: 'US Advance GDP Annualized Growth Rate',
      whyItMatters: 'Comprehensive scorecard of US economic expansion or contraction. Outperformance signals macroeconomic resilience, while contractions fuel safe-haven capital rotation.'
    },
    {
      ...VERIFIED_ECONOMIC_SCHEDULE[9],
      date: 'Sep 25, 2026',
      time: '12:30 UTC',
      country: 'United States',
      event: 'Core PCE Price Index MoM & YoY (Fed’s Preferred Gauge)',
      whyItMatters: 'The Federal Reserve’s officially preferred inflation indicator, stripped of volatile food and energy. Any deviation directly recalibrates futures-implied probabilities for upcoming policy cuts.'
    }
  ];
};
