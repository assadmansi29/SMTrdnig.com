import { LiveCountdown } from './economicCalendarUtils';

interface TranslationMap {
  [key: string]: {
    ar: string;
    ru: string;
    uk: string;
  };
}

const EVENT_TRANSLATIONS: TranslationMap = {
  'cpi': {
    ar: 'مؤشر أسعار المستهلكين (CPI)',
    ru: 'Индекс потребительских цен (ИПЦ)',
    uk: 'Індекс споживчих цін (ІСЦ)'
  },
  'core cpi': {
    ar: 'مؤشر أسعار المستهلكين الأساسي (Core CPI)',
    ru: 'Базовый индекс потребительских цен (Core CPI)',
    uk: 'Базовий індекс споживчих цін (Core CPI)'
  },
  'nonfarm payrolls': {
    ar: 'تقرير التوظيف بغير القطاع الزراعي (NFP)',
    ru: 'Число занятых вне с/х (NFP)',
    uk: 'Кількість робочих місць поза с/г (NFP)'
  },
  'non-farm payrolls': {
    ar: 'تقرير التوظيف بغير القطاع الزراعي (NFP)',
    ru: 'Число занятых вне с/х (NFP)',
    uk: 'Кількість робочих місць поза с/г (NFP)'
  },
  'nonfarm employment change': {
    ar: 'تغير التوظيف بالقطاع غير الزراعي (NFP)',
    ru: 'Изменение числа занятых вне с/х (NFP)',
    uk: 'Зміна кількості робочих місць поза с/г (NFP)'
  },
  'unemployment rate': {
    ar: 'معدل البطالة',
    ru: 'Уровень безработицы',
    uk: 'Рівень безробіття'
  },
  'fed interest rate decision': {
    ar: 'قرار الفائدة الفيدرالية الأمريكية',
    ru: 'Решение ФРС по процентной ставке',
    uk: 'Рішення ФРС щодо процентної ставки'
  },
  'interest rate decision': {
    ar: 'قرار سعر الفائدة',
    ru: 'Решение по процентной ставке',
    uk: 'Рішення щодо процентної ставки'
  },
  'rate decision': {
    ar: 'قرار سعر الفائدة',
    ru: 'Решение по процентной ставке',
    uk: 'Рішення щодо процентної ставки'
  },
  'fomc statement': {
    ar: 'بيان لجنة السوق المفتوحة الفيدرالية (FOMC)',
    ru: 'Заявление FOMC',
    uk: 'Заява FOMC'
  },
  'fomc press conference': {
    ar: 'المؤتمر الصحفي للجنة الفيدرالية (FOMC)',
    ru: 'Пресс-конференция FOMC',
    uk: 'Прес-конференція FOMC'
  },
  'fomc economic projections': {
    ar: 'التوقعات الاقتصادية للفيدرالي (FOMC)',
    ru: 'Экономические прогнозы FOMC',
    uk: 'Економічні прогнози FOMC'
  },
  'gdp': {
    ar: 'الناتج المحلي الإجمالي (GDP)',
    ru: 'Валовой внутренний продукт (ВВП)',
    uk: 'Валовий внутрішній продукт (ВВП)'
  },
  'gross domestic product': {
    ar: 'الناتج المحلي الإجمالي (GDP)',
    ru: 'Валовой внутренний продукт (ВВП)',
    uk: 'Валовий внутрішній продукт (ВВП)'
  },
  'ppi': {
    ar: 'مؤشر أسعار المنتجين (PPI)',
    ru: 'Индекс цен производителей (PPI)',
    uk: 'Індекс цін виробників (PPI)'
  },
  'core ppi': {
    ar: 'مؤشر أسعار المنتجين الأساسي',
    ru: 'Базовый индекс цен производителей (PPI)',
    uk: 'Базовий індекс цін виробників (PPI)'
  },
  'retail sales': {
    ar: 'مبيعات التجزئة',
    ru: 'Розничные продажи',
    uk: 'Роздрібні продажі'
  },
  'core retail sales': {
    ar: 'مبيعات التجزئة الأساسية',
    ru: 'Базовый индекс розничных продаж',
    uk: 'Базовий індекс роздрібних продажів'
  },
  'initial jobless claims': {
    ar: 'طلبات إعانة البطالة الأولية',
    ru: 'Первичные заявки на пособие по безработице',
    uk: 'Первинні заявки на допомогу з безробіття'
  },
  'jobless claims': {
    ar: 'طلبات إعانة البطالة',
    ru: 'Заявки на пособие по безработице',
    uk: 'Заявки на допомогу з безробіття'
  },
  'continuing jobless claims': {
    ar: 'طلبات إعانة البطالة المستمرة',
    ru: 'Повторные заявки на пособие по безработице',
    uk: 'Повторні заявки на допомогу з безробіття'
  },
  'core pce price index': {
    ar: 'مؤشر نفقات الاستهلاك الشخصي الأساسي (PCE)',
    ru: 'Базовый ценовой индекс PCE',
    uk: 'Базовий ціновий індекс PCE'
  },
  'pce price index': {
    ar: 'مؤشر نفقات الاستهلاك الشخصي (PCE)',
    ru: 'Ценовой индекс PCE',
    uk: 'Ціновий індекс PCE'
  },
  'ism manufacturing pmi': {
    ar: 'مؤشر مديري المشتريات الصناعي ISM',
    ru: 'Индекс деловой активности в производстве ISM',
    uk: 'Індекс ділової активності у виробництві ISM'
  },
  'ism services pmi': {
    ar: 'مؤشر مديري المشتريات للخدمات ISM',
    ru: 'Индекс деловой активности в сфере услуг ISM',
    uk: 'Індекс ділової активності у сфері послуг ISM'
  },
  'manufacturing pmi': {
    ar: 'مؤشر مديري المشتريات التصنيعي',
    ru: 'Индекс производственной активности (PMI)',
    uk: 'Індекс виробничої активності (PMI)'
  },
  'services pmi': {
    ar: 'مؤشر مديري مشتريات قطاع الخدمات',
    ru: 'Индекс деловой активности в сфере услуг (PMI)',
    uk: 'Індекс ділової активності у сфері послуг (PMI)'
  },
  'crude oil inventories': {
    ar: 'مخزونات النفط الخام الأمريكية (EIA)',
    ru: 'Запасы сырой нефти (EIA)',
    uk: 'Запаси сирої нафти (EIA)'
  },
  'trade balance': {
    ar: 'الميزان التجاري',
    ru: 'Торговый баланс',
    uk: 'Торговельний баланс'
  },
  'building permits': {
    ar: 'تصاريح البناء',
    ru: 'Разрешения на строительство',
    uk: 'Дозволи на будівництво'
  },
  'housing starts': {
    ar: 'مشاريع الإسكان الجديدة',
    ru: 'Объемы начатого строительства жилья',
    uk: 'Обсяги розпочатого будівництва житла'
  },
  'consumer confidence': {
    ar: 'مؤشر ثقة المستهلك',
    ru: 'Индекс доверия потребителей',
    uk: 'Індекс довіри споживачів'
  },
  'michigan consumer sentiment': {
    ar: 'مؤشر ثقة المستهلك لجامعة ميشيغان',
    ru: 'Индекс настроения потребителей Мичигана',
    uk: 'Індекс настроїв споживачів Мічигану'
  },
  'ecb interest rate decision': {
    ar: 'قرار الفائدة للمركزي الأوروبي (ECB)',
    ru: 'Решение ЕЦБ по процентной ставке',
    uk: 'Рішення ЄЦБ щодо процентної ставки'
  },
  'boe interest rate decision': {
    ar: 'قرار الفائدة لبنك إنجلترا (BOE)',
    ru: 'Решение Банка Англии по ставке',
    uk: 'Рішення Банку Англії щодо ставки'
  },
  'boj interest rate decision': {
    ar: 'قرار الفائدة لبنك اليابان (BOJ)',
    ru: 'Решение Банка Японии по ставке',
    uk: 'Рішення Банку Японії щодо ставки'
  },
  'snb interest rate decision': {
    ar: 'قرار الفائدة للبنك الوطني السويسري (SNB)',
    ru: 'Решение ШНБ по процентной ставке',
    uk: 'Рішення ШНБ щодо процентної ставки'
  },
  'rba interest rate decision': {
    ar: 'قرار الفائدة للمركزي الأسترالي (RBA)',
    ru: 'Решение РБА по процентной ставке',
    uk: 'Рішення РБА щодо процентної ставки'
  },
  'boc interest rate decision': {
    ar: 'قرار الفائدة لبنك كندا (BOC)',
    ru: 'Решение Банка Канады по ставке',
    uk: 'Рішення Банку Канади щодо ставки'
  },
  'jackson hole symposium': {
    ar: 'ندوة جاكسون هول الاقتصادية',
    ru: 'Экономический симпозиум в Джексон-Хоул',
    uk: 'Економічний симпозіум у Джексон-Гоул'
  },
  'opec meeting': {
    ar: 'اجتماع منظمة أوبك (OPEC)',
    ru: 'Заседание ОПЕК (OPEC)',
    uk: 'Засідання ОПЕК (OPEC)'
  },
  'adp nonfarm employment change': {
    ar: 'تقرير التوظيف بالقطاع الخاص (ADP)',
    ru: 'Изменение числа занятых от ADP',
    uk: 'Зміна зайнятості від ADP'
  }
};

