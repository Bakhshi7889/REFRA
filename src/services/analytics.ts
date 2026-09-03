/**
 * Google Analytics 4 (GA4) Telemetry & Analytics Service for Refra
 * 
 * Tracks:
 * - Realtime active users, count, session duration
 * - Device category (mobile/tablet/desktop), OS, browser, screen resolution
 * - Geo location (country, region, city)
 * - User journeys: page views (Home, Explore, Watchlist, Profile)
 * - Movie & Anime views, searches, playback events, embed servers, watchlist changes
 */

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    _gaInitialized?: boolean;
  }
}

const DEFAULT_MEASUREMENT_ID = 'G-QDD1JH8J06';
const STORAGE_KEY = 'refra_ga_measurement_id';

/**
 * Get active GA4 Measurement ID from environment variable, local storage, or default stream.
 */
export function getMeasurementId(): string {
  const envId =
    (import.meta as any).env?.VITE_GA_MEASUREMENT_ID ||
    (import.meta as any).env?.VITE_GA4_ID ||
    (import.meta as any).env?.VITE_GA_ID ||
    '';

  if (envId && typeof envId === 'string' && envId.trim().startsWith('G-')) {
    return envId.trim();
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('luma_ga_measurement_id');
    if (local && local.trim().startsWith('G-')) {
      return local.trim();
    }
  } catch {
    // ignore
  }

  return DEFAULT_MEASUREMENT_ID;
}

/**
 * Save manual Measurement ID in local storage for quick testing.
 */
export function saveManualMeasurementId(id: string): void {
  try {
    const trimmed = id.trim();
    if (!trimmed) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('luma_ga_measurement_id');
      return;
    }
    localStorage.setItem(STORAGE_KEY, trimmed);
    initGoogleAnalytics();
  } catch (err) {
    console.warn('Failed to store GA ID:', err);
  }
}

/**
 * Dynamically injects Google Analytics 4 tracking script into document head if not already loaded.
 */
export function initGoogleAnalytics(): boolean {
  if (typeof window === 'undefined') return false;

  const measurementId = getMeasurementId();
  if (!measurementId || !measurementId.startsWith('G-')) {
    return false;
  }

  // If already initialized by index.html or previous call
  if (window._gaInitialized) {
    return true;
  }

  try {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      };
      window.gtag('js', new Date());
    }

    window.gtag('config', measurementId, {
      send_page_view: true,
      cookie_flags: 'SameSite=None;Secure',
    });

    // Check if script tag is already in head
    const existing = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id="]`);
    if (!existing) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      script.id = 'refra-gtag-script';
      document.head.appendChild(script);
    }

    window._gaInitialized = true;
    return true;
  } catch (err) {
    console.warn('Google Analytics initialization notice:', err);
    return false;
  }
}

/**
 * Safe wrapper to dispatch GA4 events
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  if (typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, {
        app_name: 'Refra Cinema',
        timestamp: Date.now(),
        ...params,
      });
    } catch {
      // ignore
    }
  }
}

/**
 * Tracks Screen/Tab changes (Home, Explore, Watchlist, Profile)
 */
export function trackPageView(pageTitle: string, pagePath: string = window.location.pathname): void {
  trackEvent('page_view', {
    page_title: pageTitle,
    page_location: window.location.href,
    page_path: pagePath,
  });
}

/**
 * Tracks when a user inspects movie/anime details
 */
export function trackMediaView(media: {
  id: string;
  title: string;
  genres?: string[];
  score?: number | string;
  releaseYear?: number | string;
}): void {
  trackEvent('view_item', {
    item_id: media.id,
    item_name: media.title,
    item_category: media.genres?.[0] || 'Cinema',
    item_score: media.score,
    release_year: media.releaseYear,
  });
}

/**
 * Tracks stream playback start
 */
export function trackStreamStart(media: {
  id: string;
  title: string;
  sourceServer?: string;
  isAnime?: boolean;
  episode?: number;
}): void {
  trackEvent('video_start', {
    media_id: media.id,
    media_title: media.title,
    server_source: media.sourceServer || 'VidSrc Pro',
    content_type: media.isAnime ? 'anime' : 'movie',
    episode_number: media.episode || 1,
  });
}

/**
 * Tracks live movie searches
 */
export function trackSearchQuery(query: string, resultCount: number): void {
  if (!query.trim()) return;
  trackEvent('search', {
    search_term: query.trim(),
    results_count: resultCount,
  });
}

/**
 * Tracks additions and removals from watchlist
 */
export function trackWatchlistAction(movieId: string, title: string, action: 'add' | 'remove'): void {
  trackEvent(action === 'add' ? 'add_to_wishlist' : 'remove_from_wishlist', {
    item_id: movieId,
    item_name: title,
  });
}

/**
 * Tracks UI theme customization
 */
export function trackThemeSelection(themeName: string, mode: string): void {
  trackEvent('select_theme', {
    theme_name: themeName,
    theme_mode: mode,
  });
}

/**
 * Tracks embed server selection in preferences
 */
export function trackServerPreference(serverName: string): void {
  trackEvent('select_server_source', {
    preferred_server: serverName,
  });
}
