import type React from 'react';
import { isDataSaverActive } from '../services/themeStore';

/**
 * Image URL Builder & Resolution Helpers for TMDB & Cinema Assets
 * Converts images to optimized WebP format via high-performance /api/image service.
 * Respects Data Saver mode to minimize bandwidth consumption.
 * 
 * Orientation distinction:
 * - Posters: Vertical / Portrait (2:3 aspect ratio). Sizes: 'w185', 'w342', 'w500', 'w780', 'original'
 * - Backdrops: Horizontal / Landscape (16:9 aspect ratio). Sizes: 'w780', 'w1280', 'original'
 */

export type PosterSize = 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w780' | 'w1280' | 'original';

export const FALLBACK_POSTER = '/api/image?type=poster';
export const FALLBACK_BACKDROP = '/api/image?type=backdrop';

/**
 * Converts any image URL into a high-performance, server-optimized WebP stream
 */
export function toWebpUrl(
  urlOrPath: string | null | undefined,
  width?: number,
  quality?: number,
  type: 'poster' | 'backdrop' = 'poster'
): string {
  if (!urlOrPath) return `/api/image?type=${type}`;

  // If already an /api/image URL or data/blob URI, return as-is
  if (urlOrPath.startsWith('/api/image') || urlOrPath.startsWith('data:') || urlOrPath.startsWith('blob:')) {
    return urlOrPath;
  }

  const isDataSaver = isDataSaverActive();

  // Normalize TMDB 'original' URLs to efficient CDN resolutions
  let cleanUrlOrPath = urlOrPath;
  if (cleanUrlOrPath.includes('image.tmdb.org/t/p/original')) {
    const tmdbReplacement = isDataSaver ? 'w342' : (type === 'backdrop' ? 'w780' : 'w500');
    cleanUrlOrPath = cleanUrlOrPath.replace('/t/p/original', `/t/p/${tmdbReplacement}`);
  }

  const effectiveQuality = quality !== undefined ? quality : (isDataSaver ? 52 : 75);
  let effectiveWidth = width;
  if (isDataSaver && effectiveWidth) {
    // In Data Saver, cap maximum image dimensions
    effectiveWidth = Math.min(effectiveWidth, type === 'backdrop' ? 720 : 342);
  }

  const params = new URLSearchParams();
  if (cleanUrlOrPath.startsWith('http://') || cleanUrlOrPath.startsWith('https://')) {
    params.set('url', cleanUrlOrPath);
  } else {
    // TMDB relative path e.g. /6izwz7rsy95ARzTR3poZ8H6c5pp.jpg
    params.set('path', cleanUrlOrPath);
  }

  if (effectiveWidth && effectiveWidth > 0) {
    params.set('w', effectiveWidth.toString());
  }
  if (effectiveQuality) {
    params.set('q', effectiveQuality.toString());
  }
  if (type) {
    params.set('type', type);
  }

  return `/api/image?${params.toString()}`;
}

/**
 * Gracefully replaces a broken image element source with a verified cinematic visual
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  isBackdrop = false
): void {
  const target = e.currentTarget;
  const fallback = isBackdrop ? FALLBACK_BACKDROP : FALLBACK_POSTER;
  if (target.src !== fallback && !target.src.endsWith(fallback)) {
    target.src = fallback;
  }
}

/**
 * Builds a vertical poster URL (2:3 aspect ratio) converted to optimized WebP
 */
export function getPosterUrl(
  pathOrUrl: string | null | undefined,
  size: PosterSize = 'w342',
  fallbackPathOrUrl?: string | null
): string {
  const target = pathOrUrl || fallbackPathOrUrl;
  if (!target) return FALLBACK_POSTER;

  const isDataSaver = isDataSaverActive();

  if (isDataSaver) {
    return toWebpUrl(target, 240, 50, 'poster');
  }

  const widthMap: Record<PosterSize, number> = {
    w185: 185,
    w342: 342,
    w500: 480,
    w780: 640,
    original: 780,
  };
  const width = widthMap[size] || 342;
  return toWebpUrl(target, width, 75, 'poster');
}

/**
 * Builds a horizontal backdrop URL (16:9 aspect ratio) converted to optimized WebP
 */
export function getBackdropUrl(
  pathOrUrl: string | null | undefined,
  size: BackdropSize = 'w780',
  fallbackPathOrUrl?: string | null
): string {
  const target = pathOrUrl || fallbackPathOrUrl;
  if (!target) return FALLBACK_BACKDROP;

  const isDataSaver = isDataSaverActive();

  if (isDataSaver) {
    return toWebpUrl(target, 640, 50, 'backdrop');
  }

  const widthMap: Record<BackdropSize, number> = {
    w780: 780,
    w1280: 1080,
    original: 1280,
  };
  const width = widthMap[size] || 780;
  return toWebpUrl(target, width, 75, 'backdrop');
}

