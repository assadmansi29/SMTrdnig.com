/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Article, 
  ArticleCategory, 
  TradeSetup 
} from './types';
import { 
  INITIAL_ARTICLES, 
  AUTHORS 
} from './data/blogData';
import { Header } from './components/Header';
import { FeaturedArticlesSection } from './components/FeaturedArticlesSection';
import { EducationalSection } from './components/EducationalSection';
import { LiveTradingSection } from './components/LiveTradingSection';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { BlueVerifiedBadge } from './components/BlueVerifiedBadge';
import { useAbuAsadAvatar } from './context/AvatarContext';
import { PositionCalculatorModal } from './components/PositionCalculatorModal';
import { EconomicCalendarModal } from './components/EconomicCalendarModal';
import { ChartSimulatorModal } from './components/ChartSimulatorModal';
import { SavedArticlesModal } from './components/SavedArticlesModal';
import { SearchModal } from './components/SearchModal';
import { NewsletterModal } from './components/NewsletterModal';
import { ECommerceModal } from './components/ECommerceModal';
import { StudentCoachingModal } from './components/StudentCoachingModal';
import { AuthGate } from './components/AuthGate';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminPanelModal, AdminPanelTabType } from './components/AdminPanelModal';
import { Footer } from './components/Footer';
import { useTranslation } from './context/LanguageContext';
import { useAuth } from './context/AuthContext';
import { useYouTubeLive } from './hooks/useYouTubeLive';
import { getArticlesByLanguage } from './data/localizedData';
import { getLocalizedCategory } from './locales';
import { copyToClipboard } from './utils/clipboard';
import { 
  Sparkles, 
  Send,
  ExternalLink,
  Radio,
  Mail,
  Copy,
  Headphones,
  Check
} from 'lucide-react';

