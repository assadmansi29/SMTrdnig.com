import { Article, Author, EconomicEvent, MarketTickerItem } from '../types';
import heroImg from '../assets/images/hero_trading_floor_1787615744296.jpg';
import cryptoMacroImg from '../assets/images/crypto_macro_chart_1787615755280.jpg';
import algoImg from '../assets/images/algorithmic_trading_1787615766945.jpg';
import forexGoldImg from '../assets/images/forex_commodities_1787615778214.jpg';
import psychologyImg from '../assets/images/trader_psychology_1787615845049.jpg';
import optionsImg from '../assets/images/options_volatility_1787615858467.jpg';
import abuAsadImg from '../assets/images/abu_asad_almansi.jpg';

export const AUTHORS: Record<string, Author> = {
  abuAsad: {
    id: 'author-0',
    name: 'Abu Asad Almansi',
    role: 'Founder & Chief Quantitative Architect',
    avatar: abuAsadImg,
    bio: 'Founder of Smart Money Trading (SMTrading.pro). Quantitative market technician specializing in Institutional Order Flow, Smart Money Concepts (SMC), and algorithmic liquidity microstructure.',
    twitter: '@almansi_smc',
    linkedin: 'abu-asad-almansi',
  },
  alex: {
    id: 'author-1',
    name: 'Dr. Alexander Vance',
    role: 'Chief Quantitative Strategist',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bio: 'Former Citadel Lead Quantitative Researcher specializing in market microstructure, statistical arbitrage, and High-Frequency Execution engines.',
    twitter: '@vance_quant',
    linkedin: 'alex-vance-phd',
  },
  elena: {
    id: 'author-2',
    name: 'Elena Rostova',
    role: 'Head of Global Macro & FX',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
    bio: '14+ years managing institutional sovereign debt and foreign exchange desks in London and Geneva. Specialist in cross-asset liquidity cycles.',
    twitter: '@rostova_macro',
    linkedin: 'elena-rostova-fx',
  },
  marcus: {
    id: 'author-3',
    name: 'Marcus Sterling, CFA',
    role: 'Senior Derivatives Architect',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: 'Pivotal market maker in index options and variance swaps. Author of "The Volatility Matrix & Convex Payoffs".',
    twitter: '@sterling_gamma',
    linkedin: 'marcus-sterling-cfa',
  },
  sarah: {
    id: 'author-4',
    name: 'Sarah Chen, M.D., M.S.',
    role: 'Director of Trader Performance & Risk',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    bio: 'Neurocognitive researcher and performance coach to top proprietary trading firms across New York and Chicago.',
    twitter: '@chen_psych',
    linkedin: 'sarah-chen-neuro',
  }
};

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-1',
    slug: 'order-flow-microstructure-hft-liquidity-hunt',
    title: 'Market Microstructure & Order Flow: Decoding Institutional Iceberg Orders & Delta Imbalances',
    subtitle: 'How tier-1 desks use algorithmic execution algorithms to disguise 9-figure positions, and how retail can detect the footprint.',
    category: 'Order Flow & Price Action',
    image: heroImg,
    imageCaption: 'SMTrading.pro Tier-1 Market Microstructure & Order Book Flow Visualizer',
    publishedAt: 'May 24, 2026',
    readTime: '8 min read',
    difficulty: 'Institutional',
    author: AUTHORS.abuAsad,
    featured: true,
    trending: true,
    editorPick: true,
    views: 14820,
    bullishVotes: 412,
    bearishVotes: 38,
    tags: ['Order Flow', 'Cumulative Delta', 'Level 2 DOM', 'Iceberg Orders', 'ES Futures'],
    summary: [
      'Institutional order execution is designed to minimize slippage via iceberg orders and VWAP algorithms.',
      'Cumulative Volume Delta (CVD) divergence at key liquidity pools signals absorption before sharp reversals.',
      'Volume profile Point of Control (POC) transitions provide clear structural invalidation levels for intraday execution.'
    ],
    tradeSetup: {
      asset: 'E-mini S&P 500 (ES)',
      direction: 'LONG',
      timeframe: '15M / 1H Confluence',
      entryZone: '5,910.00 - 5,914.50 (Absorption Pool)',
      stopLoss: '5,898.00 (Below Low Volume Node)',
      takeProfit1: '5,948.00 (Single Print Liquidity)',
      takeProfit2: '5,972.50 (Prior Week Value Area High)',
      riskReward: '1 : 3.85',
      keyCatalyst: 'Aggressive Bid Absorption at Prior Day VAL with Bullish CVD Divergence'
    },
    content: [
      {
        sectionId: 'sec-1',
        sectionTitle: 'The Anatomy of Hidden Institutional Volume',
        paragraphs: [
          'When retail traders look at a basic candlestick chart, they only see the historical footprint of what happened in the past. To capture sustainable alpha in today\'s competitive electronic markets, you must inspect the auction process at the millisecond level.',
          'Large institutional funds rarely execute via standard market orders. Placing a $250 million block order directly on the book would cause extreme slippage and immediately alert front-running algorithms. Instead, institutional smart order routers (SORs) slice blocks into hidden iceberg clips and passive limit bid walls.'
        ],
        callout: {
          type: 'alpha',
          title: 'Institutional Clue',
          text: 'When high volume transacts at the bid with zero downward price progress, a passive institutional buyer is actively absorbing market sell orders. This represents trapped liquidity and frequent short squeeze triggers.'
        }
      },
      {
        sectionId: 'sec-2',
        sectionTitle: 'Decoding Cumulative Volume Delta (CVD) Divergences',
        paragraphs: [
          'Cumulative Volume Delta measures the net difference between market aggressive buyers (trades executed at the ask) and market aggressive sellers (trades executed at the bid).',
          'A classic absorption pattern occurs when price prints a lower low into an established support shelf, but CVD prints a distinct higher low. This indicates that despite aggressive selling pressure, passive buy limit orders are holding the bids firm.'
        ],
        codeBlock: {
          language: 'python',
          code: `# SMTrading Quant CVD Divergence Scanner
def detect_bid_absorption(trades_df, min_delta_imbalance=2.5):
    aggressive_sells = trades_df[trades_df['side'] == 'SELL']['volume'].sum()
    aggressive_buys = trades_df[trades_df['side'] == 'BUY']['volume'].sum()
    delta = aggressive_buys - aggressive_sells
    
    price_delta = trades_df['price'].iloc[-1] - trades_df['price'].iloc[0]
    
    # Absorption Condition: High negative delta with no downward price progression
    if delta < -min_delta_imbalance * trades_df['volume'].mean() and price_delta >= 0:
        return {"signal": "BULLISH_ABSORPTION", "confidence": 0.89}
    return {"signal": "NEUTRAL"}`
        }
      },
      {
        sectionId: 'sec-3',
        sectionTitle: 'Practical Execution Strategy on E-mini S&P',
        paragraphs: [
          'To trade this footprint profitably, wait for price to reach an external liquidity pool (such as prior day high or low). Look for a cluster of aggressive market sellers getting absorbed on the footprint chart.',
          'Enter upon the first confirmed rotation back inside the value area. Your stop loss is placed strictly behind the low of the absorption cluster, giving you a mathematically favorable asymmetric risk-to-reward profile.'
        ]
      }
    ]
  },
  {
    id: 'art-2',
    slug: 'global-macro-liquidity-fed-cycles-crypto-confluence',
    title: 'The Global Liquidity Super-Cycle: Central Bank Balance Sheets & Bitcoin Multi-Year Tops',
    subtitle: 'Quantitative proof connecting Federal Reserve RRP runoff, Bank of Japan yield dynamics, and parabolic digital asset expansions.',
    category: 'Macro & Liquidity',
    image: cryptoMacroImg,
    imageCaption: 'Macro Cross-Asset Liquidity Matrix & Fibonacci Liquidity Expansions',
    publishedAt: 'May 22, 2026',
    readTime: '11 min read',
    difficulty: 'Institutional',
    author: AUTHORS.elena,
    featured: false,
    trending: true,
    editorPick: true,
    views: 19340,
    bullishVotes: 894,
    bearishVotes: 112,
    tags: ['Bitcoin', 'Federal Reserve', 'Macro Liquidity', 'M2 Money Supply', 'Maturity Wall'],
    summary: [
      'Global M2 money supply leads high-beta crypto and tech assets with a consistent 72-day latency.',
      'Reverse Repo (RRP) depletion and Treasury General Account (TGA) dynamics create predictable liquidity injection windows.',
      'Macro structural breaks coincide with sovereign debt refinancing cycles across G10 economies.'
    ],
    tradeSetup: {
      asset: 'BTC/USD Perp',
      direction: 'LONG',
      timeframe: 'Weekly / Daily Macro Structure',
      entryZone: '$94,200 - $96,500 (Macro Weekly Golden Pocket)',
      stopLoss: '$89,800 (Weekly Close Below Structural Low)',
      takeProfit1: '$118,000 (1.272 Fibonacci Extension)',
      takeProfit2: '$142,500 (Global M2 Expansion Target)',
      riskReward: '1 : 4.40',
      keyCatalyst: 'Global Central Bank Synchronized Net Easing & US TGA Re-injection'
    },
    content: [
      {
        sectionId: 'sec-1',
        sectionTitle: 'Why Macro Liquidity Governs Everything',
        paragraphs: [
          'Individual asset narratives matter in the short term, but global liquidity dictates the multi-quarter trend. Over the past decade, Bitcoin has exhibited a 0.86 correlation with global central bank net balance sheet expansions.',
          'When looking at liquidity, traditional money supply metrics like M2 must be adjusted for central bank reserve repo operations and currency fluctuations.'
        ],
        callout: {
          type: 'stat',
          title: 'Macro Empirical Metric',
          text: 'Every $1 Trillion expansion in global central bank balance sheets historically correlates with a 14.8% average appreciation in tier-1 risk assets across a 90-day window.'
        }
      },
      {
        sectionId: 'sec-2',
        sectionTitle: 'The 2026-2027 Sovereign Debt Wall',
        paragraphs: [
          'Governments worldwide face record debt maturities requiring continuous refinancing. Central banks cannot maintain restrictive real rates without risking sovereign bond market dislocations.',
          'As financial conditions ease to facilitate sovereign issuance, capital naturally flees debasement into hard commodities, gold, and decentralized computational value stores.'
        ]
      }
    ]
  },
  {
    id: 'art-3',
    slug: 'algorithmic-statistical-arbitrage-mean-reversion-python',
    title: 'Building a High-Sharpe Statistical Arbitrage Engine: Cointegration & Pairs Trading in Python',
    subtitle: 'A step-by-step institutional framework for finding stationary spreads between correlated instruments and managing volatility drawdowns.',
    category: 'Trade Now',
    image: algoImg,
    imageCaption: 'SMTrading Quantitative Order Flow Heatmap & Machine Learning Nodes',
    publishedAt: 'May 19, 2026',
    readTime: '14 min read',
    difficulty: 'Institutional',
    author: AUTHORS.alex,
    featured: false,
    trending: false,
    editorPick: false,
    views: 8750,
    bullishVotes: 320,
    bearishVotes: 14,
    tags: ['Python', 'StatArb', 'Cointegration', 'Algorithmic Trading', 'Kalman Filters'],
    summary: [
      'Simple price correlation is dangerous; pairs trading must be verified using the Augmented Dickey-Fuller (ADF) cointegration test.',
      'Dynamic hedge ratios calculated via Kalman Filters adapt to shifting market regimes far better than static OLS regression.',
      'Half-life of mean reversion determines optimal trade holding periods and stop-loss timers.'
    ],
    tradeSetup: {
      asset: 'Tech Pairs: NVDA vs AMD StatArb Spread',
      direction: 'NEUTRAL',
      timeframe: '1-Hour Kalman Filter Z-Score',
      entryZone: 'Z-Score >= +2.35 (Long Underperformer, Short Outperformer)',
      stopLoss: 'Z-Score >= +3.40 (Regime Structural Shift)',
      takeProfit1: 'Z-Score = 0.0 (Mean Equilibrium)',
      takeProfit2: 'Z-Score = -0.50 (Overshoot Capture)',
      riskReward: '1 : 2.90',
      keyCatalyst: 'Cross-Sectional Factor Dispersion Reversion'
    },
    content: [
      {
        sectionId: 'sec-1',
        sectionTitle: 'Why Statistical Arbitrage Outperforms Directional Bets',
        paragraphs: [
          'Directional trading leaves you vulnerable to sudden market-wide macroeconomic shocks. Statistical arbitrage builds market-neutral portfolios where profits are derived solely from pricing inefficiencies between highly related assets.',
          'By holding both long and short positions simultaneously, systemic market beta is eliminated, isolating pure alpha.'
        ],
        codeBlock: {
          language: 'python',
          code: `import numpy as np
from statsmodels.tsa.stattools import coint

def test_pair_cointegration(asset_a_prices, asset_b_prices):
    score, p_value, _ = coint(asset_a_prices, asset_b_prices)
    is_cointegrated = p_value < 0.05
    return {
        "p_value": round(p_value, 4),
        "cointegrated": is_cointegrated,
        "hedge_ratio": np.polyfit(asset_b_prices, asset_a_prices, 1)[0]
    }`
        }
      },
      {
        sectionId: 'sec-2',
        sectionTitle: 'Dynamic Risk & Half-Life Calculations',
        paragraphs: [
          'Calculating the Ornstein-Uhlenbeck mean-reversion speed tells you exactly how many hours a typical divergence takes to revert. If a pair fails to revert within 2x its historical half-life, the relationship may have structurally broken and must be liquidated immediately.'
        ]
      }
    ]
  },
  {
    id: 'art-4',
    slug: 'gold-xauusd-central-bank-accumulation-fx-dynamics',
    title: 'Gold Breakout Framework: Central Bank Reserves De-Dollarization & Safe-Haven Technicals',
    subtitle: 'Institutional drivers behind Gold\'s historical rally, multi-timeframe Fibonacci expansions, and FX correlation modeling.',
    category: 'BookMap',
    image: forexGoldImg,
    imageCaption: 'Global Precious Metals & Forex Liquidity Channels Analysis',
    publishedAt: 'May 16, 2026',
    readTime: '7 min read',
    difficulty: 'Intermediate',
    author: AUTHORS.elena,
    featured: false,
    trending: true,
    editorPick: false,
    views: 12100,
    bullishVotes: 640,
    bearishVotes: 51,
    tags: ['Gold', 'XAU/USD', 'DXY', 'Central Banks', 'BRICS Reserves'],
    summary: [
      'Non-Western central bank gold purchases have reached record multi-decade highs, creating a structural price floor.',
      'Real interest rate yields remain the primary inverse driver of multi-month gold cycles.',
      'Technical breakout from the multi-year cup-and-handle pattern targets $3,250/oz Fibonacci extensions.'
    ],
    tradeSetup: {
      asset: 'Gold (XAU/USD)',
      direction: 'LONG',
      timeframe: '4-Hour / Daily Swing',
      entryZone: '$2,880 - $2,905 (Former Resistance Turned Support)',
      stopLoss: '$2,840 (Below Daily Swing Low)',
      takeProfit1: '$3,050 (Psychological Milestone)',
      takeProfit2: '$3,180 (1.618 Fibonacci Extension)',
      riskReward: '1 : 3.65',
      keyCatalyst: 'Global Central Bank Sovereign Purchases & Negative Real Yield Shift'
    },
    content: [
      {
        sectionId: 'sec-1',
        sectionTitle: 'The Unyielding Sovereign Bid',
        paragraphs: [
          'Unlike speculative retail buyers, central banks do not trade on 15-minute charts with stop losses. Their acquisitions are strategic, multi-year asset allocations aimed at securing national sovereign balance sheets.',
          'This continuous physical demand absorbs any significant dip below key moving averages, converting previous resistance zones into unshakeable liquidity floors.'
        ]
      }
    ]
  },
  {
    id: 'art-5',
    slug: 'mastering-options-volatility-smile-gamma-scalping',
    title: 'The Volatility Surface & Gamma Exposure: How Market Maker Hedging Drives Big Market Swings',
    subtitle: 'Understand 0DTE options dynamics, positive vs negative gamma regimes, and volatility smile arbitrage.',
    category: 'LIVE Trade',
    image: optionsImg,
    imageCaption: '3D Volatility Skew Curve & Gamma Exposure (GEX) Surface',
    publishedAt: 'May 12, 2026',
    readTime: '10 min read',
    difficulty: 'Institutional',
    author: AUTHORS.marcus,
    featured: false,
    trending: false,
    editorPick: true,
    views: 7420,
    bullishVotes: 280,
    bearishVotes: 22,
    tags: ['Options', 'Gamma Exposure', 'VIX', '0DTE', 'Volatility Arbitrage'],
    summary: [
      'In Positive Gamma (+GEX) regimes, dealer hedging suppresses intraday volatility and fosters mean-reversion.',
      'In Negative Gamma (-GEX) regimes, dealer hedging accelerates market selloffs and sparks violent trend days.',
      'Volatility skew analysis reveals smart-money put/call demand before it appears in underlying spot prices.'
    ],
    tradeSetup: {
      asset: 'SPY / QQQ Options Straddle',
      direction: 'NEUTRAL',
      timeframe: 'Daily Zero-Gamma Flip',
      entryZone: 'SPX GEX Flip Level @ 5,880.00',
      stopLoss: 'Daily Close back into +GEX territory',
      takeProfit1: '5,820.00 (Put Wall Support)',
      takeProfit2: '5,760.00 (Major Dealer Negative Gamma Pocket)',
      riskReward: '1 : 3.20',
      keyCatalyst: 'Transition into Negative Gamma with 0DTE Put Open Interest Spike'
    },
    content: [
      {
        sectionId: 'sec-1',
        sectionTitle: 'Why Market Makers Must Hedge',
        paragraphs: [
          'Options market makers stay delta-neutral. When retail and institutional clients buy massive volumes of out-of-the-money puts, market makers are forced to sell underlying futures to hedge as spot prices decline.',
          'When the market drops into a negative gamma zone, this delta hedging becomes self-reinforcing, generating violent cascading selloffs.'
        ],
        callout: {
          type: 'warning',
          title: 'Gamma Regime Alert',
          text: 'Never buy breakouts during heavy positive gamma (+GEX) days. The market maker hedging flows will repeatedly fade intraday rallies back to the volume weighted average price.'
        }
      }
    ]
  },
  {
    id: 'art-6',
    slug: 'trader-neuropsychology-risk-management-drawdowns',
    title: 'The Elite Trader Mindset: Cognitive Bias Mitigation, Tilt Prevention & Mathematical Position Sizing',
    subtitle: 'Neuroscience-backed protocols to eliminate emotional trading errors and protect your edge during drawdowns.',
    category: 'Support',
    image: psychologyImg,
    imageCaption: 'Executive Trader Focus & Behavioral Risk Control Workspace',
    publishedAt: 'May 08, 2026',
    readTime: '9 min read',
    difficulty: 'Beginner',
    author: AUTHORS.sarah,
    featured: false,
    trending: false,
    editorPick: false,
    views: 11400,
    bullishVotes: 580,
    bearishVotes: 12,
    tags: ['Psychology', 'Risk Management', 'Kelly Criterion', 'Tilt Control', 'Journaling'],
    summary: [
      'Amygdala hijack causes revenge trading and loss aversion after consecutive losing trades.',
      'Position size must be scaled down by 50% immediately upon entering a 3-trade drawdown streak.',
      'The fractional Kelly Criterion prevents portfolio ruin while mathematically optimizing geometric growth.'
    ],
    tradeSetup: {
      asset: 'Account Equity Preservation Rule',
      direction: 'NEUTRAL',
      timeframe: 'Daily Risk Protocol',
      entryZone: 'Maximum Daily Loss Limit: 1.5% of Total Portfolio',
      stopLoss: 'Mandatory 24-Hour Trading Freeze on 2 Consecutive Losses',
      takeProfit1: 'Target Risk/Reward: Minimum 1 : 2.5 on all executions',
      takeProfit2: 'Scale up capital only after 20 trades above 60% win-rate',
      riskReward: 'Asymmetric Edge',
      keyCatalyst: 'Neuroscience-Backed Emotional State Logging'
    },
    content: [
      {
        sectionId: 'sec-1',
        sectionTitle: 'The Neurochemistry of Trading Losses',
        paragraphs: [
          'Financial losses trigger the exact same pain receptors in the human brain as physical threats. When a trade hits your stop loss, your sympathetic nervous system increases cortisol production and reduces prefrontal cortex blood flow.',
          'Without strict mechanical rules, this biological state triggers "revenge trading" — increasing lot sizes to win back lost capital quickly.'
        ],
        callout: {
          type: 'tip',
          title: 'Dr. Chen\'s 3-Rule Reset',
          text: 'Whenever you experience 2 unexpected stop-outs in a single session, step away from all terminals for at least 30 minutes. Cortisol takes up to 25 minutes to metabolize back to baseline cognitive clarity.'
        }
      },
      {
        sectionId: 'sec-2',
        sectionTitle: 'The Mathematics of Position Sizing',
        paragraphs: [
          'A 50% win rate strategy with a 1:2 risk-to-reward ratio will print consistent long-term wealth, provided you never risk more than 1-2% per trade. When you risk 5% or 10% per trade, standard statistical variance guarantees eventual account ruin.'
        ]
      },
      {
        sectionId: 'sec-3',
        sectionTitle: '24/7 Desk Support & Executive Assistance',
        paragraphs: [
          'For direct trader inquiries, account synchronization, VIP signal inquiries, or billing support, connect directly with our global desk team at smtradingsupprt@gmail.com.',
          'Our risk technicians and quantitative support specialists maintain active 24/7 desk coverage to ensure uninterrupted execution.'
        ],
        callout: {
          type: 'alpha',
          title: 'Direct Support Channel',
          text: 'Official Support Desk Email: smtradingsupprt@gmail.com (Average response time: < 2 hours).'
        }
      }
    ]
  },
  {
    id: 'art-7',
    slug: 'vip-signals-gold-nasdaq-institutional-confluence-breakout',
    title: 'VIP Alpha Signal: High-Probability Institutional Confluence on Gold (XAUUSD) & Nasdaq (NQ)',
    subtitle: 'Exclusive VIP desk signal detailing multi-timeframe liquidity sweep, gamma flip levels, and institutional stop runs.',
    category: 'VIP Signals',
    image: forexGoldImg,
    imageCaption: 'SMTrading VIP Institutional Signal Suite - Real-Time Execution Triggers',
    publishedAt: 'May 28, 2026',
    readTime: '6 min read',
    difficulty: 'Institutional',
    author: AUTHORS.abuAsad,
    featured: true,
    trending: true,
    editorPick: true,
    views: 18940,
    bullishVotes: 890,
    bearishVotes: 14,
    tags: ['VIP Signals', 'XAUUSD', 'Gold', 'Nasdaq', 'SMC', 'Order Block', 'Gamma Flip'],
    summary: [
      'Institutional liquidity sweep at key Asian range session lows with heavy tick delta absorption.',
      'Confluence of 4H bullish fair value gap (FVG) and Point of Control (POC) supporting rapid breakout expansion.',
      'Strict 1:4.20 risk-to-reward ratio with institutional scale-out targets.'
    ],
    tradeSetup: {
      asset: 'Spot Gold / USD (XAU/USD)',
      direction: 'LONG',
      timeframe: '15M / 1H / 4H Multi-Timeframe Confluence',
      entryZone: '$3,240.00 - $3,252.00 (Institutional Demand Zone)',
      stopLoss: '$3,218.00 (Below Asian Session Liquidity Sweep)',
      takeProfit1: '$3,320.00 (Previous Daily High / Buy-Side Liquidity)',
      takeProfit2: '$3,385.00 (Major 1.618 Fib Extension Target)',
      riskReward: '1 : 4.20',
      keyCatalyst: 'Tier-1 Desk Absorption Wall & US Session Opening Momentum Expansion'
    },
    content: [
      {
        sectionId: 'sec-1',
        sectionTitle: 'VIP Execution Strategy & Microstructure Edge',
        paragraphs: [
          'This VIP signal captures a signature Smart Money accumulation sequence: early session liquidity runs targeting retail stop-losses, immediately followed by multi-million dollar institutional bid absorption.',
          'Execution is strictly gated to confirmed 15M break-of-structure (BOS) with cumulative volume delta (CVD) divergence confirm.'
        ],
        callout: {
          type: 'alpha',
          title: 'VIP Desk Risk Protocol',
          text: 'Risk strictly 1% to 1.5% of allocated desk capital. Move stop loss to breakeven once Take Profit 1 ($3,320.00) is achieved.'
        }
      }
    ]
  }
];

