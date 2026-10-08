import { AnimeEpisode, Movie, MovieCastMember } from '../types';

export interface TvmazeShowData {
  tvmazeId: number;
  name: string;
  network?: string;
  schedule?: {
    time: string;
    days: string[];
  };
  status?: string;
  premiered?: string;
  officialSite?: string;
  rating?: string;
  summary?: string;
  episodes: AnimeEpisode[];
  cast: MovieCastMember[];
}

const tvmazeCache = new Map<string, { data: TvmazeShowData | null; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch TV show metadata and full episode lists from TVmaze
 * No API key needed, light rate limit
 */
export async function fetchTvmazeShow(title: string, imdbId?: string): Promise<TvmazeShowData | null> {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle && !imdbId) return null;

  const cacheKey = `tvm_${imdbId || cleanTitle.toLowerCase()}`;
  const cached = tvmazeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 1. Try local backend proxy
  try {
    const params = new URLSearchParams();
    if (cleanTitle) params.set('title', cleanTitle);
    if (imdbId) params.set('imdbId', imdbId);

    const res = await fetch(`/api/tvmaze/show?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.show) {
        tvmazeCache.set(cacheKey, { data: data.show, timestamp: Date.now() });
        return data.show;
      }
    }
  } catch {
    // Fall through to direct TVmaze fetch (TVmaze supports CORS)
  }

  // 2. Direct browser fetch to TVmaze
  try {
    let rawShow: any = null;
    if (imdbId && imdbId.startsWith('tt')) {
      const lookupRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`);
      if (lookupRes.ok) {
        const basic = await lookupRes.json();
        if (basic?.id) {
          const fullRes = await fetch(`https://api.tvmaze.com/shows/${basic.id}?embed[]=episodes&embed[]=cast`);
          if (fullRes.ok) rawShow = await fullRes.json();
        }
      }
    }

    if (!rawShow && cleanTitle) {
      const searchRes = await fetch(
        `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanTitle)}&embed[]=episodes&embed[]=cast`
      );
      if (searchRes.ok) {
        rawShow = await searchRes.json();
      }
    }

    if (rawShow) {
      const episodesList: AnimeEpisode[] = (rawShow._embedded?.episodes || []).map((ep: any) => ({
        id: `tvmaze_ep_${ep.id}`,
        number: ep.number || 1,
        season: ep.season || 1,
        title: ep.name || `Episode ${ep.number || 1}`,
        airDate: ep.airdate || undefined,
        duration: ep.runtime ? `${ep.runtime}m` : undefined,
        image: ep.image?.original || ep.image?.medium || undefined,
        synopsis: ep.summary ? ep.summary.replace(/<[^>]*>?/gm, '').trim() : undefined,
      }));

      const castList: MovieCastMember[] = (rawShow._embedded?.cast || []).slice(0, 10).map((c: any) => ({
        id: c.person?.id,
        name: c.person?.name || 'Cast Member',
        character: c.character?.name,
        profileUrl: c.person?.image?.medium || c.person?.image?.original,
      }));

      const showData: TvmazeShowData = {
        tvmazeId: rawShow.id,
        name: rawShow.name,
        network: rawShow.network?.name || rawShow.webChannel?.name || undefined,
        schedule: rawShow.schedule || undefined,
        status: rawShow.status,
        premiered: rawShow.premiered,
        officialSite: rawShow.officialSite,
        rating: rawShow.rating?.average ? String(rawShow.rating.average) : undefined,
        summary: rawShow.summary ? rawShow.summary.replace(/<[^>]*>?/gm, '').trim() : undefined,
        episodes: episodesList,
        cast: castList,
      };

      tvmazeCache.set(cacheKey, { data: showData, timestamp: Date.now() });
      return showData;
    }
  } catch (err) {
    console.warn('TVmaze direct fetch error:', err);
  }

  tvmazeCache.set(cacheKey, { data: null, timestamp: Date.now() });
  return null;
}

/**
 * Enriches a TV series Movie object with high-fidelity TVmaze episode lists,
 * air dates, stills, and network broadcasting info.
 */
export async function enrichMovieWithTvmaze(movie: Movie): Promise<Movie> {
  if (movie.mediaType !== 'tv' && movie.mediaType !== 'anime' && !movie.episodes) {
    return movie;
  }

  try {
    const showData = await fetchTvmazeShow(movie.title);
    if (showData) {
      const enriched = { ...movie };
      if (showData.episodes && showData.episodes.length > 0) {
        enriched.episodes = showData.episodes;
        enriched.totalEpisodes = showData.episodes.length;
      }
      if (showData.network) {
        enriched.badge = enriched.badge || showData.network;
      }
      if (showData.schedule?.time && showData.schedule?.days?.length) {
        enriched.tagline =
          enriched.tagline ||
          `Airs ${showData.schedule.days.join(', ')} at ${showData.schedule.time} on ${showData.network || 'TV'}`;
      }
      if (showData.cast && showData.cast.length > 0 && (!enriched.castDetailed || enriched.castDetailed.length === 0)) {
        enriched.castDetailed = showData.cast;
      }
      return enriched;
    }
  } catch (err) {
    console.warn('Enrich with TVmaze error:', err);
  }

  return movie;
}
