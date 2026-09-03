import React from 'react';
import { Play, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Movie } from '../types';
import { getBackdropUrl, handleImageError } from '../utils/imageHelpers';

interface ContinueWatchingProps {
  movies: Movie[];
  onResume: (movie: Movie) => void;
  onOpenDetails: (movie: Movie) => void;
}

export const ContinueWatching: React.FC<ContinueWatchingProps> = ({
  movies,
  onResume,
  onOpenDetails,
}) => {
  const inProgressMovies = movies.filter((m) => m.progress);

  if (inProgressMovies.length === 0) return null;

  return (
    <section className="w-full px-4 py-2.5" aria-label="Continue Watching">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Continue Watching
        </h3>
      </div>

      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 snap-x">
        {inProgressMovies.map((movie) => {
          const progress = movie.progress!;
          return (
            <motion.div
              key={movie.id}
              whileTap={{ scale: 0.97 }}
              className="flex-shrink-0 w-64 sm:w-72 aspect-[16/10] bg-[#14161d] rounded-2xl overflow-hidden shadow-lg snap-start cursor-pointer relative group"
              onClick={() => onOpenDetails(movie)}
            >
              {/* Full Thumbnail */}
              <img
                src={getBackdropUrl(movie.backdropUrl, 'w1280', movie.posterUrl)}
                alt={movie.title}
                referrerPolicy="no-referrer"
                onError={(e) => handleImageError(e, true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
              />

              {/* Seamless Canvas Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0c0d10]/95 via-[#0c0d10]/60 to-transparent pointer-events-none" />

              {/* Play Button Overlay on hover/center */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume(movie);
                  }}
                  className="w-10 h-10 rounded-full bg-white/95 text-neutral-950 flex items-center justify-center shadow-xl transition-transform"
                  aria-label={`Resume ${movie.title}`}
                >
                  <Play className="w-4 h-4 fill-neutral-950 ml-0.5" />
                </motion.button>
              </div>

              {/* ALL TEXT & PROGRESS DIRECTLY ON CANVAS (NO SEPARATE NESTED BLACK BOX) */}
              <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex flex-col gap-1.5 pointer-events-none">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-white truncate drop-shadow-sm">
                    {movie.title}
                  </h4>
                  <span className="text-[10px] text-neutral-300 font-medium shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-neutral-400" />
                    {progress.timeLeft}
                  </span>
                </div>

                {/* Progress Bar directly on canvas */}
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
