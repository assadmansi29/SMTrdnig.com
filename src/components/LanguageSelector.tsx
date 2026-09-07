import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Globe, ChevronDown, Check, X } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { LanguageCode } from '../locales';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, availableLanguages, currentLanguage, isRTL } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  const modalContent = isOpen && typeof document !== 'undefined' ? (
    <div
      id="modal-language-selector"
      className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-md bg-[#0C111C] border-t sm:border border-slate-700/90 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-200 text-slate-200"
        onClick={(e) => e.stopPropagation()}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Handle Bar on mobile */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white truncate">Select Language / اختر اللغة</h3>
              <p className="text-xs text-slate-400 font-mono truncate">SMTrading International Desk</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
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
                className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer min-h-[52px] ${
                  isSelected
                    ? 'bg-amber-400/15 border-amber-400 text-amber-300 shadow-md shadow-amber-400/10'
                    : 'bg-[#0E1524] hover:bg-slate-800/80 border-slate-800 text-slate-200 active:bg-slate-800'
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
    <div className="relative inline-block w-full text-start">
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

      {/* Centered Modal portal */}
      {modalContent && createPortal(modalContent, document.body)}
    </div>
  );
};
