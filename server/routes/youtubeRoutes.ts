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

// Direct channel live stream scraper fallback (bypasses YouTube API quota limits)
async function detectChannelDirectLive(channelId: string): Promise<{ isLive: boolean; videoId?: string; title?: string } | null> {
  if (!channelId) return null;
  try {
    const directUrl = `https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`;
    const res = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const isLive = html.includes('"isLive":true') || html.includes('"status":"LIVE"') || html.includes('"liveStreamability"');
    if (!isLive) return { isLive: false };

    // Extract videoId
    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const videoId = videoIdMatch ? videoIdMatch[1] : undefined;

    // Extract title
    let title: string | undefined;
    const titleRuns = html.match(/"title":{"runs":\[{"text":"([^"]+)"/);
    if (titleRuns && titleRuns[1]) {
      title = decodeHtmlEntities(titleRuns[1]);
    } else {
      const titleTag = html.match(/<title>([^<]*)<\/title>/);
      if (titleTag && titleTag[1]) {
        title = decodeHtmlEntities(titleTag[1].replace(/\s*-\s*YouTube\s*$/i, '').trim());
      }
    }

    return { isLive: true, videoId, title };
  } catch (err) {
    console.warn('[YouTube Direct Detector] Direct check error:', err);
    return null;
  }
}

/**
 * GET /api/youtube/live-stream
 * Server-side proxy for YouTube Data API v3 to detect active live streams.
 * Protects the YOUTUBE_API_KEY from exposure to the frontend.
 */
router.get('/live-stream', async (req: Request, res: Response): Promise<void> => {
  // Prevent browser & proxy caching of live stream polling
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const forceRefresh = req.query.force === 'true';
  const queryChannelId = req.query.channelId as string | undefined;
  const queryHandle = req.query.handle as string | undefined;

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

  const apiKey = process.env.YOUTUBE_API_KEY;
  let dbSettings: any = null;
  try {
    dbSettings = await Database.getSystemSettings();
  } catch {
    // Database initializing or busy; gracefully fall back to environment settings
  }
  const channelId = queryChannelId || process.env.YOUTUBE_CHANNEL_ID || dbSettings?.youtubeSettings?.channelId || 'UCkohQ1nDiIosi6gTPv0oXQA';
  const channelHandle = queryHandle || process.env.YOUTUBE_CHANNEL_HANDLE || dbSettings?.youtubeSettings?.channelHandle || '@SMTradingpro';
  const manualVideoId = dbSettings?.youtubeSettings?.manualVideoId?.trim() || '';

  // If no API key is provided, try direct HTML detection
  if (!apiKey) {
    const directResult = await detectChannelDirectLive(channelId);
    if (directResult?.isLive && directResult.videoId) {
      const directLiveResponse = {
        success: true,
        isLive: true,
        message: 'Active live stream detected via direct feed',
        status: 'live',
        stream: {
          videoId: directResult.videoId,
          title: directResult.title || 'Live Trading Session',
          description: '',
          channelTitle: 'SMTradingpro',
          channelId: channelId,
          embedUrl: `https://www.youtube.com/embed/${directResult.videoId}?autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1`,
          watchUrl: `https://www.youtube.com/watch?v=${directResult.videoId}`,
        },
        channel: {
          id: channelId,
          handle: channelHandle,
          title: 'SMTradingpro',
        },
        apiKeyConfigured: false,
        checkedAt: new Date().toISOString(),
      };
      streamCache = { timestamp: now, data: directLiveResponse, ttl: LIVE_CACHE_TTL_MS };
      res.json(directLiveResponse);
      return;
    }

    const fallbackResponse = {
      success: true,
      isLive: false,
      message: 'No Live Stream Currently',
      status: 'offline',
      stream: null,
      channel: {
        id: channelId || null,
        handle: channelHandle || null,
        title: 'SM Trading Live Desk',
      },
      apiKeyConfigured: false,
      checkedAt: new Date().toISOString(),
      notice: 'YouTube API Key not configured. Defaulting to offline state.',
    };

    streamCache = { timestamp: now, data: fallbackResponse, ttl: OFFLINE_CACHE_TTL_MS };
    res.json(fallbackResponse);
    return;
  }

  try {
    let resolvedChannelId = channelId;
    let channelInfo: any = null;

    // 1. If we have a handle but no direct channelId (or need to resolve handle)
    if ((!resolvedChannelId || resolvedChannelId.startsWith('@')) && (channelHandle || resolvedChannelId)) {
      const handleToLookup = cleanHandle(channelHandle || resolvedChannelId);
      try {
        const handleRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(handleToLookup)}&key=${apiKey}`
        );
        if (handleRes.ok) {
          const handleData = await handleRes.json();
          if (handleData.items && handleData.items.length > 0) {
            resolvedChannelId = handleData.items[0].id;
            channelInfo = {
              id: handleData.items[0].id,
              title: handleData.items[0].snippet?.title,
              handle: `@${handleToLookup}`,
              thumbnail: handleData.items[0].snippet?.thumbnails?.default?.url,
            };
          }
        }
      } catch (err) {
        console.warn('Could not resolve channel by handle:', err);
      }
    }

    // 2. If we have a channelId, fetch channel snippet info if not already fetched
    if (resolvedChannelId && !channelInfo) {
      try {
        const chanRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${encodeURIComponent(resolvedChannelId)}&key=${apiKey}`
        );
        if (chanRes.ok) {
          const chanData = await chanRes.json();
          if (chanData.items && chanData.items.length > 0) {
            channelInfo = {
              id: resolvedChannelId,
              title: chanData.items[0].snippet?.title,
              thumbnail: chanData.items[0].snippet?.thumbnails?.default?.url,
            };
          }
        }
      } catch (err) {
        console.warn('Could not fetch channel info:', err);
      }
    }

    // Check if manual override video is active
    let activeVideoId: string | null = manualVideoId || null;
    let activeSnippet: any = null;

    // 3. Search for active live streams on the channel
    if (!activeVideoId) {
      let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&maxResults=1&key=${apiKey}`;
      if (resolvedChannelId) {
        searchUrl += `&channelId=${encodeURIComponent(resolvedChannelId)}`;
      } else {
        searchUrl += `&q=SMTrading%20Live`;
      }

      let searchRes = await fetch(searchUrl);
      
      if (!searchRes.ok) {
        console.warn(`[YouTube API] Live scanner response HTTP ${searchRes.status}. Engaging direct channel detector fallback...`);
        // Fallback: direct channel detector
        const directLive = await detectChannelDirectLive(resolvedChannelId);
        if (directLive?.isLive && directLive.videoId) {
          activeVideoId = directLive.videoId;
        }
      } else {
        const searchData = await searchRes.json();
        const liveItems = searchData.items || [];
        if (liveItems.length > 0) {
          activeVideoId = liveItems[0].id?.videoId;
          activeSnippet = liveItems[0].snippet;
        } else {
          // Double-check direct channel detector if search indexing is lagging
          const directLive = await detectChannelDirectLive(resolvedChannelId);
          if (directLive?.isLive && directLive.videoId) {
            activeVideoId = directLive.videoId;
          }
        }
      }
    }

    if (!activeVideoId) {
      // No active stream found
      const responseData = {
        success: true,
        isLive: false,
        message: 'No Live Stream Currently',
        status: 'idle',
        stream: null,
        channel: channelInfo || { id: resolvedChannelId || null, title: 'SM Trading Desk' },
        apiKeyConfigured: true,
        checkedAt: new Date().toISOString(),
      };

      streamCache = { timestamp: now, data: responseData, ttl: OFFLINE_CACHE_TTL_MS };
      res.json(responseData);
      return;
    }

    // 4. Live Stream is ACTIVE! Fetch full video and live streaming details
    const videoId = activeVideoId;
    let viewerCount: number | undefined;
    let scheduledStartTime: string | undefined;
    let actualStartTime: string | undefined;
    let videoTitle = activeSnippet?.title || 'Live Trading Session';
    let videoDesc = activeSnippet?.description || '';
    let videoThumb = activeSnippet?.thumbnails?.maxres?.url ||
      activeSnippet?.thumbnails?.high?.url ||
      activeSnippet?.thumbnails?.medium?.url ||
      activeSnippet?.thumbnails?.default?.url;

    if (videoId) {
      try {
        const videoRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,statistics&id=${encodeURIComponent(videoId)}&key=${apiKey}`
        );
        if (videoRes.ok) {
          const videoData = await videoRes.json();
          if (videoData.items && videoData.items.length > 0) {
            const v = videoData.items[0];
            const liveDetails = v.liveStreamingDetails;
            if (v.snippet) {
              videoTitle = v.snippet.title || videoTitle;
              videoDesc = v.snippet.description || videoDesc;
              videoThumb = 
                v.snippet.thumbnails?.maxres?.url ||
                v.snippet.thumbnails?.high?.url ||
                v.snippet.thumbnails?.medium?.url ||
                v.snippet.thumbnails?.default?.url ||
                videoThumb;
            }
            if (liveDetails) {
              if (liveDetails.concurrentViewers) {
                viewerCount = parseInt(liveDetails.concurrentViewers, 10);
              }
              scheduledStartTime = liveDetails.scheduledStartTime;
              actualStartTime = liveDetails.actualStartTime;
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch video details:', err);
      }
    }

    const cleanTitle = decodeHtmlEntities(videoTitle);
    const cleanDesc = decodeHtmlEntities(videoDesc);

    const streamDetails = {
      videoId,
      title: cleanTitle,
      description: cleanDesc,
      channelTitle: channelInfo?.title || activeSnippet?.channelTitle || 'SM Trading',
      channelId: resolvedChannelId || activeSnippet?.channelId,
      publishedAt: activeSnippet?.publishedAt,
      actualStartTime: actualStartTime || activeSnippet?.publishedAt || new Date().toISOString(),
      scheduledStartTime,
      thumbnailUrl: videoThumb || `https://i.ytimg.com/vi/${videoId}/hqdefault_live.jpg`,
      concurrentViewers: viewerCount,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };

    const liveResponse = {
      success: true,
      isLive: true,
      message: 'Active live stream detected',
      status: 'live',
      stream: streamDetails,
      channel: channelInfo || {
        id: resolvedChannelId,
        title: channelInfo?.title || 'SMTradingpro',
      },
      apiKeyConfigured: true,
      checkedAt: new Date().toISOString(),
    };

    streamCache = { timestamp: now, data: liveResponse, ttl: LIVE_CACHE_TTL_MS };
    res.json(liveResponse);
  } catch (error: any) {
    console.error('Error querying YouTube Data API:', error);
    res.status(500).json({
      success: false,
      isLive: false,
      message: 'No Live Stream Currently',
      error: error.message || 'Internal server error while checking YouTube stream status',
      checkedAt: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/youtube/status
 * Public status endpoint showing channel info & current live status.
 */
router.get('/status', (req: Request, res: Response): void => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE;

  res.json({
    configured: Boolean(apiKey),
    hasChannelId: Boolean(channelId),
    hasChannelHandle: Boolean(channelHandle),
    channelHandle: channelHandle ? (channelHandle.startsWith('@') ? channelHandle : `@${channelHandle}`) : null,
    isLive: streamCache?.data?.isLive || false,
    lastChecked: streamCache?.data?.checkedAt || null,
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
    const channelId = currentSettings?.youtubeSettings?.channelId || process.env.YOUTUBE_CHANNEL_ID || '';
    const channelHandle = currentSettings?.youtubeSettings?.channelHandle || process.env.YOUTUBE_CHANNEL_HANDLE || '';
    const manualVideoId = currentSettings?.youtubeSettings?.manualVideoId || '';

    res.json({
      configured: Boolean(apiKey),
      channelId,
      channelHandle,
      manualVideoId,
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
  const { channelId, channelHandle, manualVideoId } = req.body;
  const currentSettings = (await Database.getSystemSettings()) as any;

  const updatedSettings = {
    ...currentSettings,
    youtubeSettings: {
      channelId: channelId !== undefined ? channelId : currentSettings.youtubeSettings?.channelId,
      channelHandle: channelHandle !== undefined ? channelHandle : currentSettings.youtubeSettings?.channelHandle,
      manualVideoId: manualVideoId !== undefined ? manualVideoId : currentSettings.youtubeSettings?.manualVideoId,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.username,
    }
  };

  await Database.updateSystemSettings(updatedSettings);
  // Clear cache to reflect new settings immediately
  streamCache = null;

  res.json({
    success: true,
    message: 'YouTube live stream settings updated successfully',
    youtubeSettings: updatedSettings.youtubeSettings,
  });
});

export default router;
