import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { YouTubeLiveStatus, YouTubeLiveStream } from '../types';

export interface YouTubeLiveContextType {
  isLive: boolean;
  stream: YouTubeLiveStream | null;
  channel: YouTubeLiveStatus['channel'] | null;
  latestVideo?: YouTubeLiveStatus['latestVideo'];
  rtmpPrimary?: string;
  message: string;
  status: string;
  apiKeyConfigured: boolean;
  checkedAt: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const YouTubeLiveContext = createContext<YouTubeLiveContextType | undefined>(undefined);

export const YouTubeLiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<YouTubeLiveStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isFetchingRef = useRef<boolean>(false);

  const fetchLiveStatus = useCallback(async (force = false) => {
    if (isFetchingRef.current && !force) {
      return;
    }
    isFetchingRef.current = true;
    if (force) {
      setIsRefreshing(true);
    }

    try {
      const sep = force ? '&' : '?';
      const url = `/api/youtube/live-stream${force ? '?force=true' : ''}${sep}_t=${Date.now()}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const result: YouTubeLiveStatus = await res.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      console.warn('Failed to fetch YouTube live status:', err);
      setError(err.message || 'Failed to connect to YouTube live status');
      setData((prev) => prev ?? {
        success: true,
        isLive: false,
        message: 'No Live Stream Currently',
        status: 'idle',
        stream: null,
        channel: { title: 'SM Trading Desk' },
        apiKeyConfigured: false,
        checkedAt: new Date().toISOString(),
      });
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchLiveStatus();

    // Auto-poll every 25 seconds for fast detection
    const interval = setInterval(() => {
      fetchLiveStatus();
    }, 25 * 1000);

    // Refresh when user returns to window tab
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

  const refresh = useCallback(async () => {
    await fetchLiveStatus(true);
  }, [fetchLiveStatus]);

  return (
    <YouTubeLiveContext.Provider
      value={{
        isLive: data?.isLive ?? false,
        stream: data?.stream ?? null,
        channel: data?.channel ?? null,
        latestVideo: data?.latestVideo ?? null,
        rtmpPrimary: data?.rtmpPrimary ?? 'rtmp://a.rtmp.youtube.com/live2',
        message: data?.message ?? 'No Live Stream Currently',
        status: data?.status ?? 'idle',
        apiKeyConfigured: data?.apiKeyConfigured ?? false,
        checkedAt: data?.checkedAt ?? null,
        isLoading,
        isRefreshing,
        error,
        refresh,
      }}
    >
      {children}
    </YouTubeLiveContext.Provider>
  );
};

export function useYouTubeLive() {
  const context = useContext(YouTubeLiveContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      isLive: false,
      stream: null,
      channel: null,
      latestVideo: null,
      rtmpPrimary: 'rtmp://a.rtmp.youtube.com/live2',
      message: 'No Live Stream Currently',
      status: 'idle',
      apiKeyConfigured: false,
      checkedAt: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: async () => {},
    };
  }
  return context;
}
