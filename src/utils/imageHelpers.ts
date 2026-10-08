import type React from 'react';
import {
  isDataSaverActive,
  getImageRoutingMode,
  getImageResolutionQuality,
} from '../services/themeStore';

/**
 * Image URL Builder & Resolution Helpers for TMDB & Cinema Assets
 * Provides direct, high-speed CDN delivery from TMDB (image.tmdb.org) and Unsplash,
 * with seamless Cloud Server Proxy failover (/api/image) for restricted networks.
 * Uses inline SVG cinema placeholders for guaranteed, zero-network fallbacks.
 * Fully compliant with PWA, mobile standalone, and iframe environments.
 * 
 * Orientation distinction:
 * - Posters: Vertical / Portrait (2:3 aspect ratio). Sizes: 'w185', 'w342', 'w500', 'w780', 'original'
 * - Backdrops: Horizontal / Landscape (16:9 aspect ratio). Sizes: 'w300', 'w780', 'w1280', 'original'
 */

export type PosterSize = 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';

// Pure inline SVG data URIs - zero network roundtrip, immune to 302 redirects, CORS, or offline issues
export const FALLBACK_POSTER = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750" fill="none"><rect width="100%" height="100%" fill="%2312141a"/><radialGradient id="gp" cx="50%" cy="45%" r="50%"><stop offset="0%" stop-color="%23222736"/><stop offset="100%" stop-color="%230c0d10"/></radialGradient><rect width="100%" height="100%" fill="url(%23gp)"/><g opacity="0.4" transform="translate(218, 320)"><rect x="0" y="16" width="64" height="48" rx="8" fill="%232d3345"/><path d="M0 24 L64 24" stroke="%231a1d27" stroke-width="2"/><path d="M0 16 L12 0 L24 16 L36 0 L48 16 L60 0 L64 16 Z" fill="%233b4359"/><circle cx="32" cy="40" r="10" fill="%231e222f"/><polygon points="30,35 37,40 30,45" fill="%2364748b"/></g><text x="50%" y="420" text-anchor="middle" fill="%23717d96" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="14" font-weight="600" letter-spacing="0.1em">REFRA CINEMA</text></svg>`;

export const FALLBACK_BACKDROP = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" fill="none"><rect width="100%" height="100%" fill="%2312141a"/><radialGradient id="gb" cx="50%" cy="45%" r="50%"><stop offset="0%" stop-color="%23222736"/><stop offset="100%" stop-color="%230c0d10"/></radialGradient><rect width="100%" height="100%" fill="url(%23gb)"/><g opacity="0.4" transform="translate(608, 305)"><rect x="0" y="16" width="64" height="48" rx="8" fill="%232d3345"/><path d="M0 24 L64 24" stroke="%231a1d27" stroke-width="2"/><path d="M0 16 L12 0 L24 16 L36 0 L48 16 L60 0 L64 16 Z" fill="%233b4359"/><circle cx="32" cy="40" r="10" fill="%231e222f"/><polygon points="30,35 37,40 30,45" fill="%2364748b"/></g><text x="50%" y="405" text-anchor="middle" fill="%23717d96" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="16" font-weight="600" letter-spacing="0.1em">REFRA CINEMA 4K</text></svg>`;

/**
 * Wraps or routes an external image URL using the designated routing strategy.
 * By default and design, it routes TMDB and cinema images through the Cloudflare Edge Mirror (wsrv.nl),
 * replicating the exact unblocked Cloudflare CDN architecture used by the Anime feed.
 */
