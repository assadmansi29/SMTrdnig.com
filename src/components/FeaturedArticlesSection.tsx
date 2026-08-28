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
  Zap, 
  CheckCircle
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { useAbuAsadAvatar } from '../context/AvatarContext';
import { useTranslation, getLocalizedCategory, getLocalizedDifficulty, getLocalizedDirection } from '../locales';

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
  const { t, isRTL } = useTranslation();

  // Pick top 4-5 high impact featured articles
  const featuredArticles = React.useMemo(() => {
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

  if (!leadArticle) return null;

  const leadAvatarSrc = leadArticle.author.name.includes('Abu Asad') 
    ? abuAsadAvatar 
    : leadArticle.author.avatar;

  const isLeadBookmarked = savedArticleIds.includes(leadArticle.id);

  return (
    <section aria-label="Featured Research Desk" className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-amber-400/15 to-transparent text-amber-300 text-[11px] font-mono-num font-bold px-3 py-1 rounded-full border border-amber-400/30 uppercase tracking-widest shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {t('featuredBadge')}
            </span>
            <span className="text-xs text-slate-400 font-mono-num hidden sm:inline">
              • {featuredArticles.length} {t('featuredCountSubtitle')}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t('featuredHeading')}
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl">
            {t('featuredDescription')}
          </p>
        </div>

        {/* Quick Spotlight Selector Chips */}
        <div className="flex items-center gap-1.5 bg-[#090D17] p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono-num text-slate-400 px-2 uppercase font-bold hidden md:inline">
            {t('featuredSpotlight')}
          </span>
          {featuredArticles.map((art, idx) => (
            <button
              key={art.id}
              onClick={() => setActiveSpotlightId(art.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono-num transition-all flex items-center gap-1 cursor-pointer ${
                leadArticle.id === art.id
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
              title={art.title}
            >
              <span>#{idx + 1}</span>
              <span className="hidden lg:inline text-[11px] max-w-[90px] truncate">
                {getLocalizedCategory(art.category, t).split('&')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Hero Lead Card - Expanded Full-Width Layout */}
      <div className="relative rounded-3xl overflow-hidden border border-amber-500/35 bg-gradient-to-br from-[#0D1322] via-[#0E162B] to-[#0A0F1D] shadow-2xl group transition-all duration-300 hover:border-amber-400/60 hover:shadow-amber-500/10">
        {/* Ambient Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Thumbnail Header with Live Setup Overlay (5 cols on lg) */}
          <div 
            className="lg:col-span-5 relative min-h-[260px] sm:min-h-[320px] lg:min-h-full overflow-hidden cursor-pointer bg-slate-900 shrink-0"
            onClick={() => onSelectArticle(leadArticle)}
          >
            <img
              src={leadArticle.image}
              alt={leadArticle.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D1322] via-[#0D1322]/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#0D1322]/80"></div>

            {/* Floating Badges */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
              <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
                <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-400/20">
                  <Flame className="w-3.5 h-3.5 fill-slate-950" />
                  {t('featuredLeadTag')}
                </span>
                <span className="bg-[#090D17]/90 backdrop-blur-md text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-400/30">
                  {getLocalizedCategory(leadArticle.category, t)}
                </span>
              </div>

              <span className="bg-slate-950/80 backdrop-blur-md text-slate-200 text-xs font-mono-num px-2.5 py-1 rounded-full border border-slate-700/80 pointer-events-auto">
                {getLocalizedDifficulty(leadArticle.difficulty, t)}
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
                      {t('featuredSetupTitle')}
                    </span>
                    <span className="text-white font-extrabold truncate block">
                      {leadArticle.tradeSetup.asset} ({getLocalizedDirection(leadArticle.tradeSetup.direction, t)})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded-lg border border-emerald-500/30">
                    R:R {leadArticle.tradeSetup.riskReward}
                  </span>
                  <span className="text-[10px] text-slate-400 hover:text-emerald-300 underline font-sans hidden sm:inline">
                    {t('deskSimulate')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Article Content & Concise Summary (7 cols on lg) */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
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
                  {leadArticle.views.toLocaleString()} {t('modalViews')}
                </span>
              </div>

              {/* Title */}
              <h3
                onClick={() => onSelectArticle(leadArticle)}
                className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white group-hover:text-amber-300 transition-colors leading-snug cursor-pointer"
              >
                {leadArticle.title}
              </h3>

              {/* Subtitle / Description */}
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                {leadArticle.subtitle}
              </p>

              {/* Executive Key Takeaways Pill */}
              {leadArticle.summary && leadArticle.summary.length > 0 && (
                <div className="bg-[#070A11]/95 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono-num">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    {t('featuredTakeawaysTitle')}
                  </span>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                    {leadArticle.summary.slice(0, 2).map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Action / Author Row */}
            <div className="pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              {/* Author Card */}
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <img
                    src={leadAvatarSrc}
                    alt={leadArticle.author.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-full object-cover object-top border-2 border-amber-400 shadow-sm"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 rtl:-left-0.5 rtl:right-auto bg-amber-400 text-slate-950 p-0.5 rounded-full ring-2 ring-[#0B0F19]">
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
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isLeadBookmarked
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20'
                      : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                  title={isLeadBookmarked ? t('featuredRemoveBookmark') : t('featuredSaveBookmark')}
                >
                  <Bookmark className="w-4 h-4" fill={isLeadBookmarked ? 'currentColor' : 'none'} />
                </button>

                <button
                  onClick={() => onSelectArticle(leadArticle)}
                  className="flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold px-6 py-3 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/25 group-hover:scale-[1.02] cursor-pointer"
                >
                  <span>{t('featuredReadAnalysis')}</span>
                  <ArrowRight className={`w-4 h-4 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
