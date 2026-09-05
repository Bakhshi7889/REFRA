import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Plus,
  Check,
  Star,
  Volume2,
  VolumeX,
  Share2,
  Film,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Sparkles,
  Layers,
  ChevronDown,
  ArrowLeft,
  Trophy,
  Tv,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, ExpansionOrigin } from '../types';
import { getBackdropUrl, getPosterUrl } from '../utils/imageHelpers';
import { ReviewsSection } from './ReviewsSection';
import { trackStreamStart } from '../services/analytics';

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
  autoPlay = false,
  onPlayMovie,
}) => {
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(autoPlay);
  const [activeMediaTab, setActiveMediaTab] = useState<'trailer' | 'gallery'>('trailer');
  const [contentTab, setContentTab] = useState<'overview' | 'reviews' | 'episodes'>('overview');
  const [selectedBackdropIndex, setSelectedBackdropIndex] = useState(0);
  const [copiedShare, setCopiedShare] = useState(false);
  const isSaved = watchlist.includes(movie.id);

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

  // Lock background scroll to prevent behind-screen scrollbar movement
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'contain';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
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

  // Keyboard shortcut support (Escape to close, Space to play trailer)
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
    stiffness: 260,
    damping: 28,
    mass: 0.75,
  };

  const hasEpisodes = Boolean(movie.episodes && movie.episodes.length > 0);

  const allArtworks = [
    movie.backdropUrl,
    ...(movie.backdrops || []),
    ...(movie.fanart || []),
  ]
    .filter((url, idx, arr) => url && arr.indexOf(url) === idx)
    .map((url) => getBackdropUrl(url, 'w1280', movie.posterUrl));

  const handleShare = () => {
    navigator.clipboard?.writeText?.(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop Dim Scrim with instant tap-outside dismissal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer pointer-events-auto"
      />

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
        className="z-50 overflow-hidden shadow-2xl flex flex-col pointer-events-auto bg-[#0a0c10] border border-white/10 gpu-layer"
      >
        {/* The Movie Poster Wallpaper: Stays present behind the info page, beautifully slightly blurred like wallpaper at home */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.img
            src={getPosterUrl(movie.posterUrl, 'w780', movie.backdropUrl)}
            alt=""
            referrerPolicy="no-referrer"
            initial={{
              filter: 'blur(0px) brightness(1)',
              scale: 1,
            }}
            animate={{
              filter: 'blur(10px) brightness(0.55) saturate(130%)',
              scale: 1.05,
            }}
            exit={{
              filter: 'blur(0px) brightness(1)',
              scale: 1,
              transition: { duration: 0.2 },
            }}
            transition={springTransition}
            className="w-full h-full object-cover gpu-layer"
          />
          {/* Subtle translucent dark veil so the wallpaper is vibrant and visible everywhere, while all text is razor-sharp */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/75 pointer-events-none" />
        </div>

        {/* Content Layer: reveals smoothly as the poster completes its enlargement and blur */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ delay: 0.06, duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 flex flex-col h-full overflow-hidden"
        >
          {/* Top Navigation: Sleek, low-profile & non-protruding */}
          <div className="pt-2 px-3 pb-1 flex items-center justify-between z-30 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-[0.96] cursor-pointer flex items-center gap-1 border border-white/10"
              aria-label="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline pr-1 text-[11px] font-medium">Back</span>
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

          {/* Scrollable Content */}
          <div className="overflow-y-auto hide-scrollbar overscroll-contain flex-1 pb-8">
          {/* Cinematic Stage: Real YouTube/KinoCheck Trailer or Fanart Viewer */}
          <div className="relative mx-4 mt-1 aspect-[16/9] rounded-2xl bg-black/60 overflow-hidden shadow-2xl border border-white/10 shrink-0">
            {isPlayingTrailer && movie.trailerYoutubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                title={`${movie.title} Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <>
                <img
                  src={allArtworks[selectedBackdropIndex] || movie.backdropUrl}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                {/* Center Play Trailer Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ scale: 1.05 }}
                    type="button"
                    onClick={() => setIsPlayingTrailer(true)}
                    className="w-14 h-14 rounded-full bg-white/95 hover:bg-white text-neutral-950 flex items-center justify-center shadow-2xl transition-all cursor-pointer"
                    aria-label="Play Trailer"
                  >
                    <Play className="w-6 h-6 fill-neutral-950 ml-0.5" />
                  </motion.button>
                </div>
              </>
            )}

            {/* Badges on stage */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 pointer-events-none">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/65 text-neutral-200 backdrop-blur-md border border-white/10">
                {movie.resolution}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/65 text-neutral-300 backdrop-blur-md border border-white/10">
                {movie.audioFormat}
              </span>
            </div>
          </div>

          {/* Media Mode Pill Selector */}
          {allArtworks.length > 1 && (
            <div className="px-5 pt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveMediaTab('trailer');
                  setIsPlayingTrailer(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                  activeMediaTab === 'trailer'
                    ? 'bg-neutral-200 text-neutral-950 font-semibold border-white/20'
                    : 'bg-black/40 text-neutral-400 hover:text-white border-white/10 backdrop-blur-md'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Official Trailer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMediaTab('gallery');
                  setIsPlayingTrailer(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                  activeMediaTab === 'gallery'
                    ? 'bg-neutral-200 text-neutral-950 font-semibold border-white/20'
                    : 'bg-black/40 text-neutral-400 hover:text-white border-white/10 backdrop-blur-md'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Fanart & Stills ({allArtworks.length})</span>
              </button>
            </div>
          )}

          {/* If Gallery view is active: show horizontal backdrop switcher */}
          {activeMediaTab === 'gallery' && allArtworks.length > 1 && (
            <div className="px-5 pt-2 flex gap-2 overflow-x-auto hide-scrollbar">
              {allArtworks.map((art, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedBackdropIndex(idx);
                    setIsPlayingTrailer(false);
                  }}
                  className={`flex-shrink-0 w-24 aspect-[16/10] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedBackdropIndex === idx
                      ? 'border-white scale-102'
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

            {/* Action Buttons */}
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
                  Link copied to clipboard
                </div>
              )}

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

                  {/* Official Watch Providers / Where to Stream */}
                  {movie.watchProviders && movie.watchProviders.length > 0 && (
                    <div className="p-4 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <Tv className="w-3.5 h-3.5 text-neutral-300" />
                          <span>Where to Watch</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">Official Platforms</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">
                        {movie.watchProviders.map((wp, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/10 shrink-0 backdrop-blur-sm"
                          >
                            <img
                              src={wp.logoUrl}
                              alt={wp.name}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-md object-cover"
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-white whitespace-nowrap">{wp.name}</span>
                              <span className="text-[9px] text-neutral-400 uppercase tracking-wide">
                                {wp.type === 'flatrate' ? 'Subscription' : wp.type || 'Stream'}
                              </span>
                            </div>
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

                  {/* Director & Genres */}
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-neutral-400">Director:</span>
                      <span className="text-xs font-medium text-white px-2.5 py-0.5 rounded-full bg-white/15 border border-white/10 backdrop-blur-sm">
                        {movie.director}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-neutral-400">Genres:</span>
                      {movie.genres.map((genre) => (
                        <span
                          key={genre}
                          className="text-xs font-medium text-neutral-200 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/10 backdrop-blur-sm"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Reviews & Jikan Ratings */}
              {contentTab === 'reviews' && (
                <ReviewsSection movie={movie} />
              )}

              {/* Tab 3: Episodes Mapping */}
              {contentTab === 'episodes' && movie.episodes && movie.episodes.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                      Airing Episodes ({movie.episodes.length})
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Jikan / AniList Feed
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {movie.episodes.map((ep) => (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => {
                          if (onPlayMovie) {
                            onPlayMovie(movie, ep.number - 1);
                          } else {
                            setIsPlayingTrailer(true);
                          }
                        }}
                        className="p-3 rounded-2xl bg-black/35 hover:bg-black/50 border border-white/10 text-left transition-colors cursor-pointer group flex items-start justify-between gap-2 backdrop-blur-md"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mb-0.5">
                            <span className="font-bold text-white px-1.5 py-0.5 rounded bg-white/15">EP {ep.number}</span>
                            <span>{ep.duration || '24m'}</span>
                          </div>
                          <div className="text-xs font-medium text-neutral-200 group-hover:text-white line-clamp-1">
                            {ep.title}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-white/10 group-hover:bg-white text-neutral-300 group-hover:text-neutral-950 transition-colors shrink-0">
                          <Play className="w-3 h-3 fill-current" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = (props) => {
  return (
    <AnimatePresence>
      {props.movie && (
        <MovieDetailsContent
          key={props.movie.id}
          {...props}
          movie={props.movie}
        />
      )}
    </AnimatePresence>
  );
};