export function wrapWithProxyIfNeeded(url: string): string {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;

  // Unsplash, AniList, and MyAnimeList already use fast, globally unblocked CDNs
  if (
    url.includes('s4.anilist.co') ||
    url.includes('anilist.co') ||
    url.includes('cdn.myanimelist.net') ||
    url.includes('images.unsplash.com') ||
    url.includes('wsrv.nl') ||
    url.includes('weserv.nl')
  ) {
    return url;
  }

  // Direct CDN bypass if routing mode is set to direct
  const routingMode = getImageRoutingMode();
  if (routingMode === 'direct') {
    return url;
  }

  // Route via Cloudflare Edge Mirror (wsrv.nl) with webp output.
  // When Data Saver is OFF: q=100 delivers pristine studio fidelity, razor-sharp details, and uncompressed clarity.
  // When Data Saver is ON: q=55 compresses image bandwidth to save mobile data.
  const isDataSaver = isDataSaverActive();
  const q = isDataSaver ? 55 : 100;
  const cleanUrl = url.replace(/^[a-z]+:\/\//i, '');
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=webp&q=${q}`;
}

/**
 * Resolves optimal poster size based on user resolution quality preference and data saver
 */
function getEffectivePosterSize(requestedSize: PosterSize = 'w780'): PosterSize {
  const quality = getImageResolutionQuality();
  if (quality === 'compact') return 'w342';
  
  // 'auto' / 'ultra' default:
  // When Data Saver is active -> 'w185' or 'w342'
  if (isDataSaverActive()) {
    return requestedSize === 'w185' ? 'w185' : 'w342';
  }
  
  // When on Wi-Fi (Data Saver OFF) -> in Wi-Fi every visual is 4K studio quality ('original' or 'w780')
  if (requestedSize === 'original') return 'original';
  return 'w780';
}

/**
 * Resolves optimal backdrop size based on user resolution quality preference and data saver
 */
function getEffectiveBackdropSize(requestedSize: BackdropSize = 'w1280'): BackdropSize {
  const quality = getImageResolutionQuality();
  if (quality === 'compact') return 'w780';
  
  // When Data Saver is active -> 'w300' or 'w780'
  if (isDataSaverActive()) {
    return requestedSize === 'w300' ? 'w300' : 'w780';
  }
  
  // When on Wi-Fi (Data Saver OFF) -> in Wi-Fi every visual is true 4K UHD 'original'
  return 'original';
}

/**
 * Normalizes any image URL or TMDB path into a clean, direct CDN URL or server proxy URL.
 */
export function toWebpUrl(
  urlOrPath: string | null | undefined,
  width?: number,
  quality?: number,
  type: 'poster' | 'backdrop' | 'profile' | 'logo' = 'poster'
): string {
  if (!urlOrPath) return type === 'backdrop' ? FALLBACK_BACKDROP : FALLBACK_POSTER;

  // Preserve data, blob, or already local static asset paths
  if (
    urlOrPath.startsWith('data:') ||
    urlOrPath.startsWith('blob:') ||
    urlOrPath.startsWith('/icons/') ||
    urlOrPath.startsWith('/refra') ||
    urlOrPath.endsWith('.svg') ||
    urlOrPath.includes('penguplay')
  ) {
    return urlOrPath;
  }

  const isDataSaver = isDataSaverActive();

  // If TMDB relative path or full TMDB URL
  if (urlOrPath.startsWith('/') || urlOrPath.includes('image.tmdb.org/t/p/')) {
    let cleanPath = urlOrPath;
    let detectedType = type;

    // Auto-detect profile or logo if not explicitly set
    if (detectedType === 'poster') {
      if (cleanPath.includes('/h632/') || cleanPath.includes('/w45/')) {
        detectedType = 'profile';
      } else if (cleanPath.includes('/w92/') || cleanPath.includes('/w154/')) {
        detectedType = 'logo';
      }
    }

    if (cleanPath.includes('image.tmdb.org/t/p/')) {
      cleanPath = cleanPath.replace(/^https?:\/\/image\.tmdb\.org\/t\/p\/(?:original|w\d+|h\d+)/, '');
    }
    if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;

    let tmdbSize: string;
    if (detectedType === 'backdrop') {
      const preferred = isDataSaver
        ? ((width && width <= 400) ? 'w300' : 'w780')
        : ((width && width <= 400) ? 'w780' : 'w1280');
      tmdbSize = getEffectiveBackdropSize(preferred as BackdropSize);
    } else if (detectedType === 'profile') {
      // TMDB profiles only support w45, w185, h632, original
      if (isDataSaver) {
        tmdbSize = width && width <= 60 ? 'w45' : 'w185';
      } else {
        const resQuality = getImageResolutionQuality();
        if (resQuality === 'ultra') {
          tmdbSize = 'original';
        } else if (width && width <= 80) {
          tmdbSize = 'w185';
        } else {
          tmdbSize = 'h632';
        }
      }
    } else if (detectedType === 'logo') {
      // TMDB logos support w45, w92, w154, w185, w300, w500, original
      if (isDataSaver) {
        tmdbSize = width && width <= 60 ? 'w92' : 'w154';
      } else {
        const resQuality = getImageResolutionQuality();
        if (resQuality === 'ultra') {
          tmdbSize = 'original';
        } else if (width && width <= 100) {
          tmdbSize = 'w185';
        } else if (width && width <= 300) {
          tmdbSize = 'w300';
        } else {
          tmdbSize = 'w500';
        }
      }
    } else {
      const preferred = isDataSaver
        ? ((width && width <= 200) ? 'w185' : (width && width <= 400) ? 'w342' : 'w500')
        : ((width && width <= 200) ? 'w342' : (width && width <= 500) ? 'w500' : 'w780');
      tmdbSize = getEffectivePosterSize(preferred as PosterSize);
    }

    const cdnUrl = `https://image.tmdb.org/t/p/${tmdbSize}${cleanPath}`;
    return wrapWithProxyIfNeeded(cdnUrl);
  }

  // If Unsplash image
  if (urlOrPath.includes('images.unsplash.com')) {
    const targetW = width || (type === 'backdrop' ? 1280 : 800);
    const targetQ = quality || (isDataSaver ? 55 : 95);
    return urlOrPath.replace(/w=\d+/, `w=${targetW}`).replace(/q=\d+/, `q=${targetQ}`);
  }

  return urlOrPath;
}

