import { Movie, Review } from '../types';
import { FALLBACK_MOVIES } from '../data/movies';

const TMDB_KEY = '2c46bcbb68760c2e8d35ec05a46e0c78';

// Server availability flag: null = unknown, true = /api available, false = static deployment (Netlify/Vercel)
let isServerAvailable: boolean | null = null;

// In-memory cache to prevent excessive requests (6 hours TTL)
const clientCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

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

function formatTmdbMovie(m: any, detailed = false): Movie {
  const tmdbId = m.id;
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
    m.credits?.crew?.find((c: any) => c.job === 'Director')?.name || 'Cinema Visionary';
  const cast =
    m.credits?.cast?.slice(0, 4).map((c: any) => c.name) || ['Ensemble Cast'];
  const genres =
    m.genres?.map((g: any) => g.name) || ['Cinema'];

  const duration = m.runtime
    ? `${Math.floor(m.runtime / 60)}h ${m.runtime % 60}m`
    : '2h 10m';

  const releaseYear = m.release_date
    ? new Date(m.release_date).getFullYear()
    : 2024;

  const score = m.vote_average ? m.vote_average.toFixed(1) : '8.4';
  const posterUrl = m.poster_path
    ? `https://image.tmdb.org/t/p/w780${m.poster_path}`
    : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';
  const primaryBackdrop =
    backdrops[0] ||
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80';

  const resolutions = ['4K HDR', '4K UHD', 'IMAX Enhanced'] as const;
  const resolution = resolutions[tmdbId % resolutions.length];

  return {
    id: `tmdb_${tmdbId}`,
    tmdbId,
    imdbId: m.imdb_id,
    title: m.title || 'Cinema Masterwork',
    tagline: m.tagline || 'Pure visual immersion',
    synopsis: m.overview || 'A cinematic voyage crafted for large screens.',
    releaseYear,
    score,
    certification: 'PG-13',
    duration,
    genres,
    director,
    cast,
    posterUrl,
    posters: posters.length > 0 ? posters : [posterUrl],
    backdropUrl: primaryBackdrop,
    backdrops: backdrops.length > 0 ? backdrops : [primaryBackdrop],
    trailerYoutubeId,
    trailerUrl: trailerYoutubeId ? `https://www.youtube.com/watch?v=${trailerYoutubeId}` : undefined,
    resolution,
    audioFormat: tmdbId % 2 === 0 ? 'Dolby Atmos 7.1' : 'Spatial Master Audio',
    spotlight: m.vote_average > 7.5,
    featured: true,
    badge: m.vote_average >= 8.2 ? 'Masterpiece' : m.popularity > 100 ? 'Trending' : '4K Premiere',
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
  const cacheKey = `direct_${endpoint}`;
  if (clientCache[cacheKey] && Date.now() - clientCache[cacheKey].timestamp < CACHE_TTL) {
    return clientCache[cacheKey].data;
  }

  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `https://api.themoviedb.org/3/${endpoint}${sep}api_key=${TMDB_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB HTTP error ${res.status}`);
  const data = await res.json();
  const items = (data.results || []).slice(0, 15);
  const formatted = items.map((m: any) => formatTmdbMovie(m));
  clientCache[cacheKey] = { data: formatted, timestamp: Date.now() };
  return formatted;
}

async function directFetchAniList(perPage = 16): Promise<Movie[]> {
  const cacheKey = `direct_anilist_${perPage}`;
  if (clientCache[cacheKey] && Date.now() - clientCache[cacheKey].timestamp < CACHE_TTL) {
    return clientCache[cacheKey].data;
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

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables: { page: 1, perPage } }),
  });

  if (!res.ok) throw new Error('AniList GraphQL request failed');
  const data = await res.json();
  const media = data?.data?.Page?.media || [];
  const formatted = media.map(formatAniListAnime);
  if (formatted.length > 0) {
    clientCache[cacheKey] = { data: formatted, timestamp: Date.now() };
  }
  return formatted;
}

