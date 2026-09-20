import { useCallback } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { interfaceText } from '../locales/interfaceText';

export function useInterfaceText() {
  const { language } = useTranslation();
  return useCallback((value: string, params?: Record<string, string | number>) => interfaceText(value, language, params), [language]);
}
