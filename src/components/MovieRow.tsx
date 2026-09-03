import React from 'react';
import { Star, Plus, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Movie } from '../types';
import { getPosterUrl } from '../utils/imageHelpers';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  badge?: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  onPlayMovie?: (movie: Movie) => void;
  showDivider?: boolean;
}

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  subtitle,
  badge,
  movies,
  onMovieClick,
  watchlist,
  onToggleWatchlist,
  showDivider = true,
}) => {
  if (movies.length === 0) return null;

  return (
    <section className="w-full px-4 pt-4 pb-2" aria-label={title}>
      {/* Subtle Section Divider */}
      {showDivider && (
        <div className="w-full h-px bg-white/[0.06] mb-3.5" />
      )}

      {/* Row Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            {title}
          </h3>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-white/10 text-white border border-white/10 tracking-tight">
              {badge}
            </span>
          )}
        </div>
        <span className="text-[10px] text-neutral-500 font-medium">
          {subtitle || `${movies.length} films`}
        </span>
      </div>

      {/* Posters Snap Carousel */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 snap-x">
        {movies.map((movie) => {
          const isSaved = watchlist.includes(movie.id);

          return (
            <motion.div
              key={movie.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onMovieClick(movie)}
              className="flex-shrink-0 w-36 sm:w-44 aspect-[2/3] bg-[#14161d] rounded-2xl overflow-hidden shadow-lg snap-start cursor-pointer relative group"
            >
              {/* Full Poster Image */}
              <img
                src={getPosterUrl(movie.posterUrl, 'w500', movie.backdropUrl)}
                alt={movie.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
              />

              {/* Seamless Canvas Gradient Overlay (Directly on canvas) */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0d10]/95 via-[#0c0d10]/60 to-transparent pointer-events-none" />

              {/* Top Bookmark Action Pill */}
              <motion.button
                whileTap={{ scale: 0.8 }}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleWatchlist(movie.id);
                }}
                className={`absolute top-2 right-2 p-1.5 rounded-full shadow-md transition-colors z-10 ${
                  isSaved
                    ? 'bg-neutral-200 text-neutral-950'
                    : 'liquid-glass text-white hover:bg-white/20'
                }`}
                aria-label={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                <motion.div
                  key={isSaved ? 'saved' : 'unsaved'}
                  initial={{ scale: 0.6, rotate: isSaved ? -20 : 20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  {isSaved ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                </motion.div>
              </motion.button>

              {/* ALL TEXT DIRECTLY ON CANVAS (NO SEPARATE NESTED BLACK BOX, NO QUALITY TAG) */}
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
    </section>
  );
};
