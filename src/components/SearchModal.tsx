import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Clock, ArrowRight, Tag, Sparkles } from 'lucide-react';
import { Article } from '../types';
import { useTranslation, getLocalizedCategory } from '../locales';

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

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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

  const content = (
    <div
      id="modal-search"
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0C111C] border-t sm:border border-slate-700/90 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black p-5 sm:p-6 space-y-4 max-h-[88vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-200 text-slate-200"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Handle Bar on mobile */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden mb-2" />

        {/* Search Input Bar */}
        <div className="relative px-3.5 py-3 sm:p-4 border-b border-slate-800 bg-[#090D17] rounded-xl flex items-center gap-3 shrink-0">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={t('searchModalPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-500 focus:outline-none min-w-0"
          />
          <button
            type="button"
            onClick={onClose}
            className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggested Filters */}
        <div className="px-3 py-2 bg-[#0A0E18] rounded-lg border border-slate-800/80 flex flex-wrap items-center gap-2 text-xs shrink-0">
          <span className="text-slate-400 flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-500" /> {t('searchHotTopics')}:
          </span>
          {['Order Flow', 'Macro Liquidity', 'Python StatArb', 'Gold XAU/USD', '0DTE Gamma', 'Psychology'].map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => setQuery(tag)}
              className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-800 text-[11px] transition-colors cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
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
                    <span className="text-[10px] text-amber-400 font-semibold">{getLocalizedCategory(art.category, t)}</span>
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

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
};

