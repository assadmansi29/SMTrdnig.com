import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { EconomicEvent } from '../types';

interface EconomicCalendarContextType {
  events: EconomicEvent[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  serverTimeUtc: string | null;
  lastRefreshedAt: number;
  refresh: () => Promise<void>;
}

const EconomicCalendarContext = createContext<EconomicCalendarContextType>({
  events: [],
  isLoading: true,
  isRefreshing: false,
  error: null,
  serverTimeUtc: null,
  lastRefreshedAt: 0,
  refresh: async () => {}
});

export const EconomicCalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serverTimeUtc, setServerTimeUtc] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>(Date.now());

  const fetchCalendar = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsRefreshing(true);
      }
      setError(null);

      // Fetch authentic real-time economic calendar from server
      const url = `/api/economic-calendar?limit=250&daysPast=3&daysAhead=14${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        throw new Error(`Calendar service responded with HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.events)) {
        setEvents(data.events);
        setServerTimeUtc(data.serverTimeUtc || new Date().toISOString());
        setLastRefreshedAt(Date.now());
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to parse economic calendar feed');
      }
    } catch (err: any) {
      console.warn('[EconomicCalendarContext] Fetch notice:', err.message);
      setError(err.message || 'Unable to update economic calendar');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch and automated background refresh every 60 seconds
  useEffect(() => {
    fetchCalendar(false);

    const interval = setInterval(() => {
      fetchCalendar(false);
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchCalendar]);

  const refresh = useCallback(async () => {
    await fetchCalendar(true);
  }, [fetchCalendar]);

  return (
    <EconomicCalendarContext.Provider
      value={{
        events,
        isLoading,
        isRefreshing,
        error,
        serverTimeUtc,
        lastRefreshedAt,
        refresh
      }}
    >
      {children}
    </EconomicCalendarContext.Provider>
  );
};

export const useEconomicCalendar = (): EconomicCalendarContextType => {
  return useContext(EconomicCalendarContext);
};
