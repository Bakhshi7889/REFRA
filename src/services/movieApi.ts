import { Movie, Review, WatchProvider } from '../types';
export type { WatchProvider };
import { FALLBACK_MOVIES } from '../data/movies';
import { getUserRegion } from './regionStore';
import {
  getCachedWatchProviders,
  saveCachedWatchProviders,
  getOfflineMoviesPool,
} from './movieCache';
import { swrFetch, getCachedSWR, setCachedSWR, invalidateSWR } from './swrCache';

const TMDB_KEY = '2c46bcbb68760c2e8d35ec05a46e0c78';

// Server availability flag: null = unknown, true = /api available, false = static deployment (Netlify/Vercel)
let isServerAvailable: boolean | null = null;

// In-memory cache to prevent excessive requests (6 hours TTL)
let clientCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

export function clearMovieApiCache(): void {
  clientCache = {};
}

function getPersistentApiCache(key: string): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`refra_api_${key}`) || localStorage.getItem(`refra_api_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch {
    return null;
  }
}

function setPersistentApiCache(key: string, data: any): void {
  if (typeof window === 'undefined' || !data) return;
  try {
    const serialized = JSON.stringify({ data, timestamp: Date.now() });
    try {
      sessionStorage.setItem(`refra_api_${key}`, serialized);
    } catch {
      // Storage full or restricted
    }
  } catch {
    // ignore
  }
}

// Built-in curated watch providers for zero-internet / offline fallback
const FALLBACK_PROVIDERS_BY_REGION: Record<string, WatchProvider[]> = {
  US: [
    { provider_id: 8, provider_name: 'Netflix', logo_path: '/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
    { provider_id: 9, provider_name: 'Amazon Prime Video', logo_path: '/emthp39XA2zhzgTvILbg2aGbCJ9.jpg' },
    { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
    { provider_id: 350, provider_name: 'Apple TV Plus', logo_path: '/2E03FLBsBRKQIzRwwupflZuWaF5.jpg' },
    { provider_id: 15, provider_name: 'Hulu', logo_path: '/zxrVDKXD0074PVYn1GzLAvDHhw9.jpg' },
    { provider_id: 384, provider_name: 'Max', logo_path: '/fi83B1oztoS47xxcemFdPMhIzK.jpg' },
    { provider_id: 386, provider_name: 'Peacock', logo_path: '/8VCV78eh0Rj7GUAhtmnV59Rw7vW.jpg' },
    { provider_id: 283, provider_name: 'Crunchyroll', logo_path: '/mXeC4TrcgdjvClSb4OezCBXMhk.jpg' },
    { provider_id: 11, provider_name: 'MUBI', logo_path: '/bZVC9dXrXNly7cA0V4D9pR8yJwm.jpg' },
    { provider_id: 192, provider_name: 'YouTube', logo_path: '/peURlLlr8jggOwK53fJ5wdQl05y.jpg' },
  ],
  IN: [
    { provider_id: 122, provider_name: 'JioHotstar', logo_path: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
    { provider_id: 8, provider_name: 'Netflix', logo_path: '/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg' },
    { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/emthp39XA2zhzgTvILbg2aGbCJ9.jpg' },
    { provider_id: 220, provider_name: 'JioCinema', logo_path: '/oRvEOWvB8zU82qEaJ3i6jR1d0U8.jpg' },
    { provider_id: 237, provider_name: 'SonyLIV', logo_path: '/y773b06G0gZ2c5kM2fWj68X2QyD.jpg' },
    { provider_id: 232, provider_name: 'Zee5', logo_path: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
    { provider_id: 350, provider_name: 'Apple TV Plus', logo_path: '/2E03FLBsBRKQIzRwwupflZuWaF5.jpg' },
    { provider_id: 283, provider_name: 'Crunchyroll', logo_path: '/mXeC4TrcgdjvClSb4OezCBXMhk.jpg' },
    { provider_id: 192, provider_name: 'YouTube', logo_path: '/peURlLlr8jggOwK53fJ5wdQl05y.jpg' },
  ],
};

export async function checkServerAvailable(): Promise<boolean> {
  if (isServerAvailable !== null) return isServerAvailable;

  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 2500) : null;
    
    const res = await fetch('/api/health', {
      signal: controller ? controller.signal : undefined,
    });
    
    if (timeoutId) clearTimeout(timeoutId);
    
    if (res.ok) {
      isServerAvailable = true;
      return true;
    }
  } catch {
    // Server is not running or route 404ed, fallback to client-side
  }

  isServerAvailable = false;
  return false;
}

// ---------------- DIRECT CLIENT-SIDE FORMATTERS ----------------

const TMDB_GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

function formatTmdbMovie(m: any, defaultType?: 'movie' | 'tv' | boolean): Movie {
  const tmdbId = m.id;
  const isTv = defaultType === 'tv' || Boolean(
    m.first_air_date ||
    m.name ||
    m.original_name ||
    m.number_of_seasons ||
    m.media_type === 'tv'
  );

  const backdrops: string[] = [];
  if (m.backdrop_path) {
    backdrops.push(`https://image.tmdb.org/t/p/original${m.backdrop_path}`);
  }
  if (m.images?.backdrops) {
    m.images.backdrops.slice(0, 5).forEach((b: any) => {
      const url = `https://image.tmdb.org/t/p/original${b.file_path}`;
      if (!backdrops.includes(url)) backdrops.push(url);
    });
  }

  const posters: string[] = [];
  if (m.poster_path) {
    posters.push(`https://image.tmdb.org/t/p/original${m.poster_path}`);
  }
  if (m.images?.posters) {
    m.images.posters.slice(0, 5).forEach((p: any) => {
      const url = `https://image.tmdb.org/t/p/original${p.file_path}`;
      if (!posters.includes(url)) posters.push(url);
    });
  }

  let trailerYoutubeId: string | undefined;
  if (m.videos?.results) {
    const trailer = m.videos.results.find(
      (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );
    if (trailer) trailerYoutubeId = trailer.key;
  }

  const director =
    m.created_by?.[0]?.name ||
    m.credits?.crew?.find((c: any) => c.job === 'Director' || c.job === 'Creator' || c.job === 'Executive Producer')?.name ||
    (isTv ? 'Original Series' : 'Director Vision');

  const cast =
    m.credits?.cast?.slice(0, 4).map((c: any) => c.name) || ['Ensemble Cast'];

  let genres: string[] = [];
  if (Array.isArray(m.genres) && m.genres.length > 0) {
    genres = m.genres.map((g: any) => (typeof g === 'string' ? g : g.name)).filter(Boolean);
  } else if (Array.isArray(m.genre_ids) && m.genre_ids.length > 0) {
    genres = m.genre_ids.map((id: number) => TMDB_GENRE_NAMES[id]).filter(Boolean);
  }
  if (genres.length === 0) {
    genres = isTv ? ['Series', 'Drama'] : ['Cinema', 'Drama'];
  }

  let duration = '2h 10m';
  if (m.runtime) {
    duration = `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m`;
  } else if (m.number_of_seasons) {
    duration = `${m.number_of_seasons} Season${m.number_of_seasons > 1 ? 's' : ''}`;
  } else if (m.episode_run_time && m.episode_run_time.length > 0) {
    duration = `${m.episode_run_time[0]}m / ep`;
  } else if (isTv) {
    duration = 'Series';
  }

  const dateStr = m.release_date || m.first_air_date;
  const releaseYear = dateStr
    ? new Date(dateStr).getFullYear()
    : (isTv ? 2023 : 2024);

  const score = m.vote_average ? m.vote_average.toFixed(1) : '8.4';
  const posterUrl = m.poster_path
    ? `https://image.tmdb.org/t/p/w780${m.poster_path}`
    : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';
  const primaryBackdrop =
    backdrops[0] ||
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80';

  const resolutions = ['4K HDR', '4K UHD', 'IMAX Enhanced'] as const;
  const resolution = resolutions[tmdbId % resolutions.length];

  const title =
    m.title ||
    m.name ||
    m.original_title ||
    m.original_name ||
    (isTv ? 'Featured Series' : 'Featured Movie');

  const tagline = m.tagline || (isTv ? 'Acclaimed Streaming Series' : 'Feature Film');
  const synopsis = m.overview || (isTv ? 'Original television series streaming in high definition.' : 'A cinematic voyage crafted for large screens.');

  let logoUrl: string | undefined = m.logoUrl;
  if (!logoUrl && m.images?.logos && m.images.logos.length > 0) {
    const enLogo =
      m.images.logos.find((l: any) => l.iso_639_1 === 'en') ||
      m.images.logos.find((l: any) => !l.iso_639_1) ||
      m.images.logos[0];
    if (enLogo?.file_path) {
      logoUrl = `https://image.tmdb.org/t/p/w500${enLogo.file_path}`;
    }
  }

  return {
    id: isTv ? `tmdb_tv_${tmdbId}` : `tmdb_${tmdbId}`,
    tmdbId,
    imdbId: m.imdb_id,
    title,
    tagline,
    synopsis,
    releaseYear,
    score,
    certification: isTv ? 'TV-14' : 'PG-13',
    duration,
    genres,
    director,
    cast,
    posterUrl,
    posters: posters.length > 0 ? posters : [posterUrl],
    backdropUrl: primaryBackdrop,
    backdrops: backdrops.length > 0 ? backdrops : [primaryBackdrop],
    logoUrl,
    trailerYoutubeId,
    trailerUrl: trailerYoutubeId ? `https://www.youtube.com/watch?v=${trailerYoutubeId}` : undefined,
    resolution,
    audioFormat: tmdbId % 2 === 0 ? 'Dolby Atmos 7.1' : 'Spatial Master Audio',
    spotlight: m.vote_average > 7.5,
    featured: true,
    badge: m.vote_average >= 8.2 ? 'Masterpiece' : m.popularity > 100 ? 'Trending' : '4K Premiere',
    mediaType: isTv ? 'tv' as const : 'movie' as const,
  };
}

