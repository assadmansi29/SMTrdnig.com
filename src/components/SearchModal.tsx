import React, { useState } from 'react';
import { X, Search, Clock, ArrowRight, Tag, Sparkles } from 'lucide-react';
import { Article } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  onSelectArticle: (article: Article) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  articles,
  onSelectArticle
}) => {
  const { t, isRTL } = useTranslation();
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filteredArticles = articles.filter((a) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.subtitle.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q)) ||
      a.author.name.toLowerCase().includes(q) ||
      a.summary.some(s => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0D121F] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Search Input Bar */}
        <div className="relative p-4 border-b border-slate-800 bg-[#090D17] flex items-center gap-3">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={t('searchModalPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggested Filters */}
        <div className="px-5 py-2.5 bg-[#0A0E18] border-b border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-500" /> {t('searchHotTopics')}:
          </span>
          {['Order Flow', 'Macro Liquidity', 'Python StatArb', 'Gold XAU/USD', '0DTE Gamma', 'Psychology'].map(tag => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-800 text-[11px] transition-colors cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {filteredArticles.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              {t('searchNoResults')} "{query}".
            </div>
          ) : (
            filteredArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => {
                  onSelectArticle(art);
                  onClose();
                }}
                className="p-3.5 bg-[#090D17] hover:bg-slate-800/60 border border-slate-800/80 hover:border-amber-400/40 rounded-xl cursor-pointer transition-all flex items-start gap-4 group"
              >
                <img
                  src={art.image}
                  alt={art.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-lg object-cover border border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-400 font-semibold">{art.category}</span>
                    <span className="text-[10px] text-slate-500 font-mono-num">• {art.readTime}</span>
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                    {art.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-1">{art.subtitle}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 rtl:rotate-180 transition-all shrink-0 mt-2" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

