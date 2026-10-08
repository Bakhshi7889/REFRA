import { Movie, WatchProvider } from '../types';
import { getBackdropUrl } from '../utils/imageHelpers';
import { isDataSaverActive } from './themeStore';
import { getIndexedDbSetting, saveIndexedDbSetting } from './indexedDb';
import { setCachedSWR } from './swrCache';
import {
  preserveHighQualityVisuals,
  upgradeMovieTo4K,
  isHighQualityMovie,
} from './visualQualityManager';

export interface CachedCatalog {
  spotlightMovies: Movie[];
  trendingMovies: Movie[];
  animeMovies: Movie[];
  topRatedMovies: Movie[];
  scifiMovies: Movie[];
  actionMovies?: Movie[];
  thrillerMovies?: Movie[];
  indiaTrending?: Movie[];
  bollywoodMovies?: Movie[];
  southMovies?: Movie[];
  indiaSeries?: Movie[];
  timestamp?: number;
}

const CACHE_KEY = 'refra_movies_catalog_v6';
const LEGACY_CACHE_KEY = 'refra_movies_6h_cache_v5';
const TIMESTAMP_KEY = 'refra_movies_catalog_timestamp_v6';
const OFFLINE_POOL_KEY = 'refra_offline_movies_pool_v1';
const PROVIDERS_CACHE_KEY_PREFIX = 'refra_providers_cache_';
export const SIX_HOURS_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

/**
 * Checks if two movie arrays are meaningfully different.
 * Returns true only if incoming list is valid and differs in IDs, ratings, or count.
 * Used to avoid redundant re-renders when API returns unchanged items.
 */
export function areMovieListsDifferent(current?: Movie[], incoming?: Movie[]): boolean {
  if (!incoming || incoming.length === 0) return false;
  if (!current || current.length === 0) return true;
  if (current.length !== incoming.length) return true;

  for (let i = 0; i < incoming.length; i++) {
    const cur = current[i];
    const inc = incoming[i];
    if (!cur || !inc) return true;
    if (cur.id !== inc.id) return true;
    if (cur.score !== inc.score) return true;
    if (cur.title !== inc.title) return true;
    if (cur.logoUrl !== inc.logoUrl) return true;
    if (cur.posterUrl !== inc.posterUrl) return true;
    if (cur.backdropUrl !== inc.backdropUrl) return true;
  }
  return false;
}

/**
 * Retrieves the cached movie catalog immediately for 0ms initial startup.
 * Never deletes the cache if offline or expired, ensuring the app always renders
 * instantly even on poor or zero internet connections.
 */
export function getValid6HourCache(): CachedCatalog | null {
  if (typeof window === 'undefined') return null;

  try {
    let rawData = localStorage.getItem(CACHE_KEY);
    if (!rawData) {
      // Fallback to previous cache key if present
      rawData = localStorage.getItem(LEGACY_CACHE_KEY);
    }
    if (!rawData) return null;

    const parsed = JSON.parse(rawData) as CachedCatalog;
    if (
      parsed &&
      Array.isArray(parsed.spotlightMovies) &&
      Array.isArray(parsed.trendingMovies) &&
      parsed.trendingMovies.length > 0
    ) {
      seedSwrFromCatalog(parsed);
      return parsed;
    }

    return null;
  } catch (err) {
    console.warn('Cache read notice:', err);
    return null;
  }
}

/**
 * Seeds SWR cache from catalog for 0ms immediate synchronous access by SWR layer.
 */