function formatAniListAnime(item: any): Movie {
  const anilistId = item.id;
  const malId = item.idMal;
  const title = item.title?.english || item.title?.romaji || 'Trending Anime';
  const japaneseTitle = item.title?.native;
  const rawDesc = item.description ? item.description.replace(/<[^>]*>?/gm, '') : '';
  const synopsis = rawDesc || 'High-fidelity Japanese animation masterwork.';
  const releaseYear = item.seasonYear || 2024;
  const score = item.averageScore ? (item.averageScore / 10).toFixed(1) : '8.6';
  const duration = item.duration ? `${item.duration}m / ep` : item.episodes ? `${item.episodes} eps` : 'Feature';
  const genres = item.genres || ['Animation', 'Action', 'Fantasy'];
  const studio = item.studios?.nodes?.[0]?.name || 'Japanese Animation Studio';
  const posterUrl =
    item.coverImage?.extraLarge ||
    item.coverImage?.large ||
    item.coverImage?.medium ||
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80';
  const backdropUrl = item.bannerImage || posterUrl;

  let trailerYoutubeId: string | undefined;
  if (item.trailer?.site === 'youtube' && item.trailer?.id) {
    trailerYoutubeId = item.trailer.id;
  }

  const episodesList = item.episodes
    ? Array.from({ length: Math.min(item.episodes, 24) }, (_, i) => ({
        id: `ep_${anilistId}_${i + 1}`,
        number: i + 1,
        title: `Episode ${i + 1}`,
        duration: item.duration ? `${item.duration}m` : '24m',
        image: backdropUrl,
      }))
    : undefined;

  return {
    id: `anime_al_${anilistId}`,
    anilistId,
    malId,
    title,
    japaneseTitle,
    tagline: studio ? `Produced by ${studio}` : 'Sensory Japanese Animation',
    synopsis,
    releaseYear,
    score,
    certification: item.format === 'MOVIE' ? 'PG-13' : 'TV-14',
    duration,
    genres: ['Anime', ...genres.slice(0, 3)],
    director: studio,
    cast: ['Original Cast', 'Spatial Audio Mix'],
    posterUrl,
    posters: [posterUrl],
    backdropUrl,
    backdrops: item.bannerImage ? [item.bannerImage, posterUrl] : [posterUrl],
    trailerYoutubeId,
    trailerUrl: trailerYoutubeId ? `https://www.youtube.com/watch?v=${trailerYoutubeId}` : undefined,
    resolution: '4K HDR' as const,
    audioFormat: 'Spatial Audio (FLAC)',
    spotlight: (item.averageScore || 0) > 80,
    featured: true,
    badge: item.format === 'MOVIE' ? 'Anime Masterpiece' : 'Trending Anime',
    mediaType: 'anime' as const,
    status: item.status,
    totalEpisodes: item.episodes,
    episodes: episodesList,
    studios: studio ? [studio] : [],
  };
}

