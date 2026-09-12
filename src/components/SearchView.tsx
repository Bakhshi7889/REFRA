import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Loader2,
  Star,
  Check,
  Plus,
  Filter,
  Tv,
  Film,
  LayoutGrid,
  Calendar,
  X,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie } from '../types';
import { getPosterUrl, toWebpUrl, handleImageError } from '../utils/imageHelpers';
import { fetchWatchProviders, discoverMoviesWithFilters, WatchProvider } from '../services/movieApi';
import { getCachedWatchProviders } from '../services/movieCache';
import { getUserRegion } from '../services/regionStore';

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
];

const ERA_PRESETS = [
  { label: '2020s (Recent)', from: 2020, to: 2026 },
  { label: '2010s', from: 2010, to: 2019 },
  { label: '2000s', from: 2000, to: 2009 },
  { label: '90s Era', from: 1990, to: 1999 },
  { label: '80s Era', from: 1980, to: 1989 },
];

const BEFORE_PRESETS = [
  { label: 'Before 2020', year: 2020 },
  { label: 'Before 2015', year: 2015 },
  { label: 'Before 2010', year: 2010 },
  { label: 'Before 2000', year: 2000 },
  { label: 'Before 1990 (Classics)', year: 1990 },
];

const LANGUAGES = [
  { code: 'all', name: 'All Languages' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi (Bollywood)' },
  { code: 'ta', name: 'Tamil (Kollywood)' },
  { code: 'te', name: 'Telugu (Tollywood)' },
  { code: 'ml', name: 'Malayalam (Mollywood)' },
  { code: 'kn', name: 'Kannada (Sandalwood)' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
];

const RATINGS = [
  { value: 0, label: 'Any Score' },
  { value: 6.0, label: '6.0+ ★' },
  { value: 7.0, label: '7.0+ ★' },
  { value: 7.5, label: '7.5+ ★' },
  { value: 8.0, label: '8.0+ ★ Top Tier' },
];

const SORTS = [
  { id: 'popularity.desc', label: 'Most Popular' },
  { id: 'vote_average.desc', label: 'Highest Rated' },
  { id: 'primary_release_date.desc', label: 'Newest First' },
  { id: 'primary_release_date.asc', label: 'Oldest First' },
];

type Props = {
  watchlist: string[];
  onToggleWatchlist: (id: string) => void;
  onMovieClick: (movie: Movie, origin?: DOMRect) => void;
  initialQuery?: string;
  onThemeColorChange?: (color: string | null) => void;
};

export function SearchView({
  watchlist,
  onToggleWatchlist,
  onMovieClick,
  initialQuery = '',
  onThemeColorChange,
}: Props) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [providers, setProviders] = useState<WatchProvider[]>(() => {
    const reg = getUserRegion() || 'US';
    const cached = getCachedWatchProviders(reg);
    return cached && cached.length > 0 ? cached.slice(0, 16) : [];
  });
  const [selectedProvider, setSelectedProvider] = useState<WatchProvider | null>(null);

  // Filter states
  const [mediaType, setMediaType] = useState<'movie' | 'tv' | 'all'>('all');
  const [selectedGenre, setSelectedGenre] = useState<number | undefined>();
  const [timingMode, setTimingMode] = useState<'all' | 'between' | 'before' | 'exact'>('all');
  const [yearFrom, setYearFrom] = useState<number>(2015);
  const [yearTo, setYearTo] = useState<number>(2024);
  const [yearBefore, setYearBefore] = useState<number>(2010);
  const [exactYear, setExactYear] = useState<number>(2024);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('popularity.desc');
  const [showFilters, setShowFilters] = useState(false);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedGenre !== undefined) count++;
    if (timingMode !== 'all') count++;
    if (minRating > 0) count++;
    if (selectedLanguage !== 'all') count++;
    if (selectedSort !== 'popularity.desc') count++;
    return count;
  }, [selectedGenre, timingMode, minRating, selectedLanguage, selectedSort]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedGenre(undefined);
    setTimingMode('all');
    setMinRating(0);
    setSelectedLanguage('all');
    setSelectedSort('popularity.desc');
  };

  // Load streaming providers on mount and region updates
  useEffect(() => {
    let isCurrent = true;

    const loadProviders = () => {
      const userReg = getUserRegion() || 'US';
      Promise.all([fetchWatchProviders(userReg), fetchWatchProviders('US')]).then(
        ([regData, usData]) => {
          if (!isCurrent) return;
          const combined = [...regData, ...usData];
          const unique = Array.from(
            new Map(combined.map((p) => [p.provider_id, p])).values()
          );
          const allowedOrder =
            userReg === 'IN'
              ? [
                  122, 2336, // JioHotstar / Hotstar
                  119, 9, // Prime Video
                  8, // Netflix
                  220, // JioCinema
                  237, // SonyLiv
                  232, // Zee5
                  337, // Disney+
                  350, // Apple TV
                  283, // Crunchyroll
                  192, // YouTube
                  11, // MUBI
                ]
              : [
                  8, // Netflix
                  119, 9, // Prime
                  337, // Disney+
                  350, // Apple TV
                  2336, 122, // Hotstar/JioHotstar
                  237, // SonyLiv
                  232, // Zee5
                  220, // JioCinema
                  15, // Hulu
                  384, 1825, // HBO Max
                  386, // Peacock
                  2303, // Paramount
                  283, // Crunchyroll
                  11, // MUBI
                  192, // YouTube
                ];

          const providerMap = new Map(unique.map((p) => [p.provider_id, p]));
          const topProviders: WatchProvider[] = [];
          for (const id of allowedOrder) {
            const found = providerMap.get(id);
            if (found && !topProviders.some((p) => p.provider_id === found.provider_id)) {
              topProviders.push(found);
            }
          }
          for (const p of unique) {
            if (!topProviders.some((tp) => tp.provider_id === p.provider_id)) {
              topProviders.push(p);
            }
          }
          const nextProviders = topProviders.slice(0, 16);
          setProviders((prev) => {
            if (
              prev.length === nextProviders.length &&
              prev.every((p, idx) => p.provider_id === nextProviders[idx]?.provider_id)
            ) {
              return prev;
            }
            return nextProviders;
          });
        }
      );
    };

    loadProviders();
    const handleRegionChange = () => {
      loadProviders();
    };

    window.addEventListener('refra_region_changed', handleRegionChange);
    return () => {
      isCurrent = false;
      window.removeEventListener('refra_region_changed', handleRegionChange);
    };
  }, []);

  // Fetch results when query, provider, type, or filters change
  useEffect(() => {
    let isMounted = true;
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const hasTiming = timingMode !== 'all';
        if (
          !searchQuery.trim() &&
          !selectedProvider &&
          !selectedGenre &&
          !hasTiming &&
          minRating === 0 &&
          selectedLanguage === 'all'
        ) {
          if (isMounted) {
            setSearchResults([]);
            setIsSearching(false);
          }
          return;
        }

        const filterPayload: any = {
          query: searchQuery.trim() || undefined,
          providerId: selectedProvider?.provider_id,
          genreId: selectedGenre,
          sort: selectedSort,
          minRating: minRating > 0 ? minRating : undefined,
          language: selectedLanguage !== 'all' ? selectedLanguage : undefined,
        };

        if (timingMode === 'between') {
          filterPayload.yearFrom = Math.min(yearFrom, yearTo);
          filterPayload.yearTo = Math.max(yearFrom, yearTo);
        } else if (timingMode === 'before') {
          filterPayload.yearBefore = yearBefore;
        } else if (timingMode === 'exact') {
          filterPayload.year = String(exactYear);
        }

        const results = await discoverMoviesWithFilters(mediaType, filterPayload);

        if (isMounted) {
          setSearchResults(results);
          setIsSearching(false);
        }
      } catch {
        if (isMounted) setIsSearching(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [
    searchQuery,
    selectedProvider,
    mediaType,
    selectedGenre,
    timingMode,
    yearFrom,
    yearTo,
    yearBefore,
    exactYear,
    minRating,
    selectedLanguage,
    selectedSort,
  ]);

  // Handle provider selection
  const handleProviderSelect = (provider: WatchProvider) => {
    if (selectedProvider?.provider_id === provider.provider_id) {
      setSelectedProvider(null);
      onThemeColorChange?.(null);
    } else {
      setSelectedProvider(provider);
      let color: string | null = null;
      switch (provider.provider_id) {
        case 8:
          color = '#e50914';
          break; // Netflix
        case 9:
        case 119:
          color = '#00a8e1';
          break; // Prime
        case 122:
        case 2336:
          color = '#032049';
          break; // Hotstar
        case 237:
          color = '#ff0000';
          break; // SonyLiv
        case 220:
          color = '#e814a6';
          break; // JioCinema
        case 337:
          color = '#113ccf';
          break; // Disney+
        case 232:
          color = '#8224e3';
          break; // Zee5
        case 15:
          color = '#1ce783';
          break; // Hulu
        case 384:
        case 1825:
          color = '#5a05b5';
          break; // HBO Max
        case 2303:
          color = '#0064ff';
          break; // Paramount
        case 283:
          color = '#f47521';
          break; // Crunchyroll
        case 192:
          color = '#ff0000';
          break; // YouTube
        default:
          color = '#2563eb';
          break;
      }
      onThemeColorChange?.(color);
    }
  };

  return (
    <div className="px-4 py-3 space-y-5">
      {/* Search Input Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 bg-[#14161f]/80 backdrop-blur-md rounded-full px-4 py-3 border border-white/10 shadow-lg relative z-10">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder={
              selectedProvider
                ? `Search inside ${selectedProvider.provider_name}...`
                : 'Search titles, actors, directors...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-neutral-400 hover:text-white transition-colors"
              title="Clear search"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-1.5 rounded-full transition-colors duration-150 ${
              showFilters || activeFilterCount > 0
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
            title="Discovery Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black text-[9px] font-bold rounded-full flex items-center justify-center shadow">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active Filter Badges Bar */}
        {(activeFilterCount > 0 || selectedProvider) && (
          <div className="flex items-center flex-wrap gap-1.5 px-1 text-xs">
            {selectedProvider && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white font-medium border border-white/10">
                {selectedProvider.provider_name}
                <button
                  onClick={() => {
                    setSelectedProvider(null);
                    onThemeColorChange?.(null);
                  }}
                  className="hover:text-amber-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedGenre !== undefined && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white font-medium border border-white/10">
                {GENRES.find((g) => g.id === selectedGenre)?.name}
                <button
                  onClick={() => setSelectedGenre(undefined)}
                  className="hover:text-amber-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {timingMode === 'between' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white font-medium border border-white/10">
                {Math.min(yearFrom, yearTo)} – {Math.max(yearFrom, yearTo)}
                <button
                  onClick={() => setTimingMode('all')}
                  className="hover:text-amber-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {timingMode === 'before' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white font-medium border border-white/10">
                Before {yearBefore}
                <button
                  onClick={() => setTimingMode('all')}
                  className="hover:text-amber-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {timingMode === 'exact' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white font-medium border border-white/10">
                Year: {exactYear}
                <button
                  onClick={() => setTimingMode('all')}
                  className="hover:text-amber-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {minRating > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white font-medium border border-white/10">
                ★ {minRating}+
                <button onClick={() => setMinRating(0)} className="hover:text-amber-400 ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedLanguage !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white font-medium border border-white/10">
                {LANGUAGES.find((l) => l.code === selectedLanguage)?.name}
                <button
                  onClick={() => setSelectedLanguage('all')}
                  className="hover:text-amber-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSort !== 'popularity.desc' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white font-medium border border-white/10">
                {SORTS.find((s) => s.id === selectedSort)?.label}
                <button
                  onClick={() => setSelectedSort('popularity.desc')}
                  className="hover:text-amber-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-neutral-400 hover:text-white underline decoration-white/30 ml-auto py-0.5"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Enhanced Discovery Filters Drawer */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden space-y-4 pt-2 pb-3 px-3.5 rounded-2xl bg-[#12141c]/90 backdrop-blur-xl border border-white/10 shadow-2xl"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-neutral-300" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                    TMDB Filter Studio
                  </span>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* 1. Release Timing: Between, Before, Exact */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    Release Timing
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      onClick={() => setTimingMode('all')}
                      className={`px-2 py-0.5 rounded-full transition-colors duration-150 ${
                        timingMode === 'all'
                          ? 'bg-white text-black font-semibold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      All Time
                    </button>
                    <button
                      onClick={() => setTimingMode('between')}
                      className={`px-2 py-0.5 rounded-full transition-colors duration-150 ${
                        timingMode === 'between'
                          ? 'bg-white text-black font-semibold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Between
                    </button>
                    <button
                      onClick={() => setTimingMode('before')}
                      className={`px-2 py-0.5 rounded-full transition-colors duration-150 ${
                        timingMode === 'before'
                          ? 'bg-white text-black font-semibold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Before
                    </button>
                    <button
                      onClick={() => setTimingMode('exact')}
                      className={`px-2 py-0.5 rounded-full transition-colors duration-150 ${
                        timingMode === 'exact'
                          ? 'bg-white text-black font-semibold'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Exact Year
                    </button>
                  </div>
                </div>

                {/* Sub-controls based on timing mode */}
                {timingMode === 'between' && (
                  <div className="space-y-2 p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-neutral-400 text-[11px]">From:</span>
                        <select
                          value={yearFrom}
                          onChange={(e) => setYearFrom(Number(e.target.value))}
                          className="bg-white/10 text-white rounded-lg px-2.5 py-1 text-xs border border-white/10 focus:outline-none w-full"
                        >
                          {Array.from({ length: 45 }, (_, i) => 2026 - i).map((y) => (
                            <option key={y} value={y} className="bg-[#181a24] text-white">
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <div className="flex-1 flex items-center gap-1.5">
                        <span className="text-neutral-400 text-[11px]">To:</span>
                        <select
                          value={yearTo}
                          onChange={(e) => setYearTo(Number(e.target.value))}
                          className="bg-white/10 text-white rounded-lg px-2.5 py-1 text-xs border border-white/10 focus:outline-none w-full"
                        >
                          {Array.from({ length: 45 }, (_, i) => 2026 - i).map((y) => (
                            <option key={y} value={y} className="bg-[#181a24] text-white">
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Quick Era Presets */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ERA_PRESETS.map((preset) => {
                        const isPresetActive = yearFrom === preset.from && yearTo === preset.to;
                        return (
                          <button
                            key={preset.label}
                            onClick={() => {
                              setYearFrom(preset.from);
                              setYearTo(preset.to);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] transition-colors duration-150 ${
                              isPresetActive
                                ? 'bg-white text-black font-semibold'
                                : 'bg-white/5 text-neutral-300 hover:bg-white/15'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {timingMode === 'before' && (
                  <div className="space-y-2 p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-neutral-400 text-[11px]">Released before:</span>
                      <select
                        value={yearBefore}
                        onChange={(e) => setYearBefore(Number(e.target.value))}
                        className="bg-white/10 text-white rounded-lg px-3 py-1 text-xs border border-white/10 focus:outline-none"
                      >
                        {Array.from({ length: 45 }, (_, i) => 2025 - i).map((y) => (
                          <option key={y} value={y} className="bg-[#181a24] text-white">
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {BEFORE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setYearBefore(preset.year)}
                          className={`px-2.5 py-1 rounded-full text-[11px] transition-colors duration-150 ${
                            yearBefore === preset.year
                              ? 'bg-white text-black font-semibold'
                              : 'bg-white/5 text-neutral-300 hover:bg-white/15'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {timingMode === 'exact' && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: 12 }, (_, i) => 2026 - i).map((y) => (
                        <button
                          key={y}
                          onClick={() => setExactYear(y)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                            exactYear === y
                              ? 'bg-white text-black font-semibold'
                              : 'bg-white/5 text-neutral-300 hover:bg-white/15'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Rating Filter */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Minimum Rating
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setMinRating(r.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                        minRating === r.value
                          ? 'bg-white text-black font-semibold shadow'
                          : 'bg-white/5 text-neutral-300 hover:bg-white/15'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Language Filter */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-neutral-400" />
                  Original Language
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setSelectedLanguage(l.code)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                        selectedLanguage === l.code
                          ? 'bg-white text-black font-semibold shadow'
                          : 'bg-white/5 text-neutral-300 hover:bg-white/15'
                      }`}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Genres */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                  Genres
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {GENRES.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenre(selectedGenre === g.id ? undefined : g.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                        selectedGenre === g.id
                          ? 'bg-white text-black font-semibold shadow'
                          : 'bg-white/5 text-neutral-300 hover:bg-white/15'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Sort By */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-neutral-300">Sort By</span>
                <div className="flex flex-wrap gap-1.5">
                  {SORTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSort(s.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                        selectedSort === s.id
                          ? 'bg-white text-black font-semibold shadow'
                          : 'bg-white/5 text-neutral-300 hover:bg-white/15'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Media Type Tabs: Both, Movies, Series */}
      {/* Target of CSS selector 1: div > div > button:nth-of-type(3) */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMediaType('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors duration-150 ${
              mediaType === 'all'
                ? 'bg-white text-black font-semibold shadow-md'
                : 'bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white backdrop-blur-md'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Both
          </button>
          <button
            onClick={() => setMediaType('movie')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors duration-150 ${
              mediaType === 'movie'
                ? 'bg-white text-black font-semibold shadow-md'
                : 'bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white backdrop-blur-md'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Movies
          </button>
          <button
            onClick={() => setMediaType('tv')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors duration-150 ${
              mediaType === 'tv'
                ? 'bg-white text-black font-semibold shadow-md'
                : 'bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white backdrop-blur-md'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            Series
          </button>
        </div>
      </div>

      {/* Watch Providers Carousel */}
      {providers.length > 0 && (
        <div className="py-2 overflow-x-auto hide-scrollbar -mx-4 px-4 flex gap-3.5 items-center">
          {providers.map((p) => {
            const isSelected = selectedProvider?.provider_id === p.provider_id;
            return (
              <button
                key={p.provider_id}
                onClick={() => handleProviderSelect(p)}
                style={{ willChange: 'transform' }}
                className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border transition-transform duration-200 shadow-md ${
                  isSelected
                    ? 'ring-2 ring-white border-white scale-105 z-10'
                    : 'border-white/20 bg-black/40 hover:scale-105 active:scale-95'
                }`}
                title={p.provider_name}
              >
                <img
                  src={toWebpUrl(p.logo_path, 150)}
                  alt={p.provider_name}
                  className="w-full h-full object-cover rounded-2xl"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center backdrop-blur-[1px]">
                    <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Popular Searches when completely empty */}
      {!searchQuery && !selectedProvider && activeFilterCount === 0 && (
        <div className="space-y-3 pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 text-center drop-shadow-sm">
            Popular Searches
          </h4>
          <div className="flex flex-wrap justify-center gap-2">
            {['Dune', 'Oppenheimer', 'Shōgun', 'Interstellar', 'The Batman', 'Sci-Fi'].map(
              (term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchQuery(term)}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-black/45 backdrop-blur-md text-neutral-200 hover:bg-white/20 hover:text-white transition-colors duration-150 border border-white/15 shadow-sm active:scale-95"
                >
                  {term}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Live search / Discovery results */}
      {(searchQuery || selectedProvider || activeFilterCount > 0) && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>
              {searchQuery
                ? `Results for "${searchQuery}"`
                : selectedProvider
                ? `Available on ${selectedProvider.provider_name}`
                : 'Filtered titles'}
            </span>
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
            ) : (
              <span>{searchResults.length} found</span>
            )}
          </div>

          {searchResults.length === 0 && !isSearching ? (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <Filter className="w-6 h-6 text-neutral-500" />
              </div>
              <p className="text-sm text-neutral-400">
                No titles found matching your criteria.
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-amber-400 hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" style={{ contain: 'layout paint' }}>
              <AnimatePresence>
                {searchResults.map((movie, index) => {
                  const isSaved = watchlist.includes(movie.id);
                  return (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
                      whileTap={{ scale: 0.96 }}
                      onClick={(e) => onMovieClick(movie, e.currentTarget.getBoundingClientRect())}
                      style={{ willChange: 'transform' }}
                      className="media-card-item aspect-[2/3] rounded-2xl overflow-hidden bg-[#14161e] relative group cursor-pointer shadow-lg gpu-layer"
                    >
                      <img
                        src={getPosterUrl(movie.posterUrl, 'w500', movie.backdropUrl)}
                        alt={movie.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => handleImageError(e, false)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                      />

                      {/* Canvas gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/40 to-transparent pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0d10]/95 via-[#0c0d10]/60 to-transparent pointer-events-none" />

                      {/* Top bookmark button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWatchlist(movie.id);
                        }}
                        className="absolute top-2 right-2 p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-colors z-10"
                        aria-label={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        {isSaved ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Media type badge */}
                      {movie.mediaType && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-[9px] font-semibold uppercase tracking-wider text-neutral-300">
                          {movie.mediaType === 'tv' ? 'Series' : movie.mediaType === 'anime' ? 'Anime' : 'Movie'}
                        </div>
                      )}

                      {/* Title & Metadata */}
                      <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex flex-col gap-1 pointer-events-none">
                        <h4 className="text-xs font-semibold text-white line-clamp-2 leading-tight drop-shadow-sm">
                          {movie.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-300 mt-0.5">
                          <span className="flex items-center gap-1 font-medium text-white">
                            <Star className="w-3 h-3 fill-white text-white" />
                            {movie.score}
                          </span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-neutral-300 font-light">{movie.releaseYear}</span>
                          {movie.genres && movie.genres.length > 0 && (
                            <>
                              <span className="text-neutral-500">•</span>
                              <span className="text-neutral-300 truncate max-w-[70px]">
                                {movie.genres[0]}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
