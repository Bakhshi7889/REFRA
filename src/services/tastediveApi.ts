import { Movie } from '../types';

export interface TasteDiveResponse {
  basisTitle: string;
  movies: Movie[];
  source: string;
}

const memoryCache = new Map<string, { data: TasteDiveResponse; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch "Similar to" recommendations powered by TasteDive engine
 * Uses user's local history items (or watchlist / spotlight title)
 */
export async function fetchTasteDiveRecommendations(
  seedQueries: string[],
  limit: number = 20
): Promise<TasteDiveResponse> {
  const queryStr = seedQueries
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(',');

  if (!queryStr) {
    return { basisTitle: '', movies: [], source: 'empty' };
  }

  const cacheKey = `td_${queryStr.toLowerCase()}_${limit}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(
      `/api/tastedive/recommendations?query=${encodeURIComponent(queryStr)}&limit=${limit}`
    );
    if (res.ok) {
      const data: TasteDiveResponse = await res.json();
      if (data && Array.isArray(data.movies) && data.movies.length > 0) {
        memoryCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
    }
  } catch (err) {
    console.warn('TasteDive client fetch error:', err);
  }

  return { basisTitle: queryStr.split(',')[0] || '', movies: [], source: 'fallback' };
}
