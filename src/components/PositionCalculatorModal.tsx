import React, { useState, useEffect } from 'react';
import { X, Calculator, ShieldAlert, ArrowRight, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { TradeSetup } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface PositionCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSetup?: TradeSetup | null;
}

export const PositionCalculatorModal: React.FC<PositionCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialSetup
}) => {
  const { t, isRTL } = useTranslation();
  const [accountBalance, setAccountBalance] = useState<number>(50000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [entryPrice, setEntryPrice] = useState<number>(5910);
  const [stopLoss, setStopLoss] = useState<number>(5898);
  const [takeProfit, setTakeProfit] = useState<number>(5948);
  const [assetType, setAssetType] = useState<'crypto' | 'futures' | 'forex' | 'stocks'>('futures');

  useEffect(() => {
    if (initialSetup) {
      // Parse numbers from strings if available
      const extractNumber = (str: string) => {
        const matches = str.match(/[\d,.]+/);
        if (matches) {
          return parseFloat(matches[0].replace(/,/g, ''));
        }
        return 0;
      };

      const entry = extractNumber(initialSetup.entryZone);
      const sl = extractNumber(initialSetup.stopLoss);
      const tp = extractNumber(initialSetup.takeProfit1);

      if (entry > 0) setEntryPrice(entry);
      if (sl > 0) setStopLoss(sl);
      if (tp > 0) setTakeProfit(tp);
    }
  }, [initialSetup]);

  if (!isOpen) return null;

  const maxRiskAmount = (accountBalance * riskPercent) / 100;
  const distanceToStop = Math.abs(entryPrice - stopLoss);
  const distanceToTarget = Math.abs(takeProfit - entryPrice);

  const unitsOrShares = distanceToStop > 0 ? maxRiskAmount / distanceToStop : 0;
  const positionValue = unitsOrShares * entryPrice;
  const potentialProfit = unitsOrShares * distanceToTarget;
  const riskRewardRatio = distanceToStop > 0 ? (distanceToTarget / distanceToStop).toFixed(2) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-[#0D121F] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-[#090D17] gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2 rtl:pr-0 rtl:pl-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm sm:text-base text-white truncate">{t('calcModalTitle')}</h3>
              <p className="text-xs text-slate-400 truncate">{t('calcModalSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[42px] min-h-[42px] w-11 h-11 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:bg-slate-650 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Close calculator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Quick presets */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: t('calcPresetFutures'), type: 'futures' as const },
              { label: t('calcPresetCrypto'), type: 'crypto' as const },
              { label: t('calcPresetForex'), type: 'forex' as const },
              { label: t('calcPresetEquities'), type: 'stocks' as const },
            ].map((p) => (
              <button
                key={p.type}
                onClick={() => setAssetType(p.type)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  assetType === p.type
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Account Balance */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>{t('calcAccountBalance')}</span>
                <span className="text-amber-400 font-mono-num font-bold">${accountBalance.toLocaleString()}</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Number(e.target.value))}
                  className="w-full bg-[#070A10] border border-slate-700 rounded-lg pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-sm text-white font-mono-num focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Risk Percentage */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>{t('calcRiskPercent')}</span>
                <span className="text-amber-400 font-mono-num font-bold">{riskPercent}%</span>
              </label>
              <div className="relative">
                <Percent className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  step="0.1"
                  max="5"
                  min="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(Number(e.target.value))}
                  className="w-full bg-[#070A10] border border-slate-700 rounded-lg pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-sm text-white font-mono-num focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Trade Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">{t('calcEntryPrice')}</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Number(e.target.value))}
                className="w-full bg-[#070A10] border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-white font-mono-num focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-rose-400 mb-1">{t('calcStopLoss')}</label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                className="w-full bg-[#070A10] border border-rose-900/50 rounded-md px-2.5 py-1.5 text-xs text-rose-300 font-mono-num focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-emerald-400 mb-1">{t('calcTakeProfit')}</label>
              <input
                type="number"
                step="any"
                value={takeProfit}
                onChange={(e) => setTakeProfit(Number(e.target.value))}
                className="w-full bg-[#070A10] border border-emerald-900/50 rounded-md px-2.5 py-1.5 text-xs text-emerald-300 font-mono-num focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Calculated Output Matrix */}
          <div className="bg-gradient-to-br from-[#0B101D] to-[#12192B] border border-slate-700 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs text-slate-400">{t('calcMaxRisk')}</span>
              <span className="font-mono-num font-bold text-rose-400 text-sm">
                -${maxRiskAmount.toFixed(2)} ({riskPercent}%)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 block">{t('calcPositionSize')}</span>
                <span className="text-base font-bold text-amber-300 font-mono-num">
                  {unitsOrShares.toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">{t('calcPotentialProfit')}</span>
                <span className="text-base font-bold text-emerald-400 font-mono-num">
                  +${potentialProfit.toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">{t('calcRiskReward')}</span>
                <span className="text-base font-bold text-white font-mono-num">
                  1 : {riskRewardRatio}
                </span>
              </div>
            </div>
          </div>

          {/* Risk Advisory Note */}
          <div className="flex items-start gap-2.5 text-xs text-slate-400 bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              {t('calVolNote')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#090D17] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            {t('calcApplyToChart')}
          </button>
        </div>
      </div>
    </div>
  );
};

