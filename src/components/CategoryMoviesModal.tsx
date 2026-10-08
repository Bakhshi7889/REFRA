import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  Search,
  Star,
  Plus,
  Check,
  Flame,
  Filter,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie } from '../types';
import { getPosterUrl, handleImageError } from '../utils/imageHelpers';
import { triggerHaptic } from '../utils/haptics';
import { lockScroll } from '../utils/scrollLock';

export interface CategoryModalData {
  title: string;
  subtitle?: string;
  badge?: string;
  movies: Movie[];
}

interface CategoryMoviesModalProps {
  isOpen: boolean;
  categoryData: CategoryModalData | null;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  onSelectMovie: (movie: Movie, originRect?: DOMRect) => void;
  onPlayMovie?: (movie: Movie) => void;
  onClose: () => void;
}

export const CategoryMoviesModal: React.FC<CategoryMoviesModalProps> = ({
  isOpen,
  categoryData,
  watchlist,
  onToggleWatchlist,
  onSelectMovie,
  onPlayMovie,
  onClose,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'newest'>('popularity');

  // Reset filters when a new category is opened
  useEffect(() => {
    if (isOpen) {
      setFilterQuery('');
      setSelectedGenre('All');
      setSortBy('popularity');
    }
  }, [isOpen, categoryData?.title]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const unlock = lockScroll();
      return () => unlock();
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allMovies = useMemo(() => {
    return categoryData?.movies || [];
  }, [categoryData?.movies]);

  // Extract unique genres for quick filter pills
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    allMovies.forEach((m) => {
      m.genres?.forEach((g) => set.add(g));
    });
    return ['All', ...Array.from(set).slice(0, 12)];
  }, [allMovies]);

  // Filter and sort movies (uncapped)
  const displayedMovies = useMemo(() => {
    let list = [...allMovies];

    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.cast?.some((c) => c.toLowerCase().includes(q)) ||
          m.director?.toLowerCase().includes(q) ||
          m.synopsis?.toLowerCase().includes(q)
      );
    }

    if (selectedGenre !== 'All') {
      list = list.filter((m) => m.genres?.includes(selectedGenre));
    }

    if (sortBy === 'rating') {
      list.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
    }
    // Default popularity is the raw order from TMDB discover

    return list;
  }, [allMovies, filterQuery, selectedGenre, sortBy]);

  if (!isOpen || !categoryData) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex flex-col bg-[#0a0c10]/95 backdrop-blur-2xl text-white overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={categoryData.title}
      >
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex-shrink-0 bg-[#0e1017]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            {/* Back Button & Title */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="p-2 rounded-full liquid-glass hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0"
                aria-label="Back to home"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    {categoryData.title}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-neutral-300 border border-white/10 shrink-0 flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    <span>{displayedMovies.length} Titles</span>
                  </span>
                </div>
                {categoryData.subtitle && (
                  <p className="text-[11px] text-neutral-400 truncate hidden sm:block">
                    {categoryData.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subheader Search & Controls */}
          <div className="max-w-7xl mx-auto mt-2.5 pt-2 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search within category input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={`Search in ${categoryData.title}...`}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-white/5 text-xs text-white placeholder-neutral-500 rounded-full pl-8 pr-8 py-1.5 border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
              <span className="text-[10px] text-neutral-400 flex items-center gap-1 uppercase tracking-wider font-semibold">
                <ArrowUpDown className="w-3 h-3" />
                Sort:
              </span>
              <button
                type="button"
                onClick={() => setSortBy('popularity')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                  sortBy === 'popularity'
                    ? 'bg-white text-black font-semibold shadow'
                    : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                }`}
              >
                Trending
              </button>
              <button
                type="button"
                onClick={() => setSortBy('rating')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                  sortBy === 'rating'
                    ? 'bg-white text-black font-semibold shadow'
                    : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                }`}
              >
                Top Rated
              </button>
              <button
                type="button"
                onClick={() => setSortBy('newest')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                  sortBy === 'newest'
                    ? 'bg-white text-black font-semibold shadow'
                    : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                }`}
              >
                Newest
              </button>
            </div>
          </div>

          {/* Quick Genre Chips */}
          {availableGenres.length > 2 && (
            <div className="max-w-7xl mx-auto mt-2 flex items-center gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1 select-none">
              {availableGenres.map((genre) => {
                const isSelected = selectedGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedGenre(genre);
                    }}
                    className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black font-bold shadow'
                        : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* Scrollable Movies Grid */}
        <main
          className="flex-1 overflow-y-auto px-4 py-5 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="max-w-7xl mx-auto">
            {displayedMovies.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Filter className="w-10 h-10 text-neutral-600 mx-auto" />
                <h3 className="text-sm font-semibold text-neutral-300">No movies match your filters</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Try adjusting your search query or reset your genre selection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterQuery('');
                    setSelectedGenre('All');
                  }}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 pb-20">
                {displayedMovies.map((movie, idx) => {
                  const isSaved = watchlist.includes(movie.id);

                  return (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.2) }}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={(e) => {
                        triggerHaptic('light');
                        onSelectMovie(movie, e.currentTarget.getBoundingClientRect());
                      }}
                      className="aspect-[2/3] bg-[#14161d] rounded-2xl overflow-hidden shadow-lg cursor-pointer relative group compositor-card hover:shadow-2xl hover:shadow-black/70 transition-shadow duration-300"
                    >
                      {/* Image Shimmer */}
                      <div className="absolute inset-0 bg-neutral-800/40 animate-pulse pointer-events-none" />

                      {/* Poster */}
                      <img
                        src={getPosterUrl(movie.posterUrl, 'w780', movie.backdropUrl)}
                        alt={movie.title}
                        referrerPolicy="no-referrer"
                        loading={idx < 12 ? 'eager' : 'lazy'}
                        draggable={false}
                        onError={(e) => handleImageError(e, false)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none relative z-0"
                      />

                      {/* Canvas Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/40 to-transparent pointer-events-none z-1" />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0d10]/95 via-[#0c0d10]/60 to-transparent pointer-events-none z-1" />

                      {/* Top Bookmark Action */}
                      <motion.button
                        whileTap={{ scale: 0.82 }}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('success');
                          onToggleWatchlist(movie.id);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full shadow-md transition-colors z-10 ${
                          isSaved
                            ? 'bg-neutral-200 text-neutral-950'
                            : 'liquid-glass text-white hover:bg-white/20'
                        }`}
                        aria-label={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </motion.button>

                      {/* Bottom Text */}
                      <div className="absolute inset-x-0 bottom-0 p-2.5 z-10 flex flex-col gap-0.5 pointer-events-none">
                        <h4 className="text-xs font-semibold text-white truncate leading-tight drop-shadow-sm">
                          {movie.title}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-300 mt-0.5">
                          <span className="flex items-center gap-1 font-medium text-white">
                            <Star className="w-2.5 h-2.5 fill-white text-white" />
                            {movie.score}
                          </span>
                          <span className="text-neutral-500">•</span>
                          <span className="text-neutral-300 font-light">{movie.releaseYear}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </AnimatePresence>
  );
};