const COUNTRY_TRANSLATIONS: TranslationMap = {
  'united states': { ar: 'الولايات المتحدة', ru: 'США', uk: 'США' },
  'us': { ar: 'الولايات المتحدة', ru: 'США', uk: 'США' },
  'usa': { ar: 'الولايات المتحدة', ru: 'США', uk: 'США' },
  'eurozone': { ar: 'منطقة اليورو', ru: 'Еврозона', uk: 'Єврозона' },
  'euro zone': { ar: 'منطقة اليورو', ru: 'Еврозона', uk: 'Єврозона' },
  'european union': { ar: 'الاتحاد الأوروبي', ru: 'Европейский Союз', uk: 'Європейський Союз' },
  'germany': { ar: 'ألمانيا', ru: 'Германия', uk: 'Німеччина' },
  'france': { ar: 'فرنسا', ru: 'Франция', uk: 'Франція' },
  'italy': { ar: 'إيطاليا', ru: 'Италия', uk: 'Італія' },
  'spain': { ar: 'إسبانيا', ru: 'Испания', uk: 'Іспанія' },
  'united kingdom': { ar: 'المملكة المتحدة', ru: 'Великобритания', uk: 'Велика Британія' },
  'uk': { ar: 'المملكة المتحدة', ru: 'Великобритания', uk: 'Велика Британія' },
  'great britain': { ar: 'بريطانيا', ru: 'Великобритания', uk: 'Велика Британія' },
  'japan': { ar: 'اليابان', ru: 'Япония', uk: 'Японія' },
  'canada': { ar: 'كندا', ru: 'Канада', uk: 'Канада' },
  'australia': { ar: 'أستراليا', ru: 'Австралия', uk: 'Австралія' },
  'new zealand': { ar: 'نيوزيلندا', ru: 'Новая Зеландия', uk: 'Нова Зеландія' },
  'switzerland': { ar: 'سويسرا', ru: 'Швейцария', uk: 'Швейцарія' },
  'china': { ar: 'الصين', ru: 'Китай', uk: 'Китай' },
  'global': { ar: 'عالمي', ru: 'Мировой рынок', uk: 'Світовий ринок' }
};

