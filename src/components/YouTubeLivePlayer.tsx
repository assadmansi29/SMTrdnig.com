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
  AlertCircle,
  MessageSquare,
  Volume2
} from 'lucide-react';
import { YouTubeLiveStream } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { BlueVerifiedBadge } from './BlueVerifiedBadge';

function decodeTitle(str?: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

interface YouTubeLivePlayerProps {
  isLive: boolean;
  stream: YouTubeLiveStream | null;
  channel: { id?: string | null; handle?: string | null; title?: string; thumbnail?: string; url?: string } | null;
  latestVideo?: { videoId: string; title: string; embedUrl: string; watchUrl: string; thumbnailUrl?: string } | null;
  rtmpPrimary?: string;
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
  latestVideo,
  rtmpPrimary = 'rtmp://a.rtmp.youtube.com/live2',
  message,
  isLoading,
  isRefreshing,
  checkedAt,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [showLatestVideo, setShowLatestVideo] = React.useState<boolean>(false);

  const formattedTime = checkedAt 
    ? new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  const officialChannelUrl = channel?.url || 'https://www.youtube.com/@Smtradingpro';
  const officialHandle = channel?.handle || '@Smtradingpro';

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
    const cleanTitle = decodeTitle(stream.title);
    const cleanEmbedUrl = stream.embedUrl?.includes('youtube.com/embed')
      ? stream.embedUrl
      : (stream.videoId && stream.videoId !== 'live_stream'
          ? `https://www.youtube.com/embed/${stream.videoId}?autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1`
          : `https://www.youtube.com/embed/live_stream?channel=UCkohQ1nDiIosi6gTPv0oXQA&autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1`);

    const liveChatUrl = (stream as any).chatUrl || (stream.videoId && stream.videoId !== 'live_stream'
      ? `https://www.youtube.com/live_chat?is_popout=1&v=${stream.videoId}`
      : `https://www.youtube.com/live_chat?is_popout=1&channel=UCkohQ1nDiIosi6gTPv0oXQA`);

    const watchUrl = stream.watchUrl || (stream.videoId && stream.videoId !== 'live_stream'
      ? `https://www.youtube.com/watch?v=${stream.videoId}`
      : `https://www.youtube.com/channel/UCkohQ1nDiIosi6gTPv0oXQA/live`);

    return (
      <div className="bg-[#090D17] border border-rose-500/40 rounded-2xl overflow-hidden shadow-2xl shadow-rose-950/20 space-y-0">
        {/* Live Stream Top Bar */}
        <div className="bg-gradient-to-r from-rose-950/90 via-[#121626] to-[#0A0E1A] p-3 sm:p-4 border-b border-rose-500/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pulsing Live Badge */}
            <div className="flex items-center gap-1.5 bg-rose-600 text-white px-2.5 py-1 rounded-lg text-xs font-bold font-mono-num tracking-wide shadow-md shadow-rose-600/40 animate-pulse shrink-0">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>{t('liveStreamActiveBadge')}</span>
            </div>

            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate flex items-center gap-2">
                <span className="truncate">{cleanTitle}</span>
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
          <div className="flex items-center gap-2 shrink-0">
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
              href={liveChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              title="Open YouTube Live Chat"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Live Chat</span>
            </a>

            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm shadow-rose-600/30 cursor-pointer"
            >
              <span>{t('liveStreamOpenYouTube')}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Embedded YouTube Stream Player */}
        <div className="relative w-full aspect-video bg-black max-w-[800px] mx-auto">
          <iframe
            src={cleanEmbedUrl}
            title={cleanTitle}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {/* Real-Time Stream Footer Note & Browser Audio Tip */}
        <div className="bg-[#070B14] px-4 py-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">{t('liveStreamAutoUpdate')}</span>
            <span className="hidden md:inline-flex items-center gap-1 text-amber-300/80 pl-2">
              <Volume2 className="w-3 h-3 text-amber-400" />
              <span>Click speaker icon on video to unmute</span>
            </span>
          </div>
          <span className="text-slate-500 font-mono-num">
            Live Stream Feed • {formattedTime ? `Synced at ${formattedTime}` : 'Real-time sync'}
          </span>
        </div>
      </div>
    );
  }

  // NO LIVE STREAM CURRENTLY VIEW
  const activeLatestVideo = latestVideo || {
    videoId: 'txLDf_nRNPs',
    title: 'شرح مفصل لمنصة SMTrading.pro والاستراتيجيات الموجودة فيها | الجزء الأول',
    embedUrl: 'https://www.youtube.com/embed/txLDf_nRNPs?rel=0',
    watchUrl: 'https://www.youtube.com/watch?v=txLDf_nRNPs',
  };

  return (
    <div className="bg-[#090D17] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left Side: Status Info */}
          <div className="flex items-center gap-3.5 text-center sm:text-left rtl:sm:text-right w-full sm:w-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0 relative group">
              <VideoOff className="w-5 h-5 text-slate-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-slate-700 border-2 border-[#090D17]"></span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start rtl:sm:justify-start gap-2">
                {/* EXACT REQUIRED TEXT: SMTrading is currently offline */}
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {t('noLiveStream')}
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

        {/* Channel & Official Links Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-500">Official Channel:</span>
            <a
              href={officialChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>{officialHandle}</span>
              <BlueVerifiedBadge size="xs" />
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              RTMP: <span className="text-slate-300">{rtmpPrimary}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLatestVideo(!showLatestVideo)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span>{showLatestVideo ? 'Hide Video' : 'Watch Channel Overview'}</span>
            </button>

            <a
              href={officialChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <span>YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Optional In-Page Video Player for Channel Overview */}
      {showLatestVideo && (
        <div className="border-t border-slate-800 bg-black/60 p-3 sm:p-4">
          <div className="flex items-center justify-between pb-2 text-xs">
            <span className="text-slate-300 font-semibold truncate">
              {activeLatestVideo.title}
            </span>
            <a
              href={activeLatestVideo.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-1 shrink-0 text-[11px]"
            >
              <span>Open on YouTube</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden max-w-[760px] mx-auto">
            <iframe
              src={activeLatestVideo.embedUrl}
              title={activeLatestVideo.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
};
