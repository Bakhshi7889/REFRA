import { Movie } from '../types';
import { getPosterUrl, getBackdropUrl } from '../utils/imageHelpers';
import { isDataSaverActive } from './themeStore';

export interface CachedCatalog {
  spotlightMovies: Movie[];
  trendingMovies: Movie[];
  animeMovies: Movie[];
  topRatedMovies: Movie[];
  scifiMovies: Movie[];
  actionMovies: Movie[];
  thrillerMovies: Movie[];
}

const CACHE_KEY = 'refra_movies_6h_cache_v5';
const TIMESTAMP_KEY = 'refra_movies_6h_timestamp_v5';
export const SIX_HOURS_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * Checks for a valid 6-hour cached movie catalog.
 * If expired (>6 hours) or invalid, clears the cache and returns null.
 */
export function getValid6HourCache(): CachedCatalog | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawTimestamp = localStorage.getItem(TIMESTAMP_KEY);
    if (!rawTimestamp) return null;

    const timestamp = parseInt(rawTimestamp, 10);
    const now = Date.now();
    const age = now - timestamp;

    // If cache is 6 hours or older, delete it as requested
    if (isNaN(timestamp) || age >= SIX_HOURS_MS) {
      clear6HourCache();
      return null;
    }

    const rawData = localStorage.getItem(CACHE_KEY);
    if (!rawData) return null;

    const parsed = JSON.parse(rawData) as CachedCatalog;
    if (
      parsed &&
      Array.isArray(parsed.spotlightMovies) &&
      Array.isArray(parsed.trendingMovies) &&
      parsed.trendingMovies.length > 0
    ) {
      return parsed;
    }

    clear6HourCache();
    return null;
  } catch (err) {
    console.warn('Cache read notice:', err);
    clear6HourCache();
    return null;
  }
}

/**
 * Stores fresh movie lists with a 6-hour expiration timestamp.
 */
export function save6HourCache(catalog: CachedCatalog): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(catalog));
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());

    // Only minimal preload if Data Saver is not active
    if (!isDataSaverActive()) {
      preloadCatalogImages(catalog);
    }
  } catch (err) {
    console.warn('Cache write notice (localStorage may be full):', err);
  }
}

/**
 * Deletes the 6-hour movie and poster cache.
 */
export function clear6HourCache(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
  } catch {
    // ignore
  }
}

/**
 * Lightweight, strictly conservative asset pre-warming.
 * Never downloads dozens of images on startup.
 */
export function preloadCatalogImages(catalog: CachedCatalog): void {
  if (typeof window === 'undefined') return;
  if (isDataSaverActive()) return;

  // In normal mode, only gently pre-warm the primary hero banner (1 image)
  const firstSpotlight = catalog.spotlightMovies?.[0];
  if (firstSpotlight?.backdropUrl) {
    const heroUrl = getBackdropUrl(firstSpotlight.backdropUrl, 'w780');
    if (heroUrl) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = heroUrl;
    }
  }
}