// ---------------- CLIENT-SIDE DIRECT FETCH HELPERS ----------------

async function directFetchTmdbMovies(endpoint: string): Promise<Movie[]> {
  const data = await directFetchTmdbRaw(endpoint);
  const items = (data.results || []).slice(0, 15);
  const formatted = items.map((m: any) => formatTmdbMovie(m));
  return formatted;
}

async function directFetchTmdbRaw(endpoint: string): Promise<any> {
  const cacheKey = `direct_raw_${endpoint}`;
  
  // 1. Check in-memory client cache
  if (clientCache[cacheKey] && Date.now() - clientCache[cacheKey].timestamp < CACHE_TTL) {
    return clientCache[cacheKey].data;
  }

  // 2. Check persistent session/local cache
  const persisted = getPersistentApiCache(cacheKey);
  if (persisted && (!clientCache[cacheKey] || clientCache[cacheKey].data !== persisted)) {
    clientCache[cacheKey] = { data: persisted, timestamp: Date.now() };
    // If not online, return immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return persisted;
    }
  }

  // Helper to fetch with timeout so slow/hanging connections don't stall the UI
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 6000) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller ? controller.signal : undefined,
      });
      if (timeoutId) clearTimeout(timeoutId);
      return response;
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId);
      throw e;
    }
  };

  // 3. Security layer: Route via backend proxy whenever server is online
  const hasServer = await checkServerAvailable();
  if (hasServer) {
    try {
      const res = await fetchWithTimeout(`/api/tmdb/proxy?endpoint=${encodeURIComponent(endpoint)}`, {}, 6000);
      if (res.ok) {
        const data = await res.json();
        clientCache[cacheKey] = { data, timestamp: Date.now() };
        setPersistentApiCache(cacheKey, data);
        return data;
      }
    } catch {
      // Fall through to direct fetch or stale cache
    }
  }

  // 4. Direct TMDB API fallback
  try {
    const sep = endpoint.includes('?') ? '&' : '?';
    const url = `https://api.themoviedb.org/3/${endpoint}${sep}api_key=${TMDB_KEY}`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (res.ok) {
      const data = await res.json();
      clientCache[cacheKey] = { data, timestamp: Date.now() };
      setPersistentApiCache(cacheKey, data);
      return data;
    }
  } catch (err) {
    console.warn('Network fetch error for TMDB endpoint', endpoint, err);
  }

  // 5. Offline / poor connection fallback: return stale cached data if available
  if (clientCache[cacheKey]?.data) {
    return clientCache[cacheKey].data;
  }
  if (persisted) {
    return persisted;
  }

  return { results: [] };
}