export function seedSwrFromCatalog(catalog: CachedCatalog, region = 'US'): void {
  if (typeof window === 'undefined' || !catalog) return;
  try {
    if (catalog.spotlightMovies?.length) {
      setCachedSWR(`spotlight_${region}`, catalog.spotlightMovies);
      setCachedSWR('spotlight_global', catalog.spotlightMovies);
    }
    if (catalog.trendingMovies?.length) {
      setCachedSWR(`trending_${region}`, catalog.trendingMovies);
      setCachedSWR('trending_global', catalog.trendingMovies);
    }
    if (catalog.animeMovies?.length) setCachedSWR('anime_movies', catalog.animeMovies);
    if (catalog.topRatedMovies?.length) {
      setCachedSWR(`top_rated_${region}`, catalog.topRatedMovies);
      setCachedSWR('top_rated_global', catalog.topRatedMovies);
    }
    if (catalog.actionMovies?.length) setCachedSWR('action_movies', catalog.actionMovies);
    if (catalog.thrillerMovies?.length) setCachedSWR('thriller_movies', catalog.thrillerMovies);
    if (catalog.scifiMovies?.length) setCachedSWR('scifi_movies', catalog.scifiMovies);
    if (catalog.indiaTrending?.length) setCachedSWR('india_trending', catalog.indiaTrending);
    if (catalog.bollywoodMovies?.length) setCachedSWR('india_bollywood', catalog.bollywoodMovies);
    if (catalog.southMovies?.length) setCachedSWR('india_south', catalog.southMovies);
    if (catalog.indiaSeries?.length) setCachedSWR('india_series', catalog.indiaSeries);
  } catch {
    // Ignore seeding error
  }
}

/**
 * Asynchronously loads the catalog from IndexedDB if localStorage was cleared.
 */
