import { useEffect } from 'react';

/**
 * Google Analytics 4 (GA4) Integration using official Google gtag.js
 * Measurement ID: G-VPZXSPQ537
 */

export const GA_MEASUREMENT_ID = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GA_MEASUREMENT_ID) || 
  'G-VPZXSPQ537';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Initializes Google Analytics 4 dynamically if not already loaded
 */
export const initGA = (measurementId: string = GA_MEASUREMENT_ID) => {
  if (typeof window === 'undefined' || !measurementId) return;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function (...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
  }

  // Ensure script is loaded for this measurement ID
  const scriptId = `ga4-script-${measurementId}`;
  if (!document.getElementById(scriptId) && !document.querySelector(`script[src*="${measurementId}"]`)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }

  window.gtag('config', measurementId, {
    send_page_view: false, // Handled precisely via trackPageView to avoid duplicates in SPAs
  });
};

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
    initGA(GA_MEASUREMENT_ID);
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