// ---------------- PUBLIC EXPORTED FUNCTIONS ----------------

export async function fetchSpotlightMovies(): Promise<Movie[]> {
  const hasServer = await checkServerAvailable();
  if (hasServer) {
    try {
      const res = await fetch('/api/movies/spotlight');
      if (res.ok) {
        const data = await res.json();
        if (data.movies && data.movies.length > 0) return data.movies;
      }
    } catch {
      isServerAvailable = false;
    }
  }

  try {
    const directMovies = await directFetchTmdbMovies('trending/movie/week');
    if (directMovies.length > 0) return directMovies.slice(0, 5);
  } catch (err) {
    console.warn('Direct TMDB spotlight error:', err);
  }

  return FALLBACK_MOVIES.filter((m) => m.spotlight || m.featured);
}

export async function fetchTrendingMovies(): Promise<Movie[]> {
  const hasServer = await checkServerAvailable();
  if (hasServer) {
    try {
      const res = await fetch('/api/movies/trending');
      if (res.ok) {
        const data = await res.json();
        if (data.movies && data.movies.length > 0) return data.movies;
      }
    } catch {
      isServerAvailable = false;
    }
  }

  try {
    const directMovies = await directFetchTmdbMovies('movie/popular?page=1');
    if (directMovies.length > 0) return directMovies;
  } catch (err) {
    console.warn('Direct TMDB trending error:', err);
  }

  return FALLBACK_MOVIES;
}

export async function fetchTopRatedMovies(): Promise<Movie[]> {
  const hasServer = await checkServerAvailable();
  if (hasServer) {
    try {
      const res = await fetch('/api/movies/top_rated');
      if (res.ok) {
        const data = await res.json();
        if (data.movies && data.movies.length > 0) return data.movies;
      }
    } catch {
      isServerAvailable = false;
    }
  }

  try {
    const directMovies = await directFetchTmdbMovies('movie/top_rated?page=1');
    if (directMovies.length > 0) return directMovies;
  } catch (err) {
    console.warn('Direct TMDB top rated error:', err);
  }

  return FALLBACK_MOVIES.slice(2);
}

export async function fetchAnimeMovies(): Promise<Movie[]> {
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
}

export async function fetchActionMovies(): Promise<Movie[]> {
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
}

export async function fetchThrillersMovies(): Promise<Movie[]> {
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
}

export async function fetchSciFiMovies(): Promise<Movie[]> {
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

  // If TMDB ID, fetch details + videos directly from TMDB
  if (id.startsWith('tmdb_')) {
    const tmdbId = id.replace('tmdb_', '');
    try {
      const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=videos,credits,images`;
      const res = await fetch(url);
      if (res.ok) {
        const raw = await res.json();
        return formatTmdbMovie(raw, true);
      }
    } catch (err) {
      console.warn('Direct TMDB movie details error:', err);
    }
  }

  return FALLBACK_MOVIES.find((m) => m.id === id) || null;
}

export async function fetchReviews(
  mediaId: string,
  options?: { malId?: number | string; tmdbId?: number | string; isAnime?: boolean }
): Promise<Review[]> {
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

  // Direct TMDB reviews fallback
  const tmdbId = options?.tmdbId || (mediaId.startsWith('tmdb_') ? mediaId.replace('tmdb_', '') : null);
  if (tmdbId && !isNaN(Number(tmdbId))) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/reviews?api_key=${TMDB_KEY}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
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
}

export async function postReview(
  mediaId: string,
  review: { author: string; rating: number; content: string; isSpoiler?: boolean; tags?: string[] }
): Promise<Review | null> {
  const hasServer = await checkServerAvailable();
  if (hasServer) {
    try {
      const res = await fetch(`/api/reviews/${mediaId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
      });
      if (res.ok) {
        const data = await res.json();
        return data.review || null;
      }
    } catch {
      // client fallback
    }
  }

  // Create client review
  return {
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
