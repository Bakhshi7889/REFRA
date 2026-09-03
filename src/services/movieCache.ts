import { Movie } from '../types';
import { getPosterUrl, getBackdropUrl } from '../utils/imageHelpers';

export interface CachedCatalog {
  spotlightMovies: Movie[];
  trendingMovies: Movie[];
  animeMovies: Movie[];
  topRatedMovies: Movie[];
  scifiMovies: Movie[];
  actionMovies: Movie[];
  thrillerMovies: Movie[];
}

const CACHE_KEY = 'refra_movies_6h_cache';
const TIMESTAMP_KEY = 'refra_movies_6h_timestamp';
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
 * Also preloads posters into the browser image cache.
 */
export function save6HourCache(catalog: CachedCatalog): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(catalog));
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());

    // Preload top posters in background to ensure zero loading delay
    preloadCatalogImages(catalog);
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
 * Silently pre-warms the browser's HTTP cache with poster and backdrop assets.
 */
export function preloadCatalogImages(catalog: CachedCatalog): void {
  if (typeof window === 'undefined') return;

  const urlsToPreload = new Set<string>();

  // Collect spotlight backdrops & posters (immediate hero view)
  catalog.spotlightMovies.slice(0, 3).forEach((m) => {
    if (m.backdropUrl) urlsToPreload.add(getBackdropUrl(m.backdropUrl, 'w1280'));
    if (m.posterUrl) urlsToPreload.add(getPosterUrl(m.posterUrl, 'w500'));
  });

  // Collect top trending and anime posters
  catalog.trendingMovies.slice(0, 8).forEach((m) => {
    if (m.posterUrl) urlsToPreload.add(getPosterUrl(m.posterUrl, 'w500'));
  });

  catalog.animeMovies.slice(0, 8).forEach((m) => {
    if (m.posterUrl) urlsToPreload.add(getPosterUrl(m.posterUrl, 'w500'));
  });

  // Trigger lightweight asynchronous background preload
  urlsToPreload.forEach((url) => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = url;
    }
  });
}
