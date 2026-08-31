import { Router, Request, Response } from 'express';
import { Database } from '../db';
import { authenticateToken, AuthRequest } from '../auth';

const router = Router();

// In-memory cache to prevent YouTube API quota exhaustion
interface CachedStreamData {
  timestamp: number;
  data: any;
  ttl: number;
}

let streamCache: CachedStreamData | null = null;
const DEFAULT_CACHE_TTL_MS = 120 * 1000; // 2 minutes standard
const RATE_LIMIT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes when rate-limited/429

// Helper to sanitize channel handle
function cleanHandle(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith('@') ? trimmed.substring(1) : trimmed;
}

/**
 * GET /api/youtube/live-stream
 * Server-side proxy for YouTube Data API v3 to detect active live streams.
 * Protects the YOUTUBE_API_KEY from exposure to the frontend.
 */
router.get('/live-stream', async (req: Request, res: Response): Promise<void> => {
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
  const dbSettings = (await Database.getSystemSettings()) as any;
  const channelId = queryChannelId || process.env.YOUTUBE_CHANNEL_ID || dbSettings?.youtubeSettings?.channelId || '';
  const channelHandle = queryHandle || process.env.YOUTUBE_CHANNEL_HANDLE || dbSettings?.youtubeSettings?.channelHandle || '';

  // If no API key is provided, return graceful offline response
  if (!apiKey) {
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

    streamCache = { timestamp: now, data: fallbackResponse, ttl: DEFAULT_CACHE_TTL_MS };
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

    // 3. Search for active live streams on the channel
    let searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&maxResults=1&key=${apiKey}`;
    if (resolvedChannelId) {
      searchUrl += `&channelId=${encodeURIComponent(resolvedChannelId)}`;
    } else {
      searchUrl += `&q=SMTrading%20Live`;
    }

    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      const isRateLimited = searchRes.status === 429 || searchRes.status === 403;
      if (isRateLimited) {
        console.warn(`[YouTube API] Rate limit or quota notice (HTTP ${searchRes.status}). Operating in graceful offline standby.`);
      } else {
        console.warn(`[YouTube API] Live scanner response HTTP ${searchRes.status}`);
      }

      const safeOfflineResponse = {
        success: true,
        isLive: false,
        message: 'No Live Stream Currently',
        status: 'offline',
        stream: null,
        channel: channelInfo || { id: resolvedChannelId || null, title: 'SM Trading Desk' },
        apiKeyConfigured: true,
        notice: isRateLimited 
          ? 'Live stream scan paused due to YouTube API rate limit. Next scan in 10 minutes.' 
          : `YouTube API returned status ${searchRes.status}`,
        checkedAt: new Date().toISOString(),
      };

      // Cache for longer period when rate limited to prevent quota hammering
      streamCache = { 
        timestamp: now, 
        data: safeOfflineResponse, 
        ttl: isRateLimited ? RATE_LIMIT_CACHE_TTL_MS : DEFAULT_CACHE_TTL_MS 
      };
      res.json(safeOfflineResponse);
      return;
    }

    const searchData = await searchRes.json();
    const liveItems = searchData.items || [];

    if (liveItems.length === 0) {
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

      streamCache = { timestamp: now, data: responseData, ttl: DEFAULT_CACHE_TTL_MS };
      res.json(responseData);
      return;
    }

    // 4. Live Stream is ACTIVE! Fetch full video and live streaming details
    const activeItem = liveItems[0];
    const videoId = activeItem.id?.videoId;

    let viewerCount: number | undefined;
    let scheduledStartTime: string | undefined;
    let actualStartTime: string | undefined;

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

    const streamDetails = {
      videoId,
      title: activeItem.snippet?.title || 'Live Trading Session',
      description: activeItem.snippet?.description || '',
      channelTitle: activeItem.snippet?.channelTitle || channelInfo?.title || 'SM Trading',
      channelId: activeItem.snippet?.channelId || resolvedChannelId,
      publishedAt: activeItem.snippet?.publishedAt,
      actualStartTime: actualStartTime || activeItem.snippet?.publishedAt,
      scheduledStartTime,
      thumbnailUrl: 
        activeItem.snippet?.thumbnails?.maxres?.url ||
        activeItem.snippet?.thumbnails?.high?.url ||
        activeItem.snippet?.thumbnails?.medium?.url ||
        activeItem.snippet?.thumbnails?.default?.url,
      concurrentViewers: viewerCount,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&rel=0&playsinline=1&modestbranding=1`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };

    const liveResponse = {
      success: true,
      isLive: true,
      message: 'Active live stream detected',
      status: 'live',
      stream: streamDetails,
      channel: channelInfo || {
        id: activeItem.snippet?.channelId || resolvedChannelId,
        title: activeItem.snippet?.channelTitle || 'SM Trading',
      },
      apiKeyConfigured: true,
      checkedAt: new Date().toISOString(),
    };

    streamCache = { timestamp: now, data: liveResponse, ttl: DEFAULT_CACHE_TTL_MS };
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
 * POST /api/youtube/settings
 * Admin-only route to update YouTube channel configuration.
 */
router.post('/settings', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Master Admin privileges required.' });
    return;
  }

  const { channelId, channelHandle } = req.body;
  const currentSettings = (await Database.getSystemSettings()) as any;

  const updatedSettings = {
    ...currentSettings,
    youtubeSettings: {
      channelId: channelId !== undefined ? channelId : currentSettings.youtubeSettings?.channelId,
      channelHandle: channelHandle !== undefined ? channelHandle : currentSettings.youtubeSettings?.channelHandle,
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
