import React, { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  ArrowRight, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Target, 
  Layers, 
  TrendingUp, 
  X,
  Compass,
  AlertTriangle,
  Lightbulb,
  Share2,
  Check
} from 'lucide-react';
import { useTranslation } from '../locales';
import { copyToClipboard } from '../utils/clipboard';

// High-resolution local course & strategy imagery
import smcImg from '../assets/images/smc_course_cover_1788811985326.jpg';
import timeAnalysisImg from '../assets/images/gann_box_course_1788812003836.jpg';
import classicalTaImg from '../assets/images/classic_ta_course_1788812018384.jpg';
import tradingImg from '../assets/images/hero_trading_floor_1787615744296.jpg';

export interface EducationalCardData {
  id: string;
  number: string;
  titleEn: string;
  titleAr: string;
  categoryEn: string;
  categoryAr: string;
  readTime: string;
  levelEn: string;
  levelAr: string;
  image: string;
  shortDescEn: string;
  shortDescAr: string;
  keyTopicsEn: string[];
  keyTopicsAr: string[];
  fullContent: {
    overviewEn: string;
    overviewAr: string;
    sections: {
      headingEn: string;
      headingAr: string;
      bodyEn: string;
      bodyAr: string;
      bulletPointsEn?: string[];
      bulletPointsAr?: string[];
    }[];
    rulesEn: string[];
    rulesAr: string[];
    pitfallsEn: string[];
    pitfallsAr: string[];
  };
}

