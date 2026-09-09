import React, { useState } from 'react';
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
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
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
              Client Login
            </button>

            {/* Main Primary CTA: Subscribe Now */}
            <button
              type="button"
              onClick={handleScrollToPricing}
              className="h-9 md:h-10 px-4 md:px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 text-slate-950 font-black rounded-xl text-xs md:text-sm tracking-tight transition-all shadow-md sm:shadow-lg shadow-amber-500/20 cursor-pointer shrink-0 flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span>Subscribe Now</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 shrink-0" />
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
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">XAU/USD:</span>
              <span className="text-emerald-400 font-bold">$2,908.40</span>
              <span className="text-emerald-500/80 text-[10px]">+0.84%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">NAS100:</span>
              <span className="text-emerald-400 font-bold">21,430.50</span>
              <span className="text-emerald-500/80 text-[10px]">+1.12%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">US30:</span>
              <span className="text-slate-200 font-bold">44,120.00</span>
              <span className="text-emerald-500/80 text-[10px]">+0.45%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">BTC/USD:</span>
              <span className="text-amber-400 font-bold">$88,450.00</span>
              <span className="text-emerald-500/80 text-[10px]">+2.30%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">EUR/USD:</span>
              <span className="text-slate-200 font-bold">1.0482</span>
              <span className="text-rose-400 text-[10px]">-0.15%</span>
            </div>
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
            Client Login
          </button>

          {/* Subscribe Now */}
          <button
            type="button"
            onClick={handleScrollToPricing}
            className="flex-1 h-10 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 text-slate-950 font-black rounded-xl text-xs tracking-tight transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>Subscribe</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 shrink-0" />
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-20 pb-16 sm:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide shadow-lg shadow-amber-500/10">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>THE INSTITUTIONAL TRADING PLATFORM & DIRECT TRADING NETWORK</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
              The Complete Trading Platform Built for <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                Serious & Professional Traders
              </span>
            </h1>

            {/* Descriptive Subtitle introducing all core offerings */}
            <p className="text-sm sm:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto">
              SM Trading Pro delivers everything a professional market participant demands: <strong>ready-made trading strategies on professional charts</strong>, comprehensive <strong>trading courses and strategy education</strong>, institutional <strong>market analysis</strong>, direct access to <strong>professional analysts</strong>, daily <strong>live trading sessions</strong>, real-time <strong>trading recommendations</strong>, and breaking <strong>market news</strong>.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <button
                type="button"
                onClick={handleScrollToPricing}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-sm sm:text-base tracking-tight shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
              >
                <span>Subscribe Now</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>

              <a
                href="https://t.me/SMTrading_SUPPORT"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 text-blue-400" />
                <span>Contact Support (@SMTrading_SUPPORT)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>

            {/* Trust Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 max-w-3xl mx-auto text-left rtl:text-right border-t border-slate-800/80">
              <div className="p-3 bg-[#0B0F1C]/80 border border-slate-800 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono-num">100%</div>
                <div className="text-[11px] text-slate-400 mt-0.5">USDT Settlement Only</div>
              </div>

              <div className="p-3 bg-[#0B0F1C]/80 border border-slate-800 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono-num">Real-Time</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Live Analysts & Trades</div>
              </div>

              <div className="p-3 bg-[#0B0F1C]/80 border border-slate-800 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-blue-400 font-mono-num">SMC & 144</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Ready-Made Strategies</div>
              </div>

              <div className="p-3 bg-[#0B0F1C]/80 border border-slate-800 rounded-xl">
                <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono-num">24/7</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Telegram Support Desk</div>
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
              WHAT SM TRADING PRO PROVIDES
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              An End-to-End Institutional Trading Ecosystem
            </h2>
            <p className="text-sm text-slate-300">
              Engineered to replace fragmented tools with one cohesive, institutional-grade environment.
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
                Ready-Made Strategies on Charts
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Institutional setups automatically framed on high-precision TradingView charts: Smart Money Concepts (SMC), liquidity pool sweeps, fair value gaps (FVG), order blocks, and the 144 Institutional Strategy.
              </p>
            </div>

            {/* 2. Trading Courses & Strategy Education */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-emerald-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Trading Courses & Education
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Comprehensive curriculum designed for institutional mastery: Complete SMC Masterclasses, Strategy 144 proprietary framework, Order Flow Bookmap analysis, and Prop Firm evaluation guidance.
              </p>
            </div>

            {/* 3. Market Analysis & Quantitative Research */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-blue-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-all">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                Deep Institutional Market Analysis
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Uncompromising macro and micro liquidity analysis: Central bank interest rate tracks, CME futures positioning, global market sentiment gauges, and quantitative alpha breakdowns.
              </p>
            </div>

            {/* 4. Professional Analysts & Live Trading */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-purple-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-all">
                <Radio className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                Professional Analysts & Live Trading
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Trade alongside verified analysts in real time: Live trading broadcasts during New York and London opens, audio commentary, live execution breakdowns, and interactive mentorship.
              </p>
            </div>

            {/* 5. Trading Recommendations & High-Probability Setups */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-rose-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20 transition-all">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                Actionable Trading Recommendations
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Clear, high-probability trade setups based strictly on the platform’s strategies with defined entry triggers, precise invalidation stop-loss boundaries, and multi-tier take-profit objectives.
              </p>
            </div>

            {/* 6. Latest Market News & Macro Wire */}
            <div className="p-6 bg-[#0B1020] border border-slate-800 hover:border-teal-500/40 rounded-2xl space-y-3.5 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-all">
                <Newspaper className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                Latest Market News & Catalysts
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Instant institutional intelligence: High-impact economic calendar, real-time alerts on CPI, NFP, and central bank speeches, keeping you ahead of volatile market-moving catalysts.
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
                <span>EXECUTION PRECISION</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Ready-Made Strategy Execution Directly on Professional Charts
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                Experience algorithmic clarity with our proprietary SMC & 144 strategy engine. Rather than guessing retail indicators, our charts systematically identify:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 bg-[#0C1220] border border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">Liquidity Pool Sweeps & Order Blocks</strong>
                    <span className="text-xs text-slate-400">Institutional manipulation zones where wholesale liquidity is seized.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-[#0C1220] border border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">Fair Value Gap (FVG) Retracements</strong>
                    <span className="text-xs text-slate-400">High-probability price imbalances mapped for precise discount entries.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 bg-[#0C1220] border border-slate-800 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-white block">The 144 Institutional Strategy</strong>
                    <span className="text-xs text-slate-400">Mathematical time-and-price framework tested across FX, Gold, and Indices.</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleScrollToPricing}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm tracking-tight transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Get Strategy Access Now
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
                    <span className="font-bold text-white font-mono">XAUUSD 1H SMC BREAKOUT</span>
                  </div>
                  <span className="text-emerald-400 font-mono font-bold">R:R 1:4.8 VALIDATED</span>
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
              INSTITUTIONAL CURRICULUM
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Trading Courses & Strategy Education
            </h2>
            <p className="text-sm text-slate-300">
              Master the exact mechanics of institutional execution under senior mentorship.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Course 1: SMC */}
            <div className="p-6 bg-[#0D1424] border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Flagship Masterclass
                </span>
                <span className="text-xs font-mono text-slate-400">5 Phases • 24 Modules</span>
              </div>
              <h3 className="text-lg font-bold text-white">SMC Trading Course</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Smart Money Concepts from foundational market structure to advanced CME futures footprint order flow, liquidity sweeps, and prop firm certification protocols.
              </p>
              <div className="text-xs text-amber-400/90 font-medium">
                ★ Included in the All-Inclusive Package ($999/Year)
              </div>
            </div>

            {/* Course 2: Strategy 144 */}
            <div className="p-6 bg-[#0D1424] border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                  Proprietary Framework
                </span>
                <span className="text-xs font-mono text-slate-400">Time & Price Mastery</span>
              </div>
              <h3 className="text-lg font-bold text-white">144 Strategy Course</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Proprietary algorithmic timing framework uniting Gann vibrational cycles with institutional price imbalances for high-precision trade timing.
              </p>
              <div className="text-xs text-amber-400/90 font-medium">
                ★ Included in the All-Inclusive Package ($999/Year)
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
                  <span>Live Trading Floor & Analysts</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Trade Live With Verified Senior Analysts
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed">
                  Never trade in isolation. As a subscriber, you get direct live access to daily trading desk broadcasts during London and New York market openings. Watch real-time order execution, ask questions directly to analysts, and receive high-probability setups before the market moves.
                </p>

                <div className="flex flex-wrap gap-4 pt-2 text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Daily NY / London Live Streams
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Direct Q&A with Analysts
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Real-Time Recommendations & Invalidation
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
                    <p className="text-xs text-amber-400 font-medium">Founder & CEO</p>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    "Institutional order flow is an objective science. We teach you how to follow smart money footprints, not retail emotion."
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
                    <p className="text-xs text-amber-400 font-medium">Co-Founder</p>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    "Robust infrastructure and flawless trade execution form the bedrock of institutional success."
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
              <span>TRANSPARENT INSTITUTIONAL TIERS</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Choose Your Subscription Package
            </h2>

            <p className="text-sm sm:text-base text-slate-300">
              Select your membership tier and settle securely via <strong>USDT</strong>. Instant manual onboarding and verification by our official support team.
            </p>
          </div>

          {/* Three Site Subscription Packages */}
          <div className="space-y-4 mb-10">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Site Subscription Packages</h3>
                <p className="text-xs text-slate-400">Full platform, news, analyst access, ready-made strategy setups, and recommendations</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                USDT ACCEPTED ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SITE_SUBSCRIPTION_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-[#0C1220] border border-slate-800 hover:border-slate-700 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6 transition-all shadow-xl hover:shadow-2xl relative"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {plan.name}
                      </span>
                      {plan.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {plan.badge}
                        </span>
                      )}
                    </div>

                    {/* Price Display */}
                    <div>
                      <div className="text-3xl sm:text-4xl font-black text-white font-mono-num tracking-tight">
                        {plan.priceDisplay}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {plan.billingPeriod} • Settle in USDT
                      </div>
                    </div>

                    {/* Inclusions */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                      <span className="text-xs font-bold text-slate-300 block">Includes:</span>
                      <ul className="space-y-2 text-xs text-slate-300">
                        {plan.features.map((feat, idx) => (
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
                          “Courses and educational programs are NOT included in this subscription.”
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
                    <span>Subscribe Now</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Standalone Premium Package: All-Inclusive (BEST OFFER / BEST PACKAGE) */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="relative rounded-3xl bg-gradient-to-b from-[#182035] via-[#0E1528] to-[#0A0F1E] border-2 border-amber-500/60 p-6 sm:p-10 shadow-2xl shadow-amber-500/10 overflow-hidden">
              
              {/* Highlight Badge */}
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2">
                <div className="px-5 py-1.5 rounded-b-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-slate-950" />
                  <span>BEST OFFER • BEST PACKAGE • MAXIMUM VALUE</span>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Left side: Package Title, Price & Value Proposition */}
                <div className="lg:col-span-6 space-y-4">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                      ULTIMATE INSTITUTIONAL BUNDLE
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                      {PREMIUM_ALL_INCLUSIVE_PLAN.name}
                    </h3>
                  </div>

                  <div>
                    <div className="text-4xl sm:text-5xl font-black text-amber-400 font-mono-num tracking-tight">
                      {PREMIUM_ALL_INCLUSIVE_PLAN.priceDisplay} <span className="text-sm font-semibold text-slate-400">/ Year</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Full 12 Months Platform Access + Complete Course Suite • Settle in USDT
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    This is the <strong>complete all-inclusive package and the best value</strong> for serious traders. You receive everything in the Site Subscription for a full 12 months, plus both flagship proprietary courses:
                  </p>

                  {/* Included Courses Box */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>COURSES INCLUDED IN THIS PACKAGE:</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <strong>SMC Trading Course</strong> (Smart Money Concepts Masterclass)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        <strong>144 Strategy Course</strong> (Complete Institutional Methodology)
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right side: Complete Inclusions & CTA */}
                <div className="lg:col-span-6 space-y-5 bg-[#090D17]/80 p-5 sm:p-6 rounded-2xl border border-slate-800">
                  <span className="text-xs font-bold text-white block">
                    Full Package Inclusions:
                  </span>
                  
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Everything in the Site Subscription for a full 12 months</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>SMC Trading Course + 144 Strategy Course included in full</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Full platform access & live TradingView strategy charts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Latest market news & institutional macro analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Daily live access to analysts & live trading sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Ready-made strategy setups & algorithmic execution</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Direct trading recommendations with precision invalidation</span>
                    </li>
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleSubscribeClick(PREMIUM_ALL_INCLUSIVE_PLAN)}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-sm sm:text-base tracking-tight shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <span>Subscribe Now — All-Inclusive ($999/Year)</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>

                  <div className="text-center">
                    <span className="text-[11px] text-slate-400">
                      USDT Only • Contact Support for Instant Activation
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
                <span>OFFICIAL TELEGRAM SUPPORT</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Payment Method: USDT (TRC20)
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                “To complete your subscription, contact our support team to receive the USDT TRC20 payment address and payment instructions.”
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Instant verification — subscription will be activated after confirmation.</span>
              </div>
              <p className="text-xs text-slate-400">
                Official support username: <strong className="text-white font-mono">@SMTrading_SUPPORT</strong> • Network: <strong className="text-emerald-400 font-mono">TRC20 ONLY</strong>
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
                <span>Contact Support for Payment Details</span>
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
              Subscription & Payment FAQ
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Clear answers regarding our membership activation and USDT settlement.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white">Why is payment strictly USDT?</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                USDT provides instantaneous, borderless, irreversible settlement with minimal network fees. We do not support credit cards, PayPal, or bank wires to ensure privacy, zero processing delays, and global availability.
              </p>
            </div>

            <div className="p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white">How do I receive my login credentials after subscribing?</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                After you contact support or submit your payment confirmation with your Telegram handle and email, our official desk verifies the transaction and immediately activates your account, providing your direct access credentials.
              </p>
            </div>

            <div className="p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white">What is the difference between Site Subscription and All-Inclusive?</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Site Subscription packages (Monthly, 6 Months, 1 Year) include platform access, market news, live analyst access, ready-made strategy charts, and trading recommendations. <strong>Courses and educational programs are NOT included</strong> in Site Subscriptions. The <strong>All-Inclusive Package ($999/Year)</strong> includes everything plus the complete SMC Trading Course and 144 Strategy Course.
              </p>
            </div>

            <div className="p-5 bg-[#0C1220] border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white">Can I contact support before subscribing?</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Yes, our official support desk is available 24/7 on Telegram at <strong>@SMTrading_SUPPORT</strong> to answer any questions regarding the platform, strategies, and packages before payment.
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
            Risk Warning: Financial trading involves substantial risk of capital loss. Past performance of strategy setups is not indicative of future results.
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
              Client Login
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