export const INITIAL_MARKET_TICKERS: MarketTickerItem[] = [
  {
    symbol: 'BTC/USD',
    name: 'Bitcoin Perpetual',
    price: 96420.50,
    change: 2840.20,
    changePercent: 3.03,
    category: 'Crypto',
    high24h: 97800.00,
    low24h: 93200.00,
    volume24h: '$42.8B',
    sparkline: [93200, 93800, 94600, 94200, 95800, 96100, 96420]
  },
  {
    symbol: 'ETH/USD',
    name: 'Ethereum Spot',
    price: 3450.80,
    change: 112.40,
    changePercent: 3.37,
    category: 'Crypto',
    high24h: 3510.00,
    low24h: 3310.00,
    volume24h: '$18.4B',
    sparkline: [3310, 3350, 3390, 3420, 3380, 3430, 3450]
  },
  {
    symbol: 'ES (S&P 500)',
    name: 'E-mini S&P 500 Futures',
    price: 5938.25,
    change: 42.50,
    changePercent: 0.72,
    category: 'Indices',
    high24h: 5952.00,
    low24h: 5886.50,
    volume24h: '1.42M Contracts',
    sparkline: [5890, 5905, 5918, 5912, 5928, 5934, 5938]
  },
  {
    symbol: 'NQ (Nasdaq)',
    name: 'E-mini Nasdaq 100',
    price: 21180.75,
    change: 185.25,
    changePercent: 0.88,
    category: 'Indices',
    high24h: 21240.00,
    low24h: 20950.00,
    volume24h: '820K Contracts',
    sparkline: [20960, 21020, 21090, 21050, 21120, 21160, 21180]
  },
  {
    symbol: 'US30 (Dow)',
    name: 'Dow Jones Industrial Average',
    price: 43910.50,
    change: 260.40,
    changePercent: 0.60,
    category: 'Indices',
    high24h: 44120.00,
    low24h: 43650.00,
    volume24h: '410K Contracts',
    sparkline: [43650, 43720, 43810, 43780, 43860, 43890, 43910]
  },
  {
    symbol: 'GER40 (DAX)',
    name: 'DAX 40 Germany Benchmark',
    price: 22480.20,
    change: 145.80,
    changePercent: 0.65,
    category: 'Indices',
    high24h: 22560.00,
    low24h: 22310.00,
    volume24h: '320K Contracts',
    sparkline: [22320, 22380, 22410, 22390, 22440, 22460, 22480]
  },
  {
    symbol: 'XAU/USD',
    name: 'Spot Gold Ounce',
    price: 2942.10,
    change: 18.90,
    changePercent: 0.65,
    category: 'Commodities',
    high24h: 2955.00,
    low24h: 2918.00,
    volume24h: '$28.1B',
    sparkline: [2920, 2928, 2935, 2930, 2938, 2945, 2942]
  },
  {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    price: 1.0845,
    change: -0.0022,
    changePercent: -0.20,
    category: 'Forex',
    high24h: 1.0890,
    low24h: 1.0825,
    volume24h: '$110B',
    sparkline: [1.0880, 1.0872, 1.0860, 1.0855, 1.0848, 1.0842, 1.0845]
  },
  {
    symbol: 'US10Y',
    name: 'US 10-Year Benchmark Yield',
    price: 4.285,
    change: -0.042,
    changePercent: -0.97,
    category: 'Rates',
    high24h: 4.340,
    low24h: 4.270,
    volume24h: 'Fixed Income',
    sparkline: [4.33, 4.32, 4.31, 4.30, 4.29, 4.28, 4.285]
  },
  {
    symbol: 'VIX',
    name: 'CBOE Volatility Index',
    price: 13.82,
    change: -0.68,
    changePercent: -4.69,
    category: 'Indices',
    high24h: 14.90,
    low24h: 13.65,
    volume24h: 'Index',
    sparkline: [14.8, 14.5, 14.2, 14.0, 13.9, 13.85, 13.82]
  }
];