const TIMEZONE_LABELS: Record<string, { ar: string; ru: string; uk: string; en: string }> = {
  'AUTO': {
    ar: 'تحديد تلقائي (التوقيت المحلي لجهازك)',
    ru: 'Автоопределение (локальное устройство)',
    uk: 'Автовизначення (локальний пристрій)',
    en: 'Auto-Detect (Local Device)'
  },
  'America/New_York': {
    ar: 'نيويورك (توقيت شرق الولايات المتحدة)',
    ru: 'Нью-Йорк (EDT / EST)',
    uk: 'Нью-Йорк (EDT / EST)',
    en: 'New York (EDT / EST)'
  },
  'Europe/London': {
    ar: 'لندن (توقيت غرينتش / بريطانيا)',
    ru: 'Лондон (BST / GMT)',
    uk: 'Лондон (BST / GMT)',
    en: 'London (BST / GMT)'
  },
  'Europe/Berlin': {
    ar: 'فرانكفورت / برلين (توقيت أوروبا الوسطى)',
    ru: 'Франкфурт / Берлин (CEST / CET)',
    uk: 'Франкфурт / Берлін (CEST / CET)',
    en: 'Frankfurt / Berlin (CEST / CET)'
  },
  'Asia/Dubai': {
    ar: 'دبي (توقيت الإمارات الخليجي GMT+4)',
    ru: 'Дубай (GST GMT+4)',
    uk: 'Дубай (GST GMT+4)',
    en: 'Dubai (GST GMT+4)'
  },
  'Asia/Riyadh': {
    ar: 'الرياض (توقيت مكة المكرمة GMT+3)',
    ru: 'Эр-Рияд (AST GMT+3)',
    uk: 'Ер-Ріяд (AST GMT+3)',
    en: 'Riyadh (AST GMT+3)'
  },
  'Asia/Amman': {
    ar: 'عَمّان (توقيت الأردن GMT+3)',
    ru: 'Амман (GMT+3)',
    uk: 'Амман (GMT+3)',
    en: 'Amman (GMT+3)'
  },
  'Asia/Tokyo': {
    ar: 'طوكيو (توقيت اليابان JST GMT+9)',
    ru: 'Токио (JST GMT+9)',
    uk: 'Токіо (JST GMT+9)',
    en: 'Tokyo (JST GMT+9)'
  },
  'Asia/Singapore': {
    ar: 'سنغافورة / هونغ كونغ (SGT / HKT)',
    ru: 'Сингапур / Гонконг (SGT / HKT)',
    uk: 'Сінгапур / Гонконг (SGT / HKT)',
    en: 'Singapore / Hong Kong (SGT / HKT)'
  },
  'Australia/Sydney': {
    ar: 'سيدني (توقيت أستراليا الشرقي)',
    ru: 'Сидней (AEST / AEDT)',
    uk: 'Сідней (AEST / AEDT)',
    en: 'Sydney (AEST / AEDT)'
  },
  'UTC': {
    ar: 'توقيت UTC العالمي المنسق',
    ru: 'UTC (Всемирное координированное время)',
    uk: 'UTC (Всесвітній координований час)',
    en: 'UTC (Universal Coordinated Time)'
  }
};

