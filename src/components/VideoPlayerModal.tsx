import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Play,
  RotateCw,
  RefreshCw,
  Maximize,
  Minimize,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  Film,
  Tv,
  Layers,
  Clapperboard,
  DollarSign,
  Users,
  Award,
  Globe,
  Calendar,
  Clock,
  Star,
  HardDrive,
  CheckCircle2,
  Share2,
  SlidersHorizontal,
  Filter,
  Volume2,
  Languages,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie, AnimeEpisode, StreamItem } from '../types';
import { getBackdropUrl, getPosterUrl } from '../utils/imageHelpers';
import { saveIndexedDbHistoryItem } from '../services/indexedDb';
import { scrobbleToTrakt } from '../services/traktApi';
import { trackStreamStart } from '../services/analytics';
import {
  computeStreamScore,
  getStreamOrderedTags,
  getStreamBytes,
  BEST_GREEN,
  STANDARD_TAG,
  SIZE_TAG,
} from '../utils/streamHelpers';

export interface StreamFilters {
  provider: string; // 'All' | provider name
  quality: string;  // 'All' | '4K' | '1080p' | '720p'
  language: string; // 'All' | language name
  sizeRange: string;// 'All' | '<5GB' | '5-15GB' | '15-30GB' | '>30GB'
}

export const DEFAULT_STREAM_FILTERS: StreamFilters = {
  provider: 'All',
  quality: 'All',
  language: 'All',
  sizeRange: 'All',
};

export const PROVIDER_IMAGE_LOGOS: Record<string, string> = {
  penguplay: 'https://pengu.uk/penguplay-icon.png',
  pengu: 'https://pengu.uk/penguplay-icon.png',
  torrentsdb: 'https://torrentsdb.com/icon.svg',
  torrentio: 'https://raw.githubusercontent.com/TheBeastLT/torrentio-scraper/master/addon/static/images/logo_v1.png',
  comet: 'https://raw.githubusercontent.com/g0ldyy/comet/refs/heads/main/comet/assets/icon.png',
  kort: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Tv_flat_icon.svg/512px-Tv_flat_icon.svg.png',
  thepiratebay: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/The_Pirate_Bay_logo.svg/512px-The_Pirate_Bay_logo.svg.png',
  tpb: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/The_Pirate_Bay_logo.svg/512px-The_Pirate_Bay_logo.svg.png',
  pirate: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/The_Pirate_Bay_logo.svg/512px-The_Pirate_Bay_logo.svg.png',
  netflix: 'https://play-lh.googleusercontent.com/TBRwjS_qfJCSj1m7zZB93FnpJM5fSpMA_wUlFDLxWAb45T9RmwBvQd5cWR5viJJOhkI',
};

