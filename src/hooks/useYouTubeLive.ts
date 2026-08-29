import { useState, useEffect, useCallback, useRef } from 'react';
import { YouTubeLiveStatus, YouTubeLiveStream } from '../types';

export function useYouTubeLive() {
  const [data, setData] = useState<YouTubeLiveStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLiveStatus = useCallback(async (force = false) => {
    if (force) {
      setIsRefreshing(true);
    }
    try {
      const url = `/api/youtube/live-stream${force ? '?force=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const result: YouTubeLiveStatus = await res.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to fetch YouTube live status:', err);
      setError(err.message || 'Failed to connect to YouTube live status');
      // If no data exists yet, set fallback offline status
      if (!data) {
        setData({
          success: true,
          isLive: false,
          message: 'No Live Stream Currently',
          status: 'idle',
          stream: null,
          channel: { title: 'SM Trading Desk' },
          apiKeyConfigured: false,
          checkedAt: new Date().toISOString(),
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [data]);

  // Initial fetch and automatic periodic polling (every 45s)
  useEffect(() => {
    fetchLiveStatus();

    // Auto-update when a new live stream starts or ends
    const interval = setInterval(() => {
      fetchLiveStatus();
    }, 45 * 1000);

    pollTimerRef.current = interval;

    // Refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLiveStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchLiveStatus]);

  const refresh = useCallback(() => {
    return fetchLiveStatus(true);
  }, [fetchLiveStatus]);

  return {
    isLive: data?.isLive ?? false,
    stream: data?.stream ?? null,
    channel: data?.channel ?? null,
    message: data?.message ?? 'No Live Stream Currently',
    status: data?.status ?? 'idle',
    apiKeyConfigured: data?.apiKeyConfigured ?? false,
    checkedAt: data?.checkedAt ?? null,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
}
