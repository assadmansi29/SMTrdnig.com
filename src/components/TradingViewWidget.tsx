import React, { useEffect, useRef, memo } from 'react';
import { ExternalLink, BarChart2 } from 'lucide-react';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'dark' | 'light';
  interval?: string;
  timezone?: string;
  hideSideToolbar?: boolean;
  height?: string;
  className?: string;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({
  symbol = 'CME_MINI:ES1!',
  theme = 'dark',
  interval = '15',
  timezone = 'Etc/UTC',
  hideSideToolbar = false,
  height,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget content
    containerRef.current.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container__widget';
    widgetContainer.style.height = 'calc(100% - 32px)';
    widgetContainer.style.width = '100%';
    containerRef.current.appendChild(widgetContainer);

    const copyrightContainer = document.createElement('div');
    copyrightContainer.className = 'tradingview-widget-copyright';
    copyrightContainer.innerHTML = `
      <div style="font-size: 11px; color: #64748b; padding: 6px 12px; display: flex; align-items: center; justify-content: space-between; background: #080C14; border-top: 1px solid #1E293B;">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #94a3b8;">TradingView.com Live Market Feed</span>
        </span>
        <a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow noreferrer" style="color: #f59e0b; text-decoration: none; font-size: 10px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
          <span>tradingview.com</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      </div>
    `;
    containerRef.current.appendChild(copyrightContainer);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: timezone,
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_side_toolbar: hideSideToolbar,
      withdateranges: true,
      hide_volume: false,
      backgroundColor: '#090D17',
      gridColor: '#1E293B',
      save_image: false,
      details: true,
      hotlist: false,
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650'
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, theme, interval, timezone, hideSideToolbar]);

  return (
    <div 
      className={`tradingview-widget-container w-full bg-[#090D17] rounded-xl overflow-hidden border border-slate-800 flex flex-col ${className || 'h-full min-h-[480px]'}`} 
      style={height ? { height } : undefined}
      ref={containerRef}
    >
      <div className="tradingview-widget-container__widget flex-1 w-full"></div>
    </div>
  );
});
