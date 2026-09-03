import React from 'react';
import { Bookmark, Star, Trash2, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Movie } from '../types';
import { getPosterUrl } from '../utils/imageHelpers';

interface WatchlistViewProps {
  watchlistMovies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onRemove: (movieId: string) => void;
  onBackToHome: () => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlistMovies,
  onMovieClick,
  onRemove,
  onBackToHome,
}) => {
  return (
    <div className="w-full px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="p-2 rounded-full liquid-glass text-neutral-300 hover:text-white"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Watchlist
            </h2>
            <p className="text-xs text-neutral-400">
              {watchlistMovies.length} {watchlistMovies.length === 1 ? 'film' : 'films'} saved
            </p>
          </div>
        </div>
      </div>

      {watchlistMovies.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full liquid-glass text-neutral-400 flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">Your watchlist is empty</h3>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Save movies to your private cinema queue from the homepage or spotlight.
          </p>
          <button
            type="button"
            onClick={onBackToHome}
            className="px-4 py-2 rounded-full bg-white text-neutral-950 text-xs font-semibold hover:bg-neutral-200 transition-colors"
          >
            Browse Movies
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {watchlistMovies.map((movie) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.96 }}
              className="aspect-[2/3] rounded-2xl overflow-hidden bg-[#14161e] relative group cursor-pointer shadow-lg"
              onClick={() => onMovieClick(movie)}
            >
              <img
                src={getPosterUrl(movie.posterUrl, 'w500', movie.backdropUrl)}
                alt={movie.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
              />

              {/* Seamless Canvas Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0d10]/95 via-[#0c0d10]/60 to-transparent pointer-events-none" />

              {/* Remove button: liquid-glass pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(movie.id);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full liquid-glass hover:bg-rose-950/80 text-white z-10 transition-colors"
                aria-label="Remove from watchlist"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300" />
              </button>

              {/* Text directly on canvas */}
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
          ))}
        </div>
      )}
    </div>
  );
};