export const INITIAL_ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    id: 'eco-1',
    date: 'Wednesday, May 27',
    time: '14:00 EDT',
    country: 'United States',
    countryCode: 'US',
    event: 'FOMC Monetary Policy Statement & Rate Decision',
    impact: 'High',
    forecast: '4.50%',
    previous: '4.50%',
    actual: undefined
  },
  {
    id: 'eco-2',
    date: 'Thursday, May 28',
    time: '08:30 EDT',
    country: 'United States',
    countryCode: 'US',
    event: 'Core CPI Inflation Index (YoY)',
    impact: 'High',
    forecast: '2.7%',
    previous: '2.8%',
    actual: undefined
  },
  {
    id: 'eco-3',
    date: 'Thursday, May 28',
    time: '09:15 EDT',
    country: 'Eurozone',
    countryCode: 'EU',
    event: 'ECB Main Refinancing Rate Decision',
    impact: 'High',
    forecast: '3.00%',
    previous: '3.25%',
    actual: undefined
  },
  {
    id: 'eco-4',
    date: 'Friday, May 29',
    time: '08:30 EDT',
    country: 'United States',
    countryCode: 'US',
    event: 'Non-Farm Payrolls (NFP) & Unemployment Rate',
    impact: 'High',
    forecast: '175K',
    previous: '188K',
    actual: undefined
  }
];
