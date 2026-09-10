import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ============================================================================
// 1. SECURITY HEADERS & SERVER FINGERPRINT OBFUSCATION
// ============================================================================

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Legacy browser XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Referrer Policy: Send full URL on same-origin, domain-only on cross-origin HTTPS, none to HTTP
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enforce HTTPS HSTS in production (1 year, include subdomains, preload eligible)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Permissions Policy: Restrict sensitive device APIs
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  // Content Security Policy: Authorize trusted media, styling, fonts, streaming assets, and AI Studio iframe embedding
  const cspDirectives = [
    "default-src 'self'",
    "img-src 'self' data: blob: https://image.tmdb.org https://*.fanart.tv https://*.anilist.co https://img.youtube.com https://i.ytimg.com https://images.unsplash.com https://m.media-amazon.com https://*.googleusercontent.com",
    "media-src 'self' blob: https://*",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*",
    "frame-ancestors 'self' https://*.google.com https://*.googleusercontent.com https://ai.studio https://*.run.app",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' ws: wss: https://api.themoviedb.org https://graphql.anilist.co https://www.google-analytics.com https://region1.google-analytics.com https://*.run.app",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  next();
}

// ============================================================================
// 2. FORCE HTTPS MIDDLEWARE
// ============================================================================

export function forceHttpsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Cloud Run and modern reverse proxies pass x-forwarded-proto
  const proto = req.headers['x-forwarded-proto'];
  if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
    const host = req.headers.host || req.hostname || '';
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return next();
    }
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  }
  next();
}

// ============================================================================
// 3. IN-MEMORY SLIDING-WINDOW RATE LIMITER
// ============================================================================

interface RateLimitRecord {
  timestamps: number[];
}

const ipBuckets = new Map<string, RateLimitRecord>();

// Periodically clean up stale rate-limit buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipBuckets.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
    if (record.timestamps.length === 0) {
      ipBuckets.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

export function createRateLimiter(options: {
  maxRequests: number;
  windowMs?: number;
  message?: string;
}) {
  const windowMs = options.windowMs || 60 * 1000;
  const maxRequests = options.maxRequests;
  const message = options.message || 'Too many requests. Please slow down.';

  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client IP safely
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.socket.remoteAddress || '127.0.0.1';

    const now = Date.now();
    let record = ipBuckets.get(ip);
    if (!record) {
      record = { timestamps: [] };
      ipBuckets.set(ip, record);
    }

    // Keep only timestamps within the sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', Math.max(0, maxRequests - record.timestamps.length));
    res.setHeader('RateLimit-Reset', Math.ceil(windowMs / 1000));

    if (record.timestamps.length >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      });
    }

    record.timestamps.push(now);
    next();
  };
}

// ============================================================================
// 4. BOT PROTECTION & WAF HEURISTICS
// ============================================================================

const MALICIOUS_USER_AGENTS = [
  'sqlmap',
  'nikto',
  'acunetix',
  'dirbuster',
  'nmap',
  'masscan',
  'wpscan',
  'havij',
  'netsparker',
  'nessus',
  'burpsuite',
];

const SUSPICIOUS_PATTERNS = [
  /\.\.[\/\\]/,              // Path traversal (../ or ..\)
  /%2e%2e[\/\\]/i,          // Encoded path traversal
  /\/etc\/passwd/i,         // Linux password file
  /\/etc\/shadow/i,
  /boot\.ini/i,             // Windows boot
  /win\.ini/i,
  /\0/,                     // Null bytes
  /%00/i,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Direct script injection in URL
  /\bunion\b.*\bselect\b/i, // Classic SQL injection probe
  /javascript:/i,           // JS pseudo-protocol
];

export function botAndWafProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip Vite internal development endpoints to avoid false positives
  if (req.path.startsWith('/@') || req.path.startsWith('/node_modules')) {
    return next();
  }

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();

  // 1. Block known aggressive vulnerability scanners
  for (const scanner of MALICIOUS_USER_AGENTS) {
    if (userAgent.includes(scanner)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Automated scanning disallowed.' });
    }
  }

  // 2. Inspect original URL and path for traversal or probe patterns safely
  let urlToCheck = '';
  try {
    urlToCheck = decodeURIComponent(req.originalUrl || req.url || '');
  } catch {
    urlToCheck = req.originalUrl || req.url || '';
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(urlToCheck)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Malicious request pattern detected.' });
    }
  }

  next();
}

// ============================================================================
// 5. INPUT SANITIZATION & PARAMETER VALIDATION
// ============================================================================

/**
 * Escapes user-supplied content to prevent Stored & Reflected XSS
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates alphanumeric identifiers with hyphens and underscores
 */
export function isValidMediaId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{1,64}$/.test(id);
}

/**
 * Clamps numeric inputs to safe bounds
 */
export function clampNumber(value: any, min: number, max: number, defaultValue: number): number {
  const parsed = Number(value);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
}

/**
 * Strips dangerous prototype pollution keys and un-whitelisted fields
 */
export function filterAllowedFields<T extends Record<string, any>>(
  input: any,
  allowedKeys: (keyof T)[]
): Partial<T> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const result: Partial<T> = {};
  for (const key of allowedKeys) {
    // Protect against prototype pollution attacks
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
      result[key] = input[key];
    }
  }
  return result;
}

// ============================================================================
// 6. CRYPTOGRAPHY, PASSWORD HASHING & SENSITIVE DATA ENCRYPTION
// ============================================================================

const SENSITIVE_KEY_ENV = process.env.DATA_ENCRYPTION_KEY || 'default-secure-passphrase-cinema-refra-32bytes!';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SENSITIVE_KEY_ENV).digest();

/**
 * Secure password hashing using crypto.scrypt with a unique cryptographically random salt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies passwords using constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return resolve(false);

    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return resolve(false);
      const keyBuffer = Buffer.from(key, 'hex');
      if (keyBuffer.length !== derivedKey.length) return resolve(false);
      resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
    });
  });
}

/**
 * Encrypts sensitive data using authenticated AES-256-GCM
 */
export function encryptSensitiveData(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts and authenticates data using AES-256-GCM
 */
export function decryptSensitiveData(encryptedPayload: string): string | null {
  try {
    const [ivHex, tagHex, encryptedText] = encryptedPayload.split(':');
    if (!ivHex || !tagHex || !encryptedText) return null;

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Secure session cookie settings helper
 */
export const secureCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ============================================================================
// 7. FILE UPLOAD RESTRICTION GUARD
// ============================================================================

export function restrictUploadsMiddleware(req: Request, res: Response, next: NextFunction) {
  const contentType = req.headers['content-type'] || '';

  // Only run check on file upload / multipart endpoints
  if (contentType.includes('multipart/form-data')) {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    if (contentLength > MAX_FILE_SIZE) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: 'File upload exceeds maximum permitted limit of 2MB.',
      });
    }
  }

  next();
}

// ============================================================================
// 8. TRIM API RESPONSES & SANITIZE ERROR HANDLER
// ============================================================================

export function safeErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log error internally for debugging without leaking to client
  console.error('[SERVER SECURITY ERROR]', err?.message || err);

  // Return clean, non-leaking JSON error response
  res.status(err?.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred. Please try again.'
      : err?.message || 'Server processing error.',
  });
}
