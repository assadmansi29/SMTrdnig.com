import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LanguageCode, LanguageOption, LANGUAGES, TranslationKey, translations, getTranslation } from '../locales';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  currentLanguage: LanguageOption;
  availableLanguages: LanguageOption[];
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'smtrading_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'en' || saved === 'ar' || saved === 'ru' || saved === 'uk')) {
        return saved as LanguageCode;
      }
    } catch (e) {
      console.warn('Could not read saved language', e);
    }
    return 'en';
  });

  const currentLanguage = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];
  const isRTL = currentLanguage.dir === 'rtl';
  const dir = currentLanguage.dir;

  const setLanguage = (newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('Could not save language to storage', e);
    }
  };

  useEffect(() => {
    // Update HTML attributes dynamically
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', dir);
    if (isRTL) {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [language, dir, isRTL]);

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let str = getTranslation(language, key);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        dir,
        isRTL,
        currentLanguage,
        availableLanguages: LANGUAGES,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