/**
 * Translates an economic event name to Arabic, Russian, or Ukrainian.
 * Falls back cleanly to the original English name if unknown.
 */
export function translateEconomicEvent(eventName: string, lang: string): string {
  if (!eventName || lang === 'en') return eventName;
  const raw = eventName.toLowerCase().trim();

  // Direct match
  if (EVENT_TRANSLATIONS[raw]) {
    const matched = EVENT_TRANSLATIONS[raw][lang as 'ar' | 'ru' | 'uk'];
    if (matched) return matched;
  }

  // Suffix/Modifier preservation (e.g. (MoM), (YoY), (QoQ), Prelim, Flash)
  let suffix = '';
  if (/\((mom|yoy|qoq|3m|12m)\)/i.test(eventName)) {
    const match = eventName.match(/\((mom|yoy|qoq|3m|12m)\)/i);
    if (match) suffix = ` ${match[0]}`;
  }

  // Keyword check
  for (const [key, tr] of Object.entries(EVENT_TRANSLATIONS)) {
    if (raw.includes(key)) {
      const translated = tr[lang as 'ar' | 'ru' | 'uk'];
      if (translated) {
        return suffix && !translated.includes(suffix.trim()) ? `${translated}${suffix}` : translated;
      }
    }
  }

  return eventName;
}

/**
 * Translates country names to target language
 */
export function translateEconomicCountry(countryName: string, lang: string): string {
  if (!countryName || lang === 'en') return countryName;
  const raw = countryName.toLowerCase().trim();

  if (COUNTRY_TRANSLATIONS[raw]) {
    const matched = COUNTRY_TRANSLATIONS[raw][lang as 'ar' | 'ru' | 'uk'];
    if (matched) return matched;
  }

  for (const [key, tr] of Object.entries(COUNTRY_TRANSLATIONS)) {
    if (raw.includes(key)) {
      const translated = tr[lang as 'ar' | 'ru' | 'uk'];
      if (translated) return translated;
    }
  }

  return countryName;
}

