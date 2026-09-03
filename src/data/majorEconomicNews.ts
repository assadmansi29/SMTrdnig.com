import { EconomicEvent } from '../types';
import { LanguageCode } from '../locales';

// Generates dynamic timestamps anchored to session start so every status state
// (LIVE, Approaching Warning, Released, and Upcoming Countdowns) is interactive & live.
export const getMajorEconomicEvents = (lang: LanguageCode, anchorNow?: number): EconomicEvent[] => {
  const now = anchorNow || Date.now();

  // Timing offsets:
  // Event 1: LIVE right now (started 4 minutes ago, ends at +11 mins)
  const timeLive = now - 4 * 60 * 1000;
  // Event 2: Approaching (in 22 minutes, triggers clear approaching warning!)
  const timeApproaching = now + 22 * 60 * 1000 + 45 * 1000;
  // Event 3: Released (45 minutes ago)
  const timeReleased = now - 50 * 60 * 1000;
  // Event 4: Upcoming in ~3.5 hours
  const timeUpcoming1 = now + 3.5 * 3600 * 1000;
  // Event 5: Upcoming tomorrow (+24 hours)
  const timeUpcomingTomorrow = now + 24 * 3600 * 1000;
  // Event 6: Upcoming in 2 days
  const timeUpcoming2Days = now + 48 * 3600 * 1000;
  // Event 7: Upcoming in 3 days
  const timeUpcoming3Days = now + 72 * 3600 * 1000;
  // Event 8: Upcoming in 4 days
  const timeUpcoming4Days = now + 96 * 3600 * 1000;

  if (lang === 'ar') {
    return [
      {
        id: 'news-live',
        timestamp: timeLive,
        date: 'اليوم',
        time: 'مباشر الآن',
        country: 'الولايات المتحدة',
        countryCode: 'US',
        event: 'بيان وقرار سعر الفائدة الصادر عن الفيدرالي الأمريكي (FOMC)',
        category: 'Central Bank',
        impact: 'Extreme',
        forecast: '5.00%',
        previous: '5.25%',
        actual: '5.00%',
        whyItMatters: 'يحدد سعر الفائدة تكلفة الاقتراض عالمياً وتدفق السيولة النقدية. هو المحرك الأول لقوة الدولار (DXY)، الذهب (XAUUSD)، وعوائد السندات ومؤشرات الأسهم.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30', 'US10Y']
      },
      {
        id: 'news-approaching',
        timestamp: timeApproaching,
        date: 'اليوم',
        time: 'قريباً',
        country: 'الولايات المتحدة',
        countryCode: 'US',
        event: 'مؤشر أسعار المستهلكين الأساسي للتضخم (CPI YoY)',
        category: 'Inflation',
        impact: 'Extreme',
        forecast: '2.7%',
        previous: '2.9%',
        actual: undefined,
        whyItMatters: 'المؤشر الرئيسي لقياس التضخم الاستهلاكي. صدور قراءة أعلى من المتوقع يدفع الفيدرالي لتشديد الفائدة مما يعزز الدولار ويضغط بقوة على الذهب والأسهم.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'SPX500']
      },
      {
        id: 'news-released',
        timestamp: timeReleased,
        date: 'اليوم',
        time: 'صدرت مؤخراً',
        country: 'الولايات المتحدة',
        countryCode: 'US',
        event: 'مؤشر نفقات الاستهلاك الشخصي الأساسي (Core PCE Price Index)',
        category: 'Inflation',
        impact: 'High',
        forecast: '0.2%',
        previous: '0.2%',
        actual: '0.2%',
        whyItMatters: 'المقياس المفضل لدى الفيدرالي لمتابعة التضخم. صدور نتيجة متطابقة مع التوقعات يمنح الأسواق استقراراً مؤقتاً في توقعات خفض الفائدة.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US10Y']
      },
      {
        id: 'news-nfp',
        timestamp: timeUpcoming1,
        date: 'اليوم',
        time: 'مساءً',
        country: 'الولايات المتحدة',
        countryCode: 'US',
        event: 'تقرير الوظائف غير الزراعية (NFP) ومعدل البطالة',
        category: 'Employment',
        impact: 'Extreme',
        forecast: '165K',
        previous: '142K',
        actual: undefined,
        whyItMatters: 'أهم تقرير لصحة سوق العمل الأمريكي. القوة المفاجئة في الوظائف تعني ضغوطاً أجرية مستمرة وتأجيل خفض الفائدة، مما يشعل تقلبات سريعة في الفوركس والذهب.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30']
      },
      {
        id: 'news-ecb',
        timestamp: timeUpcomingTomorrow,
        date: 'غداً',
        time: 'ظهراً',
        country: 'منطقة اليورو',
        countryCode: 'EU',
        event: 'قرار سعر الفائدة للبنك المركزي الأوروبي (ECB Rate Decision)',
        category: 'Central Bank',
        impact: 'High',
        forecast: '3.50%',
        previous: '3.75%',
        actual: undefined,
        whyItMatters: 'يحدد السياسة النقدية لمنطقة اليورو. أي تغيير غير متوقع يؤثر بشكل مباشر على زوج EUR/USD ومؤشر الداكس الألماني GER40.',
        affectedAssets: ['EURUSD', 'GER40', 'EURGBP']
      },
      {
        id: 'news-gdp',
        timestamp: timeUpcoming2Days,
        date: 'خلال يومين',
        time: 'صباحاً',
        country: 'الولايات المتحدة',
        countryCode: 'US',
        event: 'الناتج المحلي الإجمالي الأمريكي السنوي (US Advance GDP)',
        category: 'Growth',
        impact: 'High',
        forecast: '3.0%',
        previous: '2.8%',
        actual: undefined,
        whyItMatters: 'المقياس الشامل لوتيرة نمو أكبر اقتصاد في العالم. النمو القوي يدعم شهية المخاطرة، بينما التباطؤ يثير مخاوف الركود وتدفق الملاذات الآمنة.',
        affectedAssets: ['SPX500', 'NAS100', 'USD', 'US30']
      },
      {
        id: 'news-boj',
        timestamp: timeUpcoming3Days,
        date: 'خلال 3 أيام',
        time: 'فجراً',
        country: 'اليابان',
        countryCode: 'JP',
        event: 'قرار الفائدة وسياسة منحنى العائد لبنك اليابان (BoJ Policy Rate)',
        category: 'Central Bank',
        impact: 'Extreme',
        forecast: '0.25%',
        previous: '0.25%',
        actual: undefined,
        whyItMatters: 'محفز رئيسي لتفكيك صفقات الين (Carry Trade). رفع الفائدة اليابانية يسبب حركات حادة في USD/JPY وموجات ارتداد في أسواق الأسهم العالمية.',
        affectedAssets: ['USDJPY', 'JP225', 'Global Risk Assets']
      },
      {
        id: 'news-claims',
        timestamp: timeUpcoming4Days,
        date: 'خلال 4 أيام',
        time: 'ظهراً',
        country: 'الولايات المتحدة',
        countryCode: 'US',
        event: 'طلبات إعانة البطالة الأمريكية الأسبوعية (Initial Jobless Claims)',
        category: 'Employment',
        impact: 'Low',
        forecast: '230K',
        previous: '228K',
        actual: undefined,
        whyItMatters: 'مؤشر أسبوعي عالي الوتيرة لرصد تسريحات العمالة. الارتفاع الحاد يشير لبداية تباطؤ في قطاع التوظيف الأمريكي.',
        affectedAssets: ['USD', 'US Treasuries']
      }
    ];
  }

  if (lang === 'ru') {
    return [
      {
        id: 'news-live',
        timestamp: timeLive,
        date: 'Сегодня',
        time: 'В прямом эфире',
        country: 'США',
        countryCode: 'US',
        event: 'Решение ФРС по процентной ставке и заявление FOMC',
        category: 'Central Bank',
        impact: 'Extreme',
        forecast: '5.00%',
        previous: '5.25%',
        actual: '5.00%',
        whyItMatters: 'Определяет базовую стоимость заимствований в мировой экономике. Прямой триггер ликвидности для курса доллара (DXY), золота (XAUUSD), доходностей трежерис и индексов.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30', 'US10Y']
      },
      {
        id: 'news-approaching',
        timestamp: timeApproaching,
        date: 'Сегодня',
        time: 'Скоро',
        country: 'США',
        countryCode: 'US',
        event: 'Базовый индекс потребительских цен (CPI YoY)',
        category: 'Inflation',
        impact: 'Extreme',
        forecast: '2.7%',
        previous: '2.9%',
        actual: undefined,
        whyItMatters: 'Ключевой показатель потребительской инфляции. Превышение прогноза вынуждает ФРС держать жесткую политику, что укрепляет доллар и оказывает давление на золото и акции.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'SPX500']
      },
      {
        id: 'news-released',
        timestamp: timeReleased,
        date: 'Сегодня',
        time: 'Недавно',
        country: 'США',
        countryCode: 'US',
        event: 'Базовый ценовой индекс расходов на потребление (Core PCE)',
        category: 'Inflation',
        impact: 'High',
        forecast: '0.2%',
        previous: '0.2%',
        actual: '0.2%',
        whyItMatters: 'Главный индикатор инфляции по версии Федерального резерва. Отклонение от ожиданий мгновенно корректирует вероятности снижения ставки.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US10Y']
      },
      {
        id: 'news-nfp',
        timestamp: timeUpcoming1,
        date: 'Сегодня',
        time: 'Вечер',
        country: 'США',
        countryCode: 'US',
        event: 'Количество новых рабочих мест вне с/х (NFP) и уровень безработицы',
        category: 'Employment',
        impact: 'Extreme',
        forecast: '165K',
        previous: '142K',
        actual: undefined,
        whyItMatters: 'Главный отчет о состоянии рынка труда США. Сильный прирост занятости сигнализирует об устойчивости экономики и вызывает резкие импульсы в валютах и золоте.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30']
      },
      {
        id: 'news-ecb',
        timestamp: timeUpcomingTomorrow,
        date: 'Завтра',
        time: 'День',
        country: 'Еврозона',
        countryCode: 'EU',
        event: 'Решение ЕЦБ по базовой процентной ставке',
        category: 'Central Bank',
        impact: 'High',
        forecast: '3.50%',
        previous: '3.75%',
        actual: undefined,
        whyItMatters: 'Определяет стоимость кредитования в еврозоне. Главный катализатор волатильности для пары EUR/USD и немецкого индекса DAX (GER40).',
        affectedAssets: ['EURUSD', 'GER40', 'EURGBP']
      },
      {
        id: 'news-gdp',
        timestamp: timeUpcoming2Days,
        date: 'Через 2 дня',
        time: 'Утро',
        country: 'США',
        countryCode: 'US',
        event: 'Предварительный ВВП США в годовом исчислении (Advance GDP)',
        category: 'Growth',
        impact: 'High',
        forecast: '3.0%',
        previous: '2.8%',
        actual: undefined,
        whyItMatters: 'Итоговая оценка темпов роста американской экономики. Высокий рост поддерживает риск-аппетит, замедление стимулирует переход в защитные активы.',
        affectedAssets: ['SPX500', 'NAS100', 'USD', 'US30']
      },
      {
        id: 'news-boj',
        timestamp: timeUpcoming3Days,
        date: 'Через 3 дня',
        time: 'Ночь',
        country: 'Япония',
        countryCode: 'JP',
        event: 'Решение Банка Японии по процентной ставке (BoJ Policy Rate)',
        category: 'Central Bank',
        impact: 'Extreme',
        forecast: '0.25%',
        previous: '0.25%',
        actual: undefined,
        whyItMatters: 'Ключевой фактор сворачивания операций carry trade с иеной. Повышение ставки вызывает мощную турбулентность в паре USD/JPY и фондовых индексах.',
        affectedAssets: ['USDJPY', 'JP225', 'Global Risk Assets']
      },
      {
        id: 'news-claims',
        timestamp: timeUpcoming4Days,
        date: 'Через 4 дня',
        time: 'День',
        country: 'США',
        countryCode: 'US',
        event: 'Число первичных заявок на пособие по безработице (Jobless Claims)',
        category: 'Employment',
        impact: 'Low',
        forecast: '230K',
        previous: '227K',
        actual: undefined,
        whyItMatters: 'Еженедельный оперативный пульс увольнений. Рост заявок сигнализирует о постепенном охлаждении рынка труда США.',
        affectedAssets: ['USD', 'US Treasuries']
      }
    ];
  }

  if (lang === 'uk') {
    return [
      {
        id: 'news-live',
        timestamp: timeLive,
        date: 'Сьогодні',
        time: 'Наживо',
        country: 'США',
        countryCode: 'US',
        event: 'Рішення ФРС щодо процентної ставки та заява FOMC',
        category: 'Central Bank',
        impact: 'Extreme',
        forecast: '5.00%',
        previous: '5.25%',
        actual: '5.00%',
        whyItMatters: 'Визначає базову вартість запозичень у глобальній економіці. Головний драйвер для долара США (DXY), золота (XAUUSD), дохідностей держоблігацій та індексів.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30', 'US10Y']
      },
      {
        id: 'news-approaching',
        timestamp: timeApproaching,
        date: 'Сьогодні',
        time: 'Скоро',
        country: 'США',
        countryCode: 'US',
        event: 'Базовий індекс споживчих цін (CPI YoY)',
        category: 'Inflation',
        impact: 'Extreme',
        forecast: '2.7%',
        previous: '2.9%',
        actual: undefined,
        whyItMatters: 'Головний барометр споживчої інфляції. Перевищення прогнозу змушує ФРС утримувати високі ставки, підсилюючи долар та створюючи тиск на золото та акції.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'SPX500']
      },
      {
        id: 'news-released',
        timestamp: timeReleased,
        date: 'Сьогодні',
        time: 'Нещодавно',
        country: 'США',
        countryCode: 'US',
        event: 'Базовий індекс цін на особисте споживання (Core PCE)',
        category: 'Inflation',
        impact: 'High',
        forecast: '0.2%',
        previous: '0.2%',
        actual: '0.2%',
        whyItMatters: 'Улюблений показник інфляції Федерального резерву. Відхилення від прогнозів безпосередньо впливає на очікування щодо зміни відсоткових ставок.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US10Y']
      },
      {
        id: 'news-nfp',
        timestamp: timeUpcoming1,
        date: 'Сьогодні',
        time: 'Вечір',
        country: 'США',
        countryCode: 'US',
        event: 'Кількість нових робочих місць (NFP) та рівень безробіття',
        category: 'Employment',
        impact: 'Extreme',
        forecast: '165K',
        previous: '142K',
        actual: undefined,
        whyItMatters: 'Головний місячний звіт ринку праці США. Сильний приріст свідчить про стійкість економіки та провокує швидке перепозиціонування на ринках.',
        affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30']
      },
      {
        id: 'news-ecb',
        timestamp: timeUpcomingTomorrow,
        date: 'Завтра',
        time: 'День',
        country: 'Єврозона',
        countryCode: 'EU',
        event: 'Рішення ЄЦБ щодо базової процентної ставки',
        category: 'Central Bank',
        impact: 'High',
        forecast: '3.50%',
        previous: '3.75%',
        actual: undefined,
        whyItMatters: 'Визначає монетарні умови у Єврозоні. Першочерговий катализатор волатильності для курсу EUR/USD та німецького індексу DAX (GER40).',
        affectedAssets: ['EURUSD', 'GER40', 'EURGBP']
      },
      {
        id: 'news-gdp',
        timestamp: timeUpcoming2Days,
        date: 'Через 2 дні',
        time: 'Ранок',
        country: 'США',
        countryCode: 'US',
        event: 'Попередній ВВП США у річному обчисленні (Advance GDP)',
        category: 'Growth',
        impact: 'High',
        forecast: '3.0%',
        previous: '2.8%',
        actual: undefined,
        whyItMatters: 'Комплексна оцінка економічного зростання США. Позитивні дані підтримують фондові індекси, уповільнення активує попит на захисні активи.',
        affectedAssets: ['SPX500', 'NAS100', 'USD', 'US30']
      },
      {
        id: 'news-boj',
        timestamp: timeUpcoming3Days,
        date: 'Через 3 дні',
        time: 'Ніч',
        country: 'Японія',
        countryCode: 'JP',
        event: 'Рішення Банку Японії щодо відсоткової ставки (BoJ Policy Rate)',
        category: 'Central Bank',
        impact: 'Extreme',
        forecast: '0.25%',
        previous: '0.25%',
        actual: undefined,
        whyItMatters: 'Головний тригер згортання операцій carry trade з ієною. Зміна курсу політики спричиняє потужні коливання в USD/JPY та світових активах.',
        affectedAssets: ['USDJPY', 'JP225', 'Global Risk Assets']
      },
      {
        id: 'news-claims',
        timestamp: timeUpcoming4Days,
        date: 'Через 4 дні',
        time: 'День',
        country: 'США',
        countryCode: 'US',
        event: 'Первинні заявки на допомогу з безробіття (Jobless Claims)',
        category: 'Employment',
        impact: 'Low',
        forecast: '230K',
        previous: '227K',
        actual: undefined,
        whyItMatters: 'Щотижневий швидкий показник звільнень. Стрибок кількості звернень вказує на охолодження зайнятості в США.',
        affectedAssets: ['USD', 'US Treasuries']
      }
    ];
  }

  // English default
  return [
    {
      id: 'news-live',
      timestamp: timeLive,
      date: 'Today',
      time: 'Live Now',
      country: 'United States',
      countryCode: 'US',
      event: 'FOMC Interest Rate Decision & Monetary Statement',
      category: 'Central Bank',
      impact: 'Extreme',
      forecast: '5.00%',
      previous: '5.25%',
      actual: '5.00%',
      whyItMatters: 'Sets the benchmark cost of borrowing for the global economy. Directly dictates liquidity flows, shaping the trajectory of the US Dollar (DXY), Gold (XAUUSD), Treasury yields, and equity valuations.',
      affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30', 'US10Y']
    },
    {
      id: 'news-approaching',
      timestamp: timeApproaching,
      date: 'Today',
      time: 'Approaching',
      country: 'United States',
      countryCode: 'US',
      event: 'US Core CPI (Consumer Price Index) Inflation (YoY)',
      category: 'Inflation',
      impact: 'Extreme',
      forecast: '2.7%',
      previous: '2.9%',
      actual: undefined,
      whyItMatters: 'The premier barometer for consumer inflation. Higher-than-expected readings force the Fed to maintain tight policy, boosting the Dollar while heavily pressuring risk assets, index futures, and gold.',
      affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'SPX500']
    },
    {
      id: 'news-released',
      timestamp: timeReleased,
      date: 'Today',
      time: 'Recent',
      country: 'United States',
      countryCode: 'US',
      event: 'Core PCE Price Index MoM & YoY (Fed’s Preferred Gauge)',
      category: 'Inflation',
      impact: 'High',
      forecast: '0.2%',
      previous: '0.2%',
      actual: '0.2%',
      whyItMatters: 'The Federal Reserve’s officially preferred inflation indicator, stripped of volatile food and energy. Any deviation directly recalibrates futures-implied probabilities for upcoming policy cuts.',
      affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US10Y']
    },
    {
      id: 'news-nfp',
      timestamp: timeUpcoming1,
      date: 'Today',
      time: 'Upcoming Session',
      country: 'United States',
      countryCode: 'US',
      event: 'Non-Farm Payrolls (NFP) & US Unemployment Rate',
      category: 'Employment',
      impact: 'Extreme',
      forecast: '165K',
      previous: '142K',
      actual: undefined,
      whyItMatters: 'Primary monthly pulse of US labor market health. Strong payroll expansion signals robust demand and persistent wage pressures, triggering rapid repricing across interest rate futures and FX pairs.',
      affectedAssets: ['USD', 'XAUUSD', 'NAS100', 'US30']
    },
    {
      id: 'news-ecb',
      timestamp: timeUpcomingTomorrow,
      date: 'Tomorrow',
      time: 'Midday',
      country: 'Eurozone',
      countryCode: 'EU',
      event: 'ECB Main Refinancing Operations Rate Decision',
      category: 'Central Bank',
      impact: 'High',
      forecast: '3.50%',
      previous: '3.75%',
      actual: undefined,
      whyItMatters: 'Determines the lending rate for the Eurozone economy. Signals policy divergence between the ECB and Federal Reserve, acting as the primary catalyst for EUR/USD and DAX 40.',
      affectedAssets: ['EURUSD', 'GER40', 'EURGBP']
    },
    {
      id: 'news-gdp',
      timestamp: timeUpcoming2Days,
      date: 'In 2 Days',
      time: 'Morning',
      country: 'United States',
      countryCode: 'US',
      event: 'US Advance GDP Annualized Growth Rate',
      category: 'Growth',
      impact: 'High',
      forecast: '3.0%',
      previous: '2.8%',
      actual: undefined,
      whyItMatters: 'Comprehensive scorecard of US economic expansion or contraction. Outperformance signals macroeconomic resilience, while contractions fuel safe-haven capital rotation.',
      affectedAssets: ['SPX500', 'NAS100', 'US30', 'USD']
    },
    {
      id: 'news-boj',
      timestamp: timeUpcoming3Days,
      date: 'In 3 Days',
      time: 'Overnight',
      country: 'Japan',
      countryCode: 'JP',
      event: 'Bank of Japan Policy Rate & Yield Framework',
      category: 'Central Bank',
      impact: 'Extreme',
      forecast: '0.25%',
      previous: '0.25%',
      actual: undefined,
      whyItMatters: 'Catalyst for global yen carry-trade unwinds. Shifts in BoJ policy trigger massive cross-border capital repatriation, impacting USD/JPY, global yields, and US equities.',
      affectedAssets: ['USDJPY', 'JP225', 'Global Risk Assets']
    },
    {
      id: 'news-claims',
      timestamp: timeUpcoming4Days,
      date: 'In 4 Days',
      time: 'Midday',
      country: 'United States',
      countryCode: 'US',
      event: 'US Initial Jobless Claims (Weekly Filings)',
      category: 'Employment',
      impact: 'Low',
      forecast: '230K',
      previous: '227K',
      actual: undefined,
      whyItMatters: 'High-frequency weekly pulse on US layoffs. Significant unexpected surges indicate early cracks in aggregate employment conditions.',
      affectedAssets: ['USD', 'US Treasuries']
    }
  ];
};