export default function App() {
  const { t, isRTL, language } = useTranslation();
  const [articles, setArticles] = useState<Article[]>(() => getArticlesByLanguage(language));
  const [activeCategory, setActiveCategory] = useState<ArticleCategory>('All');

  const { user } = useAuth();
  const { isLive, stream } = useYouTubeLive();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorSetup, setCalculatorSetup] = useState<TradeSetup | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [chartDefaultSymbol, setChartDefaultSymbol] = useState('OANDA:XAUUSD');
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [isECommerceOpen, setIsECommerceOpen] = useState(false);
  const [isCoachingDeskOpen, setIsCoachingDeskOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<AdminPanelTabType>('users');
  const [adminInitialSymbol, setAdminInitialSymbol] = useState<string | undefined>(undefined);
  const [adminInitialInterval, setAdminInitialInterval] = useState<string | undefined>(undefined);

  const handleOpenAdmin = (tab: AdminPanelTabType = 'users', symbol?: string, interval?: string) => {
    setAdminInitialTab(tab);
    setAdminInitialSymbol(symbol);
    setAdminInitialInterval(interval);
    setIsAdminOpen(true);
  };

  const handleOpenCoachingDesk = () => {
    setIsCoachingDeskOpen(true);
  };
  const [supportEmailCopied, setSupportEmailCopied] = useState(false);
  const [supportTelegramCopied, setSupportTelegramCopied] = useState(false);

  const handleCopySupportEmail = async () => {
    await copyToClipboard('smtradingsupprt@gmail.com');
    setSupportEmailCopied(true);
    setTimeout(() => setSupportEmailCopied(false), 2500);
  };

  const handleCopySupportTelegram = async () => {
    await copyToClipboard('@SMTrading_support');
    setSupportTelegramCopied(true);
    setTimeout(() => setSupportTelegramCopied(false), 2500);
  };

  // Capture incoming referral link parameters (?ref=SM...) and persist to localStorage
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref') || urlParams.get('referral');
      if (refParam) {
        const cleanRef = refParam.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (cleanRef) {
          localStorage.setItem('smtrading_ref', cleanRef);
        }
      }
    } catch {
      // safe fallback
    }
  }, []);

  // Sync localized articles when language changes
  useEffect(() => {
    const localized = getArticlesByLanguage(language);
    setArticles(localized);
    if (selectedArticle) {
      const refreshed = localized.find(a => a.id === selectedArticle.id);
      if (refreshed) {
        setSelectedArticle(refreshed);
      }
    }
  }, [language]);

  // Bookmark persistence
  const [savedArticleIds, setSavedArticleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smtrading_saved_articles');
      return saved ? JSON.parse(saved) : ['art-1', 'art-2'];
    } catch {
      return ['art-1', 'art-2'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('smtrading_saved_articles', JSON.stringify(savedArticleIds));
    } catch {
      // ignore
    }
  }, [savedArticleIds]);

  // Global keyboard shortcut: Command/Ctrl + K for Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleBookmark = (articleId: string) => {
    setSavedArticleIds(prev => 
      prev.includes(articleId) ? prev.filter(id => id !== articleId) : [...prev, articleId]
    );
  };

  const handleOpenCalculatorWithSetup = (setup: TradeSetup) => {
    setCalculatorSetup(setup);
    setIsCalculatorOpen(true);
  };

  const savedArticles = articles.filter(a => savedArticleIds.includes(a.id));

  return (
    <AuthGate>
      <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-amber-400/20 selection:text-amber-300">
        {/* Top Navigation & Brand Header */}
        <Header
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        savedArticlesCount={savedArticleIds.length}
        onOpenSavedModal={() => setIsSavedOpen(true)}
        onOpenSearchModal={() => setIsSearchOpen(true)}
        onOpenCalculator={() => {
          setCalculatorSetup(null);
          setIsCalculatorOpen(true);
        }}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenChart={() => setIsChartOpen(true)}
        onOpenNewsletter={() => setIsNewsletterOpen(true)}
        onOpenECommerce={() => setIsECommerceOpen(true)}
        onOpenCoachingDesk={handleOpenCoachingDesk}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenAdmin={(tab) => handleOpenAdmin(tab || 'users')}
      />

      {/* Dynamic Global Live Broadcast Bar when YouTube live stream is active */}
      {isLive && stream && (
        <div className="bg-gradient-to-r from-rose-950 via-[#180B15] to-[#0A0E1A] border-b border-rose-500/40 px-4 py-2.5 shadow-lg relative z-20">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm shadow-rose-600/50 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                LIVE NOW
              </span>
              <span className="text-white font-bold truncate max-w-xl">
                {stream.title?.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')}
              </span>
              {stream.concurrentViewers !== undefined && stream.concurrentViewers > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 text-rose-300 font-mono-num text-[11px]">
                  • {stream.concurrentViewers} {t('liveStreamWatching')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setActiveCategory('LIVE Trade');
                  document.getElementById('live-tradingview-terminal')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{t('liveStreamTab')}</span>
              </button>
              <a
                href={stream.watchUrl || `https://www.youtube.com/watch?v=${stream.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-semibold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>YouTube</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Body Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 w-full">
        {/* If live stream is active, show Live Stream Terminal at the top for immediate viewer visibility */}
        {isLive && (
          <LiveTradingSection 
            activeCategory={activeCategory}
            onOpenChartModal={(symbol) => {
              if (symbol) {
                if (symbol.includes(':')) {
                  setChartDefaultSymbol(symbol);
                } else {
                  const symUpper = symbol.toUpperCase().replace(/US3O/g, 'US30');
                  let canonicalSymbol = symbol;
                  if (symUpper.includes('NAS100') || symUpper.includes('NQ') || symUpper.includes('NASDAQ')) {
                    canonicalSymbol = 'OANDA:NAS100USD';
                  } else if (symUpper.includes('US30') || symUpper.includes('DOW')) {
                    canonicalSymbol = 'OANDA:US30USD';
                  } else if (symUpper.includes('GER40') || symUpper.includes('DAX') || symUpper.includes('DE30')) {
                    canonicalSymbol = 'OANDA:DE30EUR';
                  } else if (symUpper.includes('XAU') || symUpper.includes('GOLD')) {
                    canonicalSymbol = 'OANDA:XAUUSD';
                  }
                  setChartDefaultSymbol(canonicalSymbol);
                }
              }
              setIsChartOpen(true);
            }} 
            onOpenCalendar={() => setIsCalendarOpen(true)}
            onOpenCalculator={() => {
              setCalculatorSetup(null);
              setIsCalculatorOpen(true);
            }}
            onOpenAdminModal={(tab, symbol, interval) => handleOpenAdmin((tab as AdminPanelTabType) || 'users', symbol, interval)}
          />
        )}

        {/* Featured Articles Section (Prominently displays lead research desk spotlight article) */}
        {activeCategory === 'All' && (
          <FeaturedArticlesSection
            articles={articles}
            onSelectArticle={(art) => setSelectedArticle(art)}
            savedArticleIds={savedArticleIds}
            onToggleBookmark={handleToggleBookmark}
            onOpenCalculatorWithSetup={handleOpenCalculatorWithSetup}
          />
        )}

        {/* Live Market TradingView Terminal Section (when not live) */}
        {!isLive && (
          <LiveTradingSection 
            activeCategory={activeCategory}
            onOpenChartModal={(symbol) => {
              if (symbol) {
                if (symbol.includes(':')) {
                  setChartDefaultSymbol(symbol);
                } else {
                  const symUpper = symbol.toUpperCase().replace(/US3O/g, 'US30');
                  let canonicalSymbol = symbol;
                  if (symUpper.includes('NAS100') || symUpper.includes('NQ') || symUpper.includes('NASDAQ')) {
                    canonicalSymbol = 'OANDA:NAS100USD';
                  } else if (symUpper.includes('US30') || symUpper.includes('DOW')) {
                    canonicalSymbol = 'OANDA:US30USD';
                  } else if (symUpper.includes('GER40') || symUpper.includes('DAX') || symUpper.includes('DE30')) {
                    canonicalSymbol = 'OANDA:DE30EUR';
                  } else if (symUpper.includes('XAU') || symUpper.includes('GOLD')) {
                    canonicalSymbol = 'OANDA:XAUUSD';
                  }
                  setChartDefaultSymbol(canonicalSymbol);
                }
              }
              setIsChartOpen(true);
            }} 
            onOpenCalendar={() => setIsCalendarOpen(true)}
            onOpenCalculator={() => {
              setCalculatorSetup(null);
              setIsCalculatorOpen(true);
            }}
            onOpenAdminModal={(tab, symbol, interval) => handleOpenAdmin((tab as AdminPanelTabType) || 'users', symbol, interval)}
          />
        )}

        {/* Professional Educational Academy Section (Positioned directly under TradingView chart) */}
        {activeCategory === 'All' && (
          <EducationalSection />
        )}

        {/* Category Filter View when a specific category is active */}
        {activeCategory !== 'All' && (
          <div className="space-y-8">
            <div className="space-y-4 border-b border-slate-800 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-mono-num text-amber-400 font-bold uppercase tracking-wider">
                    {t('filterArchive')}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                    {getLocalizedCategory(activeCategory, t)}
                  </h2>
                </div>
                <button
                  onClick={() => setActiveCategory('All')}
                  className="text-xs text-slate-400 hover:text-amber-300 underline font-medium cursor-pointer"
                >
                  {t('filterResetAll')}
                </button>
              </div>

              {/* Dedicated SMTrading VIP Signals Channel Banner Button inside VIP Signals */}
            {activeCategory === 'VIP Signals' && (
              <div className="bg-gradient-to-r from-[#0088cc]/20 via-[#0D182E] to-[#121B30] border-2 border-[#0088cc]/50 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-[#0088cc]/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all hover:border-[#0088cc]">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0088cc]/20 border border-[#0088cc]/50 text-[#38bdf8] text-[11px] font-mono-num font-bold uppercase tracking-wider">
                      <Radio className="w-3 h-3 text-[#38bdf8] animate-pulse" />
                      Live Feed
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      SMTrading VIP Desk
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    SMTrading VIP Signals Telegram
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {t('vipChannelSubtitle')}
                  </p>
                </div>

                <a
                  href="https://t.me/+pv2CVLJeM1ZlMjQ8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0088cc] to-[#00a2f5] hover:from-[#0099e6] hover:to-[#1ab2ff] text-white font-black text-sm shadow-lg shadow-[#0088cc]/30 hover:shadow-[#0088cc]/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4 fill-white" />
                  <span>{t('vipChannelBtn')}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            )}

            {/* Dedicated SMTrading Support Desk Banner inside Support category */}
            {activeCategory === 'Support' && (
              <div className="bg-gradient-to-r from-amber-500/20 via-[#0D182E] to-[#121B30] border-2 border-amber-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-amber-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-all hover:border-amber-400">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-[11px] font-mono-num font-bold uppercase tracking-wider">
                      <Headphones className="w-3 h-3 text-amber-400" />
                      Official 24/7 Desk
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono-num font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('supportResponseTime')}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {t('supportBannerTitle')}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {t('supportBannerSubtitle')}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Telegram:</span>
                      <a
                        href="https://t.me/SMTrading_support"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-mono text-sky-300 hover:text-white font-bold bg-[#24A1DE]/20 hover:bg-[#24A1DE]/30 px-2.5 py-1 rounded-lg border border-[#24A1DE]/40 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3 text-[#24A1DE]" />
                        <span>@SMTrading_support</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Direct Email:</span>
                      <span className="text-xs sm:text-sm font-mono-num text-amber-400 font-bold bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 select-all">
                        smtradingsupprt@gmail.com
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap">
                  <a
                    href="https://t.me/SMTrading_support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 h-11 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-[#24A1DE] to-[#1a8fc7] hover:from-[#29a8e8] hover:to-[#1d9ad6] text-white font-black text-xs sm:text-sm shadow-md shadow-[#24A1DE]/25 hover:shadow-[#24A1DE]/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-4 h-4 text-white shrink-0" />
                    <span>Telegram @SMTrading_support</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-90 shrink-0" />
                  </a>

                  <button
                    onClick={handleCopySupportTelegram}
                    className="group relative inline-flex items-center justify-center gap-2 h-11 px-3.5 sm:px-4 rounded-xl bg-[#0B1220]/90 hover:bg-[#0F1A30] border border-sky-500/30 hover:border-sky-400/60 text-slate-200 hover:text-white text-xs font-semibold shadow-sm hover:shadow-[0_0_16px_rgba(36,161,222,0.18)] transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                    title="Copy Telegram Username: @SMTrading_support"
                  >
                    {supportTelegramCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="font-mono text-xs font-bold text-sky-300">@SMTrading_support Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-sky-400/80 group-hover:text-sky-300 group-hover:scale-110 transition-all shrink-0" />
                        <span className="font-mono text-xs text-slate-300 group-hover:text-white">@SMTrading_support</span>
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-sky-300 group-hover:bg-sky-500/25">
                          Copy
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopySupportEmail}
                    className="group relative inline-flex items-center justify-center gap-2 h-11 px-3.5 sm:px-4 rounded-xl bg-[#0B1220]/90 hover:bg-[#1C160B] border border-amber-500/30 hover:border-amber-400/60 text-slate-200 hover:text-white text-xs font-semibold shadow-sm hover:shadow-[0_0_16px_rgba(245,158,11,0.18)] transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
                    title="Copy Support Email: smtradingsupprt@gmail.com"
                  >
                    {supportEmailCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-mono text-xs font-bold text-emerald-300">{t('supportEmailCopied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300 group-hover:scale-110 transition-all shrink-0" />
                        <span className="font-mono text-xs text-slate-300 group-hover:text-white">smtradingsupprt@gmail.com</span>
                        <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 text-amber-300 group-hover:bg-amber-500/25">
                          Copy
                        </span>
                      </>
                    )}
                  </button>

                  <a
                    href="mailto:smtradingsupprt@gmail.com?subject=SMTrading%20Support%20Request"
                    className="inline-flex items-center justify-center gap-2 h-11 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Mail className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>{t('supportEmailBtn')}</span>
                  </a>
                </div>
              </div>
            )}
            </div>

          </div>
        )}
      </main>

      {/* 4. Institutional Footer */}
      <Footer
        onSelectCategory={setActiveCategory}
        onOpenCalculator={() => {
          setCalculatorSetup(null);
          setIsCalculatorOpen(true);
        }}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenChart={() => setIsChartOpen(true)}
        onOpenNewsletter={() => setIsNewsletterOpen(true)}
        onOpenCoachingDesk={handleOpenCoachingDesk}
        onOpenECommerce={() => setIsECommerceOpen(true)}
      />

      {/* Modals & Portals */}
      <ArticleDetailModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        isBookmarked={selectedArticle ? savedArticleIds.includes(selectedArticle.id) : false}
        onToggleBookmark={handleToggleBookmark}
        onOpenCalculatorWithSetup={handleOpenCalculatorWithSetup}
        onSelectArticle={(art) => setSelectedArticle(art)}
        allArticles={articles}
      />

      <PositionCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        initialSetup={calculatorSetup}
      />

      <EconomicCalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />

      <ChartSimulatorModal
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
        defaultSymbol={chartDefaultSymbol}
        onOpenAdminModal={(tab, symbol, interval) => handleOpenAdmin((tab as AdminPanelTabType) || 'users', symbol, interval)}
      />

      <SavedArticlesModal
        isOpen={isSavedOpen}
        onClose={() => setIsSavedOpen(false)}
        savedArticles={savedArticles}
        onSelectArticle={(art) => setSelectedArticle(art)}
        onRemoveBookmark={handleToggleBookmark}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        articles={articles}
        onSelectArticle={(art) => setSelectedArticle(art)}
      />

      <NewsletterModal
        isOpen={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
      />

      <ECommerceModal
        isOpen={isECommerceOpen}
        onClose={() => setIsECommerceOpen(false)}
      />

      <StudentCoachingModal
        isOpen={isCoachingDeskOpen}
        onClose={() => setIsCoachingDeskOpen(false)}
        onOpenMasterDesk={() => handleOpenAdmin('coaching')}
        onOpenAuth={() => setIsProfileOpen(true)}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onOpenAdmin={() => handleOpenAdmin('users')}
        onOpenCoachingDesk={handleOpenCoachingDesk}
      />

      <AdminPanelModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        initialTab={adminInitialTab}
        initialSymbol={adminInitialSymbol}
        initialInterval={adminInitialInterval}
      />
    </div>
    </AuthGate>
  );
}
