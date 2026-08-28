export interface Author {
  id: string;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  twitter?: string;
  linkedin?: string;
}

export type ArticleCategory = 
  | 'All'
  | 'Macro & Liquidity'
  | 'Trade Now'
  | 'Order Flow & Price Action'
  | 'BookMap'
  | 'LIVE Trade'
  | 'Support';

export interface TradeSetup {
  asset: string;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  timeframe: string;
  entryZone: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  riskReward: string;
  keyCatalyst: string;
}

export interface Comment {
  id: string;
  authorName: string;
  authorBadge?: string;
  date: string;
  content: string;
  likes: number;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: ArticleCategory;
  image: string;
  imageCaption: string;
  publishedAt: string;
  readTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Institutional';
  author: Author;
  featured?: boolean;
  trending?: boolean;
  editorPick?: boolean;
  views: number;
  bullishVotes: number;
  bearishVotes: number;
  summary: string[];
  content: {
    sectionId: string;
    sectionTitle: string;
    paragraphs: string[];
    callout?: {
      type: 'tip' | 'warning' | 'alpha' | 'stat';
      title: string;
      text: string;
    };
    codeBlock?: {
      language: string;
      code: string;
    };
  }[];
  tradeSetup?: TradeSetup;
  tags: string[];
}

export interface MarketTickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: 'Crypto' | 'Indices' | 'Commodities' | 'Forex' | 'Rates';
  high24h: number;
  low24h: number;
  volume24h: string;
  sparkline: number[];
}

export interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  country: string;
  countryCode: string;
  event: string;
  impact: 'High' | 'Medium' | 'Low';
  forecast: string;
  previous: string;
  actual?: string;
}
