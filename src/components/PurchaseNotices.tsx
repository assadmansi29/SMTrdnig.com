import React from 'react';
import { useTranslation } from '../context/LanguageContext';

export function LiveTrainingNotice() {
  const { t } = useTranslation();
  return <p className="text-[11px] text-slate-400 leading-relaxed">{t('liveTrainingNotice')}</p>;
}

export function MonthlyPromotionNotice() {
  const { t } = useTranslation();
  return <div className="text-[11px] text-slate-400 leading-relaxed mt-1">
    <span className="line-through">$100/{t('promotionMonth')}</span>
    <span className="ml-2 rtl:ml-0 rtl:mr-2 text-emerald-400">{t('monthlyPromotionDiscount')}</span>
    <p>{t('monthlyPromotionDuration')}</p>
  </div>;
}
