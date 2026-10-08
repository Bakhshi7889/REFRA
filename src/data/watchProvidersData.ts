// In-code vector assets and official direct links for all streaming watch providers.
// Eliminates external TMDB logo network requests, ensures 0ms instant loading,
// prevents broken/404 image errors, and supports 1-tap direct streaming navigation.

export interface WatchProviderMeta {
  id: number;
  name: string;
  aliases: string[];
  brandColor: string;
  websiteUrl: string;
  searchUrlTemplate: (query: string) => string;
  svgDataUri: string;
}

// Crisp, high-fidelity SVG logos with authentic brand colors and geometry
const NETFLIX_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#141414"/>
  <!-- Left Pillar -->
  <path d="M28 18 H42 V82 H28 Z" fill="#B81D24"/>
  <!-- Right Pillar -->
  <path d="M58 18 H72 V82 H58 Z" fill="#B81D24"/>
  <!-- Diagonal Ribbon with highlight -->
  <path d="M28 18 L68 82 H72 L32 18 Z" fill="#E50914"/>
</svg>
`)}`;

const PRIME_VIDEO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#00050D"/>
  <text x="50" y="46" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="22" text-anchor="middle" letter-spacing="-0.5">prime</text>
  <text x="50" y="62" fill="#00A8E1" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="11" text-anchor="middle" letter-spacing="1">VIDEO</text>
  <!-- Smile Arrow -->
  <path d="M24 71 C40 81 60 81 76 71" fill="none" stroke="#00A8E1" stroke-width="3.5" stroke-linecap="round"/>
  <polygon points="76,68 80,73 73,76" fill="#00A8E1"/>
</svg>
`)}`;

const DISNEY_PLUS_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="disneyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0E1940"/>
      <stop offset="100%" stop-color="#040817"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#disneyGrad)"/>
  <!-- Arc -->
  <path d="M18 58 C32 26 68 24 82 48" fill="none" stroke="#68C7FF" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
  <!-- Sparkle Star -->
  <circle cx="82" cy="48" r="2.5" fill="#FFFFFF"/>
  <!-- Disney Text -->
  <text x="44" y="58" fill="#FFFFFF" font-family="Georgia, serif" font-weight="bold" font-style="italic" font-size="18" text-anchor="middle">Disney</text>
  <!-- Plus Symbol -->
  <text x="76" y="59" fill="#1DE9B6" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="900" font-size="21" text-anchor="middle">+</text>
</svg>
`)}`;

const APPLE_TV_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#000000"/>
  <!-- Apple Silhouette -->
  <g transform="translate(18, 30) scale(0.95)" fill="#FFFFFF">
    <path d="M15.2 12.9 C14.5 13.7 13.4 14.3 12.3 14.2 C12.1 13.1 12.7 12.0 13.3 11.2 C14.1 10.4 15.2 9.8 16.2 10.0 C16.4 11.1 15.8 12.1 15.2 12.9 Z"/>
    <path d="M18.8 18.2 C17.7 19.8 17.0 21.0 15.5 21.0 C14.0 21.0 13.6 20.1 11.8 20.1 C10.1 20.1 9.5 21.0 8.2 21.0 C6.8 21.0 5.9 19.6 4.7 17.9 C2.3 14.5 2.1 10.6 3.8 8.0 C4.9 6.2 6.8 5.1 8.8 5.1 C10.3 5.1 11.5 6.1 12.6 6.1 C13.7 6.1 14.6 5.1 16.3 5.1 C18.0 5.1 19.7 6.1 20.7 7.6 C16.9 9.8 17.5 15.4 21.3 16.8 C20.5 18.8 19.8 20.3 18.8 18.2 Z"/>
  </g>
  <!-- tv+ Text -->
  <text x="61" y="58" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, sans-serif" font-weight="700" font-size="24" text-anchor="middle" letter-spacing="-0.5">tv+</text>
</svg>
`)}`;

const MAX_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#002BE7"/>
  <text x="50" y="62" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Impact', 'Arial Black', sans-serif" font-weight="900" font-size="34" text-anchor="middle" letter-spacing="1">MAX</text>
  <circle cx="50" cy="50" r="5" fill="#002BE7"/>
  <circle cx="50" cy="50" r="2" fill="#FFFFFF"/>