/**
 * Resolves a high-quality actor profile portrait URL from TMDB
 */
export function getProfileUrl(urlOrPath: string | null | undefined, width = 185): string | null {
  if (!urlOrPath) return null;
  return toWebpUrl(urlOrPath, width, undefined, 'profile');
}

/**
 * Builds a movie/show title logo URL from TMDB, routing via proxy if required
 */
export function getLogoUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;

  if (
    pathOrUrl.startsWith('data:') ||
    pathOrUrl.startsWith('blob:') ||
    pathOrUrl.startsWith('/icons/') ||
    pathOrUrl.startsWith('/refra') ||
    pathOrUrl.endsWith('.svg')
  ) {
    return pathOrUrl;
  }

  let fullUrl = pathOrUrl;
  if (pathOrUrl.startsWith('/')) {
    fullUrl = `https://image.tmdb.org/t/p/w500${pathOrUrl}`;
  }

  return wrapWithProxyIfNeeded(fullUrl);
}

/**
 * Extracts the raw un-proxied URL from a wsrv.nl proxy URL if present
 */
export function extractDirectUrl(url: string): string | null {
  if (!url) return null;
  try {
    if (url.includes('wsrv.nl') || url.includes('weserv.nl')) {
      const parsed = new URL(url);
      const inner = parsed.searchParams.get('url');
      if (inner) {
        const decoded = decodeURIComponent(inner);
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) return decoded;
        return `https://${decoded}`;
      }
    }
  } catch {}
  return null;
}

