/**
 * Poster-Driven Dynamic Color Extractor & Live Gradient Utility
 * Extracts dominant, accent, and ambient glow colors from artwork using HTML5 Canvas.
 * Caches results in memory & sessionStorage so it is never re-calculated on re-renders.
 */

import { useState, useEffect, useRef } from 'react';

export interface ExtractedColors {
  dominant: string;    // rgb(r, g, b)
  accent: string;      // rgb(r, g, b) - vibrant color for highlights & borders
  glow: string;        // rgba(r, g, b, 0.45) - ambient glow for backdrops & cards
  secondary: string;   // rgb(r, g, b) - harmonious secondary color
  liveGradient: string; // CSS multi-stop gradient for live player backdrop
  isDefault?: boolean;
}

const DEFAULT_COLORS: ExtractedColors = {
  dominant: 'rgb(20, 24, 34)',
  accent: 'rgb(120, 140, 180)',
  glow: 'rgba(120, 140, 180, 0.35)',
  secondary: 'rgb(35, 45, 65)',
  liveGradient:
    'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(60, 80, 120, 0.35), transparent 70%), radial-gradient(circle at 80% 80%, rgba(30, 40, 60, 0.4), transparent 60%)',
  isDefault: true,
};

// In-memory cache for fast instant lookups during navigation
const memoryColorCache = new Map<string, ExtractedColors>();
const SESSION_CACHE_PREFIX = 'refra_color_';

// Helper to convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

// Generate an attractive deterministic fallback based on string hash
export function generateHashColors(seed: string): ExtractedColors {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 40) % 360;

  return {
    dominant: `hsl(${hue1}, 35%, 15%)`,
    accent: `hsl(${hue1}, 75%, 55%)`,
    glow: `hsla(${hue1}, 75%, 55%, 0.35)`,
    secondary: `hsl(${hue2}, 60%, 25%)`,
    liveGradient: `radial-gradient(ellipse 90% 70% at 50% 20%, hsla(${hue1}, 70%, 45%, 0.38), transparent 75%), radial-gradient(circle at 80% 80%, hsla(${hue2}, 60%, 30%, 0.35), transparent 60%)`,
    isDefault: false,
  };
}

/**
 * Extract dominant and accent colors from an image URL using off-screen HTML5 Canvas.
 * Uses CORS-safe proxy fallback if direct cross-origin image sampling is restricted.
 */