export const EDUCATIONAL_CARDS: EducationalCardData[] = [
  {
    id: 'smc',
    number: '01',
    titleEn: 'SMC — Smart Money Concepts',
    titleAr: 'SMC — مفاهيم السيولة الذكية',
    categoryEn: 'Institutional Order Flow',
    categoryAr: 'حركة السعر المؤسسية',
    readTime: '12 min study',
    levelEn: 'Advanced',
    levelAr: 'متقدم',
    image: smcImg,
    shortDescEn: 'Learn how institutional algorithms engineer liquidity, hunt retail stop-losses, and leave footprints through order blocks, fair value gaps (FVG), and market structure shifts (BOS/CHoCH).',
    shortDescAr: 'تعرّف على كيفية تحرك السيولة المؤسسية الكبرى واقتناص أوامر الوقف، واكتشاف بصمات صناع السوق عبر كتل الأوامر (Order Blocks)، والفجوات السعرية (FVG)، وتغير بنية السوق (BOS / CHoCH).',
    keyTopicsEn: ['Liquidity Sweeps', 'Order Blocks (OB)', 'Fair Value Gaps (FVG)', 'BOS & CHoCH', 'Premium & Discount Zones'],
    keyTopicsAr: ['سحب السيولة', 'كتل الأوامر (OB)', 'الفجوات السعرية (FVG)', 'كسر وتغير البنية (BOS/CHoCH)', 'مناطق الخصم والغلاء'],
    fullContent: {
      overviewEn: 'Smart Money Concepts (SMC) is a systematic methodology for reading institutional market behavior. Instead of viewing prices through lagging indicators, SMC focuses on where central banks, tier-1 institutions, and algorithmic market makers inject massive capital volume.',
      overviewAr: 'تعتبر مفاهيم السيولة الذكية (SMC) منهجية احترافية لقراءة السلوك المؤسسي في الأسواق المالية. بدلاً من الاعتماد على المؤشرات المتأخرة، تركز SMC على الأماكن التي تضخ فيها البنوك المركزية والمؤسسات الكبرى سيولتها الضخمة.',
      sections: [
        {
          headingEn: '1. Liquidity Engineering & Stop Hunts',
          headingAr: '١. هندسة السيولة واصطياد أوامر الوقف',
          bodyEn: 'Institutions trade at such immense volumes that they cannot execute standard retail market orders without causing extreme slippage. Therefore, they engineer equal highs (Buy-Side Liquidity) and equal lows (Sell-Side Liquidity) to accumulate retail stops before initiating the real directional movement.',
          bodyAr: 'تتداول المؤسسات المالية الكبرى بأحجام ضخمة جداً تمنعها من الدخول عبر أوامر السوق العادية دون حدوث انزلاق سعري. لذلك، يقوم صناع السوق بهندسة قمم وقيعان متساوية لاجتذاب أوامر الوقف للمتداولين الأفراد قبل الانطلاق في الاتجاه الحقيقي.',
          bulletPointsEn: [
            'Buy-Side Liquidity (BSL): Pools of stop-losses above swing highs targeted for short entries.',
            'Sell-Side Liquidity (SSL): Pools of sell-stops below swing lows swept before explosive rallies.',
            'Liquidity Purge / Sweep: Quick wick expansion past a key high/low followed by an immediate sharp rejection.'
          ],
          bulletPointsAr: [
            'سيولة الشراء (BSL): تجمع لأوامر وقف الخسارة فوق القمم يتم استهدافها لتفعيل أوامر بيع مؤسسية.',
            'سيولة البيع (SSL): تجمع لأوامر الوقف أسفل القيعان يتم سحبها قبل صعود قوي ومفاجئ.',
            'سحب السيولة (Sweep): اختراق سريع بذيل الشمعة لمستوى القمة أو القاع يتبعه ارتداد فوري وعنيف.'
          ]
        },
        {
          headingEn: '2. Market Structure: BOS vs CHoCH',
          headingAr: '٢. بنية السوق: كسر البنية (BOS) وتغير الطابع (CHoCH)',
          bodyEn: 'Market structure provides the structural compass. Break of Structure (BOS) confirms the healthy continuation of an existing institutional trend, whereas a Change of Character (CHoCH) signals the initial warning of a structural trend reversal.',
          bodyAr: 'تعتبر بنية السوق البوصلة الأساسية لتحديد الاتجاه؛ حيث يؤكد كسر البنية (BOS) استمرار الاتجاه الحالي، بينما يعلن تغير طابع السوق (CHoCH) عن أول إشارة لتحول هيكلي في الاتجاه.',
          bulletPointsEn: [
            'BOS (Break of Structure): Candle body close beyond the prior swing high/low in the direction of the macro trend.',
            'CHoCH (Change of Character): The first counter-trend structure break, marking the transition from accumulation to distribution or vice versa.'
          ],
          bulletPointsAr: [
            'BOS: إغلاق جسم الشمعة خارج القمة أو القاع السابق في اتجاه الاتجاه العام.',
            'CHoCH: أول كسر عكسي لبنية الاتجاه، مما يشير إلى التحول من التجميع إلى التصريف أو العكس.'
          ]
        },
        {
          headingEn: '3. Order Blocks (OB) & Fair Value Gaps (FVG)',
          headingAr: '٣. كتل الأوامر (OB) والفجوات السعرية العادلة (FVG)',
          bodyEn: 'An Order Block represents the footprint of the last institutional candle before an aggressive impulse. A Fair Value Gap (FVG) occurs when aggressive one-sided orders create a 3-candle imbalance, leaving unfulfilled orders that price magnetically revisits to rebalance.',
          bodyAr: 'تمثل كتلة الأوامر (Order Block) الشمعة الأخيرة التي دخلت فيها المؤسسات قبل حدوث حركة سعرية انفجارية. بينما تحدث الفجوة السعرية (FVG) عندما يخلق تدفق الأوامر عدم توازن عبر ثلاث شمعات، تاركاً منطقة غير مغطاة يعود إليها السعر لإعادة التوازن.',
          bulletPointsEn: [
            'Bullish Order Block: The last down-close candle before a rapid upward impulse that breaks market structure.',
            'Bearish Order Block: The last up-close candle before a sharp collapse breaking swing support.',
            'FVG (Fair Value Gap): The empty space between Candle 1 high/low and Candle 3 low/high, representing true algorithmic imbalance.'
          ],
          bulletPointsAr: [
            'كتلة أوامر صاعدة (Bullish OB): آخر شمعة هابطة سبقت صعوداً عنيفاً كسر بنية السوق.',
            'كتلة أوامر هابطة (Bearish OB): آخر شمعة صاعدة سبقت هبوطاً حاداً كسر قيعان هيكلية.',
            'الفجوة السعرية (FVG): المساحة الخالية بين الشمعة الأولى والثالثة وتمثل عدم كفاءة تسعير خوارزمية.'
          ]
        }
      ],
      rulesEn: [
        'Never enter on the first touch of a high/low without confirmed liquidity sweep and structure shift.',
        'Always look for entries in Discount zones (below 50% equilibrium) for longs and Premium zones (above 50%) for shorts.',
        'Candle body closes indicate true intent; wicks only measure liquidity grabs.',
        'Align multi-timeframe direction: Use HTF (Daily/4H) for macro bias, LTF (15m/5m/1m) for precise entries.'
      ],
      rulesAr: [
        'لا تدخل أبداً عند أول ملامسة للقمم أو القيعان قبل حدوث سحب صريح للسيولة وتأكيد تغير البنية.',
        'ابحث دائماً عن صفقات الشراء في مناطق الخصم (أقل من 50%) وصفقات البيع في مناطق الغلاء (أعلى من 50%).',
        'إغلاقات أجسام الشموع تدل على النية الحقيقية للمؤسسات؛ الذيول تقيس سحب السيولة فقط.',
        'التوافق بين الأطر الزمنية: استخدم الفريم الأكبر (اليومي/4 ساعات) للاتجاه العام، والفريم الأصغر (15د/5د/1د) للتنفيذ الدقيق.'
      ],
      pitfallsEn: [
        'Labeling every single candle as an Order Block without verifying an associated structure break or liquidity sweep.',
        'Trading lower timeframe FVGs against the higher timeframe institutional order flow.',
        'Entering immediately inside an FVG before seeing rejection or lower timeframe confirmation.'
      ],
      pitfallsAr: [
        'اعتبار كل شمعة عادية بمثابة Order Block دون التأكد من كسر بنية أو سحب سيولة.',
        'التداول على فجوات الفريمات الصغيرة بعكس اتجاه تدفق الأوامر للفريمات الأكبر.',
        'الدخول المباشر بمجرد ملامسة الفجوة السعرية دون انتظار شمعة تأكيد أو إشارة انعكاس.'
      ]
    }
  },
  {
    id: 'time-analysis',
    number: '02',
    titleEn: 'Time Analysis — التحليل الزمني',
    titleAr: 'التحليل الزمني — دورات وتوقيت الأسواق',
    categoryEn: 'Temporal Cycles & Timing',
    categoryAr: 'الدورات الزمنية والتوقيت',
    readTime: '10 min study',
    levelEn: 'Specialized',
    levelAr: 'تخصصي',
    image: timeAnalysisImg,
    shortDescEn: 'Discover how cyclical time models, market timing, session killzones, and temporal behavior forecast high-probability reversal windows before price confirms them on the chart.',
    shortDescAr: 'استكشف أسرار توقيت الأسواق عبر الدورات الزمنية، وجلسات السيولة الكبرى (Killzones)، وهندسة الدورات لتحديد متى يتحرك السعر بدقة فائقة إلى جانب معرفة أين سيتحرك.',
    keyTopicsEn: ['Temporal Cycles', 'W.D. Gann Geometry', '144 Time Cycles', 'Session Killzones', 'Price-Time Confluence'],
    keyTopicsAr: ['الدورات الزمنية', 'هندسة ويليام جان', 'دورات الرقم 144', 'فترات السيولة الساخنة (Killzones)', 'التناغم الزمني السعري'],
    fullContent: {
      overviewEn: 'While most traders spend 100% of their energy asking "WHERE will price go?", elite quantitative analysts ask "WHEN will price move?". Time analysis incorporates temporal cycles, session rhythms, and mathematical time ratios to pinpoint exact trend turning windows.',
      overviewAr: 'بينما يقضي غالبية المتداولين وقتهم في التساؤل "أين سيذهب السعر؟"، يطرح كبار المحللين السؤال الأهم: "متى سيتحرك السعر؟". يدمج التحليل الزمني الدورات الفلكية والرقمية وفترات افتتاح الجلسات لتحديد نوافذ الانعكاس الزمنية بدقة.',
      sections: [
        {
          headingEn: '1. The Primacy of Time Over Price',
          headingAr: '١. سيادة البعد الزمني على البعد السعري',
          bodyEn: 'Legendary market master W.D. Gann stated: "When time is up, price must change its trend." Time is the independent variable on every chart. An ideal price support level will consistently fail if the temporal cycle has not matured.',
          bodyAr: 'قال رائد التحليل الرقمي والزمني ويليام جان: "عندما ينتهي الوقت، يجب على السعر أن يعكس اتجاهه". الوقت هو المتغير المستقل على أي شارت، ومستوى الدعم السعري الممتاز سيفشل حتماً إذا لم تكتمل الدورة الزمنية المناسبة له.',
          bulletPointsEn: [
            'Temporal Equilibrium: Price squaring with time (1x1 geometric harmony).',
            'Time Projections: Counting elapsed bars from major swing pivots to project future inflection zones.',
            'Cycle Harmonic Fractions: 1/2, 1/4, and 1/8 cycle phases that trigger intermediate volatility bursts.'
          ],
          bulletPointsAr: [
            'التربيع الزمني السعري: توازن السعر مع الزمن (زاوية 1x1 التوافقية).',
            'إسقاطات الفترات الزمنية: حساب عدد الشموع بين القمم والقيعان الرئيسية لتوقع تاريخ الانعكاس القادم.',
            'مضاعفات وتوافقات الدورات: فترات الربع والنصف التي تشهد تسارعاً مفاجئاً في حركة السعر.'
          ]
        },
        {
          headingEn: '2. Session Killzones & Algorithmic Clocks',
          headingAr: '٢. فترات التوقيت الخوارزمي (Session Killzones)',
          bodyEn: 'Modern institutional algorithms operate strictly on fixed clock times. High volatility and decisive liquidity sweeps cluster inside algorithmic delivery windows.',
          bodyAr: 'تعمل خوارزميات التداول المؤسسي الحديثة وفق ساعات محددة بدقة على مدار اليوم. تتركز السيولة العالية وسحب أوامر الوقف دائماً في فترات افتتاح البورصات العالمية الكبرى.',
          bulletPointsEn: [
            'London Open Killzone (07:00 - 10:00 UTC): Institutional manipulation often creates the high or low of the day.',
            'New York Open Killzone (12:00 - 15:00 UTC): Macro economic releases and maximum order volume drive sustained expansion.',
            'London Close (15:00 - 17:00 UTC): Profit taking, institutional book squaring, and reversal setups.'
          ],
          bulletPointsAr: [
            'فترة افتتاح لندن: تشهد مناورات صناع السوق وغالباً ما تصنع قمة أو قاع اليوم الحقيقي.',
            'فترة افتتاح نيويورك: تصاحبها البيانات الاقتصادية الأمريكية وتضخ أقصى أحجام تداول موجهة.',
            'فترة إغلاق لندن: تشهد عمليات جني أرباح وتسوية مراكز البنوك وحدوث ارتدادات تصحيحية.'
          ]
        },
        {
          headingEn: '3. Numerical Cycles: The 144 Framework',
          headingAr: '٣. الدورات الرقمية: استراتيجية 144',
          bodyEn: 'Certain numerical values derived from Fibonacci geometry and Gann time cycles (such as 144 and its harmonized divisions) repeatedly act as natural temporal resistance and support markers on intraday and swing horizons.',
          bodyAr: 'تعتبر الأرقام المشتقة من متتالية فيبوناتشي ودورات جان (مثل الرقم 144 ومضاعفاته التوافقية) فواصل زمنية طبيعية تتكرر باستمرار كنقاط دعم ومقاومة زمنية على الشارتات اللحظية والأسبوعية.',
          bulletPointsEn: [
            '144-Bar Time Cycle: Key cyclical horizon where trend exhaustion frequently materializes.',
            'Time-Zone Grid Projection: Mapping vertical time lines ahead of current price action.',
            'Price-Time Confluence: The highest probability trades occur when a key price level aligns with a time pivot.'
          ],
          bulletPointsAr: [
            'دورة 144 شمعة: أفق دوري متكرر غالباً ما يكتمل عنده استنزاف الاتجاه السابق.',
            'شبكة الفواصل الزمنية: رسم خطوط عمودية مستقبلية لاستباق مواعيد التحرك الكبير.',
            'التناغم الزمني السعري: تحدث أقوى الصفقات عندما يلتقي مستوى سعري قوي مع تاريخ زمني محدد.'
          ]
        }
      ],
      rulesEn: [
        'Never trade during dead market hours; focus 90% of your activity during designated session Killzones.',
        'If a price target is reached before the time cycle expires, anticipate consolidation rather than immediate continuation.',
        'Use vertical time markers on your chart alongside horizontal price support and resistance.',
        'Cross-reference higher timeframe cyclical pivots with lower timeframe candlestick confirmation.'
      ],
      rulesAr: [
        'تجنب التداول في الساعات الميتة بين الجلسات، وركز 90% من نشاطك في فترات الـ Killzones المحددة.',
        'إذا وصل السعر إلى الهدف قبل انتهاء الزمن المحدد للدورة، فتوقع تذبذباً وتصريفاً وليس استمراراً فورياً.',
        'ضع دائماً خطوطاً زمنية عمودية على الشارت إلى جانب مستويات الدعم والمقاومة السعرية الأفقية.',
        'طابق الفواصل الزمنية للفريمات الكبيرة مع إشارات التأكيد السعري على الفريمات الصغيرة.'
      ],
      pitfallsEn: [
        'Attempting to predict exact tops and bottoms purely by time without observing price confirmation.',
        'Ignoring major economic calendar releases which can momentarily distort cyclical rhythms.',
        'Using mismatched time zones across different trading platforms and data feeds.'
      ],
      pitfallsAr: [
        'محاولة بيع القمم أو شراء القيعان بالزمن وحده دون انتظار تأكيد حركة السعر (Price Action).',
        'تجاهل الأخبار الاقتصادية الكبرى التي قد تسبب تشوهاً لحظياً في وتيرة الدورة الزمنية.',
        'عدم ضبط المنطقة الزمنية بدقة بين منصة التحليل ومواعيد افتتاح البورصات.'
      ]
    }
  },
  {
    id: 'classical-ta',
    number: '03',
    titleEn: 'Classical Technical Analysis — التحليل الكلاسيكي',
    titleAr: 'التحليل الكلاسيكي — القواعد والأسس',
    categoryEn: 'Foundational Technical Analysis',
    categoryAr: 'التحليل الفني التقليدي',
    readTime: '14 min study',
    levelEn: 'Foundational',
    levelAr: 'تأسيسي',
    image: classicalTaImg,
    shortDescEn: 'Master the time-tested foundation of chart analysis: support and resistance, trendlines, geometric chart patterns, momentum indicators, and pure price action dynamics.',
    shortDescAr: 'أتقن الركائز التاريخية لتحليل الشارت: خطوط الاتجاه والدعم والمقاومة، النماذج السعرية الانعكاسية والاستمرارية (الرأس والكتفين، المثلثات، الأعلام)، ومؤشرات الزخم.',
    keyTopicsEn: ['Support & Resistance', 'Trendlines & Channels', 'Chart Patterns', 'RSI & MACD Momentum', 'Breakouts & Retests'],
    keyTopicsAr: ['الدعوم والمقاومات', 'خطوط الاتجاه والقنوات', 'النماذج السعرية', 'مؤشرات الزخم (RSI/MACD)', 'الكسر وإعادة الاختبار'],
    fullContent: {
      overviewEn: 'Classical Technical Analysis is the universal language of financial markets. Developed over more than a century from Dow Theory, it studies the geometric collective psychology of market participants mapped onto price charts.',
      overviewAr: 'يعتبر التحليل الفني الكلاسيكي اللغة العالمية المشتركة للأسواق المالية. نشأ وتطور عبر أكثر من قرن انطلاقاً من نظرية داو، ويهتم بدراسة علم النفس الجماعي للمتداولين المنعكس على حركة الشارت.',
      sections: [
        {
          headingEn: '1. Support, Resistance & The Polarity Principle',
          headingAr: '١. الدعوم والمقاومات ومبدأ تبادل الأدوار',
          bodyEn: 'Support represents a price floor where buying interest overcomes selling pressure; resistance represents a price ceiling where sellers dominate. When a decisive resistance is broken with volume, the Polarity Principle dictates it flips into future support.',
          bodyAr: 'يمثل الدعم أرضية سعرية تتغلب فيها قوى الشراء على البيع، بينما تمثل المقاومة سقفاً سعرياً يتفوق فيه البائعون. وعندما يتم كسر مقاومة رئيسية بزخم عالٍ، فإن مبدأ تبادل الأدوار يحولها إلى دعم مستقبلي صلب.',
          bulletPointsEn: [
            'Horizontal Key Levels: Psychological round numbers and multi-touch historical inflection points.',
            'Role Reversal (Polarity): Broken resistance becomes valid support upon the first confirmed retest.',
            'Zone Concept: Never treat support/resistance as a single penny-precise line; treat it as an elastic zone.'
          ],
          bulletPointsAr: [
            'المستويات الأفقية الرئيسية: الأرقام النفسية ومناطق الارتداد التاريخية المتكررة.',
            'تبادل الأدوار (Polarity): المقاومة المخترقة تصبح دعماً قوياً عند إعادة الاختبار.',
            'مفهوم المنطقة: لا تعامل الدعم أو المقاومة كخط دقيق بل كمنطقة سعرية مرنة.'
          ]
        },
        {
          headingEn: '2. Trendlines, Channels & Dow Theory',
          headingAr: '٢. خطوط الاتجاه، القنوات السعرية ونظرية داو',
          bodyEn: 'According to Dow Theory, an uptrend consists of a sequence of Higher Highs (HH) and Higher Lows (HL). A valid trendline requires at least 3 distinct touches. Parallel trendlines form price channels that contain normal market oscillations.',
          bodyAr: 'وفقاً لنظرية داو، يتكون الاتجاه الصاعد من قمم متصاعدة وقيعان متصاعدة (HH & HL). يتطلب خط الاتجاه المعتمد 3 نقاط ارتكاز واضحة على الأقل، بينما تشكل القنوات السعرية المسار الطبيعي لتذبذب السعر.',
          bulletPointsEn: [
            'Ascending Trendline: Drawn connecting swing lows, defining the dynamic floor of an uptrend.',
            'Descending Trendline: Drawn connecting swing highs, defining dynamic selling resistance.',
            'Channel Trading: Buying at the lower channel boundary and taking profit at the upper channel boundary.'
          ],
          bulletPointsAr: [
            'خط الاتجاه الصاعد: يربط بين القيعان المتصاعدة ويمثل دعماً ديناميكياً للاتجاه.',
            'خط الاتجاه الهابط: يربط بين القمم المتناقصة ويمثل مقاومة ديناميكية للمشتري.',
            'تداول القنوات: الشراء عند الحد السفلي للقناة وجني الأرباح عند الحد العلوي.'
          ]
        },
        {
          headingEn: '3. Classical Chart Formations & Indicators',
          headingAr: '٣. النماذج الفنية الكلاسيكية ومؤشرات الزخم',
          bodyEn: 'Chart patterns illustrate the consolidation and resolution of balance between buyers and sellers. Reversal patterns signal exhaustion, while continuation patterns confirm temporary digestion before the next major leg.',
          bodyAr: 'تعكس النماذج الفنية مرحلة الصراع والتجميع بين المشتري والبائع؛ فالنماذج الانعكاسية تنبه لقرب انتهاء الاتجاه، بينما تشير النماذج الاستمرارية إلى استراحة مؤقتة قبل مواصلة المسار.',
          bulletPointsEn: [
            'Reversal Patterns: Head & Shoulders, Inverted Head & Shoulders, Double Top / Double Bottom.',
            'Continuation Patterns: Bull/Bear Flags, Pennants, Symmetrical Triangles, Rectangles.',
            'Momentum Confluence: Detecting Regular & Hidden Divergences on RSI (14) or MACD to confirm pattern completion.'
          ],
          bulletPointsAr: [
            'النماذج الانعكاسية: الرأس والكتفين، القمة المزدوجة، القاع المزدوج.',
            'النماذج الاستمرارية: رايات الثيران والدببة (Flags)، المثلثات المتماثلة، المستطيلات التجميعية.',
            'توافق الزخم: كشف الانفراجات السعرية (Divergence) على مؤشر القوة النسبية RSI أو MACD لتأكيد الانعكاس.'
          ]
        }
      ],
      rulesEn: [
        'Always trade in the direction of the primary trend identified on higher timeframes.',
        'Wait for the candle to close beyond a pattern neckline or trendline before executing breakout trades.',
        'Always measure the target height of the pattern and place your stop-loss on the opposite side of the breakout structure.',
        'Use volume to validate breakouts: a true breakout is accompanied by an expansion in volume.'
      ],
      rulesAr: [
        'تداول دائماً في اتجاه الاتجاه الرئيسي المحدد على الفريمات الكبيرة.',
        'انتظر إغلاق الشمعة خارج خط العنق أو خط الاتجاه قبل الدخول في صفقات الاختراق.',
        'احسب دائماً المستهدف السعري للنموذج وضع وقف الخسارة خلف نقطة الاختراق المباشرة.',
        'تحقق من أحجام التداول (Volume): الاختراق الصادق يرافقه دائماً ارتفاع ملحوظ في أحجام التداول.'
      ],
      pitfallsEn: [
        'Chasing breakout candles after they have already moved 3 standard deviations away from the breakout level.',
        'Forcing pattern identification on messy, low-liquidity consolidation charts.',
        'Ignoring false breaks ("fakeouts") where price wicks beyond a trendline before slamming back into range.'
      ],
      pitfallsAr: [
        'مطاردة شمعة الاختراق بعد أن تكون قطعت مسافة كبيرة وابتعدت عن مستوى الدخول الآمن.',
        'محاولة اختلاق نماذج فنية بالقوة على شارتات مشوشة وضعيفة السيولة.',
        'التورط في الاختراقات الكاذبة (Fakeouts) الناتجة عن سحب السيولة السريع فوق خطوط الاتجاه.'
      ]
    }
  },
  {
    id: 'trading-fundamentals',
    number: '04',
    titleEn: 'Trading — ما هو التداول؟',
    titleAr: 'ما هو التداول؟ — أسس الأسواق المالية',
    categoryEn: 'Financial Markets & Risk Management',
    categoryAr: 'أساسيات التداول وإدارة المخاطر',
    readTime: '15 min study',
    levelEn: 'All Traders',
    levelAr: 'جميع المستويات',
    image: tradingImg,
    shortDescEn: 'Understand the core mechanics of global financial markets, buying vs short selling, disciplined position sizing, capital preservation, risk-to-reward asymmetry, and psychological mastery.',
    shortDescAr: 'افهم الجوهر الحقيقي للتداول في الأسواق العالمية: آليات الشراء والبيع (Long / Short)، حساب حجم العقود، قواعد إدارة رأس المال الصارمة، والانضباط النفسي الذي يصنع المتداول الرابح.',
    keyTopicsEn: ['Market Mechanics', 'Order Types & Spreads', 'Risk & Capital Management', 'Risk-to-Reward (R:R)', 'Trader Psychology'],
    keyTopicsAr: ['آليات الأسواق العالمية', 'أنواع الأوامر وفوارق السبريد', 'إدارة رأس المال والمخاطر', 'نسبة العائد للمخاطرة (R:R)', 'علم النفس وإدارة العواطف'],
    fullContent: {
      overviewEn: 'Trading is the active buying and selling of financial assets (currencies, commodities, indices, stocks, cryptocurrencies) to profit from price fluctuations. Unlike passive investing, trading treats market participation as an institutional business where risk control is paramount.',
      overviewAr: 'التداول هو الشراء والبيع النشط للأصول المالية (العملات، الذهب والسلع، المؤشرات، الأسهم، العملات الرقمية) للاستفادة من تغيرات الأسعار. على عكس الاستثمار طويل الأجل، يعتبر التداول عملاً مؤسسياً مستقلاً قاعدته الذهبية الأولى هي التحكم في المخاطر.',
      sections: [
        {
          headingEn: '1. What Are Financial Markets & How They Work',
          headingAr: '١. ما هي الأسواق المالية وكيف تعمل؟',
          bodyEn: 'Financial markets are decentralized and centralized auction networks connecting global liquidity buyers and sellers. Prices move solely based on the continuous interplay between available liquidity and incoming market orders.',
          bodyAr: 'الأسواق المالية هي شبكات مزاد تربط بين المشترين والبائعين حول العالم. تتحرك الأسعار بناءً على التوازن المستمر بين قوى العرض والطلب والسيولة المتاحة في سجل الأوامر.',
          bulletPointsEn: [
            'Forex (FX): The largest global market ($7.5+ Trillion daily) trading sovereign currency exchange rates.',
            'Commodities: Gold (XAU), Silver, Oil (WTI) driven by inflation, geopolitical risk, and supply chains.',
            'Indices: Baskets of elite equities (NAS100, US30, GER40) reflecting institutional economic health.'
          ],
          bulletPointsAr: [
            'سوق العملات (الفوركس): أضخم سوق مالي عالمي بحجم يتجاوز 7.5 تريليون دولار يومياً.',
            'السلع والمعادن: الذهب والنفط والفضة، وتتأثر بمعدلات التضخم والأزمات الجيوسياسية وسلاسل الإمداد.',
            'مؤشرات الأسهم: سلال من كبرى الشركات العالمية (ناسداك، داو جونز، داكس الألماني) تعكس قوة الاقتصادات الكبرى.'
          ]
        },
        {
          headingEn: '2. The Golden Rule: Risk & Capital Management',
          headingAr: '٢. القاعدة الذهبية: إدارة رأس المال والمخاطر',
          bodyEn: 'The defining difference between amateur gamblers and professional traders is position sizing. A professional never asks "how much will I make?"; they calculate "how much am I willing to risk if this trade fails?".',
          bodyAr: 'الفرق الجوهري بين الهواة والمحترفين هو حجم الصفقة (Position Sizing). المتداول المحترف لا يسأل "كم سأربح؟"، بل يحسب بدقة رياضية "كم سأخسر إذا أثبت السوق خطأ تحليلي؟".',
          bulletPointsEn: [
            'The 1% - 2% Risk Rule: Never risk more than 1% to 2% of total account equity on any individual trade.',
            'Asymmetric Risk-to-Reward (R:R): Only execute trades offering a minimum 1:2 or 1:3 return relative to risk.',
            'The Math of Recovery: A 50% account drawdown requires a 100% gain just to break even; risk management preserves survival.'
          ],
          bulletPointsAr: [
            'قاعدة الـ 1% إلى 2%: لا تخاطر بأكثر من 1% إلى 2% من رأس مال حسابك في أي صفقة منفردة.',
            'نسبة العائد إلى المخاطرة (R:R): نفذ الصفقات التي تقدم عائداً لا يقل عن ضعف أو ثلاثة أضعاف الخطر المحتمل (1:2 أو 1:3).',
            'رياضيات التعويض: خسارة 50% من الحساب تتطلب ربح 100% لمجرد استعادة رأس المال الأصلي؛ البقاء هو الأولوية القصوى.'
          ]
        },
        {
          headingEn: '3. Trader Psychology & Execution Discipline',
          headingAr: '٣. علم النفس والانضباط الصارم للتنفيذ',
          bodyEn: 'Over 90% of trading results are determined by emotional control rather than chart analysis. Greed causes over-leveraging; fear causes premature exits; revenge trading destroys months of accumulated gains in a single afternoon.',
          bodyAr: 'أكثر من 90% من نتائج المتداولين ترجع إلى الانضباط النفسي وإدارة المشاعر وليس إلى الشارت. الطمع يؤدي للإفراط في الرافعة، والخوف يدفع لإغلاق الصفقات الرابحة مبكراً، والتداول الانتقامي يدمر الحسابات.',
          bulletPointsEn: [
            'Trading Journal: Documenting entries, rationale, emotions, and exit execution to build systematic consistency.',
            'Acceptance of Uncertainty: Understanding that any individual trade has a random outcome, but a tested edge wins over 100 trades.',
            'Mechanical Execution: Following predefined rules with zero emotional hesitation or impulsive adjustments.'
          ],
          bulletPointsAr: [
            'مذكرات التداول (Trading Journal): تدوين أسباب الدخول وإدارة الصفقة لتقييم الأداء بشكل علمي وموضوعي.',
            'تقبل الاحتمالات: إدراك أن أي صفقة فردية تحتمل الخسارة، لكن ميزتك التنافسية (Edge) ستتفوق على المدى الطويل.',
            'التنفيذ الميكانيكي: الالتزام الصارم بخطة التداول المسبقة دون تردد أو قرارات عشوائية.'
          ]
        }
      ],
      rulesEn: [
        'Always define your exact Stop-Loss price before you place an order.',
        'Size your position according to your stop-loss distance, never based on greed.',
        'Never add to a losing position ("averaging down"); take your calculated loss cleanly and move on.',
        'Maintain a detailed trading journal recording your emotional state and execution metrics.'
      ],
      rulesAr: [
        'حدد دائماً نقطة وقف الخسارة بدقة متناهية قبل الضغط على زر فتح الصفقة.',
        'احسب حجم اللوت بناءً على مسافة وقف الخسارة وليس بدافع الطمع في مضاعفة الأرباح.',
        'إياك وتعزيز صفقات خاسرة (التبريد العشوائي)؛ اقبل الخسارة المحددة مسبقاً وتطلع للفرصة القادمة.',
        'احتفظ بمذكرات تداول يومية تسجل فيها كل صفقة والدروس المستفادة منها.'
      ],
      pitfallsEn: [
        'Risking 10% - 20% on a single trade, leading to guaranteed psychological breakdown and blown accounts.',
        'Revenge trading immediately after a loss to "win back" money from the market.',
        'Moving your stop loss further away during an adverse market move instead of respecting your invalidation level.'
      ],
      pitfallsAr: [
        'المخاطرة بنسبة 10% أو 20% في صفقة واحدة، مما يؤدي حتماً إلى تدمير الحساب تحت وطأة الضغط النفسي.',
        'التداول الانتقامي (Revenge Trading) بمجرد ضرب وقف الخسارة لمحاولة تعويض المال بشكل عشوائي.',
        'تحريك وقف الخسارة للخلف عند اقتراب السعر منه بدلاً من احترام نقطة خروجك المنطقية.'
      ]
    }
  }
];

