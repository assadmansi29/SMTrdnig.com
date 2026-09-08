import React, { useState } from 'react';
import { SmcLuxAlgoSettings, SmcAnalysisResult } from './smcLuxAlgoTypes';
import { SmcLuxAlgoSettingsModal } from './SmcLuxAlgoSettingsModal';
import { Eye, EyeOff, Settings, Activity, TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface SmcLuxAlgoOverlayProps {
  settings: SmcLuxAlgoSettings;
  onUpdateSettings: (newSettings: SmcLuxAlgoSettings) => void;
  analysis: SmcAnalysisResult | null;
  className?: string;
}

export const SmcLuxAlgoOverlay: React.FC<SmcLuxAlgoOverlayProps> = ({
  settings,
  onUpdateSettings,
  analysis,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isBullish = analysis?.trend === 'bullish';
  const activeObs = analysis?.orderBlocks.filter((ob) => !ob.mitigated).length ?? 0;
  const activeFvgs = analysis?.fvgs.filter((f) => !f.mitigated).length ?? 0;
  const lastSignal = analysis?.lastSignal;

  return (
    <>
      <div
        className={`absolute top-2 left-2 z-[40] flex flex-col gap-1 select-none pointer-events-auto font-sans ${className}`}
        dir="ltr"
      >
        {/* Main Indicator Pill */}
        <div className="flex items-center gap-1.5 bg-[#0C111D]/90 hover:bg-[#0E1524] backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800/90 shadow-xl transition-all duration-200">
          {/* Logo / Brand */}
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="w-4 h-4 rounded-md bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-[9px]">
              S
            </div>
            <span className="text-[11px] font-bold text-slate-100 tracking-tight">
              LuxAlgo <span className="text-sky-400 font-extrabold">SMC</span>
            </span>
          </div>

          {/* Real-time Trend Bias */}
          {settings.enabled && analysis && (
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider font-mono border ${
                isBullish
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
              title={`Live Market Structure: ${isBullish ? 'Bullish Trend' : 'Bearish Trend'}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBullish ? 'bg-emerald-400' : 'bg-rose-400'
                } animate-pulse`}
              />
              {isBullish ? (
                <div className="flex items-center gap-0.5">
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span>BULLISH</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5">
                  <TrendingDown className="w-2.5 h-2.5" />
                  <span>BEARISH</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Stats Pill (Compact) */}
          {settings.enabled && analysis && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-slate-400 pl-1 border-l border-slate-800">
              <span title="Active Unmitigated Order Blocks">OB: <strong className="text-slate-200">{activeObs}</strong></span>
              <span title="Unfilled Fair Value Gaps">FVG: <strong className="text-slate-200">{activeFvgs}</strong></span>
              {lastSignal && (
                <span
                  className={
                    lastSignal.direction === 'bullish' ? 'text-emerald-400' : 'text-rose-400'
                  }
                  title={`Latest Structure Break: ${lastSignal.type}`}
                >
                  {lastSignal.type}
                </span>
              )}
            </div>
          )}

          {/* Controls: Eye & Settings */}
          <div className="flex items-center gap-0.5 pl-1 border-l border-slate-800">
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, enabled: !settings.enabled })}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                settings.enabled
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-400 bg-slate-900/50'
              }`}
              title={settings.enabled ? 'Hide SMC Overlay' : 'Show SMC Overlay'}
            >
              {settings.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
            </button>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="p-1 rounded-md text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="LuxAlgo SMC Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Institutional Context Info (Optional dropdown on click) */}
        {isExpanded && settings.enabled && analysis && (
          <div className="p-2 rounded-xl bg-[#090D17]/95 border border-slate-800 shadow-2xl backdrop-blur-md max-w-xs text-[11px] space-y-1.5 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
              <span className="font-semibold text-slate-200">Smart Money Breakdown</span>
              <span className="text-[10px] font-mono text-sky-400">Sens: {settings.swingLength} bars</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div className="bg-[#121A2B] p-1.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Order Blocks</span>
                <span className="font-bold font-mono text-emerald-400">{activeObs} Active</span>
              </div>
              <div className="bg-[#121A2B] p-1.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">Fair Value Gaps</span>
                <span className="font-bold font-mono text-cyan-400">{activeFvgs} Active</span>
              </div>
            </div>
            {analysis.premiumDiscount && (
              <div className="text-[10px] text-slate-400 flex items-center justify-between bg-[#121A2B] p-1.5 rounded-lg border border-slate-800/80">
                <span>Equilibrium (50%):</span>
                <span className="font-mono font-bold text-slate-200">
                  {analysis.premiumDiscount.equilibriumPrice.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SmcLuxAlgoSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />
    </>
  );
};
