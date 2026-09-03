import React, { useState, useEffect } from 'react';
import { Play, Plus, Check, Info, Star, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Movie } from '../types';
import { getPosterUrl, getBackdropUrl, handleImageError } from '../utils/imageHelpers';

interface HeroSpotlightProps {
  movies: Movie[];
  onPlay: (movie: Movie) => void;
  onOpenDetails: (movie: Movie) => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  movies,
  onPlay,
  onOpenDetails,
  watchlist,
  onToggleWatchlist,
}) => {
  const spotlightMovies = movies.filter((m) => m.spotlight || m.featured).slice(0, 6);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeBackdropIdx, setActiveBackdropIdx] = useState(0);
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
  const portraitImages = (activeMovie?.posters && activeMovie.posters.length > 0)
    ? activeMovie.posters.map((p) => getPosterUrl(p, 'w780', activeMovie.backdropUrl))
    : [getPosterUrl(activeMovie?.posterUrl, 'w780', activeMovie?.backdropUrl)].filter(Boolean);

  const landscapeImages = [
    activeMovie?.backdropUrl,
    ...(activeMovie?.backdrops || []),
    ...(activeMovie?.fanart || []),
  ]
    .filter(Boolean)
    .map((b) => getBackdropUrl(b, 'w1280', activeMovie?.posterUrl));

  const activeImageList = isMobile ? portraitImages : landscapeImages;
  const currentImageUrl =
    activeImageList[activeBackdropIdx % (activeImageList.length || 1)] ||
    (isMobile
      ? getPosterUrl(activeMovie?.posterUrl, 'w780', activeMovie?.backdropUrl)
      : getBackdropUrl(activeMovie?.backdropUrl, 'w1280', activeMovie?.posterUrl));

  // 1. Cycle through artwork every 5 seconds
  useEffect(() => {
    if (activeImageList.length <= 1) return;
    const artTimer = setInterval(() => {
      setActiveBackdropIdx((prev) => (prev + 1) % activeImageList.length);
    }, 5000);

    return () => clearInterval(artTimer);
  }, [activeMovie?.id, activeImageList.length]);

  // 2. Switch to different movie every 15 seconds
  useEffect(() => {
    if (spotlightMovies.length <= 1) return;
    const movieTimer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % spotlightMovies.length);
      setActiveBackdropIdx(0);
    }, 15000);

    return () => clearInterval(movieTimer);
  }, [spotlightMovies.length, currentIndex]);

  // Handle Swipe Gesture
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 40;
    if (info.offset.x < -swipeThreshold) {
      // Swiped Left -> Next Movie
      setCurrentIndex((prev) => (prev + 1) % spotlightMovies.length);
      setActiveBackdropIdx(0);
    } else if (info.offset.x > swipeThreshold) {
      // Swiped Right -> Prev Movie
      setCurrentIndex((prev) => (prev - 1 + spotlightMovies.length) % spotlightMovies.length);
      setActiveBackdropIdx(0);
    }
  };

  if (!activeMovie) return null;

  return (
    <section className="relative w-full px-3 pt-2 pb-2 select-none">
      {/* Edge-to-edge Cinematic Container with Gesture Dragging (Portrait on mobile, widescreen on PC) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="relative w-full rounded-3xl overflow-hidden bg-[#13151b] aspect-[3.5/5] sm:aspect-[16/9] shadow-2xl cursor-grab active:cursor-grabbing group"
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
          {/* Metadata Row directly on canvas */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold liquid-glass text-white shadow-sm">
              {activeMovie.releaseYear}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium liquid-glass text-neutral-300 shadow-sm">
              {activeMovie.duration}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold liquid-glass text-white flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 fill-white text-white" />
              {activeMovie.score}
            </span>
            <span className="text-xs text-neutral-300 font-light truncate drop-shadow">
              {activeMovie.genres.slice(0, 2).join(' • ')}
            </span>
          </div>

          {/* Movie Title directly on canvas */}
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight drop-shadow-md truncate">
            {activeMovie.title}
          </h2>

          {/* Action Buttons directly on canvas */}
          <div className="flex items-center gap-2 pt-1">
            <motion.button
              whileTap={{ scale: 0.94 }}
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
              whileTap={{ scale: 0.88 }}
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
              whileTap={{ scale: 0.88 }}
              type="button"
              onClick={() => onOpenDetails(activeMovie)}
              className="p-3 rounded-2xl liquid-glass hover:bg-white/20 text-white flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] shadow-lg cursor-pointer"
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

          {/* Carousel Pagination Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-1">
            {spotlightMovies.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setActiveBackdropIdx(0);
                }}
                className="p-1"
                aria-label={`Go to slide ${idx + 1}`}
              >
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? 'w-5 bg-white shadow-sm'
                      : 'w-1.5 bg-white/30 hover:bg-white/60'
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