export const renderProviderLogo = (
  serverName: string | undefined,
  logoUrl?: string,
  sizeClass = 'w-12 h-12'
) => {
  const norm = (serverName || '').toLowerCase().trim();
  let resolvedUrl = logoUrl;
  if (!resolvedUrl) {
    for (const [key, val] of Object.entries(PROVIDER_IMAGE_LOGOS)) {
      if (norm.includes(key)) {
        resolvedUrl = val;
        break;
      }
    }
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center shrink-0 overflow-visible relative`}
      title={serverName || 'Provider'}
    >
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={serverName || 'Provider'}
          className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <HardDrive className="w-5 h-5 text-neutral-400" />
      )}
    </div>
  );
};

interface VideoPlayerModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onProgressUpdate?: (movieId: string, progressPercent: number, timeLeft: string) => void;
  initialEpisodeIndex?: number;
  selectedStream?: StreamItem | null;
  onOpenServerSelector?: () => void;
}

function formatCurrency(amount: number | string | undefined): string | null {
  if (!amount) return null;
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.]/g, '')) : amount;
  if (!num || isNaN(num) || num <= 0) return null;
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)} Billion`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)} Million`;
  return `$${Number(num).toLocaleString()}`;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  movie,
  isOpen,
  onClose,
  onProgressUpdate,
  initialEpisodeIndex = 0,
  selectedStream,
  onOpenServerSelector,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(initialEpisodeIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotatedLandscape, setIsRotatedLandscape] = useState(false);
  const [keyReloadIndex, setKeyReloadIndex] = useState(0);

  // Full detailed movie data (enriched from API if initial movie object is partial)
  const [detailedMovie, setDetailedMovie] = useState<Movie | null>(null);

  // Server streams state
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [activeStream, setActiveStream] = useState<StreamItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<StreamFilters>(DEFAULT_STREAM_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<StreamFilters>(DEFAULT_STREAM_FILTERS);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Prevent background scrolling and scrollbar jitter when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
    };
  }, [isOpen]);

  // Floating Toast Notification
  const [toastMessage, setToastMessage] = useState<{
    id: number;
    title: string;
    subtitle?: string;
  } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((title: string, subtitle?: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage({ id: Date.now(), title, subtitle });
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  }, []);

  // Sync detailed movie state when movie prop changes
  useEffect(() => {
    if (movie) {
      setDetailedMovie(movie);
      // Fetch full details if productionTeam or budget is missing
      if (!movie.productionTeam && movie.id) {
        fetch(`/api/movies/${movie.id}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.movie) {
              setDetailedMovie((prev) => ({ ...prev, ...data.movie }));
            }
          })
          .catch(() => {});
      }
    } else {
      setDetailedMovie(null);
    }
  }, [movie]);

  // Clean IDs for standard video embeds fallback
  const cleanTmdbId = useMemo(() => {
    if (!movie) return '550';
    return movie.tmdbId ? String(movie.tmdbId).replace(/^tmdb_/, '') : '550';
  }, [movie]);

  const cleanImdbId = useMemo(() => {
    return movie?.imdbId || 'tt0137523';
  }, [movie]);

  const isSeries = useMemo(() => {
    return (
      movie?.mediaType === 'tv' ||
      movie?.mediaType === 'anime' ||
      Boolean(movie?.episodes && movie.episodes.length > 0)
    );
  }, [movie]);

  const episodeNumber = useMemo(() => {
    if (movie?.episodes && movie.episodes[currentEpisodeIndex]) {
      return movie.episodes[currentEpisodeIndex].number;
    }
    return currentEpisodeIndex + 1;
  }, [movie, currentEpisodeIndex]);

  // Fallback high-speed CDN mirrors
  const fallbackMirrors = useMemo(() => {
    const vidlink = isSeries
      ? `https://vidlink.pro/tv/${cleanTmdbId}/1/${episodeNumber}`
      : `https://vidlink.pro/movie/${cleanTmdbId}`;

    const videasy = isSeries
      ? `https://player.videasy.net/tv/${cleanTmdbId}/1/${episodeNumber}`
      : `https://player.videasy.net/movie/${cleanTmdbId}`;

    const autoembed = isSeries
      ? `https://autoembed.co/tv/tmdb/${cleanTmdbId}/1/${episodeNumber}`
      : `https://autoembed.co/movie/tmdb/${cleanTmdbId}`;

    const twoEmbed = isSeries
      ? `https://www.2embed.cc/embedtv/${cleanImdbId || cleanTmdbId}&s=1&e=${episodeNumber}`
      : `https://www.2embed.cc/embed/${cleanImdbId || cleanTmdbId}`;

    const smashystream = isSeries
      ? `https://embed.smashystream.com/playere.php?tmdb=${cleanTmdbId}&season=1&episode=${episodeNumber}`
      : `https://embed.smashystream.com/playere.php?tmdb=${cleanTmdbId}`;

    return [
      {
        id: 'vidlink',
        name: 'VidLink 4K Master',
        tag: 'FastCDN • 4K UHD • Multi-Subtitles',
        quality: '4K',
        url: vidlink,
      },
      {
        id: 'videasy',
        name: 'Videasy Pro',
        tag: 'High-Bitrate • Multi-Audio Tracks',
        quality: '1080p',
        url: videasy,
      },
      {
        id: 'autoembed',
        name: 'AutoEmbed Fast',
        tag: 'Zero-Lag 1080p 60fps',
        quality: '1080p',
        url: autoembed,
      },
      {
        id: 'twoembed',
        name: '2Embed Global',
        tag: 'Global Edge Cloud CDN',
        quality: '1080p',
        url: twoEmbed,
      },
      {
        id: 'smashystream',
        name: 'SmashyStream Ultra',
        tag: 'Alternative 4K Stream',
        quality: '4K',
        url: smashystream,
      },
    ];
  }, [cleanTmdbId, cleanImdbId, isSeries, episodeNumber]);

  // Fetch streams and AUTO-SELECT THE BEST ONE with a TOAST!
  useEffect(() => {
    if (!isOpen || !movie) return;
    let isCancelled = false;
    setIsLoadingStreams(true);

    const type = movie.mediaType || (movie.genres.includes('Animation') ? 'anime' : 'movie');
    const episodeNum = movie.episodes?.[currentEpisodeIndex]?.number || currentEpisodeIndex + 1;
    const streamUrl = `/api/streams?id=${encodeURIComponent(movie.id)}&type=${type}&title=${encodeURIComponent(movie.title)}&year=${movie.releaseYear}&season=1&episode=${episodeNum}`;

    fetch(streamUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load streams'))))
      .then((data) => {
        if (isCancelled) return;
        const list: StreamItem[] = Array.isArray(data.streams) ? data.streams : [];
        setStreams(list);
        setIsLoadingStreams(false);

        // If user already passed an explicit stream, keep it
        if (selectedStream) {
          setActiveStream(selectedStream);
          showToast(
            `✨ Connected to ${selectedStream.serverName || 'Stream'}`,
            `${selectedStream.quality || '4K'} • ${selectedStream.fileSize || 'Ultra High Definition'}`
          );
        } else if (list.length > 0) {
          // AUTO-SELECT THE BEST STREAM
          const ranked = [...list].sort((a, b) => computeStreamScore(b) - computeStreamScore(a));
          const best = ranked[0];
          setActiveStream(best);
          showToast(
            `✨ Auto-selected best stream: ${best.serverName || 'Ultra Pipeline'}`,
            `${best.quality || '4K'} • ${best.fileSize || 'Ultra Bitrate'}`
          );
        } else {
          // Fallback to first high-speed CDN mirror
          const defaultMirror = fallbackMirrors[0];
          setActiveStream(null);
          showToast(`⚡ Auto-connected to ${defaultMirror.name}`, 'Verified High-Speed CDN');
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('Streams fetch error:', err);
        setIsLoadingStreams(false);
        const defaultMirror = fallbackMirrors[0];
        setActiveStream(null);
        showToast(`⚡ Auto-connected to ${defaultMirror.name}`, 'Verified High-Speed CDN');
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, movie, currentEpisodeIndex, selectedStream, fallbackMirrors, showToast]);

  // Dynamic filter options derived from actual stream data
  const availableProviders = useMemo(() => {
    const map = new Map<string, number>();
    streams.forEach((s) => {
      const name = s.serverName || 'Other';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [streams]);

  const availableQualities = useMemo(() => {
    const map = new Map<string, number>();
    streams.forEach((s) => {
      const q = s.quality || '1080p';
      map.set(q, (map.get(q) || 0) + 1);
    });
    const order = ['4K', '1080p', '720p', '480p'];
    return Array.from(map.entries())
      .sort((a, b) => {
        const idxA = order.indexOf(a[0]);
        const idxB = order.indexOf(b[0]);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a[0].localeCompare(b[0]);
      })
      .map(([quality, count]) => ({ quality, count }));
  }, [streams]);

  const availableLanguages = useMemo(() => {
    const map = new Map<string, number>();
    streams.forEach((s) => {
      const langs = s.languages && s.languages.length > 0 ? s.languages : ['English'];
      langs.forEach((l) => {
        map.set(l, (map.get(l) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([language, count]) => ({ language, count }));
  }, [streams]);

  const availableSizeRanges = useMemo(() => {
    const ranges = [
      { id: '<5GB', label: 'Under 5 GB', min: 0, max: 5 },
      { id: '5-15GB', label: '5 GB – 15 GB', min: 5, max: 15 },
      { id: '15-30GB', label: '15 GB – 30 GB', min: 15, max: 30 },
      { id: '>30GB', label: '30+ GB (Ultra Remux)', min: 30, max: 99999 },
    ];
    return ranges.map((r) => {
      const count = streams.filter((s) => {
        const gb = getStreamBytes(s) / (1024 * 1024 * 1024);
        return gb >= r.min && gb < r.max;
      }).length;
      return { ...r, count };
    });
  }, [streams]);

  // Helper to test if a stream matches filter parameters
  const matchesFilters = useCallback((stream: StreamItem, f: StreamFilters) => {
    if (f.provider !== 'All') {
      const sName = (stream.serverName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pName = f.provider.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!sName.includes(pName)) return false;
    }
    if (f.quality !== 'All') {
      if ((stream.quality || '').toLowerCase() !== f.quality.toLowerCase()) return false;
    }
    if (f.language !== 'All') {
      const langs = stream.languages && stream.languages.length > 0 ? stream.languages : ['English'];
      const match = langs.some((l) => l.toLowerCase() === f.language.toLowerCase());
      if (!match) return false;
    }
    if (f.sizeRange !== 'All') {
      const gb = getStreamBytes(stream) / (1024 * 1024 * 1024);
      if (f.sizeRange === '<5GB' && gb >= 5) return false;
      if (f.sizeRange === '5-15GB' && (gb < 5 || gb >= 15)) return false;
      if (f.sizeRange === '15-30GB' && (gb < 15 || gb >= 30)) return false;
      if (f.sizeRange === '>30GB' && gb < 30) return false;
    }
    return true;
  }, []);

  // Real-time preview count of matching streams for pending filters
  const pendingMatchCount = useMemo(() => {
    return streams.filter((s) => matchesFilters(s, pendingFilters)).length;
  }, [streams, pendingFilters, matchesFilters]);

  // Number of active filters currently applied
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.provider !== 'All') count++;
    if (appliedFilters.quality !== 'All') count++;
    if (appliedFilters.language !== 'All') count++;
    if (appliedFilters.sizeRange !== 'All') count++;
    return count;
  }, [appliedFilters]);

  // Filter streams and default order as BEST (highest quality + bitrate + audio)
  const filteredStreams = useMemo(() => {
    const list = streams.filter((s) => matchesFilters(s, appliedFilters));
    // Default as Best ranking
    list.sort((a, b) => computeStreamScore(b) - computeStreamScore(a));
    return list;
  }, [streams, appliedFilters, matchesFilters]);

  // Determine active playing stream URL
  const activeStreamUrl = useMemo(() => {
    if (activeStream?.url || activeStream?.embedUrl) {
      return activeStream.url || activeStream.embedUrl;
    }
    return fallbackMirrors[0]?.url;
  }, [activeStream, fallbackMirrors]);

  const isEmbed = useMemo(() => {
    if (!activeStreamUrl) return true;
    return (
      activeStreamUrl.includes('vidlink') ||
      activeStreamUrl.includes('videasy') ||
      activeStreamUrl.includes('autoembed') ||
      activeStreamUrl.includes('2embed') ||
      activeStreamUrl.includes('smashystream') ||
      activeStreamUrl.includes('vidsrc') ||
      activeStreamUrl.includes('youtube') ||
      !activeStreamUrl.match(/\.(mp4|m3u8|webm|mkv)($|\?)/i)
    );
  }, [activeStreamUrl]);

  // Handle Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Double-tap or double-click to toggle fullscreen
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      toggleFullscreen();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [toggleFullscreen]);

  useEffect(() => {
    const handleFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFs);
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Record history & analytics
  useEffect(() => {
    if (isOpen && movie) {
      saveIndexedDbHistoryItem({
        id: `hist_${movie.id}`,
        movieId: movie.id,
        title: movie.title,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        progressPercent: movie.progress?.percentage || 15,
        durationString: movie.duration,
        lastWatchedTimestamp: Date.now(),
      });
      trackStreamStart({
        id: movie.id,
        title: movie.title,
        sourceServer: activeStream?.serverName || 'VidLink 4K',
        isAnime: movie.genres.includes('Animation') || movie.badge?.toLowerCase().includes('anime'),
      });
      scrobbleToTrakt(movie.title, 15, 'start');
    }
  }, [isOpen, movie, activeStream]);

  if (!isOpen || !movie) return null;

  const currentMovie = detailedMovie || movie;
  const currentServerTitle = activeStream?.serverName || 'Refra Ultra CDN';
  const currentQualityTitle = activeStream?.quality || '4K';
  const currentStreamTags = activeStream ? getStreamOrderedTags(activeStream) : [];

  return (
    <AnimatePresence>
      <div
        ref={containerRef}
        className={`fixed inset-0 z-[75] bg-[#08090d] text-white flex flex-col select-none overflow-hidden overscroll-none ${
          isRotatedLandscape
            ? 'rotate-90 origin-center w-[100dvh] h-[100dvw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'w-full h-full'
        }`}
      >
        {/* SVG Filter for Liquid Glass */}
        <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
          <defs>
            <filter id="liquid-distortion" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.008 0.008"
                numOctaves={2}
                seed={92}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={16}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* ================= TOP BAR (CLEAN, MOBILE-OPTIMIZED, NO BROKEN SELECTOR) ================= */}
        {!isFullscreen && (
          <header className="shrink-0 z-30 px-3 sm:px-6 py-2.5 flex items-center justify-between border-b border-white/10 bg-[#08090d]/80 backdrop-blur-xl touch-none select-none overscroll-none">
            {/* Back Button + Title */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={onClose}
                className="p-2 sm:px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.96] text-neutral-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 border border-white/10 shrink-0 min-h-[44px] min-w-[44px] justify-center"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Back</span>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-sm">
                    {currentMovie.title}
                  </h1>
                  {isSeries && (
                    <span className="text-[10px] text-emerald-300 font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                      EP {episodeNumber}
                    </span>
                  )}
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                    {currentQualityTitle}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-light truncate">
                  {currentMovie.releaseYear} • {currentMovie.duration} • {currentMovie.certification}
                </p>
              </div>
            </div>

            {/* Action Buttons: Reload, Rotate, Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setKeyReloadIndex((k) => k + 1)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.96] text-neutral-300 hover:text-white transition-all cursor-pointer border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Reload Stream"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsRotatedLandscape((prev) => !prev)}
                className={`p-2 rounded-xl active:scale-[0.96] transition-all cursor-pointer border min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  isRotatedLandscape
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border-white/10'
                }`}
                title={isRotatedLandscape ? 'Reset to Portrait' : 'Rotate to Landscape'}
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.96] text-neutral-300 hover:text-white transition-all cursor-pointer border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </header>
        )}

        {/* ================= FLOATING TOAST NOTIFICATION ================= */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[90] max-w-[92vw] sm:max-w-md w-full pointer-events-auto"
            >
              <div className="mx-auto px-4 py-2.5 rounded-2xl bg-[#141722]/95 backdrop-blur-2xl border border-emerald-500/30 shadow-2xl flex items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{toastMessage.title}</div>
                    {toastMessage.subtitle && (
                      <div className="text-[11px] text-emerald-300/80 truncate font-mono">
                        {toastMessage.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= MAIN SCROLLABLE STREAMING PAGE CONTENT ================= */}
        <div
          className={`flex-1 overflow-y-auto hide-scrollbar overscroll-contain ${
            isFullscreen ? 'p-0 flex items-center justify-center' : 'px-3 sm:px-6 lg:px-8 py-3 space-y-5 max-w-5xl mx-auto w-full'
          }`}
        >
          {/* ================= 1. VIDEO STAGE (ABOVE DROPDOWN) ================= */}
          <section
            onDoubleClick={handleDoubleTap}
            className={`relative mx-auto overflow-hidden bg-black shadow-2xl border border-white/10 ${
              isFullscreen
                ? 'w-full h-full rounded-0 border-0'
                : 'w-full aspect-[16/9] max-h-[55vh] rounded-2xl sm:rounded-3xl'
            }`}
          >
            {/* If stream is playing: Show embed or video */}
            {activeStreamUrl ? (
              isEmbed ? (
                <iframe
                  key={`${activeStreamUrl}_${keyReloadIndex}_${episodeNumber}`}
                  src={activeStreamUrl}
                  title={`${currentMovie.title} Stream`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="w-full h-full border-0 bg-black"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={activeStreamUrl}
                  poster={getBackdropUrl(currentMovie.backdropUrl, 'w1280', currentMovie.posterUrl)}
                  playsInline
                  controls
                  autoPlay
                  className="w-full h-full object-contain cursor-pointer"
                />
              )
            ) : (
              /* Blurred movie placeholder: uses the poster/backdrop as blurred while connecting or when no stream is chosen */
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <img
                  src={getPosterUrl(currentMovie.posterUrl, 'w780', currentMovie.backdropUrl)}
                  alt={currentMovie.title}
                  className="absolute inset-0 w-full h-full object-cover filter blur-2xl scale-125 opacity-40"
                />
                <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

                <div className="relative z-10 flex flex-col items-center text-center p-6 space-y-3 max-w-sm">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-pulse">
                    <Play className="w-5 h-5 text-emerald-400 fill-emerald-400 ml-0.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white drop-shadow">
                      {isLoadingStreams ? 'Finding Best 4K Stream...' : 'Connecting to Stream...'}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 font-light">
                      {isLoadingStreams
                        ? 'Analyzing PenguPlay, TorrentsDB & multi-debrid pipelines...'
                        : 'Tap the server dropdown below to pick a specific stream.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Exit Fullscreen button when in Fullscreen mode */}
            {isFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="absolute top-4 right-4 z-50 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-[0.96]"
                title="Exit Fullscreen"
              >
                <Minimize className="w-4 h-4" />
              </button>
            )}
          </section>

          {/* If NOT in fullscreen: Render Dropdown + Full Film Details */}
          {!isFullscreen && (
            <>
              {/* ================= 2. DROP-DOWN SERVER SELECTOR (BELOW VIDEO STAGE) ================= */}
              <section className="space-y-2">
                {/* Dropdown Trigger Card */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className="w-full p-3 sm:p-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] active:scale-[0.99] border border-white/10 transition-all cursor-pointer flex items-center justify-between gap-3 text-left shadow-lg backdrop-blur-xl"
                  >
                    {/* Left: Server Icon & Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      {renderProviderLogo(currentServerTitle, activeStream?.serverLogo, 'w-12 h-12 sm:w-14 sm:h-14')}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            {activeStream?.movieName || activeStream?.title || currentMovie.title}
                          </span>
                          <span className="text-[10px] text-emerald-300 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25">
                            {currentQualityTitle}
                          </span>
                          {activeStream?.fileSize && (
                            <span className="text-[10px] text-neutral-300 font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                              {activeStream.fileSize}
                            </span>
                          )}
                        </div>

                        {/* Stream Tags / Specs snippet */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {currentStreamTags.slice(0, 4).map((tag) => (
                            <span
                              key={tag.id}
                              className={`text-[9px] px-1.5 py-0.2 rounded-md ${tag.className}`}
                            >
                              {tag.label}
                            </span>
                          ))}
                          {activeStream && (
                            <span className="text-[10px] text-neutral-400 font-light truncate max-w-[200px] sm:max-w-md">
                              {activeStream.specs || activeStream.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Switch Server Action & Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline text-xs font-semibold text-emerald-400">
                        {isDropdownOpen ? 'Close' : 'Switch Server'}
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-neutral-300">
                        {isDropdownOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expandable Dropdown Menu with Fluid Liquid Animation */}
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                        className="mt-2 w-full rounded-2xl bg-[#11131c]/95 border border-white/15 p-3 shadow-2xl backdrop-blur-2xl z-40 space-y-3"
                      >
                        {/* Header with Sources count and Filters toggle button */}
                        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>Available Sources</span>
                              <span className="px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 text-[11px] font-mono">
                                {filteredStreams.length}
                              </span>
                            </div>
                            <span className="hidden sm:inline-block text-[9px] font-bold text-emerald-300 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25">
                              ★ Ranked by Best
                            </span>
                          </div>

                          {/* Filter toggle button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!isFilterDropdownOpen) {
                                setPendingFilters(appliedFilters);
                              }
                              setIsFilterDropdownOpen((prev) => !prev);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border active:scale-[0.96] ${
                              isFilterDropdownOpen || activeFilterCount > 0
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-white/5 text-neutral-300 hover:text-white border-white/10'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                              <span className="w-4 h-4 rounded-full bg-emerald-400 text-black text-[10px] font-extrabold flex items-center justify-center">
                                {activeFilterCount}
                              </span>
                            )}
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isFilterDropdownOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>

                        {/* Expandable Filter Panel */}
                        <AnimatePresence>
                          {isFilterDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="overflow-hidden space-y-3 p-3 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md"
                            >
                              {/* 1. Provider Filter */}
                              <div className="space-y-1.5">
                                <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                                  <span>Provider / Addon</span>
                                  <span className="text-[10px] text-neutral-500">
                                    {availableProviders.length} detected
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar py-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((p) => ({ ...p, provider: 'All' }))
                                    }
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                      pendingFilters.provider === 'All'
                                        ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                                        : 'text-neutral-400 hover:text-white'
                                    }`}
                                  >
                                    All ({streams.length})
                                  </button>
                                  {availableProviders.map(({ name, count }) => {
                                    const isSelected = pendingFilters.provider === name;
                                    return (
                                      <button
                                        key={name}
                                        type="button"
                                        onClick={() =>
                                          setPendingFilters((p) => ({ ...p, provider: name }))
                                        }
                                        title={`${name} (${count} streams)`}
                                        className={`relative p-1 transition-all cursor-pointer flex flex-col items-center justify-center shrink-0 ${
                                          isSelected
                                            ? 'scale-110 opacity-100 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                                        }`}
                                      >
                                        {renderProviderLogo(name, undefined, 'w-10 h-10 sm:w-11 sm:h-11')}
                                        {isSelected && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shadow-sm shadow-emerald-400" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 2. Quality Filter */}
                              <div className="space-y-1.5">
                                <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                                  <span>Resolution / Quality</span>
                                  <span className="text-[10px] text-neutral-500">
                                    {availableQualities.length} detected
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((p) => ({ ...p, quality: 'All' }))
                                    }
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                                      pendingFilters.quality === 'All'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : 'bg-white/5 text-neutral-400 hover:text-white border-white/5'
                                    }`}
                                  >
                                    All ({streams.length})
                                  </button>
                                  {availableQualities.map(({ quality, count }) => {
                                    const isSelected = pendingFilters.quality === quality;
                                    return (
                                      <button
                                        key={quality}
                                        type="button"
                                        onClick={() =>
                                          setPendingFilters((p) => ({ ...p, quality }))
                                        }
                                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                                          isSelected
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                            : 'bg-white/5 text-neutral-400 hover:text-white border-white/5'
                                        }`}
                                      >
                                        <span>{quality}</span>
                                        <span className="ml-1 text-[10px] opacity-60">
                                          ({count})
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 3. Language Filter */}
                              <div className="space-y-1.5">
                                <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Languages className="w-3.5 h-3.5" />
                                    <span>Audio Language</span>
                                  </span>
                                  <span className="text-[10px] text-neutral-500">
                                    {availableLanguages.length} detected
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((p) => ({ ...p, language: 'All' }))
                                    }
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                                      pendingFilters.language === 'All'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : 'bg-white/5 text-neutral-400 hover:text-white border-white/5'
                                    }`}
                                  >
                                    All ({streams.length})
                                  </button>
                                  {availableLanguages.map(({ language, count }) => {
                                    const isSelected = pendingFilters.language === language;
                                    return (
                                      <button
                                        key={language}
                                        type="button"
                                        onClick={() =>
                                          setPendingFilters((p) => ({ ...p, language }))
                                        }
                                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                                          isSelected
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                            : 'bg-white/5 text-neutral-400 hover:text-white border-white/5'
                                        }`}
                                      >
                                        <span>{language}</span>
                                        <span className="ml-1 text-[10px] opacity-60">
                                          ({count})
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 4. Size Filter */}
                              <div className="space-y-1.5">
                                <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <HardDrive className="w-3.5 h-3.5" />
                                    <span>File Size</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((p) => ({ ...p, sizeRange: 'All' }))
                                    }
                                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                                      pendingFilters.sizeRange === 'All'
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : 'bg-white/5 text-neutral-400 hover:text-white border-white/5'
                                    }`}
                                  >
                                    All ({streams.length})
                                  </button>
                                  {availableSizeRanges.map(({ id, label, count }) => {
                                    const isSelected = pendingFilters.sizeRange === id;
                                    return (
                                      <button
                                        key={id}
                                        type="button"
                                        onClick={() =>
                                          setPendingFilters((p) => ({ ...p, sizeRange: id }))
                                        }
                                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                                          isSelected
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                            : 'bg-white/5 text-neutral-400 hover:text-white border-white/5'
                                        }`}
                                      >
                                        <span>{label}</span>
                                        <span className="ml-1 text-[10px] opacity-60">
                                          ({count})
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Footer Actions: Reset + Apply with Real-time Count */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                                <button
                                  type="button"
                                  onClick={() => setPendingFilters(DEFAULT_STREAM_FILTERS)}
                                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Reset</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (pendingMatchCount === 0) {
                                      setPendingFilters(DEFAULT_STREAM_FILTERS);
                                      setAppliedFilters(DEFAULT_STREAM_FILTERS);
                                      setIsFilterDropdownOpen(false);
                                    } else {
                                      setAppliedFilters(pendingFilters);
                                      setIsFilterDropdownOpen(false);
                                      showToast(
                                        'Filters Applied',
                                        `${pendingMatchCount} matching sources found`
                                      );
                                    }
                                  }}
                                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 active:scale-[0.97] transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                                >
                                  {pendingMatchCount > 0 ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      <span>
                                        Apply ({pendingMatchCount} source
                                        {pendingMatchCount === 1 ? '' : 's'} available)
                                      </span>
                                    </>
                                  ) : (
                                    <span>No sources match (Reset)</span>
                                  )}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Active Filters Chips Bar */}
                        {activeFilterCount > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap py-1 text-[11px]">
                            <span className="text-neutral-500 font-medium">Active:</span>
                            {appliedFilters.provider !== 'All' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                {renderProviderLogo(appliedFilters.provider, 'w-3.5 h-3.5')}
                                <span>{appliedFilters.provider}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedFilters((f) => ({ ...f, provider: 'All' }));
                                    setPendingFilters((f) => ({ ...f, provider: 'All' }));
                                  }}
                                  className="hover:text-white ml-0.5 cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            )}
                            {appliedFilters.quality !== 'All' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                <span>Quality: {appliedFilters.quality}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedFilters((f) => ({ ...f, quality: 'All' }));
                                    setPendingFilters((f) => ({ ...f, quality: 'All' }));
                                  }}
                                  className="hover:text-white ml-0.5 cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            )}
                            {appliedFilters.language !== 'All' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                <span>Audio: {appliedFilters.language}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedFilters((f) => ({ ...f, language: 'All' }));
                                    setPendingFilters((f) => ({ ...f, language: 'All' }));
                                  }}
                                  className="hover:text-white ml-0.5 cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            )}
                            {appliedFilters.sizeRange !== 'All' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                <span>Size: {appliedFilters.sizeRange}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedFilters((f) => ({ ...f, sizeRange: 'All' }));
                                    setPendingFilters((f) => ({ ...f, sizeRange: 'All' }));
                                  }}
                                  className="hover:text-white ml-0.5 cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedFilters(DEFAULT_STREAM_FILTERS);
                                setPendingFilters(DEFAULT_STREAM_FILTERS);
                              }}
                              className="text-neutral-400 hover:text-white underline ml-1 cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                        )}

                        {/* Stream List */}
                        <div className="max-h-80 overflow-y-auto hide-scrollbar space-y-2 pr-1">
                          {isLoadingStreams ? (
                            <div className="py-8 text-center text-xs text-neutral-400 flex flex-col items-center gap-2">
                              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              <span>Loading server streams...</span>
                            </div>
                          ) : filteredStreams.length > 0 ? (
                            filteredStreams.map((s, idx) => {
                              // Robust deterministic comparison to avoid multi-selection bug
                              const isSelected = activeStream?.id
                                ? activeStream.id === s.id
                                : activeStream?.name === s.name &&
                                  activeStream?.serverName === s.serverName &&
                                  activeStream?.fileSize === s.fileSize;
                              const tags = getStreamOrderedTags(s);
                              const isTopBest = idx === 0 && activeFilterCount === 0;

                              return (
                                <button
                                  key={s.id || `${s.name}_${idx}`}
                                  type="button"
                                  onClick={() => {
                                    setActiveStream(s);
                                    setIsDropdownOpen(false);
                                    showToast(
                                      `✨ Connected: ${s.quality || '4K'} Stream`,
                                      `${s.fileSize || 'Ultra High Definition'} • ${s.specs || ''}`
                                    );
                                  }}
                                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] relative overflow-hidden ${
                                    isSelected
                                      ? 'bg-emerald-500/15 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                                  }`}
                                >
                                  {/* Left Details: BIG Movie Name and Specs Badges */}
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-snug">
                                        {s.movieName || s.title || currentMovie.title}
                                      </h4>
                                      {isTopBest && (
                                        <span className="text-[9px] font-bold text-emerald-300 px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 shrink-0">
                                          ★ BEST
                                        </span>
                                      )}
                                    </div>

                                    {/* Badges: Quality, Source, HDR/Vision, Audio, Size, Languages, Subtitles */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {tags.map((t) => (
                                        <span
                                          key={t.id}
                                          className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-medium ${t.className}`}
                                        >
                                          {t.label}
                                        </span>
                                      ))}
                                      {s.languages && s.languages.length > 0 && (
                                        <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/25 text-blue-300 flex items-center gap-1 font-medium">
                                          <span>🎧</span>
                                          <span>Audio: {s.languages.join(', ')}</span>
                                        </span>
                                      )}
                                      {/* Subtitles: always prominently include English subtitles */}
                                      <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25 text-purple-300 flex items-center gap-1 font-medium">
                                        <span>💬</span>
                                        <span className="truncate max-w-[180px]">Subtitles: {s.subtitlesText || 'English'}</span>
                                      </span>
                                    </div>

                                    {/* Specs & Source Host line */}
                                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-light truncate">
                                      {s.specs && <span>{s.specs}</span>}
                                      {s.sourceHost && (
                                        <>
                                          <span className="text-neutral-600">•</span>
                                          <span className="text-neutral-300">Source: {s.sourceHost}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right side: Scaled-up Provider Logo (No borders, No pill, No name) & Selection Indicator */}
                                  <div className="shrink-0 flex items-center gap-3">
                                    {/* Branded provider logo - big & crisp, no border, no pill, no name */}
                                    {renderProviderLogo(s.serverName, s.serverLogo, 'w-14 h-14 sm:w-16 sm:h-16')}

                                    {/* Selected / Play indicator */}
                                    {isSelected ? (
                                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
                                        <Check className="w-4 h-4 stroke-[3]" />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 hover:text-white shrink-0">
                                        <Play className="w-3 h-3 fill-current ml-0.5" />
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            /* Fallback to high-speed CDN mirrors if no add-on stream */
                            <div className="space-y-1.5">
                              <div className="text-[11px] text-neutral-400 px-1">
                                Verified High-Speed Mirrors
                              </div>
                              {fallbackMirrors.map((srv) => (
                                <button
                                  key={srv.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveStream({
                                      name: srv.name,
                                      url: srv.url,
                                      quality: srv.quality,
                                      serverName: srv.name,
                                    });
                                    setIsDropdownOpen(false);
                                    showToast(`✨ Connected to ${srv.name}`, 'Verified High-Speed CDN');
                                  }}
                                  className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-left transition-all cursor-pointer flex items-center justify-between"
                                >
                                  <div>
                                    <div className="text-xs font-bold text-white">{srv.name}</div>
                                    <div className="text-[10px] text-neutral-400">{srv.tag}</div>
                                  </div>
                                  <span className="text-[10px] text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 font-bold">
                                    {srv.quality}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* ================= 3. ALL FILM INFORMATION BELOW DROPDOWN ================= */}
              <section className="space-y-6 pt-2">
                {/* Film Overview & Synopsis */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 space-y-3 backdrop-blur-xl">
                  {/* Meta Chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/10">
                      {currentMovie.releaseYear}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-neutral-300 border border-white/5">
                      {currentMovie.duration}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-neutral-300 border border-white/5">
                      {currentMovie.certification}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {currentMovie.score}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      {currentMovie.resolution}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {currentMovie.audioFormat}
                    </span>
                  </div>

                  {/* Title and Tagline */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow">
                      {currentMovie.title}
                    </h2>
                    {currentMovie.japaneseTitle && (
                      <p className="text-xs text-neutral-400 font-medium mt-0.5">
                        {currentMovie.japaneseTitle}
                      </p>
                    )}
                    {currentMovie.tagline && (
                      <p className="text-xs sm:text-sm text-neutral-300 italic font-light mt-1">
                        "{currentMovie.tagline}"
                      </p>
                    )}
                  </div>

                  {/* Synopsis */}
                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-light">
                    {currentMovie.synopsis}
                  </p>

                  {/* Genres Tags */}
                  {currentMovie.genres && currentMovie.genres.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {currentMovie.genres.map((g) => (
                        <span
                          key={g}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white/5 text-neutral-300 border border-white/10"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Episodes Switcher (if TV series or anime) */}
                {currentMovie.episodes && currentMovie.episodes.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>Episodes ({currentMovie.episodes.length})</span>
                      </h3>
                      <span className="text-xs text-neutral-400">
                        Current: EP {episodeNumber}
                      </span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                      {currentMovie.episodes.map((ep, idx) => {
                        const isCurrent = currentEpisodeIndex === idx;
                        return (
                          <button
                            key={ep.id}
                            type="button"
                            onClick={() => {
                              setCurrentEpisodeIndex(idx);
                              showToast(`Loading Episode ${ep.number}`, ep.title || 'Switching stream...');
                            }}
                            className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border active:scale-[0.96] ${
                              isCurrent
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md'
                                : 'bg-white/5 text-neutral-300 hover:text-white border-white/5'
                            }`}
                          >
                            EP {ep.number}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Production Team & Key Crew */}
                {currentMovie.productionTeam && (
                  <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 space-y-3 backdrop-blur-xl">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clapperboard className="w-4 h-4 text-emerald-400" />
                      <span>Production Team</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Director */}
                      {currentMovie.productionTeam.director && (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                            Director
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                            {currentMovie.productionTeam.director}
                          </div>
                        </div>
                      )}

                      {/* Screenplay / Writers */}
                      {currentMovie.productionTeam.writers && currentMovie.productionTeam.writers.length > 0 && (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                            Screenplay & Writers
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-neutral-200 mt-0.5">
                            {currentMovie.productionTeam.writers.join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Producers */}
                      {currentMovie.productionTeam.producers && currentMovie.productionTeam.producers.length > 0 && (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                            Producers
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-neutral-200 mt-0.5">
                            {currentMovie.productionTeam.producers.join(', ')}
                          </div>
                        </div>
                      )}

                      {/* Cinematographer */}
                      {currentMovie.productionTeam.cinematographer && (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                            Cinematography
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-neutral-200 mt-0.5">
                            {currentMovie.productionTeam.cinematographer}
                          </div>
                        </div>
                      )}

                      {/* Music Composer */}
                      {currentMovie.productionTeam.composer && (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                            Original Score & Music
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-neutral-200 mt-0.5">
                            {currentMovie.productionTeam.composer}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Financials & Box Office */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 space-y-3 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Financials & Studio Production</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Budget */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Budget
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                        {formatCurrency(currentMovie.budget) || 'Classified / Auteur'}
                      </div>
                    </div>

                    {/* Revenue / Box Office */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Worldwide Box Office
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                        {currentMovie.boxOffice || formatCurrency(currentMovie.revenue) || 'High Premiere Return'}
                      </div>
                    </div>

                    {/* Production Countries */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Country
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-neutral-200 mt-0.5 truncate">
                        {currentMovie.productionCountries && currentMovie.productionCountries.length > 0
                          ? currentMovie.productionCountries.join(', ')
                          : 'United States'}
                      </div>
                    </div>

                    {/* Spoken Languages */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Languages
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-neutral-200 mt-0.5 truncate">
                        {currentMovie.spokenLanguages && currentMovie.spokenLanguages.length > 0
                          ? currentMovie.spokenLanguages.join(', ')
                          : 'English (Dolby Atmos)'}
                      </div>
                    </div>
                  </div>

                  {/* Production Companies */}
                  {currentMovie.productionCompaniesList && currentMovie.productionCompaniesList.length > 0 && (
                    <div className="pt-2">
                      <div className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold mb-2">
                        Production Studios & Partners
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {currentMovie.productionCompaniesList.map((comp) => (
                          <div
                            key={comp.name}
                            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2"
                          >
                            {comp.logoUrl && (
                              <img
                                src={comp.logoUrl}
                                alt={comp.name}
                                className="h-3.5 max-w-[50px] object-contain filter invert brightness-200"
                              />
                            )}
                            <span className="text-xs font-semibold text-neutral-200">{comp.name}</span>
                            {comp.country && (
                              <span className="text-[9px] text-neutral-400 font-mono">
                                ({comp.country})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actors & Cast */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 space-y-3 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Top Cast & Actors</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {(currentMovie.castDetailed && currentMovie.castDetailed.length > 0
                      ? currentMovie.castDetailed.slice(0, 12)
                      : currentMovie.cast.map((name) => ({ name, character: 'Cast' }))
                    ).map((actor, idx) => (
                      <div
                        key={`${actor.name}_${idx}`}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5"
                      >
                        {actor.profileUrl ? (
                          <img
                            src={actor.profileUrl}
                            alt={actor.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center shrink-0 text-xs font-bold text-neutral-300">
                            {actor.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{actor.name}</div>
                          <div className="text-[10px] text-neutral-400 truncate">
                            {actor.character || 'Cast'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Critical Reception & Awards */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.03] border border-white/10 space-y-3 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Ratings & Awards</span>
                  </h3>

                  {/* Ratings chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentMovie.ratingsDetailed && currentMovie.ratingsDetailed.length > 0 ? (
                      currentMovie.ratingsDetailed.map((r) => (
                        <div
                          key={r.source}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2"
                        >
                          <span className="text-[11px] text-neutral-400 font-medium">{r.source}:</span>
                          <span className="text-xs font-bold text-white">{r.value}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400 font-medium">Audience Score:</span>
                        <span className="text-xs font-bold text-emerald-400">{currentMovie.score} / 10</span>
                      </div>
                    )}
                  </div>

                  {/* Awards Summary */}
                  {currentMovie.awards && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs font-medium flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{currentMovie.awards}</span>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
};
