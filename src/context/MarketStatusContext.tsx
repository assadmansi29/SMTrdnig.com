import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getMarketScheduleStatus,
  MarketStatusResult,
  getWorldMarketSessions,
  WorldSessionInfo,
} from '../utils/marketSchedule';

export interface MarketStatusContextType {
  activeMarketId: string;
  setActiveMarketId: (marketId: string) => void;
  status: MarketStatusResult;
  worldSessions: WorldSessionInfo[];
  refresh: () => void;
}

// Default to Spot Gold / CME Globex Futures as the platform's primary market
const DEFAULT_MARKET_ID = 'BLACKBULL:XAUUSD';

const MarketStatusContext = createContext<MarketStatusContextType | undefined>(undefined);

export const MarketStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMarketId, setActiveMarketIdState] = useState<string>(() => {
    try {
      return localStorage.getItem('smtrading_active_market_id') || DEFAULT_MARKET_ID;
    } catch {
      return DEFAULT_MARKET_ID;
    }
  });

  const [status, setStatus] = useState<MarketStatusResult>(() =>
    getMarketScheduleStatus(activeMarketId)
  );

  const [worldSessions, setWorldSessions] = useState<WorldSessionInfo[]>(() =>
    getWorldMarketSessions()
  );

  const refresh = useCallback(() => {
    setStatus(getMarketScheduleStatus(activeMarketId));
    setWorldSessions(getWorldMarketSessions());
  }, [activeMarketId]);

  const setActiveMarketId = useCallback((newId: string) => {
    if (!newId) return;
    setActiveMarketIdState(newId);
    try {
      localStorage.setItem('smtrading_active_market_id', newId);
    } catch {}
    setStatus(getMarketScheduleStatus(newId));
    setWorldSessions(getWorldMarketSessions());
  }, []);

  // Sync real-time countdown every second
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <MarketStatusContext.Provider
      value={{
        activeMarketId,
        setActiveMarketId,
        status,
        worldSessions,
        refresh,
      }}
    >
      {children}
    </MarketStatusContext.Provider>
  );
};

export const useMarketStatus = (): MarketStatusContextType => {
  const ctx = useContext(MarketStatusContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    const fallbackStatus = getMarketScheduleStatus(DEFAULT_MARKET_ID);
    return {
      activeMarketId: DEFAULT_MARKET_ID,
      setActiveMarketId: () => {},
      status: fallbackStatus,
      worldSessions: getWorldMarketSessions(),
      refresh: () => {},
    };
  }
  return ctx;
};