async function directFetchAniList(perPage = 16): Promise<Movie[]> {
  const cacheKey = `direct_anilist_${perPage}`;
  if (clientCache[cacheKey] && Date.now() - clientCache[cacheKey].timestamp < CACHE_TTL) {
    return clientCache[cacheKey].data;
  }

  const persisted = getPersistentApiCache(cacheKey);
  if (persisted) {
    clientCache[cacheKey] = { data: persisted, timestamp: Date.now() };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return persisted;
    }
  }

  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          id
          idMal
          title {
            english
            romaji
            native
          }
          description(asHtml: false)
          bannerImage
          coverImage {
            extraLarge
            large
            medium
          }
          genres
          averageScore
          episodes
          duration
          seasonYear
          format
          status
          studios(isMain: true) {
            nodes {
              name
            }
          }
          trailer {
            id
            site
          }
        }
      }
    }
  `;

  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { page: 1, perPage } }),
      signal: controller ? controller.signal : undefined,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const media = data?.data?.Page?.media || [];
      const formatted = media.map(formatAniListAnime);
      if (formatted.length > 0) {
        clientCache[cacheKey] = { data: formatted, timestamp: Date.now() };
        setPersistentApiCache(cacheKey, formatted);
        return formatted;
      }
    }
  } catch (err) {
    console.warn('AniList fetch notice:', err);
  }

  // Fallback to stale cached or anime from fallback movies
  if (clientCache[cacheKey]?.data) {
    return clientCache[cacheKey].data;
  }
  if (persisted) {
    return persisted;
  }

  return FALLBACK_MOVIES.filter((m) => m.genres.includes('Animation'));
}

// ---------------- PUBLIC EXPORTED FUNCTIONS ----------------

export async function fetchSpotlightMovies(regionOverride?: string): Promise<Movie[]> {
  const region = regionOverride !== undefined ? regionOverride : getUserRegion();
  const cacheKey = `spotlight_${region || 'global'}`;

  return swrFetch(cacheKey, async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const url = region ? `/api/movies/spotlight?region=${region}` : '/api/movies/spotlight';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const endpoint = region ? `movie/now_playing?region=${region}&page=1` : 'trending/movie/week';
      let directMovies = await directFetchTmdbMovies(endpoint);
      if (directMovies.length === 0 && region) {
        directMovies = await directFetchTmdbMovies('trending/movie/week');
      }
      if (directMovies.length > 0) {
        const top5 = directMovies.slice(0, 5);
        const enriched = await Promise.all(
          top5.map(async (movie) => {
            if (movie.logoUrl || !movie.tmdbId) return movie;
            try {
              const imgData = await directFetchTmdbRaw(`movie/${movie.tmdbId}/images?include_image_language=en,null`);
              if (imgData?.logos && imgData.logos.length > 0) {
                const enLogo =
                  imgData.logos.find((l: any) => l.iso_639_1 === 'en') ||
                  imgData.logos.find((l: any) => !l.iso_639_1) ||
                  imgData.logos[0];
                if (enLogo?.file_path) {
                  return {
                    ...movie,
                    logoUrl: `https://image.tmdb.org/t/p/w500${enLogo.file_path}`,
                  };
                }
              }
            } catch {
              // Ignore image lookup errors
            }
            return movie;
          })
        );
        return enriched;
      }
    } catch (err) {
      console.warn('Direct TMDB spotlight error:', err);
    }

    return FALLBACK_MOVIES.filter((m) => m.spotlight || m.featured);
  });
}

export async function fetchTrendingMovies(regionOverride?: string): Promise<Movie[]> {
  const region = regionOverride !== undefined ? regionOverride : getUserRegion();
  const cacheKey = `trending_${region || 'global'}`;

  return swrFetch(cacheKey, async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const url = region ? `/api/movies/trending?region=${region}` : '/api/movies/trending';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const endpoint = region ? `movie/popular?region=${region}&page=1` : 'movie/popular?page=1';
      const directMovies = await directFetchTmdbMovies(endpoint);
      if (directMovies.length > 0) return directMovies;
    } catch (err) {
      console.warn('Direct TMDB trending error:', err);
    }

    return FALLBACK_MOVIES;
  });
}

export async function fetchTopRatedMovies(regionOverride?: string): Promise<Movie[]> {
  const region = regionOverride !== undefined ? regionOverride : getUserRegion();
  const cacheKey = `top_rated_${region || 'global'}`;

  return swrFetch(cacheKey, async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const url = region ? `/api/movies/top_rated?region=${region}` : '/api/movies/top_rated';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const endpoint = region ? `movie/top_rated?region=${region}&page=1` : 'movie/top_rated?page=1';
      const directMovies = await directFetchTmdbMovies(endpoint);
      if (directMovies.length > 0) return directMovies;
    } catch (err) {
      console.warn('Direct TMDB top rated error:', err);
    }

    return FALLBACK_MOVIES.slice(2);
  });
}

