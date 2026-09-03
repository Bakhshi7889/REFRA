import type React from 'react';

/**
 * Image URL Builder & Resolution Helpers for TMDB & Cinema Assets
 * 
 * Orientation distinction:
 * - Posters: Vertical / Portrait (2:3 aspect ratio). Sizes: 'w185', 'w342', 'w500', 'w780', 'original'
 * - Backdrops: Horizontal / Landscape (16:9 aspect ratio). Sizes: 'w780', 'w1280', 'original'
 */

export type PosterSize = 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w780' | 'w1280' | 'original';

export const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
export const FALLBACK_BACKDROP =
  'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1280&q=80';

/**
 * Gracefully replaces a broken image element source with a verified cinematic visual
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  isBackdrop = false
): void {
  const target = e.currentTarget;
  const fallback = isBackdrop ? FALLBACK_BACKDROP : FALLBACK_POSTER;
  if (target.src !== fallback) {
    target.src = fallback;
  }
}

/**
 * Builds a vertical poster URL (2:3 aspect ratio) with graceful fallbacks
 */
export function getPosterUrl(
  pathOrUrl: string | null | undefined,
  size: PosterSize = 'w500',
  fallbackPathOrUrl?: string | null
): string {
  const target = pathOrUrl || fallbackPathOrUrl;
  if (!target) return FALLBACK_POSTER;

  // If already an absolute URL (http/https), return it directly
  if (target.startsWith('http://') || target.startsWith('https://')) {
    // If it's a tmdb URL, allow replacing the size segment if needed
    if (target.includes('image.tmdb.org/t/p/') && size !== 'original') {
      return target.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`);
    }
    return target;
  }

  // TMDB relative path e.g. "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg"
  const cleanPath = target.startsWith('/') ? target : `/${target}`;
  return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
}

/**
 * Builds a horizontal backdrop URL (16:9 aspect ratio) with graceful fallbacks
 */
export function getBackdropUrl(
  pathOrUrl: string | null | undefined,
  size: BackdropSize = 'w1280',
  fallbackPathOrUrl?: string | null
): string {
  const target = pathOrUrl || fallbackPathOrUrl;
  if (!target) return FALLBACK_BACKDROP;

  // If already an absolute URL (http/https), return it directly
  if (target.startsWith('http://') || target.startsWith('https://')) {
    if (target.includes('image.tmdb.org/t/p/') && size !== 'original') {
      return target.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`);
    }
    return target;
  }

  // TMDB relative path
  const cleanPath = target.startsWith('/') ? target : `/${target}`;
  return `https://image.tmdb.org/t/p/${size}${cleanPath}`;
}
