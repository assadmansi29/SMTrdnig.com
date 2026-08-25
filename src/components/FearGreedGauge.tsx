import React from 'react';
import { Gauge, ShieldAlert, TrendingUp, Zap, BarChart2 } from 'lucide-react';

export const FearGreedGauge: React.FC = () => {
  const indexValue = 72; // Greed / Risk-On
  const label = 'Risk-On Greed';

  return (
    <div className="bg-[#0D1322] border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">SMTrading Risk Sentiment</h4>
            <p className="text-[11px] text-slate-400">Cross-Asset Fear & Greed Index</p>
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
          <span>0 (Extreme Fear)</span>
          <span className="text-amber-400 font-bold">{label}</span>
          <span>100 (Extreme Greed)</span>
        </div>
      </div>

      {/* Micro Market Matrix */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono-num">
        <div className="bg-[#090D17] p-2 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">Put/Call Ratio</span>
          <span className="text-slate-200 font-bold">0.68 (Bullish Bias)</span>
        </div>
        <div className="bg-[#090D17] p-2 rounded-lg border border-slate-800">
          <span className="text-slate-500 block text-[10px]">G10 Net Liquidity</span>
          <span className="text-emerald-400 font-bold">+$240B / Mo</span>
        </div>
      </div>
    </div>
  );
};
