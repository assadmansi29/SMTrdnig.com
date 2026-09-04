import React, { useState, useEffect, useCallback } from 'react';
import { Send, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Clock, Globe, ShieldCheck, Zap, Bell, Check, Sparkles } from 'lucide-react';

interface TelegramBotTabProps {
  token: string | null;
  onRefreshStats?: () => void;
}

interface SchedulerStatus {
  running: boolean;
  lastSyncTime: string | null;
  lastSyncStatus: string;
  lastSyncError: string | null;
  biquoteConfigured: boolean;
  biquoteUrl?: string;
  telegramConfigured: boolean;
  telegramDetails: {
    configured: boolean;
    enabled: boolean;
    channelId: string;
    tokenMasked: string;
    rateLimitedUntil: string | null;
    configuredTimezone?: string;
  };
}

interface EconomicStats {
  totalEventsTracked: number;
  highImpactCount: number;
  notificationsSent: number;
  notificationsPending: number;
  notificationsFailed: number;
  lastEventDateUtc: string | null;
}

interface EconomicEventItem {
  id: string;
  calendarId: string;
  dateUtc: string;
  country: string;
  currency: string;
  event: string;
  category: string;
  importance: number;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  revised: string | null;
  unit: string | null;
}

const COMMON_TIMEZONES = [
  { label: 'Riyadh / Saudi Arabia (GMT+3)', value: 'Asia/Riyadh' },
  { label: 'Dubai / UAE (GST, GMT+4)', value: 'Asia/Dubai' },
  { label: 'Cairo / Egypt (EET, GMT+2/3)', value: 'Africa/Cairo' },
  { label: 'Kuwait / Qatar (GMT+3)', value: 'Asia/Kuwait' },
  { label: 'Amman / Jordan (GMT+3)', value: 'Asia/Amman' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'New York (EDT/EST)', value: 'America/New_York' },
  { label: 'Universal Time (UTC)', value: 'UTC' },
  { label: 'Auto (Browser Local)', value: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh' },
];

export const TelegramBotTab: React.FC<TelegramBotTabProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null);
  const [stats, setStats] = useState<EconomicStats | null>(null);
  const [events, setEvents] = useState<EconomicEventItem[]>([]);
  const [testLoading, setTestLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [savingTz, setSavingTz] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('Asia/Riyadh');
  const [previewTab, setPreviewTab] = useState<'reminder' | 'release'>('reminder');

  const fetchStatusAndEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setActionFeedback(null);
    try {
      const [statusRes, eventsRes] = await Promise.all([
        fetch('/api/telegram/status', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/telegram/events', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setScheduler(statusData.scheduler);
        setStats(statusData.statistics);
        if (statusData.telegram?.configuredTimezone) {
          setSelectedTimezone(statusData.telegram.configuredTimezone);
        }
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }
    } catch (err: any) {
      console.error('Failed to load Telegram bot status:', err);
      setActionFeedback({ type: 'error', message: `Could not load Telegram status: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStatusAndEvents();
  }, [fetchStatusAndEvents]);

  const handleSaveTimezone = async (newTz: string) => {
    if (!token) return;
    setSelectedTimezone(newTz);
    setSavingTz(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/telegram/timezone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ timezone: newTz }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          message: `Telegram alert timezone successfully updated to ${newTz}. Reminders & live alerts will display times in this timezone.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Failed to update alert timezone.',
        });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: `Error updating timezone: ${err.message}` });
    } finally {
      setSavingTz(false);
    }
  };

  const handleSendTest = async () => {
    if (!token) return;
    setTestLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ timezone: selectedTimezone }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          message: `Arabic test alert sent successfully to Telegram channel! (Message ID: #${data.messageId}, Timezone: ${data.timezone})`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Failed to dispatch test message to Telegram.',
        });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: `Network error: ${err.message}` });
    } finally {
      setTestLoading(false);
      fetchStatusAndEvents();
    }
  };

  const handleManualSync = async () => {
    if (!token) return;
    setSyncLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/telegram/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          message: `Synced ${data.result.totalSaved} events (${data.result.highImpactScheduled} high-impact reminders queued).`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Calendar sync failed from data provider.',
        });
      }
    } catch (err: any) {
      setActionFeedback({ type: 'error', message: `Sync error: ${err.message}` });
    } finally {
      setSyncLoading(false);
      fetchStatusAndEvents();
    }
  };

  const formatEventTime = (isoUtc: string) => {
    try {
      const d = new Date(isoUtc);
      const timeStr = d.toLocaleTimeString([], {
        timeZone: selectedTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const dateStr = d.toLocaleDateString([], {
        timeZone: selectedTimezone,
        month: 'short',
        day: 'numeric',
      });
      const utcTimeStr = d.toISOString().substring(11, 16) + ' UTC';
      return { timeStr, dateStr, utcTimeStr };
    } catch {
      return { timeStr: isoUtc, dateStr: '', utcTimeStr: '' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#080C14] p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">News & Economic Events Telegram Bot</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Arabic Alerts 🇸🇦
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time event detector and professional Arabic reminder engine (60m, 30m, 5m + Live Releases) powered by BiQuote & PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStatusAndEvents}
            disabled={loading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncLoading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
            <span>{syncLoading ? 'Syncing...' : 'Sync Calendar Now'}</span>
          </button>

          <button
            type="button"
            onClick={handleSendTest}
            disabled={testLoading}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-sky-500/20"
          >
            <Send className={`w-3.5 h-3.5 ${testLoading ? 'animate-spin' : ''}`} />
            <span>{testLoading ? 'Dispatching...' : 'Send Arabic Test Alert'}</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{actionFeedback.message}</span>
        </div>
      )}

      {/* Persistent Timezone Configuration Card */}
      <div className="bg-gradient-to-r from-slate-900/90 to-[#0B101D] border border-sky-500/20 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Telegram Broadcast Timezone</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {selectedTimezone}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              All UTC event times will be converted and displayed according to this timezone in Arabic Telegram reminders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedTimezone}
            onChange={(e) => handleSaveTimezone(e.target.value)}
            disabled={savingTz}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-sans"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          {savingTz && <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />}
        </div>
      </div>

      {/* System Health & Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Telegram Configuration */}
        <div className="p-4 bg-[#070A11] border border-slate-800 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telegram Channel</span>
            {scheduler?.telegramConfigured ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Connected
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Awaiting Credentials
              </span>
            )}
          </div>
          <div className="text-xs space-y-1 font-mono-num text-slate-300">
            <div>Channel: <span className="text-white font-bold">{scheduler?.telegramDetails?.channelId || 'Not set'}</span></div>
            <div>Bot Token: <span className="text-slate-400">{scheduler?.telegramDetails?.tokenMasked || 'Not set'}</span></div>
            <div>Alert Language: <span className="text-amber-400 font-bold">Arabic (العربية)</span></div>
          </div>
        </div>

        {/* Data Provider: BiQuote */}
        <div className="p-4 bg-[#070A11] border border-slate-800 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">BiQuote Market Feed</span>
            {scheduler?.biquoteConfigured ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active & Verified
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Offline
              </span>
            )}
          </div>
          <div className="text-xs space-y-1 font-mono-num text-slate-300">
            <div>Provider: <span className="text-white font-bold">{scheduler?.biquoteUrl || 'biquote.io'}</span></div>
            <div>Calendar Sync: <span className="text-amber-300 font-bold">Every 15 Minutes</span></div>
            <div>Live Actuals: <span className="text-cyan-300 font-bold">Every 25s (Active Windows)</span></div>
          </div>
        </div>

        {/* PostgreSQL Database & Deduplication */}
        <div className="p-4 bg-[#070A11] border border-slate-800 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PostgreSQL Persistence</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Zero Duplicates Guaranteed
            </span>
          </div>
          <div className="text-xs space-y-1 font-mono-num text-slate-300">
            <div>Constraint: <span className="text-purple-300">UNIQUE(event_id, type)</span></div>
            <div>Survives Restarts: <span className="text-emerald-400 font-bold">Yes (Persistent DB)</span></div>
            <div>Time Storage: <span className="text-white font-bold">TIMESTAMPTZ (UTC)</span></div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl text-center">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Events Stored</span>
          <span className="text-lg font-black text-white font-mono-num">{stats?.totalEventsTracked ?? 0}</span>
        </div>
        <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl text-center">
          <span className="text-[10px] uppercase font-bold text-amber-400 block">High & Very High</span>
          <span className="text-lg font-black text-amber-300 font-mono-num">{stats?.highImpactCount ?? 0}</span>
        </div>
        <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">Sent Alerts</span>
          <span className="text-lg font-black text-emerald-300 font-mono-num">{stats?.notificationsSent ?? 0}</span>
        </div>
        <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl text-center">
          <span className="text-[10px] uppercase font-bold text-sky-400 block">Pending Queue</span>
          <span className="text-lg font-black text-sky-300 font-mono-num">{stats?.notificationsPending ?? 0}</span>
        </div>
        <div className="p-3 bg-[#080C14] border border-slate-800 rounded-xl text-center">
          <span className="text-[10px] uppercase font-bold text-rose-400 block">Failed / Retried</span>
          <span className="text-lg font-black text-rose-300 font-mono-num">{stats?.notificationsFailed ?? 0}</span>
        </div>
      </div>

      {/* Professional Arabic Template Preview */}
      <div className="bg-[#080C14] border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              قوالب التنبيهات الاحترافية المعتمدة (Telegram Alert Preview)
            </h4>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPreviewTab('reminder')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                previewTab === 'reminder' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              تنبيه تذكيري مسبق (Reminder)
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('release')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                previewTab === 'release' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              تنبيه صدور الخبر (Live Actual)
            </button>
          </div>
        </div>

        {/* Telegram Message Mockup Card */}
        <div className="max-w-lg mx-auto bg-[#0E1626] border border-slate-700/80 rounded-2xl p-5 shadow-2xl text-right font-sans" dir="rtl">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5 mb-3 text-xs text-slate-400">
            <span className="font-bold text-sky-400">SMTrading.pro Bot</span>
            <span className="font-mono text-[10px]">HTML Mode • {selectedTimezone}</span>
          </div>

          {previewTab === 'reminder' ? (
            <div className="space-y-2 text-sm leading-relaxed text-slate-200">
              <div className="text-base font-black text-rose-400">🚨 تنبيه اقتصادي مهم جداً</div>
              <div className="text-slate-400">━━━━━━━━━━━━━━━━━━━</div>
              <div>🇺🇸 <b>الدولة:</b> الولايات المتحدة</div>
              <div>📊 <b>الحدث:</b> مؤشر أسعار المستهلك (CPI)</div>
              <div>💱 <b>العملة:</b> <span className="text-amber-300 font-bold font-mono">USD</span></div>
              <div>🔴 <b>الأهمية:</b> <span className="text-rose-400 font-bold">عالية جداً (Very High)</span></div>
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 font-bold">
                ⏰ <b>متبقي ساعة على صدور الخبر</b>
              </div>
              <div>🕐 <b>وقت الإصدار:</b> <span className="font-mono font-bold text-white">15:30</span> بتوقيت ({selectedTimezone})</div>
              <div>📈 <b>المتوقع:</b> <span className="font-mono font-bold text-white">2.8%</span></div>
              <div>📉 <b>السابق:</b> <span className="font-mono text-slate-300">2.9%</span></div>
              <div className="text-slate-400">━━━━━━━━━━━━━━━━━━━</div>
              <div className="text-[11px] text-sky-400">🔗 منصة SMTrading.pro للتحليل المؤسسي</div>
            </div>
          ) : (
            <div className="space-y-2 text-sm leading-relaxed text-slate-200">
              <div className="text-base font-black text-emerald-400">📢 صدور البيانات الاقتصادية فوراً (Live Actual)</div>
              <div className="text-slate-400">━━━━━━━━━━━━━━━━━━━</div>
              <div>🇺🇸 <b>الدولة:</b> الولايات المتحدة</div>
              <div>📊 <b>الحدث:</b> مؤشر أسعار المستهلك (CPI)</div>
              <div>💱 <b>العملة:</b> <span className="text-amber-300 font-bold font-mono">USD</span></div>
              <div>🔴 <b>الأهمية:</b> <span className="text-rose-400 font-bold">عالية جداً (Very High)</span></div>
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold">
                🎯 <b>النتيجة:</b> إيجابي للدولار الأمريكي 🟢 (أعلى من التوقعات)
              </div>
              <div>⚡ <b>الفعلي (Actual):</b> <span className="font-mono font-black text-emerald-400 text-base">3.1%</span></div>
              <div>📈 <b>المتوقع (Forecast):</b> <span className="font-mono text-slate-300">2.8%</span></div>
              <div>📉 <b>السابق (Previous):</b> <span className="font-mono text-slate-400">2.9%</span></div>
              <div>🕐 <b>وقت الصدور:</b> <span className="font-mono text-slate-300">15:30</span> بتوقيت ({selectedTimezone})</div>
              <div className="text-slate-400">━━━━━━━━━━━━━━━━━━━</div>
              <div className="text-[11px] text-sky-400">🔗 منصة SMTrading.pro للتحليل المؤسسي</div>
            </div>
          )}
        </div>
      </div>

      {/* Monitored Events Table */}
      <div className="bg-[#080C14] border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              الأحداث الاقتصادية المراقبة في قاعدة البيانات ({events.length})
            </h4>
          </div>

          <div className="text-xs text-slate-400">
            العرض الحالي بتوقيت: <span className="text-sky-400 font-mono font-bold">{selectedTimezone}</span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            لا توجد أحداث مسجلة حالياً في قاعدة البيانات. اضغط "Sync Calendar Now" لجلب الأحداث من BiQuote.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070A10] text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">الحدث / الدولة</th>
                  <th className="p-3">وقت الإصدار ({selectedTimezone})</th>
                  <th className="p-3 text-center">الأهمية</th>
                  <th className="p-3 text-right">المتوقع</th>
                  <th className="p-3 text-right">السابق</th>
                  <th className="p-3 text-right">الفعلي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-num">
                {events.map((ev) => {
                  const { timeStr, dateStr, utcTimeStr } = formatEventTime(ev.dateUtc);
                  const isReleased = Boolean(ev.actual);
                  const isVeryHigh = ev.importance >= 4;

                  return (
                    <tr key={ev.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3 font-sans">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{ev.event}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{ev.country}</span>
                          <span className="text-amber-400 font-mono-num font-bold">({ev.currency})</span>
                        </div>
                      </td>

                      <td className="p-3 text-slate-300">
                        <div className="font-bold text-white">
                          {timeStr}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {dateStr} • {utcTimeStr}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {isVeryHigh ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600/30 text-rose-300 border border-rose-500/40">
                            عالية جداً 🔴
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            عالية 🟠
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right text-slate-300">
                        {ev.forecast ? `${ev.forecast} ${ev.unit || ''}` : '—'}
                      </td>

                      <td className="p-3 text-right text-slate-400">
                        {ev.previous ? `${ev.previous} ${ev.unit || ''}` : '—'}
                      </td>

                      <td className="p-3 text-right">
                        {isReleased ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {ev.actual} {ev.unit || ''}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">قيد الانتظار</span>
                        )}
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
