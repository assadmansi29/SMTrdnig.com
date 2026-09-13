import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Layers, ShieldCheck, Eye } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface ReactionZonesLegendProps {
  isAdmin?: boolean;
  activeCount?: {
    strong: number;
    weak: number;
  };
  className?: string;
}

export const ReactionZonesLegend: React.FC<ReactionZonesLegendProps> = ({
  isAdmin = false,
  activeCount,
  className = '',
}) => {
  const { t, isRTL } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('smtrading_reaction_legend_collapsed');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('smtrading_reaction_legend_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const totalCount = (activeCount?.strong || 0) + (activeCount?.weak || 0);

  return (
    <div
      id="chart-reaction-zones-legend"
      className={`select-none transition-all duration-200 z-20 ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {isCollapsed ? (
        // Collapsed Pill Button
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0a0f1d]/90 hover:bg-[#0f172a] backdrop-blur-md border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white shadow-lg text-[11px] font-medium transition-all cursor-pointer group"
          title={t('reactionZoneExpand')}
        >
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
          </span>
          <span className="font-semibold tracking-wide">{t('reactionZones')}</span>
          {totalCount > 0 && (
            <span className="text-[10px] font-mono bg-slate-800/80 px-1.5 py-0.2 rounded text-slate-400">
              {totalCount}
            </span>
          )}
          <ChevronUp className="w-3 h-3 text-slate-400 group-hover:text-white transition-transform" />
        </button>
      ) : (
        // Expanded Professional Card
        <div className="rounded-xl bg-[#090e1a]/95 backdrop-blur-md border border-slate-800/90 shadow-2xl p-2.5 w-64 text-slate-200 animate-in fade-in slide-in-from-bottom-1 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-white tracking-wide">{t('reactionZones')}</span>
              {isAdmin ? (
                <span className="text-[9px] font-mono text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 rounded flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> {t('reactionZoneAdmin')}
                </span>
              ) : (
                <span className="text-[9px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700/60 px-1 py-0.2 rounded flex items-center gap-0.5">
                  <Eye className="w-2.5 h-2.5" /> {t('reactionZoneReadOnly')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={t('reactionZoneCollapse')}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Legend Items */}
          <div className="space-y-1.5 text-xs">
            {/* Red Zone */}
            <div className="flex items-center justify-between py-1 px-1.5 rounded-lg bg-red-950/20 border border-red-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)] shrink-0" />
                <span className="font-semibold text-red-300">{t('reactionZoneRed')}</span>
                <span className="text-slate-300 text-[11px]">{t('reactionZoneStrongDesc')}</span>
              </div>
              {activeCount && (
                <span className="text-[10px] font-mono text-red-400/90 font-bold">
                  {activeCount.strong}
                </span>
              )}
            </div>

            {/* Green Zone */}
            <div className="flex items-center justify-between py-1 px-1.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.7)] shrink-0" />
                <span className="font-semibold text-emerald-300">{t('reactionZoneGreen')}</span>
                <span className="text-slate-300 text-[11px]">{t('reactionZoneWeakDesc')}</span>
              </div>
              {activeCount && (
                <span className="text-[10px] font-mono text-emerald-400/90 font-bold">
                  {activeCount.weak}
                </span>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            {isAdmin ? (
              <span className="text-amber-400/80">{t('reactionZoneAdminHint')}</span>
            ) : (
              <span className="text-slate-500">{t('reactionZoneUserHint')}</span>
            )}
            <button
              type="button"
              onClick={toggleCollapse}
              className="hover:text-slate-300 underline cursor-pointer"
            >
              {t('reactionZoneHide')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