export async function fetchAnimeMovies(): Promise<Movie[]> {
  return swrFetch('anime_movies', async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const res = await fetch('/api/movies/anime');
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    // 1. Try AniList GraphQL first for real trending anime
    try {
      const directAnime = await directFetchAniList(16);
      if (directAnime.length > 0) return directAnime;
    } catch {
      // try fallback to TMDB anime
    }

    // 2. Direct TMDB anime feature films
    try {
      const tmdbAnime = await directFetchTmdbMovies(
        'discover/movie?with_genres=16&with_original_language=ja&sort_by=popularity.desc&vote_count.gte=100'
      );
      if (tmdbAnime.length > 0) return tmdbAnime;
    } catch {
      // fallback
    }

    return FALLBACK_MOVIES.filter(
      (m) =>
        m.genres.includes('Animation') ||
        m.badge?.toLowerCase().includes('anime') ||
        m.badge?.toLowerCase().includes('ghibli') ||
        m.director.includes('Miyazaki') ||
        m.director.includes('Shinkai')
    );
  });
}

export async function fetchActionMovies(): Promise<Movie[]> {
  return swrFetch('action_movies', async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const res = await fetch('/api/movies/action');
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const directMovies = await directFetchTmdbMovies(
        'discover/movie?with_genres=28&sort_by=popularity.desc&vote_count.gte=300'
      );
      if (directMovies.length > 0) return directMovies;
    } catch (err) {
      console.warn('Direct TMDB action error:', err);
    }

    return FALLBACK_MOVIES.filter((m) => m.genres.includes('Action'));
  });
}

export async function fetchThrillersMovies(): Promise<Movie[]> {
  return swrFetch('thriller_movies', async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const res = await fetch('/api/movies/thrillers');
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const directMovies = await directFetchTmdbMovies(
        'discover/movie?with_genres=53,9648&sort_by=vote_average.desc&vote_count.gte=400'
      );
      if (directMovies.length > 0) return directMovies;
    } catch (err) {
      console.warn('Direct TMDB thrillers error:', err);
    }

    return FALLBACK_MOVIES.filter(
      (m) => m.genres.includes('Thriller') || m.genres.includes('Mystery') || m.genres.includes('Drama')
    );
  });
}

export async function fetchSciFiMovies(): Promise<Movie[]> {
  return swrFetch('scifi_movies', async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const res = await fetch('/api/movies/scifi');
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const directMovies = await directFetchTmdbMovies(
        'discover/movie?with_genres=878&sort_by=vote_average.desc&vote_count.gte=500'
      );
      if (directMovies.length > 0) return directMovies;
    } catch (err) {
      console.warn('Direct TMDB scifi error:', err);
    }

    return FALLBACK_MOVIES.filter((m) => m.genres.includes('Sci-Fi'));
  });
}

// ---------------- INDIA-SPECIFIC CINEMA FEEDS ----------------

export async function fetchIndiaTrending(): Promise<Movie[]> {
  return swrFetch('india_trending', async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const res = await fetch('/api/movies/india/trending');
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const direct = await directFetchTmdbMovies(
        'discover/movie?watch_region=IN&sort_by=popularity.desc&region=IN&page=1'
      );
      if (direct.length > 0) return direct;
    } catch (err) {
      console.warn('Direct TMDB India trending error:', err);
    }

    return FALLBACK_MOVIES;
  });
}

export async function fetchBollywoodMovies(): Promise<Movie[]> {
  return swrFetch('india_bollywood', async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const res = await fetch('/api/movies/india/bollywood');
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const direct = await directFetchTmdbMovies(
        'discover/movie?with_origin_country=IN&with_original_language=hi&sort_by=popularity.desc&page=1'
      );
      if (direct.length > 0) return direct;
    } catch (err) {
      console.warn('Direct TMDB Bollywood error:', err);
    }

    return FALLBACK_MOVIES;
  });
}

export async function fetchSouthIndianMovies(): Promise<Movie[]> {
  return swrFetch('india_south', async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const res = await fetch('/api/movies/india/south');
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const direct = await directFetchTmdbMovies(
        'discover/movie?with_origin_country=IN&with_original_language=ta|te|ml|kn&sort_by=popularity.desc&page=1'
      );
      if (direct.length > 0) return direct;
    } catch (err) {
      console.warn('Direct TMDB South Indian error:', err);
    }

    return FALLBACK_MOVIES;
  });
}

export async function fetchIndianSeries(): Promise<Movie[]> {
  return swrFetch('india_series', async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const res = await fetch('/api/movies/india/series');
        if (res.ok) {
          const data = await res.json();
          if (data.movies && data.movies.length > 0) return data.movies;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    try {
      const direct = await directFetchTmdbMovies(
        'discover/tv?with_origin_country=IN&sort_by=popularity.desc&page=1'
      );
      if (direct.length > 0) return direct;
    } catch (err) {
      console.warn('Direct TMDB Indian series error:', err);
    }

    return FALLBACK_MOVIES;
  });
}