/**
 * Translates whyItMatters explanation context
 */
export function translateWhyItMatters(text: string | undefined, eventName: string, country: string, lang: string): string {
  if (lang === 'en' || !text) return text || '';
  const e = (eventName || '').toLowerCase();

  if (e.includes('nonfarm') || e.includes('payroll')) {
    if (lang === 'ar') return 'النبض الشهري الأهم لسوق العمل الأمريكي. توسع التوظيف القوي يرفع توقعات الفائدة ويدعم الدولار ويضغط على الذهب والأسهم.';
    if (lang === 'ru') return 'Ключевой ежемесячный индикатор рынка труда США. Сильный рост занятости повышает ожидания по ставке, укрепляя доллар и оказывая давление на золото и акции.';
    if (lang === 'uk') return 'Ключовий щомісячний індикатор ринку праці США. Сильне зростання зайнятості підвищує очікування щодо ставки, зміцнюючи долар і тиснучи на золото та акції.';
  }

  if (e.includes('cpi') || e.includes('consumer price')) {
    if (lang === 'ar') return 'المقياس الرسمي الأول لتضخم المستهلكين. القراءات الأعلى من المتوقع تدفع البنوك المركزية للتشديد النقدي، مما يعزز العملة ويضغط على أصول المخاطرة.';
    if (lang === 'ru') return 'Главный барометр потребительской инфляции. Данные выше прогноза стимулируют ужесточение монетарной политики, поддерживая нацвалюту и давя на рисковые активы.';
    if (lang === 'uk') return 'Головний барометр споживчої інфляції. Дані вище прогнозу стимулюють посилення монетарної політики, підтримуючи нацвалюту і чинячи тиск на ризикові активи.';
  }

  if (e.includes('interest rate') || e.includes('rate decision') || e.includes('fomc') || e.includes('ecb') || e.includes('boe') || e.includes('fed')) {
    if (lang === 'ar') return 'يحدد تكلفة الاقتراض الرسمية ويقود اتجاهات السيولة العالمية. يحدد مباشرة مسار مؤشر الدولار (DXY) والذهب وعوائد السندات.';
    if (lang === 'ru') return 'Определяет базовую стоимость заимствований и глобальные потоки ликвидности. Напрямую задает тренд по доллару США, золоту (XAUUSD) и облигациям.';
    if (lang === 'uk') return 'Визначає базову вартість запозичень та глобальні потоки ліквідності. Безпосередньо задає тренд за доларом США, золотом (XAUUSD) та облігаціями.';
  }

  if (e.includes('ppi')) {
    if (lang === 'ar') return 'يقيس تضخم أسعار المنتجين بالجملة. الأرقام المرتفعة تشير إلى استمرار ضغوط التضخم في خطوط الإنتاج قبل وصولها للمستهلكين.';
    if (lang === 'ru') return 'Измеряет оптовую инфляцию цен производителей. Высокие цифры сигнализируют о нарастании инфляционного давления в производственной цепочке.';
    if (lang === 'uk') return 'Вимірює оптову інфляцію цін виробників. Високі цифри сигналізують про наростання інфляційного тиску у виробничому ланцюжку.';
  }

  if (e.includes('jobless claims')) {
    if (lang === 'ar') return 'مقياس أسبوعي عالي الدقة لمعدلات تسريح العمالة. الارتفاعات المفاجئة تشير إلى تباطؤ في صحة الاقتصاد وسوق العمل.';
    if (lang === 'ru') return 'Еженедельный индикатор динамики увольнений. Неожиданный рост заявок свидетельствует о начале охлаждения рынка труда.';
    if (lang === 'uk') return 'Щотижневий індикатор динаміки звільнень. Несподіване зростання заявок свідчить про початок охолодження ринку праці.';
  }

  if (e.includes('gdp')) {
    if (lang === 'ar') return 'المقياس الشامل للنمو أو الانكماش الاقتصادي. التفوق على التقديرات يعكس قوة الاقتصاد، بينما الانكماش يدفع نحو الملاذات الآمنة.';
    if (lang === 'ru') return 'Комплексный показатель роста или спада экономики. Превышение прогноза отражает устойчивость макроэкономики, а спад ведет в защитные активы.';
    if (lang === 'uk') return 'Комплексний показник зростання або спаду економіки. Перевищення прогнозу відображає стійкість макроекономіки, а спад веде в захисні активи.';
  }

  if (e.includes('retail sales')) {
    if (lang === 'ar') return 'يعكس قوة الإنفاق الاستهلاكي الذي يمثل المحرك الأساسي للنمو الاقتصادي الداخلي.';
    if (lang === 'ru') return 'Отражает силу потребительских расходов — ключевого двигателя внутреннего экономического роста.';
    if (lang === 'uk') return 'Відображає силу споживчих витрат — ключового рушія внутрішнього економічного зростання.';
  }

  if (e.includes('pmi')) {
    if (lang === 'ar') return 'مؤشر استشرافي مبكر لمديري المشتريات. القراءة فوق 50 تعني التوسع، وتحت 50 تعني الانكماش الاقتصادي.';
    if (lang === 'ru') return 'Опережающий индикатор активности. Значение выше 50 означает рост сектора, ниже 50 — спад.';
    if (lang === 'uk') return 'Випереджальний індикатор активності. Значення вище 50 означає зростання сектору, нижче 50 — спад.';
  }

  const trCountry = translateEconomicCountry(country, lang);
  if (lang === 'ar') return `مؤشر اقتصادي كلي رئيسي لـ ${trCountry}. يؤثر مباشرة على توقعات السياسة النقدية وعوائد السندات وتقلبات العملة.`;
  if (lang === 'ru') return `Ключевой макроэкономический релиз для ${trCountry}. Определяет монетарный курс, доходность гособлигаций и волатильность валюты.`;
  if (lang === 'uk') return `Ключовий макроекономічний реліз для ${trCountry}. Визначає монетарний курс, прибутковість держоблігацій та волатильність валюти.`;

  return text;
}

