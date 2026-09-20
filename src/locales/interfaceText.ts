import { en, getTranslation, type LanguageCode, type TranslationKey } from './index';
import messages from './interfaceMessages.json';

const normalized = (value: string) => value.replace(/\s+/g, ' ').trim();
const existingKeys = new Map(Object.entries(en).map(([key, value]) => [normalized(value), key as TranslationKey]));

/** Translate display text only; identifiers, form values and stored records remain unchanged. */
export function interfaceText(value: string, language: LanguageCode, params: Record<string, string | number> = {}): string {
  const original = normalized(value);
  const key = existingKeys.get(original);
  const translated = language === 'en' ? original
    : (messages as Record<string, Partial<Record<LanguageCode, string>>>)[original]?.[language]
      || (key ? getTranslation(language, key) : original);
  const prefix = /^\s/.test(value) ? ' ' : '';
  const suffix = /\s$/.test(value) ? ' ' : '';
  return prefix + translated.replace(/\{(\w+)\}/g, (match, name) => String(params[name] ?? match)) + suffix;
}