export async function getIndexedDbCachedCatalog(): Promise<CachedCatalog | null> {
  try {
    const data = await getIndexedDbSetting<CachedCatalog | null>('refra_cached_catalog', null);
    if (data && Array.isArray(data.trendingMovies) && data.trendingMovies.length > 0) {
      seedSwrFromCatalog(data);
      return data;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Stores fresh movie lists with timestamp in both localStorage and IndexedDB.
 * Indexes all unique movies into an offline pool so search and details work offline.
 */
export function save6HourCache(catalog: CachedCatalog): void {
  if (typeof window === 'undefined') return;

  try {
    const isDataSaver = isDataSaverActive();

    // Process lists:
    // 1. If on Wi-Fi (Data Saver OFF), upgrade to 4K studio quality
    // 2. If on Cellular (Data Saver ON), preserve existing high quality visuals so they are NEVER recached in low quality
    const processList = (list?: Movie[]): Movie[] => {
      if (!list || list.length === 0) return [];
      if (!isDataSaver) {
        return list.map((m) => upgradeMovieTo4K(m));
      }
      return preserveHighQualityVisuals(list);
    };

    const enrichedCatalog: CachedCatalog = {
      ...catalog,
      spotlightMovies: processList(catalog.spotlightMovies),
      trendingMovies: processList(catalog.trendingMovies),
      animeMovies: processList(catalog.animeMovies),
      topRatedMovies: processList(catalog.topRatedMovies),
      scifiMovies: processList(catalog.scifiMovies),
      actionMovies: processList(catalog.actionMovies),
      thrillerMovies: processList(catalog.thrillerMovies),
      indiaTrending: processList(catalog.indiaTrending),
      bollywoodMovies: processList(catalog.bollywoodMovies),
      southMovies: processList(catalog.southMovies),
      indiaSeries: processList(catalog.indiaSeries),
      timestamp: Date.now(),
    };

    seedSwrFromCatalog(enrichedCatalog);

    const serialized = JSON.stringify(enrichedCatalog);
    localStorage.setItem(CACHE_KEY, serialized);
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());

    // Save to IndexedDB asynchronously as durable multi-session backup
    saveIndexedDbSetting('refra_cached_catalog', enrichedCatalog).catch(() => {});

    // Add movies to the offline pool for instant offline search & details
    indexMoviesIntoOfflinePool([
      ...(enrichedCatalog.spotlightMovies || []),
      ...(enrichedCatalog.trendingMovies || []),
      ...(enrichedCatalog.animeMovies || []),
      ...(enrichedCatalog.topRatedMovies || []),
      ...(enrichedCatalog.scifiMovies || []),
      ...(enrichedCatalog.actionMovies || []),
      ...(enrichedCatalog.thrillerMovies || []),
      ...(enrichedCatalog.indiaTrending || []),
      ...(enrichedCatalog.bollywoodMovies || []),
      ...(enrichedCatalog.southMovies || []),
      ...(enrichedCatalog.indiaSeries || []),
    ]);

    // Preload hero banner visual in 4K if on Wi-Fi / Data Saver off
    if (!isDataSaver) {
      preloadCatalogImages(enrichedCatalog);
    }
  } catch (err) {
    console.warn('Cache write notice (localStorage quota may be near limit):', err);
  }
}

/**
 * Indexes movies into a capped offline pool (up to 400 titles) for zero-internet search.
 * Ensures that if a title already has high-quality 4K visuals, they are preserved and never recached in low quality.
 */
export function indexMoviesIntoOfflinePool(movies: Movie[]): void {
  if (typeof window === 'undefined' || !movies || movies.length === 0) return;

  try {
    let pool: Record<string, Movie> = {};
    const raw = localStorage.getItem(OFFLINE_POOL_KEY);
    if (raw) {
      try {
        pool = JSON.parse(raw);
      } catch {
        pool = {};
      }
    }

    for (const incoming of movies) {
      if (incoming && incoming.id) {
        const existing = pool[incoming.id];
        // If this movie was already cached in high quality, NEVER recache in low quality!
        if (existing && isHighQualityMovie(existing) && !isHighQualityMovie(incoming)) {
          pool[incoming.id] = {
            ...incoming,
            posterUrl: existing.posterUrl,
            backdropUrl: existing.backdropUrl,
            backdrops: existing.backdrops && existing.backdrops.length > 0 ? existing.backdrops : incoming.backdrops,
            posters: existing.posters && existing.posters.length > 0 ? existing.posters : incoming.posters,
          };
        } else {
          pool[incoming.id] = incoming;
        }
      }
    }

    // Limit pool size to 400 newest/most relevant entries
    const keys = Object.keys(pool);
    if (keys.length > 400) {
      const trimmedKeys = keys.slice(keys.length - 400);
      const trimmedPool: Record<string, Movie> = {};
      for (const k of trimmedKeys) {
        trimmedPool[k] = pool[k];
      }
      pool = trimmedPool;
    }

    localStorage.setItem(OFFLINE_POOL_KEY, JSON.stringify(pool));
  } catch {
    // Ignore quota errors
  }
}

/**
 * Returns all offline pooled movies for offline search and detail navigation.
 */
export function getOfflineMoviesPool(): Movie[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_POOL_KEY);
    if (!raw) return [];
    const pool = JSON.parse(raw);
    return Object.values(pool);
  } catch {
    return [];
  }
}

/**
 * Retrieves cached watch providers for a region to ensure the provider bar is instant.
 */
export function getCachedWatchProviders(region: string): WatchProvider[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${PROVIDERS_CACHE_KEY_PREFIX}${region}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Saves watch providers to local cache.
 */
export function saveCachedWatchProviders(region: string, providers: WatchProvider[]): void {
  if (typeof window === 'undefined' || !providers || providers.length === 0) return;
  try {
    localStorage.setItem(`${PROVIDERS_CACHE_KEY_PREFIX}${region}`, JSON.stringify(providers));
  } catch {
    // ignore
  }
}

/**
 * Deletes the movie cache (e.g. on explicit user reset).
 */
export function clear6HourCache(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(LEGACY_CACHE_KEY);
    localStorage.removeItem(TIMESTAMP_KEY);
    localStorage.removeItem(OFFLINE_POOL_KEY);
  } catch {
    // ignore
  }
  try {
    saveIndexedDbSetting('refra_catalog_cache', null);
  } catch {
    // ignore
  }
}

/**
 * Lightweight asset pre-warming for primary hero banner only.
 */
export function preloadCatalogImages(catalog: CachedCatalog): void {
  if (typeof window === 'undefined') return;
  if (isDataSaverActive()) return;

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
