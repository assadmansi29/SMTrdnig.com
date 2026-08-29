import React from 'react';
import { 
  Radio, 
  Tv, 
  ExternalLink, 
  RefreshCw, 
  Users, 
  Clock, 
  Sparkles,
  ShieldCheck,
  VideoOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { YouTubeLiveStream } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';

interface YouTubeLivePlayerProps {
  isLive: boolean;
  stream: YouTubeLiveStream | null;
  channel: { id?: string | null; handle?: string | null; title?: string; thumbnail?: string } | null;
  message: string;
  isLoading: boolean;
  isRefreshing: boolean;
  checkedAt: string | null;
  onRefresh: () => void;
}

export const YouTubeLivePlayer: React.FC<YouTubeLivePlayerProps> = ({
  isLive,
  stream,
  channel,
  message,
  isLoading,
  isRefreshing,
  checkedAt,
  onRefresh,
}) => {
  const { t } = useTranslation();

  const formattedTime = checkedAt 
    ? new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  if (isLoading && !stream) {
    return (
      <div className="bg-[#090D17] border border-slate-800 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center min-h-[220px] space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin flex items-center justify-center">
          <Radio className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-xs text-slate-300 font-mono-num animate-pulse">
          Connecting to YouTube Data API & scanning live stream feeds...
        </div>
      </div>
    );
  }

  // ACTIVE LIVE STREAM VIEW
  if (isLive && stream) {
    return (
      <div className="bg-[#090D17] border border-rose-500/30 rounded-2xl overflow-hidden shadow-2xl space-y-0">
        {/* Live Stream Top Bar */}
        <div className="bg-gradient-to-r from-rose-950/80 via-[#101424] to-[#0A0E1A] p-3 sm:p-4 border-b border-rose-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pulsing Live Badge */}
            <div className="flex items-center gap-1.5 bg-rose-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold font-mono-num tracking-wide shadow-md shadow-rose-600/30 animate-pulse shrink-0">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>{t('liveStreamActiveBadge')}</span>
            </div>

            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2">
                <span className="truncate">{stream.title}</span>
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  {stream.channelTitle || channel?.title || 'SM Trading'}
                  <BlueVerifiedBadge size="xs" />
                </span>
                {stream.actualStartTime && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {t('liveStreamStarted')}{' '}
                      {new Date(stream.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Badges */}
          <div className="flex items-center gap-2">
            {stream.concurrentViewers !== undefined && stream.concurrentViewers > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-rose-500/30 text-rose-300 px-2.5 py-1 rounded-lg text-xs font-mono-num font-semibold">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span>{stream.concurrentViewers.toLocaleString()} {t('liveStreamWatching')}</span>
              </div>
            )}

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title={t('liveStreamRefresh')}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <a
              href={stream.watchUrl || `https://www.youtube.com/watch?v=${stream.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm shadow-rose-600/20 cursor-pointer"
            >
              <span>{t('liveStreamOpenYouTube')}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Embedded YouTube Stream Player */}
        <div className="relative w-full aspect-video bg-black max-w-[800px] mx-auto">
          <iframe
            src={stream.embedUrl}
            title={stream.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Real-Time Stream Footer Note */}
        <div className="bg-[#070B14] px-4 py-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">{t('liveStreamAutoUpdate')}</span>
          </div>
          <span className="text-slate-500 font-mono-num">
            Live Stream Feed • {formattedTime ? `Synced at ${formattedTime}` : 'Real-time sync'}
          </span>
        </div>
      </div>
    );
  }

  // NO LIVE STREAM CURRENTLY VIEW
  return (
    <div className="bg-[#090D17] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left Side: Status Info */}
        <div className="flex items-center gap-3.5 text-center sm:text-left rtl:sm:text-right w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0 relative group">
            <VideoOff className="w-5 h-5 text-slate-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-700 border-2 border-[#090D17]"></span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start rtl:sm:justify-start gap-2">
              {/* EXACT REQUIRED TEXT */}
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                No Live Stream Currently
              </h3>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono-num border border-slate-700">
                OFFLINE
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
              {t('noLiveStreamDesc')}
            </p>
          </div>
        </div>

        {/* Right Side: Refresh & Live Scanner Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden md:flex flex-col items-end rtl:items-start text-[10px] font-mono-num text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse"></span>
              <span>Auto-scanner active</span>
            </span>
            {formattedTime && <span>Checked: {formattedTime}</span>}
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : t('liveStreamRefresh')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
