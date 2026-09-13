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

// Official SMTrading YouTube Channel constants
export const OFFICIAL_SMTRADING_CHANNEL_ID = 'UCkohQ1nDiIosi6gTPv0oXQA';
export const OFFICIAL_SMTRADING_HANDLE = '@SMTradingpro';

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
 * Server-side proxy for YouTube Data API v3 to detect active live streams.
 * STRICT SECURITY & FILTERING:
 * - ONLY queries and accepts broadcasts from the official SMTrading channel ID (UCkohQ1nDiIosi6gTPv0oXQA).
 * - NEVER performs global YouTube searches.
 * - Rejects any broadcast whose channelId does not match the official channel.
 * - If no live broadcast is active on SMTrading's channel, returns offline state.
 */
router.get('/live-stream', async (req: Request, res: Response): Promise<void> => {
  // Prevent browser & proxy caching of live stream polling
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

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

  const apiKey = process.env.YOUTUBE_API_KEY;
  let dbSettings: any = null;
  try {
    dbSettings = await Database.getSystemSettings();
  } catch {
    // Database initializing or busy; gracefully fall back to default
  }

  // Strict Channel ID: Only SMTrading official channel ID
  const targetChannelId = (
    process.env.YOUTUBE_CHANNEL_ID ||
    dbSettings?.youtubeSettings?.channelId ||
    OFFICIAL_SMTRADING_CHANNEL_ID
  ).trim();

  const channelHandle = (
    process.env.YOUTUBE_CHANNEL_HANDLE ||
    dbSettings?.youtubeSettings?.channelHandle ||
    OFFICIAL_SMTRADING_HANDLE
  ).trim();

  const manualVideoId = dbSettings?.youtubeSettings?.manualVideoId?.trim() || '';

  // Standard offline response helper
  const createOfflineResponse = (reason: string = 'SMTrading is currently offline') => ({
    success: true,
    isLive: false,
    message: 'SMTrading is currently offline',
    status: 'offline',
    stream: null,
    channel: {
      id: targetChannelId,
      handle: channelHandle,
      title: 'SMTradingpro',
    },
    apiKeyConfigured: Boolean(apiKey),
    checkedAt: new Date().toISOString(),
    details: reason,
  });

  // If no API key is configured, return offline immediately (never scrape arbitrary global HTML)
  if (!apiKey) {
    const offlineData = createOfflineResponse('YouTube API Key not configured on server');
    streamCache = { timestamp: now, data: offlineData, ttl: OFFLINE_CACHE_TTL_MS };
    res.json(offlineData);
    return;
  }

  try {
    let activeVideoId: string | null = null;
    let activeSnippet: any = null;

    // 1. If an admin explicitly set a manual video ID, verify that it belongs to our channel
    if (manualVideoId) {
      try {
        const manualRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=${encodeURIComponent(manualVideoId)}&key=${apiKey}`
        );
        if (manualRes.ok) {
          const manualData = await manualRes.json();
          const candidate = manualData.items?.[0];
          if (candidate) {
            const videoChanId = candidate.snippet?.channelId;
            const isLive = candidate.snippet?.liveBroadcastContent === 'live';
            const hasEnded = Boolean(candidate.liveStreamingDetails?.actualEndTime);
            if (videoChanId === targetChannelId && isLive && !hasEnded) {
              activeVideoId = manualVideoId;
              activeSnippet = candidate.snippet;
            } else {
              console.warn(`[YouTube Live] Manual video ${manualVideoId} rejected (channelId: ${videoChanId}, isLive: ${isLive}, hasEnded: ${hasEnded})`);
            }
          }
        }
      } catch (err) {
        console.warn('Error verifying manual video:', err);
      }
    }

    // 2. Search for active live streams STRICTLY filtered by our channelId
    if (!activeVideoId) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(targetChannelId)}&eventType=live&type=video&maxResults=5&key=${apiKey}`;
      const searchRes = await fetch(searchUrl);

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const items = searchData.items || [];

        // STRICT FILTER: Match video whose channelId EXACTLY equals targetChannelId and is currently live
        const matchingItem = items.find((item: any) => {
          const vId = item.id?.videoId;
          const chanId = item.snippet?.channelId;
          const isLive = item.snippet?.liveBroadcastContent === 'live';
          return vId && chanId === targetChannelId && isLive;
        });

        if (matchingItem) {
          activeVideoId = matchingItem.id.videoId;
          activeSnippet = matchingItem.snippet;
        }
      } else {
        console.warn(`[YouTube API] Search endpoint returned HTTP ${searchRes.status}`);
      }
    }

    // If no verified active broadcast was found on our channel, return offline immediately
    if (!activeVideoId) {
      const offlineData = createOfflineResponse('No active live broadcast found on SMTrading channel');
      streamCache = { timestamp: now, data: offlineData, ttl: OFFLINE_CACHE_TTL_MS };
      res.json(offlineData);
      return;
    }

    // 3. Perform final verification via videos endpoint
    const videoRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=${encodeURIComponent(activeVideoId)}&key=${apiKey}`
    );

    if (!videoRes.ok) {
      const offlineData = createOfflineResponse('Could not verify video details from YouTube API');
      streamCache = { timestamp: now, data: offlineData, ttl: OFFLINE_CACHE_TTL_MS };
      res.json(offlineData);
      return;
    }

    const videoData = await videoRes.json();
    const video = videoData.items?.[0];

    if (!video) {
      const offlineData = createOfflineResponse('Video not found in YouTube API');
      streamCache = { timestamp: now, data: offlineData, ttl: OFFLINE_CACHE_TTL_MS };
      res.json(offlineData);
      return;
    }

    // STRICT CHECK 1: Channel ID MUST match targetChannelId
    if (video.snippet?.channelId !== targetChannelId) {
      console.warn(`[YouTube Security Filter] Video ${activeVideoId} rejected: channelId "${video.snippet?.channelId}" does not match SMTrading channel "${targetChannelId}"`);
      const offlineData = createOfflineResponse('Broadcast belongs to an unauthorized channel');
      streamCache = { timestamp: now, data: offlineData, ttl: OFFLINE_CACHE_TTL_MS };
      res.json(offlineData);
      return;
    }

    // STRICT CHECK 2: Broadcast MUST be actively live right now (not upcoming, not ended, not VOD)
    const isLiveBroadcast = video.snippet?.liveBroadcastContent === 'live';
    const liveDetails = video.liveStreamingDetails;
    const hasEnded = Boolean(liveDetails?.actualEndTime);

    if (!isLiveBroadcast || hasEnded) {
      console.log(`[YouTube Filter] Video ${activeVideoId} is not actively live (liveBroadcastContent: ${video.snippet?.liveBroadcastContent}, hasEnded: ${hasEnded})`);
      const offlineData = createOfflineResponse('Stream is not actively broadcasting live');
      streamCache = { timestamp: now, data: offlineData, ttl: OFFLINE_CACHE_TTL_MS };
      res.json(offlineData);
      return;
    }

    // Broadcast is verified and actively streaming!
    const cleanTitle = decodeHtmlEntities(video.snippet?.title || 'SMTrading Live Session');
    const cleanDesc = decodeHtmlEntities(video.snippet?.description || '');
    const videoThumb =
      video.snippet?.thumbnails?.maxres?.url ||
      video.snippet?.thumbnails?.high?.url ||
      video.snippet?.thumbnails?.medium?.url ||
      video.snippet?.thumbnails?.default?.url;

    const viewerCount = liveDetails?.concurrentViewers ? parseInt(liveDetails.concurrentViewers, 10) : undefined;

    const streamDetails = {
      videoId: activeVideoId,
      title: cleanTitle,
      description: cleanDesc,
      channelTitle: video.snippet?.channelTitle || 'SMTradingpro',
      channelId: targetChannelId,
      publishedAt: video.snippet?.publishedAt,
      actualStartTime: liveDetails?.actualStartTime || video.snippet?.publishedAt || new Date().toISOString(),
      scheduledStartTime: liveDetails?.scheduledStartTime,
      thumbnailUrl: videoThumb || `https://i.ytimg.com/vi/${activeVideoId}/hqdefault_live.jpg`,
      concurrentViewers: viewerCount,
      embedUrl: `https://www.youtube.com/embed/${activeVideoId}?autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1`,
      watchUrl: `https://www.youtube.com/watch?v=${activeVideoId}`,
    };

    const liveResponse = {
      success: true,
      isLive: true,
      message: 'Active live stream detected',
      status: 'live',
      stream: streamDetails,
      channel: {
        id: targetChannelId,
        title: video.snippet?.channelTitle || 'SMTradingpro',
        handle: channelHandle,
      },
      apiKeyConfigured: true,
      checkedAt: new Date().toISOString(),
    };

    streamCache = { timestamp: now, data: liveResponse, ttl: LIVE_CACHE_TTL_MS };
    res.json(liveResponse);
  } catch (error: any) {
    console.error('Error querying YouTube Data API:', error);
    const offlineData = createOfflineResponse('Error querying YouTube stream status');
    res.json(offlineData);
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
