import React from 'react';
import { Article } from '../types';
import { Clock, Eye, Bookmark, ArrowRight, Sparkles, TrendingUp, ShieldCheck, Flame } from 'lucide-react';

interface HeroFeaturedArticleProps {
  article: Article;
  onSelectArticle: (article: Article) => void;
  isBookmarked: boolean;
  onToggleBookmark: (articleId: string) => void;
}

export const HeroFeaturedArticle: React.FC<HeroFeaturedArticleProps> = ({
  article,
  onSelectArticle,
  isBookmarked,
  onToggleBookmark
}) => {
  return (
    <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-[#0D1322] via-[#0E1528] to-[#0A0E1A] shadow-2xl group">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center p-6 sm:p-8 lg:p-10 relative z-10">
        {/* Left Column: Text & Strategy Meta */}
        <div className="lg:col-span-7 space-y-5">
          {/* Top badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-amber-400/20">
              <Flame className="w-3.5 h-3.5" />
              Lead Quantitative Deep-Dive
            </span>
            <span className="bg-slate-900/90 text-amber-300 text-xs font-semibold px-3 py-1 rounded-full border border-amber-400/30">
              {article.category}
            </span>
            <span className="text-xs font-mono-num text-slate-400">
              {article.readTime} • {article.publishedAt}
            </span>
          </div>

          {/* Title */}
          <h1
            onClick={() => onSelectArticle(article)}
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white group-hover:text-amber-300 transition-colors leading-tight cursor-pointer"
          >
            {article.title}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
            {article.subtitle}
          </p>

          {/* Summary Alpha Pill */}
          {article.summary[0] && (
            <div className="p-3.5 bg-[#070A10]/90 border border-slate-800 rounded-xl space-y-1 text-xs">
              <span className="text-amber-400 font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Sparkles className="w-3.5 h-3.5" /> Executive Takeaway
              </span>
              <p className="text-slate-300 leading-relaxed">{article.summary[0]}</p>
            </div>
          )}

          {/* Bottom Action / Author Row */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/40"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">{article.author.name}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-xs text-slate-400">{article.author.role}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(article.id);
                }}
                className={`p-2.5 rounded-xl border transition-colors ${
                  isBookmarked
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                }`}
                title="Save Article"
              >
                <Bookmark className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} />
              </button>

              <button
                onClick={() => onSelectArticle(article)}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 group-hover:translate-x-0.5 cursor-pointer"
              >
                <span>Read Full Research</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Cinematic Image & Setup Preview */}
        <div className="lg:col-span-5 space-y-3">
          <div 
            className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl cursor-pointer bg-slate-900 h-64 sm:h-80"
            onClick={() => onSelectArticle(article)}
          >
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090D17] via-transparent to-transparent opacity-70"></div>

            {article.tradeSetup && (
              <div className="absolute bottom-3 left-3 right-3 bg-[#0B0F19]/95 backdrop-blur-md p-3 rounded-xl border border-emerald-500/40 flex items-center justify-between text-xs font-mono-num">
                <div>
                  <span className="text-emerald-400 font-bold block text-[10px]">SMTrading Active Setup</span>
                  <span className="text-white font-bold">{article.tradeSetup.asset} ({article.tradeSetup.direction})</span>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded">
                  R:R {article.tradeSetup.riskReward}
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 text-center font-mono-num">
            {article.imageCaption}
          </p>
        </div>
      </div>
    </div>
  );
};
