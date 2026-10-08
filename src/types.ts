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

export interface MovieCastMember {
  id?: number | string;
  name: string;
  character?: string;
  profileUrl?: string;
}

export interface ProductionCompany {
  id?: number;
  name: string;
  logoUrl?: string;
  country?: string;
}

export interface ProductionTeam {
  director?: string;
  writers?: string[];
  producers?: string[];
  cinematographer?: string;
  composer?: string;
}

export interface FilmRating {
  source: string;
  value: string;
}

export interface WatchProvider {
  id?: number;
  provider_id?: number;
  provider_name?: string;
  logo_path?: string;
  name?: string;
  logoUrl?: string;
  type?: string;
}

export interface Movie {
  id: string;
  tmdbId?: number;
  imdbId?: string;
  anilistId?: number;
  malId?: number;
  title: string;
  originalTitle?: string;
  originalLanguage?: string;
  japaneseTitle?: string;
  tagline: string;
  synopsis: string;
  releaseYear: number;
  score: string; // e.g. "8.9"
  certification: string; // e.g. "PG-13" or "R"
  duration: string; // e.g. "2h 46m"
  genres: string[];
  director: string;
  writers?: string[];
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
  budget?: string | number;
  revenue?: string | number;
  boxOffice?: string;
  productionTeam?: ProductionTeam;
  productionCompaniesList?: ProductionCompany[];
  productionCountries?: string[];
  spokenLanguages?: string[];
  castDetailed?: MovieCastMember[];
  ratingsDetailed?: FilmRating[];
  awards?: string;
  watchProviders?: WatchProvider[];
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

export interface ExpansionOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
  top?: number;
  left?: number;
}

export interface StreamItem {
  id: string;
  name: string;
  title: string;
  movieName?: string;
  serverName: string;
  serverLogo?: string;
  quality: string;
  sourceType?: string;
  specs?: string;
  hdr?: string;
  codec?: string;
  audioFormat?: string;
  bitrate?: string;
  fileSize?: string;
  fileSizeBytes?: number;
  sourceHost?: string;
  url: string;
  embedUrl?: string;
  directProxyUrl?: string;
  directDownloadUrl?: string;
  rawDirectUrl?: string | null;
  magnetUrl?: string;
  torrentFileUrl?: string;
  directVideoDownloadUrl?: string;
  isUnder5Gb?: boolean;
  isBestUnder5Gb?: boolean;
  rawDescription?: string;
  badges: string[];
  languages?: string[];
  subtitles?: string[];
  subtitlesText?: string;
  scraperRepo?: string;
  isDirect?: boolean;
  adLevel?: 'none' | 'low' | 'moderate' | 'frequent' | 'high';
  hasFrequentRedirects?: boolean;
  redirectFrequency?: 'none' | 'rare' | 'frequent' | 'aggressive';
  redirectNotice?: string;
  adWarning?: string;
  isAdHeavyMirror?: boolean;
}

export interface SourceAdReport {
  id: string;
  name: string;
  serverName: string;
  domain: string;
  adLevel: 'none' | 'low' | 'moderate' | 'frequent' | 'high';
  adLabel: string;
  redirectFrequency: 'none' | 'rare' | 'frequent' | 'aggressive';
  redirectLabel: string;
  redirectDescription: string;
  redirectNotice?: string;
  isAdHeavyMirror?: boolean;
  hasFrequentRedirects?: boolean;
  adBlockRecommended: boolean;
  trustScore: number;
  category: 'direct' | 'clean_embed' | 'ad_heavy_mirror';
  notes: string;
}

export interface AddonServerConfig {
  id: string;
  name: string;
  manifestUrl: string;
  logo: string;
  description?: string;
  isDefault?: boolean;
}

