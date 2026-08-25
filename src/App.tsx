/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Article, 
  ArticleCategory, 
  MarketTickerItem, 
  TradeSetup 
} from './types';
import { 
  INITIAL_ARTICLES, 
  INITIAL_MARKET_TICKERS, 
  INITIAL_ECONOMIC_EVENTS, 
  AUTHORS 
} from './data/blogData';
import { MarketTicker } from './components/MarketTicker';
import { Header } from './components/Header';
import { HeroFeaturedArticle } from './components/HeroFeaturedArticle';
import { ArticleCard } from './components/ArticleCard';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { BlueVerifiedBadge } from './components/BlueVerifiedBadge';
import { PositionCalculatorModal } from './components/PositionCalculatorModal';
import { EconomicCalendarModal } from './components/EconomicCalendarModal';
import { ChartSimulatorModal } from './components/ChartSimulatorModal';
import { SavedArticlesModal } from './components/SavedArticlesModal';
import { SearchModal } from './components/SearchModal';
import { NewsletterModal } from './components/NewsletterModal';
import { FearGreedGauge } from './components/FearGreedGauge';
import { Footer } from './components/Footer';
import { 
  TrendingUp, 
  Sparkles, 
  SlidersHorizontal, 
  Layers, 
  ShieldCheck, 
  Calendar, 
  Calculator, 
  Flame, 
  ChevronRight,
  BookOpen,
  LineChart,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function App() {
  const [articles, setArticles] = useState<Article[]>(INITIAL_ARTICLES);
  const [activeCategory, setActiveCategory] = useState<ArticleCategory>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Beginner' | 'Intermediate' | 'Institutional'>('All');
  const [activeFilterTab, setActiveFilterTab] = useState<'All' | 'Trending' | 'EditorPick'>('All');

  // Modal States
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorSetup, setCalculatorSetup] = useState<TradeSetup | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);

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

  // Filter logic
  const filteredArticles = articles.filter(art => {
    if (activeCategory !== 'All' && art.category !== activeCategory) return false;
    if (selectedDifficulty !== 'All' && art.difficulty !== selectedDifficulty) return false;
    if (activeFilterTab === 'Trending' && !art.trending) return false;
    if (activeFilterTab === 'EditorPick' && !art.editorPick) return false;
    return true;
  });

  // Featured Lead Article
  const heroArticle = articles.find(a => a.featured) || articles[0];
  const gridArticles = activeCategory === 'All' && activeFilterTab === 'All' && selectedDifficulty === 'All'
    ? filteredArticles.filter(a => a.id !== heroArticle.id)
    : filteredArticles;

  const savedArticles = articles.filter(a => savedArticleIds.includes(a.id));

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-amber-400/20 selection:text-amber-300">
      {/* 1. Live Market Ticker Strip */}
      <MarketTicker
        tickers={INITIAL_MARKET_TICKERS}
        onSelectTicker={(ticker) => {
          setIsChartOpen(true);
        }}
      />

      {/* 2. Top Navigation & Brand Header */}
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
      />

      {/* 3. Main Body Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 w-full">
        {/* Hero Featured Story (Shown when viewing 'All' category) */}
        {activeCategory === 'All' && activeFilterTab === 'All' && selectedDifficulty === 'All' && (
          <section aria-label="Lead Story">
            <HeroFeaturedArticle
              article={heroArticle}
              onSelectArticle={(art) => setSelectedArticle(art)}
              isBookmarked={savedArticleIds.includes(heroArticle.id)}
              onToggleBookmark={handleToggleBookmark}
            />
          </section>
        )}

        {/* Category Header Title when filtering */}
        {activeCategory !== 'All' && (
          <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono-num text-amber-400 font-bold uppercase tracking-wider">
                Research Archive
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                {activeCategory}
              </h2>
            </div>
            <button
              onClick={() => setActiveCategory('All')}
              className="text-xs text-slate-400 hover:text-amber-300 underline font-medium"
            >
              Reset to All Sectors
            </button>
          </div>
        )}

        {/* Content Explorer Section */}
        <section className="space-y-6">
          {/* Sub-Filters & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0D1322] p-3 sm:p-4 rounded-2xl border border-slate-800">
            {/* Tab Switches */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveFilterTab('All')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeFilterTab === 'All'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Latest Intelligence ({articles.length})
              </button>
              <button
                onClick={() => setActiveFilterTab('Trending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeFilterTab === 'Trending'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                Trending Alpha
              </button>
              <button
                onClick={() => setActiveFilterTab('EditorPick')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  activeFilterTab === 'EditorPick'
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Editor's Choice
              </button>
            </div>

            {/* Difficulty Tier Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 hidden sm:inline">Execution Tier:</span>
              {(['All', 'Beginner', 'Intermediate', 'Institutional'] as const).map(tier => (
                <button
                  key={tier}
                  onClick={() => setSelectedDifficulty(tier)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono-num transition-all ${
                    selectedDifficulty === tier
                      ? 'bg-slate-800 text-amber-300 font-bold border border-amber-400/40'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Main Layout: 2/3 Grid + 1/3 Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Articles Grid (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {gridArticles.length === 0 ? (
                <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                  <p className="text-slate-400 text-sm">No strategy articles matched your filter criteria.</p>
                  <button
                    onClick={() => {
                      setActiveCategory('All');
                      setSelectedDifficulty('All');
                      setActiveFilterTab('All');
                    }}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {gridArticles.map(article => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onSelectArticle={(art) => setSelectedArticle(art)}
                      isBookmarked={savedArticleIds.includes(article.id)}
                      onToggleBookmark={handleToggleBookmark}
                      onShare={() => {
                        setSelectedArticle(article);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Widgets (4 cols) */}
            <aside className="lg:col-span-4 space-y-6">
              {/* 1. Fear & Greed Sentiment Widget */}
              <FearGreedGauge />

              {/* 2. Institutional Macro Catalyst Box */}
              <div className="bg-[#0D1322] border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                      Upcoming High-Impact Catalysts
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsCalendarOpen(true)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center"
                  >
                    View All <ChevronRight className="w-3 h-3 ml-0.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {INITIAL_ECONOMIC_EVENTS.slice(0, 3).map(evt => (
                    <div
                      key={evt.id}
                      onClick={() => setIsCalendarOpen(true)}
                      className="p-2.5 bg-[#090D17] hover:bg-slate-800/50 rounded-xl border border-slate-800/80 cursor-pointer transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono-num">
                        <span className="text-amber-400 font-semibold">{evt.countryCode} • {evt.time}</span>
                        <span className="bg-rose-500/20 text-rose-300 px-1 rounded uppercase font-bold">
                          {evt.impact}
                        </span>
                      </div>
                      <h5 className="font-semibold text-xs text-slate-200 line-clamp-1">
                        {evt.event}
                      </h5>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Interactive Quick Tools Launcher Card */}
              <div className="bg-gradient-to-br from-[#0D1322] to-[#121A2E] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  Proprietary Trading Tools
                </h4>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setCalculatorSetup(null);
                      setIsCalculatorOpen(true);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-[#090D17] hover:bg-slate-800/70 border border-slate-800 hover:border-amber-400/30 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors block">
                        Position Size & Risk Engine
                      </span>
                      <span className="text-[11px] text-slate-400">Compute Lot Sizes & R:R Ratios</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => setIsChartOpen(true)}
                    className="w-full text-left p-3 rounded-xl bg-gradient-to-r from-[#090D17] to-[#0d1627] hover:bg-slate-800/70 border border-cyan-500/20 hover:border-cyan-400/40 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors block">
                          TradingView.com & SMC Studio
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      </div>
                      <span className="text-[11px] text-slate-400">Live tradingview.com charts on left + SMC engine</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                </div>
              </div>

              {/* 4. Editorial Quantitative Analysts */}
              <div className="bg-[#0D1322] border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    Quantitative Research Desk
                  </h4>
                  <span className="text-[10px] font-mono-num text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    SMC Alpha
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Lead Architect: Abu Asad Almansi */}
                  <div className="p-3 bg-gradient-to-br from-amber-500/10 via-[#0A0F1A] to-[#0E1528] rounded-xl border border-amber-500/30 flex items-center gap-3 shadow-md">
                    <div className="relative shrink-0">
                      <img
                        src={AUTHORS.abuAsad.avatar}
                        alt={AUTHORS.abuAsad.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover object-top border-2 border-amber-400 shadow-sm"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full ring-2 ring-[#0B0F17]">
                        <ShieldCheck className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="font-extrabold text-xs text-white truncate">{AUTHORS.abuAsad.name}</h5>
                        <BlueVerifiedBadge size="xs" />
                        <span className="bg-amber-400/20 text-amber-300 text-[9px] font-mono-num font-bold px-1.5 py-0.2 rounded border border-amber-400/40">
                          FOUNDER
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-400/90 font-medium truncate">{AUTHORS.abuAsad.role}</p>
                      <p className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">SMC & Institutional Order Flow Lead</p>
                    </div>
                  </div>

                  {/* Other Desk Analysts */}
                  {Object.values(AUTHORS).filter(a => a.id !== 'author-0').map(author => (
                    <div key={author.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/40 transition-colors">
                      <img
                        src={author.avatar}
                        alt={author.name}
                        className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-xs text-white truncate">{author.name}</h5>
                        <p className="text-[10px] text-slate-400 truncate">{author.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>
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
        events={INITIAL_ECONOMIC_EVENTS}
      />

      <ChartSimulatorModal
        isOpen={isChartOpen}
        onClose={() => setIsChartOpen(false)}
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
    </div>
  );
}