export async function extractColorsFromImage(
  imageUrl: string,
  fallbackSeed = 'Movie'
): Promise<ExtractedColors> {
  if (!imageUrl) return generateHashColors(fallbackSeed);

  // 1. Check in-memory cache
  if (memoryColorCache.has(imageUrl)) {
    return memoryColorCache.get(imageUrl)!;
  }

  // 2. Check sessionStorage
  try {
    const cached = sessionStorage.getItem(SESSION_CACHE_PREFIX + imageUrl);
    if (cached) {
      const parsed = JSON.parse(cached) as ExtractedColors;
      memoryColorCache.set(imageUrl, parsed);
      return parsed;
    }
  } catch {}

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const cleanUpAndFallback = () => {
      const fallback = generateHashColors(fallbackSeed);
      memoryColorCache.set(imageUrl, fallback);
      resolve(fallback);
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return cleanUpAndFallback();

        // Downsample to 32x32 for ultra-fast sampling (<2ms)
        const size = 32;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size).data;
        const colorBuckets: { [key: string]: { r: number; g: number; b: number; count: number; sat: number; light: number } } = {};

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let sampledPixels = 0;

        for (let i = 0; i < imageData.length; i += 16) { // Step by 4 pixels (16 bytes)
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const a = imageData[i + 3];

          if (a < 128) continue; // Skip transparent

          const [h, s, l] = rgbToHsl(r, g, b);

          // Bucket by coarse hue & lightness
          const bucketKey = `${Math.floor(h / 30)}_${Math.floor(l * 5)}`;
          if (!colorBuckets[bucketKey]) {
            colorBuckets[bucketKey] = { r, g, b, count: 0, sat: s, light: l };
          }
          colorBuckets[bucketKey].count++;

          totalR += r;
          totalG += g;
          totalB += b;
          sampledPixels++;
        }

        if (sampledPixels === 0) return cleanUpAndFallback();

        // Dominant overall tone
        const avgR = Math.round(totalR / sampledPixels);
        const avgG = Math.round(totalG / sampledPixels);
        const avgB = Math.round(totalB / sampledPixels);
        const dominant = `rgb(${avgR}, ${avgG}, ${avgB})`;

        // Find most vibrant accent bucket (high saturation, medium lightness)
        const buckets = Object.values(colorBuckets);
        const vibrantBuckets = buckets.filter(
          (b) => b.sat > 0.25 && b.light > 0.2 && b.light < 0.85
        );

        let bestAccent = vibrantBuckets.sort(
          (a, b) => b.sat * 1.5 + (b.count / sampledPixels) - (a.sat * 1.5 + (a.count / sampledPixels))
        )[0];

        // Fallback to highest count bucket if none was vibrant enough
        if (!bestAccent) {
          bestAccent = buckets.sort((a, b) => b.count - a.count)[0] || {
            r: avgR,
            g: avgG,
            b: avgB,
            count: 1,
            sat: 0.5,
            light: 0.5,
          };
        }

        // Secondary harmonic bucket
        const secondaryBucket =
          vibrantBuckets.find(
            (b) => Math.abs(b.r - bestAccent.r) > 40 || Math.abs(b.g - bestAccent.g) > 40
          ) || buckets[1] || bestAccent;

        const accent = `rgb(${bestAccent.r}, ${bestAccent.g}, ${bestAccent.b})`;
        const glow = `rgba(${bestAccent.r}, ${bestAccent.g}, ${bestAccent.b}, 0.42)`;
        const secondary = `rgb(${secondaryBucket.r}, ${secondaryBucket.g}, ${secondaryBucket.b})`;

        // Live layered gradient for player background
        const liveGradient = `radial-gradient(ellipse 95% 75% at 50% 25%, rgba(${bestAccent.r}, ${bestAccent.g}, ${bestAccent.b}, 0.42), transparent 75%), radial-gradient(circle at 85% 75%, rgba(${secondaryBucket.r}, ${secondaryBucket.g}, ${secondaryBucket.b}, 0.35), transparent 60%)`;

        const result: ExtractedColors = {
          dominant,
          accent,
          glow,
          secondary,
          liveGradient,
          isDefault: false,
        };

        memoryColorCache.set(imageUrl, result);
        try {
          sessionStorage.setItem(SESSION_CACHE_PREFIX + imageUrl, JSON.stringify(result));
        } catch {}

        resolve(result);
      } catch {
        // Tainted canvas or reading failure -> use hash fallback
        cleanUpAndFallback();
      }
    };

    img.onerror = () => {
      // If direct load fails (e.g. strict CORS), retry through our internal image optimizer proxy
      if (!imageUrl.startsWith('/api/image')) {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}&w=120&q=50`;
        const retryImg = new Image();
        retryImg.crossOrigin = 'anonymous';
        retryImg.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return cleanUpAndFallback();
            canvas.width = 32;
            canvas.height = 32;
            ctx.drawImage(retryImg, 0, 0, 32, 32);
            const data = ctx.getImageData(0, 0, 32, 32).data;
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            for (let i = 0; i < data.length; i += 16) {
              if (data[i + 3] > 100) {
                rSum += data[i];
                gSum += data[i + 1];
                bSum += data[i + 2];
                count++;
              }
            }
            if (count > 0) {
              const r = Math.round(rSum / count);
              const g = Math.round(gSum / count);
              const b = Math.round(bSum / count);
              const res: ExtractedColors = {
                dominant: `rgb(${r}, ${g}, ${b})`,
                accent: `rgb(${Math.min(255, r + 40)}, ${Math.min(255, g + 40)}, ${Math.min(255, b + 40)})`,
                glow: `rgba(${r}, ${g}, ${b}, 0.4)`,
                secondary: `rgb(${Math.max(10, r - 30)}, ${Math.max(10, g - 30)}, ${Math.max(10, b - 30)})`,
                liveGradient: `radial-gradient(ellipse 90% 70% at 50% 20%, rgba(${r}, ${g}, ${b}, 0.4), transparent 75%)`,
                isDefault: false,
              };
              memoryColorCache.set(imageUrl, res);
              return resolve(res);
            }
          } catch {}
          cleanUpAndFallback();
        };
        retryImg.onerror = cleanUpAndFallback;
        retryImg.src = proxyUrl;
      } else {
        cleanUpAndFallback();
      }
    };

    img.src = imageUrl;
  });
}

/**
 * React hook to effortlessly extract and apply dynamic artwork colors
 */
export function useImageColors(imageUrl?: string | null, fallbackSeed = 'Movie') {
  const [colors, setColors] = useState<ExtractedColors>(() => {
    if (!imageUrl) return DEFAULT_COLORS;
    return memoryColorCache.get(imageUrl) || DEFAULT_COLORS;
  });
  const [isLoading, setIsLoading] = useState(!imageUrl || !memoryColorCache.has(imageUrl));
  const activeUrlRef = useRef(imageUrl);

  useEffect(() => {
    activeUrlRef.current = imageUrl;
    if (!imageUrl) {
      setColors(generateHashColors(fallbackSeed));
      setIsLoading(false);
      return;
    }

    if (memoryColorCache.has(imageUrl)) {
      setColors(memoryColorCache.get(imageUrl)!);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    extractColorsFromImage(imageUrl, fallbackSeed).then((result) => {
      if (isMounted && activeUrlRef.current === imageUrl) {
        setColors(result);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [imageUrl, fallbackSeed]);

  return { colors, isLoading };
}
