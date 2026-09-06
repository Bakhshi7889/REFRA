import React, { useRef, useState, useEffect } from 'react';
import { Star, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Movie } from '../types';
import { getPosterUrl, handleImageError } from '../utils/imageHelpers';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  badge?: string;
  movies: Movie[];
  onMovieClick: (movie: Movie, originRect?: DOMRect) => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  onPlayMovie?: (movie: Movie) => void;
  showDivider?: boolean;
}

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  movies,
  onMovieClick,
  watchlist,
  onToggleWatchlist,
  showDivider = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  if (movies.length === 0) return null;

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      updateScrollButtons();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [movies]);

  // PC Mouse Wheel Horizontal Scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const isVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
      const delta = isVertical ? e.deltaY : e.deltaX;

      if (Math.abs(delta) > 2) {
        const canScroll =
          (delta > 0 && el.scrollLeft < el.scrollWidth - el.clientWidth - 4) ||
          (delta < 0 && el.scrollLeft > 4);

        if (canScroll) {
          e.preventDefault();
          el.scrollLeft += delta;
          updateScrollButtons();
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Mouse Drag-to-scroll
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !scrollRef.current) return;
    isMouseDownRef.current = true;
    startXRef.current = e.pageX;
    scrollLeftStartRef.current = scrollRef.current.scrollLeft;
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !scrollRef.current) return;
    const dx = e.pageX - startXRef.current;
    if (Math.abs(dx) > 5) {
      isDraggingRef.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeftStartRef.current - dx;
    updateScrollButtons();
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    if (isDraggingRef.current) {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 80);
    }
  };

  const scrollByAmount = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const step = Math.max(container.clientWidth * 0.75, 320);
    const targetLeft =
      direction === 'left'
        ? Math.max(0, container.scrollLeft - step)
        : Math.min(container.scrollWidth - container.clientWidth, container.scrollLeft + step);

    container.scrollTo({
      left: targetLeft,
      behavior: 'smooth',
    });

    setTimeout(updateScrollButtons, 150);
    setTimeout(updateScrollButtons, 350);
    setTimeout(updateScrollButtons, 600);
  };

  return (
    <section className="w-full px-4 pt-4 pb-2 relative group/section" aria-label={title}>
      {/* Subtle Section Divider */}
      {showDivider && (
        <div className="w-full h-px bg-white/[0.06] mb-3.5" />
      )}

      {/* Row Header */}
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
          {title}
        </h3>
        
        {/* Desktop Quick Nav Buttons */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity duration-200">
          <button
            type="button"
            disabled={!canScrollLeft}
            onClick={() => scrollByAmount('left')}
            className="p-1.5 rounded-full liquid-glass hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canScrollRight}
            onClick={() => scrollByAmount('right')}
            className="p-1.5 rounded-full liquid-glass hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Carousel Container with Floating Edge Navigation Buttons */}
      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByAmount('left')}
            aria-label="Scroll left"
            className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full liquid-glass text-white shadow-2xl hover:bg-white/25 active:scale-95 transition-all cursor-pointer items-center justify-center border border-white/10 opacity-0 group-hover/section:opacity-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByAmount('right')}
            aria-label="Scroll right"
            className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full liquid-glass text-white shadow-2xl hover:bg-white/25 active:scale-95 transition-all cursor-pointer items-center justify-center border border-white/10 opacity-0 group-hover/section:opacity-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Posters Carousel with Drag-to-Scroll and Touch Support */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onScroll={updateScrollButtons}
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 snap-x select-none cursor-grab active:cursor-grabbing scroll-smooth-touch"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
        >
        {movies.map((movie) => {
          const isSaved = watchlist.includes(movie.id);

          return (
            <motion.div
              key={movie.id}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              onClick={(e) => {
                if (isDraggingRef.current) return;
                onMovieClick(movie, e.currentTarget.getBoundingClientRect());
              }}
              className="flex-shrink-0 w-36 sm:w-44 aspect-[2/3] bg-[#14161d] rounded-2xl overflow-hidden shadow-lg snap-start cursor-pointer relative group"
            >
              {/* Full Poster Image */}
              <img
                src={getPosterUrl(movie.posterUrl, 'w500', movie.backdropUrl)}
                alt={movie.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                draggable={false}
                onError={(e) => handleImageError(e, false)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
              />

              {/* Seamless Canvas Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0d10]/95 via-[#0c0d10]/60 to-transparent pointer-events-none" />

              {/* Top Bookmark Action Pill */}
              <motion.button
                whileTap={{ scale: 0.82 }}
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

              {/* Text Directly On Canvas */}
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
      </div>
    </section>
  );
};
