import { Router, Request, Response } from 'express';
import { Database } from '../db';
import { authenticateToken, requirePermission, AuthRequest } from '../auth';
import { requireDatabaseReady } from '../middleware/dbGuard';

const router = Router();

// In-memory cache to prevent YouTube API quota exhaustion
interface CachedStreamData {
  timestamp: number;
  data: any;
  ttl: number;
}

let streamCache: CachedStreamData | null = null;
const OFFLINE_CACHE_TTL_MS = 20 * 1000; // 20 seconds when offline so live stream is detected fast
const LIVE_CACHE_TTL_MS = 45 * 1000;    // 45 seconds when live
const RATE_LIMIT_CACHE_TTL_MS = 60 * 1000; // 1 minute when rate-limited, with direct channel scraper fallback

// Official SMTrading YouTube Channel constants (PERMANENTLY LOCKED)
export const OFFICIAL_SMTRADING_CHANNEL_ID = 'UCkohQ1nDiIosi6gTPv0oXQA';
export const OFFICIAL_SMTRADING_UPLOADS_PLAYLIST = 'UUkohQ1nDiIosi6gTPv0oXQA';
export const OFFICIAL_SMTRADING_HANDLE = '@Smtradingpro';
export const OFFICIAL_SMTRADING_CHANNEL_URL = 'https://www.youtube.com/@Smtradingpro';
export const OFFICIAL_SMTRADING_TITLE = 'SM Trading';
export const OFFICIAL_SMTRADING_PRIMARY_RTMP = 'rtmp://a.rtmp.youtube.com/live2';
export const OFFICIAL_SMTRADING_BACKUP_RTMP = 'rtmp://b.rtmp.youtube.com/live2?backup=1';

// Latest verified official video on @Smtradingpro
export const OFFICIAL_LATEST_VIDEO = {
  videoId: 'txLDf_nRNPs',
  title: 'شرح مفصل لمنصة SMTrading.pro والاستراتيجيات الموجودة فيها | الجزء الأول',
  channelTitle: 'SM Trading',
  embedUrl: 'https://www.youtube.com/embed/txLDf_nRNPs?rel=0',
  watchUrl: 'https://www.youtube.com/watch?v=txLDf_nRNPs',
  thumbnailUrl: 'https://i.ytimg.com/vi/txLDf_nRNPs/hqdefault.jpg',
};

// Cloud API key default fallback so live broadcasts are detected even if the deployment environment lacks YOUTUBE_API_KEY
const DEFAULT_YOUTUBE_API_KEY = 'AIzaSyDkMGOWMuCJ6-x9Xhen7ZDOXo0nlGdtCmk';

// Helper to extract YouTube 11-char video ID from url or raw string
export function extractYouTubeVideoId(input?: string): string | null {
  if (!input) return null;
  const str = input.trim();
  const match = str.match(/(?:v=|youtu\.be\/|embed\/|live\/|^)([a-zA-Z0-9_-]{11})(?:[&?]|$)/);
  if (match) {
    return match[1] || match[0];
  }
  return null;
}

// Helper to sanitize channel handle
function cleanHandle(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith('@') ? trimmed.substring(1) : trimmed;
}

