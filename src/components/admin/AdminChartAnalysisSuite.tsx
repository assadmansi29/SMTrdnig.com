import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Globe, 
  BarChart2, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Crosshair, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ChartAnalysisRecord, AnalysisBias, ChartDrawing, AnalysisTradeSetup } from '../../types';

interface AdminChartAnalysisSuiteProps {
  symbol: string;
  interval: string;
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  onOpenMasterStudio?: () => void;
  onAnalysisUpdated?: () => void;
}

export const AdminChartAnalysisSuite: React.FC<AdminChartAnalysisSuiteProps> = ({
  symbol,
  interval,
  isDrawingMode,
  onToggleDrawingMode,
  onOpenMasterStudio,
  onAnalysisUpdated,
}) => {
  const { user, token } = useAuth();
  
  // STRICT ROLE-BASED ACCESS CONTROL: Only Super Admin and Admin have access
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const hasAccess = isSuperAdmin || isAdmin;

  // Drawer state
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [bias, setBias] = useState<AnalysisBias>('bullish');
  const [summary, setSummary] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Trade Setup fields
  const [hasTradeSetup, setHasTradeSetup] = useState(true);
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit1, setTakeProfit1] = useState('');
  const [takeProfit2, setTakeProfit2] = useState('');
  const [tradeNotes, setTradeNotes] = useState('');

  // SMC Drawings / Zones
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);

  const cleanSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;

  // Fetch existing analysis for this symbol if available
  const loadExistingAnalysis = async () => {
    if (!token || !hasAccess) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/chart-analyses?symbol=${encodeURIComponent(cleanSymbol)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.analyses && data.analyses.length > 0) {
        const found = data.analyses[0] as ChartAnalysisRecord;
        setActiveAnalysisId(found.id);
        setTitle(found.title);
        setBias(found.bias);
        setSummary(found.summary || '');
        setIsPublished(found.isPublished);
        setDrawings(found.drawings || []);
        if (found.tradeSetup) {
          setHasTradeSetup(true);
          setEntryPrice(String(found.tradeSetup.entryPrice));
          setStopLoss(String(found.tradeSetup.stopLoss));
          setTakeProfit1(String(found.tradeSetup.takeProfit1));
          setTakeProfit2(found.tradeSetup.takeProfit2 ? String(found.tradeSetup.takeProfit2) : '');
          setTradeNotes(found.tradeSetup.notes || '');
        }
      } else {
        // Reset to default new form
        setActiveAnalysisId(null);
        setTitle(`[${cleanSymbol}] Institutional SMC Order Flow & Liquidity Setup`);
        setBias('bullish');
        setSummary('');
        setIsPublished(true);
        setDrawings([]);
        setEntryPrice('');
        setStopLoss('');
        setTakeProfit1('');
        setTakeProfit2('');
        setTradeNotes('');
      }
    } catch (err) {
      console.error('Error checking existing analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadExistingAnalysis();
    }
  }, [symbol, interval, hasAccess, token]);

  // If user is not Super Admin or Admin, return null immediately
  if (!hasAccess || !user) {
    return null;
  }

  // Calculate live Risk:Reward ratio
  const calculateRR = () => {
    const ep = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp1 = parseFloat(takeProfit1);
    if (!ep || !sl || !tp1 || isNaN(ep) || isNaN(sl) || isNaN(tp1)) return '0.0';
    const risk = Math.abs(ep - sl);
    const reward = Math.abs(tp1 - ep);
    if (risk === 0) return '0.0';
    return (reward / risk).toFixed(2);
  };

  // Quick preset SMC zones
  const addPresetDrawing = (type: 'order_block' | 'fvg' | 'liquidity_pool' | 'horizontal_line') => {
    const newId = `smc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const ep = parseFloat(entryPrice) || 2650;
    
    if (type === 'order_block') {
      const isDemand = bias === 'bullish';
      setDrawings(prev => [
        ...prev,
        {
          id: newId,
          type: 'order_block',
          label: isDemand ? 'Demand OB (H4/M15)' : 'Supply OB (H4/M15)',
          color: isDemand ? '#10B981' : '#F43F5E',
          subType: isDemand ? 'bullish_demand' : 'bearish_supply',
          priceHigh: parseFloat((ep + 5).toFixed(2)),
          priceLow: parseFloat((ep - 5).toFixed(2)),
          timeframe: interval || '15',
          tested: false
        }
      ]);
    } else if (type === 'fvg') {
      setDrawings(prev => [
        ...prev,
        {
          id: newId,
          type: 'fvg',
          label: 'Fair Value Gap (FVG)',
          color: '#06B6D4',
          subType: bias === 'bullish' ? 'bullish' : 'bearish',
          priceHigh: parseFloat((ep + 3).toFixed(2)),
          priceLow: parseFloat((ep - 3).toFixed(2)),
          timeframe: interval || '15'
        }
      ]);
    } else if (type === 'liquidity_pool') {
      setDrawings(prev => [
        ...prev,
        {
          id: newId,
          type: 'key_level',
          label: bias === 'bullish' ? 'Sell-Side Liquidity (SSL)' : 'Buy-Side Liquidity (BSL)',
          color: '#F59E0B',
          subType: bias === 'bullish' ? 'equal_lows' : 'equal_highs',
          price: parseFloat(ep.toFixed(2)),
          lineStyle: 'dashed'
        }
      ]);
    } else {
      setDrawings(prev => [
        ...prev,
        {
          id: newId,
          type: 'key_level',
          label: 'Institutional Level',
          color: '#8B5CF6',
          subType: 'support',
          price: parseFloat(ep.toFixed(2)),
          lineStyle: 'solid'
        }
      ]);
    }
  };

  const removeDrawing = (id: string) => {
    setDrawings(prev => prev.filter(d => d.id !== id));
  };

  // Submit to PostgreSQL API
  const handleSaveAndPublish = async (publishNow = true) => {
    if (!title.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide an Analysis Title' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    let setupObj: AnalysisTradeSetup | undefined = undefined;
    if (hasTradeSetup && entryPrice && stopLoss && takeProfit1) {
      setupObj = {
        direction: bias === 'bearish' ? 'short' : 'long',
        entryPrice: parseFloat(entryPrice) || 0,
        stopLoss: parseFloat(stopLoss) || 0,
        takeProfit1: parseFloat(takeProfit1) || 0,
        takeProfit2: takeProfit2 ? parseFloat(takeProfit2) : undefined,
        riskRewardRatio: parseFloat(calculateRR()) || 1.0,
        status: 'pending',
        notes: tradeNotes
      };
    }

    const payload = {
      symbol: cleanSymbol,
      interval: interval || '15',
      title: title.trim(),
      bias,
      summary: summary.trim(),
      drawings,
      tradeSetup: setupObj,
      isPublished: publishNow
    };

    try {
      const url = activeAnalysisId 
        ? `/api/chart-analyses/${activeAnalysisId}` 
        : '/api/chart-analyses';
      const method = activeAnalysisId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveAnalysisId(data.analysis.id);
        setStatusMessage({
          type: 'success',
          text: publishNow 
            ? `Analysis published to PostgreSQL! All visitors now see this on ${cleanSymbol}.`
            : `Analysis draft saved successfully to PostgreSQL.`
        });
        if (onAnalysisUpdated) {
          onAnalysisUpdated();
        }
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to save analysis' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Network error: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // Delete analysis
  const handleDelete = async () => {
    if (!activeAnalysisId || !token) return;
    if (!confirm('Are you sure you want to delete and unpublish this analysis?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/chart-analyses/${activeAnalysisId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveAnalysisId(null);
        setTitle(`[${cleanSymbol}] Institutional SMC Order Flow & Liquidity Setup`);
        setDrawings([]);
        setEntryPrice('');
        setStopLoss('');
        setTakeProfit1('');
        setStatusMessage({ type: 'success', text: 'Analysis removed from database.' });
        if (onAnalysisUpdated) onAnalysisUpdated();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to delete' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[800px] mx-auto mb-3">
      {/* 1. Admin Suite Header Bar */}
      <div className="bg-gradient-to-r from-amber-950/40 via-[#0D1322] to-amber-950/30 border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 shadow-xl flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Left: Role indicator & symbol status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-black text-xs tracking-wide">
                TradingView Admin Studio
              </span>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase">
                {isSuperAdmin ? 'Super Admin' : 'Admin'} Access
              </span>
              {activeAnalysisId ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Live on Public Chart
                </span>
              ) : (
                <span className="bg-slate-800 text-slate-400 text-[9.5px] px-2 py-0.5 rounded-full font-mono">
                  No Analysis on {cleanSymbol}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Analyst: <strong className="text-slate-200">@{user.username}</strong> • Draw, place institutional levels, and publish live to visitors.
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Drawing Tools Mode Toggle */}
          <button
            type="button"
            onClick={onToggleDrawingMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isDrawingMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Toggle expanded chart view with TradingView side drawing tools"
          >
            {isDrawingMode ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isDrawingMode ? 'Compact View' : 'Drawing Studio'}</span>
          </button>

          {/* Record / Edit Analysis Drawer Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isOpen ? 'Close Setup' : activeAnalysisId ? 'Edit Analysis' : 'Do Analysis'}</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Open Master Studio Tab */}
          {onOpenMasterStudio && (
            <button
              type="button"
              onClick={onOpenMasterStudio}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
              title="Open full master studio in admin modal"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Analysis Form & SMC Setup Drawer */}
      {isOpen && (
        <div className="mt-2.5 bg-[#0C111E] border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
          
          {/* Status Message Notification */}
          {statusMessage && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200' 
                : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            }`}>
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setStatusMessage(null)}
                className="opacity-70 hover:opacity-100 cursor-pointer ml-2 text-[10px]"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">
                {activeAnalysisId ? 'Update Published SMC Setup' : 'Create New Chart Setup'}
              </h4>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                {cleanSymbol} • {interval}m
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadExistingAnalysis}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                title="Reload from PostgreSQL"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Title & Directional Bias (7 cols) */}
            <div className="md:col-span-7 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Analysis Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Gold NY Session Liquidity Sweep & Institutional Demand OB"
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              {/* Bias selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Directional Bias
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBias('bullish')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      bias === 'bullish'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Bullish 🟢</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBias('bearish')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      bias === 'bearish'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    <span>Bearish 🔴</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBias('neutral')}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      bias === 'neutral'
                        ? 'bg-slate-700/40 text-slate-200 border-slate-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>Neutral ⚪</span>
                  </button>
                </div>
              </div>

              {/* Commentary */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Institutional Commentary & SMC Execution Plan
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Explain the order block tap, liquidity sweep, session timing, and invalidation rules..."
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            {/* Execution Coordinates (Entry, SL, TP) (5 cols) */}
            <div className="md:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <span>Execution Coordinates</span>
                </span>
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded">
                  R:R 1:{calculateRR()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">ENTRY PRICE</label>
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder="e.g. 2655.50"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-rose-400 mb-0.5">STOP LOSS</label>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    placeholder="e.g. 2648.00"
                    className="w-full bg-slate-950 border border-rose-900/50 rounded-lg px-2.5 py-1.5 text-xs font-mono text-rose-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-emerald-400 mb-0.5">TAKE PROFIT 1</label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit1}
                    onChange={(e) => setTakeProfit1(e.target.value)}
                    placeholder="e.g. 2680.00"
                    className="w-full bg-slate-950 border border-emerald-900/50 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-emerald-400 mb-0.5">TAKE PROFIT 2</label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit2}
                    onChange={(e) => setTakeProfit2(e.target.value)}
                    placeholder="e.g. 2700.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick SMC Zones Section */}
          <div className="border-t border-slate-800 pt-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mark Institutional SMC Zones ({drawings.length})</span>
              </span>

              {/* Quick Add Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => addPresetDrawing('order_block')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-semibold rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>+ Order Block</span>
                </button>
                <button
                  type="button"
                  onClick={() => addPresetDrawing('fvg')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-cyan-400" />
                  <span>+ FVG Gap</span>
                </button>
                <button
                  type="button"
                  onClick={() => addPresetDrawing('liquidity_pool')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-semibold rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-amber-400" />
                  <span>+ Liquidity Pool</span>
                </button>
              </div>
            </div>

            {/* List of active drawings */}
            {drawings.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {drawings.map((d) => (
                  <div 
                    key={d.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-2 px-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }}></span>
                      <span className="font-semibold text-white truncate text-[11px]">{d.label}</span>
                      {'priceHigh' in d && 'priceLow' in d && (
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {d.priceLow} - {d.priceHigh}
                        </span>
                      )}
                      {'price' in d && (
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          @ {d.price}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDrawing(d.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors shrink-0"
                      title="Remove zone"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer Bar */}
          <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {activeAnalysisId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Unpublish & Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={() => handleSaveAndPublish(false)}
                disabled={saving}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5 text-slate-400" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveAndPublish(true)}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{saving ? 'Publishing...' : '🚀 Publish Live to All Visitors'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
