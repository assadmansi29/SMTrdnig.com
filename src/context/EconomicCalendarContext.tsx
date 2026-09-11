import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { EconomicEvent } from '../types';

interface EconomicCalendarContextType {
  events: EconomicEvent[];
  isLoading: boolean;
  error: string | null;
  serverTimeUtc: string | null;
  refresh: () => Promise<void>;
}

const EconomicCalendarContext = createContext<EconomicCalendarContextType>({
  events: [],
  isLoading: true,
  error: null,
  serverTimeUtc: null,
  refresh: async () => {}
});

export const EconomicCalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [serverTimeUtc, setServerTimeUtc] = useState<string | null>(null);

  const fetchCalendar = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      // daysPast=0 keeps the view locked to today's active releases and upcoming events
      const url = `/api/economic-calendar?limit=100&daysPast=0&daysAhead=14${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('Live economic calendar unavailable');
      }

      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.events)) {
        setEvents(data.events);
        setServerTimeUtc(data.serverTimeUtc || new Date().toISOString());
        setError(null);
      } else {
        throw new Error(data.error || 'Live economic calendar unavailable');
      }
    } catch (err: any) {
      console.warn('[EconomicCalendarContext] Fetch notice:', err.message);
      setError('Live economic calendar unavailable');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
    // Auto re-fetch every 60 seconds to track live status and new releases
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
        error,
        serverTimeUtc,
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
