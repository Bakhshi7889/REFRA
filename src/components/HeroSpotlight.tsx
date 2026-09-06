import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Plus, Check, Info, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Movie } from '../types';
import { getPosterUrl, getBackdropUrl, handleImageError } from '../utils/imageHelpers';

interface HeroSpotlightProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  onOpenDetails: (movie: Movie, origin?: DOMRect) => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  isActive?: boolean;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  movies,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
  isActive = true,
}) => {
  const spotlightMovies = useMemo(
    () => movies.filter((m) => m.spotlight || m.featured).slice(0, 6),
    [movies]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeBackdropIdx, setActiveBackdropIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastWheelTimeRef = useRef(0);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeMovie = spotlightMovies[currentIndex] || movies[0];
  const isSaved = watchlist.includes(activeMovie?.id);

  // Responsive images: portrait for mobile (2:3), landscape for PC/desktop (16:9)
  const portraitImages = useMemo(() => {
    return (activeMovie?.posters && activeMovie.posters.length > 0)
      ? activeMovie.posters.map((p) => getPosterUrl(p, 'w780', activeMovie.backdropUrl))
      : [getPosterUrl(activeMovie?.posterUrl, 'w780', activeMovie?.backdropUrl)].filter(Boolean);
  }, [activeMovie]);

  const landscapeImages = useMemo(() => {
    return [
      activeMovie?.backdropUrl,
      ...(activeMovie?.backdrops || []),
      ...(activeMovie?.fanart || []),
    ]
      .filter(Boolean)
      .map((b) => getBackdropUrl(b, 'w1280', activeMovie?.posterUrl));
  }, [activeMovie]);

  const activeImageList = isMobile ? portraitImages : landscapeImages;
  const currentImageUrl =
    activeImageList[activeBackdropIdx % (activeImageList.length || 1)] ||
    (isMobile
      ? getPosterUrl(activeMovie?.posterUrl, 'w780', activeMovie?.backdropUrl)
      : getBackdropUrl(activeMovie?.backdropUrl, 'w1280', activeMovie?.posterUrl));

  // 1. Cycle through artwork every 5 seconds (only when active and tab is visible)
  useEffect(() => {
    if (!isActive || activeImageList.length <= 1) return;
    const artTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      setActiveBackdropIdx((prev) => (prev + 1) % activeImageList.length);
    }, 5000);

    return () => clearInterval(artTimer);
  }, [isActive, activeMovie?.id, activeImageList.length]);

  const handleNext = () => {
    if (spotlightMovies.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % spotlightMovies.length);
    setActiveBackdropIdx(0);
  };

  const handlePrev = () => {
    if (spotlightMovies.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + spotlightMovies.length) % spotlightMovies.length);
    setActiveBackdropIdx(0);
  };

  // 2. Switch to different movie every 15 seconds (only when active and tab is visible)
  useEffect(() => {
    if (!isActive || spotlightMovies.length <= 1) return;
    const movieTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      handleNext();
    }, 15000);

    return () => clearInterval(movieTimer);
  }, [isActive, spotlightMovies.length, currentIndex]);

  // PC Mouse Wheel Scrolling for Hero Spotlight
  useEffect(() => {
    const el = containerRef.current;
    if (!el || spotlightMovies.length <= 1) return;

    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) > 15) {
        const now = Date.now();
        if (now - lastWheelTimeRef.current < 400) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        lastWheelTimeRef.current = now;
        if (delta > 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [spotlightMovies.length]);

  // Handle Swipe Gesture
  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 40;
    if (info.offset.x < -swipeThreshold) {
      handleNext();
    } else if (info.offset.x > swipeThreshold) {
      handlePrev();
    }
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  if (!activeMovie) return null;

  return (
    <section className="relative w-full px-3 pt-2 pb-2 select-none">
      {/* Edge-to-edge Cinematic Container with Gesture Dragging (Portrait on mobile, widescreen on PC) */}
      <motion.div
        ref={containerRef}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        dragMomentum={false}
        style={{ touchAction: 'pan-y' }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          if (isDraggingRef.current) return;
          const target = e.target as HTMLElement;
          if (target.closest('button')) return;
          if (containerRef.current) {
            onOpenDetails(activeMovie, containerRef.current.getBoundingClientRect());
          } else {
            onOpenDetails(activeMovie);
          }
        }}
        className="relative w-full rounded-3xl overflow-hidden bg-[#13151b] aspect-[3.5/5] sm:aspect-[16/9] shadow-2xl cursor-pointer group"
      >
        {/* Visual Crossfade (Portrait on mobile, Landscape on PC) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeMovie.id}-${isMobile ? 'mob' : 'pc'}-${activeBackdropIdx}`}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <img
              src={currentImageUrl}
              alt={activeMovie.title}
              referrerPolicy="no-referrer"
              onError={(e) => handleImageError(e, !isMobile)}
              className="w-full h-full object-cover object-center pointer-events-none"
            />
          </motion.div>
        </AnimatePresence>

        {/* Seamless Canvas Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/45 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/75 to-transparent pointer-events-none" />

        {/* Desktop Next and Back Navigation Buttons */}
        {spotlightMovies.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous movie"
              className="hidden sm:flex absolute left-3.5 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full liquid-glass text-white/90 hover:text-white hover:bg-white/20 shadow-2xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95 cursor-pointer items-center justify-center border border-white/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next movie"
              className="hidden sm:flex absolute right-3.5 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full liquid-glass text-white/90 hover:text-white hover:bg-white/20 shadow-2xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95 cursor-pointer items-center justify-center border border-white/10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Top Controls: Artwork Switcher without surrounding lines */}
        {activeImageList.length > 1 && (
          <div className="absolute top-3 right-3 pointer-events-auto z-20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBackdropIdx((prev) => (prev + 1) % activeImageList.length);
              }}
              className="liquid-glass px-2.5 py-1 rounded-full text-[10px] font-medium text-neutral-300 hover:text-white shadow-lg flex items-center gap-1.5 transition-colors"
              title="Click to cycle artwork"
            >
              <ImageIcon className="w-3 h-3 text-neutral-300" />
              <span>Art {(activeBackdropIdx % activeImageList.length) + 1}/{activeImageList.length}</span>
            </button>
          </div>
        )}

        {/* ALL TEXT & CONTROLS DIRECTLY ON THE CANVAS (NO SEPARATE BLACK BOX) */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-10 z-20 flex flex-col gap-2.5 pointer-events-auto">
          {/* Movie Title directly on canvas */}
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight drop-shadow-md truncate">
            {activeMovie.title}
          </h2>

          {/* Action Buttons directly on canvas */}
          <div className="flex items-center gap-2 pt-1">
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              type="button"
              onClick={() => onPlay(activeMovie)}
              className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-xl transition-colors min-h-[44px] cursor-pointer"
            >
              <motion.div
                whileHover={{ scale: 1.15, x: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Play className="w-4 h-4 fill-neutral-950" />
              </motion.div>
              <span>Play</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => onToggleWatchlist(activeMovie.id)}
              className={`p-3 rounded-2xl flex items-center justify-center transition-all min-h-[44px] min-w-[44px] shadow-lg cursor-pointer ${
                isSaved
                  ? 'bg-neutral-200 text-neutral-950'
                  : 'liquid-glass hover:bg-white/20 text-white'
              }`}
              aria-label={isSaved ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <motion.div
                key={isSaved ? 'saved' : 'unsaved'}
                initial={{ scale: 0.6, rotate: isSaved ? -25 : 25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 450, damping: 22 }}
              >
                {isSaved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </motion.div>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(activeMovie, e.currentTarget.getBoundingClientRect());
              }}
              className="p-3 rounded-2xl liquid-glass hover:bg-white/20 text-white flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] shadow-lg cursor-pointer relative overflow-hidden"
              aria-label="View Movie Details"
            >
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Info className="w-4 h-4" />
              </motion.div>
            </motion.button>
          </div>

          {/* Carousel Pagination Dots ("just show dots") */}
          <div className="flex items-center justify-center gap-2 mt-1">
            {spotlightMovies.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                  setActiveBackdropIdx(0);
                }}
                className="p-1 cursor-pointer"
                aria-label={`Go to slide ${idx + 1}`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? 'bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.85)]'
                      : 'bg-white/30 hover:bg-white/60'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};