</svg>
`)}`;

const HULU_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0B0C0F"/>
  <text x="50" y="62" fill="#1CE783" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="30" text-anchor="middle" letter-spacing="-1">hulu</text>
</svg>
`)}`;

const PEACOCK_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#000000"/>
  <!-- Feather Dots in Rainbow Arc -->
  <circle cx="28" cy="38" r="6" fill="#FCD116"/>
  <circle cx="37" cy="27" r="6" fill="#F26A36"/>
  <circle cx="50" cy="23" r="6" fill="#E5243B"/>
  <circle cx="63" cy="27" r="6" fill="#8B2F97"/>
  <circle cx="72" cy="38" r="6" fill="#0072CE"/>
  <circle cx="76" cy="52" r="6" fill="#009E49"/>
  <!-- Brand text -->
  <text x="50" y="76" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="14" text-anchor="middle" letter-spacing="0.5">peacock</text>
</svg>
`)}`;

const PARAMOUNT_PLUS_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0064FF"/>
  <!-- Mountain silhouette -->
  <polygon points="50,28 22,76 78,76" fill="#FFFFFF"/>
  <polygon points="50,28 36,76 64,76" fill="#0050D0"/>
  <polygon points="50,28 42,52 48,56 50,50 54,54 58,52" fill="#FFFFFF"/>
  <!-- Stars arc -->
  <circle cx="28" cy="40" r="2" fill="#FFFFFF"/>
  <circle cx="36" cy="30" r="2" fill="#FFFFFF"/>
  <circle cx="50" cy="22" r="2.5" fill="#FFFFFF"/>
  <circle cx="64" cy="30" r="2" fill="#FFFFFF"/>
  <circle cx="72" cy="40" r="2" fill="#FFFFFF"/>
  <!-- Plus -->
  <text x="76" y="44" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-weight="900" font-size="18">+</text>
</svg>
`)}`;

const CRUNCHYROLL_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#141519"/>
  <!-- Outer Orange Eye -->
  <circle cx="50" cy="50" r="28" fill="#F47521"/>
  <!-- Inner White Crescent / Pupil -->
  <circle cx="54" cy="48" r="16" fill="#141519"/>
  <circle cx="58" cy="46" r="11" fill="#FFFFFF"/>
  <circle cx="61" cy="44" r="5" fill="#141519"/>
</svg>
`)}`;

const YOUTUBE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0F0F0F"/>
  <!-- Red Pill -->
  <rect x="18" y="27" width="64" height="46" rx="14" fill="#FF0000"/>
  <!-- Play Triangle -->
  <polygon points="43,38 65,50 43,62" fill="#FFFFFF"/>
</svg>
`)}`;

const GOOGLE_PLAY_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#1F1F1F"/>
  <g transform="translate(24, 20) scale(1.1)">
    <!-- Blue section -->
    <path d="M4 3 L28 26 L4 49 Z" fill="#00D3FF"/>
    <!-- Yellow section -->
    <path d="M28 26 L38 35 L43 30 L4 3 Z" fill="#FFD400"/>
    <!-- Red section -->
    <path d="M28 26 L4 49 L43 22 Z" fill="#FF3333"/>
    <!-- Green section -->
    <path d="M28 26 L43 22 L43 30 Z" fill="#00E676"/>
  </g>
</svg>
`)}`;

const HOTSTAR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#032049"/>
  <!-- Star shape -->
  <polygon points="50,18 57,36 76,36 61,48 67,66 50,54 33,66 39,48 24,36 43,36" fill="#00D2B4"/>
  <text x="50" y="82" fill="#FFFFFF" font-family="-apple-system, sans-serif" font-weight="700" font-size="12" text-anchor="middle">hotstar</text>
</svg>
`)}`;

const JIOMOVIES_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#140A1E"/>
  <circle cx="50" cy="46" r="24" fill="#E814A6"/>
  <text x="50" y="54" fill="#FFFFFF" font-family="sans-serif" font-weight="900" font-size="22" text-anchor="middle">Jio</text>
  <text x="50" y="82" fill="#E814A6" font-family="sans-serif" font-weight="700" font-size="10" text-anchor="middle">CINEMA</text>
