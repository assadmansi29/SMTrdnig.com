import React from 'react';
import { ShieldCheck, TrendingUp, Sparkles, Mail, Globe, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { ArticleCategory } from '../types';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';
import { useTranslation } from '../context/LanguageContext';

interface FooterProps {
  onSelectCategory: (category: ArticleCategory) => void;
  onOpenCalculator: () => void;
  onOpenCalendar: () => void;
  onOpenChart: () => void;
  onOpenNewsletter: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onOpenCalculator,
  onOpenCalendar,
  onOpenChart,
  onOpenNewsletter
}) => {
  const { t, isRTL } = useTranslation();

  const categoryTranslations: Record<ArticleCategory, string> = {
    'All': t('catAll'),
    'Macro & Liquidity': t('catMacro'),
    'Order Flow & Price Action': t('catOrderFlow'),
    'Algorithmic & Quant': t('catQuant'),
    'FX & Commodities': t('catFX'),
    'Options & Derivatives': t('catOptions'),
    'Risk & Psychology': t('catRisk')
  };

  return (
    <footer className="bg-[#070A10] border-t border-slate-800 text-slate-400 text-xs">
      {/* Top Pre-Footer Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-slate-800/80">
        <div className="bg-gradient-to-r from-[#0C1220] via-[#101728] to-[#0A0E18] border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 text-center md:text-left rtl:md:text-right">
            <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px] flex items-center justify-center md:justify-start rtl:md:justify-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t('footerBannerTag')}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {t('footerBannerHeading')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('footerBannerDesc')}
            </p>
          </div>

          <button
            onClick={onOpenNewsletter}
            className="shrink-0 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            {t('footerBannerBtn')}
          </button>
        </div>
      </div>

      {/* Main Footer Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Brand Col */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-[1px] shadow-md shadow-amber-500/10">
              <div className="w-full h-full bg-[#0E131F] rounded-[10px] flex items-center justify-center font-bold text-amber-400 font-mono-num text-sm">
                SM
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-black text-xl sm:text-2xl text-white block tracking-tight">
                  SMTrading<span className="text-amber-400">.com</span>
                </span>
                <span className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-amber-600/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
                  <span>by ABU ASAD ALMANSI</span>
                  <BlueVerifiedBadge size="xs" />
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider pt-0.5">
                Smart Money Trading Intelligence
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed pr-6 rtl:pr-0 rtl:pl-6">
            {t('footerBrandDesc')}
          </p>

          <div className="flex items-center gap-3 pt-2 text-slate-300">
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono-num text-amber-300">
              EST. 2026
            </span>
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono-num text-emerald-400">
              NYSE / CME / EUREX Feeds
            </span>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h4 className="font-bold text-white uppercase text-xs tracking-wider">{t('footerSectorsTitle')}</h4>
          <ul className="space-y-2">
            {(['Macro & Liquidity', 'Order Flow & Price Action', 'Algorithmic & Quant', 'FX & Commodities', 'Options & Derivatives', 'Risk & Psychology'] as ArticleCategory[]).map(c => (
              <li key={c}>
                <button
                  onClick={() => {
                    onSelectCategory(c);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-amber-300 transition-colors text-left rtl:text-right cursor-pointer"
                >
                  {categoryTranslations[c] || c}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Interactive Tools */}
        <div className="space-y-3">
          <h4 className="font-bold text-white uppercase text-xs tracking-wider">{t('footerToolsTitle')}</h4>
          <ul className="space-y-2">
            <li>
              <button onClick={onOpenCalculator} className="hover:text-amber-300 transition-colors text-left rtl:text-right flex items-center gap-1 cursor-pointer">
                {t('navRiskCalculator')}
              </button>
            </li>
            <li>
              <button onClick={onOpenCalendar} className="hover:text-amber-300 transition-colors text-left rtl:text-right flex items-center gap-1 cursor-pointer">
                {t('navCalendar')}
              </button>
            </li>
            <li>
              <button onClick={onOpenChart} className="hover:text-amber-300 transition-colors text-left rtl:text-right flex items-center gap-1 cursor-pointer">
                {t('navChartStudio')}
              </button>
            </li>
            <li>
              <button onClick={onOpenNewsletter} className="hover:text-amber-300 transition-colors text-left rtl:text-right flex items-center gap-1 cursor-pointer">
                {t('navVipAlpha')}
              </button>
            </li>
          </ul>
        </div>

        {/* Author Desk & Editorial */}
        <div className="space-y-3">
          <h4 className="font-bold text-white uppercase text-xs tracking-wider">{t('footerEditorialTitle')}</h4>
          <ul className="space-y-1.5 text-slate-400">
            <li className="text-amber-300 font-semibold flex items-center gap-1">
              <span>{t('footerFounderRole')}</span>
              <BlueVerifiedBadge size="xs" />
            </li>
            <li>Dr. Alexander Vance (Quant)</li>
            <li>Elena Rostova (Macro & FX)</li>
            <li>Marcus Sterling, CFA (Derivatives)</li>
            <li>Dr. Sarah Chen (Risk Neuroscience)</li>
          </ul>
        </div>
      </div>

      {/* CFTC Rule 4.41 & Financial Risk Disclosure */}
      <div className="bg-[#05070C] border-t border-slate-800/80 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>{t('footerRiskWarningTitle')}</strong> {t('footerRiskWarningText')}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>{t('footerCopyright')}</span>
            <div className="flex gap-4">
              <span className="hover:text-slate-400 cursor-pointer">{t('footerPrivacy')}</span>
              <span className="hover:text-slate-400 cursor-pointer">{t('footerTerms')}</span>
              <span className="hover:text-slate-400 cursor-pointer">{t('footerDisclosures')}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
