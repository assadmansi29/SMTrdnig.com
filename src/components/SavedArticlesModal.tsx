import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Bookmark, Trash2, ArrowRight, BookOpen } from 'lucide-react';
import { Article } from '../types';
import { useTranslation, getLocalizedCategory } from '../locales';

interface SavedArticlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedArticles: Article[];
  onSelectArticle: (article: Article) => void;
  onRemoveBookmark: (articleId: string) => void;
}

export const SavedArticlesModal: React.FC<SavedArticlesModalProps> = ({
  isOpen,
  onClose,
  savedArticles,
  onSelectArticle,
  onRemoveBookmark
}) => {
  const { t, isRTL } = useTranslation();

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

  const content = (
    <div
      id="modal-saved-articles"
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0C111C] border-t sm:border border-slate-700/90 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black p-5 sm:p-6 space-y-4 max-h-[88vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-200 text-slate-200"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Handle Bar on mobile */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Bookmark className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base text-white truncate">{t('savedModalTitle')}</h3>
              <p className="text-xs text-slate-400 truncate">
                {savedArticles.length} {t('savedModalSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Close saved articles"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
          {savedArticles.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">{t('savedEmptyTitle')}</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t('savedEmptySubtitle')}
              </p>
            </div>
          ) : (
            savedArticles.map((art) => (
              <div
                key={art.id}
                className="p-3 bg-[#090D17] border border-slate-800/80 hover:border-amber-400/30 rounded-xl flex items-center justify-between gap-3 group"
              >
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                  onClick={() => {
                    onSelectArticle(art);
                    onClose();
                  }}
                >
                  <img
                    src={art.image}
                    alt={art.title}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] text-amber-400 font-semibold">{getLocalizedCategory(art.category, t)}</span>
                    <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                      {art.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono-num">{art.readTime}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectArticle(art);
                      onClose();
                    }}
                    className="p-2 text-xs font-semibold text-amber-400 hover:text-white bg-slate-900 rounded-lg border border-slate-800 cursor-pointer"
                    title={t('savedReadNow')}
                  >
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveBookmark(art.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                    title={t('savedRemove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            {t('savedClose')}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
};

