import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Plus, Check, Info, ChevronLeft, ChevronRight, Image as ImageIcon, WifiOff } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Movie } from '../types';
import { getPosterUrl, getBackdropUrl, handleImageError, getLogoUrl } from '../utils/imageHelpers';
import { isDataSaverActive } from '../services/themeStore';

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
  const isDataSaver = isDataSaverActive();
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
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [activeMovie?.id, activeMovie?.logoUrl]);

  // Responsive images: portrait for mobile (2:3), landscape for PC/desktop (16:9)
  const portraitImages = useMemo(() => {
    const targetSize = isDataSaver ? 'w185' : 'w342';
    return (activeMovie?.posters && activeMovie.posters.length > 0)
      ? activeMovie.posters.map((p) => getPosterUrl(p, targetSize, activeMovie.backdropUrl))
      : [getPosterUrl(activeMovie?.posterUrl, targetSize, activeMovie?.backdropUrl)].filter(Boolean);
  }, [activeMovie, isDataSaver]);

  const landscapeImages = useMemo(() => {
    const targetSize = isDataSaver ? 'w780' : 'w780';
    return [
      activeMovie?.backdropUrl,
      ...(activeMovie?.backdrops || []),
      ...(activeMovie?.fanart || []),
    ]
      .filter(Boolean)
      .map((b) => getBackdropUrl(b, targetSize, activeMovie?.posterUrl));
  }, [activeMovie, isDataSaver]);

  const activeImageList = isMobile ? portraitImages : landscapeImages;
  const currentImageUrl =
    activeImageList[activeBackdropIdx % (activeImageList.length || 1)] ||
    (isMobile
      ? getPosterUrl(activeMovie?.posterUrl, isDataSaver ? 'w185' : 'w342', activeMovie?.backdropUrl)
      : getBackdropUrl(activeMovie?.backdropUrl, isDataSaver ? 'w780' : 'w780', activeMovie?.posterUrl));

  // 1. Artwork cycling:
  // Strictly disabled in Data Saver mode to save bandwidth.
  // In normal mode: no auto-cycling across backdrops to prevent continuous background downloads;
  // users can manually navigate using dots or arrows.

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

  // 2. Movie auto-cycling:
  // Disabled in Data Saver mode. In normal mode, cycles calmly every 25s (paused when document is hidden)
  useEffect(() => {
    if (isDataSaver || !isActive || spotlightMovies.length <= 1) return;
    const movieTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      handleNext();
    }, 25000);

    return () => clearInterval(movieTimer);
  }, [isActive, spotlightMovies.length, currentIndex, isDataSaver]);

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
        className="relative w-full rounded-3xl overflow-hidden bg-[#0c0d10] aspect-[9/16] max-h-[82dvh] sm:max-h-none sm:aspect-[16/9] shadow-2xl cursor-pointer group"
      >
        {/* Full-Bleed Artwork Occupying the Whole Area */}
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeMovie.id}-${currentImageUrl}`}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 w-full h-full"
            >
              {/* Adaptive Ambient Blur Layer for Depth */}
              <img
                src={currentImageUrl}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50 brightness-[0.65] pointer-events-none transform-gpu"
              />

              {/* Crisp Foreground Artwork Occupying the Whole Area */}
              <img
                src={currentImageUrl}
                alt={activeMovie.title}
                referrerPolicy="no-referrer"
                onError={(e) => handleImageError(e, !isMobile)}
                className="relative z-10 w-full h-full object-cover object-center sm:object-cover sm:object-center drop-shadow-2xl"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Cinematic Vignette Gradients */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0c0d10]/75 via-[#0c0d10]/20 to-transparent pointer-events-none z-15" />
        <div className="absolute inset-x-0 bottom-0 h-52 sm:h-60 bg-gradient-to-t from-[#0c0d10] via-[#0c0d10]/80 via-45% to-transparent pointer-events-none z-15" />

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

        {/* Top Controls: Artwork Switcher */}
        {activeImageList.length > 1 && (
          <div className="absolute top-3 left-3 sm:left-auto sm:right-3 pointer-events-auto z-25">
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

        {/* All Text & Controls directly on the Canvas */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-6 z-20 flex flex-col gap-2.5 pointer-events-auto sm:px-8 sm:pb-8 sm:pt-8">
          {/* TMDB Clearlogo PNG or Title */}
          {activeMovie.logoUrl && !logoFailed ? (
            <div className="flex items-center justify-center sm:justify-start max-h-14 sm:max-h-20 py-0.5">
              <img
                key={`hero-logo-${activeMovie.id}-${activeMovie.logoUrl}`}
                src={getLogoUrl(activeMovie.logoUrl) || activeMovie.logoUrl}
                alt={activeMovie.title}
                referrerPolicy="no-referrer"
                className="max-h-11 sm:max-h-16 max-w-[80%] sm:max-w-[50%] object-contain object-center sm:object-left drop-shadow-[0_4px_18px_rgba(0,0,0,0.95)] filter brightness-105"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (activeMovie.logoUrl && activeMovie.logoUrl.includes('image.tmdb.org') && target.dataset.triedProxy !== 'true') {
                    target.dataset.triedProxy = 'true';
                    target.src = `/api/image?url=${encodeURIComponent(activeMovie.logoUrl)}`;
                  } else {
                    setLogoFailed(true);
                  }
                }}
              />
            </div>
          ) : (
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white leading-tight drop-shadow-md truncate text-center sm:text-left">
              {activeMovie.title}
            </h2>
          )}

          {/* Action Buttons directly on canvas */}
          <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
            <motion.button
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              type="button"
              onClick={() => onPlay(activeMovie)}
              className="flex-1 sm:flex-none sm:min-w-[140px] py-3 px-5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-xl transition-colors min-h-[44px] cursor-pointer"
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
              className={`p-3 rounded-2xl flex items-center justify-center transition-colors duration-200 min-h-[44px] min-w-[44px] shadow-lg cursor-pointer ${
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
