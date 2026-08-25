import React, { useState } from 'react';
import { Article, TradeSetup } from '../types';
import { 
  Sparkles, 
  Flame, 
  Clock, 
  Eye, 
  Bookmark, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Compass, 
  Target, 
  BookOpen, 
  Layers, 
  Zap, 
  CheckCircle,
  ThumbsUp
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { useAbuAsadAvatar } from '../context/AvatarContext';

interface FeaturedArticlesSectionProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  savedArticleIds: string[];
  onToggleBookmark: (articleId: string) => void;
  onOpenCalculatorWithSetup?: (setup: TradeSetup) => void;
}

export const FeaturedArticlesSection: React.FC<FeaturedArticlesSectionProps> = ({
  articles,
  onSelectArticle,
  savedArticleIds,
  onToggleBookmark,
  onOpenCalculatorWithSetup
}) => {
  const { abuAsadAvatar } = useAbuAsadAvatar();

  // Pick top 4-5 high impact featured articles
  const featuredArticles = React.useMemo(() => {
    // Sort or filter: prioritize featured and trending
    const featuredList = articles.filter(a => a.featured || a.trending || a.editorPick);
    if (featuredList.length >= 4) {
      return featuredList.slice(0, 5);
    }
    return articles.slice(0, 5);
  }, [articles]);

  const [activeSpotlightId, setActiveSpotlightId] = useState<string>(
    featuredArticles[0]?.id || 'art-1'
  );

  const leadArticle = featuredArticles.find(a => a.id === activeSpotlightId) || featuredArticles[0];
  const sideArticles = featuredArticles.filter(a => a.id !== leadArticle.id);

  if (!leadArticle) return null;

  const leadAvatarSrc = leadArticle.author.name.includes('Abu Asad') 
    ? abuAsadAvatar 
    : leadArticle.author.avatar;

  const isLeadBookmarked = savedArticleIds.includes(leadArticle.id);

  return (
    <section aria-label="Featured Trading Articles" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-transparent text-amber-300 text-[11px] font-mono-num font-bold px-3 py-1 rounded-full border border-amber-400/30 uppercase tracking-widest shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Featured Research Desk
            </span>
            <span className="text-xs text-slate-400 font-mono-num hidden sm:inline">
              • {featuredArticles.length} Prime Alpha Deep-Dives
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Featured Market Intelligence & Quantitative Studies
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            High-conviction market microstructure, global macro liquidity cycles, and algorithmic execution playbooks curated for serious traders.
          </p>
        </div>

        {/* Quick Spotlight Selector Chips */}
        <div className="flex items-center gap-1.5 bg-[#090D17] p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono-num text-slate-400 px-2 uppercase font-bold hidden md:inline">
            Spotlight:
          </span>
          {featuredArticles.map((art, idx) => (
            <button
              key={art.id}
              onClick={() => setActiveSpotlightId(art.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono-num transition-all flex items-center gap-1 ${
                leadArticle.id === art.id
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title={art.title}
            >
              <span>#{idx + 1}</span>
              <span className="hidden lg:inline text-[11px] max-w-[80px] truncate">
                {art.category.split('&')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Featured Layout: 7-Col Hero Lead + 5-Col Spotlight Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* 1. Primary Hero Card (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="relative rounded-3xl overflow-hidden border border-amber-500/35 bg-gradient-to-br from-[#0D1322] via-[#0E162B] to-[#0A0F1D] shadow-2xl group flex flex-col h-full transition-all duration-300 hover:border-amber-400/60 hover:shadow-amber-500/10">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

            {/* Thumbnail Header with Live Setup Overlay */}
            <div 
              className="relative h-64 sm:h-72 w-full overflow-hidden cursor-pointer bg-slate-900 shrink-0"
              onClick={() => onSelectArticle(leadArticle)}
            >
              <img
                src={leadArticle.image}
                alt={leadArticle.title}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1322] via-[#0D1322]/40 to-transparent"></div>

              {/* Floating Badges */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
                <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
                  <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-400/20">
                    <Flame className="w-3.5 h-3.5 fill-slate-950" />
                    Lead Quantitative Study
                  </span>
                  <span className="bg-[#090D17]/90 backdrop-blur-md text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-400/30">
                    {leadArticle.category}
                  </span>
                </div>

                <span className="bg-slate-950/80 backdrop-blur-md text-slate-200 text-xs font-mono-num px-2.5 py-1 rounded-full border border-slate-700/80 pointer-events-auto">
                  {leadArticle.difficulty}
                </span>
              </div>

              {/* Active Trade Setup Banner if Available */}
              {leadArticle.tradeSetup && (
                <div 
                  className="absolute bottom-3 left-3 right-3 bg-[#070B14]/95 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/40 shadow-xl flex items-center justify-between text-xs font-mono-num pointer-events-auto hover:border-emerald-400 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenCalculatorWithSetup && leadArticle.tradeSetup) {
                      onOpenCalculatorWithSetup(leadArticle.tradeSetup);
                    } else {
                      onSelectArticle(leadArticle);
                    }
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-2.5 w-2.5 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <div className="min-w-0">
                      <span className="text-emerald-400 font-bold block text-[10px] uppercase tracking-wider">
                        Active Quant Setup Spec
                      </span>
                      <span className="text-white font-extrabold truncate block">
                        {leadArticle.tradeSetup.asset} ({leadArticle.tradeSetup.direction})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded-lg border border-emerald-500/30">
                      R:R {leadArticle.tradeSetup.riskReward}
                    </span>
                    <span className="text-[10px] text-slate-400 hover:text-emerald-300 underline font-sans hidden sm:inline">
                      Simulate ↗
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Article Content & Concise Summary */}
            <div className="p-6 sm:p-7 flex flex-col justify-between flex-1 space-y-5">
              <div className="space-y-3.5">
                {/* Meta details */}
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono-num">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {leadArticle.readTime}
                  </span>
                  <span>•</span>
                  <span>{leadArticle.publishedAt}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    {leadArticle.views.toLocaleString()} reads
                  </span>
                </div>

                {/* Title */}
                <h3
                  onClick={() => onSelectArticle(leadArticle)}
                  className="text-xl sm:text-2xl font-extrabold text-white group-hover:text-amber-300 transition-colors leading-snug cursor-pointer"
                >
                  {leadArticle.title}
                </h3>

                {/* Subtitle / Description */}
                <p className="text-sm text-slate-300 leading-relaxed font-normal">
                  {leadArticle.subtitle}
                </p>

                {/* Executive Key Takeaways Pill */}
                {leadArticle.summary && leadArticle.summary.length > 0 && (
                  <div className="bg-[#070A11]/95 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono-num">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Key Quantitative Edge
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {leadArticle.summary.slice(0, 2).map((point, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2 leading-relaxed">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom Action / Author Row */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                {/* Author Card */}
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={leadAvatarSrc}
                      alt={leadArticle.author.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-full object-cover object-top border-2 border-amber-400 shadow-sm"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 bg-amber-400 text-slate-950 p-0.5 rounded-full ring-2 ring-[#0B0F19]">
                      <ShieldCheck className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-white">{leadArticle.author.name}</span>
                      {leadArticle.author.name.includes('Abu Asad') && (
                        <BlueVerifiedBadge size="sm" />
                      )}
                    </div>
                    <span className="text-xs text-amber-300/90 font-medium block">
                      {leadArticle.author.role}
                    </span>
                  </div>
                </div>

                {/* Actions: Bookmark & Read Button */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(leadArticle.id);
                    }}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isLeadBookmarked
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                        : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                    }`}
                    title={isLeadBookmarked ? 'Remove Bookmark' : 'Save for Later'}
                  >
                    <Bookmark className="w-4 h-4" fill={isLeadBookmarked ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={() => onSelectArticle(leadArticle)}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/25 group-hover:scale-[1.02] cursor-pointer"
                  >
                    <span>Read Full Research</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Secondary Featured Stack (5 Columns - Displays 3-4 Curated Studies) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono-num uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              High-Conviction Alpha Picks
            </span>
            <span className="text-[11px] text-amber-400 font-medium">
              Click to Read or Switch
            </span>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-between">
            {sideArticles.map((article, idx) => {
              const sideAvatarSrc = article.author.name.includes('Abu Asad')
                ? abuAsadAvatar
                : article.author.avatar;
              const isBookmarked = savedArticleIds.includes(article.id);

              return (
                <div
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="group relative bg-[#0D1322] hover:bg-[#111827] border border-slate-800/90 hover:border-amber-400/40 rounded-2xl p-4 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  {/* Compact High-Impact Thumbnail */}
                  <div className="relative w-full sm:w-28 h-32 sm:h-28 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800 group-hover:border-amber-400/30">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent sm:hidden"></div>
                    
                    {/* Corner Tag */}
                    <span className="absolute top-1.5 left-1.5 bg-slate-950/90 text-amber-300 text-[9px] font-mono-num font-bold px-1.5 py-0.5 rounded border border-amber-400/20">
                      #{idx + 2}
                    </span>

                    {/* Difficulty */}
                    <span className="absolute bottom-1.5 left-1.5 bg-slate-950/90 text-slate-300 text-[9px] font-mono-num px-1.5 py-0.5 rounded">
                      {article.difficulty}
                    </span>
                  </div>

                  {/* Body Info & Meta */}
                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono-num font-bold text-amber-400 uppercase tracking-wider truncate">
                        {article.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-num shrink-0">
                        {article.readTime}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                      {article.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-1 font-light">
                      {article.subtitle}
                    </p>

                    {/* Trade Setup / Alpha Pill */}
                    {article.tradeSetup && (
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono-num bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold truncate">
                          <Target className="w-3 h-3 shrink-0" />
                          {article.tradeSetup.asset}: R:R {article.tradeSetup.riskReward}
                        </span>

                        <span className="text-[11px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                          Read <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    )}

                    {/* Author mini row if no trade setup */}
                    {!article.tradeSetup && (
                      <div className="pt-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={sideAvatarSrc}
                            alt={article.author.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="text-[11px] text-slate-300 font-medium truncate">
                            {article.author.name}
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                          Read <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bookmark Button in Side Card */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(article.id);
                    }}
                    className={`absolute top-3 right-3 p-1.5 rounded-lg border transition-opacity sm:opacity-0 group-hover:opacity-100 ${
                      isBookmarked
                        ? 'opacity-100 bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-slate-900/90 text-slate-400 hover:text-white border-slate-700'
                    }`}
                    title={isBookmarked ? 'Remove Bookmark' : 'Save Article'}
                  >
                    <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Institutional Alpha Guarantee Footer Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0A0E18] via-[#0E1528] to-[#0A0E18] border border-slate-800/90 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-6 text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white">Tier-1 Institutional Frameworks</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">Mathematical Invalidation & R:R Ratios</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">Actionable Footprint & Algorithmic Code</span>
          </div>
        </div>

        <div className="text-amber-400/90 font-mono-num text-[11px] font-bold">
          SMTrading Quantitative Research Desk
        </div>
      </div>
    </section>
  );
};
