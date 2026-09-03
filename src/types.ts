export type MovieResolution = '4K HDR' | '4K UHD' | 'IMAX Enhanced' | 'HD';

export interface Review {
  id: string;
  author: string;
  authorAvatar?: string;
  score?: number | string;
  rating?: number; // e.g. 10
  date: string;
  content: string;
  tags?: string[];
  isSpoiler?: boolean;
  source: 'MyAnimeList / Jikan' | 'TMDB Cinephile' | 'Refra Community' | 'Luma Community' | 'AniList';
  recommended?: boolean;
  reactions?: {
    helpful?: number;
    love?: number;
  };
}

export interface AnimeEpisode {
  id: string;
  number: number;
  title: string;
  image?: string;
  duration?: string;
  airDate?: string;
  synopsis?: string;
}

export interface Movie {
  id: string;
  tmdbId?: number;
  imdbId?: string;
  anilistId?: number;
  malId?: number;
  title: string;
  japaneseTitle?: string;
  tagline: string;
  synopsis: string;
  releaseYear: number;
  score: string; // e.g. "8.9"
  certification: string; // e.g. "PG-13" or "R"
  duration: string; // e.g. "2h 46m"
  genres: string[];
  director: string;
  cast: string[];
  posterUrl: string;
  posters?: string[];
  backdropUrl: string;
  backdrops?: string[];
  fanart?: string[];
  logoUrl?: string;
  trailerYoutubeId?: string;
  trailerUrl?: string;
  resolution: MovieResolution;
  audioFormat: string; // e.g. "Dolby Atmos"
  featured?: boolean;
  spotlight?: boolean;
  badge?: string; // e.g. "Premiere", "Refra Select", "Trending Anime"
  mediaType?: 'movie' | 'anime' | 'tv';
  status?: string; // "RELEASING" | "FINISHED" | "NOT_YET_RELEASED"
  totalEpisodes?: number;
  episodes?: AnimeEpisode[];
  studios?: string[];
  progress?: {
    percentage: number;
    timeLeft: string;
    lastWatched: string;
  };
}

export type CategoryFilter = 
  | 'All' 
  | 'Spotlight' 
  | 'Sci-Fi' 
  | 'Neo-Noir' 
  | 'Arthouse' 
  | 'Drama' 
  | 'Thriller';

export type NavTab = 'home' | 'explore' | 'search' | 'watchlist' | 'profile';
