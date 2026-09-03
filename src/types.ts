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
  | 'VIP Signals'
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

export type EventImpact = 'Extreme' | 'High' | 'Medium' | 'Low';
export type EventStatus = 'upcoming' | 'approaching' | 'live' | 'released';

export interface EconomicEvent {
  id: string;
  timestamp: number; // Canonical UTC epoch timestamp in milliseconds
  utcIso?: string; // ISO 8601 UTC string e.g. "2026-09-04T12:30:00.000Z"
  sourceTimezone?: string; // Original IANA timezone e.g. "America/New_York", "Europe/Frankfurt"
  sourceLocalTime?: string; // Original source local release time e.g. "08:30"
  sourceAgency?: string; // Verifying authority / agency
  date: string;
  time: string;
  country: string;
  countryCode: string;
  event: string;
  category?: 'Central Bank' | 'Inflation' | 'Employment' | 'Growth' | 'Macro';
  impact: EventImpact;
  forecast: string;
  previous: string;
  actual?: string;
  whyItMatters?: string;
  affectedAssets?: string[];
  statusOverride?: EventStatus;
}

export type UserRole = 'super_admin' | 'admin' | 'employee' | 'coach' | 'client';
export type SubscriptionStatus = 'active' | 'expired' | 'inactive';

export interface RolePermissions {
  canManageSuperAdmins: boolean;
  canManageAdmins: boolean;
  canManageEmployees: boolean;
  canManageCoaches: boolean;
  canManageClients: boolean;
  canCreateUsers: boolean;
  canDeleteUsers: boolean;
  canResetPasswords: boolean;
  canAdjustBalances: boolean;
  canSetCommissionRates: boolean;
  canManageSubscriptions: boolean;
  canViewTransactions: boolean;
  canManageRBAC: boolean;
  canManageSystemSettings: boolean;
  canManageSecurity: boolean;
  canViewAuditLogs: boolean;
  canAccessOperations: boolean;
  canManageContent: boolean;
  canManageLiveStream: boolean;
  canAccessCoachingDesk: boolean;
  canManageLessons: boolean;
}

export interface TrainingMilestone {
  id: string;
  courseId: string;
  courseName: string;
  completedLessons: number;
  totalLessons: number;
  status: 'in_progress' | 'completed' | 'on_hold';
  lastSessionAt?: string;
  coachNotes?: string;
}

export interface CoachingStudent {
  id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  assignedCoachId?: string;
  coachSpecialty?: string;
  trainingStatus: 'active_training' | 'mentorship_pending' | 'graduated' | 'paused';
  trainingProgress: TrainingMilestone[];
  coachingNotes?: string;
  joinedDate: string;
}

export interface OperationalItem {
  id: string;
  title: string;
  type: 'market_brief' | 'content_review' | 'live_stream_prep' | 'support_ticket';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'resolved';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorUsername: string;
  actorRole: UserRole;
  action: string;
  targetId?: string;
  targetUsername?: string;
  details: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: string;
  subscriptionExpiresAt: string;
  referralCode: string;
  referredBy?: string;
  commissionRate: number;
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  createdAt: string;
  lastLoginAt: string;
  avatarUrl?: string;
  phone?: string;
  notes?: string;
  referralsCount?: number;
  assignedCoachId?: string;
  coachSpecialty?: string;
  permissions?: Partial<RolePermissions>;
  trainingProgress?: TrainingMilestone[];
}

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'commission' | 'subscription_purchase' | 'manual_adjustment' | 'payout_request';
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'rejected';
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface ReferralData {
  referralCode: string;
  commissionRate: number;
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalReferredCount: number;
  referrals: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    subscriptionStatus: SubscriptionStatus;
    createdAt: string;
    avatarUrl?: string;
  }[];
  commissionHistory: Transaction[];
}

export interface YouTubeLiveStream {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt?: string;
  actualStartTime?: string;
  scheduledStartTime?: string;
  thumbnailUrl?: string;
  concurrentViewers?: number;
  embedUrl: string;
  watchUrl: string;
}

export interface YouTubeLiveStatus {
  success: boolean;
  isLive: boolean;
  message: string;
  status: 'live' | 'idle' | 'offline' | 'error';
  stream: YouTubeLiveStream | null;
  channel: {
    id?: string | null;
    handle?: string | null;
    title?: string;
    thumbnail?: string;
  } | null;
  apiKeyConfigured: boolean;
  checkedAt: string;
  cached?: boolean;
}

