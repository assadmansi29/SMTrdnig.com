import { Article, Author, EconomicEvent } from '../types';
import { LanguageCode } from '../locales';
import { AUTHORS, INITIAL_ARTICLES, INITIAL_ECONOMIC_EVENTS } from './blogData';
import tradeSmcImg from '../assets/images/trade_smc_chart_1787936051770.jpg';

// Localized Author details
export const getAuthorsByLanguage = (lang: LanguageCode): Record<string, Author> => {
  const base = AUTHORS;
  if (lang === 'ar') {
    return {
      abuAsad: {
        ...base.abuAsad,
        role: 'المؤسس وكبير المهندسين الكميين',
        bio: 'مؤسس منصة تداول الأموال الذكية (SMTrading.pro). متخصص كمي في البنية الدقيقة لتدفق الأوامر ومفاهيم الأموال الذكية (SMC) وهندسة السيولة الخوارزمية.'
      },
      alex: {
        ...base.alex,
        role: 'كبير الاستراتيجيين الكميين',
        bio: 'باحث كمي رئيسي سابق في سيتادل، متخصص في البنية الدقيقة للسوق، المراجحة الإحصائية ومحركات التنفيذ عالي التردد (HFT).'
      },
      elena: {
        ...base.elena,
        role: 'رئيسة قسم الاقتصاد الكلي والعملات الأجنبية',
        bio: 'أكثر من 14 عاماً في إدارة مكاتب الديون السيادية والعملات الأجنبية في لندن وجنيف. متخصصة في دورات السيولة عبر الأصول.'
      },
      marcus: {
        ...base.marcus,
        role: 'كبير مهندسي المشتقات المالية',
        bio: 'صانع سوق محوري في خيارات المؤشرات ومقايضات التباين. مؤلف كتاب "مصفوفة التقلب والعوائد المحدبة".'
      },
      sarah: {
        ...base.sarah,
        role: 'مديرة أداء المتداولين وإدارة المخاطر',
        bio: 'باحثة في العلوم العصبية المعرفية ومدربة أداء لأبرز شركات التداول الخاصة (Prop Firms) في نيويورك وشيكاغو.'
      }
    };
  }
  if (lang === 'ru') {
    return {
      abuAsad: {
        ...base.abuAsad,
        role: 'Основатель и главный квант-архитектор',
        bio: 'Основатель Smart Money Trading (SMTrading.pro). Количественный аналитик, специализирующийся на институциональном Order Flow, концепциях Smart Money (SMC) и микроструктуре алгоритмической ликвидности.'
      },
      alex: {
        ...base.alex,
        role: 'Главный количественный стратег',
        bio: 'Бывший ведущий квант-исследователь Citadel, эксперт по микроструктуре рынка, статистическому арбитражу и HFT-системам.'
      },
      elena: {
        ...base.elena,
        role: 'Руководитель направления Global Macro & FX',
        bio: 'Более 14 лет управления институциональными портфелями суверенного долга и валютными десками в Лондоне и Женеве.'
      },
      marcus: {
        ...base.marcus,
        role: 'Старший архитектор деривативов',
        bio: 'Ведущий маркет-мейкер индексных опционов и дисперсионных свопов. Автор книги «The Volatility Matrix & Convex Payoffs».'
      },
      sarah: {
        ...base.sarah,
        role: 'Директор по эффективности трейдеров и рискам',
        bio: 'Нейрокогнитивный исследователь и коуч по производительности ведущих проп-трейдинговых фирм Нью-Йорка и Чикаго.'
      }
    };
  }
  if (lang === 'uk') {
    return {
      abuAsad: {
        ...base.abuAsad,
        role: 'Засновник та головний квант-архітектор',
        bio: 'Засновник Smart Money Trading (SMTrading.pro). Кількісний аналітик, що спеціалізується на інституційному Order Flow, концепціях Smart Money (SMC) та мікроструктурі алгоритмічної ліквідності.'
      },
      alex: {
        ...base.alex,
        role: 'Головний кількісний стратег',
        bio: 'Колишній провідний квант-дослідник Citadel, експерт з мікроструктури ринку, статистичного арбітражу та HFT-систем.'
      },
      elena: {
        ...base.elena,
        role: 'Керівник напрямку Global Macro & FX',
        bio: 'Понад 14 років управління інституційними портфелями суверенного боргу та валютними десками в Лондоні та Женеві.'
      },
      marcus: {
        ...base.marcus,
        role: 'Старший архітектор деривативів',
        bio: 'Провідний маркет-мейкер індексних опціонів та дисперсійних свопів. Автор книги «The Volatility Matrix & Convex Payoffs».'
      },
      sarah: {
        ...base.sarah,
        role: 'Директор з ефективності трейдерів та ризиків',
        bio: 'Нейрокогнітивний дослідник та коуч з продуктивності провідних проп-трейдингових фірм Нью-Йорка та Чикаго.'
      }
    };
  }
  return base;
};

// Localized Economic Events
export const getEconomicEventsByLanguage = (lang: LanguageCode): EconomicEvent[] => {
  if (lang === 'ar') {
    return [
      {
        id: 'eco-1',
        date: 'الأربعاء، 27 مايو',
        time: '14:00 بتوقيت نيويورك',
        country: 'الولايات المتحدة',
        countryCode: 'US',
        event: 'بيان السياسة النقدية وقرار الفائدة الفيدرالي (FOMC)',
        impact: 'High',
        forecast: '4.50%',
        previous: '4.50%',
        actual: undefined
      },
      {
        id: 'eco-2',
        date: 'الخميس، 28 مايو',
        time: '08:30 بتوقيت نيويورك',
        country: 'الولايات المتحدة',
        countryCode: 'US',
        event: 'مؤشر أسعار المستهلكين الأساسي للتضخم CPI (سنوي)',
        impact: 'High',
        forecast: '2.7%',
        previous: '2.8%',
        actual: undefined
      },
      {
        id: 'eco-3',
        date: 'الخميس، 28 مايو',
        time: '09:15 بتوقيت نيويورك',
        country: 'منطقة اليورو',
        countryCode: 'EU',
        event: 'قرار سعر إعادة التمويل للبنك المركزي الأوروبي',
        impact: 'High',
        forecast: '3.00%',
        previous: '3.25%',
        actual: undefined
      },
      {
        id: 'eco-4',
        date: 'الجمعة، 29 مايو',
        time: '08:30 بتوقيت نيويورك',
        country: 'الولايات المتحدة',
        countryCode: 'US',
        event: 'تقرير الوظائف غير الزراعية (NFP) ومعدل البطالة',
        impact: 'High',
        forecast: '175K',
        previous: '188K',
        actual: undefined
      }
    ];
  }
  if (lang === 'ru') {
    return [
      {
        id: 'eco-1',
        date: 'Среда, 27 мая',
        time: '14:00 EDT',
        country: 'США',
        countryCode: 'US',
        event: 'Решение ФРС по процентной ставке и заявление FOMC',
        impact: 'High',
        forecast: '4.50%',
        previous: '4.50%',
        actual: undefined
      },
      {
        id: 'eco-2',
        date: 'Четверг, 28 мая',
        time: '08:30 EDT',
        country: 'США',
        countryCode: 'US',
        event: 'Базовый индекс потребительских цен CPI (г/г)',
        impact: 'High',
        forecast: '2.7%',
        previous: '2.8%',
        actual: undefined
      },
      {
        id: 'eco-3',
        date: 'Четверг, 28 мая',
        time: '09:15 EDT',
        country: 'Еврозона',
        countryCode: 'EU',
        event: 'Решение ЕЦБ по процентной ставке',
        impact: 'High',
        forecast: '3.00%',
        previous: '3.25%',
        actual: undefined
      },
      {
        id: 'eco-4',
        date: 'Пятница, 29 мая',
        time: '08:30 EDT',
        country: 'США',
        countryCode: 'US',
        event: 'Данные по занятости в несельскохозяйственном секторе (NFP) и безработица',
        impact: 'High',
        forecast: '175K',
        previous: '188K',
        actual: undefined
      }
    ];
  }
  if (lang === 'uk') {
    return [
      {
        id: 'eco-1',
        date: 'Середа, 27 травня',
        time: '14:00 EDT',
        country: 'США',
        countryCode: 'US',
        event: 'Рішення ФРС щодо процентної ставки та заява FOMC',
        impact: 'High',
        forecast: '4.50%',
        previous: '4.50%',
        actual: undefined
      },
      {
        id: 'eco-2',
        date: 'Четвер, 28 травня',
        time: '08:30 EDT',
        country: 'США',
        countryCode: 'US',
        event: 'Базовий індекс споживчих цін CPI (р/р)',
        impact: 'High',
        forecast: '2.7%',
        previous: '2.8%',
        actual: undefined
      },
      {
        id: 'eco-3',
        date: 'Четвер, 28 травня',
        time: '09:15 EDT',
        country: 'Єврозона',
        countryCode: 'EU',
        event: 'Рішення ЄЦБ щодо процентної ставки',
        impact: 'High',
        forecast: '3.00%',
        previous: '3.25%',
        actual: undefined
      },
      {
        id: 'eco-4',
        date: 'П\'ятниця, 29 травня',
        time: '08:30 EDT',
        country: 'США',
        countryCode: 'US',
        event: 'Дані про зайнятість у несільськогосподарському секторі (NFP) та безробіття',
        impact: 'High',
        forecast: '175K',
        previous: '188K',
        actual: undefined
      }
    ];
  }
  return INITIAL_ECONOMIC_EVENTS;
};

// Localized E-Commerce Products
export interface LocalizedProduct {
  id: string;
  name: string;
  category: 'Software & Indicators' | 'Education & Masterclass' | 'Hardware & Merch';
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  badge?: string;
  badgeColor?: string;
  description: string;
  features: string[];
  deliveryType: 'instant_digital' | 'physical_tracked';
  isDigital: boolean;
}

const formatProducts = (list: Omit<LocalizedProduct, 'isDigital'>[]): LocalizedProduct[] => {
  return list.map(p => ({
    ...p,
    isDigital: p.deliveryType === 'instant_digital'
  }));
};

