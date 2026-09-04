import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Clock,
  Crosshair,
  ExternalLink
} from 'lucide-react';
import { ChartAnalysisRecord, AnalysisTradeSetup, ChartDrawing } from '../types';

interface ChartAnalysisOverlayProps {
  symbol: string;
  interval?: string;
  onOpenAnalysisStudio?: () => void;
  isAdmin?: boolean;
}

export const ChartAnalysisOverlay: React.FC<ChartAnalysisOverlayProps> = ({
  symbol,
  interval,
  onOpenAnalysisStudio,
  isAdmin = false,
}) => {
  const [analyses, setAnalyses] = useState<ChartAnalysisRecord[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ChartAnalysisRecord | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showLevelHud, setShowLevelHud] = useState(true);
  const [loading, setLoading] = useState(false);

  // Normalize symbol for clean matching
  const cleanSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;

  useEffect(() => {
    let isMounted = true;
    const fetchPublicAnalyses = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/chart-analyses/public?symbol=${encodeURIComponent(cleanSymbol)}`);
        const data = await res.json();
        if (isMounted && res.ok && data.success) {
          const list: ChartAnalysisRecord[] = data.analyses || [];
          setAnalyses(list);
          if (list.length > 0) {
            setSelectedAnalysis(list[0]);
          } else {
            setSelectedAnalysis(null);
          }
        }
      } catch (err) {
        console.error('Error fetching public chart analyses:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPublicAnalyses();
    return () => {
      isMounted = false;
    };
  }, [cleanSymbol, interval]);

  if (!selectedAnalysis) {
    if (!isAdmin) return null;

    // For Admin: Show a quick prompt to create an analysis if none exists for this symbol
    return (
      <div className="bg-[#0c1220]/95 border border-slate-800 rounded-xl p-2.5 mb-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>No live SMC analysis published for <strong>{cleanSymbol}</strong> yet.</span>
        </div>
        {onOpenAnalysisStudio && (
          <button
            type="button"
            onClick={onOpenAnalysisStudio}
            className="px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
          >
            Create Analysis in Studio →
          </button>
        )}
      </div>
    );
  }

  const { title, bias, summary, drawings, tradeSetup, authorUsername, updatedAt } = selectedAnalysis;

  return (
    <div className="w-full mb-3 space-y-2">
      {/* Top Bar Header */}
      <div className="bg-gradient-to-r from-[#0C1220] via-[#101827] to-[#0C1220] border border-amber-500/30 rounded-xl shadow-lg p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Left: Author & Setup Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-bold text-xs truncate">
                {title}
              </span>
              
              {/* Bias Badge */}
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                bias === 'bullish'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : bias === 'bearish'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-700/40 text-slate-300 border-slate-600'
              }`}>
                {bias === 'bullish' ? <TrendingUp className="w-3 h-3" /> : bias === 'bearish' ? <TrendingDown className="w-3 h-3" /> : null}
                {bias}
              </span>

              {/* R:R Ratio Badge if setup exists */}
              {tradeSetup && (
                <span className="bg-amber-400/15 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  R:R 1:{tradeSetup.riskRewardRatio}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>Verified Institutional Analyst: <strong className="text-slate-200">@{authorUsername}</strong></span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500">{new Date(updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Right: Toggles & Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* HUD level toggle */}
          <button
            type="button"
            onClick={() => setShowLevelHud(!showLevelHud)}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              showLevelHud
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Live Price Levels HUD"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Levels HUD</span>
          </button>

          {/* Details toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{isExpanded ? 'Hide Details' : 'View SMC Setup'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {isAdmin && onOpenAnalysisStudio && (
            <button
              type="button"
              onClick={onOpenAnalysisStudio}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Edit in Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Level HUD Ribbon: Quick Price Reference Bar */}
      {showLevelHud && (
        <div className="bg-[#090D17]/95 border border-slate-800/80 rounded-xl p-2 px-3 flex items-center gap-3 overflow-x-auto scrollbar-none text-xs font-mono">
          <span className="text-[10px] uppercase font-sans text-slate-500 font-bold shrink-0">
            SMC Coords:
          </span>

          {tradeSetup && (
            <>
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                <span className="text-slate-400 text-[10px]">ENTRY:</span>
                <span className="font-bold text-white">{tradeSetup.entryPrice}</span>
              </div>
              <div className="flex items-center gap-1 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/50 shrink-0">
                <span className="text-rose-400 text-[10px]">SL:</span>
                <span className="font-bold text-rose-300">{tradeSetup.stopLoss}</span>
              </div>
              <div className="flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50 shrink-0">
                <span className="text-emerald-400 text-[10px]">TP1:</span>
                <span className="font-bold text-emerald-300">{tradeSetup.takeProfit1}</span>
              </div>
              {tradeSetup.takeProfit2 && (
                <div className="flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50 shrink-0">
                  <span className="text-emerald-400 text-[10px]">TP2:</span>
                  <span className="font-bold text-emerald-300">{tradeSetup.takeProfit2}</span>
                </div>
              )}
            </>
          )}

          {/* Key Order Blocks / FVGs */}
          {drawings.slice(0, 3).map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0 text-[11px]"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color || '#38bdf8' }} />
              <span className="text-slate-400 truncate max-w-[120px]">{d.label}:</span>
              <span className="text-slate-200 font-bold">
                {'priceHigh' in d ? `${d.priceLow} - ${d.priceHigh}` : ('price' in d ? d.price : '')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expanded Details Drawer */}
      {isExpanded && (
        <div className="bg-[#0A0E18] border border-slate-800 rounded-xl p-3 sm:p-4 space-y-4 text-xs">
          
          {/* Trade Setup Card & Targets */}
          {tradeSetup && (
            <div className="bg-[#0D1322] border border-slate-800/80 rounded-xl p-3 sm:p-3.5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white uppercase tracking-wider text-xs">
                    Institutional Trade Execution Parameters
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    tradeSetup.direction === 'long'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {tradeSetup.direction === 'long' ? 'BUY / LONG' : 'SELL / SHORT'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-slate-400">
                    Status: <strong className="text-emerald-400 uppercase">{tradeSetup.status}</strong>
                  </span>
                  <span className="text-slate-400">
                    R:R: <strong className="text-amber-400 font-bold">1:{tradeSetup.riskRewardRatio}</strong>
                  </span>
                </div>
              </div>

              {/* Targets Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                  <span className="text-[10px] text-slate-500 block uppercase">Entry Zone</span>
                  <span className="text-sm font-bold text-white">{tradeSetup.entryPrice}</span>
                </div>
                <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-2">
                  <span className="text-[10px] text-rose-400 block uppercase">Stop Loss (SL)</span>
                  <span className="text-sm font-bold text-rose-300">{tradeSetup.stopLoss}</span>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-2">
                  <span className="text-[10px] text-emerald-400 block uppercase">Target 1 (TP1)</span>
                  <span className="text-sm font-bold text-emerald-300">{tradeSetup.takeProfit1}</span>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-2">
                  <span className="text-[10px] text-emerald-400 block uppercase">Target 2 / Final</span>
                  <span className="text-sm font-bold text-emerald-300">
                    {tradeSetup.takeProfit2 || tradeSetup.takeProfit3 || 'Open Runner'}
                  </span>
                </div>
              </div>

              {tradeSetup.notes && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-200/90 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Invalidation & Risk Rule:</strong> {tradeSetup.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* SMC Zones and Order Blocks List */}
          {drawings.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Marked SMC Liquidity Zones & Levels ({drawings.length})</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {drawings.map((d) => (
                  <div
                    key={d.id}
                    className="p-2.5 bg-[#0D1322] border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color || '#38bdf8' }}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-200 block truncate">{d.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {'priceHigh' in d && `Range: ${d.priceLow} - ${d.priceHigh}`}
                          {'price' in d && `Level: ${d.price}`}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                      {d.type.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Institutional Narrative / Commentary */}
          {summary && (
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Analyst Commentary & Context
              </span>
              <p className="text-slate-300 leading-relaxed text-xs">
                {summary}
              </p>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
