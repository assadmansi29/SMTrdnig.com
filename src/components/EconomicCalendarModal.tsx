import React, { useState } from 'react';
import { X, Calendar, AlertTriangle, Clock, Filter, Globe, Flame } from 'lucide-react';
import { EconomicEvent } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface EconomicCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: EconomicEvent[];
}

export const EconomicCalendarModal: React.FC<EconomicCalendarModalProps> = ({
  isOpen,
  onClose,
  events
}) => {
  const { t, isRTL } = useTranslation();
  const [filterImpact, setFilterImpact] = useState<'All' | 'High' | 'Medium'>('All');

  if (!isOpen) return null;

  const filteredEvents = events.filter(e => filterImpact === 'All' || e.impact === filterImpact);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0D121F] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#090D17]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">{t('calModalTitle')}</h3>
              <p className="text-xs text-slate-400">{t('calModalSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="px-6 py-3 bg-[#0B0F19] border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> {t('calImpactLabel')}
            </span>
            {(['All', 'High', 'Medium'] as const).map((impact) => (
              <button
                key={impact}
                onClick={() => setFilterImpact(impact)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  filterImpact === impact
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {impact === 'High' ? t('calImpactHigh') : impact === 'All' ? t('calImpactAll') : t('calImpactMedium')}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-emerald-400 font-mono-num bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {t('calNextEvent')}
          </span>
        </div>

        {/* List of Events */}
        <div className="p-6 divide-y divide-slate-800/80 max-h-[60vh] overflow-y-auto space-y-4">
          {filteredEvents.map((evt) => (
            <div key={evt.id} className="pt-4 first:pt-0 group">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono-num font-semibold text-amber-400">
                      {evt.date} • {evt.time}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold flex items-center gap-1">
                      <Globe className="w-3 h-3 text-cyan-400" />
                      {evt.countryCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        evt.impact === 'High'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {evt.impact} {t('calVolatilitySuffix')}
                    </span>
                  </div>

                  <h4 className="font-semibold text-sm text-white group-hover:text-amber-300 transition-colors">
                    {evt.event}
                  </h4>
                </div>

                <div className="text-right rtl:text-left shrink-0 font-mono-num">
                  <div className="text-xs text-slate-400">
                    {t('calForecast')} <strong className="text-slate-200">{evt.forecast}</strong>
                  </div>
                  <div className="text-xs text-slate-500">
                    {t('calPrior')} {evt.previous}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#090D17] border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {t('calVolNote')}
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
          >
            {t('calDone')}
          </button>
        </div>
      </div>
    </div>
  );
};
