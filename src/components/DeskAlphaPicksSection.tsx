import React from 'react';
import { Article, TradeSetup } from '../types';
import { 
  TrendingUp, 
  Target, 
  ArrowRight, 
  Bookmark, 
  ShieldCheck, 
  Zap, 
  Clock,
  Sparkles
} from 'lucide-react';
import { useAbuAsadAvatar } from '../context/AvatarContext';
import { useTranslation } from '../context/LanguageContext';

interface DeskAlphaPicksSectionProps {
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  savedArticleIds: string[];
  onToggleBookmark: (articleId: string) => void;
  onOpenCalculatorWithSetup?: (setup: TradeSetup) => void;
}

export const DeskAlphaPicksSection: React.FC<DeskAlphaPicksSectionProps> = ({
  articles,
  onSelectArticle,
  savedArticleIds,
  onToggleBookmark,
  onOpenCalculatorWithSetup
}) => {
  const { abuAsadAvatar } = useAbuAsadAvatar();
  const { t, isRTL } = useTranslation();

  // Curate top high-impact alpha picks (excluding lead or showing top 4 curated)
  const deskPicks = React.useMemo(() => {
    const picks = articles.filter(a => a.featured || a.trending || a.editorPick);
    if (picks.length > 1) {
      return picks.slice(1, 5);
    }
    return articles.slice(1, 5);
  }, [articles]);

  if (deskPicks.length === 0) return null;

  return (
    <section aria-label="Desk Alpha Picks" className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
              <span>{t('featuredSideDesk')}</span>
              <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 text-[10px] font-mono-num font-bold px-2 py-0.5 rounded border border-amber-400/30 uppercase">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {t('featuredEditorChoice')}
              </span>
            </h3>
          </div>
        </div>

        <span className="text-xs text-slate-400 font-mono-num hidden sm:inline">
          {deskPicks.length} {t('featuredCountSubtitle')}
        </span>
      </div>

      {/* Grid of Desk Alpha Picks (4 Columns on large screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {deskPicks.map((article, idx) => {
          const sideAvatarSrc = article.author.name.includes('Abu Asad')
            ? abuAsadAvatar
            : article.author.avatar;
          const isBookmarked = savedArticleIds.includes(article.id);

          return (
            <div
              key={article.id}
              onClick={() => onSelectArticle(article)}
              className="group relative bg-[#0D1322] hover:bg-[#111827] border border-slate-800/90 hover:border-amber-400/50 rounded-2xl p-4 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-amber-500/5 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Thumbnail */}
                <div className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800 group-hover:border-amber-400/30">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                  {/* Corner Index Tag */}
                  <span className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-slate-950/90 text-amber-300 text-[10px] font-mono-num font-bold px-2 py-0.5 rounded-md border border-amber-400/25 backdrop-blur-sm">
                    #{idx + 1}
                  </span>

                  {/* Difficulty */}
                  <span className="absolute bottom-2 left-2 rtl:left-auto rtl:right-2 bg-slate-950/90 text-slate-200 text-[10px] font-mono-num px-2 py-0.5 rounded-md border border-slate-800 backdrop-blur-sm">
                    {article.difficulty}
                  </span>

                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(article.id);
                    }}
                    className={`absolute top-2 right-2 rtl:right-auto rtl:left-2 p-1.5 rounded-lg border transition-all cursor-pointer backdrop-blur-sm ${
                      isBookmarked
                        ? 'opacity-100 bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-700/80'
                    }`}
                    title={isBookmarked ? t('featuredRemoveBookmark') : t('featuredSaveBookmark')}
                  >
                    <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Meta & Category */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono-num">
                    <span className="font-bold text-amber-400 uppercase tracking-wider truncate">
                      {article.category}
                    </span>
                    <span className="text-slate-400 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {article.readTime}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                    {article.title}
                  </h4>

                  {/* Subtitle */}
                  <p className="text-xs text-slate-400 line-clamp-2 font-light leading-relaxed">
                    {article.subtitle}
                  </p>
                </div>
              </div>

              {/* Bottom Trade Setup or Author row */}
              <div className="pt-3 mt-3 border-t border-slate-800/80">
                {article.tradeSetup ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono-num bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 font-bold truncate">
                      <Target className="w-3 h-3 shrink-0" />
                      {article.tradeSetup.asset}: R:R {article.tradeSetup.riskReward}
                    </span>

                    <span className="text-[11px] font-bold text-amber-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                      {t('cardReadAnalysis')} <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={sideAvatarSrc}
                        alt={article.author.name}
                        className="w-4 h-4 rounded-full object-cover shrink-0"
                      />
                      <span className="text-[11px] text-slate-300 font-medium truncate">
                        {article.author.name}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-amber-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform flex items-center gap-0.5 shrink-0">
                      {t('cardReadAnalysis')} <ArrowRight className={`w-3 h-3 ${isRTL ? 'rotate-180' : ''}`} />
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
          SMTrading.pro Quantitative Research Desk
        </div>
      </div>
    </section>
  );
};
