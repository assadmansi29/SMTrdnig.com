export interface SubscriptionPlanInfo {
  id: 'monthly' | '6months' | '1year' | 'all-inclusive';
  name: string;
  priceDisplay: string;
  currency: '€' | '$';
  amount: number;
  billingPeriod: string;
  badge?: string;
  isBestOffer?: boolean;
  isSiteSubscription: boolean;
  features: string[];
  disclaimer?: string;
  coursesIncluded?: string[];
  recommended?: boolean;
}

export const SITE_SUBSCRIPTION_PLANS: SubscriptionPlanInfo[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    priceDisplay: '$80',
    currency: '$',
    amount: 80,
    billingPeriod: 'per month',
    badge: 'FLEXIBLE',
    isSiteSubscription: true,
    features: [
      'Full SM Trading Pro platform access',
      'Latest market news & real-time macro alerts',
      'Live access to verified institutional analysts',
      'Ready-made strategy setups & trades based on platform strategies',
      'High-probability trading recommendations & invalidation levels'
    ],
    disclaimer: 'Courses and educational programs are NOT included in this subscription.'
  },
  {
    id: '6months',
    name: '6 Months',
    priceDisplay: '$400',
    currency: '$',
    amount: 400,
    billingPeriod: 'billed every 6 months',
    badge: 'POPULAR CHOICE',
    isSiteSubscription: true,
    features: [
      'Full SM Trading Pro platform access for 6 months',
      'Latest market news & real-time macro alerts',
      'Live access to verified institutional analysts',
      'Ready-made strategy setups & trades based on platform strategies',
      'High-probability trading recommendations & invalidation levels'
    ],
    disclaimer: 'Courses and educational programs are NOT included in this subscription.'
  },
  {
    id: '1year',
    name: '1 Year',
    priceDisplay: '$650',
    currency: '$',
    amount: 650,
    billingPeriod: 'billed annually',
    badge: 'ANNUAL DESK ACCESS',
    isSiteSubscription: true,
    features: [
      'Full SM Trading Pro platform access for 12 months',
      'Latest market news & real-time macro alerts',
      'Live access to verified institutional analysts',
      'Ready-made strategy setups & trades based on platform strategies',
      'High-probability trading recommendations & invalidation levels'
    ],
    disclaimer: 'Courses and educational programs are NOT included in this subscription.'
  }
];

export const PREMIUM_ALL_INCLUSIVE_PLAN: SubscriptionPlanInfo = {
  id: 'all-inclusive',
  name: 'All-Inclusive Package',
  priceDisplay: '$999',
  currency: '$',
  amount: 999,
  billingPeriod: 'per year',
  badge: 'BEST OFFER / BEST PACKAGE',
  isBestOffer: true,
  isSiteSubscription: false,
  features: [
    'Everything included in the Site Subscription for a full 12 months',
    'Full platform access & live TradingView strategy charts',
    'Latest market news & institutional macro analysis',
    'Daily live access to analysts & live trading floor',
    'Ready-made strategy setups & algorithmic execution signals',
    'Trading recommendations with precision entry/exit targets',
    'SMC Trading Course (Smart Money Concepts Masterclass)',
    '144 Strategy Course (Complete Institutional Methodology)',
    'Full curriculum access, video masterclasses, and certified syllabus'
  ],
  coursesIncluded: [
    'SMC Trading Course — Smart Money Concepts Masterclass',
    '144 Strategy Course — Proprietary Institutional Framework'
  ]
};
