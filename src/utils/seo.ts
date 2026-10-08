/**
 * Dynamic SEO & Metadata Manager for Refra
 * Updates <title>, <meta name="description">, <meta property="og:*"> and Twitter Card tags in real-time
 */

interface SeoOptions {
  title: string;
  description: string;
  ogImage?: string;
  canonicalPath?: string;
  canonicalUrl?: string;
  type?: string;
}

const DEFAULT_TITLE = 'Refra — 4K Ad-Free Cinematic Streaming & Anime';
const DEFAULT_DESC =
  'Minimalist ad-free 4K cinematic streaming and anime discovery platform with spatial master audio and Trakt.tv synchronization.';
const DEFAULT_OG_IMAGE = 'https://refra.netlify.app/og-image.png';
const BASE_URL = 'https://refra.netlify.app';

export function updatePageMetadata({
  title,
  description,
  ogImage = DEFAULT_OG_IMAGE,
  canonicalPath = '',
  canonicalUrl,
  type = 'website',
}: SeoOptions): void {
  if (typeof document === 'undefined') return;

  const targetUrl = canonicalUrl || `${BASE_URL}${canonicalPath}`;

  // 1. Title
  document.title = title || DEFAULT_TITLE;

  // 2. Helper to set or create meta tag
  const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
    let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attributeName, attributeValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // Standard Meta
  setMetaTag('name', 'description', description || DEFAULT_DESC);

  // Open Graph
  setMetaTag('property', 'og:title', title || DEFAULT_TITLE);
  setMetaTag('property', 'og:description', description || DEFAULT_DESC);
  setMetaTag('property', 'og:image', ogImage);
  setMetaTag('property', 'og:type', type);
  setMetaTag('property', 'og:url', targetUrl);

  // Twitter Card
  setMetaTag('name', 'twitter:title', title || DEFAULT_TITLE);
  setMetaTag('name', 'twitter:description', description || DEFAULT_DESC);
  setMetaTag('name', 'twitter:image', ogImage);

  // Canonical Link
  let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', targetUrl);
}