</svg>
`)}`;

const SONYLIV_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#111111"/>
  <!-- LIV colored arcs -->
  <rect x="22" y="24" width="8" height="38" rx="4" fill="#FF4500"/>
  <rect x="36" y="32" width="8" height="30" rx="4" fill="#00A3FF"/>
  <rect x="50" y="20" width="8" height="42" rx="4" fill="#00E676"/>
  <rect x="64" y="28" width="8" height="34" rx="4" fill="#9C27B0"/>
  <text x="50" y="80" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="13" text-anchor="middle" letter-spacing="1">SONY LIV</text>
</svg>
`)}`;

const ZEE5_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#220938"/>
  <circle cx="50" cy="50" r="32" fill="none" stroke="#8224E3" stroke-width="4"/>
  <text x="50" y="58" fill="#FFFFFF" font-family="sans-serif" font-weight="900" font-size="20" text-anchor="middle">ZEE5</text>
</svg>
`)}`;

const MUBI_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#000000"/>
  <!-- 7 dots constellation -->
  <circle cx="26" cy="36" r="6" fill="#00F0FF"/>
  <circle cx="42" cy="36" r="6" fill="#00F0FF"/>
  <circle cx="58" cy="36" r="6" fill="#00F0FF"/>
  <circle cx="74" cy="36" r="6" fill="#00F0FF"/>
  <circle cx="34" cy="52" r="6" fill="#00F0FF"/>
  <circle cx="50" cy="52" r="6" fill="#00F0FF"/>
  <circle cx="66" cy="52" r="6" fill="#00F0FF"/>
  <text x="50" y="80" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="14" text-anchor="middle" letter-spacing="2">MUBI</text>
</svg>
`)}`;

const TUBI_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#28003C"/>
  <text x="50" y="62" fill="#FEFF00" font-family="-apple-system, sans-serif" font-weight="900" font-size="28" text-anchor="middle" letter-spacing="-1">tubi</text>
</svg>
`)}`;

const PLUTO_TV_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#000000"/>
  <ellipse cx="50" cy="42" rx="34" ry="12" fill="none" stroke="#FFDF00" stroke-width="3" transform="rotate(-20, 50, 42)"/>
  <circle cx="50" cy="42" r="14" fill="#FFFFFF"/>
  <text x="50" y="78" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="13" text-anchor="middle">pluto(tv)</text>
</svg>
`)}`;

const CRITERION_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#080808"/>
  <text x="50" y="56" fill="#FFFFFF" font-family="Georgia, serif" font-weight="bold" font-size="34" text-anchor="middle">CC</text>
  <text x="50" y="76" fill="#C0C0C0" font-family="sans-serif" font-weight="600" font-size="8" text-anchor="middle" letter-spacing="1">CRITERION</text>
</svg>
`)}`;

const VUDU_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#0A192F"/>
  <text x="50" y="60" fill="#00B4FF" font-family="sans-serif" font-weight="900" font-size="24" text-anchor="middle" letter-spacing="-0.5">vudu</text>
  <text x="50" y="76" fill="#FFFFFF" font-family="sans-serif" font-weight="600" font-size="9" text-anchor="middle">FANDANGO</text>
</svg>
`)}`;

const AMC_PLUS_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#121212"/>
  <text x="42" y="60" fill="#FFFFFF" font-family="sans-serif" font-weight="900" font-size="26" text-anchor="middle">amc</text>
  <text x="74" y="60" fill="#FF1E27" font-family="sans-serif" font-weight="900" font-size="28" text-anchor="middle">+</text>
</svg>
`)}`;

const SHUDDER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#2A080C"/>
  <text x="50" y="60" fill="#E50914" font-family="Impact, sans-serif" font-weight="900" font-size="18" text-anchor="middle" letter-spacing="1">SHUDDER</text>
</svg>
`)}`;

const BRITBOX_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#091B33"/>
  <text x="50" y="58" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="16" text-anchor="middle">britbox</text>
</svg>
`)}`;

const STARZ_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#050505"/>
  <text x="50" y="60" fill="#FFFFFF" font-family="sans-serif" font-weight="900" font-size="18" text-anchor="middle" letter-spacing="1.5">STARZ</text>
