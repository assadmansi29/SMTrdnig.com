import React from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0D121F] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090D17]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{t('savedModalTitle')}</h3>
              <p className="text-xs text-slate-400">
                {savedArticles.length} {t('savedModalSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
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
                className="p-3.5 bg-[#090D17] border border-slate-800/80 hover:border-amber-400/30 rounded-xl flex items-center justify-between gap-4 group"
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
        <div className="px-6 py-3 bg-[#090D17] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            {t('savedClose')}
          </button>
        </div>
      </div>
    </div>
  );
};

