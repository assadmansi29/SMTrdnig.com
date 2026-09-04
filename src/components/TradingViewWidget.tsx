import React, { memo, useState, useEffect, useId } from 'react';
import { ExternalLink } from 'lucide-react';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  interval?: string;
  timezone?: string;
  hideSideToolbar?: boolean;
  enableDrawingTools?: boolean;
  height?: string;
  className?: string;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({
  symbol = 'OANDA:XAUUSD',
  theme = 'dark',
  interval = '15',
  timezone = 'Etc/UTC',
  hideSideToolbar = false,
  enableDrawingTools = false,
  height,
  className
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const widgetId = useId().replace(/:/g, '_');

  // Reset loading state when symbol or interval changes
  useEffect(() => {
    setIsLoading(true);
  }, [symbol, interval]);

  // If drawing tools are explicitly enabled (e.g. for Super Admin / Admin), side toolbar MUST be shown
  const shouldHideToolbar = enableDrawingTools ? false : hideSideToolbar;

  // Build secure, isolated TradingView Widget embed URL with full capability parameters
  const searchParams = new URLSearchParams({
    frameElementId: `tradingview_${widgetId}`,
    symbol: symbol,
    interval: interval,
    hidesidetoolbar: shouldHideToolbar ? '1' : '0',
    symboledit: '1',
    saveimage: '1',
    toolbarbg: '090D17',
    studies: JSON.stringify(['STD;SMA', 'STD;EMA']),
    theme: theme,
    style: '1',
    timezone: timezone,
    withdateranges: '1',
    studies_overrides: '{}',
    enabled_features: JSON.stringify([
      'side_toolbar_in_fullscreen_mode', 
      'header_in_fullscreen_mode', 
      'use_localstorage_for_settings'
    ]),
    disabled_features: '[]',
    locale: 'en',
    utm_source: 'smtrading.pro'
  });

  const embedUrl = `https://s.tradingview.com/widgetembed/?${searchParams.toString()}`;

  return (
    <div 
      className={`tradingview-widget-container w-full bg-[#090D17] rounded-xl overflow-hidden border border-slate-800 flex flex-col relative ${className || 'h-full min-h-[300px]'}`} 
      style={height ? { height } : undefined}
    >
      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-[#090D17] flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[11px] font-mono-num text-slate-400">Loading {symbol} stream...</span>
        </div>
      )}

      {/* Sandboxed, Isolated TradingView Chart Iframe */}
      <iframe
        key={`${symbol}_${interval}`}
        id={`tv-iframe-${widgetId}`}
        title={`TradingView Chart - ${symbol}`}
        src={embedUrl}
        className="w-full flex-1 border-0"
        style={{ width: '100%', height: 'calc(100% - 24px)', border: 'none' }}
        onLoad={() => setIsLoading(false)}
      />

      {/* TradingView Compliance & Attribution Bar */}
      <div className="h-6 bg-[#070A10] border-t border-[#131B2E] px-3 flex items-center justify-between text-[8.5px] shrink-0 select-none">
        <span className="flex items-center gap-1.5 text-slate-400 font-mono-num">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>TradingView Feed: <strong className="text-slate-300">{symbol} ({interval}m)</strong></span>
        </span>
        <a 
          href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`} 
          target="_blank" 
          rel="noopener nofollow noreferrer" 
          className="text-amber-400/90 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
        >
          <span>tradingview.com</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
});

