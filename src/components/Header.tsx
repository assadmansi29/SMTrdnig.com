import React from 'react';
import { ArticleCategory } from '../types';
import { 
  Search, 
  Bookmark, 
  Sparkles, 
  ShoppingBag 
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { LanguageSelector } from './LanguageSelector';
import { TradingToolsMenu } from './TradingToolsMenu';
import { useTranslation } from '../context/LanguageContext';
import { TranslationKey } from '../locales';

interface HeaderProps {
  activeCategory: ArticleCategory;
  onSelectCategory: (category: ArticleCategory) => void;
  savedArticlesCount: number;
  onOpenSavedModal: () => void;
  onOpenSearchModal: () => void;
  onOpenCalculator: () => void;
  onOpenCalendar: () => void;
  onOpenChart: () => void;
  onOpenNewsletter: () => void;
  onOpenECommerce: () => void;
}

const CATEGORIES: ArticleCategory[] = [
  'All',
  'Algorithmic & Quant',
  'FX & Commodities',
  'Options & Derivatives',
  'Risk & Psychology'
];

const CATEGORY_KEYS: Record<ArticleCategory, TranslationKey> = {
  'All': 'catAll',
  'Macro & Liquidity': 'catMacro',
  'Order Flow & Price Action': 'catOrderFlow',
  'Algorithmic & Quant': 'catQuant',
  'FX & Commodities': 'catFX',
  'Options & Derivatives': 'catOptions',
  'Risk & Psychology': 'catRisk'
};

export const Header: React.FC<HeaderProps> = ({
  activeCategory,
  onSelectCategory,
  savedArticlesCount,
  onOpenSavedModal,
  onOpenSearchModal,
  onOpenCalculator,
  onOpenCalendar,
  onOpenChart,
  onOpenNewsletter,
  onOpenECommerce
}) => {
  const { t } = useTranslation();

  return (
    <header className="relative bg-[#0B0F17] border-b border-slate-800">
      {/* 1. Top Branding Bar */}
      <div className="border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <button 
              onClick={() => onSelectCategory('All')}
              className="flex items-center gap-2.5 sm:gap-3 text-left ltr:text-left rtl:text-right group focus:outline-none cursor-pointer"
            >
              {/* Custom High-Tech Monogram Badge */}
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-[1px] shadow-lg shadow-amber-500/10 shrink-0">
                <div className="w-full h-full bg-[#0E131F] rounded-[11px] flex items-center justify-center relative overflow-hidden group-hover:bg-[#131a2a] transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent opacity-50"></div>
                  <span className="font-bold text-lg tracking-tighter bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent font-mono-num">
                    SM
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-black text-xl sm:text-2xl tracking-tight text-white group-hover:text-amber-300 transition-colors flex items-center">
                    {t('brandTitle')}<span className="text-amber-400">.pro</span>
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-600/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/35 shadow-sm backdrop-blur-sm tracking-wide">
                    <span>{t('brandBy')}</span>
                    <BlueVerifiedBadge size="sm" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <span className="text-slate-200 font-semibold tracking-wider text-[10px] uppercase bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                    {t('brandSubtitle')}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 hidden sm:inline">{t('brandTagline')}</span>
                </div>
              </div>
            </button>
          </div>

          {/* Action Controls & Utilities */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 1. CTA Group: E-Commerce on top, VIP Alpha Dispatch directly under */}
            <div className="flex flex-col gap-1 shrink-0">
              {/* E-Commerce Store Navigation Button */}
              <button
                onClick={onOpenECommerce}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-950/80 via-[#0C1524] to-[#0E1B2E] hover:from-emerald-900 hover:to-[#13233D] text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 hover:border-emerald-400/80 px-2.5 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-all shadow-sm shadow-emerald-500/10 cursor-pointer whitespace-nowrap group"
                title={t('navEcommerceTitle')}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                <span>{t('navEcommerce')}</span>
              </button>

              {/* Newsletter Subscribe CTA */}
              <button
                onClick={onOpenNewsletter}
                className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-2.5 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer whitespace-nowrap"
                title={t('navVipAlphaTitle')}
              >
                <Sparkles className="w-3 h-3 text-slate-950 shrink-0" />
                <span className="inline sm:hidden">{t('navVipAlphaShort')}</span>
                <span className="hidden sm:inline">{t('navVipAlpha')}</span>
              </button>
            </div>

            {/* 2. Languages & Search Group: Languages directly above Search button */}
            <div className="flex flex-col gap-1 shrink-0">
              {/* Languages Button */}
              <LanguageSelector />

              {/* Quick Search Button */}
              <button
                onClick={onOpenSearchModal}
                className="flex items-center justify-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 px-2.5 sm:px-3 py-1 rounded-md border border-slate-800 transition-all text-[11px] sm:text-xs font-medium cursor-pointer whitespace-nowrap"
                title={t('navSearchPlaceholder')}
              >
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden sm:inline">{t('navSearchPlaceholder')}</span>
                <kbd className="hidden md:inline-block bg-slate-800 text-[9px] text-slate-400 px-1 py-0.2 rounded border border-slate-700 font-mono-num">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* 3. Consolidated Trading Tools Button (TradingView Studio, Risk Calculator & Calendar) */}
            <div className="flex items-center shrink-0 border-l rtl:border-l-0 rtl:border-r border-slate-800 pl-2 rtl:pl-0 rtl:pr-2">
              <TradingToolsMenu
                onOpenChart={onOpenChart}
                onOpenCalculator={onOpenCalculator}
                onOpenCalendar={onOpenCalendar}
              />
            </div>

            {/* Bookmarks Drawer Trigger */}
            <button
              onClick={onOpenSavedModal}
              className="relative p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-colors cursor-pointer shrink-0 self-center"
              title={t('navSavedArticlesTitle')}
            >
              <Bookmark className="w-4 h-4" />
              {savedArticlesCount > 0 && (
                <span className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto bg-amber-500 text-slate-950 font-mono-num font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                  {savedArticlesCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Category Navigation Bar */}
      <div className="bg-[#090D14] border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-2">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              const label = t(CATEGORY_KEYS[cat]);
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};


