import React from 'react';
import { ArticleCategory } from '../types';
import { 
  Search, 
  Bookmark, 
  Sparkles, 
  ShoppingBag,
  Crown
} from 'lucide-react';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { LanguageSelector } from './LanguageSelector';
import { TradingToolsMenu } from './TradingToolsMenu';
import { useTranslation } from '../context/LanguageContext';
import { TranslationKey } from '../locales';
import { useAuth } from '../context/AuthContext';

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
  onOpenProfile: () => void;
  onOpenAdmin: () => void;
}

const CATEGORIES: ArticleCategory[] = [
  'All',
  'Trade Now',
  'BookMap',
  'LIVE Trade',
  'VIP Signals',
  'Support'
];

const CATEGORY_KEYS: Record<ArticleCategory, TranslationKey> = {
  'All': 'catAll',
  'Macro & Liquidity': 'catMacro',
  'Order Flow & Price Action': 'catOrderFlow',
  'Trade Now': 'catQuant',
  'BookMap': 'catBookMap',
  'LIVE Trade': 'catOptions',
  'VIP Signals': 'catVipSignals',
  'Support': 'catRisk'
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
  onOpenECommerce,
  onOpenProfile,
  onOpenAdmin
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="relative bg-[#0B0F17] border-b border-slate-800">
      {/* 1. Main Top Branding & Central Control Head */}
      <div className="border-b border-slate-800/80 bg-[#0B0F17]/95 backdrop-blur-md sticky top-0 z-40 w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3">
          
          {/* Main Flex Row: Left Brand Logo, Central Head Controls, Mobile Right Controls */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
            
            {/* Left: Brand Identity Logo */}
            <div className="flex items-center min-w-0 shrink-0">
              <button 
                onClick={() => onSelectCategory('All')}
                className="flex items-center gap-2 sm:gap-3 text-left ltr:text-left rtl:text-right group focus:outline-none cursor-pointer"
              >
                {/* Monogram Badge */}
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-[1px] shadow-lg shadow-amber-500/10 shrink-0">
                  <div className="w-full h-full bg-[#0E131F] rounded-[11px] flex items-center justify-center relative overflow-hidden group-hover:bg-[#131a2a] transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-transparent opacity-50"></div>
                    <span className="font-bold text-base sm:text-lg tracking-tighter bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent font-mono-num">
                      SM
                    </span>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-black text-base sm:text-lg md:text-xl tracking-tight text-white group-hover:text-amber-300 transition-colors shrink-0">
                      {t('brandTitle')}<span className="text-amber-400">.pro</span>
                    </span>
                    <div className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-600/20 text-amber-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-400/35 shadow-xs backdrop-blur-sm tracking-wide shrink-0">
                      <span className="hidden xs:inline">{t('brandBy')}</span>
                      <BlueVerifiedBadge size="sm" />
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Central Head: Search, Language, Admin Desk, Profile & Trading Tools Hub */}
            <div className="hidden md:flex flex-1 items-center justify-center px-1 lg:px-3">
              <div className="flex items-center gap-1.5 lg:gap-2 bg-slate-950/80 border border-slate-800/90 rounded-2xl px-3 py-1.5 shadow-xl shadow-black/50 backdrop-blur-md">
                
                {/* 1. Search Alpha Button */}
                <button
                  onClick={onOpenSearchModal}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all text-xs font-medium cursor-pointer whitespace-nowrap shadow-xs"
                  title={t('navSearchPlaceholder')}
                >
                  <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden xl:inline text-slate-300">{t('navSearchPlaceholder')}</span>
                  <kbd className="bg-slate-800 text-[10px] text-amber-300 px-1.5 py-0.5 rounded border border-slate-700 font-mono-num leading-none">
                    ⌘K
                  </kbd>
                </button>

                {/* 2. Languages Selector */}
                <div className="w-[82px] shrink-0">
                  <LanguageSelector />
                </div>

                <div className="h-4 w-px bg-slate-800 mx-0.5" />

                {/* 3. Master Admin Desk Button (When Admin) */}
                {user && user.role === 'admin' && (
                  <button
                    onClick={onOpenAdmin}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/25 via-amber-500/15 to-amber-600/20 hover:from-amber-500/35 hover:to-amber-600/30 border border-amber-400/70 text-amber-300 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-amber-500/15 shrink-0"
                    title="Master Admin Management Desk"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Admin Desk</span>
                  </button>
                )}

                {/* 4. User Profile Button */}
                {user && (
                  <button
                    onClick={onOpenProfile}
                    className="flex items-center gap-2 bg-slate-900/95 hover:bg-slate-850 text-slate-200 border border-slate-700/90 hover:border-amber-400/60 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group shrink-0 shadow-xs"
                    title="View Profile & Account Settings"
                  >
                    <img
                      src={user.avatarUrl || (user.role === 'admin' ? '/abu_asad_almansi.jpg' : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`)}
                      alt={user.username}
                      className="w-5 h-5 rounded-md object-cover bg-slate-800 shrink-0 border border-slate-700 group-hover:border-amber-400/60 transition-colors"
                    />
                    <div className="text-left hidden lg:block">
                      <div className="text-[11px] font-bold text-white group-hover:text-amber-300 leading-tight truncate max-w-[100px]">
                        @{user.username}
                      </div>
                      <div className="text-[9px] font-mono text-emerald-400 font-bold leading-none">
                        ${user.balance.toFixed(2)}
                      </div>
                    </div>
                  </button>
                )}

                <div className="h-4 w-px bg-slate-800 mx-0.5" />

                {/* 5. Tools Dropdown */}
                <TradingToolsMenu
                  onOpenChart={onOpenChart}
                  onOpenCalculator={onOpenCalculator}
                  onOpenCalendar={onOpenCalendar}
                />

                {/* 6. E-Commerce Store */}
                <button
                  onClick={onOpenECommerce}
                  className="flex items-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 px-2 py-1 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
                  title={t('navEcommerceTitle')}
                >
                  <ShoppingBag className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="hidden xl:inline">{t('navEcommerce')}</span>
                </button>

                {/* 7. Bookmarks Drawer Trigger */}
                <button
                  onClick={onOpenSavedModal}
                  className="relative p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer shrink-0"
                  title={t('navSavedArticlesTitle')}
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                  {savedArticlesCount > 0 && (
                    <span className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto bg-amber-500 text-slate-950 font-mono-num font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md">
                      {savedArticlesCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Top Right Utilities (< md) */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              {user && user.role === 'admin' && (
                <button
                  onClick={onOpenAdmin}
                  className="p-1.5 bg-amber-500/20 border border-amber-400/60 text-amber-300 rounded-lg text-xs font-bold cursor-pointer"
                  title="Admin Desk"
                >
                  <Crown className="w-4 h-4 text-amber-400" />
                </button>
              )}

              {user && (
                <button
                  onClick={onOpenProfile}
                  className="p-1 rounded-lg border border-slate-700 bg-slate-900 cursor-pointer"
                  title="Profile"
                >
                  <img
                    src={user.avatarUrl || (user.role === 'admin' ? '/abu_asad_almansi.jpg' : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`)}
                    alt={user.username}
                    className="w-6 h-6 rounded-md object-cover bg-slate-800"
                  />
                </button>
              )}

              <button
                onClick={onOpenSavedModal}
                className="relative p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer shrink-0"
                title={t('navSavedArticlesTitle')}
              >
                <Bookmark className="w-4 h-4 text-amber-400" />
                {savedArticlesCount > 0 && (
                  <span className="absolute -top-1 -right-1 rtl:-left-1 rtl:right-auto bg-amber-400 text-slate-950 font-mono-num font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm leading-none">
                    {savedArticlesCount}
                  </span>
                )}
              </button>

              <div className="w-[68px] shrink-0">
                <LanguageSelector />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Quick Action Strip (< md) */}
        <div className="md:hidden border-t border-slate-800/80 bg-[#090D14]/95 px-2.5 sm:px-4 py-2 flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={onOpenSearchModal}
            className="flex-1 flex items-center justify-center gap-1 bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer shrink-0"
          >
            <Search className="w-3 h-3 text-amber-400" />
            <span>Search</span>
          </button>

          <div className="flex-1 min-w-[90px]">
            <TradingToolsMenu
              onOpenChart={onOpenChart}
              onOpenCalculator={onOpenCalculator}
              onOpenCalendar={onOpenCalendar}
              compact={true}
            />
          </div>

          <button
            onClick={onOpenECommerce}
            className="flex-1 flex items-center justify-center gap-1 bg-[#0E1726] hover:bg-[#132035] text-emerald-300 border border-emerald-500/30 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0"
          >
            <ShoppingBag className="w-3 h-3 text-emerald-400" />
            <span>{t('navEcommerce')}</span>
          </button>

          <button
            onClick={onOpenNewsletter}
            className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 shadow-xs"
          >
            <Sparkles className="w-3 h-3 text-slate-950" />
            <span>{t('navVipAlphaShort')}</span>
          </button>
        </div>
      </div>

      {/* 2. Institutional Tagline Bar with VIP Button on Left */}
      <div className="bg-[#080C13] border-b border-slate-800/60 py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-2.5 text-center text-xs">
          {/* VIP Button on the left side */}
          <button
            onClick={onOpenNewsletter}
            className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs transition-all shadow-md shadow-amber-500/20 hover:scale-105 cursor-pointer whitespace-nowrap shrink-0"
            title={t('navVipAlphaTitle')}
          >
            <Sparkles className="w-3 h-3 text-slate-950 shrink-0" />
            <span>{t('navVipAlpha')}</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/80 border border-slate-800/80 px-2.5 sm:px-3 py-0.5 rounded-full shadow-inner truncate">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px] shrink-0">
              {t('brandSubtitle')}
            </span>
            <span className="text-slate-600 shrink-0">•</span>
            <span className="text-slate-300 font-medium text-[10px] sm:text-[11px] tracking-wide truncate">
              {t('brandTagline')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Category Navigation Bar - Centered across all screens */}
      <div className="bg-[#090D14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar py-2.5">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              const label = t(CATEGORY_KEYS[cat]);
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-bold scale-[1.02]'
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
