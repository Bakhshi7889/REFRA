import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Play,
  Plus,
  Check,
  Star,
  Share2,
  Film,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Layers,
  ArrowLeft,
  Trophy,
  Tv,
  Users,
  Download,
  Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, ExpansionOrigin } from '../types';
import { getBackdropUrl, getPosterUrl } from '../utils/imageHelpers';
import { ReviewsSection } from './ReviewsSection';
import { trackStreamStart } from '../services/analytics';
import { DownloadExpander } from './DownloadExpander';
import { ArtworkLightboxModal } from './ArtworkLightboxModal';
import { lockScroll } from '../utils/scrollLock';

interface MovieDetailsModalProps {
  movie: Movie | null;
  expansionOrigin?: ExpansionOrigin | null;
  onClose: () => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  autoPlay?: boolean;
  onPlayMovie?: (movie: Movie, episodeIndex?: number) => void;
}

interface MovieDetailsContentProps {
  movie: Movie;
  expansionOrigin?: ExpansionOrigin | null;
  onClose: () => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  autoPlay?: boolean;
  onPlayMovie?: (movie: Movie, episodeIndex?: number) => void;
}

const MovieDetailsContent: React.FC<MovieDetailsContentProps> = ({
  movie,
  expansionOrigin,
  onClose,
  watchlist,
  onToggleWatchlist,
  autoPlay = true,
  onPlayMovie,
}) => {
  // Autoplay trailer on entering info page whenever available
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(
    Boolean(movie.trailerYoutubeId)
  );
  const [activeMediaTab, setActiveMediaTab] = useState<'trailer' | 'fanart' | 'posters'>(
    movie.trailerYoutubeId ? 'trailer' : 'fanart'
  );
  const [contentTab, setContentTab] = useState<'overview' | 'reviews' | 'episodes'>('overview');
  const [selectedFanartIndex, setSelectedFanartIndex] = useState(0);
  const [selectedPosterIndex, setSelectedPosterIndex] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);
  const isSaved = watchlist.includes(movie.id);

  // Fullscreen Lightbox Modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxMode, setLightboxMode] = useState<'fanart' | 'poster'>('fanart');

  // Dedicated scrollable ref for PC mouse wheel & drag support
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Responsive dimensions tracking for fluid origin-to-screen interpolation
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure trailer auto-plays when movie or trailer ID changes
  useEffect(() => {
    if (movie.trailerYoutubeId) {
      setIsPlayingTrailer(true);
      setActiveMediaTab('trailer');
    } else {
      setIsPlayingTrailer(false);
      setActiveMediaTab('fanart');
    }
  }, [movie.id, movie.trailerYoutubeId]);

  // Lock background scroll cleanly with reference counting
  useEffect(() => {
    const unlock = lockScroll();
    return () => {
      unlock();
    };
  }, []);

  const isMobile = dimensions.width < 640;
  const targetWidth = isMobile
    ? dimensions.width
    : Math.min(dimensions.width - 48, dimensions.width >= 1024 ? 920 : 680);
  const targetHeight = isMobile
    ? dimensions.height
    : Math.min(dimensions.height - 48, 880);
  const targetLeft = isMobile ? 0 : (dimensions.width - targetWidth) / 2;
  const targetTop = isMobile ? 0 : (dimensions.height - targetHeight) / 2;
  const targetRadius = isMobile ? 0 : 28;

  // Keyboard shortcut support (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const hasOrigin = Boolean(
    expansionOrigin &&
    typeof expansionOrigin.width === 'number' &&
    expansionOrigin.width > 0 &&
    typeof expansionOrigin.height === 'number' &&
    expansionOrigin.height > 0
  );

  const originLeft = hasOrigin
    ? (expansionOrigin!.left ?? (expansionOrigin!.x - expansionOrigin!.width / 2))
    : (targetLeft + targetWidth * 0.15);

  const originTop = hasOrigin
    ? (expansionOrigin!.top ?? (expansionOrigin!.y - expansionOrigin!.height / 2))
    : (targetTop + targetHeight * 0.15);

  const originWidth = hasOrigin ? expansionOrigin!.width : (targetWidth * 0.7);
  const originHeight = hasOrigin ? expansionOrigin!.height : (targetHeight * 0.7);

  // High-performance compositor transform deltas (zero layout reflows)
  const deltaX = originLeft - targetLeft;
  const deltaY = originTop - targetTop;
  const scaleX = originWidth / targetWidth;
  const scaleY = originHeight / targetHeight;

  const springTransition = {
    type: 'spring' as const,
    stiffness: 320,
    damping: 32,
    mass: 0.8,
  };

  const hasEpisodes = Boolean(movie.episodes && movie.episodes.length > 0);

  // 16:9 Landscape Fanart / Backdrops / Stills
  const fanartImages: string[] = useMemo(() => {
    const raw = [
      movie.backdropUrl,
      ...(movie.backdrops || []),
      ...(movie.fanart || []),
    ].filter((url, idx, arr) => Boolean(url) && arr.indexOf(url) === idx);
    return raw.map((url) => getBackdropUrl(url, 'original', movie.posterUrl));
  }, [movie.backdropUrl, movie.backdrops, movie.fanart, movie.posterUrl]);

  // 9:16 Portrait Posters
  const posterImages: string[] = useMemo(() => {
    const raw = [
      movie.posterUrl,
      ...(movie.posters || []),
    ].filter((url, idx, arr) => Boolean(url) && arr.indexOf(url) === idx);
    return raw.map((url) => getPosterUrl(url, 'original', movie.backdropUrl));
  }, [movie.posterUrl, movie.posters, movie.backdropUrl]);

  // Share functionality with refra.netlify.app URL and proper tags
  const handleShare = async () => {
    const shareUrl = `https://refra.netlify.app/?movie=${encodeURIComponent(movie.id)}&title=${encodeURIComponent(movie.title)}`;
    const genreTag = (movie.genres?.[0] || 'Cinema').replace(/[^a-zA-Z0-9]/g, '');
    const shareData = {
      title: `${movie.title} (${movie.releaseYear}) • Refra Cinema`,
      text: `Stream ${movie.title} in 4K UHD with Dolby Atmos on Refra Cinema #RefraCinema #Movies #${genreTag}`,
      url: shareUrl,
    };

    if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard?.writeText?.(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  // Direct image download helper for device storage
  const handleDownloadDirectImage = async (imageUrl: string, filename: string) => {
    try {
      const res = await fetch(imageUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objUrl), 1500);
    } catch {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Touch tracking for mobile sheet slide-down dismissal
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const diff = e.changedTouches[0].clientY - touchStartY.current;
      if (diff > 45) {
        onClose();
      }
      touchStartY.current = null;
    }
  };

  // Direct wheel forwarder to guarantee PC mouse wheel scrolls properly
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop += e.deltaY;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop Dim Scrim with instant tap-outside dismissal + atmospheric ambient movie blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={onClose}
        className="fixed inset-0 cursor-pointer pointer-events-auto overflow-hidden bg-black/60 backdrop-blur-2xl"
      >
        <img
          src={getBackdropUrl(movie.backdropUrl, 'w1280', movie.posterUrl)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-3xl scale-125 opacity-45 saturate-150 brightness-75 pointer-events-none"
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xl pointer-events-none" />
      </motion.div>

      {/* The Poster Card Expanding from its exact origin into the full info container using compositor transforms */}
      <motion.div
        initial={{
          x: deltaX,
          y: deltaY,
          scaleX: scaleX,
          scaleY: scaleY,
          borderRadius: 16,
          opacity: 1,
        }}
        animate={{
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          borderRadius: targetRadius,
          opacity: 1,
        }}
        exit={{
          x: deltaX,
          y: deltaY,
          scaleX: scaleX,
          scaleY: scaleY,
          borderRadius: 16,
          opacity: 0,
          transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
        }}
        transition={springTransition}
        style={{
          position: 'fixed',
          top: targetTop,
          left: targetLeft,
          width: targetWidth,
          height: targetHeight,
          transformOrigin: '0 0',
        }}
        className="z-50 overflow-hidden shadow-2xl flex flex-col pointer-events-auto bg-[#0a0c10]/80 backdrop-blur-3xl border border-white/10 gpu-layer"
      >
        {/* The Movie Poster / Backdrop Ambient Wallpaper */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.img
            src={getBackdropUrl(movie.backdropUrl, 'w1280') || getPosterUrl(movie.posterUrl, 'w780')}
            alt=""
            referrerPolicy="no-referrer"
            initial={{
              filter: 'blur(0px) brightness(1)',
              opacity: 0.8,
            }}
            animate={{
              filter: 'blur(40px) saturate(160%) brightness(0.7)',
              opacity: 0.65,
            }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full h-full object-cover scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10]/95 via-[#0a0c10]/60 to-[#0a0c10]/25" />
        </div>

        {/* Content Layer: reveals smoothly as the poster completes its enlargement and blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, delay: 0.04 }}
          className="relative z-10 flex flex-col h-full min-h-0 overflow-hidden"
          onWheel={handleWheel}
        >
          {/* Top Navigation */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2 z-20 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-[0.96] cursor-pointer border border-white/10"
              aria-label="Back to Browse"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Mobile swipe-down pull indicator */}
            <div
              onClick={onClose}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="px-4 py-1.5 cursor-pointer select-none active:opacity-60 flex flex-col items-center"
              title="Swipe down to close"
            >
              <div className="w-8 h-1 rounded-full bg-white/30 hover:bg-white/50 transition-colors" />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-[0.96] cursor-pointer border border-white/10"
              aria-label="Close details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Scrollable Content Container with PC Smooth Scrollbar */}
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto desktop-scrollbar overscroll-contain flex-1 min-h-0 pb-12"
          >
            {/* Cinematic Stage: Trailer (Autoplay) OR 16:9 Fanart OR 9:16 Posters */}
            {activeMediaTab === 'trailer' && movie.trailerYoutubeId ? (
              <div className="relative mx-4 mt-1 aspect-[16/9] rounded-2xl bg-black/60 overflow-hidden shadow-2xl border border-white/10 shrink-0">
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  title={`${movie.title} Official Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            ) : activeMediaTab === 'posters' ? (
              /* 9:16 Portrait Posters Stage */
              <div className="relative mx-4 mt-1 flex flex-col items-center">
                <div
                  onClick={() => {
                    setLightboxMode('poster');
                    setIsLightboxOpen(true);
                  }}
                  className="relative aspect-[9/16] w-52 sm:w-60 rounded-2xl bg-black/60 overflow-hidden shadow-2xl border border-white/15 cursor-pointer group shrink-0"
                  title="Tap to open full screen and download"
                >
                  <img
                    src={posterImages[selectedPosterIndex] || movie.posterUrl}
                    alt={`${movie.title} Official Poster`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                  />
                  {/* Subtle Overlay Actions (Fullscreen & Download) */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const target = posterImages[selectedPosterIndex] || movie.posterUrl;
                        handleDownloadDirectImage(
                          target,
                          `${movie.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_poster_${selectedPosterIndex + 1}_fullres.jpg`
                        );
                      }}
                      className="p-2 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 backdrop-blur-md transition-colors cursor-pointer shadow-lg"
                      title="Download full resolution poster"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxMode('poster');
                        setIsLightboxOpen(true);
                      }}
                      className="p-2 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 backdrop-blur-md transition-colors cursor-pointer shadow-lg"
                      title="Open full screen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* 16:9 Landscape Fanart & Stills Stage */
              <div className="relative mx-4 mt-1 aspect-[16/9] rounded-2xl bg-black/60 overflow-hidden shadow-2xl border border-white/10 shrink-0 group">
                <img
                  src={fanartImages[selectedFanartIndex] || movie.backdropUrl}
                  alt={`${movie.title} Fanart Still`}
                  referrerPolicy="no-referrer"
                  onClick={() => {
                    setLightboxMode('fanart');
                    setIsLightboxOpen(true);
                  }}
                  className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-102"
                />
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const target = fanartImages[selectedFanartIndex] || movie.backdropUrl;
                      handleDownloadDirectImage(
                        target,
                        `${movie.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_fanart_${selectedFanartIndex + 1}_fullres.jpg`
                      );
                    }}
                    className="p-2 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 backdrop-blur-md transition-colors cursor-pointer shadow-lg"
                    title="Download full resolution fanart"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxMode('fanart');
                      setIsLightboxOpen(true);
                    }}
                    className="p-2 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 backdrop-blur-md transition-colors cursor-pointer shadow-lg"
                    title="Open full screen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Media Mode Pill Selector: Trailer and Merged Horizontal/Vertical Stills & Posters Pill */}
            <div className="px-5 pt-3 flex items-center gap-2 flex-wrap">
              {movie.trailerYoutubeId && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMediaTab('trailer');
                    setIsPlayingTrailer(true);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                    activeMediaTab === 'trailer'
                      ? 'bg-neutral-200 text-neutral-950 font-semibold border-white/20'
                      : 'bg-black/40 text-neutral-400 hover:text-white border-white/10 backdrop-blur-md'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Official Trailer</span>
                </button>
              )}

              {/* Single Merged Pill for Horizontal (Stills) and Vertical (Posters) */}
              {(fanartImages.length > 0 || posterImages.length > 0) && (
                <div className="flex items-center p-0.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-md shadow-sm">
                  {fanartImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMediaTab('fanart');
                        setIsPlayingTrailer(false);
                        setLightboxMode('fanart');
                        setIsLightboxOpen(true);
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        activeMediaTab === 'fanart'
                          ? 'bg-white text-neutral-950 font-semibold shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Tap Horizontal to fill and open fullscreen"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Horizontal</span>
                    </button>
                  )}

                  {posterImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMediaTab('posters');
                        setIsPlayingTrailer(false);
                        setLightboxMode('poster');
                        setIsLightboxOpen(true);
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        activeMediaTab === 'posters'
                          ? 'bg-white text-neutral-950 font-semibold shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Tap Vertical to fill and open fullscreen"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Vertical</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Thumbnail Switcher for Fanart (16:9) */}
            {activeMediaTab === 'fanart' && fanartImages.length > 1 && (
              <div className="px-5 pt-2 flex gap-2 overflow-x-auto hide-scrollbar">
                {fanartImages.map((art, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedFanartIndex(idx);
                      setIsPlayingTrailer(false);
                    }}
                    className={`flex-shrink-0 w-24 aspect-[16/9] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedFanartIndex === idx
                        ? 'border-white scale-102 ring-2 ring-white/40'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={art}
                      alt="Fanart"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Thumbnail Switcher for Posters (9:16) */}
            {activeMediaTab === 'posters' && posterImages.length > 1 && (
              <div className="px-5 pt-2 flex gap-2 overflow-x-auto hide-scrollbar justify-center sm:justify-start">
                {posterImages.map((poster, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedPosterIndex(idx);
                      setIsPlayingTrailer(false);
                    }}
                    className={`flex-shrink-0 w-14 aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedPosterIndex === idx
                        ? 'border-white scale-102 ring-2 ring-white/40'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={poster}
                      alt="Poster"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Info Body with Staggered Fluid Reveal */}
            <div className="px-5 pt-4 space-y-4">
              {/* Featured Header: Side-by-side Poster & Main Info */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04, duration: 0.2 }}
                className="flex gap-4 items-start"
              >
                {/* Official Vertical Poster */}
                <div className="w-24 sm:w-28 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/15 shrink-0 relative bg-black/40">
                  <img
                    src={getPosterUrl(movie.posterUrl, 'w500', movie.backdropUrl)}
                    alt={`${movie.title} Poster`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {movie.badge && (
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-black/75 text-white backdrop-blur-md border border-white/10">
                      {movie.badge}
                    </span>
                  )}
                </div>

                {/* Title & Metadata next to poster */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white backdrop-blur-md border border-white/10">
                      {movie.releaseYear}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-neutral-200 backdrop-blur-md border border-white/5">
                      {movie.duration}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-neutral-200 backdrop-blur-md border border-white/5">
                      {movie.certification}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white backdrop-blur-md border border-white/15 flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-white text-white" />
                      {movie.score}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight drop-shadow-md">
                    {movie.title}
                  </h3>

                  {movie.japaneseTitle && (
                    <div className="text-xs text-neutral-300 font-medium">
                      {movie.japaneseTitle}
                    </div>
                  )}

                  {movie.tagline && (
                    <p className="text-xs text-neutral-300 italic font-light line-clamp-2">
                      "{movie.tagline}"
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    {movie.studios && movie.studios.length > 0 && (
                      <span className="text-[10px] text-neutral-200 px-2 py-0.5 rounded-md bg-white/10 border border-white/10 font-semibold backdrop-blur-md">
                        {movie.studios[0]}
                      </span>
                    )}
                    {movie.totalEpisodes && (
                      <span className="text-[10px] text-neutral-200 px-2 py-0.5 rounded-md bg-white/10 border border-white/10 font-medium backdrop-blur-md">
                        {movie.totalEpisodes} Episodes
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-300 px-2 py-0.5 rounded-md bg-black/40 border border-white/10 font-medium backdrop-blur-md">
                      {movie.resolution}
                    </span>
                    <span className="text-[10px] text-neutral-300 px-2 py-0.5 rounded-md bg-black/40 border border-white/10 font-medium backdrop-blur-md">
                      {movie.audioFormat}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons: Stream Movie, Watchlist, Share */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.2 }}
                className="flex items-center gap-2.5"
              >
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onPlayMovie) {
                      onPlayMovie(movie);
                    } else {
                      setIsPlayingTrailer(true);
                    }
                    trackStreamStart({
                      id: movie.id,
                      title: movie.title,
                      sourceServer: movie.resolution || '4K',
                      isAnime: movie.genres.includes('Animation') || movie.badge?.toLowerCase().includes('anime'),
                    });
                  }}
                  className="flex-1 py-3 px-5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-xl transition-colors min-h-[46px] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-neutral-950" />
                  <span>Stream Movie</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => onToggleWatchlist(movie.id)}
                  className={`p-3 rounded-2xl flex items-center justify-center transition-colors min-h-[46px] min-w-[46px] cursor-pointer border ${
                    isSaved
                      ? 'bg-neutral-200 text-neutral-950 border-white/20'
                      : 'bg-black/40 hover:bg-black/60 text-neutral-200 border-white/15 backdrop-blur-md'
                  }`}
                  aria-label={isSaved ? 'In Watchlist' : 'Add to Watchlist'}
                >
                  {isSaved ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleShare}
                  className="p-3 rounded-2xl bg-black/40 hover:bg-black/60 text-neutral-200 border border-white/15 backdrop-blur-md flex items-center justify-center transition-colors min-h-[46px] min-w-[46px] cursor-pointer"
                  aria-label="Share movie"
                >
                  <Share2 className="w-5 h-5" />
                </motion.button>
              </motion.div>

              {copiedShare && (
                <div className="text-center py-1 text-xs text-neutral-300 font-medium">
                  Refra link copied to clipboard (refra.netlify.app)
                </div>
              )}

              {/* Single Download Button that Expands to Show Options */}
              <div className="pt-0.5">
                <DownloadExpander movie={movie} />
              </div>

              {/* Content Tabs (Overview, Reviews, Episodes) */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/35 border border-white/10 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setContentTab('overview')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    contentTab === 'overview'
                      ? 'bg-neutral-200 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setContentTab('reviews')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    contentTab === 'reviews'
                      ? 'bg-neutral-200 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Reviews & Jikan</span>
                </button>

                {hasEpisodes && (
                  <button
                    type="button"
                    onClick={() => setContentTab('episodes')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      contentTab === 'episodes'
                        ? 'bg-neutral-200 text-neutral-950 shadow-md'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Episodes ({movie.episodes?.length})</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Overview */}
              {contentTab === 'overview' && (
                <div className="space-y-4">
                  {/* Detailed Scores & Ratings */}
                  {movie.ratingsDetailed && movie.ratingsDetailed.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {movie.ratingsDetailed.map((r, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/35 border border-white/10 backdrop-blur-md text-[11px]"
                        >
                          <span className="text-neutral-400 font-normal">{r.source}:</span>
                          <span className="text-white font-semibold">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Awards recognition */}
                  {movie.awards && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md text-xs text-neutral-200">
                      <Trophy className="w-4 h-4 text-white shrink-0" />
                      <span className="font-normal">{movie.awards}</span>
                    </div>
                  )}

                  {/* Synopsis */}
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md">
                    <p className="text-xs text-neutral-200 font-normal leading-relaxed">
                      {movie.synopsis}
                    </p>
                  </div>

                  {/* Where to Watch: Only show clean full logos with NO border around every logo */}
                  {movie.watchProviders && movie.watchProviders.length > 0 && (
                    <div className="p-4 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Tv className="w-3.5 h-3.5 text-neutral-300" />
                          <span>Where to Watch</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">Official Platforms</span>
                      </div>
                      <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar pt-1">
                        {movie.watchProviders.map((wp, idx) => (
                          <div
                            key={idx}
                            title={`${wp.name} • ${wp.type === 'flatrate' ? 'Subscription' : wp.type || 'Stream'}`}
                            className="shrink-0 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
                          >
                            <img
                              src={wp.logoUrl}
                              alt={wp.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded-2xl object-cover shadow-lg"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Cast & Characters */}
                  {movie.castDetailed && movie.castDetailed.length > 0 ? (
                    <div className="p-4 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Users className="w-3.5 h-3.5 text-neutral-300" />
                          <span>Top Cast</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">Credits</span>
                      </div>
                      <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pt-1">
                        {movie.castDetailed.slice(0, 10).map((actor, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col items-center text-center w-18 shrink-0 space-y-1.5"
                          >
                            <div className="w-13 h-13 rounded-full overflow-hidden bg-white/10 border border-white/10 shrink-0">
                              {actor.profileUrl ? (
                                <img
                                  src={actor.profileUrl}
                                  alt={actor.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-neutral-400">
                                  {actor.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="w-full">
                              <p className="text-[11px] font-medium text-white truncate">{actor.name}</p>
                              {actor.character && (
                                <p className="text-[9px] text-neutral-400 truncate">{actor.character}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Fallback Cast Pills */
                    movie.cast && movie.cast.length > 0 && (
                      <div className="p-4 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md space-y-2">
                        <span className="text-xs text-neutral-400">Cast:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {movie.cast.map((actor) => (
                            <span
                              key={actor}
                              className="text-xs font-light text-neutral-200 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/5 backdrop-blur-sm"
                            >
                              {actor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {/* Director & Production */}
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md space-y-2 text-xs">
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-neutral-400">Director:</span>
                      <span className="font-semibold text-white">{movie.director}</span>
                    </div>

                    {movie.productionCompaniesList && movie.productionCompaniesList.some((p) => p.logoUrl) && (
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <span className="text-neutral-400 text-xs">Production:</span>
                        <div className="flex items-center gap-3 flex-wrap pt-1">
                          {movie.productionCompaniesList.map((p) => {
                            if (!p.logoUrl) return null;
                            return (
                              <div
                                key={p.name}
                                title={p.name}
                                className="px-4 py-2.5 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center shadow-md"
                              >
                                <img
                                  src={p.logoUrl}
                                  alt={p.name}
                                  className="h-9 sm:h-11 max-w-[130px] object-contain filter invert brightness-200"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {movie.boxOffice && (
                      <div className="flex items-center justify-between text-neutral-300 pt-1">
                        <span className="text-neutral-400">Box Office:</span>
                        <span className="font-mono text-white">{movie.boxOffice}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Reviews & Jikan Data */}
              {contentTab === 'reviews' && (
                <ReviewsSection
                  movieId={movie.id}
                  movieTitle={movie.title}
                  malId={movie.malId}
                  isAnime={movie.genres.includes('Animation') || movie.badge?.toLowerCase().includes('anime')}
                />
              )}

              {/* Tab 3: Episodes */}
              {contentTab === 'episodes' && hasEpisodes && (
                <div className="space-y-2">
                  {movie.episodes?.map((ep, idx) => (
                    <div
                      key={ep.id}
                      onClick={() => {
                        onClose();
                        if (onPlayMovie) onPlayMovie(movie, idx);
                      }}
                      className="p-3 rounded-2xl bg-black/35 hover:bg-black/55 border border-white/10 backdrop-blur-md flex items-center justify-between gap-3 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white/10 group-hover:bg-white text-white group-hover:text-black flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                          {ep.number}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white truncate">{ep.title}</p>
                          <p className="text-[10px] text-neutral-400 font-light">{ep.duration}</p>
                        </div>
                      </div>

                      <Play className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white shrink-0 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Artwork Lightbox Modal for 9:16 and 16:9 full resolution viewer & downloader */}
      <ArtworkLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        artworks={lightboxMode === 'poster' ? posterImages : fanartImages}
        initialIndex={lightboxMode === 'poster' ? selectedPosterIndex : selectedFanartIndex}
        aspectRatio={lightboxMode === 'poster' ? '9/16' : '16/9'}
        type={lightboxMode}
        movieTitle={movie.title}
      />
    </div>
  );
};

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = (props) => {
  return (
    <AnimatePresence>
      {props.movie && <MovieDetailsContent key={props.movie.id} {...props} movie={props.movie} />}
    </AnimatePresence>
  );
};