/**
 * Gracefully replaces a broken image element source:
 * 1. If Edge mirror failed, rescues with direct CDN URL (image.tmdb.org / fanart.tv)
 * 2. If direct image failed, rescues using Cloudflare Edge Mirror (wsrv.nl)
 * 3. Never burdens Netlify with /api/image requests (prevents bandwidth limits & account lock)
 * 4. Fallback is instant inline cinematic SVG placeholder (zero network)
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  isBackdrop = false
): void {
  const target = e.currentTarget;
  const currentSrc = target.src;
  const fallback = isBackdrop ? FALLBACK_BACKDROP : FALLBACK_POSTER;

  // Prevent re-triggering if already on fallback
  if (currentSrc.startsWith('data:image/svg+xml')) {
    target.onerror = null;
    return;
  }

  // Step 1: If wsrv.nl Edge mirror failed or timed out, attempt direct origin CDN
  if (
    currentSrc &&
    (currentSrc.includes('wsrv.nl') || currentSrc.includes('weserv.nl')) &&
    target.dataset.triedDirect !== 'true'
  ) {
    const directUrl = extractDirectUrl(currentSrc);
    if (directUrl && directUrl !== currentSrc) {
      target.dataset.triedDirect = 'true';
      target.src = directUrl;
      return;
    }
  }

  // Step 2: If direct CDN failed and edge mirror hasn't been tried yet, try wsrv.nl
  if (
    currentSrc &&
    !currentSrc.includes('wsrv.nl') &&
    !currentSrc.includes('weserv.nl') &&
    (currentSrc.startsWith('http://') || currentSrc.startsWith('https://')) &&
    target.dataset.triedEdge !== 'true'
  ) {
    target.dataset.triedEdge = 'true';
    const cleanUrl = currentSrc.replace(/^[a-z]+:\/\//i, '');
    target.src = `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=webp`;
    return;
  }

  // Step 3: If on Netlify, NEVER call /api/image server proxy to prevent bandwidth exhaustion
  // On custom/local dev servers, attempt /api/image once if not tried
  const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
  if (
    !isNetlify &&
    currentSrc &&
    !currentSrc.includes('/api/image') &&
    target.dataset.triedProxy !== 'true'
  ) {
    target.dataset.triedProxy = 'true';
    const cleanUrl = extractDirectUrl(currentSrc) || currentSrc;
    target.src = `/api/image?url=${encodeURIComponent(cleanUrl)}`;
    return;
  }

  // Step 4: Inline SVG zero-network fallback
  target.onerror = null; // Prevent secondary error loops
  target.src = fallback;
}

/**
 * Builds a direct vertical poster URL (2:3 aspect ratio) from TMDB CDN
 */
export function getPosterUrl(
  pathOrUrl: string | null | undefined,
  size: PosterSize = 'w780',
  fallbackPathOrUrl?: string | null
): string {
  const target = pathOrUrl || fallbackPathOrUrl;
  if (!target) return FALLBACK_POSTER;

  // Data / blob URIs
  if (target.startsWith('data:') || target.startsWith('blob:')) {
    return target;
  }

  // Local static files
  if (target.startsWith('/icons/') || target.startsWith('/refra') || target.endsWith('.svg') || target.includes('penguplay')) {
    return target;
  }

  const effectiveSize = getEffectivePosterSize(size);

  // If TMDB relative path (e.g. /6izwz7rsy95ARzTR3poZ8H6c5pp.jpg)
  if (target.startsWith('/')) {
    const cdnUrl = `https://image.tmdb.org/t/p/${effectiveSize}${target}`;
    return wrapWithProxyIfNeeded(cdnUrl);
  }

  // If TMDB full URL
  if (target.includes('image.tmdb.org/t/p/')) {
    // If already high-quality 4K/original or w780, preserve it (don't recache in low quality)
    if (target.includes('/t/p/original/')) {
      return wrapWithProxyIfNeeded(target);
    }
    if (target.includes('/t/p/w780/') && (!isDataSaverActive() || effectiveSize !== 'original')) {
      return wrapWithProxyIfNeeded(target);
    }
    const cdnUrl = target.replace(/\/t\/p\/(?:original|w\d+)\//, `/t/p/${effectiveSize}/`);
    return wrapWithProxyIfNeeded(cdnUrl);
  }

  // If Unsplash image
  if (target.includes('images.unsplash.com')) {
    const isDataSaver = isDataSaverActive();
    const width = isDataSaver
      ? (effectiveSize === 'w185' ? 240 : 480)
      : (effectiveSize === 'original' ? 1600 : 1200);
    const unsplashUrl = target.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, isDataSaver ? 'q=55' : 'q=95');
    return wrapWithProxyIfNeeded(unsplashUrl);
  }

  // Wrap any other external URL (AniList, MyAnimeList, Fanart, etc.)
  return wrapWithProxyIfNeeded(target);
}

