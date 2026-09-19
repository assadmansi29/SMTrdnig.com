import React from 'react';
import { Gauge, ShieldAlert, TrendingUp, Zap, BarChart2 } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

export const FearGreedGauge: React.FC = () => {
  const { t } = useTranslation();
  const indexValue = 72; // Greed / Risk-On

  return (
    <div className="bg-[#0D1322] border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">{t('widgetSentimentTitle')}</h4>
            <p className="text-[11px] text-slate-400">{t('widgetSentimentSubtitle')}</p>
          </div>
        </div>

        <span className="bg-emerald-500/10 text-emerald-300 text-xs font-mono-num font-bold px-2 py-0.5 rounded border border-emerald-500/30">
          72 / 100
        </span>
      </div>

      {/* Visual Meter Bar */}
      <div className="space-y-1.5">
        <div className="h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
          <div
            style={{ width: `${indexValue}%` }}
            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-700 shadow-sm"
          ></div>
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono-num">
          <span>0 ({t('widgetFearExtreme')})</span>
          <span className="text-amber-400 font-bold">{t('widgetRiskOn')}</span>
          <span>100 ({t('widgetGreedExtreme')})</span>
        </div>
      </div>

      {/* Micro Market Matrix */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono-num">
        <div className="bg-[#090D17] p-2 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">{t('widgetPutCall')}</span>
          <span className="text-slate-200 font-bold">{t('widgetPutCallVal')}</span>
        </div>
        <div className="bg-[#090D17] p-2 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">{t('widgetG10Liquidity')}</span>
          <span className="text-emerald-400 font-bold">{t('widgetG10Val')}</span>
        </div>
      </div>
    </div>
  );
};
