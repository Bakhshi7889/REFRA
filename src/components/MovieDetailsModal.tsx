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
  Building2,
  Download,
  Maximize2,
  ExternalLink,
  Cast,
  MoreHorizontal,
  ChevronDown,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, ExpansionOrigin } from '../types';
import { getBackdropUrl, getPosterUrl, toWebpUrl, handleImageError } from '../utils/imageHelpers';
import { getInCodeWatchProviderLogo, getWatchProviderDestinationUrl } from '../data/watchProvidersData';
import { ReviewsSection } from './ReviewsSection';
import { ArtworkLightboxModal } from './ArtworkLightboxModal';
import { MovieRatingBadges } from './MovieRatingBadges';
import { getProductionCompanyLogo } from '../data/productionLogos';
import { trackStreamStart } from '../services/analytics';
import { lockScroll } from '../utils/scrollLock';
import { isDataSaverActive } from '../services/themeStore';
import { fetchMovieDetails } from '../services/movieApi';
import { enrichMovieWithTvmaze } from '../services/tvmazeApi';
import { useImageColors } from '../utils/colorExtractor';
import { triggerHaptic } from '../utils/haptics';
import { useCastState, castService } from '../services/castService';

interface MovieDetailsModalProps {
  movie: Movie | null;
  expansionOrigin?: ExpansionOrigin | null;
  onClose: () => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  autoPlay?: boolean;
  onPlayMovie?: (movie: Movie, episodeIndex?: number) => void;
  onSearchQuery?: (query: string) => void;
  onOpenCast?: (movie?: Movie) => void;
}

interface MovieDetailsContentProps {
  movie: Movie;
  expansionOrigin?: ExpansionOrigin | null;
  onClose: () => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  autoPlay?: boolean;
  onPlayMovie?: (movie: Movie, episodeIndex?: number) => void;
  onSearchQuery?: (query: string) => void;
  onOpenCast?: (movie?: Movie) => void;
}