export const EducationalSection: React.FC = () => {
  const { isRTL, language } = useTranslation();
  const [selectedTopic, setSelectedTopic] = useState<EducationalCardData | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const isArabic = isRTL || language === 'ar';

  const handleShare = (topic: EducationalCardData) => {
    const url = window.location.href.split('#')[0] + `#edu-${topic.id}`;
    copyToClipboard(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <section 
      aria-label="Educational Academy" 
      className="space-y-5 my-6"
      id="trading-academy-section"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5 px-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/10">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {isArabic ? 'الأكاديمية التعليمية الاحترافية' : 'Institutional Trading Academy'}
              </h3>
              <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-400/30 uppercase">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {isArabic ? 'مناهج معتمدة' : 'Core Masterclasses'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-light mt-0.5">
              {isArabic 
                ? 'مناهج تطبيقية متقدمة: السيولة الذكية، التحليل الزمني، التحليل الكلاسيكي، وأسس التداول الاحترافي'
                : 'Advanced trading curriculums: Smart Money Concepts, Time Cycles, Classical Technical Analysis, and Execution'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>{isArabic ? '٤ مسارات تعليمية' : '4 Masterclasses'}</span>
          </span>
        </div>
      </div>

      {/* Grid of Exactly Four Educational Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {EDUCATIONAL_CARDS.map((card) => {
          const title = isArabic ? card.titleAr : card.titleEn;
          const category = isArabic ? card.categoryAr : card.categoryEn;
          const shortDesc = isArabic ? card.shortDescAr : card.shortDescEn;
          const level = isArabic ? card.levelAr : card.levelEn;

          return (
            <div
              key={card.id}
              onClick={() => setSelectedTopic(card)}
              className="group relative bg-[#0D1322] hover:bg-[#111827] border border-slate-800/90 hover:border-amber-400/50 rounded-2xl p-4 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer flex flex-col justify-between h-full"
            >
              <div className="space-y-3">
                {/* Visual Thumbnail */}
                <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800 group-hover:border-amber-400/40">
                  <img
                    src={card.image}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D1322] via-black/30 to-transparent"></div>

                  {/* Corner Index Badge */}
                  <span className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-slate-950/90 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-amber-400/30 backdrop-blur-sm shadow-sm">
                    #{card.number}
                  </span>

                  {/* Level Badge */}
                  <span className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 bg-slate-900/90 text-slate-200 text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border border-slate-700/80 backdrop-blur-sm">
                    {level}
                  </span>

                  {/* Study Time Badge */}
                  <span className="absolute bottom-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-slate-950/90 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-md border border-slate-800/80 backdrop-blur-sm flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {card.readTime}
                  </span>
                </div>

                {/* Meta & Category */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider truncate">
                      {category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {isArabic ? 'منهج تطبيقي' : 'Curriculum'}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-extrabold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                    {title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-3 font-light leading-relaxed">
                    {shortDesc}
                  </p>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-3.5 mt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 group-hover:text-slate-200 transition-colors">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isArabic ? 'دليل دراسي شامل' : 'Interactive Guide'}</span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTopic(card);
                  }}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all cursor-pointer"
                  aria-label={`${isArabic ? 'تعلم المزيد عن' : 'Learn more about'} ${title}`}
                >
                  <span>{isArabic ? 'تعلم المزيد' : 'Learn More'}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Educational Excellence Pillars Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0A0E18] via-[#0E1528] to-[#0A0E18] border border-slate-800/90 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-6 text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-white">
              {isArabic ? 'منهجية مؤسسية منضبطة' : 'Institutional Order Flow Methodology'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-white">
              {isArabic ? 'إدارة مخاطر رياضية صارمة' : 'Mathematical Capital Protection'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-semibold text-white">
              {isArabic ? 'تكامل التحليل السعري والزمني' : 'Price-Time Confluence Framework'}
            </span>
          </div>
        </div>

        <div className="text-amber-400/90 font-mono text-[11px] font-bold flex items-center gap-1.5">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>SMTrading Academy</span>
        </div>
      </div>

      {/* Full Educational Reading Modal */}
      {selectedTopic && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={() => setSelectedTopic(null)}
        >
          <div 
            className="relative w-full max-w-3xl bg-[#0B101E] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#090D17]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-xs">
                  #{selectedTopic.number}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                    {isArabic ? selectedTopic.categoryAr : selectedTopic.categoryEn}
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    {isArabic ? selectedTopic.titleAr : selectedTopic.titleEn}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShare(selectedTopic)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title={isArabic ? 'نسخ الرابط' : 'Copy link'}
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-300 text-sm leading-relaxed">
              {/* Visual Cover Banner */}
              <div className="relative w-full h-48 sm:h-56 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <img
                  src={selectedTopic.image}
                  alt={isArabic ? selectedTopic.titleAr : selectedTopic.titleEn}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B101E] via-black/40 to-transparent"></div>
                <div className="absolute bottom-3 left-3 rtl:left-auto rtl:right-3 flex flex-wrap items-center gap-2">
                  <span className="bg-slate-900/90 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold px-2.5 py-1 rounded-md">
                    {isArabic ? selectedTopic.levelAr : selectedTopic.levelEn}
                  </span>
                  <span className="bg-slate-900/90 text-slate-300 border border-slate-800 text-xs font-mono px-2.5 py-1 rounded-md flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {selectedTopic.readTime}
                  </span>
                </div>
              </div>

              {/* Key Topics Badges */}
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase font-bold block mb-2">
                  {isArabic ? 'المفاهيم المحورية في هذا المسار:' : 'Core Topics Covered:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(isArabic ? selectedTopic.keyTopicsAr : selectedTopic.keyTopicsEn).map((topic, i) => (
                    <span 
                      key={i}
                      className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Overview Box */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200">
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-1.5 text-sm">
                  <Compass className="w-4 h-4" />
                  <span>{isArabic ? 'نظرة عامة على المنهج' : 'Executive Overview'}</span>
                </div>
                <p className="leading-relaxed">
                  {isArabic ? selectedTopic.fullContent.overviewAr : selectedTopic.fullContent.overviewEn}
                </p>
              </div>

              {/* Structured Educational Sections */}
              <div className="space-y-5">
                {selectedTopic.fullContent.sections.map((sec, idx) => (
                  <div key={idx} className="space-y-2.5 border-t border-slate-800/80 pt-4">
                    <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span className="text-amber-400 font-mono">#0{idx + 1}</span>
                      <span>{isArabic ? sec.headingAr : sec.headingEn}</span>
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      {isArabic ? sec.bodyAr : sec.bodyEn}
                    </p>

                    {(isArabic ? sec.bulletPointsAr : sec.bulletPointsEn) && (
                      <ul className="space-y-1.5 mt-2 pl-4 rtl:pl-0 rtl:pr-4">
                        {(isArabic ? sec.bulletPointsAr : sec.bulletPointsEn)?.map((bullet, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Execution Rules */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Lightbulb className="w-4 h-4" />
                  <span>{isArabic ? 'قواعد التنفيذ الذهبية' : 'Golden Execution Rules'}</span>
                </div>
                <ul className="space-y-1.5 pl-4 rtl:pl-0 rtl:pr-4 text-xs sm:text-sm text-slate-300">
                  {(isArabic ? selectedTopic.fullContent.rulesAr : selectedTopic.fullContent.rulesEn).map((rule, rIdx) => (
                    <li key={rIdx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold shrink-0">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Common Pitfalls */}
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{isArabic ? 'أخطاء شائعة يجب تجنبها' : 'Common Pitfalls to Avoid'}</span>
                </div>
                <ul className="space-y-1.5 pl-4 rtl:pl-0 rtl:pr-4 text-xs sm:text-sm text-slate-300">
                  {(isArabic ? selectedTopic.fullContent.pitfallsAr : selectedTopic.fullContent.pitfallsEn).map((pit, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold shrink-0">•</span>
                      <span>{pit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-800 bg-[#090D17] flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                {isArabic ? 'أكاديمية SMTrading الرسمية' : 'SMTrading Official Academy'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                {isArabic ? 'إغلاق المنهج' : 'Close Curriculum'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
