import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Crown, 
  ArrowRight, 
  LogOut, 
  Zap, 
  Clock, 
  Sparkles,
  Send,
  ExternalLink
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '../context/LanguageContext';
import { PublicLandingPage } from './PublicLandingPage';
import { 
  SubscriptionPlanInfo, 
  SITE_SUBSCRIPTION_PLANS, 
  PREMIUM_ALL_INCLUSIVE_PLAN 
} from '../types/subscription';
import { SubscriptionCheckoutModal } from './SubscriptionCheckoutModal';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, logout } = useAuth();
  const { t, isRTL, language } = useTranslation();

  // Expired client renewal states
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SubscriptionPlanInfo | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center p-4">
        <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 p-[1.5px] animate-pulse">
          <div className="w-full h-full bg-[#0E131F] rounded-[14px] flex items-center justify-center">
            <span className="font-bold text-2xl tracking-tighter bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">
              SM
            </span>
          </div>
        </div>
        <p className="mt-4 text-slate-400 text-xs font-mono tracking-widest uppercase">
          {t('authLoading')}
        </p>
      </div>
    );
  }

  // 2. Subscription Expired / Inactive Gate (If logged in as Client but subscription expired)
  if (user && user.role === 'client' && user.subscriptionStatus !== 'active') {
    const isExpired = user.subscriptionStatus === 'expired';
    const expiresFormatted = user.subscriptionExpiresAt 
      ? new Date(user.subscriptionExpiresAt).toLocaleDateString(
          language === 'ar' ? 'ar-EG' : language === 'ru' ? 'ru-RU' : language === 'uk' ? 'uk-UA' : 'en-US', 
          { year: 'numeric', month: 'short', day: 'numeric' }
        )
      : 'N/A';

    return (
      <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col justify-between relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Ambient background glows */}
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[350px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Top bar */}
        <div className="max-w-6xl mx-auto w-full px-4 py-3 sm:py-4 flex items-center justify-between gap-2 z-10 border-b border-slate-800/80">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-700 p-[1px] shrink-0">
              <div className="w-full h-full bg-[#0E131F] rounded-[7px] flex items-center justify-center">
                <span className="font-bold text-sm text-amber-300">SM</span>
              </div>
            </div>
            <span className="font-black text-base sm:text-lg text-white truncate">SMTrading<span className="text-amber-400">.pro</span></span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-[74px] sm:w-[94px] shrink-0">
              <LanguageSelector />
            </div>
            <div className="text-right rtl:text-left hidden sm:block">
              <div className="text-xs font-semibold text-white">@{user.username}</div>
              <div className="text-[10px] text-slate-400">{user.email}</div>
            </div>
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 px-2.5 sm:px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 rtl:rotate-180" />
              <span className="hidden xs:inline">{t('authSubLogOut')}</span>
            </button>
          </div>
        </div>

        {/* Gate Content */}
        <main className="max-w-5xl mx-auto w-full px-4 py-10 z-10 flex-1 flex flex-col justify-center space-y-8">
          <div className="bg-[#0C111C]/90 border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Clock className="w-3.5 h-3.5" />
              <span>{t('authSubMembership')} {isExpired ? t('authSubExpired') : t('authSubInactive')}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('authSubRenewHeading')}
            </h1>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              {t('authSubRenewDesc', { username: user.username, expires: expiresFormatted })}
            </p>

            {/* Site Subscription Packages Grid */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
              {SITE_SUBSCRIPTION_PLANS.map((plan) => {
                const planNameKey = plan.id === 'monthly' ? 'planMonthlyName' : plan.id === '6months' ? 'plan6MonthsName' : 'plan1YearName';
                const planBillingKey = plan.id === 'monthly' ? 'planMonthlyBilling' : plan.id === '6months' ? 'plan6MonthsBilling' : 'plan1YearBilling';
                return (
                  <div
                    key={plan.id}
                    className="p-5 rounded-2xl bg-[#090D15] border border-slate-800 hover:border-amber-400/50 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t(planNameKey)}</div>
                      <div className="text-2xl font-black text-white font-mono-num">{plan.priceDisplay}</div>
                      <span className="text-[11px] text-slate-400 block">{t(planBillingKey)} • USDT</span>
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-300 font-semibold leading-snug">
                        {t('authSubCoursesNotIncluded')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanForCheckout(plan);
                        setIsCheckoutOpen(true);
                      }}
                      className="w-full py-2.5 px-3 bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      {t('authSubRenewBtn')}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Standalone All-Inclusive Package Renewal */}
            <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#0E1528] to-[#0A0F1E] border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 uppercase">
                  <Crown className="w-3 h-3" />
                  <span>{t('planAllInclusiveBadge')}</span>
                </div>
                <h4 className="text-sm font-black text-white">{t('planAllInclusiveName')} ({PREMIUM_ALL_INCLUSIVE_PLAN.priceDisplay}/Year)</h4>
                <p className="text-xs text-slate-300">
                  Full 12-month platform access + SMC Trading Course + 144 Strategy Course.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlanForCheckout(PREMIUM_ALL_INCLUSIVE_PLAN);
                  setIsCheckoutOpen(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shrink-0 cursor-pointer shadow-md shadow-amber-500/20"
              >
                {t('authSubUpgradeAllInclusive')}
              </button>
            </div>

            {/* Direct Support Assistance */}
            <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-slate-400">
                {t('authSubPaymentSupport')}
              </div>
              <a
                href="https://t.me/SMTrading_SUPPORT"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{t('authSubContactSupport')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-slate-500 z-10">
          {t('authSubFooter')}
        </footer>

        {/* Renewal Checkout Modal */}
        <SubscriptionCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          selectedPlan={selectedPlanForCheckout}
        />
      </div>
    );
  }

  // 3. User is Logged In and has Active Subscription (or Employee / Admin role) -> Render Full Dashboard
  if (user) {
    return <>{children}</>;
  }

  // 4. Public Visitor (Not logged in) -> Render Redesigned Public Landing Page!
  return <PublicLandingPage />;
};
