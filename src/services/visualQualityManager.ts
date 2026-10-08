import { Movie } from '../types';
import { CachedCatalog } from './movieCache';
import { getIndexedDbSetting, saveIndexedDbSetting } from './indexedDb';

/**
 * Visual Quality Manager
 * Manages 4K UHD visual upgrades on Wi-Fi, maintains the High-Quality Visuals Registry,
 * and ensures that once an asset or movie is cached in 4K/high quality, it is NEVER
 * overwritten or recached in low quality when on cellular or low-data mode.
 */

const HQ_REGISTRY_KEY = 'refra_high_quality_visuals_registry_v1';

export interface HighQualityAssetRecord {
  movieId: string;
  posterUrl: string;
  backdropUrl: string;
  backdrops?: string[];
  posters?: string[];
  cachedTimestamp: number;
}

// In-memory cache of high quality registry for 0ms synchronous access
let memoryHqRegistry: Record<string, HighQualityAssetRecord> = {};
let isRegistryInitialized = false;

/**
 * Initializes the High Quality Visuals Registry from localStorage and IndexedDB
 */
export function initHighQualityRegistry(): void {
  if (typeof window === 'undefined' || isRegistryInitialized) return;
  try {
    const raw = localStorage.getItem(HQ_REGISTRY_KEY);
    if (raw) {
      memoryHqRegistry = JSON.parse(raw);
    }
  } catch {
    memoryHqRegistry = {};
  }
  isRegistryInitialized = true;

  // Hydrate from IndexedDB in case localStorage was cleared
  getIndexedDbSetting<Record<string, HighQualityAssetRecord>>(HQ_REGISTRY_KEY, {})
    .then((dbReg) => {
      if (dbReg && Object.keys(dbReg).length > Object.keys(memoryHqRegistry).length) {
        memoryHqRegistry = { ...dbReg, ...memoryHqRegistry };
        try {
          localStorage.setItem(HQ_REGISTRY_KEY, JSON.stringify(memoryHqRegistry));
        } catch {}
      }
    })
    .catch(() => {});
}

/**
 * Saves the registry to localStorage and IndexedDB
 */
function persistRegistry(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HQ_REGISTRY_KEY, JSON.stringify(memoryHqRegistry));
    saveIndexedDbSetting(HQ_REGISTRY_KEY, memoryHqRegistry).catch(() => {});
  } catch {}
}

/**
 * Checks if a specific movie is registered as having 4K / high-quality visuals cached
 */
export function isMovieInHqRegistry(movieId: string): boolean {
  if (!movieId) return false;
  if (!isRegistryInitialized) initHighQualityRegistry();
  return Boolean(memoryHqRegistry[movieId]);
}

/**
 * Returns the cached high-quality asset record for a movie if available
 */
export function getHqRecord(movieId: string): HighQualityAssetRecord | undefined {
  if (!movieId) return undefined;
  if (!isRegistryInitialized) initHighQualityRegistry();
  return memoryHqRegistry[movieId];
}

/**
 * Determines if a movie's URLs indicate high-quality 4K/UHD assets
 */
export function isHighQualityMovie(movie: Movie): boolean {
  if (!movie) return false;
  if (isMovieInHqRegistry(movie.id)) return true;

  const poster = movie.posterUrl || '';
  const backdrop = movie.backdropUrl || '';

  // Check if poster is high res (w780 or original) and not low res (w185, w342)
  const isPosterHq =
    poster.includes('/original/') ||
    poster.includes('/w780/') ||
    (poster.includes('images.unsplash.com') && poster.includes('w=800') && !poster.includes('q=55'));

  // Check if backdrop is 4K/high res (original or w1280) and not low res (w300, w780)
  const isBackdropHq =
    backdrop.includes('/original/') ||
    backdrop.includes('/w1280/') ||
    (backdrop.includes('images.unsplash.com') && backdrop.includes('w=1600') && !backdrop.includes('q=55'));

  const hasLowResMarker =
    poster.includes('/w185/') ||
    poster.includes('/w342/') ||
    poster.includes('q=55') ||
    backdrop.includes('/w300/') ||
    backdrop.includes('q=55');

  return (isPosterHq || isBackdropHq) && !hasLowResMarker;
}

/**
 * Upgrades a single image URL to its 4K / pristine studio master quality
 */
