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
 * Wraps an external image URL with the server-side image proxy if user enabled 'proxy' mode
 */
export function wrapWithProxyIfNeeded(url: string): string {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;

  const mode = getImageRoutingMode();
  if (mode === 'proxy' && url.includes('image.tmdb.org/t/p/')) {
    return `/api/image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * Resolves optimal poster size based on user resolution quality preference and data saver
 */
function getEffectivePosterSize(requestedSize: PosterSize = 'w342'): PosterSize {
  const quality = getImageResolutionQuality();
  if (quality === 'ultra') return 'w780';
  if (quality === 'high') return 'w500';
  if (quality === 'balanced') return 'w342';
  if (quality === 'compact') return 'w185';
  
  // 'auto' default
  return isDataSaverActive() ? 'w185' : requestedSize;
}

/**
 * Resolves optimal backdrop size based on user resolution quality preference and data saver
 */
function getEffectiveBackdropSize(requestedSize: BackdropSize = 'w780'): BackdropSize {
  const quality = getImageResolutionQuality();
  if (quality === 'ultra') return 'original';
  if (quality === 'high') return 'w1280';
  if (quality === 'balanced') return 'w780';
  if (quality === 'compact') return 'w300';
  
  // 'auto' default
  return isDataSaverActive() ? 'w300' : requestedSize;
}

/**
 * Normalizes any image URL or TMDB path into a clean, direct CDN URL or server proxy URL.
 */
export function toWebpUrl(
  urlOrPath: string | null | undefined,
  width?: number,
  quality?: number,
  type: 'poster' | 'backdrop' = 'poster'
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
    if (cleanPath.includes('image.tmdb.org/t/p/')) {
      cleanPath = cleanPath.replace(/^https?:\/\/image\.tmdb\.org\/t\/p\/(?:original|w\d+)/, '');
    }
    if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;

    let tmdbSize: string;
    if (type === 'backdrop') {
      const preferred = (width && width <= 400) ? 'w300' : (width && width <= 900) ? 'w780' : 'w1280';
      tmdbSize = getEffectiveBackdropSize(preferred as BackdropSize);
    } else {
      const preferred = (width && width <= 200) ? 'w185' : (width && width <= 400) ? 'w342' : 'w500';
      tmdbSize = getEffectivePosterSize(preferred as PosterSize);
    }

    const cdnUrl = `https://image.tmdb.org/t/p/${tmdbSize}${cleanPath}`;
    return wrapWithProxyIfNeeded(cdnUrl);
  }

  // If Unsplash image
  if (urlOrPath.includes('images.unsplash.com')) {
    const targetW = width || (type === 'backdrop' ? 960 : 400);
    const targetQ = quality || (isDataSaver ? 55 : 75);
    return urlOrPath.replace(/w=\d+/, `w=${targetW}`).replace(/q=\d+/, `q=${targetQ}`);
  }

  return urlOrPath;
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
 * Gracefully replaces a broken image element source:
 * 1. If direct TMDB CDN failed (e.g. cellular carrier/ISP block in India), proxies via /api/image
 * 2. If proxy also fails or offline, provides clean inline cinematic SVG
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  isBackdrop = false
): void {
  const target = e.currentTarget;
  const currentSrc = target.src;

  // If a direct TMDB CDN image failed to load, automatically attempt routing via high-speed server image proxy
  if (
    currentSrc &&
    !currentSrc.includes('/api/image') &&
    currentSrc.includes('image.tmdb.org/t/p/') &&
    target.dataset.triedProxy !== 'true'
  ) {
    target.dataset.triedProxy = 'true';
    target.src = `/api/image?url=${encodeURIComponent(currentSrc)}`;
    return;
  }

  const fallback = isBackdrop ? FALLBACK_BACKDROP : FALLBACK_POSTER;
  if (target.src !== fallback) {
    target.onerror = null; // Prevent secondary error loops
    target.src = fallback;
  }
}

/**
 * Builds a direct vertical poster URL (2:3 aspect ratio) from TMDB CDN
 */
export function getPosterUrl(
  pathOrUrl: string | null | undefined,
  size: PosterSize = 'w342',
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
    const cdnUrl = target.replace(/\/t\/p\/(?:original|w\d+)\//, `/t/p/${effectiveSize}/`);
    return wrapWithProxyIfNeeded(cdnUrl);
  }

  // If Unsplash image
  if (target.includes('images.unsplash.com')) {
    const isDataSaver = isDataSaverActive();
    const width = effectiveSize === 'w185' ? 240 : effectiveSize === 'w342' ? 400 : 600;
    return target.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, isDataSaver ? 'q=55' : 'q=75');
  }

  return target;
}

/**
 * Builds a direct horizontal backdrop URL (16:9 aspect ratio) from TMDB CDN
 */
export function getBackdropUrl(
  pathOrUrl: string | null | undefined,
  size: BackdropSize = 'w780',
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
    const cdnUrl = target.replace(/\/t\/p\/(?:original|w\d+)\//, `/t/p/${effectiveSize}/`);
    return wrapWithProxyIfNeeded(cdnUrl);
  }

  // If Unsplash image
  if (target.includes('images.unsplash.com')) {
    const isDataSaver = isDataSaverActive();
    const width = effectiveSize === 'w300' ? 480 : effectiveSize === 'w780' ? 960 : 1440;
    return target.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, isDataSaver ? 'q=55' : 'q=75');
  }

  return target;
}