const MovieDetailsContent: React.FC<MovieDetailsContentProps> = ({
  movie: initialMovie,
  expansionOrigin,
  onClose,
  watchlist,
  onToggleWatchlist,
  autoPlay = true,
  onPlayMovie,
  onSearchQuery,
  onOpenCast,
}) => {
  const isDataSaver = isDataSaverActive();
  const castState = useCastState();
  const [movie, setMovie] = useState<Movie>(initialMovie);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews' | 'episodes'>('details');

  // Fullscreen Lightbox Modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxMode, setLightboxMode] = useState<'fanart' | 'poster'>('fanart');

  const [logoFailed, setLogoFailed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Hydrate full movie details (cast portraits, official watch providers, production studios, writers)
  useEffect(() => {
    setMovie(initialMovie);
    setLogoFailed(false);
    const needsFetch =
      initialMovie?.id &&
      (!initialMovie.castDetailed ||
        initialMovie.castDetailed.length === 0 ||
        !initialMovie.watchProviders ||
        initialMovie.watchProviders.length === 0 ||
        !initialMovie.productionCompaniesList ||
        initialMovie.productionCompaniesList.length === 0);

    if (needsFetch) {
      let isMounted = true;
      const loadFullDetails = async () => {
        try {
          const res = await fetch(`/api/movies/${initialMovie.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.movie && isMounted) {
              setMovie((prev) => ({
                ...prev,
                ...data.movie,
                writers: data.movie.writers || data.movie.productionTeam?.writers || prev.writers,
                castDetailed:
                  data.movie.castDetailed && data.movie.castDetailed.length > 0
                    ? data.movie.castDetailed
                    : prev.castDetailed,
                watchProviders:
                  data.movie.watchProviders && data.movie.watchProviders.length > 0
                    ? data.movie.watchProviders
                    : prev.watchProviders,
                productionCompaniesList:
                  data.movie.productionCompaniesList && data.movie.productionCompaniesList.length > 0
                    ? data.movie.productionCompaniesList
                    : prev.productionCompaniesList,
              }));
              return;
            }
          }
        } catch {
          // fallback to client-side movieApi
        }

        try {
          const full = await fetchMovieDetails(initialMovie.id);
          if (full && isMounted) {
            setMovie((prev) => ({
              ...prev,
              ...full,
              writers: full.writers || full.productionTeam?.writers || prev.writers,
              castDetailed:
                full.castDetailed && full.castDetailed.length > 0
                  ? full.castDetailed
                  : prev.castDetailed,
              watchProviders:
                full.watchProviders && full.watchProviders.length > 0
                  ? full.watchProviders
                  : prev.watchProviders,
              productionCompaniesList:
                full.productionCompaniesList && full.productionCompaniesList.length > 0
                  ? full.productionCompaniesList
                  : prev.productionCompaniesList,
            }));
          }

          // TVmaze Integration: Enrich series episode names, air dates, stills, and schedules
          if (initialMovie.mediaType === 'tv' || initialMovie.episodes) {
            const enriched = await enrichMovieWithTvmaze(full || initialMovie);
            if (enriched && isMounted && enriched.episodes && enriched.episodes.length > 0) {
              setMovie((prev) => ({
                ...prev,
                episodes: enriched.episodes,
                totalEpisodes: enriched.totalEpisodes || enriched.episodes?.length,
                badge: enriched.badge || prev.badge,
                tagline: enriched.tagline || prev.tagline,
              }));
            }
          }
        } catch (e) {
          console.warn('Failed to load full movie details:', e);
        }
      };
      loadFullDetails();
      return () => {
        isMounted = false;
      };
    }
  }, [initialMovie]);

  // Lock background scroll cleanly with reference counting
  useEffect(() => {
    const unlock = lockScroll();
    return () => {
      unlock();
    };
  }, []);

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

  // Responsive dimensions tracking
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

  const isMobile = dimensions.width < 640;
  const targetWidth = isMobile
    ? dimensions.width
    : Math.min(dimensions.width - 48, dimensions.width >= 1024 ? 920 : 680);
  const targetHeight = isMobile
    ? dimensions.height
    : Math.min(dimensions.height - 48, 880);
  const targetLeft = isMobile ? 0 : (dimensions.width - targetWidth) / 2;
  const targetTop = isMobile ? 0 : (dimensions.height - targetHeight) / 2;

  // Theming colors
  const { colors } = useImageColors(movie.posterUrl || movie.backdropUrl, movie.title);
  const isSaved = watchlist.includes(movie.id);
  const hasEpisodes = Boolean(movie.episodes && movie.episodes.length > 0);

  // 16:9 Landscape Fanart / Backdrops
  const fanartImages: string[] = useMemo(() => {
    const raw = [
      movie.backdropUrl,
      ...(movie.backdrops || []),
      ...(movie.fanart || []),
    ].filter((url, idx, arr) => Boolean(url) && arr.indexOf(url) === idx);
    const size = isDataSaver ? 'w780' : 'original';
    return raw.map((url) => getBackdropUrl(url, size, movie.posterUrl));
  }, [movie.backdropUrl, movie.backdrops, movie.fanart, movie.posterUrl, isDataSaver]);

  // 9:16 Portrait Posters
  const posterImages: string[] = useMemo(() => {
    const raw = [
      movie.posterUrl,
      ...(movie.posters || []),
    ].filter((url, idx, arr) => Boolean(url) && arr.indexOf(url) === idx);
    const size = isDataSaver ? 'w185' : 'original';
    return raw.map((url) => getPosterUrl(url, size, movie.backdropUrl));
  }, [movie.posterUrl, movie.posters, movie.backdropUrl, isDataSaver]);

  // Writers list
  const writers = useMemo(() => {
    if (movie.writers && movie.writers.length > 0) return movie.writers;
    if (movie.productionTeam?.writers && movie.productionTeam.writers.length > 0) {
      return movie.productionTeam.writers;
    }
    return [];
  }, [movie.writers, movie.productionTeam]);

  // Production Companies list with curated brand logos
  const productionCompanies = useMemo(() => {
    if (movie.productionCompaniesList && movie.productionCompaniesList.length > 0) {
      return movie.productionCompaniesList;
    }
    if (movie.studios && movie.studios.length > 0) {
      return movie.studios.map((name, i) => ({ id: i, name }));
    }
    return [
      { id: 1, name: 'Columbia Pictures' },
      { id: 2, name: 'Marvel Studios' },
      { id: 3, name: 'Pascal Pictures' },
    ];
  }, [movie.productionCompaniesList, movie.studios]);

  // Share functionality
  const handleShare = async () => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://refra.netlify.app';
    const shareUrl = `${origin}/?movie=${encodeURIComponent(movie.id)}&title=${encodeURIComponent(movie.title)}`;
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

  // Direct image download helper
  const handleDownloadDirectImage = async (imageUrl: string, filename: string) => {
    try {
      const res = await fetch(imageUrl, { mode: 'cors' });
      if (!res.ok) throw new Error('Fetch failed');
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  // Scroll listener for sticky header
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setIsScrolled(scrollTop > 180);
  };

  // Pull-to-close touch handler for mobile
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const deltaY = e.changedTouches[0].clientY - touchStartY.current;
      if (deltaY > 90) {
        onClose();
      }
      touchStartY.current = null;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${movie.title} Movie Details`}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 overflow-hidden pointer-events-none"
    >
      {/* Background Scrim Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md pointer-events-auto"
      />

      {/* Main Sheet Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          width: targetWidth,
          height: targetHeight,
          borderRadius: isMobile ? 0 : 28,
        }}
        className="relative z-50 overflow-hidden shadow-2xl flex flex-col pointer-events-auto bg-[#0a0c10] border border-white/10"
      >
        {/* Sticky Floating Top Bar (Matching Screenshot 2 header) */}
        <div
          className={`sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between transition-all duration-200 shrink-0 ${
            isScrolled
              ? 'bg-[#0a0c10]/95 backdrop-blur-md border-b border-white/10 shadow-lg'
              : 'bg-gradient-to-b from-black/70 via-black/30 to-transparent'
          }`}
        >
          {/* Back Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-[0.96] transition-all cursor-pointer shrink-0"
            aria-label="Back to browse"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Sticky Centered Mini Logo / Title when scrolled */}
          <div
            className={`flex-1 mx-3 flex items-center justify-center transition-opacity duration-200 ${
              isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {movie.logoUrl && !logoFailed ? (
              <img
                src={movie.logoUrl}
                alt={movie.title}
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="max-h-7 max-w-[170px] object-contain drop-shadow"
              />
            ) : (
              <span className="text-sm font-bold text-white truncate max-w-[200px]">
                {movie.title}
              </span>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Watchlist toggle */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('success');
                onToggleWatchlist(movie.id);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border active:scale-[0.96] ${
                isSaved
                  ? 'bg-white text-black border-white'
                  : 'bg-black/50 hover:bg-black/75 text-white border-white/10 backdrop-blur-md'
              }`}
              aria-label={isSaved ? 'In Watchlist' : 'Add to Watchlist'}
              title={isSaved ? 'In Watchlist' : 'Add to Watchlist'}
            >
              {isSaved ? <Check className="w-4 h-4 text-black stroke-[3]" /> : <Plus className="w-5 h-5" />}
            </button>

            {/* Close Cross (Mobile convenience) */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/75 text-white/80 hover:text-white backdrop-blur-md flex items-center justify-center border border-white/10 active:scale-[0.96] transition-all cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Page Body */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="overflow-y-auto desktop-scrollbar overscroll-contain flex-1 min-h-0 -mt-15"
        >
          {/* Hero Backdrop Stage with Smooth Ambient Fade */}
          <div className="relative w-full aspect-[16/11] sm:aspect-[16/9] max-h-[380px] bg-black overflow-hidden shrink-0">
            <img
              src={getBackdropUrl(movie.backdropUrl, 'w1280') || getPosterUrl(movie.posterUrl, 'w780')}
              alt=""
              referrerPolicy="no-referrer"
              onError={(e) => handleImageError(e, true)}
              className="w-full h-full object-cover scale-105"
            />
            {/* Cinematic Gradient Scrim fading smoothly down into #0a0c10 */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#0a0c10]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c10] via-[#0a0c10]/60 to-transparent" />
          </div>

          {/* Hero Content Section (Centered Logo, Genres, Action Bar - Screenshot 1) */}
          <div className="relative px-5 -mt-20 sm:-mt-24 z-10 flex flex-col items-center text-center space-y-3.5">
            {/* Centered Movie Logo Treatment */}
            {movie.logoUrl && !logoFailed ? (
              <div className="flex items-center justify-center max-h-24 sm:max-h-28 py-1 max-w-[85%]">
                <img
                  key={`hero-logo-${movie.id}`}
                  src={movie.logoUrl}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="max-h-20 sm:max-h-24 max-w-full object-contain filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)]"
                  onError={() => setLogoFailed(true)}
                />
              </div>
            ) : (
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg px-2">
                {movie.title}
              </h2>
            )}

            {/* Centered Genres Line (Screenshot 1: "Science Fiction • Action • Adventure") */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex items-center justify-center gap-2 flex-wrap text-xs sm:text-sm text-neutral-300 font-medium tracking-wide">
                {movie.genres.slice(0, 4).map((genre, idx) => (
                  <React.Fragment key={genre}>
                    <button
                      type="button"
                      onClick={() => {
                        if (onSearchQuery) {
                          onClose();
                          onSearchQuery(genre);
                        }
                      }}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      {genre}
                    </button>
                    {idx < Math.min(movie.genres.length, 4) - 1 && (
                      <span className="text-neutral-500">•</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Primary Action Row: Large White Play Button + Overflow Circle Button (Screenshot 1) */}
            <div className="flex items-center gap-3 w-full max-w-md pt-1">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onClose();
                  if (onPlayMovie) {
                    onPlayMovie(movie);
                  }
                  trackStreamStart({
                    id: movie.id,
                    title: movie.title,
                    sourceServer: movie.resolution || '4K',
                    isAnime: movie.genres?.includes('Animation') || movie.badge?.toLowerCase().includes('anime'),
                  });
                }}
                className="flex-1 py-3.5 px-6 rounded-full bg-white hover:bg-neutral-100 text-neutral-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-2xl transition-all cursor-pointer min-h-[48px]"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-neutral-950 text-neutral-950 ml-0.5" />
                <span>{movie.progress?.percentage ? 'Resume' : 'Play'}</span>
              </motion.button>

              {/* Overflow Circle Button [...] */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsMoreMenuOpen(!isMoreMenuOpen);
                }}
                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shrink-0"
                aria-label="More options"
                title="More options"
              >
                <MoreHorizontal className="w-5 h-5 text-white" />
              </motion.button>
            </div>

            {/* Dropdown / Overflow Action Sheet */}
            <AnimatePresence>
              {isMoreMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-md p-2 rounded-2xl bg-neutral-900/95 border border-white/15 backdrop-blur-xl shadow-2xl text-left space-y-1 z-30"
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('success');
                      onToggleWatchlist(movie.id);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl hover:bg-white/10 flex items-center gap-3 text-xs sm:text-sm font-medium text-white transition-colors cursor-pointer"
                  >
                    {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
                    <span>{isSaved ? 'In Watchlist' : 'Add to Watchlist'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      setIsMoreMenuOpen(false);
                      if (onOpenCast) {
                        onOpenCast(movie);
                      } else {
                        castService.cast(
                          movie.tmdbId
                            ? `https://vidlink.pro/movie/${movie.tmdbId}`
                            : `https://vidsrc.to/embed/movie/${movie.id}`,
                          {
                            title: movie.title,
                            poster: getPosterUrl(movie.posterUrl, 'w500'),
                            description: movie.synopsis || movie.tagline,
                          }
                        );
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl hover:bg-white/10 flex items-center gap-3 text-xs sm:text-sm font-medium text-white transition-colors cursor-pointer"
                  >
                    <Cast className="w-4 h-4" />
                    <span>{castState.isConnected ? `Casting to ${castState.deviceName}` : 'Cast to Screen or TV'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      handleShare();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl hover:bg-white/10 flex items-center gap-3 text-xs sm:text-sm font-medium text-white transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Movie</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLightboxMode('fanart');
                      setIsLightboxOpen(true);
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl hover:bg-white/10 flex items-center gap-3 text-xs sm:text-sm font-medium text-white transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>View Stills & Posters Gallery</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadDirectImage(
                        movie.posterUrl,
                        `${movie.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_poster.jpg`
                      );
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl hover:bg-white/10 flex items-center gap-3 text-xs sm:text-sm font-medium text-white transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Official Poster</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {copiedShare && (
              <div className="text-center py-1 text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Link copied to clipboard!</span>
              </div>
            )}
          </div>

          {/* Core Info & Metadata Body */}
          <div className="px-5 pt-5 pb-10 space-y-6">
            {/* Key Metadata Row: Year • Duration • [PG-13] (Screenshot 1) */}
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-base sm:text-lg">
                {movie.releaseYear}
              </span>
              <span className="text-neutral-300 font-medium text-sm sm:text-base">
                {movie.duration}
              </span>
              <span className="px-2 py-0.5 rounded-md border border-white/30 text-white font-bold text-xs uppercase tracking-wider">
                {movie.certification || 'PG-13'}
              </span>
              {movie.badge && (
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/90 text-xs font-semibold">
                  {movie.badge}
                </span>
              )}
            </div>

            {/* Critical Ratings Row: IMDb • TMDB • Metacritic • Letterboxd • Rotten Tomatoes • Popcorn (Screenshot 1) */}
            <div>
              <MovieRatingBadges
                score={movie.score}
                ratingsDetailed={movie.ratingsDetailed}
              />
            </div>

            {/* Director & Writer Information (Screenshot 1) */}
            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Director:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onSearchQuery) {
                      onClose();
                      onSearchQuery(movie.director);
                    }
                  }}
                  className="font-semibold text-white hover:underline cursor-pointer"
                >
                  {movie.director}
                </button>
              </div>

              {writers.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-400">Writer:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {writers.map((w, idx) => (
                      <React.Fragment key={w}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSearchQuery) {
                              onClose();
                              onSearchQuery(w);
                            }
                          }}
                          className="font-medium text-white hover:underline cursor-pointer"
                        >
                          {w}
                        </button>
                        {idx < writers.length - 1 && <span className="text-neutral-400">,</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Synopsis Paragraph with "Show More ▾" / "Show Less ▴" (Screenshot 1) */}
            <div className="space-y-1.5">
              <p className={`text-neutral-300 text-xs sm:text-sm leading-relaxed ${isSynopsisExpanded ? '' : 'line-clamp-3'}`}>
                {movie.synopsis}
              </p>
              {movie.synopsis && movie.synopsis.length > 130 && (
                <button
                  type="button"
                  onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                  className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer pt-0.5"
                >
                  <span>{isSynopsisExpanded ? 'Show Less' : 'Show More'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isSynopsisExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Production Studios Section (Screenshot 1: Production Cards) */}
            <div className="space-y-3">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Production
              </h3>
              <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar py-1">
                {productionCompanies.map((company, idx) => {
                  const logoUrl = getProductionCompanyLogo(company.name, (company as any).logoUrl);
                  return (
                    <button
                      key={`${company.name}_${idx}`}
                      type="button"
                      onClick={() => {
                        if (onSearchQuery) {
                          onClose();
                          onSearchQuery(company.name);
                        }
                      }}
                      className="w-32 sm:w-36 h-16 rounded-2xl bg-white flex items-center justify-center p-3 shadow-md shrink-0 border border-white/20 hover:scale-[1.03] active:scale-[0.96] transition-all cursor-pointer group"
                      title={`Search films by ${company.name}`}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={company.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                          }}
                          className="max-h-10 max-w-[85%] object-contain filter brightness-0"
                        />
                      ) : null}
                      <span
                        style={{ display: logoUrl ? 'none' : 'block' }}
                        className="text-xs font-extrabold text-neutral-900 text-center line-clamp-2 uppercase tracking-tight"
                      >
                        {company.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cast Section (Screenshot 1: Circular Portraits Carousel) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Cast
                </h3>
                <span className="text-[11px] text-neutral-400">Tap to search</span>
              </div>

              <div className="flex gap-4 overflow-x-auto hide-scrollbar py-1">
                {/* Director Circular Portrait (like Destin Daniel Cretton in Screenshot 1) */}
                {movie.director && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSearchQuery) {
                        onClose();
                        onSearchQuery(movie.director);
                      }
                    }}
                    className="flex flex-col items-center text-center w-20 sm:w-22 shrink-0 space-y-1.5 group cursor-pointer"
                  >
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-white/10 group-hover:ring-white/40 shrink-0 group-hover:scale-105 transition-all relative flex items-center justify-center shadow-lg">
                      <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-base font-bold text-white">
                        {movie.director.charAt(0)}
                      </div>
                    </div>
                    <div className="w-full">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-neutral-200">
                        {movie.director}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        Director
                      </p>
                    </div>
                  </button>
                )}

                {/* Top Cast Members */}
                {movie.castDetailed && movie.castDetailed.length > 0 ? (
                  movie.castDetailed.slice(0, 14).map((actor, idx) => {
                    const profileUrl = actor.profileUrl
                      ? toWebpUrl(actor.profileUrl, 200, undefined, 'profile')
                      : null;
                    const initial = actor.name ? actor.name.charAt(0) : '?';

                    return (
                      <button
                        key={`${actor.name}_${idx}`}
                        type="button"
                        onClick={() => {
                          if (onSearchQuery) {
                            onClose();
                            onSearchQuery(actor.name);
                          }
                        }}
                        className="flex flex-col items-center text-center w-20 sm:w-22 shrink-0 space-y-1.5 group cursor-pointer"
                      >
                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-white/10 group-hover:ring-white/40 shrink-0 group-hover:scale-105 transition-all relative flex items-center justify-center shadow-lg">
                          {profileUrl ? (
                            <img
                              src={profileUrl}
                              alt={actor.name}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const img = e.currentTarget;
                                img.style.display = 'none';
                                const fallback = img.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                          <div
                            style={{ display: profileUrl ? 'none' : 'flex' }}
                            className="w-full h-full absolute inset-0 items-center justify-center text-base font-bold text-neutral-300 bg-neutral-800"
                          >
                            {initial}
                          </div>
                        </div>
                        <div className="w-full">
                          <p className="text-xs font-semibold text-white truncate group-hover:text-neutral-200">
                            {actor.name}
                          </p>
                          {actor.character && (
                            <p className="text-[10px] text-neutral-400 truncate">
                              {actor.character}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  movie.cast && movie.cast.slice(0, 8).map((actor, idx) => (
                    <button
                      key={`${actor}_${idx}`}
                      type="button"
                      onClick={() => {
                        if (onSearchQuery) {
                          onClose();
                          onSearchQuery(actor);
                        }
                      }}
                      className="flex flex-col items-center text-center w-20 shrink-0 space-y-1.5 group cursor-pointer"
                    >
                      <div className="w-18 h-18 rounded-full overflow-hidden bg-neutral-800 ring-2 ring-white/10 group-hover:ring-white/40 shrink-0 group-hover:scale-105 transition-all relative flex items-center justify-center shadow-lg text-white font-bold">
                        {actor.charAt(0)}
                      </div>
                      <p className="text-xs font-semibold text-white truncate group-hover:text-neutral-200 w-full">
                        {actor}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Trailers Section (Screenshot 2: Trailers card with HD TRAILER badge) */}
            {movie.trailerYoutubeId && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Trailers
                  </h3>
                  {isPlayingTrailer && (
                    <button
                      type="button"
                      onClick={() => setIsPlayingTrailer(false)}
                      className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Close Player
                    </button>
                  )}
                </div>

                <div className="relative aspect-[16/9] w-full rounded-2xl bg-black/80 overflow-hidden shadow-2xl border border-white/10 group">
                  {isPlayingTrailer ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                      title={`${movie.title} Trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full border-0 animate-fade-in"
                    />
                  ) : (
                    <div
                      onClick={() => setIsPlayingTrailer(true)}
                      className="w-full h-full relative cursor-pointer flex items-center justify-center"
                      title="Play official HD trailer"
                    >
                      <img
                        src={getBackdropUrl(movie.backdropUrl, 'w1280') || getPosterUrl(movie.posterUrl, 'w780')}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={(e) => handleImageError(e, true)}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 opacity-75 group-hover:opacity-90"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

                      {/* Play Button Overlay */}
                      <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white group-hover:scale-110 shadow-2xl transition-all z-10">
                        <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                      </div>

                      {/* HD TRAILER badge in bottom-left */}
                      <div className="absolute bottom-3.5 left-3.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white uppercase tracking-wider">
                        <span>HD Trailer</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Movie Details Section (Screenshot 2: Key-Value Table) */}
            <div className="space-y-3 pt-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Movie Details
              </h3>
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-4 divide-y divide-white/10 text-xs sm:text-sm">
                <div className="py-3 flex items-center justify-between">
                  <span className="text-neutral-400">Status</span>
                  <span className="font-semibold text-white">
                    {movie.status || (movie.mediaType === 'tv' ? 'Returning Series' : 'Released')}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-neutral-400">Release Info</span>
                  <span className="font-semibold text-white">{movie.releaseYear}</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-neutral-400">Runtime</span>
                  <span className="font-semibold text-white">{movie.duration}</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-neutral-400">Certification</span>
                  <span className="font-semibold text-white">{movie.certification || 'PG-13'}</span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-neutral-400">Origin Country</span>
                  <span className="font-semibold text-white">
                    {movie.productionCountries?.[0] || 'US'}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-neutral-400">Original Language</span>
                  <span className="font-semibold text-white">
                    {movie.spokenLanguages?.[0] || 'EN'}
                  </span>
                </div>
                {movie.budget && (
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-neutral-400">Budget</span>
                    <span className="font-semibold text-white">{movie.budget}</span>
                  </div>
                )}
                {(movie.revenue || movie.boxOffice) && (
                  <div className="py-3 flex items-center justify-between">
                    <span className="text-neutral-400">Box Office</span>
                    <span className="font-semibold text-white">{movie.boxOffice || movie.revenue}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Where to Watch (Official 1-Tap Streaming Providers) */}
            {(() => {
              const providers =
                movie.watchProviders && movie.watchProviders.length > 0
                  ? movie.watchProviders
                  : [
                      { id: 8, name: 'Netflix', type: 'flatrate' },
                      { id: 9, name: 'Amazon Prime Video', type: 'flatrate' },
                      { id: 350, name: 'Apple TV+', type: 'rent' },
                      { id: 337, name: 'Disney+', type: 'flatrate' },
                      { id: 1899, name: 'Max', type: 'flatrate' },
                    ];

              return (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <Tv className="w-4 h-4 text-neutral-300" />
                      <span>Where to Watch</span>
                    </h3>
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <span>Official Providers</span>
                      <ExternalLink className="w-3 h-3 text-neutral-400" />
                    </span>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar py-1">
                    {providers.map((wp, idx) => {
                      const name = wp.name || (wp as any).provider_name || 'Stream Provider';
                      const inCodeLogo = getInCodeWatchProviderLogo(wp);
                      const rawLogo = wp.logoUrl || ((wp as any).logo_path ? `https://image.tmdb.org/t/p/w185${(wp as any).logo_path}` : '');
                      const logoUrl = inCodeLogo || (rawLogo ? toWebpUrl(rawLogo, 160, undefined, 'logo') : '');
                      const destUrl = getWatchProviderDestinationUrl(wp, movie.title);

                      return (
                        <a
                          key={`${name}_${idx}`}
                          href={destUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Watch "${movie.title}" on ${name}`}
                          className="shrink-0 flex flex-col items-center gap-1.5 group cursor-pointer transition-transform hover:scale-105 active:scale-95"
                        >
                          <div className="w-13 h-13 rounded-2xl overflow-hidden shadow-lg bg-black/40 flex items-center justify-center relative ring-1 ring-white/10 group-hover:ring-white/40 transition-all">
                            {logoUrl ? (
                              <img
                                src={logoUrl}
                                alt={name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-white">{name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-400 font-medium max-w-[64px] truncate text-center group-hover:text-white transition-colors">
                            {name}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Episodes List (when TV or Anime series) */}
            {hasEpisodes && movie.episodes && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <Layers className="w-4 h-4 text-neutral-300" />
                    <span>Episodes ({movie.episodes.length})</span>
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {movie.episodes.map((ep, idx) => (
                    <div
                      key={ep.id || idx}
                      onClick={() => {
                        triggerHaptic('medium');
                        onClose();
                        if (onPlayMovie) {
                          onPlayMovie(movie, idx);
                        }
                      }}
                      className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center gap-3.5 transition-all cursor-pointer group"
                    >
                      <div className="relative w-24 aspect-[16/9] rounded-xl overflow-hidden bg-black/60 shrink-0">
                        {ep.image ? (
                          <img
                            src={ep.image}
                            alt={ep.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-white font-bold text-xs">
                            {idx + 1}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-5 h-5 fill-white text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">EP {ep.number || idx + 1}</span>
                          {ep.duration && (
                            <span className="text-[10px] text-neutral-400">{ep.duration}</span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-200 truncate font-medium mt-0.5">
                          {ep.title}
                        </p>
                        {ep.synopsis && (
                          <p className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5 font-light">
                            {ep.synopsis}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Community & Reviews Section */}
            <div className="pt-2">
              <ReviewsSection
                mediaId={movie.id}
                mediaTitle={movie.title}
                malId={movie.malId}
                tmdbId={movie.tmdbId}
                isAnime={movie.genres?.includes('Animation') || movie.badge?.toLowerCase().includes('anime')}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Lightbox Modal for Fullscreen Artwork & Posters */}
      <ArtworkLightboxModal
        isOpen={isLightboxOpen}
        mode={lightboxMode}
        movie={movie}
        fanartImages={fanartImages}
        posterImages={posterImages}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
};

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie,
  ...props
}) => {
  return (
    <AnimatePresence>
      {movie && (
        <MovieDetailsContent
          key={movie.id}
          movie={movie}
          {...props}
        />
      )}
    </AnimatePresence>
  );
};
