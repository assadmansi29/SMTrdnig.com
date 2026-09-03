import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ChevronDown, Check, X } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { LanguageCode } from '../locales';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, availableLanguages, currentLanguage, isRTL } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen for optimal touch UX
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close dropdown on outside click/touch on desktop & mobile
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      // Do not close if clicking inside the dropdown button or desktop menu
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      // Do not close if clicking inside the mobile drawer content
      if (drawerRef.current && drawerRef.current.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown, { passive: true });
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  // Mobile Bottom Sheet Modal (rendered into document.body to avoid clipping / overflow bugs on mobile)
  const mobileDrawer = isMobile && isOpen && typeof document !== 'undefined' ? (
    <div
      id="mobile-language-drawer-overlay"
      className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex flex-col justify-end p-0 animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        ref={drawerRef}
        className="w-full bg-[#0D121F] border-t border-slate-700/90 rounded-t-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-200"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Globe className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white truncate">Select Language / اختر اللغة</h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">SMTrading International Desk</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            onTouchEnd={(e) => {
              e.preventDefault();
              setIsOpen(false);
            }}
            className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Close language selector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Options Grid */}
        <div className="space-y-2 py-1">
          {availableLanguages.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSelect(lang.code);
                }}
                className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer min-h-[52px] ${
                  isSelected
                    ? 'bg-amber-400/15 border-amber-400 text-amber-300 shadow-md shadow-amber-400/10'
                    : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 text-slate-200 active:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none shrink-0">{lang.flag}</span>
                  <div className="text-start">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{lang.nativeName}</span>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-normal">
                        ({lang.code})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{lang.name}</div>
                  </div>
                </div>

                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-slate-700 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative inline-block w-full text-start" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="language-selector-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select language"
        className="w-full flex items-center justify-between gap-1 sm:gap-1.5 px-2 py-1 bg-[#090D17] hover:bg-slate-800 text-slate-200 hover:text-amber-400 border border-slate-700/80 hover:border-amber-400/40 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer whitespace-nowrap min-h-[30px]"
      >
        <span className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <span className="text-sm leading-none shrink-0">{currentLanguage.flag}</span>
          <span className="font-mono uppercase font-bold tracking-wider text-[11px] truncate">
            {currentLanguage.code}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Desktop Floating Dropdown Menu (hidden on mobile, uses Portal on mobile instead) */}
      {!isMobile && isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-selector-btn"
          className="absolute right-0 rtl:right-auto rtl:left-0 mt-1.5 w-52 rounded-xl bg-[#0D121F] border border-slate-700/90 shadow-2xl shadow-black/95 backdrop-blur-xl py-1.5 z-[9999] animate-fadeIn divide-y divide-slate-800/60 focus:outline-none"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-amber-400" />
              Language / اللغة
            </span>
          </div>

          <div className="py-1">
            {availableLanguages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  role="menuitem"
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400/15 text-amber-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none shrink-0">{lang.flag}</span>
                    <span className="truncate">{lang.nativeName}</span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">({lang.code})</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Portal Mobile Bottom Sheet */}
      {mobileDrawer && createPortal(mobileDrawer, document.body)}
    </div>
  );
};
