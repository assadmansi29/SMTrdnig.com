import { ArticleCategory } from '../types';
import { TranslationKey } from './en';

export const getLocalizedCategory = (
  category: ArticleCategory | string,
  t: (key: TranslationKey) => string
): string => {
  switch (category) {
    case 'All':
      return t('catAll');
    case 'Macro & Liquidity':
      return t('catMacro');
    case 'Order Flow & Price Action':
      return t('catOrderFlow');
    case 'Algorithmic & Quant':
      return t('catQuant');
    case 'FX & Commodities':
      return t('catFX');
    case 'Options & Derivatives':
      return t('catOptions');
    case 'Risk & Psychology':
      return t('catRisk');
    default:
      return category;
  }
};

export const getLocalizedDifficulty = (
  difficulty: string,
  t: (key: TranslationKey) => string
): string => {
  switch (difficulty) {
    case 'Beginner':
      return t('tierBeginner');
    case 'Intermediate':
      return t('tierIntermediate');
    case 'Institutional':
      return t('tierInstitutional');
    case 'All':
      return t('tierAll');
    default:
      return difficulty;
  }
};

export const getLocalizedDirection = (
  direction: string | undefined,
  t: (key: TranslationKey) => string
): string => {
  if (!direction) return '';
  switch (direction.toUpperCase()) {
    case 'LONG':
      return t('setupLong');
    case 'SHORT':
      return t('setupShort');
    case 'NEUTRAL':
      return t('setupNeutral');
    default:
      return direction;
  }
};