</svg>
`)}`;

const PLEX_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="#1E2328"/>
  <polygon points="36,28 66,50 36,72" fill="#E5A00D"/>
  <text x="50" y="84" fill="#FFFFFF" font-family="sans-serif" font-weight="700" font-size="11" text-anchor="middle">PLEX</text>
</svg>
`)}`;

// Master Registry of Watch Providers
export const KNOWN_WATCH_PROVIDERS: WatchProviderMeta[] = [
  {
    id: 8,
    name: 'Netflix',
    aliases: ['netflix', 'nflx'],
    brandColor: '#E50914',
    websiteUrl: 'https://www.netflix.com',
    searchUrlTemplate: (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: NETFLIX_SVG,
  },
  {
    id: 9,
    name: 'Amazon Prime Video',
    aliases: ['amazon', 'prime', 'prime video', 'amazon prime video', 'amazon prime'],
    brandColor: '#00A8E1',
    websiteUrl: 'https://www.primevideo.com',
    searchUrlTemplate: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=instant-video`,
    svgDataUri: PRIME_VIDEO_SVG,
  },
  {
    id: 119,
    name: 'Amazon Prime',
    aliases: ['amazon video'],
    brandColor: '#00A8E1',
    websiteUrl: 'https://www.primevideo.com',
    searchUrlTemplate: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=instant-video`,
    svgDataUri: PRIME_VIDEO_SVG,
  },
  {
    id: 337,
    name: 'Disney+',
    aliases: ['disney', 'disney plus', 'disney+'],
    brandColor: '#113CCF',
    websiteUrl: 'https://www.disneyplus.com',
    searchUrlTemplate: (q) => `https://www.disneyplus.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: DISNEY_PLUS_SVG,
  },
  {
    id: 350,
    name: 'Apple TV+',
    aliases: ['apple', 'apple tv', 'apple tv plus', 'apple tv+', 'itunes'],
    brandColor: '#000000',
    websiteUrl: 'https://tv.apple.com',
    searchUrlTemplate: (q) => `https://tv.apple.com/search?term=${encodeURIComponent(q)}`,
    svgDataUri: APPLE_TV_SVG,
  },
  {
    id: 2,
    name: 'Apple TV',
    aliases: ['apple itunes'],
    brandColor: '#000000',
    websiteUrl: 'https://tv.apple.com',
    searchUrlTemplate: (q) => `https://tv.apple.com/search?term=${encodeURIComponent(q)}`,
    svgDataUri: APPLE_TV_SVG,
  },
  {
    id: 1899,
    name: 'Max',
    aliases: ['max', 'hbo max', 'hbo'],
    brandColor: '#002BE7',
    websiteUrl: 'https://www.max.com',
    searchUrlTemplate: (q) => `https://play.max.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: MAX_SVG,
  },
  {
    id: 384,
    name: 'HBO Max',
    aliases: ['hbo max'],
    brandColor: '#5A05B5',
    websiteUrl: 'https://www.max.com',
    searchUrlTemplate: (q) => `https://play.max.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: MAX_SVG,
  },
  {
    id: 15,
    name: 'Hulu',
    aliases: ['hulu'],
    brandColor: '#1CE783',
    websiteUrl: 'https://www.hulu.com',
    searchUrlTemplate: (q) => `https://www.hulu.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: HULU_SVG,
  },
  {
    id: 386,
    name: 'Peacock',
    aliases: ['peacock', 'peacock premium'],
    brandColor: '#000000',
    websiteUrl: 'https://www.peacocktv.com',
    searchUrlTemplate: (q) => `https://www.peacocktv.com/watch/search?q=${encodeURIComponent(q)}`,
    svgDataUri: PEACOCK_SVG,
  },
  {
    id: 531,
    name: 'Paramount+',
    aliases: ['paramount', 'paramount plus', 'paramount+'],
    brandColor: '#0064FF',
    websiteUrl: 'https://www.paramountplus.com',
    searchUrlTemplate: (q) => `https://www.paramountplus.com/search/?q=${encodeURIComponent(q)}`,
    svgDataUri: PARAMOUNT_PLUS_SVG,
  },
  {
    id: 283,
    name: 'Crunchyroll',
    aliases: ['crunchyroll'],
    brandColor: '#F47521',
    websiteUrl: 'https://www.crunchyroll.com',
    searchUrlTemplate: (q) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: CRUNCHYROLL_SVG,
  },
  {
    id: 192,
    name: 'YouTube',
    aliases: ['youtube', 'youtube premium', 'youtube movies'],
    brandColor: '#FF0000',
    websiteUrl: 'https://www.youtube.com',
    searchUrlTemplate: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' full movie')}`,
    svgDataUri: YOUTUBE_SVG,
  },
  {
    id: 3,
    name: 'Google Play Movies',
    aliases: ['google play', 'google play movies', 'google tv'],
    brandColor: '#1F1F1F',
    websiteUrl: 'https://play.google.com/store/movies',
    searchUrlTemplate: (q) => `https://play.google.com/store/search?q=${encodeURIComponent(q)}&c=movies`,
    svgDataUri: GOOGLE_PLAY_SVG,
  },
  {
    id: 122,
    name: 'JioHotstar',
    aliases: ['hotstar', 'disney+ hotstar', 'disney hotstar', 'jiohotstar'],
    brandColor: '#032049',
    websiteUrl: 'https://www.hotstar.com',
    searchUrlTemplate: (q) => `https://www.hotstar.com/in/explore?search_query=${encodeURIComponent(q)}`,
    svgDataUri: HOTSTAR_SVG,
  },
  {
    id: 220,
    name: 'JioCinema',
    aliases: ['jiocinema', 'jio cinema', 'jio'],
    brandColor: '#E814A6',
    websiteUrl: 'https://www.jiocinema.com',
    searchUrlTemplate: (q) => `https://www.jiocinema.com/search/${encodeURIComponent(q)}`,
    svgDataUri: JIOMOVIES_SVG,
  },
  {
    id: 237,
    name: 'Sony LIV',
    aliases: ['sonyliv', 'sony liv', 'sony'],
    brandColor: '#111111',
    websiteUrl: 'https://www.sonyliv.com',
    searchUrlTemplate: (q) => `https://www.sonyliv.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: SONYLIV_SVG,
  },
  {
    id: 232,
    name: 'Zee5',
    aliases: ['zee5', 'zee 5'],
    brandColor: '#220938',
    websiteUrl: 'https://www.zee5.com',
    searchUrlTemplate: (q) => `https://www.zee5.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: ZEE5_SVG,
  },
  {
    id: 11,
    name: 'MUBI',
    aliases: ['mubi'],
    brandColor: '#000000',
    websiteUrl: 'https://mubi.com',
    searchUrlTemplate: (q) => `https://mubi.com/search/films?query=${encodeURIComponent(q)}`,
    svgDataUri: MUBI_SVG,
  },
  {
    id: 73,
    name: 'Tubi',
    aliases: ['tubi', 'tubi tv'],
    brandColor: '#28003C',
    websiteUrl: 'https://tubitv.com',
    searchUrlTemplate: (q) => `https://tubitv.com/search/${encodeURIComponent(q)}`,
    svgDataUri: TUBI_SVG,
  },
  {
    id: 300,
    name: 'Pluto TV',
    aliases: ['pluto', 'pluto tv'],
    brandColor: '#000000',
    websiteUrl: 'https://pluto.tv',
    searchUrlTemplate: (q) => `https://pluto.tv/en/search/details?q=${encodeURIComponent(q)}`,
    svgDataUri: PLUTO_TV_SVG,
  },
  {
    id: 258,
    name: 'Criterion Channel',
    aliases: ['criterion', 'criterion channel'],
    brandColor: '#080808',
    websiteUrl: 'https://www.criterionchannel.com',
    searchUrlTemplate: (q) => `https://www.criterionchannel.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: CRITERION_SVG,
  },
  {
    id: 7,
    name: 'Vudu',
    aliases: ['vudu', 'fandango at home'],
    brandColor: '#0A192F',
    websiteUrl: 'https://www.vudu.com',
    searchUrlTemplate: (q) => `https://www.vudu.com/content/movies/search?searchString=${encodeURIComponent(q)}`,
    svgDataUri: VUDU_SVG,
  },
  {
    id: 528,
    name: 'AMC+',
    aliases: ['amc', 'amc+', 'amc plus'],
    brandColor: '#121212',
    websiteUrl: 'https://www.amcplus.com',
    searchUrlTemplate: (q) => `https://www.amcplus.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: AMC_PLUS_SVG,
  },
  {
    id: 99,
    name: 'Shudder',
    aliases: ['shudder'],
    brandColor: '#2A080C',
    websiteUrl: 'https://www.shudder.com',
    searchUrlTemplate: (q) => `https://www.shudder.com/search?q=${encodeURIComponent(q)}`,
    svgDataUri: SHUDDER_SVG,
  },
  {
    id: 380,
    name: 'BritBox',
    aliases: ['britbox'],
    brandColor: '#091B33',
    websiteUrl: 'https://www.britbox.com',
    searchUrlTemplate: (q) => `https://www.britbox.com/us/search?q=${encodeURIComponent(q)}`,
    svgDataUri: BRITBOX_SVG,
  },
  {
    id: 43,
    name: 'Starz',
    aliases: ['starz'],
    brandColor: '#050505',
    websiteUrl: 'https://www.starz.com',
    searchUrlTemplate: (q) => `https://www.starz.com/us/en/search?q=${encodeURIComponent(q)}`,
    svgDataUri: STARZ_SVG,
  },
  {
    id: 538,
    name: 'Plex',
    aliases: ['plex'],
    brandColor: '#1E2328',
    websiteUrl: 'https://watch.plex.tv',
    searchUrlTemplate: (q) => `https://watch.plex.tv/search?q=${encodeURIComponent(q)}`,
    svgDataUri: PLEX_SVG,
  },
];

