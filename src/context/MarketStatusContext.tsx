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

// Default to Spot Gold (OANDA) as the platform's primary market
const DEFAULT_MARKET_ID = 'OANDA:XAUUSD';

const MarketStatusContext = createContext<MarketStatusContextType | undefined>(undefined);

export const MarketStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeMarketId, setActiveMarketIdState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('smtrading_active_market_id');
      if (stored && stored.startsWith('BLACKBULL:')) {
        let migrated = DEFAULT_MARKET_ID;
        if (stored.includes('NAS100')) migrated = 'OANDA:NAS100USD';
        else if (stored.includes('US30') || stored.includes('US3O')) migrated = 'OANDA:US30USD';
        else if (stored.includes('GER40') || stored.includes('DAX')) migrated = 'OANDA:DE30EUR';
        else if (stored.includes('EURUSD')) migrated = 'OANDA:EURUSD';
        else if (stored.includes('GBPUSD')) migrated = 'OANDA:GBPUSD';
        else if (stored.includes('BTCUSD')) migrated = 'BINANCE:BTCUSDT';
        localStorage.setItem('smtrading_active_market_id', migrated);
        return migrated;
      }
      return stored || DEFAULT_MARKET_ID;
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