/**
 * Formats countdown with localized units
 */
export function formatLocalizedCountdown(countdown: LiveCountdown, lang: string): string {
  if (countdown.isPassed) {
    if (lang === 'ar') return 'جاري الآن';
    if (lang === 'ru') return 'В процессе';
    if (lang === 'uk') return 'Триває зараз';
    return '00:00:00';
  }

  const { days, hours, minutes, seconds } = countdown;

  if (lang === 'ar') {
    if (days > 0) return `${days} يوم ${hours} س ${minutes} د`;
    if (hours > 0) return `${hours} س ${minutes} د ${seconds} ث`;
    return `${minutes} د ${seconds} ث`;
  }

  if (lang === 'ru') {
    if (days > 0) return `${days}д ${String(hours).padStart(2, '0')}ч ${String(minutes).padStart(2, '0')}м`;
    if (hours > 0) return `${String(hours).padStart(2, '0')}ч ${String(minutes).padStart(2, '0')}м ${String(seconds).padStart(2, '0')}с`;
    return `${String(minutes).padStart(2, '0')}м ${String(seconds).padStart(2, '0')}с`;
  }

  if (lang === 'uk') {
    if (days > 0) return `${days}д ${String(hours).padStart(2, '0')}год ${String(minutes).padStart(2, '0')}хв`;
    if (hours > 0) return `${String(hours).padStart(2, '0')}год ${String(minutes).padStart(2, '0')}хв ${String(seconds).padStart(2, '0')}с`;
    return `${String(minutes).padStart(2, '0')}хв ${String(seconds).padStart(2, '0')}с`;
  }

  return countdown.formatted;
}

/**
 * Returns localized label for popular timezone options
 */
export function getLocalizedTimezoneLabel(timeZone: string, defaultLabel: string, lang: string): string {
  const opt = TIMEZONE_LABELS[timeZone];
  if (!opt) return defaultLabel;
  if (lang === 'ar') return opt.ar;
  if (lang === 'ru') return opt.ru;
  if (lang === 'uk') return opt.uk;
  return opt.en || defaultLabel;
}
