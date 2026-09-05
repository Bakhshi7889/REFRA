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
  getStreamBytes,
  parseStreamSpecBadges,
  generateFallbackStreams,
} from '../utils/streamHelpers';
import { ProviderLogo } from './ProviderLogo';

export interface StreamFilters {
  provider: string; // 'All' | provider name
  quality: string;  // 'All' | '4K' | '1080p' | '720p'
  language: string; // 'All' | language name
  sizeRange: string;// 'All' | '<5GB' | '5-15GB' | '15-30GB' | '>30GB'
}

export const DEFAULT_STREAM_FILTERS: StreamFilters = {
  provider: 'PenguPlay',
  quality: 'All',
  language: 'All',
  sizeRange: 'All',
};

export const renderProviderLogo = (
  serverName: string | undefined,
  logoUrl?: string,
  sizeClass = 'w-10 h-10'
) => {
  return <ProviderLogo serverName={serverName} logoUrl={logoUrl} className={sizeClass} />;
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

  // Floating Toast Notification (Disabled per user request)
  const showToast = useCallback((_title: string, _subtitle?: string) => {
    // Disabled per user request: no toast notifications
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
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          return res.json();
        }
        return Promise.reject(new Error('Streams API unavailable or returned non-JSON'));
      })
      .then((data) => {
        if (isCancelled) return;
        let list: StreamItem[] = Array.isArray(data.streams) && data.streams.length > 0
          ? data.streams
          : generateFallbackStreams(movie, currentEpisodeIndex);
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
          // AUTO-SELECT THE BEST STREAM (Prioritize default PenguPlay)
          const penguList = list.filter((s) => (s.serverName || '').toLowerCase().includes('pengu'));
          const candidates = penguList.length > 0 ? penguList : list;
          const ranked = [...candidates].sort((a, b) => computeStreamScore(b) - computeStreamScore(a));
          const best = ranked[0];
          setActiveStream(best);
          showToast(
            `✨ Auto-selected best stream: ${best.serverName || 'PenguPlay'}`,
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
        console.warn('Streams fetch error, activating high-speed direct stream pipeline:', err);
        const list = generateFallbackStreams(movie, currentEpisodeIndex);
        setStreams(list);
        setIsLoadingStreams(false);
        if (selectedStream) {
          setActiveStream(selectedStream);
        } else if (list.length > 0) {
          const penguList = list.filter((s) => (s.serverName || '').toLowerCase().includes('pengu'));
          const candidates = penguList.length > 0 ? penguList : list;
          const ranked = [...candidates].sort((a, b) => computeStreamScore(b) - computeStreamScore(a));
          const best = ranked[0];
          setActiveStream(best);
          showToast(
            `✨ Auto-selected best stream: ${best.serverName || 'PenguPlay'}`,
            `${best.quality || '4K'} • ${best.fileSize || 'Ultra Bitrate'}`
          );
        } else {
          const defaultMirror = fallbackMirrors[0];
          setActiveStream(null);
          showToast(`⚡ Auto-connected to ${defaultMirror.name}`, 'Verified High-Speed CDN');
        }
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

  // Mouse idle auto-hide for desktop / tablet
  const [isMouseIdle, setIsMouseIdle] = useState(false);
  const mouseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = useCallback(() => {
    setIsMouseIdle(false);
    if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current);
    mouseTimerRef.current = setTimeout(() => {
      setIsMouseIdle(true);
    }, 2500);
  }, []);

  // Keyboard navigation & playback controls (Space, Esc, Arrows, F, M, N, S)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            onClose();
          }
          break;

        case ' ': // Space: Play/Pause
          e.preventDefault();
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play().catch(() => {});
            } else {
              videoRef.current.pause();
            }
          }
          break;

        case 'ArrowLeft': // Seek back 10s
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          }
          break;

        case 'ArrowRight': // Seek forward 10s
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.duration || 99999,
              videoRef.current.currentTime + 10
            );
          }
          break;

        case 'ArrowUp': // Volume +10%
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1);
          }
          break;

        case 'ArrowDown': // Volume -10%
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1);
          }
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
          }
          break;

        case 'n':
        case 'N':
          if (movie?.episodes && currentEpisodeIndex < movie.episodes.length - 1) {
            e.preventDefault();
            setCurrentEpisodeIndex((prev) => prev + 1);
          }
          break;

        case 's':
        case 'S':
          e.preventDefault();
          setIsDropdownOpen((prev) => !prev);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current);
    };
  }, [isOpen, isFullscreen, toggleFullscreen, onClose, movie, currentEpisodeIndex]);

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

  const currentMovie = detailedMovie || movie;
  const currentServerTitle = activeStream?.serverName || 'PenguPlay';
  const currentQualityTitle = activeStream?.quality || '4K';

  const activeSpecBadges = useMemo(() => {
    if (activeStream) {
      return parseStreamSpecBadges(activeStream, 6);
    }
    return [
      { id: 'res', label: currentQualityTitle || '4K', isBest: true },
      { id: 'src', label: 'WEB-DL', isBest: false },
      { id: 'hdr', label: 'HDR10+', isBest: true },
      { id: '10b', label: '10bit', isBest: true },
      { id: 'size', label: '8.95 GB', isBest: false },
    ];
  }, [activeStream, currentQualityTitle]);

  if (!isOpen || !movie || !currentMovie) return null;

  return (
    <AnimatePresence>
      <div
        ref={containerRef}
        className={`fixed inset-0 z-[75] text-white flex flex-col select-none overflow-hidden overscroll-none ${
          isRotatedLandscape
            ? 'rotate-90 origin-center w-[100dvh] h-[100dvw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            : 'w-full h-full'
        }`}
      >
        {/* ================= ATMOSPHERIC MOVIE ARTWORK AMBIENT BACKDROP BLUR ================= */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden z-0"
          style={{ transform: 'translateZ(0)' }}
        >
          {currentMovie.backdropUrl && (
            <img
              src={getBackdropUrl(currentMovie.backdropUrl, 'w1280', currentMovie.posterUrl)}
              alt=""
              className="w-full h-full object-cover filter blur-3xl scale-110 opacity-30 brightness-75"
              style={{ willChange: 'transform' }}
            />
          )}
          <div className="absolute inset-0 bg-[#08090d]/85" />
        </div>

        {/* ================= FLOATING BACK BUTTON WITH SIGNATURE BLUR ================= */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Back"
            title="Back (Esc)"
            className="fixed top-4 left-4 z-50 w-11 h-11 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md flex items-center justify-center text-white transition-all duration-200 cursor-pointer active:scale-95 shadow-2xl group"
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
          </button>
        )}

        {/* ================= MAIN SCROLLABLE STREAMING PAGE CONTENT ================= */}
        <div
          onMouseMove={handleMouseMove}
          className={`relative z-10 flex-1 overflow-y-auto hide-scrollbar overscroll-contain ${
            isFullscreen
              ? 'p-0 flex items-center justify-center'
              : 'px-3 sm:px-6 lg:px-8 pt-16 pb-14 space-y-6 max-w-6xl mx-auto w-full'
          } ${isMouseIdle ? 'cursor-none' : ''}`}
        >
          {/* ================= 1. SIGNATURE BIG IMAGE FIRST / VIDEO PLAYER STAGE ================= */}
          <section
            onDoubleClick={handleDoubleTap}
            className={`relative mx-auto overflow-hidden bg-black/90 shadow-2xl ${
              isFullscreen
                ? 'w-full h-full rounded-none'
                : 'w-full aspect-[16/9] max-h-[62vh] rounded-2xl sm:rounded-3xl'
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
              /* Big Movie Artwork Hero when loading / connecting */
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <img
                  src={getBackdropUrl(currentMovie.backdropUrl, 'w1280', currentMovie.posterUrl)}
                  alt={currentMovie.title}
                  className="absolute inset-0 w-full h-full object-cover filter blur-xs scale-105 opacity-60"
                />
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />

                <div className="relative z-10 flex flex-col items-center text-center p-6 space-y-3 max-w-sm">
                  <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center animate-pulse shadow-lg">
                    <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white drop-shadow">
                      {isLoadingStreams ? 'Finding Best 4K Stream...' : 'Connecting to Stream...'}
                    </h3>
                    <p className="text-xs text-neutral-300 mt-1 font-light">
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
                className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-xl"
                title="Exit Fullscreen"
              >
                <Minimize className="w-5 h-5" />
              </button>
            )}
          </section>

          {/* If NOT in fullscreen: Render Responsive 2-Column Grid Layout for PC & Tablet */}
          {!isFullscreen && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ================= LEFT COLUMN: SERVER SELECTOR & MOVIE DETAILS (lg:col-span-8) ================= */}
              <div className="lg:col-span-8 space-y-6">
                {/* 2. DROP-DOWN SERVER SELECTOR */}
                <div className="w-full rounded-2xl sm:rounded-3xl bg-white/[0.04] overflow-hidden shadow-xl backdrop-blur-xl transition-colors duration-200">
                  {/* Dropdown Trigger Card */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsDropdownOpen((prev) => !prev);
                      }
                    }}
                    className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-2.5 text-left cursor-pointer hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors select-none"
                  >
                    {/* Left: Server Icon & Details */}
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
                      <ProviderLogo
                        serverName={currentServerTitle}
                        logoUrl={activeStream?.serverLogo}
                        className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate leading-snug">
                            {activeStream?.movieName || activeStream?.title || currentMovie.title}
                          </h3>
                        </div>

                        {/* Squircle pills with sharp curved edges and gap */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {activeSpecBadges.map((badge) => (
                            <span
                              key={badge.id}
                              className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] sm:text-[11px] font-mono tracking-tight rounded-[4px] select-none whitespace-nowrap ${
                                badge.isBest
                                  ? 'bg-white text-black font-bold border border-white shadow-xs'
                                  : 'bg-transparent text-white font-medium border border-white/40'
                              }`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Switch Server Action & Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline text-xs font-semibold text-neutral-300">
                        {isDropdownOpen ? 'Close' : 'Switch Server'}
                      </span>
                      <div className="w-7 h-7 rounded-[6px] bg-white/10 flex items-center justify-center text-neutral-300">
                        {isDropdownOpen ? (
                          <ChevronUp className="w-4 h-4 text-white" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Dropdown Menu with GPU-accelerated transforms */}
                  <AnimatePresence initial={false}>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scaleY: 0.95, y: -6 }}
                        animate={{ opacity: 1, scaleY: 1, y: 0 }}
                        exit={{ opacity: 0, scaleY: 0.95, y: -6 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        style={{ transformOrigin: 'top', willChange: 'transform, opacity' }}
                        className="overflow-hidden bg-black/40 backdrop-blur-xl"
                      >
                        <div className="p-3 sm:p-3.5 space-y-3 bg-black/20">
                        {/* Top Quick Server Mode Toggle: PenguPlay (Default) vs All Sources */}
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedFilters((f) => ({ ...f, provider: 'PenguPlay' }));
                              setPendingFilters((f) => ({ ...f, provider: 'PenguPlay' }));
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              appliedFilters.provider.toLowerCase().includes('pengu')
                                ? 'bg-white text-black shadow-sm'
                                : 'text-neutral-300 hover:text-white'
                            }`}
                          >
                            <ProviderLogo serverName="PenguPlay" className="w-4 h-4 shrink-0" />
                            <span>PenguPlay</span>
                            <span className="text-[10px] opacity-75">(Default)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAppliedFilters((f) => ({ ...f, provider: 'All' }));
                              setPendingFilters((f) => ({ ...f, provider: 'All' }));
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              appliedFilters.provider === 'All'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-neutral-300 hover:text-white'
                            }`}
                          >
                            <Layers className="w-4 h-4 shrink-0" />
                            <span>All Sources</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                appliedFilters.provider === 'All'
                                  ? 'bg-black/15 text-black'
                                  : 'bg-white/10 text-neutral-300'
                              }`}
                            >
                              {streams.length}
                            </span>
                          </button>
                        </div>

                        {/* Header with Sources count and Filters toggle button */}
                        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>Available Sources</span>
                              <span className="px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 text-[11px] font-mono">
                                {filteredStreams.length}
                              </span>
                            </div>
                            <span className="hidden sm:inline-block text-[9px] font-bold text-white px-2 py-0.5 rounded-md bg-white/10">
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
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.96] ${
                              isFilterDropdownOpen || activeFilterCount > 0
                                ? 'bg-white/20 text-white'
                                : 'bg-white/5 text-neutral-300 hover:text-white'
                            }`}
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                              <span className="w-4 h-4 rounded-full bg-white text-black text-[10px] font-extrabold flex items-center justify-center">
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
                              initial={{ opacity: 0, scaleY: 0.94, y: -4 }}
                              animate={{ opacity: 1, scaleY: 1, y: 0 }}
                              exit={{ opacity: 0, scaleY: 0.94, y: -4 }}
                              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                              style={{ transformOrigin: 'top', willChange: 'transform, opacity' }}
                              className="overflow-hidden space-y-3 p-3 rounded-xl bg-black/40 backdrop-blur-md"
                            >
                              {/* 1. Provider Filter */}
                              <div className="space-y-1.5">
                                <div className="text-xs font-bold text-neutral-200 flex items-center justify-between">
                                  <span className="font-bold">Provider / Addon</span>
                                  <span className="text-[10px] font-bold text-neutral-400">
                                    {availableProviders.length} detected
                                  </span>
                                </div>
                                <div className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar py-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((p) => ({ ...p, provider: 'All' }))
                                    }
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex flex-col items-center justify-center shrink-0 min-w-[64px] border ${
                                      pendingFilters.provider === 'All'
                                        ? 'bg-white/20 text-white font-bold border-white/35 shadow-sm'
                                        : 'bg-white/5 text-neutral-300 hover:text-white font-bold border-white/10'
                                    }`}
                                  >
                                    <span className="font-bold">All</span>
                                    <span className="text-[10px] font-bold text-neutral-400">({streams.length})</span>
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
                                        className={`relative p-2 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center shrink-0 min-w-[76px] border active:scale-95 ${
                                          isSelected
                                            ? 'bg-white/20 border-white/40 scale-105 opacity-100 shadow-md drop-shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                                            : 'bg-white/5 border-white/10 opacity-80 hover:opacity-100 hover:scale-102'
                                        }`}
                                      >
                                        <ProviderLogo serverName={name} className="w-10 h-10 sm:w-11 sm:h-11" />
                                        <span className={`text-[11px] font-bold mt-1.5 text-center truncate max-w-[80px] leading-tight ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                                          {name}
                                        </span>
                                        <span className="text-[10px] font-bold text-neutral-400 mt-0.5">
                                          ({count})
                                        </span>
                                        {isSelected && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-white mt-1 shadow-sm shadow-white" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 2. Quality Filter */}
                              <div className="space-y-1.5">
                                <div className="text-xs font-bold text-neutral-200 flex items-center justify-between">
                                  <span className="font-bold">Resolution / Quality</span>
                                  <span className="text-[10px] font-bold text-neutral-400">
                                    {availableQualities.length} detected
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((p) => ({ ...p, quality: 'All' }))
                                    }
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                                      pendingFilters.quality === 'All'
                                        ? 'bg-white/20 text-white border-white/40 font-bold'
                                        : 'bg-white/5 text-neutral-300 hover:text-white border-white/10 font-bold'
                                    }`}
                                  >
                                    <span className="font-bold">All</span>
                                    <span className="ml-1 text-[10px] font-bold opacity-75">({streams.length})</span>
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
                                        className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                                          isSelected
                                            ? 'bg-white/20 text-white border-white/40 font-bold'
                                            : 'bg-white/5 text-neutral-300 hover:text-white border-white/10 font-bold'
                                        }`}
                                      >
                                        <span className="font-bold">{quality}</span>
                                        <span className="ml-1 text-[10px] font-bold opacity-75">
                                          ({count})
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 3. Language Filter */}
                              <div className="space-y-1.5">
                                <div className="text-xs font-bold text-neutral-200 flex items-center justify-between">
                                  <span className="flex items-center gap-1 font-bold">
                                    <Languages className="w-3.5 h-3.5" />
                                    <span className="font-bold">Audio Language</span>
                                  </span>
                                  <span className="text-[10px] font-bold text-neutral-400">
                                    {availableLanguages.length} detected
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((p) => ({ ...p, language: 'All' }))
                                    }
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                                      pendingFilters.language === 'All'
                                        ? 'bg-white/20 text-white border-white/40 font-bold'
                                        : 'bg-white/5 text-neutral-300 hover:text-white border-white/10 font-bold'
                                    }`}
                                  >
                                    <span className="font-bold">All</span>
                                    <span className="ml-1 text-[10px] font-bold opacity-75">({streams.length})</span>
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
                                        className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                                          isSelected
                                            ? 'bg-white/20 text-white border-white/40 font-bold'
                                            : 'bg-white/5 text-neutral-300 hover:text-white border-white/10 font-bold'
                                        }`}
                                      >
                                        <span className="font-bold">{language}</span>
                                        <span className="ml-1 text-[10px] font-bold opacity-75">
                                          ({count})
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 4. Size Filter */}
                              <div className="space-y-1.5">
                                <div className="text-xs font-bold text-neutral-200 flex items-center justify-between">
                                  <span className="flex items-center gap-1 font-bold">
                                    <HardDrive className="w-3.5 h-3.5" />
                                    <span className="font-bold">File Size</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPendingFilters((p) => ({ ...p, sizeRange: 'All' }))
                                    }
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                                      pendingFilters.sizeRange === 'All'
                                        ? 'bg-white/20 text-white border-white/40 font-bold'
                                        : 'bg-white/5 text-neutral-300 hover:text-white border-white/10 font-bold'
                                    }`}
                                  >
                                    <span className="font-bold">All</span>
                                    <span className="ml-1 text-[10px] font-bold opacity-75">({streams.length})</span>
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
                                        className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                                          isSelected
                                            ? 'bg-white/20 text-white border-white/40 font-bold'
                                            : 'bg-white/5 text-neutral-300 hover:text-white border-white/10 font-bold'
                                        }`}
                                      >
                                        <span className="font-bold">{label}</span>
                                        <span className="ml-1 text-[10px] font-bold opacity-75">
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
                                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-neutral-200 active:scale-[0.97] transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
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
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-neutral-100 font-bold">
                                <ProviderLogo serverName={appliedFilters.provider} className="w-3.5 h-3.5" />
                                <span className="font-bold">{appliedFilters.provider}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedFilters((f) => ({ ...f, provider: 'All' }));
                                    setPendingFilters((f) => ({ ...f, provider: 'All' }));
                                  }}
                                  className="hover:text-white ml-0.5 cursor-pointer font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            )}
                            {appliedFilters.quality !== 'All' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-neutral-100 font-bold">
                                <span className="font-bold">Quality: {appliedFilters.quality}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedFilters((f) => ({ ...f, quality: 'All' }));
                                    setPendingFilters((f) => ({ ...f, quality: 'All' }));
                                  }}
                                  className="hover:text-white ml-0.5 cursor-pointer font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            )}
                            {appliedFilters.language !== 'All' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-neutral-100 font-bold">
                                <span className="font-bold">Audio: {appliedFilters.language}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedFilters((f) => ({ ...f, language: 'All' }));
                                    setPendingFilters((f) => ({ ...f, language: 'All' }));
                                  }}
                                  className="hover:text-white ml-0.5 cursor-pointer font-bold"
                                >
                                  ×
                                </button>
                              </span>
                            )}
                            {appliedFilters.sizeRange !== 'All' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/20 text-neutral-100 font-bold">
                                <span className="font-bold">Size: {appliedFilters.sizeRange}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAppliedFilters((f) => ({ ...f, sizeRange: 'All' }));
                                    setPendingFilters((f) => ({ ...f, sizeRange: 'All' }));
                                  }}
                                  className="hover:text-white ml-0.5 cursor-pointer font-bold"
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
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

                              const specBadges = parseStreamSpecBadges(s, 6);

                              return (
                                <div
                                  key={s.id || `${s.name}_${idx}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    setActiveStream(s);
                                    setIsDropdownOpen(false);
                                    showToast(
                                      `Connected: ${s.quality || '4K'} Stream`,
                                      `${s.fileSize || 'UHD'} • ${s.specs || ''}`
                                    );
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setActiveStream(s);
                                      setIsDropdownOpen(false);
                                    }
                                  }}
                                  className={`w-full p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.99] relative overflow-hidden select-none ${
                                    isSelected
                                      ? 'bg-white/10 border-white/40 shadow-lg shadow-black/40'
                                      : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10'
                                  }`}
                                >
                                  {/* Left Details: BIG Movie Name and Squircle Specs Badges (min-w-0 flex-1 pr-2 prevents overlapping) */}
                                  <div className="min-w-0 flex-1 pr-2 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate leading-snug">
                                        {s.movieName || s.title || currentMovie.title}
                                      </h4>
                                    </div>

                                    {/* Specs Badges: Sharp curved edges (rounded-[4px]), full white back for best, gap in between */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {specBadges.map((badge) => (
                                        <span
                                          key={badge.id}
                                          className={`inline-flex items-center justify-center px-2 py-0.5 text-[10px] sm:text-[11px] font-mono tracking-tight rounded-[4px] select-none whitespace-nowrap ${
                                            badge.isBest
                                              ? 'bg-white text-black font-bold border border-white shadow-xs'
                                              : 'bg-transparent text-white font-medium border border-white/40'
                                          }`}
                                        >
                                          {badge.label}
                                        </span>
                                      ))}
                                    </div>

                                    {/* Optional Source Host */}
                                    {s.sourceHost && (
                                      <div className="text-[10px] sm:text-[11px] text-neutral-400 font-light truncate">
                                        <span>Source: {s.sourceHost}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Right side: Provider Logo & Selection Checkmark ONLY (NO play icon) */}
                                  <div className="shrink-0 flex items-center gap-2">
                                    <ProviderLogo
                                      serverName={s.serverName}
                                      logoUrl={s.serverLogo}
                                      className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
                                    />

                                    {isSelected && (
                                      <div className="w-6 h-6 rounded-[5px] bg-white text-black flex items-center justify-center font-bold shrink-0 shadow-md">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </div>
                                    )}
                                  </div>
                                </div>
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
                                    showToast(`Connected to ${srv.name}`, 'Verified High-Speed CDN');
                                  }}
                                  className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 text-left transition-all cursor-pointer flex items-center justify-between"
                                >
                                  <div>
                                    <div className="text-xs font-bold text-white">{srv.name}</div>
                                    <div className="text-[10px] text-neutral-400">{srv.tag}</div>
                                  </div>
                                  <span className="text-[10px] text-white px-2 py-0.5 rounded-[4px] bg-white/10 border border-white/15 font-bold">
                                    {srv.quality}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Film Overview & Synopsis */}
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/[0.04] space-y-3.5 backdrop-blur-xl">
                  {/* Meta Chips - Clean Monochrome Signature */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white">
                      {currentMovie.releaseYear}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-neutral-300">
                      {currentMovie.duration}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-neutral-300">
                      {currentMovie.certification}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white text-black flex items-center gap-1">
                      <Star className="w-3 h-3 fill-black text-black" />
                      {currentMovie.score}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white font-mono">
                      {currentMovie.resolution}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-neutral-200">
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
                          className="px-2.5 py-1 rounded-xl text-[11px] font-medium bg-white/5 text-neutral-300"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Production Team & Key Crew */}
                {currentMovie.productionTeam && (
                  <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/[0.04] space-y-3.5 backdrop-blur-xl">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clapperboard className="w-4 h-4 text-white" />
                      <span>Production Team</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Director */}
                      {currentMovie.productionTeam.director && (
                        <div className="p-3 rounded-xl bg-white/[0.02]">
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
                        <div className="p-3 rounded-xl bg-white/[0.02]">
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
                        <div className="p-3 rounded-xl bg-white/[0.02]">
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
                        <div className="p-3 rounded-xl bg-white/[0.02]">
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
                        <div className="p-3 rounded-xl bg-white/[0.02]">
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

                {/* Actors & Cast */}
                <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/[0.04] space-y-3.5 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-white" />
                    <span>Top Cast & Actors</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {(currentMovie.castDetailed && currentMovie.castDetailed.length > 0
                      ? currentMovie.castDetailed.slice(0, 12)
                      : currentMovie.cast.map((name) => ({ name, character: 'Cast' }))
                    ).map((actor, idx) => (
                      <div
                        key={`${actor.name}_${idx}`}
                        className="p-2.5 rounded-xl bg-white/[0.02] flex items-center gap-2.5"
                      >
                        {actor.profileUrl ? (
                          <img
                            src={actor.profileUrl}
                            alt={actor.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0 text-xs font-bold text-neutral-300">
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
              </div>

              {/* ================= RIGHT COLUMN: EPISODES & MEDIA SPECS (lg:col-span-4) ================= */}
              <div className="lg:col-span-4 space-y-6">
                {/* Episodes Switcher (if TV series or anime) */}
                {currentMovie.episodes && currentMovie.episodes.length > 0 && (
                  <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.04] space-y-3 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-white" />
                        <span>Episodes ({currentMovie.episodes.length})</span>
                      </h3>
                      <span className="text-xs text-neutral-400">
                        Current: EP {episodeNumber}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto hide-scrollbar py-1">
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
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-[0.96] text-center ${
                              isCurrent
                                ? 'bg-white text-black font-bold shadow-md'
                                : 'bg-white/5 text-neutral-300 hover:text-white'
                            }`}
                          >
                            EP {ep.number}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Film Specs Card */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.04] space-y-3.5 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Film className="w-4 h-4 text-white" />
                    <span>Media Details</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Release Year
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        {currentMovie.releaseYear}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Runtime
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        {currentMovie.duration}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Rating / Cert
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        {currentMovie.certification}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Resolution
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5 font-mono">
                        {currentMovie.resolution}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financials & Studio Production */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.04] space-y-3.5 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-white" />
                    <span>Financials & Origin</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Budget */}
                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Budget
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        {formatCurrency(currentMovie.budget) || 'Classified / Auteur'}
                      </div>
                    </div>

                    {/* Revenue / Box Office */}
                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                        Box Office
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                        {currentMovie.boxOffice || formatCurrency(currentMovie.revenue) || 'High Premiere Return'}
                      </div>
                    </div>

                    {/* Production Countries */}
                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
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
                    <div className="p-2.5 rounded-xl bg-white/[0.02]">
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
                        Production Studios
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {currentMovie.productionCompaniesList.map((comp) => (
                          <div
                            key={comp.name}
                            className="px-2.5 py-1 rounded-xl bg-white/[0.04] flex items-center gap-1.5"
                          >
                            {comp.logoUrl && (
                              <img
                                src={comp.logoUrl}
                                alt={comp.name}
                                className="h-3 max-w-[44px] object-contain filter invert brightness-200"
                              />
                            )}
                            <span className="text-[11px] font-semibold text-neutral-200">{comp.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Critical Reception & Awards */}
                <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/[0.04] space-y-3.5 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-white" />
                    <span>Ratings & Awards</span>
                  </h3>

                  {/* Ratings chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {currentMovie.ratingsDetailed && currentMovie.ratingsDetailed.length > 0 ? (
                      currentMovie.ratingsDetailed.map((r) => (
                        <div
                          key={r.source}
                          className="px-3 py-1.5 rounded-xl bg-white/[0.04] flex items-center gap-2"
                        >
                          <span className="text-[11px] text-neutral-400 font-medium">{r.source}:</span>
                          <span className="text-xs font-bold text-white">{r.value}</span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400 font-medium">Audience Score:</span>
                        <span className="text-xs font-bold text-white">{currentMovie.score} / 10</span>
                      </div>
                    )}
                  </div>

                  {/* Awards Summary */}
                  {currentMovie.awards && (
                    <div className="p-3 rounded-xl bg-white/[0.04] text-neutral-200 text-xs font-medium flex items-center gap-2">
                      <Award className="w-4 h-4 text-white shrink-0" />
                      <span>{currentMovie.awards}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
};
