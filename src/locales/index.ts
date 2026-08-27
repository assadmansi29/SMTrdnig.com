import { LanguageCode } from './types';
import { en, TranslationKey } from './en';
import { ar } from './ar';
import { ru } from './ru';
import { uk } from './uk';

export * from './types';
export * from './en';

export const translations: Record<LanguageCode, Record<TranslationKey, string>> = {
  en,
  ar,
  ru,
  uk,
};

export const getTranslation = (lang: LanguageCode, key: TranslationKey): string => {
  return translations[lang]?.[key] || translations.en[key] || key;
};
