import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  ArrowRight,
  Copy,
  Check,
  Bot,
  Zap,
  Activity,
  Layers,
  ChevronRight,
  Sliders,
  DollarSign
} from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { AIAnalysisResponse } from '../../../server/routes/aiRoutes';

interface AiTradingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  interval: string;
  currentPrice: number;
  candles: any[];
  reactionZones: any[];
  onApplyDrawingsToChart?: (drawings: any[]) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiTradingAssistantModal: React.FC<AiTradingAssistantModalProps> = ({
  isOpen,
  onClose,
  symbol,
  interval,
  currentPrice,
  candles,
  reactionZones,
  onApplyDrawingsToChart,
}) => {
  const { language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<AIAnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [appliedToChart, setAppliedToChart] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const cleanSymbol = symbol.replace(/^(OANDA:|BINANCE:|CME_MINI:|NASDAQ:|TVC:)/, '');

  // Fetch initial AI Analysis on opening
  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
      if (messages.length === 0) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: language === 'ar'
              ? `مرحباً بك في المساعد الذكي المؤسسي (AI Copilot). أقوم بمراقبة مناطق رد الفعل (Reaction Zones) وهيكل السوق SMC على إطار 5 دقائق لـ ${cleanSymbol}. كيف يمكنني مساعدتك اليوم؟`
              : `Welcome to the Institutional AI Copilot. I am actively tracking Smart Money Concepts, 5-minute Reaction Zones, and 20-30 points risk containment for ${cleanSymbol}. How can I assist your execution?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }
  }, [isOpen, symbol, interval]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setAppliedToChart(false);
    try {
      const payloadZones = (reactionZones || []).map((z: any) => ({
        id: z.id,
        price: z.anchors?.[0]?.price || z.price,
        zoneType: z.zoneType || (z.options?.zoneType === 'weak' ? 'weak' : 'strong'),
        label: z.options?.labelText || (z.zoneType === 'weak' ? 'Weak Reaction Zone' : 'Strong Reaction Zone'),
      }));

      const res = await fetch('/api/ai/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: cleanSymbol,
          interval: String(interval),
          currentPrice: currentPrice || 2900,
          candles: (candles || []).slice(-40),
          reactionZones: payloadZones,
          language,
        }),
      });

      const json = await res.json();
      if (json.status === 'ok' && json.data) {
        setAnalysisData(json.data);
      }
    } catch (err) {
      console.error('[AI Assistant] Error fetching analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isChatSending) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsChatSending(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payloadZones = (reactionZones || []).map((z: any) => ({
        id: z.id,
        price: z.anchors?.[0]?.price || z.price,
        zoneType: z.zoneType || 'strong',
      }));

      const res = await fetch('/api/ai/copilot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          symbol: cleanSymbol,
          interval: String(interval),
          currentPrice,
          reactionZones: payloadZones,
          language,
        }),
      });

      const json = await res.json();
      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: json.reply || 'Analysis completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[AI Assistant] Error in copilot chat:', err);
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: 'Unable to reach the AI Copilot service at this moment. Please check your network or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatSending(false);
    }
  };

  const handleCopySetup = () => {
    if (!analysisData) return;
    const { tradeSetup, symbol, interval, rationale } = analysisData;
    const text = `🎯 SMTrading AI Plan [${symbol} - ${interval}m]
━━━━━━━━━━━━━━━━━━━━━━
⚡ Action: ${tradeSetup.action}
📍 Entry: ${tradeSetup.entryPrice.toFixed(2)}
🛑 Stop Loss: ${tradeSetup.stopLossPrice.toFixed(2)} (${tradeSetup.riskPoints} pts risk)
🎯 TP1: ${tradeSetup.tp1.toFixed(2)}
🎯 TP2: ${tradeSetup.tp2.toFixed(2)}
🎯 TP3: ${tradeSetup.tp3.toFixed(2)}
⚖️ R:R: ${tradeSetup.riskRewardRatio} | Confidence: ${tradeSetup.confidenceScore}%
━━━━━━━━━━━━━━━━━━━━━━
🧠 Rationale: ${rationale}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApplyToChart = async () => {
    if (!analysisData) return;
    try {
      const res = await fetch('/api/ai/generate-chart-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrice: analysisData.tradeSetup.entryPrice,
          action: analysisData.tradeSetup.action === 'BUY' ? 'BUY' : 'SELL',
          symbol: cleanSymbol,
        }),
      });

      const json = await res.json();
      if (json.status === 'ok' && json.plan?.drawings && onApplyDrawingsToChart) {
        onApplyDrawingsToChart(json.plan.drawings);
        setAppliedToChart(true);
        setTimeout(() => setAppliedToChart(false), 3000);
      }
    } catch (err) {
      console.error('[AI Assistant] Error applying plan to chart:', err);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      id="modal-ai-trading-assistant"
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#090D16] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-black flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-200 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle Bar on mobile */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto sm:hidden mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0C111C]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">AI Trading Copilot</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="text-amber-300 font-bold">{cleanSymbol}</span>
                <span>•</span>
                <span>{interval}m Timeframe</span>
                <span>•</span>
                <span>SMC & Reaction Zones</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAnalysis}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              title="Refresh AI Analysis"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#070A12] px-4">
          <button
            type="button"
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'analysis'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>AI Strategy Plan (Reaction Zones)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Copilot Chat</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'analysis' ? (
            loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full border-3 border-amber-500/20 border-t-amber-400 animate-spin flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <p className="text-sm font-medium text-slate-300">Evaluating 5m Reaction Zones & Institutional Order Flow...</p>
                <p className="text-xs text-slate-400 font-mono">Running Gemini 3.8 Flash SMC Engine</p>
              </div>
            ) : analysisData ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Top Status Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Trend & Bias */}
                  <div className="p-3.5 rounded-xl bg-[#0E1424] border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-slate-400 uppercase">Institutional Bias</div>
                      <div className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                        {analysisData.trend === 'BULLISH' ? (
                          <>
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">Bullish Order Flow</span>
                          </>
                        ) : analysisData.trend === 'BEARISH' ? (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            <span className="text-red-400">Bearish Supply Flow</span>
                          </>
                        ) : (
                          <>
                            <Activity className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400">Range Equilibrium</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Active Reaction Zone */}
                  <div className="p-3.5 rounded-xl bg-[#0E1424] border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">Active Reaction Zone</div>
                    <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
                      {analysisData.activeZone ? (
                        <>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              analysisData.activeZone.zoneType === 'strong' ? 'bg-red-500' : 'bg-emerald-500'
                            }`}
                          />
                          <span>
                            {analysisData.activeZone.zoneType === 'strong' ? 'Strong (Supply)' : 'Weak (Demand)'} @{' '}
                            {analysisData.activeZone.price.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">No zone in immediate range</span>
                      )}
                    </div>
                    {analysisData.activeZone && (
                      <div className="text-[10px] font-mono text-amber-400 mt-1">
                        State: {analysisData.activeZone.interactionState} ({analysisData.activeZone.distancePoints} pts away)
                      </div>
                    )}
                  </div>

                  {/* Risk Parameters */}
                  <div className="p-3.5 rounded-xl bg-[#0E1424] border border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400 uppercase">Risk Protocol</div>
                    <div className="text-sm font-bold text-amber-300 mt-0.5">
                      Stop Loss: {analysisData.tradeSetup.riskPoints} pts max
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      R:R {analysisData.tradeSetup.riskRewardRatio} • Score {analysisData.tradeSetup.confidenceScore}%
                    </div>
                  </div>
                </div>

                {/* Primary Execution Blueprint Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#0A0F1D] border border-amber-500/25 shadow-xl relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-sm ${
                          analysisData.tradeSetup.action === 'BUY'
                            ? 'bg-emerald-500 text-slate-950'
                            : analysisData.tradeSetup.action === 'SELL'
                            ? 'bg-red-500 text-white'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>ACTION: {analysisData.tradeSetup.action}</span>
                      </div>
                      <span className="text-xs font-mono text-slate-300">
                        Entry: <strong className="text-white text-sm">{analysisData.tradeSetup.entryPrice.toFixed(2)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySetup}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied!' : 'Copy Setup'}</span>
                      </button>

                      {onApplyDrawingsToChart && (
                        <button
                          type="button"
                          onClick={handleApplyToChart}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{appliedToChart ? 'Applied to Chart!' : 'Apply to Chart'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Level Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-red-500/30">
                      <div className="text-[10px] font-mono text-red-400 uppercase flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>Stop Loss (Strict)</span>
                      </div>
                      <div className="text-sm font-mono font-bold text-white mt-1">
                        {analysisData.tradeSetup.stopLossPrice.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-mono text-red-300 mt-0.5">
                        20-30 pts zone buffer
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/20">
                      <div className="text-[10px] font-mono text-emerald-400 uppercase flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span>Take Profit 1 (50%)</span>
                      </div>
                      <div className="text-sm font-mono font-bold text-white mt-1">
                        {analysisData.tradeSetup.tp1.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">Move SL to BE</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/20">
                      <div className="text-[10px] font-mono text-emerald-400 uppercase flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span>Take Profit 2</span>
                      </div>
                      <div className="text-sm font-mono font-bold text-white mt-1">
                        {analysisData.tradeSetup.tp2.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">Structural Swing</div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/20">
                      <div className="text-[10px] font-mono text-emerald-400 uppercase flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        <span>Take Profit 3 (Runner)</span>
                      </div>
                      <div className="text-sm font-mono font-bold text-white mt-1">
                        {analysisData.tradeSetup.tp3.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">Liquidity Pool</div>
                    </div>
                  </div>

                  {/* Institutional Rationale */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <span className="font-semibold text-amber-300">Strategic Rationale: </span>
                    {analysisData.rationale}
                  </div>
                </div>

                {/* Step-by-Step Playbook Checklist */}
                <div className="p-4 rounded-xl bg-[#0C111C] border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>5-Minute Execution Playbook</span>
                  </h4>
                  <div className="space-y-2">
                    {analysisData.executionPlaybook.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <span className="leading-snug">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            /* Interactive AI Copilot Chat */
            <div className="flex flex-col h-[400px]">
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                          : 'bg-[#111728] border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      <div
                        className={`text-[9px] font-mono mt-1 ${
                          m.role === 'user' ? 'text-slate-900/70 text-right' : 'text-slate-400'
                        }`}
                      >
                        {m.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
                {isChatSending && (
                  <div className="flex gap-2.5 items-center">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-[#111728] border border-slate-800 text-slate-400 text-xs px-3 py-2 rounded-2xl">
                      Copilot is thinking...
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Prompts */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-t border-slate-800 mt-2">
                {[
                  'Explain current 5m reaction zone setup',
                  'Calculate lot size for $500 risk',
                  'Is Stop Loss strictly 20-30 points?',
                ].map((promptText, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(promptText)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                  >
                    {promptText}
                  </button>
                ))}
              </div>

              {/* Input field */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 pt-2 border-t border-slate-800"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask AI Copilot about Reaction Zones, SMC setups, or risk calculations..."
                  className="flex-1 bg-[#0E1526] border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isChatSending}
                  className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