export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query.trim()) return [];

  const hasServer = await checkServerAvailable();
  if (hasServer) {
    try {
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.movies) return data.movies;
      }
    } catch {
      isServerAvailable = false;
    }
  }

  try {
    const directResults = await directFetchTmdbMovies(
      `search/movie?query=${encodeURIComponent(query)}`
    );
    if (directResults.length > 0) return directResults;
  } catch (err) {
    console.warn('Direct TMDB search error:', err);
  }

  const q = query.toLowerCase();
  return FALLBACK_MOVIES.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.director.toLowerCase().includes(q) ||
      m.genres.some((g) => g.toLowerCase().includes(q)) ||
      m.cast.some((c) => c.toLowerCase().includes(q))
  );
}

export async function fetchMovieDetails(id: string): Promise<Movie | null> {
  const cacheKey = `movie_${id}`;
  return swrFetch(cacheKey, async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const res = await fetch(`/api/movies/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.movie) return data.movie;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    // If TMDB ID, fetch details + videos via secure proxy or cached raw fetcher
    if (id.startsWith('tmdb_tv_')) {
      const tmdbId = id.replace('tmdb_tv_', '');
      try {
        const raw = await directFetchTmdbRaw(`tv/${tmdbId}?append_to_response=videos,credits,images`);
        if (raw && !raw.status_code) {
          return formatTmdbMovie(raw, 'tv');
        }
      } catch (err) {
        console.warn('TMDB TV details fetch error:', err);
      }
    } else if (id.startsWith('tmdb_')) {
      const tmdbId = id.replace('tmdb_', '');
      try {
        let raw = await directFetchTmdbRaw(`movie/${tmdbId}?append_to_response=videos,credits,images`);
        if (raw && !raw.status_code) {
          return formatTmdbMovie(raw, 'movie');
        }
        raw = await directFetchTmdbRaw(`tv/${tmdbId}?append_to_response=videos,credits,images`);
        if (raw && !raw.status_code) {
          return formatTmdbMovie(raw, 'tv');
        }
      } catch (err) {
        console.warn('TMDB movie details fetch error:', err);
      }
    }

    return FALLBACK_MOVIES.find((m) => m.id === id) || null;
  });
}

export async function fetchReviews(
  mediaId: string,
  options?: { malId?: number | string; tmdbId?: number | string; isAnime?: boolean }
): Promise<Review[]> {
  const cacheKey = `reviews_${mediaId}`;
  return swrFetch(cacheKey, async () => {
    const hasServer = await checkServerAvailable();
    if (hasServer) {
      try {
        const params = new URLSearchParams();
        if (options?.malId) params.set('malId', String(options.malId));
        if (options?.tmdbId) params.set('tmdbId', String(options.tmdbId));
        if (options?.isAnime) params.set('isAnime', 'true');

        const res = await fetch(`/api/reviews/${mediaId}?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.reviews && data.reviews.length > 0) return data.reviews;
        }
      } catch {
        isServerAvailable = false;
      }
    }

    // Direct TMDB reviews fallback via proxy/cached fetcher
    const tmdbId = options?.tmdbId || (mediaId.startsWith('tmdb_') ? mediaId.replace('tmdb_', '') : null);
    if (tmdbId && !isNaN(Number(tmdbId))) {
      try {
        const data = await directFetchTmdbRaw(`movie/${tmdbId}/reviews`);
        if (data && data.results && data.results.length > 0) {
          return data.results.map((r: any) => {
            const rating = r.author_details?.rating || 8;
            return {
              id: `tmdb_rev_${r.id}`,
              author: r.author_details?.name || r.author || 'Cinephile Critic',
              authorAvatar: r.author_details?.avatar_path
                ? r.author_details.avatar_path.startsWith('/http')
                  ? r.author_details.avatar_path.slice(1)
                  : `https://image.tmdb.org/t/p/w200${r.author_details.avatar_path}`
                : undefined,
              score: `${rating}/10`,
              rating,
              date: r.created_at
                ? new Date(r.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Recent',
              content: r.content || '',
              tags: rating >= 8 ? ['Must-Watch Cinema', 'Critical Acclaim'] : ['Review'],
              isSpoiler: false,
              source: 'TMDB Cinephile' as const,
              recommended: rating >= 7,
              reactions: {
                helpful: 18,
                love: 7,
              },
            };
          });
        }
      } catch {
        // fallback to rich reviews below
      }
    }

    // Default high-fidelity reviews
    return [
      {
        id: `rev_master_${mediaId}_1`,
        author: 'Cinephile Guild',
        authorAvatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        score: '9.4/10',
        rating: 9.4,
        date: 'Aug 2024',
        content:
          'A triumph of sensory pacing, striking visual framing, and flawless sound design. The tension and emotional depth are balanced with precision.',
        tags: ['Masterpiece', 'Cinematic Highlight', 'Dolby Atmos Master'],
        isSpoiler: false,
        source: 'Refra Community' as const,
        recommended: true,
        reactions: { helpful: 34, love: 18 },
      },
      {
        id: `rev_master_${mediaId}_2`,
        author: 'Tokyo Animation Forum',
        authorAvatar:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        score: '9.0/10',
        rating: 9.0,
        date: 'Jul 2024',
        content:
          'Exquisite visual work and key-frame choreography. Every background plate feels painted by hand with astonishing depth of field.',
        tags: ['Stunning Animation', 'Recommended'],
        isSpoiler: false,
        source: 'AniList' as const,
        recommended: true,
        reactions: { helpful: 21, love: 9 },
      },
    ];
  });
}

