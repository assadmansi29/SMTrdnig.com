import React from 'react';
import { Article } from '../types';
import { Clock, Eye, Bookmark, Share2, TrendingUp, Sparkles, User, ArrowUpRight } from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { useAbuAsadAvatar } from '../context/AvatarContext';
import { useTranslation, getLocalizedCategory, getLocalizedDifficulty, getLocalizedDirection } from '../locales';

interface ArticleCardProps {
  article: Article;
  onSelectArticle: (article: Article) => void;
  isBookmarked: boolean;
  onToggleBookmark: (articleId: string) => void;
  onShare: (article: Article) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onSelectArticle,
  isBookmarked,
  onToggleBookmark,
  onShare
}) => {
  const { abuAsadAvatar } = useAbuAsadAvatar();
  const { t, isRTL } = useTranslation();
  const avatarSrc = article.author.name.includes('Abu Asad') ? abuAsadAvatar : article.author.avatar;

  return (
    <article className="group bg-[#0D1322] border border-slate-800/80 hover:border-amber-400/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/5 flex flex-col h-full">
      {/* Image Container */}
      <div 
        className="relative h-52 sm:h-56 overflow-hidden cursor-pointer bg-slate-900"
        onClick={() => onSelectArticle(article)}
      >
        <img
          src={article.image}
          alt={article.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1322] via-transparent to-transparent opacity-80"></div>

        {/* Category & Difficulty Badges */}
        <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 flex items-center gap-2">
          <span className="bg-[#0B0F17]/90 backdrop-blur-md text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-md border border-amber-400/30 shadow-sm">
            {getLocalizedCategory(article.category, t)}
          </span>
          <span
            className={`text-[10px] font-mono-num font-bold px-2 py-0.5 rounded backdrop-blur-md uppercase tracking-wider ${
              article.difficulty === 'Institutional'
                ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                : article.difficulty === 'Intermediate'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {getLocalizedDifficulty(article.difficulty, t)}
          </span>
        </div>

        {/* Quick Action Buttons on Image */}
        <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3 flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(article.id);
            }}
            className={`p-2 rounded-lg backdrop-blur-md border transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                : 'bg-black/60 text-slate-300 hover:text-white border-slate-700/60 hover:bg-black/80'
            }`}
            title={isBookmarked ? t('featuredRemoveBookmark') : t('featuredSaveBookmark')}
          >
            <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Trade Setup Indicator pill if present */}
        {article.tradeSetup && (
          <div className="absolute bottom-3 left-3 rtl:left-auto rtl:right-3 flex items-center gap-1.5 bg-[#0B0F17]/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-emerald-500/40 text-[11px] font-mono-num text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{t('featuredSetupTitle')}: {article.tradeSetup.asset} ({getLocalizedDirection(article.tradeSetup.direction, t)})</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono-num">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {article.readTime}
            </span>
            <span>{article.publishedAt}</span>
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelectArticle(article)}
            className="font-bold text-lg text-white group-hover:text-amber-300 transition-colors leading-snug cursor-pointer line-clamp-2"
          >
            {article.title}
          </h3>

          {/* Subtitle / Excerpt */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {article.subtitle}
          </p>

          {/* Key Summary Bullet */}
          {article.summary[0] && (
            <div className="bg-[#090D17] border border-slate-800/80 rounded-lg p-2.5 text-[11px] text-slate-300">
              <div className="text-amber-400 font-semibold mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {t('cardKeyAlpha')}
              </div>
              <p className="text-slate-400 line-clamp-1">{article.summary[0]}</p>
            </div>
          )}
        </div>

        {/* Footer: Author & Read CTA */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={avatarSrc}
              alt={article.author.name}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover object-top border border-slate-700"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-200 block leading-tight truncate">
                  {article.author.name}
                </span>
                {article.author.name.includes('Abu Asad') && (
                  <BlueVerifiedBadge size="xs" />
                )}
              </div>
              <span className="text-[10px] text-amber-400/90 block leading-tight truncate font-mono-num">
                {article.author.role.includes('Founder') ? 'Founder / SMC Lead' : article.author.role}
              </span>
            </div>
          </div>

          <button
            onClick={() => onSelectArticle(article)}
            className="text-xs font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-all cursor-pointer"
          >
            {t('cardReadAnalysis')}
            <ArrowUpRight className={`w-3.5 h-3.5 ${isRTL ? 'rotate-[-90deg]' : ''}`} />
          </button>
        </div>
      </div>
    </article>
  );
};