/**
 * Builds a direct horizontal backdrop URL (16:9 aspect ratio) from TMDB CDN
 */
export function getBackdropUrl(
  pathOrUrl: string | null | undefined,
  size: BackdropSize = 'w1280',
  fallbackPathOrUrl?: string | null
): string {
  const target = pathOrUrl || fallbackPathOrUrl;
  if (!target) return FALLBACK_BACKDROP;

  // Data / blob URIs
  if (target.startsWith('data:') || target.startsWith('blob:')) {
    return target;
  }

  // Local static files
  if (target.startsWith('/icons/') || target.startsWith('/refra') || target.endsWith('.svg') || target.includes('penguplay')) {
    return target;
  }

  const effectiveSize = getEffectiveBackdropSize(size);

  // If TMDB relative path
  if (target.startsWith('/')) {
    const cdnUrl = `https://image.tmdb.org/t/p/${effectiveSize}${target}`;
    return wrapWithProxyIfNeeded(cdnUrl);
  }

  // If TMDB full URL
  if (target.includes('image.tmdb.org/t/p/')) {
    // If already high-quality 4K/original or w1280, preserve it (don't recache in low quality)
    if (target.includes('/t/p/original/')) {
      return wrapWithProxyIfNeeded(target);
    }
    if (target.includes('/t/p/w1280/') && (!isDataSaverActive() || effectiveSize !== 'original')) {
      return wrapWithProxyIfNeeded(target);
    }
    const cdnUrl = target.replace(/\/t\/p\/(?:original|w\d+)\//, `/t/p/${effectiveSize}/`);
    return wrapWithProxyIfNeeded(cdnUrl);
  }

  // If Unsplash image
  if (target.includes('images.unsplash.com')) {
    const isDataSaver = isDataSaverActive();
    const width = isDataSaver ? 480 : (effectiveSize === 'original' ? 2400 : 1920);
    const unsplashUrl = target.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, isDataSaver ? 'q=55' : 'q=95');
    return wrapWithProxyIfNeeded(unsplashUrl);
  }

  return wrapWithProxyIfNeeded(target);
}

/**
 * Global in-memory registry of fully decoded and rendered image URLs.
 * Ensures image thumbnails on homepage and carousels stay loaded during fast scrolling,
 * eliminating blank frames, skeleton shimmer re-flashes, and re-decode latency.
 */
export const loadedImageUrlsSet = new Set<string>();

export function isImageLoaded(url: string | null | undefined): boolean {
  if (!url) return false;
  return loadedImageUrlsSet.has(url);
}

export function markImageLoaded(url: string | null | undefined): void {
  if (!url) return;
  loadedImageUrlsSet.add(url);
}

/**
 * Pre-warms movie poster thumbnails into browser memory and the cache.
 * Executes on requestIdleCallback / background microtask so main scroll thread remains 120fps fluid.
 */
export function preloadMovieThumbnails(
  movies: Array<{ posterUrl?: string | null; backdropUrl?: string | null } | undefined | null>
): void {
  if (typeof window === 'undefined' || !movies || movies.length === 0) return;

  const runPreload = () => {
    for (const movie of movies) {
      if (!movie) continue;
      const url = getPosterUrl(movie.posterUrl, 'w780', movie.backdropUrl);
      if (url && !url.startsWith('data:') && !loadedImageUrlsSet.has(url)) {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.decoding = 'async';
        img.onload = () => {
          loadedImageUrlsSet.add(url);
        };
        img.src = url;
      }
    }
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runPreload, { timeout: 1500 });
  } else {
    setTimeout(runPreload, 60);
  }
}




