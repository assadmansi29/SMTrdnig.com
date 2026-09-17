import { useEffect } from 'react';

/**
 * Google Analytics 4 (GA4) Integration using official Google gtag.js
 * Measurement ID: G-ZJXX2D3V54
 */

export const GA_MEASUREMENT_ID = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GA_MEASUREMENT_ID) || 
  'G-ZJXX2D3V54';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Ensures gtag is callable safely across both browser and SSR/build environments
 */
export const gtag = (...args: unknown[]) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
  } else {
    window.dataLayer.push(args);
  }
};

/**
 * Track a page view event in GA4
 */
export const trackPageView = (pagePath?: string, pageTitle?: string) => {
  if (typeof window === 'undefined') return;
  const path = pagePath || window.location.pathname + window.location.search + window.location.hash;
  const title = pageTitle || document.title;

  gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
    send_to: GA_MEASUREMENT_ID,
  });
};

/**
 * Track custom user events in GA4 (e.g., category selection, article reading, modal opens)
 */
export const trackEvent = (
  eventName: string,
  eventParams: Record<string, unknown> = {}
) => {
  if (typeof window === 'undefined') return;
  gtag('event', eventName, {
    ...eventParams,
    send_to: GA_MEASUREMENT_ID,
  });
};

/**
 * Custom React hook for tracking page views across all views and navigation changes
 */
export const usePageTracking = () => {
  useEffect(() => {
    // Track initial page view
    trackPageView();

    const handleLocationChange = () => {
      trackPageView();
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);
};
