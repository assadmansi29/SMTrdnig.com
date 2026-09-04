import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ShieldCheck, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Send, 
  Save, 
  RefreshCw, 
  BarChart2, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Lock,
  Globe
} from 'lucide-react';
import { 
  ChartAnalysisRecord, 
  ChartDrawing, 
  OrderBlockDrawing, 
  FvgDrawing, 
  KeyLevelDrawing, 
  AnalysisTradeSetup, 
  AnalysisBias 
} from '../../types';
import { TradingViewWidget } from '../TradingViewWidget';

interface TradingViewStudioTabProps {
  token: string | null;
  currentUser: {
    id: string;
    username: string;
    role: string;
  };
  initialSymbol?: string;
  initialInterval?: string;
}

const PRESET_INSTRUMENTS = [
  { symbol: 'OANDA:XAUUSD', name: 'Gold / USD (XAUUSD)', category: 'Metals' },
  { symbol: 'OANDA:NAS100USD', name: 'NASDAQ 100 (NAS100)', category: 'Indices' },
  { symbol: 'OANDA:US30USD', name: 'US Wall St 30 (US30)', category: 'Indices' },
  { symbol: 'OANDA:DE30EUR', name: 'Germany 40 (GER40)', category: 'Indices' },
  { symbol: 'NASDAQ:NDX', name: 'NASDAQ 100 (NDX)', category: 'Indices' },
  { symbol: 'FOREXCOM:DJI', name: 'US Wall St 30 (DJI)', category: 'Indices' },
  { symbol: 'INDEX:DAX', name: 'Germany 40 (DAX)', category: 'Indices' },
  { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin / USDT', category: 'Crypto' },
  { symbol: 'FX:EURUSD', name: 'EUR / USD', category: 'Forex' },
  { symbol: 'NYMEX:CL1!', name: 'Crude Oil WTI', category: 'Energy' },
];

const TIMEFRAMES = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1H' },
  { value: '240', label: '4H' },
  { value: 'D', label: 'Daily' },
  { value: 'W', label: 'Weekly' },
];