export function upgradeUrlTo4K(url: string | undefined, type: 'poster' | 'backdrop'): string | undefined {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/icons/') || url.endsWith('.svg')) {
    return url;
  }

  let upgraded = url;

  // TMDB URLs: Upgrade size to original (4K master) or w780 for posters
  if (upgraded.includes('image.tmdb.org/t/p/')) {
    if (type === 'backdrop') {
      // Upgrade backdrop to original 4K UHD
      upgraded = upgraded.replace(/\/t\/p\/(?:w\d+|original)\//, '/t/p/original/');
    } else {
      // Upgrade poster to w780 / original
      upgraded = upgraded.replace(/\/t\/p\/(?:w185|w342|w500)\//, '/t/p/w780/');
    }
  }

  // Cloudflare Edge Proxy (wsrv.nl): Upgrade to q=100 (uncompressed pristine)
  if (upgraded.includes('wsrv.nl') || upgraded.includes('weserv.nl')) {
    upgraded = upgraded.replace(/q=\d+/, 'q=100');
    if (!upgraded.includes('&q=')) {
      upgraded += '&q=100';
    }
  }

  // Unsplash URLs: Upgrade to max width and high quality
  if (upgraded.includes('images.unsplash.com')) {
    const targetW = type === 'backdrop' ? 2400 : 1200;
    upgraded = upgraded.replace(/w=\d+/, `w=${targetW}`).replace(/q=\d+/, 'q=100');
  }

  return upgraded;
}

/**
 * Upgrades a Movie object's visuals to 4K UHD and registers it in the High Quality Registry
 */
export function upgradeMovieTo4K(movie: Movie): Movie {
  if (!movie) return movie;

  const upgradedPoster = upgradeUrlTo4K(movie.posterUrl, 'poster') || movie.posterUrl;
  const upgradedBackdrop = upgradeUrlTo4K(movie.backdropUrl, 'backdrop') || movie.backdropUrl;

  const upgradedPosters = (movie.posters || []).map((p) => upgradeUrlTo4K(p, 'poster') || p);
  const upgradedBackdrops = (movie.backdrops || []).map((b) => upgradeUrlTo4K(b, 'backdrop') || b);

  const upgraded: Movie = {
    ...movie,
    posterUrl: upgradedPoster,
    backdropUrl: upgradedBackdrop,
    posters: upgradedPosters.length > 0 ? upgradedPosters : [upgradedPoster],
    backdrops: upgradedBackdrops.length > 0 ? upgradedBackdrops : [upgradedBackdrop],
  };

  // Register in memory high-quality registry
  if (!isRegistryInitialized) initHighQualityRegistry();
  memoryHqRegistry[movie.id] = {
    movieId: movie.id,
    posterUrl: upgradedPoster,
    backdropUrl: upgradedBackdrop,
    backdrops: upgraded.backdrops,
    posters: upgraded.posters,
    cachedTimestamp: Date.now(),
  };

  return upgraded;
}

/**
 * Preserves high-quality visuals for incoming movies.
 * CORE GUARANTEE: If a movie was already cached in high-quality (4K),
 * it WILL NEVER be overwritten or recached in low quality!
 */
export function preserveHighQualityVisuals(incomingMovies: Movie[]): Movie[] {
  if (!incomingMovies || incomingMovies.length === 0) return incomingMovies;
  if (!isRegistryInitialized) initHighQualityRegistry();

  return incomingMovies.map((incoming) => {
    if (!incoming || !incoming.id) return incoming;

    const hqRecord = memoryHqRegistry[incoming.id];
    if (hqRecord) {
      // Movie has already been cached in high quality! Preserve the 4K visuals!
      return {
        ...incoming,
        posterUrl: hqRecord.posterUrl || incoming.posterUrl,
        backdropUrl: hqRecord.backdropUrl || incoming.backdropUrl,
        backdrops:
          hqRecord.backdrops && hqRecord.backdrops.length > 0
            ? hqRecord.backdrops
            : incoming.backdrops,
        posters:
          hqRecord.posters && hqRecord.posters.length > 0
            ? hqRecord.posters
            : incoming.posters,
      };
    }

    // If incoming is already high quality, register it
    if (isHighQualityMovie(incoming)) {
      memoryHqRegistry[incoming.id] = {
        movieId: incoming.id,
        posterUrl: incoming.posterUrl,
        backdropUrl: incoming.backdropUrl,
        backdrops: incoming.backdrops,
        posters: incoming.posters,
        cachedTimestamp: Date.now(),
      };
    }

    return incoming;
  });
}

/**
 * Preloads and caches a list of high-quality image URLs into the browser and Service Worker Cache
 */
export async function preCacheHighQualityImages(imageUrls: string[]): Promise<void> {
  if (typeof window === 'undefined' || !imageUrls || imageUrls.length === 0) return;

  // Filter unique valid URLs
  const uniqueUrls = Array.from(new Set(imageUrls.filter(Boolean)));

  // Try caching directly in Service Worker Cache API if available
  if ('caches' in window) {
    try {
      const cache = await caches.open('refra-icons-images-v8');
      for (const url of uniqueUrls) {
        try {
          const match = await cache.match(url);
          if (!match) {
            // Fetch and store in Service Worker Cache
            const response = await fetch(url, { mode: 'no-cors' });
            if (response) {
              await cache.put(url, response);
            }
          }
        } catch {
          // Fallback to browser Image preloading
          const img = new Image();
          img.referrerPolicy = 'no-referrer';
          img.src = url;
        }
      }
      return;
    } catch {
      // Fall through to Image preloading
    }
  }

  // Standard Image preloading fallback
  for (const url of uniqueUrls) {
    try {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = url;
    } catch {}
  }
}

/**
 * Upgrades all cached movie catalogs (localStorage, IndexedDB, offline pool) to 4K UHD.
 * Called automatically when Wi-Fi is connected or Data Saver is disabled.
 */
export async function upgradeCachedVisualsTo4K(): Promise<{ upgradedCount: number; totalHqCount: number }> {
  if (typeof window === 'undefined') return { upgradedCount: 0, totalHqCount: 0 };
  initHighQualityRegistry();

  let upgradedCount = 0;
  const urlsToPrecache: string[] = [];

  try {
    // 1. Upgrade main 6-hour catalog
    const rawCatalog = localStorage.getItem('refra_movies_catalog_v6');
    if (rawCatalog) {
      const catalog = JSON.parse(rawCatalog) as CachedCatalog;
      const upgradeList = (list?: Movie[]): Movie[] => {
        if (!list || list.length === 0) return [];
        return list.map((m) => {
          const isHq = isHighQualityMovie(m);
          const upgraded = upgradeMovieTo4K(m);
          if (!isHq) upgradedCount++;
          if (upgraded.backdropUrl) urlsToPrecache.push(upgraded.backdropUrl);
          if (upgraded.posterUrl) urlsToPrecache.push(upgraded.posterUrl);
          return upgraded;
        });
      };

      const upgradedCatalog: CachedCatalog = {
        ...catalog,
        spotlightMovies: upgradeList(catalog.spotlightMovies),
        trendingMovies: upgradeList(catalog.trendingMovies),
        animeMovies: upgradeList(catalog.animeMovies),
        topRatedMovies: upgradeList(catalog.topRatedMovies),
        scifiMovies: upgradeList(catalog.scifiMovies),
        actionMovies: upgradeList(catalog.actionMovies),
        thrillerMovies: upgradeList(catalog.thrillerMovies),
        indiaTrending: upgradeList(catalog.indiaTrending),
        bollywoodMovies: upgradeList(catalog.bollywoodMovies),
        southMovies: upgradeList(catalog.southMovies),
        indiaSeries: upgradeList(catalog.indiaSeries),
        timestamp: Date.now(),
      };

      localStorage.setItem('refra_movies_catalog_v6', JSON.stringify(upgradedCatalog));
      saveIndexedDbSetting('refra_cached_catalog', upgradedCatalog).catch(() => {});
    }

    // 2. Upgrade offline movies pool
    const rawPool = localStorage.getItem('refra_offline_movies_pool_v1');
    if (rawPool) {
      const pool = JSON.parse(rawPool) as Record<string, Movie>;
      const upgradedPool: Record<string, Movie> = {};
      for (const [id, movie] of Object.entries(pool)) {
        const upgraded = upgradeMovieTo4K(movie);
        upgradedPool[id] = upgraded;
        if (upgraded.backdropUrl) urlsToPrecache.push(upgraded.backdropUrl);
        if (upgraded.posterUrl) urlsToPrecache.push(upgraded.posterUrl);
      }
      localStorage.setItem('refra_offline_movies_pool_v1', JSON.stringify(upgradedPool));
    }

    // 3. Persist the updated High-Quality Registry
    persistRegistry();

    // 4. Preload high quality 4K images in background (top 30 most critical hero & trending visuals)
    const priorityUrls = urlsToPrecache.slice(0, 30);
    preCacheHighQualityImages(priorityUrls).catch(() => {});

    // 5. Dispatch global notification that 4K upgrade completed
    window.dispatchEvent(
      new CustomEvent('refra-visuals-upgraded', {
        detail: {
          upgradedCount,
          totalHqCount: Object.keys(memoryHqRegistry).length,
        },
      })
    );

    return {
      upgradedCount,
      totalHqCount: Object.keys(memoryHqRegistry).length,
    };
  } catch (err) {
    console.warn('Upgrade visuals to 4K notice:', err);
    return {
      upgradedCount: 0,
      totalHqCount: Object.keys(memoryHqRegistry).length,
    };
  }
}

/**
 * Returns the count of registered 4K UHD movies currently cached
 */
export function getHqCachedMoviesCount(): number {
  if (!isRegistryInitialized) initHighQualityRegistry();
  return Object.keys(memoryHqRegistry).length;
}
