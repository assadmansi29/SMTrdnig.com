import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Crown, 
  Check, 
  ArrowRight, 
  TrendingUp, 
  BarChart3, 
  GraduationCap, 
  BookOpen, 
  Users, 
  Radio, 
  Zap, 
  Newspaper, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  LineChart, 
  Clock, 
  Compass, 
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Play,
  Award
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from '../context/LanguageContext';
import { 
  SubscriptionPlanInfo, 
  SITE_SUBSCRIPTION_PLANS, 
  PREMIUM_ALL_INCLUSIVE_PLAN 
} from '../types/subscription';
import { SubscriptionCheckoutModal } from './SubscriptionCheckoutModal';
import { MemberLoginModal } from './MemberLoginModal';

export const PublicLandingPage: React.FC = () => {
  const { t, isRTL } = useTranslation();

  // Live Alpha Feed Market Prices State with real-time micro-ticks
  const [feedTickers, setFeedTickers] = useState([
    { symbol: 'XAU/USD', price: 2942.10, changePercent: 0.65 },
    { symbol: 'NAS100', price: 21180.75, changePercent: 0.88 },
    { symbol: 'US30', price: 43910.50, changePercent: 0.60 },
    { symbol: 'BTC/USD', price: 96420.50, changePercent: 3.03 },
    { symbol: 'EUR/USD', price: 1.0845, changePercent: -0.20 },
  ]);
  const [flashingSymbol, setFlashingSymbol] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setFeedTickers(prev => {
        const idx = Math.floor(Math.random() * prev.length);
        const target = prev[idx];
        const delta = (Math.random() - 0.48) * (target.price > 1000 ? 1.2 : 0.0003);
        const newPrice = target.price + delta;
        const newChange = target.changePercent + (delta > 0 ? 0.02 : -0.02);

        setFlashingSymbol(target.symbol);
        setTimeout(() => setFlashingSymbol(null), 800);

        return prev.map((t, i) => i === idx ? {
          ...t,
          price: Number(newPrice.toFixed(t.symbol.includes('EUR') ? 4 : 2)),
          changePercent: Number(newChange.toFixed(2))
        } : t);
      });
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  // Modal states
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<SubscriptionPlanInfo | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const handleSubscribeClick = (plan: SubscriptionPlanInfo) => {
    setSelectedPlanForCheckout(plan);
    setIsCheckoutOpen(true);
  };

  const handleScrollToPricing = () => {
    const el = document.getElementById('pricing-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id) || document.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background Ambient Glows */}
      <div className="fixed top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-amber-500/10 via-emerald-500/5 to-transparent rounded-full blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#070A12]/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-2.5 xs:px-4 sm:px-6 h-14 sm:h-16 md:h-20 flex items-center justify-between gap-1.5 sm:gap-4">
          
          {/* Brand Logo & Tag */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-[1.5px] shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-[#0B0F1C] rounded-[10px] sm:rounded-[14px] flex items-center justify-center">
                <span className="font-black text-xs sm:text-base bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent font-mono-num">
                  SM
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
                <span className="font-black text-sm sm:text-lg md:text-xl text-white tracking-tight shrink-0">
                  SMTrading<span className="text-amber-400">.pro</span>
                </span>
                <div className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-400/30 shrink-0">
                  <span className="hidden sm:inline">by ABU ASAD ALMANSI</span>
                  <BlueVerifiedBadge size="sm" />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate hidden md:block">
                Institutional Trading Platform • Quantitative SMC Network
              </p>
            </div>
          </div>

          {/* Center Navigation Links (Responsive) */}
          <nav className="hidden md:flex items-center gap-3 lg:gap-6 text-xs font-semibold text-slate-300">
            <button 
              type="button"
              onClick={() => handleScrollToSection('features-section')}
              className="hover:text-amber-400 transition-colors cursor-pointer py-1"
            >
              <span className="pointer-events-none">{t('navPlatformOverview')}</span>
            </button>
            <button 
              type="button"
              onClick={() => handleScrollToSection('strategies-section')}
              className="hover:text-amber-400 transition-colors cursor-pointer py-1"
            >
              <span className="pointer-events-none">{t('navStrategiesCharts')}</span>
            </button>
            <button 
              type="button"
              onClick={() => handleScrollToSection('academy-section')}
              className="hover:text-amber-400 transition-colors cursor-pointer py-1"
            >
              <span className="pointer-events-none">{t('navCoursesAcademy')}</span>
            </button>
            <button 
              type="button"
              onClick={() => handleScrollToSection('analysts-section')}
              className="hover:text-amber-400 transition-colors cursor-pointer py-1"
            >
              <span className="pointer-events-none">{t('navLiveAnalysts')}</span>
            </button>
            <button 
              type="button"
              onClick={() => handleScrollToSection('pricing-section')}
              className="text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-bold py-1"
            >
              <span className="pointer-events-none">{t('navPricingPlans')}</span>
            </button>
          </nav>

          {/* Right Action Bar (Desktop / Tablet) */}
          <div className="hidden sm:flex items-center gap-2.5 md:gap-3 shrink-0">
            <div className="w-[84px] md:w-[88px] shrink-0 h-9 md:h-10">
              <LanguageSelector />
            </div>

            {/* Member Sign In Button (Opens Modal) */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="h-9 md:h-10 px-3.5 md:px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap flex items-center justify-center"
            >
              <span>{t('clientLogin')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Live Market Ticker Tape */}
      <div className="bg-[#090D17] border-b border-slate-800/80 py-2.5 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-6 text-xs whitespace-nowrap min-w-max">
          <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>INSTITUTIONAL LIQUIDITY FEED:</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px] text-slate-300">
            {feedTickers.map((item) => {
              const isPositive = item.changePercent >= 0;
              const isFlashing = flashingSymbol === item.symbol;
              return (
                <div 
                  key={item.symbol} 
                  className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors ${
                    isFlashing ? (isPositive ? 'bg-emerald-950/50' : 'bg-rose-950/50') : ''
                  }`}
                >
                  <span className="text-slate-400 font-bold">{item.symbol}:</span>
                  <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.symbol.includes('EUR') 
                      ? item.price.toFixed(4) 
                      : `$${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                  <span className={`text-[10px] ${isPositive ? 'text-emerald-500/80' : 'text-rose-400'}`}>
                    {isPositive ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Settlement: <strong>100% USDT</strong></span>
          </div>
        </div>
      </div>

      {/* Mobile Dedicated Controls Bar: Language, Login & Subscribe (between Liquidity Feed and Hero Badge) */}
      <div className="sm:hidden w-full bg-[#080C16] border-b border-slate-800/80 px-3 py-2.5 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Language Selector */}
          <div className="w-[84px] shrink-0 h-10">
            <LanguageSelector />
          </div>

          {/* Client Login */}
          <button
            type="button"
            onClick={() => setIsLoginModalOpen(true)}
            className="flex-1 h-10 px-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-slate-200 hover:text-white border border-slate-700/80 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center whitespace-nowrap"
          >
            <span>{t('clientLogin')}</span>
          </button>

          {/* Subscribe Now */}
          <button
            type="button"
            onClick={handleScrollToPricing}
            className="flex-1 h-10 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 text-slate-950 font-black rounded-xl text-xs tracking-tight transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>{t('subscribe')}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 shrink-0" />
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-20 pb-16 sm:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            
            {/* Repositioned Subscribe Now Button Directly Above the Hero Badge (hidden on mobile) */}
            <div className="hidden sm:flex justify-center pb-1">
              <button
                type="button"
                onClick={handleScrollToPricing}
                className="h-10 md:h-11 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 text-slate-950 font-black rounded-xl text-sm tracking-tight transition-all shadow-lg shadow-amber-500/25 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>{t('subscribeNow')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180 shrink-0" />
              </button>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide shadow-lg shadow-amber-500/10">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{t('landingBadge')}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              {t('landingHeroTitlePre')} <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                {t('landingHeroTitleHighlight')}
              </span>
            </h1>

            {/* Descriptive Subtitle introducing all core offerings */}
            <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
              {t('landingHeroDesc')}
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <button
                type="button"
                onClick={handleScrollToPricing}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-sm sm:text-base tracking-tight shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
              >
                <span>{t('subscribeNow')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>

              <a
                href="https://t.me/SMTrading_SUPPORT"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 text-blue-400" />
                <span>{t('landingContactSupport')}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>

            {/* Trust Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 max-w-3xl mx-auto text-left rtl:text-right border-t border-slate-800/80">
              <div className="p-3 bg-[#0B0F1C]/80 border border-slate-800 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono-num">{t('landingMetric1Val')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t('landingMetric1Desc')}</div>
              </div>

              <div className="p-3 bg-[#0B0F1C]/80 border border-slate-800 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono-num">{t('landingMetric2Val')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t('landingMetric2Desc')}</div>
              </div>

              <div className="p-3 bg-[#0B0F1C]/80 border border-slate-800 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-blue-400 font-mono-num">{t('landingMetric3Val')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t('landingMetric3Desc')}</div>
              </div>

              <div className="p-3 bg-[#0B0F1C]/80 border border-slate-800 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono-num">{t('landingMetric4Val')}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{t('landingMetric4Desc')}</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Core Offerings Showcase Grid */}
      <section id="features-section" className="py-16 sm:py-24 bg-[#080D1A]/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              {t('landingFeaturesTag')}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {t('landingFeaturesHeading')}
            </h2>
            <p className="text-sm text-slate-300">
              {t('landingFeaturesSub')}
            </p>
          </div>

          {/* 6 Core Feature Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Ready-Made Trading Strategies */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-amber-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-all">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                {t('landingFeature1Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFeature1Desc')}
              </p>
            </div>

            {/* 2. Trading Courses & Strategy Education */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-emerald-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                {t('landingFeature2Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFeature2Desc')}
              </p>
            </div>

            {/* 3. Market Analysis & Quantitative Research */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-blue-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-all">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                {t('landingFeature3Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFeature3Desc')}
              </p>
            </div>

            {/* 4. Professional Analysts & Live Trading */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-purple-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-all">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                {t('landingFeature4Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFeature4Desc')}
              </p>
            </div>

            {/* 5. Trading Recommendations & High-Probability Setups */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-rose-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20 transition-all">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                {t('landingFeature5Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFeature5Desc')}
              </p>
            </div>

            {/* 6. Latest Market News & Macro Wire */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-teal-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-all">
                <Newspaper className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                {t('landingFeature6Title')}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFeature6Desc')}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Strategies & Chart Terminal Spotlight */}
      <section id="strategies-section" className="py-16 sm:py-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t('landingStrategyTag')}</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {t('landingStrategyHeading')}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                {t('landingStrategyDesc')}
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 bg-[#0C1220] border border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">{t('landingStrategyPoint1Title')}</strong>
                    <span className="text-xs text-slate-400">{t('landingStrategyPoint1Desc')}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-[#0C1220] border border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">{t('landingStrategyPoint2Title')}</strong>
                    <span className="text-xs text-slate-400">{t('landingStrategyPoint2Desc')}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-[#0C1220] border border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">{t('landingStrategyPoint3Title')}</strong>
                    <span className="text-xs text-slate-400">{t('landingStrategyPoint3Desc')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleScrollToPricing}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm tracking-tight transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {t('landingStrategyBtn')}
                </button>
              </div>
            </div>

            {/* Visual Terminal Illustration */}
            <div className="lg:col-span-6 relative">
              <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 via-slate-800/40 to-slate-900 border border-slate-700/80 p-2 sm:p-3 shadow-2xl overflow-hidden">
                <img
                  src="/trade_smc_chart.jpg"
                  alt="SM Trading Pro Professional Strategy Chart"
                  className="w-full h-auto rounded-xl object-cover shadow-inner"
                  onError={(e) => {
                    // Fallback to stylized SVG card if image not found
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="p-4 bg-[#090D17] border border-slate-800 rounded-xl mt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold text-white font-mono">{t('landingStrategyChartBadge')}</span>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold">{t('landingStrategyChartTag')}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Academy Spotlight Section */}
      <section id="academy-section" className="py-16 sm:py-20 bg-[#090E1B] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              {t('landingAcademyTag')}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {t('landingAcademyHeading')}
            </h2>
            <p className="text-sm text-slate-300">
              {t('landingAcademySub')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Course 1: SMC */}
            <div className="p-6 bg-[#0D1424] border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  {t('landingCourse1Badge')}
                </span>
                <span className="text-xs font-mono text-slate-400">{t('landingCourse1Meta')}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{t('landingCourse1Title')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingCourse1Desc')}
              </p>
              <div className="text-xs text-amber-400/90 font-medium">
                {t('landingCourse1Include')}
              </div>
            </div>

            {/* Course 2: Strategy 144 */}
            <div className="p-6 bg-[#0D1424] border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  {t('landingCourse2Badge')}
                </span>
                <span className="text-xs font-mono text-slate-400">{t('landingCourse2Meta')}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{t('landingCourse2Title')}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingCourse2Desc')}
              </p>
              <div className="text-xs text-amber-400/90 font-medium">
                {t('landingCourse2Include')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analysts & Live Trading Section */}
      <section id="analysts-section" className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#0D1424] via-[#090D17] to-[#070A12] border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  <span>{t('landingAnalystLiveBadge')}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {t('landingAnalystHeading')}
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {t('landingAnalystDesc')}
                </p>

                <div className="flex flex-wrap gap-4 pt-2 text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {t('landingAnalystCheck1')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {t('landingAnalystCheck2')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {t('landingAnalystCheck3')}
                  </span>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="flex flex-col items-center justify-center text-center p-6 bg-[#080B14] border border-slate-800 rounded-2xl space-y-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 p-0.5 shadow-xl">
                    <div className="w-full h-full rounded-full bg-[#0E1526] overflow-hidden flex items-center justify-center">
                      <img
                        src="/abu_asad_almansi.jpg"
                        alt="Abu Asad Almansi"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1.5">
                      <h4 className="text-sm font-bold text-white">Abu Asad Almansi</h4>
                      <BlueVerifiedBadge size="sm" />
                    </div>
                    <p className="text-xs text-amber-400 font-medium">{t('mentorAbuRoleBadge')}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    {t('landingAnalystQuote1')}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center text-center p-6 bg-[#080B14] border border-slate-800 rounded-2xl space-y-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 p-0.5 shadow-xl">
                    <div className="w-full h-full rounded-full bg-[#0E1526] overflow-hidden flex items-center justify-center">
                      <img
                        src="/ahmad_nader_attar.jpg"
                        alt="Ahmad Nader Attar"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1.5">
                      <h4 className="text-sm font-bold text-white">Ahmad Nader Attar</h4>
                      <BlueVerifiedBadge size="sm" />
                    </div>
                    <p className="text-xs text-amber-400 font-medium">{t('mentorAhmadRoleBadge')}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    {t('landingAnalystQuote2')}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing-section" className="py-20 sm:py-28 bg-[#080D1A]/80 border-t border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>{t('landingPricingBadge')}</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {t('landingPricingHeading')}
            </h2>

            <p className="text-sm sm:text-base text-slate-300">
              {t('landingPricingSub')}
            </p>
          </div>

          {/* Three Site Subscription Packages */}
          <div className="space-y-4 mb-10">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">{t('landingSiteSubscriptionsTitle')}</h3>
                <p className="text-xs text-slate-400">{t('landingSiteSubscriptionsSub')}</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {t('landingUsdtAcceptedOnly')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SITE_SUBSCRIPTION_PLANS.map((plan) => {
                const planNameKey = plan.id === 'monthly' ? 'planMonthlyName' : plan.id === '6months' ? 'plan6MonthsName' : 'plan1YearName';
                const planBillingKey = plan.id === 'monthly' ? 'planMonthlyBilling' : plan.id === '6months' ? 'plan6MonthsBilling' : 'plan1YearBilling';
                const planBadgeKey = plan.id === 'monthly' ? 'planMonthlyBadge' : plan.id === '6months' ? 'plan6MonthsBadge' : 'plan1YearBadge';
                return (
                  <div
                    key={plan.id}
                    className="bg-[#0C1220] border border-slate-800 hover:border-slate-700 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all shadow-xl hover:shadow-2xl relative"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {t(planNameKey)}
                        </span>
                        {plan.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                            {t(planBadgeKey)}
                          </span>
                        )}
                      </div>

                      {/* Price Display */}
                      <div>
                        <div className="text-3xl sm:text-4xl font-black text-white font-mono-num tracking-tight">
                          {plan.priceDisplay}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {t(planBillingKey)} • USDT
                        </div>
                      </div>

                      {/* Inclusions */}
                      <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                        <span className="text-xs font-bold text-slate-300 block">{t('landingPlanIncludes')}</span>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {(plan.id === 'monthly' 
                            ? [t('planMonthlyFeat1'), t('planMonthlyFeat2'), t('planMonthlyFeat3'), t('planMonthlyFeat4'), t('planMonthlyFeat5')]
                            : plan.id === '6months'
                            ? [t('plan6MonthsFeat1'), t('plan6MonthsFeat2'), t('plan6MonthsFeat3'), t('plan6MonthsFeat4'), t('plan6MonthsFeat5')]
                            : [t('plan1YearFeat1'), t('plan1YearFeat2'), t('plan1YearFeat3'), t('plan1YearFeat4'), t('plan1YearFeat5')]
                          ).map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Prominent Educational Disclaimer mandated by prompt */}
                      <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-xs font-bold text-amber-300 leading-snug">
                            {t('authSubCoursesNotIncluded')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Subscribe Now Button */}
                    <button
                      type="button"
                      onClick={() => handleSubscribeClick(plan)}
                      className="w-full py-3.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-100 font-black rounded-2xl text-xs sm:text-sm tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md group"
                    >
                      <span>{t('subscribeNow')}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Standalone Premium Package: All-Inclusive (BEST OFFER / BEST PACKAGE) */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="relative rounded-3xl bg-gradient-to-b from-[#182035] via-[#0E1528] to-[#0A0F1E] border-2 border-amber-500/60 p-6 sm:p-10 shadow-2xl shadow-amber-500/10 overflow-hidden">
              
              {/* Highlight Badge */}
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2">
                <div className="px-5 py-1.5 rounded-b-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-slate-950" />
                  <span>{t('planAllInclusiveBadge')}</span>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left side: Package Title, Price & Value Proposition */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                      {t('landingAllInclusiveTag')}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                      {t('planAllInclusiveName')}
                    </h3>
                  </div>

                  <div>
                    <div className="text-4xl sm:text-5xl font-black text-amber-400 font-mono-num tracking-tight">
                      {PREMIUM_ALL_INCLUSIVE_PLAN.priceDisplay} <span className="text-sm font-semibold text-slate-400">{t('landingAllInclusiveAnnual')}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {t('landingAllInclusiveSub')}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {t('landingAllInclusiveDesc')}
                  </p>

                  {/* Included Courses Box */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('landingAllInclusiveCoursesTitle')}</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{t('landingAllInclusiveCourse1')}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{t('landingAllInclusiveCourse2')}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right side: Complete Inclusions & CTA */}
                <div className="lg:col-span-6 space-y-5 bg-[#090D17]/80 p-5 sm:p-6 rounded-2xl border border-slate-800">
                  <span className="text-xs font-bold text-white block">
                    {t('landingAllInclusiveInclusionsTitle')}
                  </span>
                  
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{t('landingAllInclusiveItem1')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{t('landingAllInclusiveItem2')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{t('landingAllInclusiveItem3')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{t('landingAllInclusiveItem4')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{t('landingAllInclusiveItem5')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{t('landingAllInclusiveItem6')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{t('landingAllInclusiveItem7')}</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleSubscribeClick(PREMIUM_ALL_INCLUSIVE_PLAN)}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-sm sm:text-base tracking-tight shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <span>{t('landingAllInclusiveBtn')}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>

                  <div className="text-center">
                    <span className="text-[11px] text-slate-400">
                      {t('landingAllInclusiveFooter')}
                    </span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Payment System & Support Guidance Banner */}
      <section className="py-14 sm:py-20 bg-[#070A12] border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0B1222] via-[#0E1528] to-[#0A0E1A] border border-blue-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            
            <div className="space-y-3 max-w-xl text-center md:text-left rtl:md:text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold">
                <Send className="w-3.5 h-3.5" />
                <span>{t('landingSupportTag')}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {t('landingSupportTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                {t('landingSupportDesc')}
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{t('landingSupportVerified')}</span>
              </div>
              <p className="text-xs text-slate-400">
                {t('landingSupportUsernameLabel')} <strong className="text-white font-mono">@SMTrading_SUPPORT</strong> • {t('landingSupportNetworkLabel')} <strong className="text-emerald-400 font-mono">TRC20 ONLY</strong>
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-3">
              <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-200">
                <img
                  src="/telegram_support_qr.png"
                  alt="Official Telegram Support QR Code"
                  className="w-28 h-28 object-contain"
                />
              </div>
              <a
                href="https://t.me/SMTrading_SUPPORT"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-[#24A1DE] hover:bg-[#2094cc] text-white font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-[#24A1DE]/20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{t('landingSupportBtn')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <span className="text-[11px] text-slate-400 font-mono">
                @SMTrading_SUPPORT
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-14 sm:py-20 bg-[#080D1A]/50 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('landingFaqHeading')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {t('landingFaqSub')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white">{t('landingFaqQ1')}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFaqA1')}
              </p>
            </div>

            <div className="p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white">{t('landingFaqQ2')}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFaqA2')}
              </p>
            </div>

            <div className="p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white">{t('landingFaqQ3')}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFaqA3')}
              </p>
            </div>

            <div className="p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white">{t('landingFaqQ4')}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('landingFaqA4')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-[#060910] border-t border-slate-800 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-700 p-[1px]">
              <div className="w-full h-full bg-[#0E1526] rounded-[11px] flex items-center justify-center font-black text-xs text-amber-400">
                SM
              </div>
            </div>
            <div>
              <div className="font-bold text-white text-sm">SMTrading<span className="text-amber-400">.pro</span></div>
              <div className="text-[11px] text-slate-500">by Abu Asad Almansi • Verified Desk</div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-500 max-w-md">
            {t('landingFooterRisk')}
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://t.me/SMTrading_SUPPORT"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-bold transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>@SMTrading_SUPPORT</span>
            </a>

            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {t('clientLogin')}
            </button>
          </div>
        </div>
      </footer>

      {/* Subscription Checkout & USDT Payment Modal */}
      <SubscriptionCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        selectedPlan={selectedPlanForCheckout}
        onSelectPlan={(plan) => setSelectedPlanForCheckout(plan)}
      />

      {/* Member Login Modal */}
      <MemberLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSubscribeClick={() => {
          setIsLoginModalOpen(false);
          handleScrollToPricing();
        }}
      />
    </div>
  );
};