export const TradingViewStudioTab: React.FC<TradingViewStudioTabProps> = ({
  token,
  currentUser,
  initialSymbol,
  initialInterval,
}) => {
  // Navigation & Active Symbol
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol || 'OANDA:XAUUSD');
  const [customSymbol, setCustomSymbol] = useState('');
  const [selectedInterval, setSelectedInterval] = useState(initialInterval || '15');
  const [showTvLiveChart, setShowTvLiveChart] = useState(true);

  // Sync symbol and timeframe if supplied via navigation prop (e.g. from live chart overlay button)
  useEffect(() => {
    if (initialSymbol) {
      setSelectedSymbol(initialSymbol);
      const clean = initialSymbol.includes(':') ? initialSymbol.split(':')[1] : initialSymbol;
      setTitle((prev) => (prev ? prev : `[${clean}] Institutional Order Flow & SMC Setup`));
    }
  }, [initialSymbol]);

  useEffect(() => {
    if (initialInterval) {
      setSelectedInterval(initialInterval);
    }
  }, [initialInterval]);

  // Analyses list from DB
  const [analyses, setAnalyses] = useState<ChartAnalysisRecord[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [editingAnalysisId, setEditingAnalysisId] = useState<string | null>(null);

  // Form states for active analysis
  const [title, setTitle] = useState('');
  const [bias, setBias] = useState<AnalysisBias>('bullish');
  const [summary, setSummary] = useState('');
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);

  // Trade Setup form
  const [includeTradeSetup, setIncludeTradeSetup] = useState(true);
  const [setupDirection, setSetupDirection] = useState<'long' | 'short'>('long');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit1, setTakeProfit1] = useState('');
  const [takeProfit2, setTakeProfit2] = useState('');
  const [takeProfit3, setTakeProfit3] = useState('');
  const [setupStatus, setSetupStatus] = useState<AnalysisTradeSetup['status']>('active');
  const [invalidationNotes, setInvalidationNotes] = useState('');

  // Drawing sub-forms
  const [drawingTypeToAdd, setDrawingTypeToAdd] = useState<'order_block' | 'fvg' | 'key_level'>('order_block');
  
  // OB subform
  const [obSubType, setObSubType] = useState<'bullish_demand' | 'bearish_supply'>('bullish_demand');
  const [obHigh, setObHigh] = useState('');
  const [obLow, setObLow] = useState('');
  const [obLabel, setObLabel] = useState('H1 Institutional Demand OB');

  // FVG subform
  const [fvgSubType, setFvgSubType] = useState<'bullish' | 'bearish'>('bullish');
  const [fvgHigh, setFvgHigh] = useState('');
  const [fvgLow, setFvgLow] = useState('');
  const [fvgLabel, setFvgLabel] = useState('15m Fair Value Gap');

  // Key Level subform
  const [klSubType, setKlSubType] = useState<KeyLevelDrawing['subType']>('support');
  const [klPrice, setKlPrice] = useState('');
  const [klLabel, setKlLabel] = useState('Previous Day High (PDH)');
  const [klStyle, setKlStyle] = useState<'solid' | 'dashed' | 'dotted'>('dashed');

  // Action status states
  const [submitting, setSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calculate live Risk:Reward ratio
  const liveRiskReward = useMemo(() => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit1);

    if (isNaN(entry) || isNaN(sl) || isNaN(tp)) return null;

    if (setupDirection === 'long') {
      const risk = entry - sl;
      const reward = tp - entry;
      if (risk <= 0 || reward <= 0) return null;
      return (reward / risk).toFixed(2);
    } else {
      const risk = sl - entry;
      const reward = entry - tp;
      if (risk <= 0 || reward <= 0) return null;
      return (reward / risk).toFixed(2);
    }
  }, [entryPrice, stopLoss, takeProfit1, setupDirection]);

  // Fetch all analyses from DB
  const fetchAnalyses = async () => {
    if (!token) return;
    setLoadingList(true);
    try {
      const res = await fetch('/api/chart-analyses/admin/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnalyses(data.analyses || []);
      }
    } catch (err) {
      console.error('Failed fetching analyses:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, [token]);

  // Reset form to blank template
  const handleResetForm = () => {
    setEditingAnalysisId(null);
    setTitle('');
    setBias('bullish');
    setSummary('');
    setDrawings([]);
    setIncludeTradeSetup(true);
    setSetupDirection('long');
    setEntryPrice('');
    setStopLoss('');
    setTakeProfit1('');
    setTakeProfit2('');
    setTakeProfit3('');
    setSetupStatus('active');
    setInvalidationNotes('');
    setActionFeedback(null);
  };

  // Load existing analysis into form for editing
  const handleLoadAnalysis = (rec: ChartAnalysisRecord) => {
    setEditingAnalysisId(rec.id);
    setSelectedSymbol(rec.symbol);
    setSelectedInterval(rec.interval);
    setTitle(rec.title);
    setBias(rec.bias);
    setSummary(rec.summary || '');
    setDrawings(rec.drawings || []);

    if (rec.tradeSetup) {
      setIncludeTradeSetup(true);
      setSetupDirection(rec.tradeSetup.direction);
      setEntryPrice(rec.tradeSetup.entryPrice ? String(rec.tradeSetup.entryPrice) : '');
      setStopLoss(rec.tradeSetup.stopLoss ? String(rec.tradeSetup.stopLoss) : '');
      setTakeProfit1(rec.tradeSetup.takeProfit1 ? String(rec.tradeSetup.takeProfit1) : '');
      setTakeProfit2(rec.tradeSetup.takeProfit2 ? String(rec.tradeSetup.takeProfit2) : '');
      setTakeProfit3(rec.tradeSetup.takeProfit3 ? String(rec.tradeSetup.takeProfit3) : '');
      setSetupStatus(rec.tradeSetup.status || 'active');
      setInvalidationNotes(rec.tradeSetup.notes || '');
    } else {
      setIncludeTradeSetup(false);
    }

    setActionFeedback({
      type: 'success',
      message: `Loaded "${rec.title}" into studio editor.`,
    });
  };

  // Add drawing items to active drawing list
  const handleAddOrderBlock = () => {
    const high = parseFloat(obHigh);
    const low = parseFloat(obLow);
    if (isNaN(high) || isNaN(low) || high <= low) {
      alert('Please specify valid High and Low price values (High must be greater than Low).');
      return;
    }

    const newOB: OrderBlockDrawing = {
      id: `ob_${Date.now()}`,
      type: 'order_block',
      subType: obSubType,
      label: obLabel.trim() || (obSubType === 'bullish_demand' ? 'Demand OB' : 'Supply OB'),
      priceHigh: high,
      priceLow: low,
      timeframe: selectedInterval,
      color: obSubType === 'bullish_demand' ? '#10b981' : '#f43f5e',
    };

    setDrawings((prev) => [...prev, newOB]);
    setObHigh('');
    setObLow('');
  };

  const handleAddFvg = () => {
    const high = parseFloat(fvgHigh);
    const low = parseFloat(fvgLow);
    if (isNaN(high) || isNaN(low) || high <= low) {
      alert('Please specify valid High and Low price values for the FVG.');
      return;
    }

    const newFvg: FvgDrawing = {
      id: `fvg_${Date.now()}`,
      type: 'fvg',
      subType: fvgSubType,
      label: fvgLabel.trim() || `${fvgSubType === 'bullish' ? 'Bullish' : 'Bearish'} FVG`,
      priceHigh: high,
      priceLow: low,
      timeframe: selectedInterval,
      color: fvgSubType === 'bullish' ? '#f59e0b' : '#38bdf8',
    };

    setDrawings((prev) => [...prev, newFvg]);
    setFvgHigh('');
    setFvgLow('');
  };

  const handleAddKeyLevel = () => {
    const price = parseFloat(klPrice);
    if (isNaN(price)) {
      alert('Please enter a valid price for the Key Level.');
      return;
    }

    const newKL: KeyLevelDrawing = {
      id: `kl_${Date.now()}`,
      type: 'key_level',
      subType: klSubType,
      label: klLabel.trim() || `${klSubType.toUpperCase()}`,
      price,
      lineStyle: klStyle,
      color: klSubType === 'support' || klSubType === 'equal_lows' ? '#34d399' : '#fb7185',
    };

    setDrawings((prev) => [...prev, newKL]);
    setKlPrice('');
  };

  const handleRemoveDrawing = (id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
  };

  // Submit / Save (Draft or Publish)
  const handleSave = async (publishImmediate: boolean) => {
    if (!title.trim()) {
      alert('Please provide an Analysis Title.');
      return;
    }

    let tradeSetupData: AnalysisTradeSetup | undefined = undefined;
    if (includeTradeSetup) {
      const entry = parseFloat(entryPrice);
      const sl = parseFloat(stopLoss);
      const tp1 = parseFloat(takeProfit1);

      if (isNaN(entry) || isNaN(sl) || isNaN(tp1)) {
        alert('Please fill in Entry Price, Stop Loss, and Take Profit 1 for the trade setup.');
        return;
      }

      const tp2 = parseFloat(takeProfit2);
      const tp3 = parseFloat(takeProfit3);
      const rr = liveRiskReward ? parseFloat(liveRiskReward) : 1;

      tradeSetupData = {
        direction: setupDirection,
        entryPrice: entry,
        stopLoss: sl,
        takeProfit1: tp1,
        takeProfit2: isNaN(tp2) ? undefined : tp2,
        takeProfit3: isNaN(tp3) ? undefined : tp3,
        riskRewardRatio: rr,
        status: setupStatus,
        notes: invalidationNotes.trim() || undefined,
      };
    }

    setSubmitting(true);
    setActionFeedback(null);

    const payload = {
      symbol: selectedSymbol,
      interval: selectedInterval,
      title: title.trim(),
      bias,
      summary: summary.trim(),
      drawings,
      tradeSetup: tradeSetupData,
      isPublished: publishImmediate,
    };

    try {
      const endpoint = editingAnalysisId 
        ? `/api/chart-analyses/${editingAnalysisId}` 
        : '/api/chart-analyses';
      const method = editingAnalysisId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          message: publishImmediate 
            ? 'Analysis successfully PUBLISHED to all public visitors in real time!' 
            : 'Analysis successfully saved as DRAFT in PostgreSQL database.',
        });
        if (!editingAnalysisId && data.analysis?.id) {
          setEditingAnalysisId(data.analysis.id);
        }
        fetchAnalyses();
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Failed to save analysis.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Network error saving analysis.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Publish / Unpublish directly from table
  const handleTogglePublish = async (rec: ChartAnalysisRecord) => {
    try {
      const nextState = !rec.isPublished;
      const res = await fetch(`/api/chart-analyses/${rec.id}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublished: nextState }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnalyses((prev) =>
          prev.map((a) => (a.id === rec.id ? { ...a, isPublished: nextState } : a))
        );
        if (editingAnalysisId === rec.id) {
          setActionFeedback({
            type: 'success',
            message: nextState ? 'Analysis is now LIVE' : 'Analysis moved to Drafts',
          });
        }
      } else {
        alert(data.error || 'Failed to toggle status');
      }
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  // Delete analysis
  const handleDeleteAnalysis = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete analysis "${name}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/chart-analyses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnalyses((prev) => prev.filter((a) => a.id !== id));
        if (editingAnalysisId === id) {
          handleResetForm();
        }
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err: any) {
      alert('Error deleting analysis: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 text-slate-200">
      
      {/* Top Banner: Studio Mission & Capabilities */}
      <div className="bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-purple-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">TradingView Master Analysis Studio</h3>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Live Public Sync
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Place institutional SMC Order Blocks, Fair Value Gaps, key liquidity sweeps, and Long/Short trade targets. Published analyses automatically synchronize with the public chart overlay for all visitors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>New Analysis</span>
          </button>
          <button
            type="button"
            onClick={fetchAnalyses}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Asset & Timeframe Bar */}
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-semibold text-slate-300">
          <span>Active Asset & Timeframe</span>
          <button
            type="button"
            onClick={() => setShowTvLiveChart(!showTvLiveChart)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            {showTvLiveChart ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showTvLiveChart ? 'Collapse Chart Preview' : 'Show Chart Preview'}</span>
          </button>
        </div>

        {/* Quick Instrument Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_INSTRUMENTS.map((inst) => {
            const isSelected = selectedSymbol === inst.symbol;
            return (
              <button
                key={inst.symbol}
                type="button"
                onClick={() => {
                  setSelectedSymbol(inst.symbol);
                  setCustomSymbol('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {inst.name}
              </button>
            );
          })}

          {/* Custom Symbol Input */}
          <div className="flex items-center gap-1.5 ml-auto">
            <input
              type="text"
              placeholder="Or custom e.g. BINANCE:ETHUSDT"
              value={customSymbol}
              onChange={(e) => setCustomSymbol(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customSymbol.trim()) {
                  setSelectedSymbol(customSymbol.trim().toUpperCase());
                }
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white placeholder-slate-500 w-44 focus:outline-none focus:border-amber-500/50"
            />
            <button
              type="button"
              onClick={() => {
                if (customSymbol.trim()) {
                  setSelectedSymbol(customSymbol.trim().toUpperCase());
                }
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700 cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Timeframe Chips */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500 uppercase font-mono mr-1">Timeframe:</span>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setSelectedInterval(tf.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                selectedInterval === tf.value
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tf.label}
            </button>
          ))}
          <span className="text-slate-500 text-xs ml-auto font-mono">
            Active: <strong className="text-white">{selectedSymbol} ({selectedInterval})</strong>
          </span>
        </div>
      </div>

      {/* Live TradingView Preview Container with Full Drawing Tools */}
      {showTvLiveChart && (
        <div className="bg-[#090D17] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 bg-[#0C1220] border-b border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-white tracking-wide">Interactive TradingView Analysis Canvas</span>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded font-mono text-[10px]">
                {selectedSymbol}
              </span>
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold hidden sm:inline">
                Drawing Tools Active
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">Use the left sidebar tools to draw Trendlines, Fibonacci, Order Block boxes, and text</span>
              <a
                href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selectedSymbol)}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1 font-semibold"
              >
                Full TV Browser <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="w-full h-[520px]">
            <TradingViewWidget
              key={`${selectedSymbol}-${selectedInterval}`}
              symbol={selectedSymbol}
              interval={selectedInterval}
              theme="dark"
              enableDrawingTools={true}
              height="520px"
              className="min-h-[520px]"
            />
          </div>
        </div>
      )}

      {/* Main Studio Editor: Two-Column Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Analysis Header, Bias & Drawing Items */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Section 1: Analysis Details */}
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-400" />
                <span>1. Analysis Overview & Directional Bias</span>
              </h4>
              {editingAnalysisId && (
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono">
                  Editing: {editingAnalysisId}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Analysis Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gold NY Session Liquidity Sweep & Institutional Demand OB"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-medium"
                />
              </div>

              {/* Directional Bias Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Directional Bias
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBias('bullish')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      bias === 'bullish'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Bullish 🟢</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBias('bearish')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      bias === 'bearish'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    <span>Bearish 🔴</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBias('neutral')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      bias === 'neutral'
                        ? 'bg-slate-700/40 text-slate-200 border-slate-600 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    <span>Neutral Range ⚪</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Institutional Commentary & SMC Rationale
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain market structure, liquidity targets, why this zone holds edge, session timing (London/NY), and invalidation criteria..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Drawing & SMC Zones Toolset */}
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>2. Add Institutional Levels & SMC Zones ({drawings.length})</span>
              </h4>
            </div>

            {/* Drawing Sub-Type Picker */}
            <div className="flex items-center gap-2 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDrawingTypeToAdd('order_block')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  drawingTypeToAdd === 'order_block'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Order Block (OB)
              </button>
              <button
                type="button"
                onClick={() => setDrawingTypeToAdd('fvg')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  drawingTypeToAdd === 'fvg'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fair Value Gap (FVG)
              </button>
              <button
                type="button"
                onClick={() => setDrawingTypeToAdd('key_level')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                  drawingTypeToAdd === 'key_level'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Key Price Level
              </button>
            </div>

            {/* Form for Order Block */}
            {drawingTypeToAdd === 'order_block' && (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Zone Type:</span>
                  <button
                    type="button"
                    onClick={() => setObSubType('bullish_demand')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                      obSubType === 'bullish_demand'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    🟢 Demand Zone
                  </button>
                  <button
                    type="button"
                    onClick={() => setObSubType('bearish_supply')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                      obSubType === 'bearish_supply'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    🔴 Supply Zone
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Upper Bound (High Price) *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2942.50"
                      value={obHigh}
                      onChange={(e) => setObHigh(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Lower Bound (Low Price) *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2936.00"
                      value={obLow}
                      onChange={(e) => setObLow(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[11px] text-slate-400 block mb-1">Zone Label</label>
                    <input
                      type="text"
                      placeholder="e.g. M15 Refined Demand OB"
                      value={obLabel}
                      onChange={(e) => setObLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddOrderBlock}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Order Block to Drawing Stack</span>
                </button>
              </div>
            )}

            {/* Form for FVG */}
            {drawingTypeToAdd === 'fvg' && (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">FVG Bias:</span>
                  <button
                    type="button"
                    onClick={() => setFvgSubType('bullish')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                      fvgSubType === 'bullish'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Bullish FVG
                  </button>
                  <button
                    type="button"
                    onClick={() => setFvgSubType('bearish')}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                      fvgSubType === 'bearish'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    Bearish FVG
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">FVG High *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2940.00"
                      value={fvgHigh}
                      onChange={(e) => setFvgHigh(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">FVG Low *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2937.50"
                      value={fvgLow}
                      onChange={(e) => setFvgLow(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[11px] text-slate-400 block mb-1">Label</label>
                    <input
                      type="text"
                      placeholder="e.g. 15m Fair Value Gap"
                      value={fvgLabel}
                      onChange={(e) => setFvgLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddFvg}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Fair Value Gap to Stack</span>
                </button>
              </div>
            )}

            {/* Form for Key Level */}
            {drawingTypeToAdd === 'key_level' && (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Level Category</label>
                    <select
                      value={klSubType}
                      onChange={(e) => setKlSubType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    >
                      <option value="support">Support</option>
                      <option value="resistance">Resistance</option>
                      <option value="equal_highs">Equal Highs (BSL)</option>
                      <option value="equal_lows">Equal Lows (SSL)</option>
                      <option value="daily_open">Daily Open</option>
                      <option value="session_high">Session High</option>
                      <option value="session_low">Session Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Exact Price *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2950.00"
                      value={klPrice}
                      onChange={(e) => setKlPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Line Style</label>
                    <select
                      value={klStyle}
                      onChange={(e) => setKlStyle(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    >
                      <option value="solid">Solid ───</option>
                      <option value="dashed">Dashed - - -</option>
                      <option value="dotted">Dotted · · ·</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Label</label>
                    <input
                      type="text"
                      placeholder="e.g. PDH 2950"
                      value={klLabel}
                      onChange={(e) => setKlLabel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddKeyLevel}
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Key Level to Stack</span>
                </button>
              </div>
            )}

            {/* Active Drawing Items Stack */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 block font-semibold">
                Current Drawing Stack ({drawings.length})
              </span>

              {drawings.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No custom SMC zones or levels added yet. Use the controls above to place Demand OBs, Supply Zones, or FVGs.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {drawings.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color || '#f59e0b' }}
                        ></span>
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{item.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.type === 'order_block' && (
                              <>OB: {item.priceLow} - {item.priceHigh}</>
                            )}
                            {item.type === 'fvg' && (
                              <>FVG: {item.priceLow} - {item.priceHigh}</>
                            )}
                            {item.type === 'key_level' && (
                              <>Level: {item.price} ({item.lineStyle})</>
                            )}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDrawing(item.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Right Column (5 cols): Trade Setup Calculator & Publish Controls */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Section 3: Trade Setup Calculator */}
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>3. Trade Setup & Risk:Reward</span>
              </h4>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={includeTradeSetup}
                  onChange={(e) => setIncludeTradeSetup(e.target.checked)}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0"
                />
                <span>Include</span>
              </label>
            </div>

            {includeTradeSetup && (
              <div className="space-y-3 text-xs">
                {/* Direction Switcher */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSetupDirection('long')}
                    className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      setupDirection === 'long'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    LONG / BUY 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupDirection('short')}
                    className={`py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      setupDirection === 'short'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    SHORT / SELL 🔴
                  </button>
                </div>

                {/* Live Risk Reward Badge */}
                <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400 font-medium text-xs">Calculated R:R Ratio:</span>
                  <span className={`font-mono text-sm font-black ${
                    liveRiskReward ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {liveRiskReward ? `1 : ${liveRiskReward}` : 'Awaiting Prices'}
                  </span>
                </div>

                {/* Price Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Entry Price *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2938.00"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500/50 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-rose-400 block mb-1 font-semibold">Stop Loss (SL) *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2928.00"
                      value={stopLoss}
                      onChange={(e) => setStopLoss(e.target.value)}
                      className="w-full bg-slate-900 border border-rose-900/40 rounded-lg px-2.5 py-1.5 text-rose-300 font-mono text-xs focus:outline-none focus:border-rose-500 font-bold"
                    />
                  </div>
                </div>

                {/* Targets */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-emerald-400 block mb-1 font-semibold">Take Profit 1 *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2955.00"
                      value={takeProfit1}
                      onChange={(e) => setTakeProfit1(e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-900/40 rounded-lg px-2 py-1.5 text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-emerald-400 block mb-1 font-semibold">Take Profit 2</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2970.00"
                      value={takeProfit2}
                      onChange={(e) => setTakeProfit2(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-emerald-300 font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-emerald-400 block mb-1 font-semibold">Take Profit 3</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 2990.00"
                      value={takeProfit3}
                      onChange={(e) => setTakeProfit3(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-emerald-300 font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status & Invalidation */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Setup Status</label>
                    <select
                      value={setupStatus}
                      onChange={(e) => setSetupStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    >
                      <option value="active">Active Execution</option>
                      <option value="pending">Pending Limit Order</option>
                      <option value="tp_hit">Target Hit (Win)</option>
                      <option value="sl_hit">Invalidated (SL Hit)</option>
                      <option value="closed">Closed / Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Invalidation Swing</label>
                    <input
                      type="text"
                      placeholder="e.g. 15m Swing Low Breached"
                      value={invalidationNotes}
                      onChange={(e) => setInvalidationNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Action Controls & Persistence */}
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Publishing & Postgres Storage</span>
            </h4>

            <p className="text-[11px] text-slate-400">
              Saving as Draft keeps this analysis private to admins. Publishing makes it immediately visible as an overlay on the public chart.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave(true)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Saving...' : 'Publish to Live Public Visitors'}</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSave(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-slate-400" />
                <span>Save as Private Admin Draft</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Database History Table: All Analyses Saved in PostgreSQL */}
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Saved Analyses in PostgreSQL ({analyses.length})</span>
            </h4>
            <span className="text-xs text-slate-500">
              Manage, edit, publish, or remove existing market analyses
            </span>
          </div>

          <span className="text-xs font-mono text-slate-400">
            Database: <strong className="text-emerald-400">Render Cloud PostgreSQL</strong>
          </span>
        </div>

        {loadingList ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Loading PostgreSQL analyses...</span>
          </div>
        ) : analyses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No analyses saved in database yet. Create your first analysis using the studio form above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#080C14] text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Asset & Interval</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Bias</th>
                  <th className="py-2.5 px-3">SMC Elements</th>
                  <th className="py-2.5 px-3">Author</th>
                  <th className="py-2.5 px-3">Last Updated</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {analyses.map((rec) => {
                  const isCurrentEditing = editingAnalysisId === rec.id;
                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-slate-900/60 transition-colors ${
                        isCurrentEditing ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      {/* Status */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(rec)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            rec.isPublished
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                          }`}
                          title="Click to toggle Draft / Live"
                        >
                          {rec.isPublished ? '● LIVE' : '○ Draft'}
                        </button>
                      </td>

                      {/* Asset */}
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-white">{rec.symbol}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">({rec.interval})</span>
                      </td>

                      {/* Title */}
                      <td className="py-3 px-3 max-w-xs truncate font-medium text-slate-200">
                        {rec.title}
                      </td>

                      {/* Bias */}
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          rec.bias === 'bullish'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : rec.bias === 'bearish'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {rec.bias}
                        </span>
                      </td>

                      {/* SMC Elements */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {rec.drawings?.length || 0} zones
                        {rec.tradeSetup && (
                          <span className="text-amber-400 ml-1.5 font-bold">
                            • Setup (1:{rec.tradeSetup.riskRewardRatio})
                          </span>
                        )}
                      </td>

                      {/* Author */}
                      <td className="py-3 px-3 text-slate-400">
                        @{rec.authorUsername}
                      </td>

                      {/* Updated At */}
                      <td className="py-3 px-3 text-[11px] text-slate-500 font-mono">
                        {new Date(rec.updatedAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadAnalysis(rec)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-[11px] rounded-lg border border-slate-700 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnalysis(rec.id, rec.title)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
