import React, { useRef, useState, useEffect } from 'react';
import { Star, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Movie } from '../types';
import { getPosterUrl, handleImageError, isImageLoaded, markImageLoaded } from '../utils/imageHelpers';
import { triggerHaptic } from '../utils/haptics';

interface MovieRowProps {
  title: string;
  subtitle?: string;
  badge?: string;
  movies: Movie[];
  totalCount?: number;
  onMovieClick: (movie: Movie, originRect?: DOMRect) => void;
  onHeaderClick?: () => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  onPlayMovie?: (movie: Movie) => void;
  showDivider?: boolean;
}

interface MovieCardProps {
  movie: Movie;
  idx: number;
  isSaved: boolean;
  onMovieClick: (movie: Movie, originRect?: DOMRect) => void;
  onToggleWatchlist: (movieId: string) => void;
  isDraggingRef: React.MutableRefObject<boolean>;
}

const MovieCard = React.memo<MovieCardProps>(({
  movie,
  idx,
  isSaved,
  onMovieClick,
  onToggleWatchlist,
  isDraggingRef,
}) => {
  const posterUrl = getPosterUrl(movie.posterUrl, 'w780', movie.backdropUrl);
  const [isLoaded, setIsLoaded] = useState(() => isImageLoaded(posterUrl));
  const imgRef = useRef<HTMLImageElement>(null);

  // If already decoded in browser memory or HTTP cache, immediately mark loaded
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      markImageLoaded(posterUrl);
      setIsLoaded(true);
    }
  }, [posterUrl]);

  return (
    <motion.div
      key={movie.id}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.96 }}
      onClick={(e) => {
        if (isDraggingRef.current) return;
        triggerHaptic('light');
        onMovieClick(movie, e.currentTarget.getBoundingClientRect());
      }}
      style={{ willChange: 'transform', contain: 'paint layout' }}
      className="flex-shrink-0 w-36 sm:w-44 aspect-[2/3] bg-[#14161d] rounded-2xl overflow-hidden shadow-lg snap-start cursor-pointer relative group compositor-card hover:shadow-2xl hover:shadow-black/60 transition-shadow duration-300 transform-gpu"
    >
      {/* Skeleton Loading Shimmer Placeholder - unmounted once image is loaded */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-neutral-800/50 animate-pulse pointer-events-none" />
      )}

      {/* Full Poster Image with eager loading and async decoding to stay loaded while scrolling */}
      <img
        ref={imgRef}
        src={posterUrl}
        alt={movie.title}
        referrerPolicy="no-referrer"
        loading="eager"
        decoding="async"
        fetchPriority={idx < 4 ? 'high' : 'auto'}
        draggable={false}
        onLoad={() => {
          markImageLoaded(posterUrl);
          setIsLoaded(true);
        }}
        onError={(e) => {
          handleImageError(e, false);
          setIsLoaded(true);
        }}
        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none relative z-0 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Seamless Canvas Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/40 to-transparent pointer-events-none z-1" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0d10]/95 via-[#0c0d10]/60 to-transparent pointer-events-none z-1" />

      {/* Top Bookmark Action Pill */}
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
}, (prev, next) => {
  return (
    prev.movie.id === next.movie.id &&
    prev.isSaved === next.isSaved &&
    prev.movie.posterUrl === next.movie.posterUrl &&
    prev.movie.backdropUrl === next.movie.backdropUrl &&
    prev.movie.title === next.movie.title &&
    prev.movie.score === next.movie.score
  );
});

MovieCard.displayName = 'MovieCard';


export const MovieRow: React.FC<MovieRowProps> = React.memo(({
  title,
  movies,
  totalCount,
  onMovieClick,
  onHeaderClick,
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
    const nextLeft = scrollLeft > 10;
    const nextRight = scrollLeft < scrollWidth - clientWidth - 10;
    setCanScrollLeft((prev) => (prev !== nextLeft ? nextLeft : prev));
    setCanScrollRight((prev) => (prev !== nextRight ? nextRight : prev));
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
      // Only handle intentional horizontal scrolling (trackpad deltaX or Shift+wheel)
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const delta = e.shiftKey ? e.deltaY : e.deltaX;
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
      <div className="flex items-center justify-between gap-2.5 mb-2.5 w-full">
        {onHeaderClick ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onHeaderClick();
            }}
            className="group/header flex items-center justify-between flex-1 min-w-0 gap-2 text-left cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all"
            aria-label={`View all ${title}`}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-200 group-hover/header:text-white transition-colors leading-snug truncate sm:overflow-visible sm:whitespace-normal">
              {title}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium normal-case tracking-normal px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/10 group-hover/header:bg-white/20 group-hover/header:text-white transition-all shrink-0 whitespace-nowrap select-none">
              <span className="whitespace-nowrap">View All</span>
              {typeof totalCount === 'number' && totalCount > 0 && (
                <span className="text-neutral-400 font-light whitespace-nowrap">({totalCount})</span>
              )}
              <ChevronRight className="w-3 h-3 text-neutral-400 group-hover/header:text-white group-hover/header:translate-x-0.5 transition-transform shrink-0" />
            </span>
          </button>
        ) : (
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex-1 min-w-0">
            {title}
          </h3>
        )}
        
        {/* Desktop Quick Nav Buttons */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity duration-200 shrink-0">
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
          data-lenis-prevent="true"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onScroll={updateScrollButtons}
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 snap-x select-none cursor-grab active:cursor-grabbing scroll-smooth-touch"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
        >
          {movies.map((movie, idx) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              idx={idx}
              isSaved={watchlist.includes(movie.id)}
              onMovieClick={onMovieClick}
              onToggleWatchlist={onToggleWatchlist}
              isDraggingRef={isDraggingRef}
            />
          ))}
        </div>
      </div>
    </section>
  );
});

MovieRow.displayName = 'MovieRow';