export async function postReview(
  mediaId: string,
  review: { author: string; rating: number; content: string; isSpoiler?: boolean; tags?: string[] }
): Promise<Review | null> {
  const hasServer = await checkServerAvailable();
  let createdReview: Review | null = null;

  if (hasServer) {
    try {
      const res = await fetch(`/api/reviews/${mediaId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
      });
      if (res.ok) {
        const data = await res.json();
        createdReview = data.review || null;
      }
    } catch {
      // client fallback
    }
  }

  if (!createdReview) {
    // Create client review
    createdReview = {
      id: `local_rev_${Date.now()}`,
      author: review.author || 'Refra Cinephile',
      authorAvatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      score: `${review.rating || 10}/10`,
      rating: review.rating || 10,
      date: 'Just now',
      content: review.content.trim(),
      tags: review.tags || ['Verified Watcher', 'Refra Pro'],
      isSpoiler: Boolean(review.isSpoiler),
      source: 'Refra Community' as const,
      recommended: (review.rating || 10) >= 7,
      reactions: { helpful: 1, love: 1 },
    };
  }

  // Invalidate SWR cache for this media so new review appears immediately
  invalidateSWR(`reviews_${mediaId}`);

  return createdReview;
}

export async function fetchWatchProviders(region?: string): Promise<WatchProvider[]> {
  const activeRegion = region || getUserRegion() || 'US';
  const cacheKey = `providers_${activeRegion}`;

  return swrFetch(cacheKey, async () => {
    const cached = getCachedWatchProviders(activeRegion);
    if (cached && cached.length > 0 && typeof navigator !== 'undefined' && !navigator.onLine) {
      return cached;
    }

    try {
      const data = await directFetchTmdbRaw(`watch/providers/movie?watch_region=${activeRegion}`);
      if (data?.results && Array.isArray(data.results) && data.results.length > 0) {
        saveCachedWatchProviders(activeRegion, data.results);
        return data.results;
      }
    } catch (err) {
      console.warn('Providers fetch notice:', err);
    }

    if (cached && cached.length > 0) return cached;
    return FALLBACK_PROVIDERS_BY_REGION[activeRegion] || FALLBACK_PROVIDERS_BY_REGION['US'] || [];
  });
}

export interface DiscoverFilters {
  providerId?: number;
  genreId?: number;
  year?: string;
  yearFrom?: number;
  yearTo?: number;
  yearBefore?: number;
  yearAfter?: number;
  minRating?: number;
  language?: string;
  sort?: string;
  query?: string;
}

const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10765: 'Sci-Fi & Fantasy',
};

function performOfflineSearch(type: 'movie' | 'tv' | 'all', filters: DiscoverFilters): Movie[] {
  const pool = getOfflineMoviesPool();
  const allCandidatesMap = new Map<string, Movie>();

  for (const m of [...FALLBACK_MOVIES, ...pool]) {
    if (m && m.id) allCandidatesMap.set(m.id, m);
  }

  let candidates = Array.from(allCandidatesMap.values());

  // Filter media type
  if (type !== 'all') {
    candidates = candidates.filter((m) => {
      if (type === 'tv') return m.mediaType === 'tv';
      return m.mediaType === 'movie' || !m.mediaType;
    });
  }

  // Query search
  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.toLowerCase().trim();
    candidates = candidates.filter((m) => {
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchOverview = m.synopsis?.toLowerCase().includes(q) || m.tagline?.toLowerCase().includes(q);
      const matchDirector = m.director?.toLowerCase().includes(q);
      const matchCast = m.cast?.some((c) => c.toLowerCase().includes(q));
      const matchGenres = m.genres?.some((g) => g.toLowerCase().includes(q));
      return matchTitle || matchOverview || matchDirector || matchCast || matchGenres;
    });
  }

  // Genre filter
  if (filters.genreId) {
    const targetGenre = TMDB_GENRE_MAP[filters.genreId]?.toLowerCase();
    if (targetGenre) {
      candidates = candidates.filter((m) =>
        m.genres?.some((g) => g.toLowerCase().includes(targetGenre))
      );
    }
  }

  // Year filter
  if (filters.year) {
    const yr = String(filters.year);
    candidates = candidates.filter((m) => String(m.releaseYear) === yr);
  }

  // Min rating filter
  if (filters.minRating && filters.minRating > 0) {
    candidates = candidates.filter((m) => parseFloat(m.score || '0') >= (filters.minRating || 0));
  }

  // Sort
  if (filters.sort === 'vote_average.desc') {
    candidates.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
  } else if (filters.sort === 'primary_release_date.desc') {
    candidates.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
  } else {
    candidates.sort((a, b) => (b.spotlight ? 1 : 0) - (a.spotlight ? 1 : 0));
  }

  return candidates.slice(0, 30);
}

export async function discoverMoviesWithFilters(
  type: 'movie' | 'tv' | 'all' = 'all',
  filters: DiscoverFilters
): Promise<Movie[]> {
  try {
    if (filters.query) {
      if (type === 'all') {
        const data = await directFetchTmdbRaw(`search/multi?query=${encodeURIComponent(filters.query)}`);
        const results = (data.results || [])
          .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 24);
        const formatted = results.map((item: any) => formatTmdbMovie(item, item.media_type));
        if (formatted.length > 0) return formatted;
      } else {
        const data = await directFetchTmdbRaw(`search/${type}?query=${encodeURIComponent(filters.query)}`);
        const items = (data.results || []).slice(0, 24);
        const formatted = items.map((m: any) => formatTmdbMovie(m, type));
        if (formatted.length > 0) return formatted;
      }
      // If network search returned 0 items, check offline pool
      return performOfflineSearch(type, filters);
    } else {
      const getEndpoint = (t: 'movie' | 'tv') => {
        // Use user-selected region or fallback to US for US-only providers
        const userReg = getUserRegion() || 'US';
        const usOnlyProviders = [15, 384, 1825, 386, 2303];
        const region = filters.providerId && usOnlyProviders.includes(filters.providerId) ? 'US' : userReg;

        let endpoint = `discover/${t}?watch_region=${region}`;
        if (filters.providerId) endpoint += `&with_watch_providers=${filters.providerId}`;
        if (filters.genreId) endpoint += `&with_genres=${filters.genreId}`;

        // Date ranges: "Released between", "Released before", "Released after", or "Exact year"
        if (filters.year) {
          if (t === 'movie') endpoint += `&primary_release_year=${filters.year}`;
          else endpoint += `&first_air_date_year=${filters.year}`;
        } else if (filters.yearFrom && filters.yearTo) {
          if (t === 'movie') {
            endpoint += `&primary_release_date.gte=${filters.yearFrom}-01-01&primary_release_date.lte=${filters.yearTo}-12-31`;
          } else {
            endpoint += `&first_air_date.gte=${filters.yearFrom}-01-01&first_air_date.lte=${filters.yearTo}-12-31`;
          }
        } else if (filters.yearBefore) {
          if (t === 'movie') {
            endpoint += `&primary_release_date.lte=${filters.yearBefore}-12-31`;
          } else {
            endpoint += `&first_air_date.lte=${filters.yearBefore}-12-31`;
          }
        } else if (filters.yearAfter) {
          if (t === 'movie') {
            endpoint += `&primary_release_date.gte=${filters.yearAfter}-01-01`;
          } else {
            endpoint += `&first_air_date.gte=${filters.yearAfter}-01-01`;
          }
        }

        // Rating filter
        if (filters.minRating && filters.minRating > 0) {
          endpoint += `&vote_average.gte=${filters.minRating}&vote_count.gte=30`;
        }

        // Original language filter
        if (filters.language && filters.language !== 'all') {
          endpoint += `&with_original_language=${filters.language}`;
          const indianLangs = ['hi', 'ta', 'te', 'ml', 'kn', 'bn'];
          if (indianLangs.includes(filters.language)) {
            endpoint += '&with_origin_country=IN';
          }
        }

        // Sorting
        if (filters.sort) endpoint += `&sort_by=${filters.sort}`;
        else endpoint += `&sort_by=popularity.desc`;

        return endpoint;
      };

      if (type === 'all') {
        const [movieData, tvData] = await Promise.all([
          directFetchTmdbRaw(getEndpoint('movie')),
          directFetchTmdbRaw(getEndpoint('tv'))
        ]);

        const moviesFormatted = (movieData.results || []).map((m: any) => formatTmdbMovie(m, 'movie'));
        const tvFormatted = (tvData.results || []).map((m: any) => formatTmdbMovie(m, 'tv'));

        let combined = [...moviesFormatted, ...tvFormatted];

        if (combined.length === 0) {
          return performOfflineSearch(type, filters);
        }

        // Apply custom sort for combined results
        if (filters.sort === 'vote_average.desc') {
          combined.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
        } else if (filters.sort === 'primary_release_date.desc') {
          combined.sort((a, b) => b.releaseYear - a.releaseYear);
        } else if (filters.sort === 'primary_release_date.asc') {
          combined.sort((a, b) => a.releaseYear - b.releaseYear);
        } else {
          // Interleave or sort by popularity order
          combined.sort((a, b) => (b.spotlight ? 1 : 0) - (a.spotlight ? 1 : 0));
        }

        return combined.slice(0, 30);
      } else {
        const data = await directFetchTmdbRaw(getEndpoint(type as 'movie' | 'tv'));
        const items = (data.results || []).slice(0, 30);
        const formatted = items.map((m: any) => formatTmdbMovie(m, type as 'movie' | 'tv'));
        if (formatted.length > 0) return formatted;
        return performOfflineSearch(type, filters);
      }
    }
  } catch (err) {
    console.warn('Discover fetch notice, falling back to offline search:', err);
    return performOfflineSearch(type, filters);
  }
}