/**
 * Match a provider by TMDB ID or by name/alias.
 */
export function findWatchProviderMeta(
  provider: { id?: number; provider_id?: number; name?: string; provider_name?: string }
): WatchProviderMeta | null {
  const providerId = provider.id ?? provider.provider_id;
  if (providerId) {
    const matchById = KNOWN_WATCH_PROVIDERS.find((p) => p.id === providerId);
    if (matchById) return matchById;
  }

  const rawName = (provider.name || provider.provider_name || '').trim().toLowerCase();
  if (!rawName) return null;

  // Direct name or alias match
  for (const p of KNOWN_WATCH_PROVIDERS) {
    if (p.name.toLowerCase() === rawName) return p;
    if (p.aliases.some((alias) => rawName.includes(alias) || alias.includes(rawName))) {
      return p;
    }
  }

  return null;
}

/**
 * Generates an in-code SVG logo for any streaming provider.
 * Guaranteed 0ms instant loading with zero network requests.
 */
export function getInCodeWatchProviderLogo(
  provider: { id?: number; provider_id?: number; name?: string; provider_name?: string; logoUrl?: string; logo_path?: string }
): string {
  const meta = findWatchProviderMeta(provider);
  if (meta) {
    return meta.svgDataUri;
  }

  // If not in known list, generate an elegant in-code monogram badge SVG
  const name = (provider.name || provider.provider_name || 'Stream').trim();
  const initial = name.charAt(0).toUpperCase() || 'S';
  const color = '#1E232A';

  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${color}"/>
  <text x="50" y="62" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="800" font-size="36" text-anchor="middle">${initial}</text>
</svg>
`)}`;
}

/**
 * Generates the official destination link for 1-tap navigation to the streaming provider.
 * When movieTitle is provided, it links directly to the search/watch page for that movie!
 */
export function getWatchProviderDestinationUrl(
  provider: { id?: number; provider_id?: number; name?: string; provider_name?: string },
  movieTitle?: string
): string {
  const meta = findWatchProviderMeta(provider);
  const cleanTitle = (movieTitle || '').trim();

  if (meta) {
    if (cleanTitle) {
      return meta.searchUrlTemplate(cleanTitle);
    }
    return meta.websiteUrl;
  }

  const providerName = (provider.name || provider.provider_name || 'streaming').trim();
  if (cleanTitle) {
    return `https://www.google.com/search?q=${encodeURIComponent(`watch ${cleanTitle} on ${providerName}`)}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${providerName} streaming service`)}`;
}
