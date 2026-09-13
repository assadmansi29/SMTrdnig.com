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
export const OFFICIAL_SMTRADING_UPLOADS_PLAYLIST = 'UUkohQ1nDiIosi6gTPv0oXQA';
export const OFFICIAL_SMTRADING_HANDLE = '@SMTradingpro';

// Cloud API key default fallback so live broadcasts are detected even if the deployment environment lacks YOUTUBE_API_KEY
const DEFAULT_YOUTUBE_API_KEY = 'AIzaSyDkMGOWMuCJ6-x9Xhen7ZDOXo0nlGdtCmk';

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

  try {
    let activeVideoId: string | null = null;
    let activeSnippet: any = null;
    let activeLiveDetails: any = null;

    // Strategy 1: If an admin explicitly set a manual video ID, verify that it belongs to SMTrading
    if (manualVideoId && apiKey) {
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
              activeLiveDetails = candidate.liveStreamingDetails;
            }
          }
        }
      } catch (err) {
        console.warn('[YouTube Live] Error verifying manual video:', err);
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
        console.warn('[YouTube Live] Search API query error:', err);
      }
    }

    // Strategy 3: Check channel uploads playlist (instant real-time broadcast discovery without search delay)
    if (!activeVideoId && apiKey) {
      try {
        const uploadsPlaylistId = targetChannelId.startsWith('UC')
          ? 'UU' + targetChannelId.substring(2)
          : OFFICIAL_SMTRADING_UPLOADS_PLAYLIST;
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
        console.warn('[YouTube Live] Playlist query error:', err);
      }
    }

    // Strategy 4: Direct channel /live endpoint with oEmbed verification (Works globally even without API key or if quota runs out)
    if (!activeVideoId) {
      try {
        const directUrl = `https://www.youtube.com/channel/${encodeURIComponent(targetChannelId)}/live?cbrd=1&ucbcb=1`;
        const directRes = await fetch(directUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AwGgJlbhACGgYIgLCvpgY; CONSENT=YES+cb',
          },
          redirect: 'follow',
        });

        if (directRes.ok) {
          const html = await directRes.text();
          const initialDataMatch = html.match(/var ytInitialData = (\{.+?\});<\/script>/) || html.match(/ytInitialData\s*=\s*(\{.+?\});/);
          if (initialDataMatch) {
            const d = JSON.parse(initialDataMatch[1]);
            const candidateVId = d.currentVideoEndpoint?.watchEndpoint?.videoId;
            const hasLiveChat = html.includes('liveChatRenderer');
            const hasIsLive = html.includes('"isLive":true') || html.includes('"status":"LIVE"');
            const mentionsChannel = html.includes(targetChannelId);

            if (candidateVId && (hasLiveChat || hasIsLive) && mentionsChannel) {
              // Strictly verify ownership via official public oEmbed API
              const oeRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${candidateVId}&format=json`);
              if (oeRes.ok) {
                const oe = await oeRes.json();
                const authorMatches = (oe.author_name && /smtrading/i.test(oe.author_name)) ||
                                      (oe.author_url && /smtrading/i.test(oe.author_url));
                if (authorMatches) {
                  activeVideoId = candidateVId;
                  activeSnippet = {
                    title: oe.title,
                    channelTitle: oe.author_name || 'SMTradingpro',
                    channelId: targetChannelId,
                    publishedAt: new Date().toISOString(),
                    thumbnails: {
                      high: { url: oe.thumbnail_url || `https://i.ytimg.com/vi/${candidateVId}/hqdefault_live.jpg` }
                    }
                  };
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[YouTube Live] Direct channel scraper fallback error:', err);
      }
    }

    // If no verified active broadcast was found on our channel, return offline immediately
    if (!activeVideoId) {
      const offlineData = createOfflineResponse('No active live broadcast found on SMTrading channel');
      streamCache = { timestamp: now, data: offlineData, ttl: OFFLINE_CACHE_TTL_MS };
      res.json(offlineData);
      return;
    }

    // Perform final verification via videos endpoint if live details not yet retrieved and apiKey available
    if (apiKey && !activeLiveDetails) {
      try {
        const videoRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,status&id=${encodeURIComponent(activeVideoId)}&key=${apiKey}`
        );

        if (videoRes.ok) {
          const videoData = await videoRes.json();
          const video = videoData.items?.[0];

          if (video) {
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

            activeSnippet = video.snippet;
            activeLiveDetails = video.liveStreamingDetails;
          }
        }
      } catch (err) {
        console.warn('[YouTube Live] Video details verification error:', err);
      }
    }

    // Broadcast is verified and actively streaming!
    const cleanTitle = decodeHtmlEntities(activeSnippet?.title || 'SMTrading Live Session');
    const cleanDesc = decodeHtmlEntities(activeSnippet?.description || '');
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
      channelTitle: activeSnippet?.channelTitle || 'SMTradingpro',
      channelId: targetChannelId,
      publishedAt: activeSnippet?.publishedAt,
      actualStartTime: activeLiveDetails?.actualStartTime || activeSnippet?.publishedAt || new Date().toISOString(),
      scheduledStartTime: activeLiveDetails?.scheduledStartTime,
      thumbnailUrl: videoThumb,
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
        title: activeSnippet?.channelTitle || 'SMTradingpro',
        handle: channelHandle,
      },
      apiKeyConfigured: Boolean(apiKey),
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
