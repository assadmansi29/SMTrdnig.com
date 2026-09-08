import React from 'react';
import { SmcLuxAlgoSettings, DEFAULT_SMC_SETTINGS } from './smcLuxAlgoTypes';
import { X, Sliders, Check, RotateCcw, Activity, ShieldAlert, Layers, TrendingUp, Eye } from 'lucide-react';

interface SmcLuxAlgoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SmcLuxAlgoSettings;
  onUpdateSettings: (newSettings: SmcLuxAlgoSettings) => void;
}

export const SmcLuxAlgoSettingsModal: React.FC<SmcLuxAlgoSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof SmcLuxAlgoSettings>(key: K, value: SmcLuxAlgoSettings[K]) => {
    onUpdateSettings({
      ...settings,
      [key]: value,
    });
  };

  const handleReset = () => {
    onUpdateSettings({ ...DEFAULT_SMC_SETTINGS });
  };

  return (
    <div
      className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0C111D] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh] text-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        dir="ltr"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#090D17]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Smart Money Concepts [SMC]
                </h3>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30">
                  LuxAlgo
                </span>
              </div>
              <p className="text-xs text-slate-400">Institutional Order Flow & Market Structure Parameters</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121A2B] border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-sky-400" />
              <div>
                <span className="text-xs sm:text-sm font-semibold text-white">Enable SMC Indicator</span>
                <p className="text-[11px] text-slate-400">Display institutional concepts on chart</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* Section 1: Market Structure (BOS & CHoCH) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-sky-400 font-bold tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real-Time Market Structure</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Break of Structure (BOS)</span>
                <input
                  type="checkbox"
                  checked={settings.showBos}
                  onChange={(e) => handleChange('showBos', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Change of Character (CHoCH)</span>
                <input
                  type="checkbox"
                  checked={settings.showChoch}
                  onChange={(e) => handleChange('showChoch', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Swing Labels (HH, LH, HL, LL)</span>
                <input
                  type="checkbox"
                  checked={settings.showSwingLabels}
                  onChange={(e) => handleChange('showSwingLabels', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Strong / Weak Highs & Lows</span>
                <input
                  type="checkbox"
                  checked={settings.showStrongWeak}
                  onChange={(e) => handleChange('showStrongWeak', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>

            {/* Swing Lookback Length */}
            <div className="p-3 rounded-lg bg-[#0E1524] border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-200">Swing Detection Lookback</span>
                <p className="text-[10px] text-slate-400">Sensitivity for fractal swing highs and lows</p>
              </div>
              <div className="flex items-center gap-1">
                {[3, 5, 8, 10].map((len) => (
                  <button
                    key={len}
                    type="button"
                    onClick={() => handleChange('swingLength', len)}
                    className={`px-2 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                      settings.swingLength === len
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-transparent'
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Order Blocks (OB) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-emerald-400 font-bold tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Order Blocks (OB)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Show Order Blocks (+OB / -OB)</span>
                <input
                  type="checkbox"
                  checked={settings.showOrderBlocks}
                  onChange={(e) => handleChange('showOrderBlocks', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Show Mitigated OBs</span>
                <input
                  type="checkbox"
                  checked={settings.showMitigatedOB}
                  onChange={(e) => handleChange('showMitigatedOB', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Section 3: Fair Value Gaps (FVG) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-cyan-400 font-bold tracking-wider">
              <Activity className="w-3.5 h-3.5" />
              <span>Fair Value Gaps (FVG / Imbalances)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Show Fair Value Gaps</span>
                <input
                  type="checkbox"
                  checked={settings.showFvg}
                  onChange={(e) => handleChange('showFvg', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Show Mitigated FVGs</span>
                <input
                  type="checkbox"
                  checked={settings.showMitigatedFvg}
                  onChange={(e) => handleChange('showMitigatedFvg', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Liquidity & Equilibrium (50%) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-amber-400 font-bold tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Liquidity Pools & Premium/Discount</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Equal Highs / Lows (EQH/EQL)</span>
                <input
                  type="checkbox"
                  checked={settings.showLiquidity}
                  onChange={(e) => handleChange('showLiquidity', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#0E1524] border border-slate-800/80 cursor-pointer hover:border-slate-700">
                <span className="text-xs font-medium text-slate-300">Equilibrium 50% & Zones</span>
                <input
                  type="checkbox"
                  checked={settings.showPremiumDiscount}
                  onChange={(e) => handleChange('showPremiumDiscount', e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-[#090D17]">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-sky-400 hover:bg-sky-300 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