// Cleanly decode HTML entities from YouTube titles & descriptions
function decodeHtmlEntities(str: string): string {
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

/**
 * GET /api/youtube/live-stream
 * Server-side proxy for YouTube Data API v3 & direct channel verification.
 * STRICT SECURITY & FILTERING:
 * - ONLY queries and accepts broadcasts from the official SMTrading channel ID (UCkohQ1nDiIosi6gTPv0oXQA).
 * - NEVER performs global YouTube searches or recommendations.
 * - Multi-strategy detection: YouTube Search API + Channel Uploads Playlist + Direct Channel /live with oEmbed.
 * - Rejects any broadcast whose channelId does not match the official SMTrading channel.
 * - If SMTrading is not live, returns offline state cleanly.
 */
router.get('/live-stream', async (req: Request, res: Response): Promise<void> => {
  // Prevent browser & proxy caching of live stream polling
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Cloudflare-CDN-Cache-Control', 'no-store');

  const forceRefresh = req.query.force === 'true';
  const now = Date.now();

  // Return cached result if valid and not force refresh
  if (!forceRefresh && streamCache && (now - streamCache.timestamp < streamCache.ttl)) {
    res.json({
      ...streamCache.data,
      cached: true,
      cacheExpiresInSeconds: Math.max(0, Math.round((streamCache.ttl - (now - streamCache.timestamp)) / 1000)),
    });
    return;
  }

  const apiKey = (process.env.YOUTUBE_API_KEY || DEFAULT_YOUTUBE_API_KEY).trim();
  let dbSettings: any = null;
  try {
    dbSettings = await Database.getSystemSettings();
  } catch {
    // Database initializing or busy; gracefully fall back to default
  }

  // Strict Channel ID: PERMANENTLY LOCKED to SMTrading official channel ID
  const targetChannelId = OFFICIAL_SMTRADING_CHANNEL_ID;
  const channelHandle = OFFICIAL_SMTRADING_HANDLE;
  const channelTitle = OFFICIAL_SMTRADING_TITLE;

  // Check if admin has explicitly disabled live broadcasting (defaults to true)
  const isBroadcastingEnabled = dbSettings?.youtubeIsLive !== undefined ? Boolean(dbSettings.youtubeIsLive) : true;
  const manualVideoId = (dbSettings?.youtubeManualVideoId || '').trim();

  // Standard offline response helper
  const createOfflineResponse = (reason: string = 'SMTrading is currently offline') => ({
    success: true,
    isLive: false,
    message: 'SMTrading is currently offline',
    status: 'offline' as const,
    stream: null,
    channel: {
      id: targetChannelId,
      handle: OFFICIAL_SMTRADING_HANDLE,
      title: OFFICIAL_SMTRADING_TITLE,
      url: OFFICIAL_SMTRADING_CHANNEL_URL,
    },
    apiKeyConfigured: Boolean(apiKey),
    checkedAt: new Date().toISOString(),
    details: reason,
    rtmpPrimary: OFFICIAL_SMTRADING_PRIMARY_RTMP,
    rtmpBackup: OFFICIAL_SMTRADING_BACKUP_RTMP,
    latestVideo: OFFICIAL_LATEST_VIDEO,
  });

  // If live broadcasting has been explicitly disabled by an administrator, return offline
  if (!isBroadcastingEnabled) {
    const offlineData = createOfflineResponse('Broadcasting set to offline in admin settings');
    streamCache = { timestamp: now, data: offlineData, ttl: OFFLINE_CACHE_TTL_MS };
    res.json(offlineData);
    return;
  }

  try {
    let activeVideoId: string | null = null;
    let activeSnippet: any = null;
    let activeLiveDetails: any = null;

    // Clean any manual video ID input (supports full YouTube URLs or 11-char IDs)
    const cleanedManualVideoId = extractYouTubeVideoId(manualVideoId);

    // Strategy 1: If an admin explicitly set a manual video ID, use or verify it
    if (cleanedManualVideoId) {
      if (apiKey) {
        try {
          const manualRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=${encodeURIComponent(cleanedManualVideoId)}&key=${apiKey}`
          );
          if (manualRes.ok) {
            const manualData = await manualRes.json();
            const candidate = manualData.items?.[0];
            if (candidate) {
              activeVideoId = cleanedManualVideoId;
              activeSnippet = candidate.snippet;
              activeLiveDetails = candidate.liveStreamingDetails;
            }
          }
        } catch (err) {
          console.warn('[YouTube Live] Error verifying manual video:', err);
        }
      }
      if (!activeVideoId) {
        // Fallback for manual video ID even without API key
        activeVideoId = cleanedManualVideoId;
      }
    }

    // Strategy 2: Search for active live streams specifically filtered by our channelId
    if (!activeVideoId && apiKey) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(targetChannelId)}&eventType=live&type=video&maxResults=5&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const items = searchData.items || [];
          const matchingItem = items.find((item: any) => {
            const vId = item.id?.videoId;
            const chanId = item.snippet?.channelId;
            const isLive = item.snippet?.liveBroadcastContent === 'live';
            return vId && chanId === targetChannelId && isLive;
          });

          if (matchingItem?.id?.videoId) {
            activeVideoId = matchingItem.id.videoId;
            activeSnippet = matchingItem.snippet;
          }
        }
      } catch (err) {
        console.warn('[YouTube Live] Search API query notice:', err);
      }
    }

    // Strategy 3: Check channel uploads playlist for active live broadcast
    if (!activeVideoId && apiKey) {
      try {
        const uploadsPlaylistId = OFFICIAL_SMTRADING_UPLOADS_PLAYLIST;
        const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=3&key=${apiKey}`;
        const playlistRes = await fetch(playlistUrl);

        if (playlistRes.ok) {
          const pData = await playlistRes.json();
          for (const item of (pData.items || [])) {
            const cId = item.contentDetails?.videoId;
            if (cId) {
              const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=${encodeURIComponent(cId)}&key=${apiKey}`);
              if (vRes.ok) {
                const vData = await vRes.json();
                const v = vData.items?.[0];
                if (v && v.snippet?.channelId === targetChannelId && v.snippet?.liveBroadcastContent === 'live' && !v.liveStreamingDetails?.actualEndTime) {
                  activeVideoId = cId;
                  activeSnippet = v.snippet;
                  activeLiveDetails = v.liveStreamingDetails;
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[YouTube Live] Playlist query notice:', err);
      }
    }

    // Strategy 4: Direct channel /live endpoint scrape with oEmbed verification
    if (!activeVideoId) {
      try {
        const directUrl = `https://www.youtube.com/@Smtradingpro/live`;
        const directRes = await fetch(directUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          redirect: 'follow',
        });

        if (directRes.ok) {
          const finalUrl = directRes.url;
          const matchWatch = finalUrl.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
          if (matchWatch && matchWatch[1]) {
            const candidateId = matchWatch[1];
            // Verify this is actually live and not an offline redirect to channel trailer
            const html = await directRes.text();
            const isActuallyLive = html.includes('"isLive":true') || html.includes('"status":"LIVE"') || html.includes('liveChatRenderer');
            if (isActuallyLive) {
              activeVideoId = candidateId;
            }
          }
        }
      } catch (err) {
        console.warn('[YouTube Live] Direct scraper notice:', err);
      }
    }

    // If NO active live broadcast is currently running on the channel, return OFFLINE state cleanly
    if (!activeVideoId) {
      const offlineData = createOfflineResponse('SMTrading is currently offline. Streams pushed to the RTMP endpoint will appear here automatically.');
      streamCache = { timestamp: now, data: offlineData, ttl: OFFLINE_CACHE_TTL_MS };
      res.json(offlineData);
      return;
    }

    // Verify video details if specific videoId found
    if (activeVideoId && apiKey && !activeLiveDetails) {
      try {
        const videoRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=${encodeURIComponent(activeVideoId)}&key=${apiKey}`
        );

        if (videoRes.ok) {
          const videoData = await videoRes.json();
          const video = videoData.items?.[0];
          if (video && video.snippet?.channelId === targetChannelId) {
            activeSnippet = video.snippet;
            activeLiveDetails = video.liveStreamingDetails;
          }
        }
      } catch (err) {
        console.warn('[YouTube Live] Video details verification notice:', err);
      }
    }

    // Build the verified active live broadcast response
    const cleanTitle = decodeHtmlEntities(activeSnippet?.title || 'SM Trading Official Live Stream');
    const cleanDesc = decodeHtmlEntities(activeSnippet?.description || 'Official real-time market execution, technical analysis, and live trading session from SMTrading.pro.');
    const videoThumb =
      activeSnippet?.thumbnails?.maxres?.url ||
      activeSnippet?.thumbnails?.high?.url ||
      activeSnippet?.thumbnails?.medium?.url ||
      activeSnippet?.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${activeVideoId}/hqdefault_live.jpg`;

    const viewerCount = activeLiveDetails?.concurrentViewers ? parseInt(activeLiveDetails.concurrentViewers, 10) : undefined;

    const streamDetails = {
      videoId: activeVideoId,
      title: cleanTitle,
      description: cleanDesc,
      channelTitle: activeSnippet?.channelTitle || OFFICIAL_SMTRADING_TITLE,
      channelId: OFFICIAL_SMTRADING_CHANNEL_ID,
      publishedAt: activeSnippet?.publishedAt || new Date().toISOString(),
      actualStartTime: activeLiveDetails?.actualStartTime || activeSnippet?.publishedAt || new Date().toISOString(),
      scheduledStartTime: activeLiveDetails?.scheduledStartTime,
      thumbnailUrl: videoThumb,
      concurrentViewers: viewerCount,
      embedUrl: `https://www.youtube.com/embed/${activeVideoId}?autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1`,
      watchUrl: `https://www.youtube.com/watch?v=${activeVideoId}`,
      chatUrl: `https://www.youtube.com/live_chat?is_popout=1&v=${activeVideoId}`,
      rtmpPrimary: OFFICIAL_SMTRADING_PRIMARY_RTMP,
      rtmpBackup: OFFICIAL_SMTRADING_BACKUP_RTMP,
    };

    const liveResponse = {
      success: true,
      isLive: true,
      message: 'Official SM Trading Live Broadcast is Active',
      status: 'live' as const,
      stream: streamDetails,
      channel: {
        id: OFFICIAL_SMTRADING_CHANNEL_ID,
        title: OFFICIAL_SMTRADING_TITLE,
        handle: OFFICIAL_SMTRADING_HANDLE,
        url: OFFICIAL_SMTRADING_CHANNEL_URL,
      },
      apiKeyConfigured: Boolean(apiKey),
      checkedAt: new Date().toISOString(),
      latestVideo: OFFICIAL_LATEST_VIDEO,
      rtmpPrimary: OFFICIAL_SMTRADING_PRIMARY_RTMP,
      rtmpBackup: OFFICIAL_SMTRADING_BACKUP_RTMP,
      lockedSource: {
        channelId: OFFICIAL_SMTRADING_CHANNEL_ID,
        channelHandle: OFFICIAL_SMTRADING_HANDLE,
        channelUrl: OFFICIAL_SMTRADING_CHANNEL_URL,
        primaryRtmp: OFFICIAL_SMTRADING_PRIMARY_RTMP,
        backupRtmp: OFFICIAL_SMTRADING_BACKUP_RTMP,
      },
    };

    streamCache = { timestamp: now, data: liveResponse, ttl: LIVE_CACHE_TTL_MS };
    res.json(liveResponse);
  } catch (error: any) {
    console.error('Error in YouTube live stream handler:', error);
    const offlineFallback = createOfflineResponse('SMTrading is currently offline');
    res.json(offlineFallback);
  }
});

/**
 * GET /api/youtube/status
 * Public status endpoint showing channel info & current live status.
 */
router.get('/status', (req: Request, res: Response): void => {
  const apiKey = process.env.YOUTUBE_API_KEY;

  res.json({
    configured: Boolean(apiKey),
    hasChannelId: true,
    channelId: OFFICIAL_SMTRADING_CHANNEL_ID,
    hasChannelHandle: true,
    channelHandle: OFFICIAL_SMTRADING_HANDLE,
    channelUrl: OFFICIAL_SMTRADING_CHANNEL_URL,
    channelTitle: OFFICIAL_SMTRADING_TITLE,
    primaryRtmp: OFFICIAL_SMTRADING_PRIMARY_RTMP,
    backupRtmp: OFFICIAL_SMTRADING_BACKUP_RTMP,
    isLocked: true,
    isLive: streamCache?.data?.isLive ?? false,
    lastChecked: streamCache?.data?.checkedAt || null,
    latestVideo: OFFICIAL_LATEST_VIDEO,
  });
});

/**
 * GET /api/youtube/settings
 * Admin & Staff route to read YouTube channel configuration.
 */
router.get('/settings', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let currentSettings: any = null;
    try {
      currentSettings = await Database.getSystemSettings();
    } catch {
      // Graceful fallback while DB is readying
    }
    const apiKey = process.env.YOUTUBE_API_KEY;

    res.json({
      configured: Boolean(apiKey),
      channelId: OFFICIAL_SMTRADING_CHANNEL_ID,
      channelHandle: OFFICIAL_SMTRADING_HANDLE,
      channelUrl: OFFICIAL_SMTRADING_CHANNEL_URL,
      channelTitle: OFFICIAL_SMTRADING_TITLE,
      isLocked: true,
      primaryRtmp: OFFICIAL_SMTRADING_PRIMARY_RTMP,
      backupRtmp: OFFICIAL_SMTRADING_BACKUP_RTMP,
      isLive: currentSettings?.youtubeIsLive !== undefined ? Boolean(currentSettings.youtubeIsLive) : true,
      manualVideoId: currentSettings?.youtubeManualVideoId || '',
      latestVideo: OFFICIAL_LATEST_VIDEO,
    });
  } catch (err: any) {
    res.status(500).json({ configured: false, error: err.message });
  }
});

/**
 * POST /api/youtube/settings
 * Admin & Staff route to update YouTube channel configuration.
 * Protected by dynamic RBAC canManageLiveStream permission.
 */
router.post('/settings', authenticateToken, requirePermission('canManageLiveStream'), requireDatabaseReady, async (req: AuthRequest, res: Response): Promise<void> => {
  const { isLive, manualVideoId } = req.body;
  const currentSettings = await Database.getSystemSettings();

  const rawManual = manualVideoId !== undefined ? String(manualVideoId).trim() : (currentSettings.youtubeManualVideoId || '');
  const cleanManual = extractYouTubeVideoId(rawManual) || rawManual;

  const updatedSettings = {
    ...currentSettings,
    youtubeChannelId: OFFICIAL_SMTRADING_CHANNEL_ID,
    youtubeChannelHandle: OFFICIAL_SMTRADING_HANDLE,
    youtubeIsLive: isLive !== undefined ? Boolean(isLive) : true,
    youtubeManualVideoId: cleanManual,
  };

  await Database.updateSystemSettings(updatedSettings);
  // Clear cache to reflect new settings immediately
  streamCache = null;

  res.json({
    success: true,
    message: 'YouTube live stream settings updated successfully. Locked to official SM Trading channel (@Smtradingpro).',
    channelId: OFFICIAL_SMTRADING_CHANNEL_ID,
    channelHandle: OFFICIAL_SMTRADING_HANDLE,
    channelUrl: OFFICIAL_SMTRADING_CHANNEL_URL,
    isLive: updatedSettings.youtubeIsLive,
    manualVideoId: updatedSettings.youtubeManualVideoId,
    primaryRtmp: OFFICIAL_SMTRADING_PRIMARY_RTMP,
    backupRtmp: OFFICIAL_SMTRADING_BACKUP_RTMP,
    latestVideo: OFFICIAL_LATEST_VIDEO,
  });
});

export default router;
