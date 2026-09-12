import type { Request, Response } from 'express';
import sharp from 'sharp';

// In-memory cache for converted WebP images (stores up to 500 items, ~10-15MB)
interface CacheEntry {
  buffer: Buffer;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const MAX_CACHE_ENTRIES = 500;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

function getFromCache(key: string): Buffer | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  // Move to end for LRU behavior
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.buffer;
}

function setInCache(key: string, buffer: Buffer): void {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    // Delete oldest entry (first key in map)
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) {
      memoryCache.delete(firstKey);
    }
  }
  memoryCache.set(key, { buffer, timestamp: Date.now() });
}

// Fallback WebP generator for missing, broken, or blocked images
async function generateFallbackWebp(isBackdrop: boolean, title = 'Refra Cinema'): Promise<Buffer> {
  const width = isBackdrop ? 1280 : 500;
  const height = isBackdrop ? 720 : 750;

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#141721"/>
          <stop offset="50%" stop-color="#0e1017"/>
          <stop offset="100%" stop-color="#08090d"/>
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.06)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect width="100%" height="100%" fill="url(#glow)"/>
      
      <!-- Film Clapper / Cinema Icon -->
      <g transform="translate(${width / 2 - 32}, ${height / 2 - 50})" opacity="0.4">
        <rect x="0" y="16" width="64" height="48" rx="8" fill="#2d3345"/>
        <path d="M0 24 L64 24" stroke="#1a1d27" stroke-width="2"/>
        <path d="M0 16 L12 0 L24 16 L36 0 L48 16 L60 0 L64 16 Z" fill="#3b4359"/>
        <circle cx="32" cy="40" r="10" fill="#1e222f"/>
        <polygon points="30,35 37,40 30,45" fill="#64748b"/>
      </g>

      <text x="50%" y="${height / 2 + 35}" text-anchor="middle" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${isBackdrop ? 22 : 18}" font-weight="600" letter-spacing="0.05em">
        ${title}
      </text>
      <text x="50%" y="${height / 2 + 65}" text-anchor="middle" fill="#475569" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${isBackdrop ? 14 : 12}" letter-spacing="0.1em">
        PREMIUM CINEMA STREAM
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * SSRF Filter to prevent requests to local network or cloud metadata
 */
function isSafeUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    // Block localhost, loopback, private IPv4
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.2') ||
      hostname.startsWith('172.3') ||
      hostname === '169.254.169.254' // cloud metadata
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Express handler for /api/image
 * Converts requested image to WebP with on-the-fly resizing and server caching
 */
export async function handleImageOptimization(req: Request, res: Response): Promise<void> {
  let targetUrl = (req.query.url as string) || '';
  const pathParam = (req.query.path as string) || '';
  const widthParam = req.query.w ? parseInt(req.query.w as string, 10) : undefined;
  const qualityParam = req.query.q ? parseInt(req.query.q as string, 10) : 80;
  const isBackdrop = req.query.type === 'backdrop' || (widthParam && widthParam >= 780);

  // If path is provided (TMDB relative path e.g. /6izwz7rsy95ARzTR3poZ8H6c5pp.jpg)
  if (pathParam && !targetUrl) {
    const cleanPath = pathParam.startsWith('/') ? pathParam : `/${pathParam}`;
    const tmdbSize = widthParam && widthParam <= 342 ? 'w342'
      : widthParam && widthParam <= 500 ? 'w500'
      : widthParam && widthParam <= 780 ? 'w780'
      : 'w1280';
    targetUrl = `https://image.tmdb.org/t/p/${tmdbSize}${cleanPath}`;
  }

  // If no URL or path
  if (!targetUrl) {
    const fallbackBuffer = await generateFallbackWebp(Boolean(isBackdrop));
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(fallbackBuffer);
    return;
  }

  // If TMDB relative path passed in targetUrl
  if (targetUrl.startsWith('/')) {
    const tmdbSize = widthParam && widthParam <= 342 ? 'w342'
      : widthParam && widthParam <= 500 ? 'w500'
      : widthParam && widthParam <= 780 ? 'w780'
      : 'w1280';
    targetUrl = `https://image.tmdb.org/t/p/${tmdbSize}${targetUrl}`;
  }

  // CRITICAL BANDWIDTH OPTIMIZATION: Rewrite any TMDB URL containing 'original' or oversized resolutions
  if (targetUrl.includes('image.tmdb.org/t/p/')) {
    const tmdbSize = widthParam && widthParam <= 342 ? 'w342'
      : widthParam && widthParam <= 500 ? 'w500'
      : widthParam && widthParam <= 780 ? 'w780'
      : 'w1280';
    targetUrl = targetUrl.replace(/\/t\/p\/(?:original|w\d+)\//, `/t/p/${tmdbSize}/`);
  }

  if (!isSafeUrl(targetUrl)) {
    const fallbackBuffer = await generateFallbackWebp(Boolean(isBackdrop));
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(fallbackBuffer);
    return;
  }

  const quality = Math.min(Math.max(qualityParam || 80, 40), 95);
  const targetWidth = widthParam && widthParam > 0 && widthParam <= 2560 ? widthParam : undefined;
  const cacheKey = `${targetUrl}_w${targetWidth || 'orig'}_q${quality}`;

  // Check in-memory cache
  const cached = getFromCache(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(cached);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout

    const fetchResponse = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!fetchResponse.ok) {
      console.warn(`[ImageOptimizer] Source image ${targetUrl} returned HTTP ${fetchResponse.status}, falling back to Cloudflare Edge Mirror`);
      try {
        const edgeRes = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(targetUrl)}&output=webp`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });
        if (edgeRes.ok) {
          const edgeArr = await edgeRes.arrayBuffer();
          const edgeBuf = Buffer.from(edgeArr);
          setInCache(cacheKey, edgeBuf);
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.setHeader('X-Image-Source', 'Edge-Mirror');
          res.send(edgeBuf);
          return;
        }
      } catch {}

      const fallbackBuffer = await generateFallbackWebp(Boolean(isBackdrop));
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(fallbackBuffer);
      return;
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    let pipeline = sharp(inputBuffer, { failOn: 'none' }).rotate();

    if (targetWidth) {
      pipeline = pipeline.resize({
        width: targetWidth,
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    const webpBuffer = await pipeline
      .webp({
        quality,
        effort: 3, // fast, good compression balance
      })
      .toBuffer();

    // Cache the converted WebP
    setInCache(cacheKey, webpBuffer);

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Image-Converted', 'WebP');
    res.send(webpBuffer);
  } catch (err: any) {
    console.error(`[ImageOptimizer] Error converting ${targetUrl}:`, err?.message || err);
    // Cloudflare edge mirror failover if sharp or node environment errored
    try {
      const edgeRes = await fetch(`https://wsrv.nl/?url=${encodeURIComponent(targetUrl)}&output=webp`);
      if (edgeRes.ok) {
        const edgeArr = await edgeRes.arrayBuffer();
        const edgeBuf = Buffer.from(edgeArr);
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Image-Source', 'Edge-Mirror-Recovery');
        res.send(edgeBuf);
        return;
      }
    } catch {}

    const fallbackBuffer = await generateFallbackWebp(Boolean(isBackdrop));
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(fallbackBuffer);
  }
}