export const getProductsByLanguage = (lang: LanguageCode): LocalizedProduct[] => {
  if (lang === 'ar') {
    return formatProducts([
      {
        id: 'prod-1',
        name: 'دورة تداول المفاهيم المؤسسية SMC — من المبتدئ إلى الاحتراف',
        category: 'Education & Masterclass',
        price: 350,
        originalPrice: 500,
        rating: 4.97,
        reviewsCount: 342,
        image: tradeSmcImg,
        badge: 'الأكثر مبيعاً',
        badgeColor: 'bg-amber-500 text-slate-950',
        description: 'دورة شاملة في مفاهيم الأموال الذكية (SMC) تأخذ المتدربين من الأساسيات إلى المستوى الاحترافي المتقدم. تغطي هيكل السوق، السيولة، كتل الأوامر (Order Blocks)، فجوات القيمة العادلة (FVG)، كتل الكسر (Breaker Blocks)، سحب السيولة، مناطق الخصم والعلاوة، BOS، CHoCH، نقاط الدخول، التأكيدات، إدارة المخاطر والتحليل البياني العملي.',
        features: [
          'هيكلية السوق الشاملة وتحديد BOS و CHoCH عبر الأطر الزمنية',
          'تحديد كتل الأوامر المؤسسية وفجوات القيمة العادلة (FVG) وكتل الكسر',
          'اصطياد سحوبات السيولة ومناطق الخصم والعلاوة (Premium & Discount)',
          'نماذج دخول عالية الاحتمالية، شروط التأكيد وإدارة رأس المال الصارمة'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-2',
        name: 'دورة مربع جان والتحليل الزمني — Gann Box & Time Analysis',
        category: 'Education & Masterclass',
        price: 450,
        originalPrice: 600,
        rating: 4.98,
        reviewsCount: 188,
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
        badge: 'المسار المؤسسي',
        badgeColor: 'bg-cyan-500 text-slate-950',
        description: 'دورة شاملة تركز على التحليل الزمني باستخدام مربع جان (Gann Box)، بما في ذلك الدورات الزمنية، علاقة السعر بالزمن، توقيت السوق، والتطبيقات العملية لتحديد نقاط التحول والانعكاس المحتملة في الأسواق.',
        features: [
          'التحليل الزمني والهندسي باستخدام أداة مربع جان (Gann Box)',
          'استخراج الدورات الزمنية وتوازن السعر مع الزمن (Price-Time Squared)',
          'التوقيت الدقيق وتحديد نقاط التحول والانعكاس في السوق',
          'تطبيقات واستراتيجيات عملية على الرسوم البيانية الحية'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-3',
        name: 'دورة التحليل الفني الكلاسيكي — من المبتدئ إلى التأسيس',
        category: 'Education & Masterclass',
        price: 150,
        originalPrice: 300,
        rating: 4.93,
        reviewsCount: 142,
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
        badge: 'للمبتدئين',
        badgeColor: 'bg-blue-500 text-white',
        description: 'دورة موجهة للمبتدئين تغطي أسس وقواعد التحليل الفني الكلاسيكي، بما في ذلك الدعم والمقاومة، خطوط الاتجاه (الترند)، النماذج السعرية، أساسيات الشموع اليابانية، المؤشرات الفنية، الاختراقات، وكيفية تحليل حركة السعر السلوكية.',
        features: [
          'أسس التحليل الفني: مستويات الدعم والمقاومة وخطوط الاتجاه والشموع اليابانية',
          'النماذج الفنية الانعكاسية والاستمرارية وديناميكيات الاختراق وإعادة الاختبار',
          'استخدام المتوسطات المتحركة ومؤشرات الزخم لقراءة حركة السعر بدقة',
          'قواعد إدارة رأس المال، حجم العقود وبناء خطة تداول واضحة ومحكمة'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-4',
        name: 'استراتيجية 144 — دورة تداول مربع جان المتقدمة',
        category: 'Education & Masterclass',
        price: 200,
        originalPrice: 350,
        rating: 4.95,
        reviewsCount: 215,
        image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
        badge: 'استراتيجية 144',
        badgeColor: 'bg-purple-500 text-white',
        description: 'دورة تعليمية متكاملة تشرح استراتيجية تداول 144 باستخدام مربع جان (Gann Box)، وقواعدها وشروط الإعداد، ظروف السوق المناسبة، مفاهيم الدخول، شروط التأكيد، وإدارة المخاطر الصارمة.',
        features: [
          'شرح مفصل وممنهج لاستراتيجية 144 وقواعد تطبيقها على مربع جان',
          'تحديد ظروف السوق المثالية ونماذج الإعداد الفني عالية الجودة',
          'مفاهيم الدخول الدقيق، شروط التأكيد وفلاتر تجنب الإشارات الكاذبة',
          'قواعد إدارة المخاطر وتحديد الأهداف ونماذج وقف الخسارة الرياضية'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-5',
        name: 'استراتيجية التداول عبر Bookmap — قراءة السيولة وتدفق الأوامر',
        category: 'Education & Masterclass',
        price: 400,
        originalPrice: 800,
        rating: 4.97,
        reviewsCount: 318,
        image: tradeSmcImg,
        badge: 'احتراف السيولة',
        badgeColor: 'bg-emerald-500 text-slate-950',
        description: 'استراتيجية كاملة تركز على استخدام منصة Bookmap وتصور تدفق الأوامر لفهم السيولة، نشاط السوق، الامتصاص (Absorption)، الشراء والبيع العدواني، وفرص التداول عالية الاحتمالية.',
        features: [
          'قراءة الخرائط الحرارية (Heatmaps) وتتبع سيولة دفتر الأوامر عبر Bookmap',
          'رصد الامتصاص المؤسسي، استنزاف المشترين/البائعين العدوانيين وأوامر الآيسبيرغ',
          'دمج بروفايل الحجم مع تباعد الدلتا التراكمية (CVD Divergence)',
          'نماذج تنفيذ عالية الدقة واستراتيجيات إدارة مخاطر محكمة'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-6',
        name: 'استراتيجية SMC — تداول المفاهيم المؤسسية المركزة',
        category: 'Education & Masterclass',
        price: 150,
        originalPrice: 300,
        rating: 4.96,
        reviewsCount: 168,
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
        badge: 'استراتيجية SMC',
        badgeColor: 'bg-indigo-500 text-white',
        description: 'استراتيجية SMC مركزة تغطي نماذج مفاهيم الأموال الذكية العملية، السيولة، هيكل السوق، كتل الأوامر (Order Blocks)، فجوات القيمة العادلة (Fair Value Gaps)، نقاط الدخول، التأكيدات، وإدارة المخاطر.',
        features: [
          'قواعد ونماذج تنفيذ صفقات مفاهيم الأموال الذكية (SMC) العملية',
          'رسم وتحديد هيكل السوق، أحواض السيولة وسحب السيولة الداخلي والخارجي',
          'نقاط الدخول الدقيقة المعتمدة على كتل الأوامر وفجوات القيمة العادلة (FVG)',
          'قوائم التحقق للتأكيد وإدارة نسبة العائد إلى المخاطرة الصارمة'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-7',
        name: 'الباقة الشاملة — جميع الدورات والاستراتيجيات (Complete Bundle)',
        category: 'Education & Masterclass',
        price: 888,
        originalPrice: 1500,
        rating: 5.0,
        reviewsCount: 420,
        image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
        badge: 'الباقة الشاملة',
        badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold',
        description: 'حزمة SM Trading الشاملة والكاملة التي تتضمن جميع الدورات والاستراتيجيات المذكورة أعلاه:\n• دورة تداول SMC (SMC Trading Course)\n• تحليل مربع جان والزمن (Gann Box & Time Analysis)\n• التحليل الفني الكلاسيكي (Classic Technical Analysis)\n• استراتيجية 144 (144 Strategy)\n• استراتيجية التداول عبر Bookmap\n• استراتيجية SMC المركزة',
        features: [
          'دورة تداول SMC الشاملة من الصفر حتى الاحتراف المؤسسي',
          'دورة تحليل مربع جان والزمن + استراتيجية 144 الرقمية',
          'دورة التحليل الفني الكلاسيكي للمبتدئين وقراءة حركة السعر',
          'استراتيجية Bookmap المتقدمة لتدفق الأوامر + استراتيجية SMC المركزة'
        ],
        deliveryType: 'instant_digital'
      }
    ]);
  }
  if (lang === 'ru') {
    return formatProducts([
      {
        id: 'prod-1',
        name: 'Курс по торговле SMC — От новичка до профессионала',
        category: 'Education & Masterclass',
        price: 350,
        originalPrice: 500,
        rating: 4.97,
        reviewsCount: 342,
        image: tradeSmcImg,
        badge: 'ХИТ ПРОДАЖ',
        badgeColor: 'bg-amber-500 text-slate-950',
        description: 'Полный курс по концепции Smart Money (SMC), который проведет вас от базовых основ до продвинутого профессионального уровня. Охватывает структуру рынка, ликвидность, ордерблоки, дисбалансы (FVG), брейкер-блоки, снятие ликвидности, премиум и дисконт зоны, BOS, CHoCH, точки входа, подтверждения, риск-менеджмент и практический разбор графиков.',
        features: [
          'Структура рынка, BOS, CHoCH и синхронизация таймфреймов',
          'Ордерблоки, Fair Value Gaps (FVG) и брейкер-блоки',
          'Снятие ликвидности (Liquidity Sweeps) и зоны Premium / Discount',
          'Высоковероятные паттерны входа, сетапы подтверждения и риск-менеджмент'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-2',
        name: 'Курс «Gann Box и временной анализ рынка»',
        category: 'Education & Masterclass',
        price: 450,
        originalPrice: 600,
        rating: 4.98,
        reviewsCount: 188,
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
        badge: 'ИНСТИТУЦИОНАЛЬНЫЙ КУРС',
        badgeColor: 'bg-cyan-500 text-slate-950',
        description: 'Полный курс, посвященный временному анализу с использованием коробки Ганна (Gann Box), включая временные циклы, соотношение цены и времени, тайминг рынка и практическое применение для определения потенциальных точек разворота.',
        features: [
          'Временной и геометрический анализ с помощью инструмента Gann Box',
          'Определение временных циклов и баланса цены и времени',
          'Точный тайминг входа и прогнозирование разворотных точек',
          'Практический разбор сетапов на реальных графиках'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-3',
        name: 'Курс «Классический технический анализ для начинающих»',
        category: 'Education & Masterclass',
        price: 150,
        originalPrice: 300,
        rating: 4.93,
        reviewsCount: 142,
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
        badge: 'ДЛЯ НАЧИНАЮЩИХ',
        badgeColor: 'bg-blue-500 text-white',
        description: 'Курс для начинающих, охватывающий основы классического технического анализа: уровни поддержки и сопротивления, трендовые линии, графические паттерны, основы японских свечей, индикаторы, пробои и методы анализа движения цены.',
        features: [
          'Основы технического анализа: уровни поддержки/сопротивления и тренды',
          'Графические паттерны, основы свечного анализа и пробои уровней',
          'Индикаторы импульса, скользящие средние и логика Price Action',
          'Правила управления рисками, расчет позиции и торговый план'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-4',
        name: 'Курс «Стратегия 144» (144 Strategy — Gann Box)',
        category: 'Education & Masterclass',
        price: 200,
        originalPrice: 350,
        rating: 4.95,
        reviewsCount: 215,
        image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
        badge: 'СТРАТЕГИЯ 144',
        badgeColor: 'bg-purple-500 text-white',
        description: 'Полный обучающий курс, подробно объясняющий торговую стратегию 144 на основе Gann Box: ее правила, сетап, рыночные условия, концепции входа, подтверждения и риск-менеджмент.',
        features: [
          'Детальный разбор торговой стратегии 144 и геометрии Gann Box',
          'Правила сетапа, фильтрация рыночных условий и контекста',
          'Точные точки входа, триггеры подтверждения и отмена сценария',
          'Институциональный риск-менеджмент, расчет таргетов и стоп-лосса'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-5',
        name: 'Курс «Торговая стратегия Bookmap» (Bookmap Trading Strategy)',
        category: 'Education & Masterclass',
        price: 400,
        originalPrice: 800,
        rating: 4.97,
        reviewsCount: 318,
        image: tradeSmcImg,
        badge: 'ORDER FLOW PRO',
        badgeColor: 'bg-emerald-500 text-slate-950',
        description: 'Полная стратегия, сфокусированная на использовании Bookmap и визуализации потока ордеров для понимания ликвидности, активности рынка, поглощения (Absorption), агрессивных покупок и продаж, а также поиска высоковероятных торговых возможностей.',
        features: [
          'Чтение тепловых карт Bookmap и отслеживание ликвидности в биржевом стакане',
          'Выявление институционального поглощения, айсберг-ордеров и истощения агрессоров',
          'Синхронизация профиля объема и дивергенций кумулятивной дельты (CVD)',
          'Высоковероятные сетапы входа и институциональный риск-менеджмент'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-6',
        name: 'Стратегия SMC (SMC Strategy)',
        category: 'Education & Masterclass',
        price: 150,
        originalPrice: 300,
        rating: 4.96,
        reviewsCount: 168,
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
        badge: 'СТРАТЕГИЯ SMC',
        badgeColor: 'bg-indigo-500 text-white',
        description: 'Практическая стратегия по концепции Smart Money (SMC), охватывающая рабочие сетапы, ликвидность, структуру рынка, ордерблоки, Fair Value Gaps (FVG), точки входа, подтверждения и риск-менеджмент.',
        features: [
          'Практические правила исполнения сетапов Smart Money Concepts (SMC)',
          'Разметка структуры рынка, пулы ликвидности и снятие ликвидности',
          'Точные входы от ордерблоков и зон дисбаланса Fair Value Gaps (FVG)',
          'Чек-лист подтверждения точки входа и системный риск-менеджмент'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-7',
        name: 'Полный пакет — Все курсы и стратегии (Complete Bundle)',
        category: 'Education & Masterclass',
        price: 888,
        originalPrice: 1500,
        rating: 5.0,
        reviewsCount: 420,
        image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
        badge: 'ВСЁ ВКЛЮЧЕНО',
        badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold',
        description: 'Полный образовательный пакет SM Trading, включающий ВСЕ вышеперечисленные курсы и стратегии:\n• Курс по торговле SMC (SMC Trading Course)\n• Анализ времени и Gann Box (Gann Box & Time Analysis)\n• Классический технический анализ (Classic Technical Analysis)\n• Стратегия 144 (144 Strategy)\n• Торговая стратегия Bookmap\n• Стратегия SMC',
        features: [
          'Курс по торговле SMC (От новичка до профессионала)',
          'Курс «Gann Box & Анализ времени» и Стратегия 144',
          'Курс «Классический технический анализ для начинающих»',
          'Торговая стратегия Bookmap и Фокусная стратегия SMC'
        ],
        deliveryType: 'instant_digital'
      }
    ]);
  }
  if (lang === 'uk') {
    return formatProducts([
      {
        id: 'prod-1',
        name: 'Курс з торгівлі SMC — Від новачка до професіонала',
        category: 'Education & Masterclass',
        price: 350,
        originalPrice: 500,
        rating: 4.97,
        reviewsCount: 342,
        image: tradeSmcImg,
        badge: 'ХІТ ПРОДАЖІВ',
        badgeColor: 'bg-amber-500 text-slate-950',
        description: 'Повний курс за концепцією Smart Money (SMC), який проведе вас від базових основ до просунутого професійного рівня. Охоплює структуру ринку, ліквідність, ордерблоки, дисбаланси (FVG), брейкер-блоки, зняття ліквідності, преміум та дисконт зони, BOS, CHoCH, точки входу, підтвердження, ризик-менеджмент та практичний аналіз графіків.',
        features: [
          'Структура ринку, BOS, CHoCH та синхронізація таймфреймів',
          'Ордерблоки, Fair Value Gaps (FVG) та брейкер-блоки',
          'Зняття ліквідності (Liquidity Sweeps) та зони Premium / Discount',
          'Високоймовірні патерни входу, сетапи підтвердження та ризик-менеджмент'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-2',
        name: 'Курс «Gann Box та часовий аналіз ринку»',
        category: 'Education & Masterclass',
        price: 450,
        originalPrice: 600,
        rating: 4.98,
        reviewsCount: 188,
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
        badge: 'ІНСТИТУЦІЙНИЙ КУРС',
        badgeColor: 'bg-cyan-500 text-slate-950',
        description: 'Повний курс, присвячений часовому аналізу з використанням коробки Ганна (Gann Box), включаючи часові цикли, співвідношення ціни та часу, таймінг ринку та практичне застосування для визначення потенційних точок розвороту.',
        features: [
          'Часовий та геометричний аналіз за допомогою інструменту Gann Box',
          'Визначення часових циклів та балансу ціни і часу',
          'Точний таймінг входу та прогнозування розворотних точок',
          'Практичний аналіз сетапів на реальних графіках'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-3',
        name: 'Курс «Класичний технічний аналіз для початківців»',
        category: 'Education & Masterclass',
        price: 150,
        originalPrice: 300,
        rating: 4.93,
        reviewsCount: 142,
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
        badge: 'ДЛЯ ПОЧАТКІВЦІВ',
        badgeColor: 'bg-blue-500 text-white',
        description: 'Курс для початківців, що охоплює основи класичного технічного аналізу: рівні підтримки та опору, трендові лінії, графічні патерни, основи японських свічок, індикатори, пробої та методи аналізу руху ціни.',
        features: [
          'Основи технічного аналізу: рівні підтримки/опору та трендові лінії',
          'Графічні патерни, основи свічкового аналізу та динаміка пробоїв',
          'Індикатори імпульсу, ковзні середні та розуміння Price Action',
          'Правила управління ризиками, розрахунок обсягу позиції та торговий план'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-4',
        name: 'Курс «Стратегія 144» (144 Strategy — Gann Box)',
        category: 'Education & Masterclass',
        price: 200,
        originalPrice: 350,
        rating: 4.95,
        reviewsCount: 215,
        image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
        badge: 'СТРАТЕГІЯ 144',
        badgeColor: 'bg-purple-500 text-white',
        description: 'Повний навчальний курс, що детально пояснює торгову стратегію 144 на основі Gann Box: її правила, сетап, ринкові умови, концепції входу, підтвердження та ризик-менеджмент.',
        features: [
          'Детальний розбір торгової стратегії 144 та геометрії Gann Box',
          'Правила сетапу, фільтрація ринкових умов та контексту',
          'Точні точки входу, тригери підтвердження та скасування сценарію',
          'Інституційний ризик-менеджмент, розрахунок цілей та стоп-лосу'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-5',
        name: 'Курс «Торгова стратегія Bookmap» (Bookmap Trading Strategy)',
        category: 'Education & Masterclass',
        price: 400,
        originalPrice: 800,
        rating: 4.97,
        reviewsCount: 318,
        image: tradeSmcImg,
        badge: 'ORDER FLOW PRO',
        badgeColor: 'bg-emerald-500 text-slate-950',
        description: 'Повна стратегія, сфокусована на використанні Bookmap та візуалізації потоку ордерів для розуміння ліквідності, активності ринку, поглинання (Absorption), агресивних покупок і продажів, а також пошуку високоймовірних торгових можливостей.',
        features: [
          'Читання теплових карт Bookmap та відстеження ліквідності в біржовому стакані',
          'Виявлення інституційного поглинання, айсберг-ордерів та виснаження агресорів',
          'Синхронізація профілю обсягу та дивергенцій кумулятивної дельти (CVD)',
          'Високоймовірні сетапи входу та інституційний ризик-менеджмент'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-6',
        name: 'Стратегія SMC (SMC Strategy)',
        category: 'Education & Masterclass',
        price: 150,
        originalPrice: 300,
        rating: 4.96,
        reviewsCount: 168,
        image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
        badge: 'СТРАТЕГІЯ SMC',
        badgeColor: 'bg-indigo-500 text-white',
        description: 'Практична стратегія за концепцією Smart Money (SMC), що охоплює робочі сетапи, ліквідність, структуру ринку, ордерблоки, Fair Value Gaps (FVG), точки входу, підтвердження та ризик-менеджмент.',
        features: [
          'Практичні правила виконання сетапів Smart Money Concepts (SMC)',
          'Розмітка структури ринку, пули ліквідності та зняття ліквідності',
          'Точні входи від ордерблоків та зон дисбалансу Fair Value Gaps (FVG)',
          'Чек-лист підтвердження точки входу та системний ризик-менеджмент'
        ],
        deliveryType: 'instant_digital'
      },
      {
        id: 'prod-7',
        name: 'Повний пакет — Усі курси та стратегії (Complete Bundle)',
        category: 'Education & Masterclass',
        price: 888,
        originalPrice: 1500,
        rating: 5.0,
        reviewsCount: 420,
        image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
        badge: 'ВСЕ ВКЛЮЧЕНО',
        badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold',
        description: 'Повний навчальний пакет SM Trading, який містить УСІ перелічені вище курси та стратегії:\n• Курс з торгівлі SMC (SMC Trading Course)\n• Аналіз часу та Gann Box (Gann Box & Time Analysis)\n• Класичний технічний аналіз (Classic Technical Analysis)\n• Стратегія 144 (144 Strategy)\n• Торгова стратегія Bookmap\n• Стратегія SMC',
        features: [
          'Курс з торгівлі SMC (Від новачка до професіонала)',
          'Курс «Gann Box та аналіз часу» і Стратегія 144',
          'Курс «Класичний технічний аналіз для початківців»',
          'Торгова стратегія Bookmap та Фокусна стратегія SMC'
        ],
        deliveryType: 'instant_digital'
      }
    ]);
  }

  // Default English
  return formatProducts([
    {
      id: 'prod-1',
      name: 'SMC Trading Course — Beginner to Professional',
      category: 'Education & Masterclass',
      price: 350,
      originalPrice: 500,
      rating: 4.97,
      reviewsCount: 342,
      image: tradeSmcImg,
      badge: 'BESTSELLER',
      badgeColor: 'bg-amber-500 text-slate-950',
      description: 'A complete SMC (Smart Money Concepts) course taking students from the basics to advanced professional-level understanding. Covers market structure, liquidity, order blocks, Fair Value Gaps (FVG), Breaker Blocks, liquidity sweeps, premium & discount zones, BOS, CHoCH, entries, confirmations, risk management, and practical chart analysis.',
      features: [
        'Market structure, liquidity sweeps, BOS & CHoCH frameworks',
        'Institutional order blocks, Fair Value Gaps (FVG) & Breaker Blocks',
        'Premium & Discount pricing zones with multi-timeframe alignment',
        'High-probability trade entries, confirmations & disciplined risk management'
      ],
      deliveryType: 'instant_digital'
    },
    {
      id: 'prod-2',
      name: 'Gann Box & Time Analysis Course',
      category: 'Education & Masterclass',
      price: 450,
      originalPrice: 600,
      rating: 4.98,
      reviewsCount: 188,
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
      badge: 'INSTITUTIONAL TIER',
      badgeColor: 'bg-cyan-500 text-slate-950',
      description: 'A complete course focused on time analysis using the Gann Box, including time cycles, price-time relationships, market timing, and practical applications for identifying potential market turning points.',
      features: [
        'Time analysis & geometric forecasting using the Gann Box framework',
        'Market time cycle identification & price-time balance modeling',
        'High-precision market timing & reversal pivot identification',
        'Practical chart analysis setups across multi-timeframe structures'
      ],
      deliveryType: 'instant_digital'
    },
    {
      id: 'prod-3',
      name: 'Classic Technical Analysis — Beginner Course',
      category: 'Education & Masterclass',
      price: 150,
      originalPrice: 300,
      rating: 4.93,
      reviewsCount: 142,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
      badge: 'BEGINNER FRIENDLY',
      badgeColor: 'bg-blue-500 text-white',
      description: 'A beginner-friendly course covering the foundations of classical technical analysis, including support and resistance, trendlines, chart patterns, candlestick basics, indicators, breakouts, and how to analyze price action.',
      features: [
        'Foundations of technical analysis: support & resistance, trendlines, and candlesticks',
        'Classical chart patterns, momentum indicators, and breakout dynamics',
        'Price action interpretation and multi-timeframe chart structure reading',
        'Core risk management rules, position sizing, and structured trade planning'
      ],
      deliveryType: 'instant_digital'
    },
    {
      id: 'prod-4',
      name: '144 Strategy — Gann Box Course',
      category: 'Education & Masterclass',
      price: 200,
      originalPrice: 350,
      rating: 4.95,
      reviewsCount: 215,
      image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
      badge: '144 STRATEGY',
      badgeColor: 'bg-purple-500 text-white',
      description: 'Gann Box A complete educational course explaining the 144 trading strategy, its rules, setup, market conditions, entry concepts, confirmation, and risk management.',
      features: [
        'Complete breakdown of the 144 trading strategy and Gann Box principles',
        'Setup identification, high-probability filters, and optimal market conditions',
        'Precision entry concepts, trigger rules, and confirmation checklists',
        'Systematic risk management, stop placement, and profit target models'
      ],
      deliveryType: 'instant_digital'
    },
    {
      id: 'prod-5',
      name: 'Bookmap Trading Strategy',
      category: 'Education & Masterclass',
      price: 400,
      originalPrice: 800,
      rating: 4.97,
      reviewsCount: 318,
      image: tradeSmcImg,
      badge: 'ORDER FLOW PRO',
      badgeColor: 'bg-emerald-500 text-slate-950',
      description: 'A complete strategy focused on using Bookmap and order-flow visualization to understand liquidity, market activity, absorption, aggressive buying and selling, and high-probability trading opportunities.',
      features: [
        'Real-time Bookmap order book heatmap reading and DOM liquidity tracking',
        'Detecting institutional absorption, aggressive buyer/seller exhaustion & icebergs',
        'Volume profile integration, Cumulative Volume Delta (CVD) divergence setups',
        'High-probability execution models and systematic risk management frameworks'
      ],
      deliveryType: 'instant_digital'
    },
    {
      id: 'prod-6',
      name: 'SMC Strategy',
      category: 'Education & Masterclass',
      price: 150,
      originalPrice: 300,
      rating: 4.96,
      reviewsCount: 168,
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
      badge: 'SMC STRATEGY',
      badgeColor: 'bg-indigo-500 text-white',
      description: 'A focused SMC strategy covering practical Smart Money Concepts setups, liquidity, market structure, order blocks, Fair Value Gaps, entries, confirmations, and risk management',
      features: [
        'Practical Smart Money Concepts (SMC) high-probability setup rules',
        'Market structure identification, internal & external liquidity sweeps',
        'Precision order blocks and Fair Value Gaps (FVG) execution entries',
        'Confirmation checklists and disciplined risk-to-reward management'
      ],
      deliveryType: 'instant_digital'
    },
    {
      id: 'prod-7',
      name: 'Complete Bundle — All Courses & Strategies',
      category: 'Education & Masterclass',
      price: 888,
      originalPrice: 1500,
      rating: 5.0,
      reviewsCount: 420,
      image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
      badge: 'COMPLETE BUNDLE',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold',
      description: 'The complete SM Trading package including ALL courses and strategies listed above:\nSMC Trading Course\nGann Box & Time Analysis\nClassic Technical Analysis\n144 Strategy\nBookmap Trading Strategy\nSMC Strategy',
      features: [
        'SMC Trading Course (Beginner to Pro) & Gann Box Time Analysis',
        'Classic Technical Analysis & 144 Strategy (Gann Box)',
        'Bookmap Order Flow Trading Strategy & Focused SMC Strategy',
        'Lifetime access to all masterclass recordings, future updates & blueprints'
      ],
      deliveryType: 'instant_digital'
    }
  ]);
};

// Localized Articles
export const getArticlesByLanguage = (lang: LanguageCode): Article[] => {
  const authors = getAuthorsByLanguage(lang);
  const baseArticles = INITIAL_ARTICLES;

  if (lang === 'ar') {
    return [
      {
        ...baseArticles[0],
        author: authors.abuAsad,
        title: 'البنية الدقيقة للسوق وتدفق الأوامر: فك شفرة أوامر الآيسبيرغ المؤسسية وخلل الدلتا',
        subtitle: 'كيف تستخدم مكاتب التداول الكبرى خوارزميات التنفيذ لإخفاء صفقات بمليارات الدولارات، وكيف يمكن لمتداولي التجزئة رصد بصمتها بدقة.',
        imageCaption: 'منصة تداول الأموال الذكية SMTrading.pro - عارض البنية الدقيقة للسوق وتدفق دفتر الأوامر',
        publishedAt: '24 مايو 2026',
        readTime: '8 دقائق قراءة',
        summary: [
          'تنفيذ الأوامر المؤسسية مصمم لتقليل الانزلاق السعري إلى أدنى حد عبر أوامر الآيسبيرغ وخوارزميات متوسط السعر المرجح بالحجم (VWAP).',
          'تباعد دلتا الحجم التراكمي (CVD) عند تجمعات السيولة الرئيسية يعطي إشارة امتصاص واضحة قبل الانعكاسات الحادة.',
          'توفر تحولات نقطة التحكم في بروفايل الحجم (POC) مستويات إبطال هيكلية دقيقة للتنفيذ اليومي عالي الاحتمالية.'
        ],
        tradeSetup: {
          asset: 'عقود إي-ميني إس آند بي 500 (ES Futures)',
          direction: 'LONG',
          timeframe: 'توافق 15 دقيقة / 1 ساعة',
          entryZone: '5,910.00 - 5,914.50 (منطقة امتصاص السيولة)',
          stopLoss: '5,898.00 (أسفل عقدة الحجم المنخفض LVN)',
          takeProfit1: '5,948.00 (سيولة الطباعة الفردية Single Print)',
          takeProfit2: '5,972.50 (الحد الأعلى لمنطقة القيمة للأسبوع السابق VAH)',
          riskReward: '1 : 3.85',
          keyCatalyst: 'امتصاص شرائي هجومي عند الحد الأدنى لمنطقة القيمة VAL مع تباعد صاعد في CVD'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'تشريح الحجم المؤسسي المخفي',
            paragraphs: [
              'عندما ينظر متداولو التجزئة إلى الرسم البياني العادي للشموع اليابانية، فإنهم يشاهدون فقط البصمة التاريخية لما حدث في الماضي. ولاقتناص العوائد المتفوقة (Alpha) في الأسواق الإلكترونية الحديثة، يجب فحص عملية المزاد على مستوى الملي ثانية.',
              'الصناديق المؤسسية الكبرى نادراً ما تنفذ صفقاتها عبر أوامر السوق المباشرة. فوضع أمر بحجم 250 مليون دولار مباشرة على دفتر الأوامر يسبب انزلاقاً سعرياً كارثياً وينبه خوارزميات التداول عالي التردد فوراً. بدلاً من ذلك، تقوم أجهزة التوجيه الذكية للأوامر (SORs) بتقسيم الصفقات الضخمة إلى شرائح آيسبيرغ مخفية وجدران طلبات سلبية.'
            ],
            callout: {
              type: 'alpha',
              title: 'قاعدة فك شفرة أوامر الآيسبيرغ',
              text: 'ابحث دائماً عن الحجم المنفذ العالي الذي يقابله حد أدنى من الحركة السعرية عند المستويات المفتاحية. إذا تم تداول 10,000 عقد عند مستوى محدد دون كسر القاع، فهذا دليل قاطع على وجود جدار امتصاص مؤسسي نشط.'
            }
          },
          {
            sectionId: 'sec-2',
            sectionTitle: 'تباعد دلتا الحجم التراكمي (CVD) ومصائد السيولة',
            paragraphs: [
              'يقيس مؤشر CVD الفارق الصافي بين عمليات الشراء الهجومية (عند سعر العرض Ask) وعمليات البيع الهجومية (عند سعر الطلب Bid). وعندما يسجل السعر قيعاناً متناقصة بينما يشكل CVD قيعاناً متصاعدة، فإن هذا التباعد الصاعد يكشف بوضوح أن البائعين الهجوميين يتم امتصاصهم بالكامل من قبل صانعي السوق المؤسسيين.',
              'هذا النمط بالذات يمثل بيئة الدخول النموذجية لمفاهيم الأموال الذكية (SMC)، حيث تنتهي مرحلة جمع السيولة وتبدأ مرحلة التوسع الصعودي السريع.'
            ],
            codeBlock: {
              language: 'python',
              code: `# خوارزمية كشف امتصاص الآيسبيرغ في بايثون
def detect_iceberg_absorption(order_book_tick, delta_threshold=500):
    bid_volume = order_book_tick['bid_vol']
    trade_volume = order_book_tick['executed_vol']
    price_change = abs(order_book_tick['price_delta'])
    
    # نسبة كفاءة السيولة
    absorption_ratio = trade_volume / max(price_change, 0.25)
    if absorption_ratio > delta_threshold and trade_volume > bid_volume * 3:
        return {"signal": "ICEBERG_ABSORPTION_DETECTED", "bias": "BULLISH"}`
            }
          }
        ],
        tags: ['تدفق الأوامر', 'دلتا تراكمية', 'دفتر الأوامر L2', 'أوامر الآيسبيرغ', 'عقود ES']
      },
      {
        ...baseArticles[1],
        author: authors.elena,
        title: 'دورة السيولة العالمية الفائقة: الميزانيات العمومية للبنوك المركزية وقمم البيتكوين متعددة السنوات',
        subtitle: 'كيف تحرك التغيرات الصافية في سيولة مجموعة السبع (G7) وحساب الخزانة العام (TGA) دورات الأصول المشفرة والأسواق الخطرة.',
        imageCaption: 'مصفوفة تتبع السيولة النقدية للبنوك المركزية وارتباطها التاريخي بالأصول الرقمية',
        publishedAt: '22 مايو 2026',
        readTime: '11 دقيقة قراءة',
        summary: [
          'مؤشر سيولة مجموعة السبع الصافي (G7 Net Liquidity) يتطابق بنسبة ارتباط تفوق 88% مع الدورات الكبرى للبيتكوين ومؤشر ناسداك.',
          'عمليات سحب الخزانة الأمريكية من حساب TGA تضخ سيولة نقدية مباشرة في النظام المصرفي والاحتياطيات الفائضة.',
          'فترات التيسير الكمي الخفي من قبل البنوك المركزية توفر أطول وأقوى موجات الصعود في أسواق الكريبتو.'
        ],
        tradeSetup: {
          asset: 'البيتكوين (BTC / USDT)',
          direction: 'LONG',
          timeframe: 'إطار يومي / أسبوعي كلي',
          entryZone: '91,200$ - 93,500$ (مستوى اختبار السيولة الكلية)',
          stopLoss: '87,400$ (إغلاق أسبوعي أسفل خط الأساس)',
          takeProfit1: '108,000$ (توسع فيبوناتشي 1.272)',
          takeProfit2: '124,500$ (هدف السيولة الكلية الفائقة)',
          riskReward: '1 : 4.12',
          keyCatalyst: 'توسع متزامن في الميزانيات العمومية للاحتياطي الفيدرالي وبنك اليابان مع انخفاض TGA'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'معادلة السيولة الكلية الحقيقية',
            paragraphs: [
              'يعتقد معظم متداولي التجزئة أن أسعار البيتكوين تعتمد فقط على أخبار التبني أو مؤشرات التحليل الفني التقليدية. الحقيقة المؤسسية هي أن البيتكوين هو المقياس الأكثر نقاءً وحساسية لفيضانات السيولة النقدية العالمية من البنوك المركزية.',
              'الصيغة الرياضية المعتمدة في مكاتبنا لحساب السيولة العالمية الصافية تجمع أصول الفيدرالي، البنك المركزي الأوروبي، بنك اليابان وبنك إنجلترا، مطروحاً منها حساب الخزانة العامة واتفاقيات إعادة الشراء العكسي (RRP).'
            ]
          }
        ],
        tags: ['اقتصاد كلي', 'بيتكوين', 'سيولة عالمية', 'بنوك مركزية', 'مجموعة السبع']
      },
      {
        ...baseArticles[2],
        author: authors.alex,
        title: 'بناء محرك مراجحة إحصائية عالي نسبة شارب: التكامل المشترك وتداول الأزواج بلغة بايثون',
        subtitle: 'دليل كمي خطوة بخطوة لتطبيق نموذج اختبار ديكي-فولر المعزز والارتداد للمتوسط الرياضي مع تجنب المخاطر المتطرفة.',
        imageCaption: 'نمذجة انحراف فروق الأسعار وزمن النصف للارتداد إلى المتوسط الرياضي',
        publishedAt: '19 مايو 2026',
        readTime: '14 دقيقة قراءة',
        summary: [
          'التكامل المشترك (Cointegration) يختلف جوهرياً عن الارتباط البسيط، حيث يضمن وجود علاقة توازنية طويلة المدى بين الأصول.',
          'حساب زمن النصف (Half-Life) للارتداد الرياضي يحدد الأفق الزمني الأمثل للاحتفاظ بالصفقة دون استنزاف رأس المال.',
          'استخدام نقاط Z-Score الديناميكية يسمح بالدخول عند الانحراف المعياري +2 والخروج عند التوازن الصفري.'
        ],
        tradeSetup: {
          asset: 'زوج أزواج: ES / NQ Spread',
          direction: 'NEUTRAL',
          timeframe: 'إحصائي عالي التردد (HFT)',
          entryZone: 'Z-Score > +2.15 انحراف معياري',
          stopLoss: 'Z-Score يتجاوز +3.20 (كسر التكامل المشترك)',
          takeProfit1: 'Z-Score = +0.50 (الارتداد نحو الوسط)',
          takeProfit2: 'Z-Score = 0.00 (التوازن الإحصائي التام)',
          riskReward: '1 : 2.90',
          keyCatalyst: 'اتساع الفارق السعري الإحصائي بين عقود إس آند بي وناسداك بشكل مفرط'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'الأساس الرياضي لاختبار التكامل المشترك',
            paragraphs: [
              'في حين أن سلاسل الأسعار المالية غير مستقرة بطبيعتها (Non-Stationary)، فإن التركيبة الخطية بين أصلين متكاملين مشتركاً تشكل سلسلة مستقرة ترتد بالضرورة إلى متوسطها الرياضي.',
              'باستخدام اختبار Engle-Granger ذي الخطوتين، يمكننا عزل الإشارات الإحصائية ذات نسبة شارب (Sharpe Ratio) تتجاوز 2.8 في مختلف ظروف السوق.'
            ]
          }
        ],
        tags: ['تداول كمي', 'بايثون', 'مراجحة إحصائية', 'تكامل مشترك', 'نسبة شارب']
      },
      {
        ...baseArticles[3],
        author: authors.abuAsad,
        title: 'إطار اختراق الذهب: التخلي عن الدولار في احتياطيات البنوك المركزية والتحليل الفني للملاذ الآمن',
        subtitle: 'لماذا يستمر الذهب الفوري (XAUUSD) في تسجيل قمم تاريخية، وكيف يمكن قراءة كتل الأوامر الصاعدة على الأطر الزمنية الكبرى.',
        imageCaption: 'مشتريات البنوك المركزية السيادية من الذهب وتطابقها مع كتل الأوامر الشهرية',
        publishedAt: '16 مايو 2026',
        readTime: '7 دقائق قراءة',
        summary: [
          'تراكم الذهب من قبل البنوك المركزية السيادية غير مسبوق في التاريخ الحديث، مما يخلق أرضية دعم صلبة للأسعار.',
          'الارتداد من كتل الأوامر المؤسسية الشهرية (Monthly Order Blocks) يؤكد استمرار الاتجاه الصاعد بقوة.',
          'انخفاض العوائد الحقيقية للسندات الأمريكية يشكل الوقود المحرك لانفجارات الذهب القادمة.'
        ],
        tradeSetup: {
          asset: 'الذهب الفوري مقابل الدولار (XAU/USD)',
          direction: 'LONG',
          timeframe: '4 ساعات / يومي',
          entryZone: '3,210.00$ - 3,225.00$ (كتلة أوامر شرائية صاعدة)',
          stopLoss: '3,180.00$ (كسر قاع التأكيد الهيكلي)',
          takeProfit1: '3,320.00$ (القمة القياسية السابقة)',
          takeProfit2: '3,450.00$ (امتداد فيبوناتشي 1.618)',
          riskReward: '1 : 3.65',
          keyCatalyst: 'تسارع مشتريات الذهب السيادية وكسر قمة منطقة التماسك الشهرية'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'التحول الجيوسياسي نحو الأصول الصلبة',
            paragraphs: [
              'منذ تجميد الاحتياطيات النقدية الأجنبية في السنوات الأخيرة، تسارعت وتيرة تنويع البنوك المركزية بعيداً عن سندات الخزانة الأمريكية ونحو الذهب المادي المودع محلياً.',
              'هذا الطلب المؤسسي الصامت لا يظهر في عناوين الأخبار اليومية، بل ينعكس في استمرار صانعي السوق في شراء كل تصحيح سعري نحو كتل الطلب الأسبوعية.'
            ]
          }
        ],
        tags: ['ذهب', 'فوركس', 'أموال ذكية', 'احتياطيات سيادية', 'ملاذ آمن']
      },
      {
        ...baseArticles[4],
        author: authors.marcus,
        title: 'سطح التقلب والتعرض لغاما: كيف يدفع تحوط صناع السوق التقلبات السعرية الكبرى',
        subtitle: 'فهم نقطة تحول غاما (Gamma Flip Level) وكيف يتحول صانعو سوق الخيارات من ممتصين للصدمات إلى مسرعين للانفجارات السعرية.',
        imageCaption: 'مستويات تركز غاما الإيجابية والسلبية وعلاقتها بحركة مؤشر S&P 500',
        publishedAt: '12 مايو 2026',
        readTime: '10 دقائق قراءة',
        summary: [
          'عندما يكون صناع السوق في منطقة غاما إيجابية، يقومون بالبيع عند الصعود والشراء عند الهبوط مما يقمع التقلب السعري.',
          'العبور أسفل نقطة تحول غاما (Gamma Flip) يجبرهم على البيع مع كل انخفاض سعري لتغطية دلتا، مما يؤدي إلى انهيارات عمودية.',
          'تتبع تمركز عقود الخيارات الصفرية (0DTE) يوفر ميزة تداول يومية حاسمة لتحديد سقف وقاع الجلسة.'
        ],
        tradeSetup: {
          asset: 'خيارات SPX / SPY',
          direction: 'SHORT',
          timeframe: 'جلسة التداول اليومية (0DTE)',
          entryZone: 'كسر مستوى غاما الصفرية 5,910.00',
          stopLoss: '5,928.00 (العودة إلى غاما إيجابية)',
          takeProfit1: '5,860.00 (منطقة تركز عقود البيع Put Wall)',
          takeProfit2: '5,825.00 (فجوة السيولة السفلية الكبرى)',
          riskReward: '1 : 3.40',
          keyCatalyst: 'انزلاق السوق أسفل مستوى Gamma Flip وتوسع التقلب الضمني'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'ميكانيكا تحوط صانعي سوق المشتقات',
            paragraphs: [
              'صانع سوق الخيارات لا يراهن على اتجاه السعر، بل يسعى إلى البقاء محايد الدلتا (Delta Neutral) في جميع الأوقات. ولكي يحافظ على هذا الحياد مع تغير أسعار الأصل الأساسي، يجب عليه إعادة موازنة مراكزه باستمرار.',
              'في بيئة الغاما السلبية، تتسارع وتيرة التحوط في نفس اتجاه حركة السعر، مما يحول التصحيحات البسيطة إلى موجات هبوط أو صعود كاسحة.'
            ]
          }
        ],
        tags: ['خيارات', 'مشتقات', 'غاما', 'تقلب السوق', 'تحوط صانع السوق']
      },
      {
        ...baseArticles[5],
        author: authors.sarah,
        title: 'عقلية المتداول النخبة: التغلب على التحيزات الإدراكية، ومنع الانفعال، وتحديد أحجام الصفقات الرياضية',
        subtitle: 'كيف تدير أفضل صناديق التحوط ومكاتب التداول الاستثمارية الجانب العصبي والإدراكي لإدارة مخاطر التراجع (Drawdowns).',
        imageCaption: 'مسارات الإدراك العصبي وهرمون الكورتيزول وتأثيرهما المباشر على قرارات التداول',
        publishedAt: '08 مايو 2026',
        readTime: '9 دقائق قراءة',
        summary: [
          'أكبر خطر يهدد رأس مال المتداول ليس نقص المعرفة الفنية، بل التحيز التأكيدي والنفور المفرط من الخسارة (Loss Aversion).',
          'التوقف الإجباري بعد صفقتين خاسرتين متتاليتين يمنح الدماغ 30 دقيقة لإعادة ضبط الكورتيزول واستعادة التفكير المنطقي.',
          'حجم المركز المحسوب وفق كسر كيلي (Kelly Fraction) يحمي الحساب من الهبوط الحاد مع تعظيم النمو التراكمي.'
        ],
        tradeSetup: {
          asset: 'بروتوكول إدارة مخاطر المحفظة',
          direction: 'NEUTRAL',
          timeframe: 'إدارة أداء مستمرة',
          entryZone: 'مخاطرة بحد أقصى 1.0% لكل صفقة تداول',
          stopLoss: 'توقف يومي إلزامي عند خسارة 2.5%',
          takeProfit1: 'سحب 25% من الأرباح الشهرية إلى حساب الأمان',
          takeProfit2: 'استمرار النمو المركب لقاعدة رأس المال المستقرة',
          riskReward: 'عائد تراكمي متوازن',
          keyCatalyst: 'الالتزام التام بقواعد خطة التداول المكتوبة مسبقاً دون استثناء'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'البيولوجيا العصبية لاتخاذ القرار تحت الضغط',
            paragraphs: [
              'عندما يدخل المتداول في حالة انفعال نفسي (Tilt) نتيجة خسارة غير متوقعة، تسيطر اللوزة الدماغية (Amygdala) على اتخاذ القرار وتتراجع كفاءة قشرة الفص الجبهي المسؤولة عن التخطيط العقلاني.',
              'المتداولون المحترفون لا يعتمدون على "قوة الإرادة" المجردة لمقاومة الانفعال، بل يضعون أنظمة حاسوبية صارمة وقواعد آلية تقطع الاتصال فوراً عند الوصول إلى حد الخسارة اليومي.'
            ]
          }
        ],
        tags: ['علم النفس', 'إدارة المخاطر', 'أداء المتداولين', 'الانفعال النفسي', 'تحديد حجم الصفقات']
      }
    ];
  }

  if (lang === 'ru') {
    return [
      {
        ...baseArticles[0],
        author: authors.abuAsad,
        title: 'Микроструктура рынка и Order Flow: декодирование институциональных айсберг-ордеров и дельта-дисбалансов',
        subtitle: 'Как ведущие хедж-фонды маскируют 9-значные позиции с помощью алгоритмов исполнения и как трейдеры могут выявлять этот след.',
        imageCaption: 'SMTrading.pro — Институциональный визуализатор микроструктуры рынка и потока книги заявок',
        publishedAt: '24 мая 2026 г.',
        readTime: '8 мин чтения',
        summary: [
          'Институциональное исполнение минимизирует проскальзывание через айсберги и алгоритмы VWAP.',
          'Дивергенция кумулятивной дельты объема (CVD) на пулах ликвидности сигнализирует о поглощении перед разворотом.',
          'Переходы точки контроля (POC) профиля объема служат четкими уровнями инвалидации для внутридневных входов.'
        ],
        tradeSetup: {
          asset: 'Фьючерс E-mini S&P 500 (ES)',
          direction: 'LONG',
          timeframe: 'Конфлюэнция 15М / 1Ч',
          entryZone: '5,910.00 - 5,914.50 (Зона поглощения)',
          stopLoss: '5,898.00 (Ниже узла низкого объема LVN)',
          takeProfit1: '5,948.00 (Ликвидность Single Prints)',
          takeProfit2: '5,972.50 (Верхняя граница зоны стоимости прошлой недели VAH)',
          riskReward: '1 : 3.85',
          keyCatalyst: 'Агрессивное поглощение лимитных заявок на нижней границе VAL с бычьей дивергенцией CVD'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Анатомия скрытого институционального объема',
            paragraphs: [
              'Обычные свечные графики отражают лишь прошлую историю цены. Чтобы извлекать стабильную альфу на современных электронных рынках, необходимо анализировать аукционный процесс на миллисекундном уровне.',
              'Крупные фонды редко отправляют рыночные ордера. Попытка исполнить заявку на $250 млн по рынку вызовет катастрофическое проскальзывание. Вместо этого умные маршрутизаторы ордеров (SOR) дробят позицию на скрытые айсберг-клипы.'
            ]
          }
        ],
        tags: ['Order Flow', 'Кумулятивная дельта', 'Level 2 DOM', 'Айсберг-ордера', 'Фьючерсы ES']
      },
      {
        ...baseArticles[1],
        author: authors.elena,
        title: 'Суперцикл глобальной ликвидности: балансы центробанков и многолетние вершины Биткоина',
        subtitle: 'Как изменения чистой ликвидности стран G7 и казначейского счета TGA формируют макроциклы криптоактивов.',
        imageCaption: 'Матрица ликвидности мировых центробанков и ее историческая корреляция с криптовалютами',
        publishedAt: '22 мая 2026 г.',
        readTime: '11 мин чтения',
        summary: [
          'Чистая ликвидность G7 демонстрирует корреляцию свыше 88% с циклами Биткоина и Nasdaq.',
          'Снижение баланса счета казначейства США (TGA) напрямую высвобождает долларовую ликвидность в банковскую систему.',
          'Скрытые циклы смягчения ДКП мировыми центробанками открывают фазы мощного экспоненциального роста.'
        ],
        tradeSetup: {
          asset: 'Биткоин (BTC / USDT)',
          direction: 'LONG',
          timeframe: 'Дневной / Недельный макро',
          entryZone: '$91,200 - $93,500 (Зона макротеста ликвидности)',
          stopLoss: '$87,400 (Закрытие недели ниже базиса)',
          takeProfit1: '$108,000 (Расширение Фибоначчи 1.272)',
          takeProfit2: '$124,500 (Макроцель глобальной ликвидности)',
          riskReward: '1 : 4.12',
          keyCatalyst: 'Синхронное расширение балансов ФРС и Банка Японии при снижении TGA'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Формула реальной глобальной ликвидности',
            paragraphs: [
              'Криптовалюты представляют собой чистейший барометр глобальной фиатной денежной массы. Когда балансы ведущих центробанков расширяются, капиталы неизбежно перетекают в активы с ограниченной эмиссией.',
              'Количественная модель SMTrading непрерывно агрегирует активы центробанков США, ЕС, Японии и Великобритании за вычетом TGA и операций обратного РЕПО.'
            ]
          }
        ],
        tags: ['Global Macro', 'Биткоин', 'Ликвидность', 'Центробанки', 'G7']
      },
      {
        ...baseArticles[2],
        author: authors.alex,
        title: 'Создание статистического арбитражного движка с высоким коэффициентом Шарпа: коинтеграция и парный трейдинг на Python',
        subtitle: 'Пошаговое руководство по реализации теста Дики-Фуллера и математического возврата к среднему без риска разорения.',
        imageCaption: 'Моделирование спреда и времени полураспада для возврата к среднему',
        publishedAt: '19 мая 2026 г.',
        readTime: '14 мин чтения',
        summary: [
          'Коинтеграция гарантирует долгосрочное равновесие между рядами в отличие от нестабильной корреляции.',
          'Период полураспада (Half-Life) определяет математически обоснованный горизонт удержания позиций.',
          'Входы по Z-Score при отклонении +2 с фиксацией в точке нулевого равновесия обеспечивают Sharpe выше 2.5.'
        ],
        tradeSetup: {
          asset: 'Парный спред: ES / NQ',
          direction: 'NEUTRAL',
          timeframe: 'HFT / Статистический',
          entryZone: 'Z-Score > +2.15 ст. откл.',
          stopLoss: 'Z-Score превышает +3.20 (разрыв коинтеграции)',
          takeProfit1: 'Z-Score = +0.50 (нормализация спреда)',
          takeProfit2: 'Z-Score = 0.00 (полное математическое равновесие)',
          riskReward: '1 : 2.90',
          keyCatalyst: 'Экстремальное статистическое расхождение между фьючерсами S&P и Nasdaq'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Математические основы коинтеграции',
            paragraphs: [
              'В то время как отдельные финансовые временные ряды нестационарны, линейная комбинация коинтегрированных инструментов образует стационарный процесс.',
              'С использованием двухшагового метода Энгла-Грейнджера мы изолируем спреды с коэффициентом Шарпа свыше 2.8 независимо от направления общего рынка.'
            ]
          }
        ],
        tags: ['Квант-трейдинг', 'Python', 'Статарбитраж', 'Коинтеграция', 'Шарп']
      },
      {
        ...baseArticles[3],
        author: authors.abuAsad,
        title: 'Фреймворк пробоя золота: дедолларизация резервов центробанков и технический анализ активов-убежищ',
        subtitle: 'Почему спотовое золото (XAUUSD) обновляет исторические рекорды и как находить бычьи институциональные ордерблоки.',
        imageCaption: 'Покупки золота суверенными центробанками и совпадение с месячными ордерблоками',
        publishedAt: '16 мая 2026 г.',
        readTime: '7 мин чтения',
        summary: [
          'Накопление физического золота центробанками достигло исторических максимумов за последние десятилетия.',
          'Реакция от месячных институциональных ордерблоков подтверждает сохранение доминирующего тренда.',
          'Снижение реальной доходности казначейских облигаций США ускоряет приток капитала в металлы.'
        ],
        tradeSetup: {
          asset: 'Спот Золото / Доллар США (XAU/USD)',
          direction: 'LONG',
          timeframe: '4 часа / Дневной',
          entryZone: '$3,210.00 - $3,225.00 (Бычий ордерблок)',
          stopLoss: '$3,180.00 (Инвалидация структуры)',
          takeProfit1: '$3,320.00 (Предыдущий исторический максимум)',
          takeProfit2: '$3,450.00 (Расширение Фибоначчи 1.618)',
          riskReward: '1 : 3.65',
          keyCatalyst: 'Массовая аккумуляция золота центробанками и выход из месячной консолидации'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Геополитический сдвиг в твердые активы',
            paragraphs: [
              'Суверенные фонды активно диверсифицируют золотовалютные резервы, выводя капитал из долговых обязательств в физический металл.',
              'Этот устойчивый институциональный спрос защищает ключевые зоны поддержки и превращает каждую глубокую коррекцию в возможность для входа по концепциям SMC.'
            ]
          }
        ],
        tags: ['Золото', 'Форекс', 'Smart Money', 'Центробанки', 'Активы-убежища']
      },
      {
        ...baseArticles[4],
        author: authors.marcus,
        title: 'Поверхность волатильности и Gamma Exposure: как хеджирование маркет-мейкеров провоцирует масштабные движения',
        subtitle: 'Как уровень Gamma Flip превращает маркет-мейкеров из гасителей рыночных колебаний в катализаторы обвалов и взлетов.',
        imageCaption: 'Уровни распределения положительной и отрицательной гаммы по страйкам S&P 500',
        publishedAt: '12 мая 2026 г.',
        readTime: '10 мин чтения',
        summary: [
          'В зоне положительной гаммы маркет-мейкеры покупают на спадах и продают на взлетах, сглаживая рыночную волатильность.',
          'Пробой ниже уровня Gamma Flip заставляет дилеров продавать при падении для дельта-хеджирования, провоцируя лавинообразные распродажи.',
          'Анализ структуры позиций опционов 0DTE дает ключевое преимущество для определения максимумов и минимумов дня.'
        ],
        tradeSetup: {
          asset: 'Опционы SPX / SPY',
          direction: 'SHORT',
          timeframe: 'Интрадей (0DTE)',
          entryZone: 'Пробой уровня нулевой гаммы 5,910.00',
          stopLoss: '5,928.00 (Возврат в зону положительной гаммы)',
          takeProfit1: '5,860.00 (Пул ликвидности Put Wall)',
          takeProfit2: '5,825.00 (Нижний карман ликвидности)',
          riskReward: '1 : 3.40',
          keyCatalyst: 'Смещение в зону отрицательной гаммы и резкий рост подразумеваемой волатильности'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Механика дельта-нейтрального хеджирования',
            paragraphs: [
              'Опционные маркет-мейкеры не прогнозируют направление рынка, их цель — оставаться дельта-нейтральными при любых ценовых колебаниях.',
              'Когда рынок падает ниже точки переворота гаммы, поддержание нейтральности требует продажи базового актива прямо в падающий рынок, что многократно усиливает импульс.'
            ]
          }
        ],
        tags: ['Опционы', 'Деривативы', 'Гамма', 'Волатильность', 'Маркет-мейкинг']
      },
      {
        ...baseArticles[5],
        author: authors.sarah,
        title: 'Психология элитного трейдера: преодоление когнитивных искажений, защита от тильта и математический сайзинг',
        subtitle: 'Как ведущие проп-трейдинговые фирмы и хедж-фонды управляют нейрокогнитивными рисками и предотвращают просадки.',
        imageCaption: 'Влияние кортизола и активности миндалевидного тела на качество торговых решений',
        publishedAt: '08 мая 2026 г.',
        readTime: '9 мин чтения',
        summary: [
          'Главная угроза депозиту кроется не в отсутствии знаний, а в когнитивных искажениях и страхе перед фиксацией убытка.',
          'Таймаут после 2 стоп-лоссов подряд позволяет снизить уровень кортизола за 30 минут и вернуть ясность мышления.',
          'Дробный критерий Келли защищает счет от критической просадки при максимальном геометрическом росте капитала.'
        ],
        tradeSetup: {
          asset: 'Протокол риск-менеджмента портфеля',
          direction: 'NEUTRAL',
          timeframe: 'Непрерывное управление эффективностью',
          entryZone: 'Максимальный риск 1.0% на сделку',
          stopLoss: 'Обязательный дневной лимит потерь 2.5%',
          takeProfit1: 'Вывод 25% ежемесячной прибыли в резерв',
          takeProfit2: 'Долгосрочное сложное реинвестирование',
          riskReward: 'Стабильный сложный процент',
          keyCatalyst: 'Строгое следование торговому алгоритму без исключений'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Нейробиология решений под стрессом',
            paragraphs: [
              'При наступлении тильта после неожиданного убытка контроль над поведением переходит к лимбической системе, отключая рациональные функции префронтальной коры.',
              'Профессиональные трейдеры не полагаются на силу воли — они используют программные ограничения и риск-параметры терминала для принудительной защиты счета.'
            ]
          }
        ],
        tags: ['Психология', 'Риск-менеджмент', 'Проп-трейдинг', 'Тильт', 'Сайзинг']
      }
    ];
  }

  if (lang === 'uk') {
    return [
      {
        ...baseArticles[0],
        author: authors.abuAsad,
        title: 'Мікроструктура ринку та Order Flow: декодування інституційних айсберг-ордерів та дельта-дисбалансів',
        subtitle: 'Як провідні хедж-фонди маскують 9-значні позиції за допомогою алгоритмів виконання і як трейдери можуть виявляти цей слід.',
        imageCaption: 'SMTrading.pro — Інституційний візуалізатор мікроструктури ринку та потоку книги заявок',
        publishedAt: '24 травня 2026 р.',
        readTime: '8 хв читання',
        summary: [
          'Інституційне виконання мінімізує проковзування через айсберги та алгоритми VWAP.',
          'Дивергенція кумулятивної дельти об\'єму (CVD) на пулах ліквідності сигналізує про поглинання перед розворотом.',
          'Переходи точки контролю (POC) профілю об\'єму слугують чіткими рівнями інвалідації для внутрішньоденних входів.'
        ],
        tradeSetup: {
          asset: 'Ф\'ючерс E-mini S&P 500 (ES)',
          direction: 'LONG',
          timeframe: 'Збіг 15ХВ / 1ГОД',
          entryZone: '5,910.00 - 5,914.50 (Зона поглинання)',
          stopLoss: '5,898.00 (Нижче вузла низького об\'єму LVN)',
          takeProfit1: '5,948.00 (Ліквідність Single Prints)',
          takeProfit2: '5,972.50 (Верхня межа зони вартості минулого тижня VAH)',
          riskReward: '1 : 3.85',
          keyCatalyst: 'Агресивне поглинання лімітних заявок на нижній межі VAL з бичачою дивергенцією CVD'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Анатомія прихованого інституційного об\'єму',
            paragraphs: [
              'Звичайні свічкові графіки відображають лише минулу історію ціни. Щоб витягувати стабільну альфу на сучасних електронних ринках, необхідно аналізувати аукціонний процес на мілісекундному рівні.',
              'Великі фонди рідко відправляють ринкові ордери. Спроба виконати заявку на $250 млн за ринком спричинить катастрофічне проковзування. Натомість розумні маршрутизатори ордерів (SOR) дроблять позицію на приховані айсберг-кліпи.'
            ]
          }
        ],
        tags: ['Order Flow', 'Кумулятивна дельта', 'Level 2 DOM', 'Айсберг-ордери', 'Ф\'ючерси ES']
      },
      {
        ...baseArticles[1],
        author: authors.elena,
        title: 'Суперцикл глобальної ліквідності: баланси центробанків та багаторічні вершини Біткоїна',
        subtitle: 'Як зміни чистої ліквідності країн G7 та казначейського рахунку TGA формують макроцикли криптоактивів.',
        imageCaption: 'Матриця ліквідності світових центробанків та її історична кореляція з криптовалютами',
        publishedAt: '22 травня 2026 р.',
        readTime: '11 хв читання',
        summary: [
          'Чиста ліквідність G7 демонструє кореляцію понад 88% із циклами Біткоїна та Nasdaq.',
          'Зниження балансу рахунку казначейства США (TGA) безпосередньо вивільняє доларову ліквідність у банківську систему.',
          'Приховані цикли пом\'якшення ДКП світовими центробанками відкривають фази потужного експоненційного зростання.'
        ],
        tradeSetup: {
          asset: 'Біткоїн (BTC / USDT)',
          direction: 'LONG',
          timeframe: 'Денний / Тижневий макро',
          entryZone: '$91,200 - $93,500 (Зона макротесту ліквідності)',
          stopLoss: '$87,400 (Закриття тижня нижче базису)',
          takeProfit1: '$108,000 (Розширення Фібоначчі 1.272)',
          takeProfit2: '$124,500 (Макроціль глобальної ліквідності)',
          riskReward: '1 : 4.12',
          keyCatalyst: 'Синхронне розширення балансів ФРС та Банку Японії при зниженні TGA'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Формула реальної глобальної ліквідності',
            paragraphs: [
              'Криптовалюти представляють найчистіший барометр глобальної фіатної грошової маси. Коли баланси провідних центробанків розширюються, капітали неминуче перетікають в активи з обмеженою емісією.',
              'Кількісна модель SMTrading безперервно агрегує активи центробанків США, ЄС, Японії та Великобританії за вирахуванням TGA та операцій зворотного РЕПО.'
            ]
          }
        ],
        tags: ['Global Macro', 'Біткоїн', 'Ліквідність', 'Центробанки', 'G7']
      },
      {
        ...baseArticles[2],
        author: authors.alex,
        title: 'Створення статистичного арбітражного рушія з високим коефіцієнтом Шарпа: коінтеграція та парний трейдинг на Python',
        subtitle: 'Покроковий посібник із реалізації тесту Дікі-Фуллера та математичного повернення до середнього без ризику розорення.',
        imageCaption: 'Моделювання спреду та часу напіврозпаду для повернення до середнього',
        publishedAt: '19 травня 2026 р.',
        readTime: '14 хв читання',
        summary: [
          'Коінтеграція гарантує довгострокову рівновагу між рядами на відміну від нестабільної кореляції.',
          'Період напіврозпаду (Half-Life) визначає математично обґрунтований горизонт утримання позицій.',
          'Входи за Z-Score при відхиленні +2 з фіксацією в точці нульової рівноваги забезпечують Sharpe вище 2.5.'
        ],
        tradeSetup: {
          asset: 'Парний спред: ES / NQ',
          direction: 'NEUTRAL',
          timeframe: 'HFT / Статистичний',
          entryZone: 'Z-Score > +2.15 ст. відх.',
          stopLoss: 'Z-Score перевищує +3.20 (розрив коінтеграції)',
          takeProfit1: 'Z-Score = +0.50 (нормалізація спреду)',
          takeProfit2: 'Z-Score = 0.00 (повна математична рівновага)',
          riskReward: '1 : 2.90',
          keyCatalyst: 'Екстремальна статистична розбіжність між ф\'ючерсами S&P та Nasdaq'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Математичні основи коінтеграції',
            paragraphs: [
              'У той час як окремі фінансові часові ряди нестаціонарні, лінійна комбінація коінтегрованих інструментів утворює стаціонарний процес.',
              'З використанням двокрокового методу Енгла-Грейнджера ми ізолюємо спреди з коефіцієнтом Шарпа понад 2.8 незалежно від напрямку загального ринку.'
            ]
          }
        ],
        tags: ['Квант-трейдинг', 'Python', 'Статарбітраж', 'Коінтеграція', 'Шарп']
      },
      {
        ...baseArticles[3],
        author: authors.abuAsad,
        title: 'Фреймворк пробою золота: дедоларизація резервів центробанків та технічний аналіз активів-прихистків',
        subtitle: 'Чому спотове золото (XAUUSD) оновлює історичні рекорди і як знаходити бичачі інституційні ордерблоки.',
        imageCaption: 'Купівлі золота суверенними центробанками та збіг з місячними ордерблоками',
        publishedAt: '16 травня 2026 р.',
        readTime: '7 хв читання',
        summary: [
          'Накопичення фізичного золота центробанками досягло історичних максимумів за останні десятиліття.',
          'Реакція від місячних інституційних ордерблоків підтверджує збереження домінуючого тренду.',
          'Зниження реальної прибутковості казначейських облігацій США прискорює приплив капіталу в метали.'
        ],
        tradeSetup: {
          asset: 'Спот Золото / Долар США (XAU/USD)',
          direction: 'LONG',
          timeframe: '4 години / Денний',
          entryZone: '$3,210.00 - $3,225.00 (Бичачий ордерблок)',
          stopLoss: '$3,180.00 (Інвалідація структури)',
          takeProfit1: '$3,320.00 (Попередній історичний максимум)',
          takeProfit2: '$3,450.00 (Розширення Фібоначчі 1.618)',
          riskReward: '1 : 3.65',
          keyCatalyst: 'Масова акумуляція золота центробанками та вихід із місячної консолідації'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Геополітичне зрушення у тверді активи',
            paragraphs: [
              'Суверенні фонди активно диверсифікують золотовалютні резерви, виводячи капітал із боргових зобов\'язань у фізичний метал.',
              'Цей стійкий інституційний попит захищає ключові зони підтримки і перетворює кожну глибоку корекцію на можливість для входу за концепціями SMC.'
            ]
          }
        ],
        tags: ['Золото', 'Форекс', 'Smart Money', 'Центробанки', 'Активи-прихистки']
      },
      {
        ...baseArticles[4],
        author: authors.marcus,
        title: 'Поверхня волатильності та Gamma Exposure: як хеджування маркет-мейкерів провокує масштабні рухи',
        subtitle: 'Як рівень Gamma Flip перетворює маркет-мейкерів з гасителів ринкових коливань на каталізатори обвалів та злетів.',
        imageCaption: 'Рівні розподілу позитивної та негативної гами за страйками S&P 500',
        publishedAt: '12 травня 2026 р.',
        readTime: '10 хв читання',
        summary: [
          'У зоні позитивної гами маркет-мейкери купують на спадах і продають на злетах, згладжуючи ринкову волатильність.',
          'Пробій нижче рівня Gamma Flip змушує дилерів продавати при падінні для дельта-хеджування, провокуючи лавиноподібні розпродажі.',
          'Аналіз структури позицій опціонів 0DTE дає ключову перевагу для визначення максимумів і мінімумів дня.'
        ],
        tradeSetup: {
          asset: 'Опціони SPX / SPY',
          direction: 'SHORT',
          timeframe: 'Інтрадей (0DTE)',
          entryZone: 'Пробій рівня нульової гами 5,910.00',
          stopLoss: '5,928.00 (Повернення в зону позитивної гами)',
          takeProfit1: '5,860.00 (Пул ліквідності Put Wall)',
          takeProfit2: '5,825.00 (Нижня кишеня ліквідності)',
          riskReward: '1 : 3.40',
          keyCatalyst: 'Зсув у зону негативної гами та різке зростання передбачуваної волатильності'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Механіка дельта-нейтрального хеджування',
            paragraphs: [
              'Опціонні маркет-мейкери не прогнозують напрямок ринку, їхня мета — залишатися дельта-нейтральними при будь-яких цінових коливаннях.',
              'Коли ринок падає нижче точки перевороту гами, підтримка нейтральності вимагає продажу базового активу прямо в падаючий ринок, що багаторазово посилює імпульс.'
            ]
          }
        ],
        tags: ['Опціони', 'Деривативи', 'Гама', 'Волатильність', 'Маркет-мейкінг']
      },
      {
        ...baseArticles[5],
        author: authors.sarah,
        title: 'Психологія елітного трейдера: подолання когнітивних спотворень, захист від тільту та математичний сайзинг',
        subtitle: 'Як провідні проп-трейдингові фірми та хедж-фонди управляють нейрокогнітивними ризиками та запобігають просадкам.',
        imageCaption: 'Вплив кортизолу та активності мигдалеподібного тіла на якість торгових рішень',
        publishedAt: '08 травня 2026 р.',
        readTime: '9 хв читання',
        summary: [
          'Головна загроза депозиту криється не у відсутності знань, а в когнітивних спотвореннях і страху перед фіксацією збитку.',
          'Таймаут після 2 стоп-лосів поспіль дозволяє знизити рівень кортизолу за 30 хвилин і повернути ясність мислення.',
          'Дробовий критерій Келлі захищає рахунок від критичної просадки при максимальному геометричному зростанні капіталу.'
        ],
        tradeSetup: {
          asset: 'Протокол ризик-менеджменту портфеля',
          direction: 'NEUTRAL',
          timeframe: 'Безперервне управління ефективністю',
          entryZone: 'Максимальний ризик 1.0% на угоду',
          stopLoss: 'Обов\'язковий денний ліміт втрат 2.5%',
          takeProfit1: 'Виведення 25% щомісячного прибутку в резерв',
          takeProfit2: 'Довгострокове складне реінвестування',
          riskReward: 'Стабільний складний відсоток',
          keyCatalyst: 'Суворе дотримання торгового алгоритму без винятків'
        },
        content: [
          {
            sectionId: 'sec-1',
            sectionTitle: 'Нейробіологія рішень під стресом',
            paragraphs: [
              'При настанні тільту після несподіваного збитку контроль над поведінкою переходить до лімбічної системи, відключаючи раціональні функції префронтальної кори.',
              'Професійні трейдери не покладаються на силу волі — вони використовують програмні обмеження та ризик-параметри терміналу для примусового захисту рахунку.'
            ]
          }
        ],
        tags: ['Психологія', 'Ризик-менеджмент', 'Проп-трейдинг', 'Тільт', 'Сайзинг']
      }
    ];
  }

  // Default English
  return baseArticles;
};
