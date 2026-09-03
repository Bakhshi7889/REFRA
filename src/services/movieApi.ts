import { Movie, Review } from '../types';
import { FALLBACK_MOVIES } from '../data/movies';

export async function fetchReviews(
  mediaId: string,
  options?: { malId?: number | string; tmdbId?: number | string; isAnime?: boolean }
): Promise<Review[]> {
  try {
    const params = new URLSearchParams();
    if (options?.malId) params.set('malId', String(options.malId));
    if (options?.tmdbId) params.set('tmdbId', String(options.tmdbId));
    if (options?.isAnime) params.set('isAnime', 'true');

    const res = await fetch(`/api/reviews/${mediaId}?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.reviews && data.reviews.length > 0) {
        return data.reviews;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch reviews:', e);
  }
  return [];
}

export async function postReview(
  mediaId: string,
  review: { author: string; rating: number; content: string; isSpoiler?: boolean; tags?: string[] }
): Promise<Review | null> {
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
  } catch (e) {
    console.warn('Failed to post review:', e);
  }
  return null;
}

export async function fetchSpotlightMovies(): Promise<Movie[]> {
  try {
    const res = await fetch('/api/movies/spotlight');
    if (!res.ok) throw new Error('Failed to fetch spotlight');
    const data = await res.json();
    if (data.movies && data.movies.length > 0) {
      return data.movies;
    }
  } catch (e) {
    console.warn('Using fallback spotlight data', e);
  }
  return FALLBACK_MOVIES.filter((m) => m.spotlight || m.featured);
}

export async function fetchTrendingMovies(): Promise<Movie[]> {
  try {
    const res = await fetch('/api/movies/trending');
    if (!res.ok) throw new Error('Failed to fetch trending');
    const data = await res.json();
    if (data.movies && data.movies.length > 0) {
      return data.movies;
    }
  } catch (e) {
    console.warn('Using fallback trending data', e);
  }
  return FALLBACK_MOVIES;
}

export async function fetchTopRatedMovies(): Promise<Movie[]> {
  try {
    const res = await fetch('/api/movies/top_rated');
    if (!res.ok) throw new Error('Failed to fetch top rated');
    const data = await res.json();
    if (data.movies && data.movies.length > 0) {
      return data.movies;
    }
  } catch (e) {
    console.warn('Using fallback top rated data', e);
  }
  return FALLBACK_MOVIES.slice(2);
}

export async function fetchAnimeMovies(): Promise<Movie[]> {
  try {
    const res = await fetch('/api/movies/anime');
    if (!res.ok) throw new Error('Failed to fetch anime');
    const data = await res.json();
    if (data.movies && data.movies.length > 0) {
      return data.movies;
    }
  } catch (e) {
    console.warn('Using fallback anime data', e);
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
  try {
    const res = await fetch('/api/movies/action');
    if (!res.ok) throw new Error('Failed to fetch action');
    const data = await res.json();
    if (data.movies && data.movies.length > 0) {
      return data.movies;
    }
  } catch (e) {
    console.warn('Using fallback action data', e);
  }
  return FALLBACK_MOVIES.filter((m) => m.genres.includes('Action'));
}

export async function fetchThrillersMovies(): Promise<Movie[]> {
  try {
    const res = await fetch('/api/movies/thrillers');
    if (!res.ok) throw new Error('Failed to fetch thrillers');
    const data = await res.json();
    if (data.movies && data.movies.length > 0) {
      return data.movies;
    }
  } catch (e) {
    console.warn('Using fallback thrillers data', e);
  }
  return FALLBACK_MOVIES.filter(
    (m) => m.genres.includes('Thriller') || m.genres.includes('Mystery') || m.genres.includes('Drama')
  );
}

export async function fetchSciFiMovies(): Promise<Movie[]> {
  try {
    const res = await fetch('/api/movies/scifi');
    if (!res.ok) throw new Error('Failed to fetch scifi');
    const data = await res.json();
    if (data.movies && data.movies.length > 0) {
      return data.movies;
    }
  } catch (e) {
    console.warn('Using fallback scifi data', e);
  }
  return FALLBACK_MOVIES.filter((m) => m.genres.includes('Sci-Fi'));
}

export async function searchMovies(query: string): Promise<Movie[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    if (data.movies) return data.movies;
  } catch (e) {
    console.warn('Using local fallback for search', e);
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
  try {
    const res = await fetch(`/api/movies/${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.movie) return data.movie;
    }
  } catch (e) {
    console.warn('Using local fallback for details', e);
  }
  return FALLBACK_MOVIES.find((m) => m.id === id) || null;
}
