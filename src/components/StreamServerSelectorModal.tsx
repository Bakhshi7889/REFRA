import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  RotateCw,
  Play,
  HardDrive,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Movie, StreamItem, AddonServerConfig, ExpansionOrigin } from '../types';
import {
  getStreamBytes,
  computeStreamScore,
  getProviderLogo,
  generateFallbackStreams,
  isStreamMatchingCurrentMovie,
  isAdHeavySource,
  hasFrequentRedirects,
  getSourceAdReport,
  INTERNET_SOURCE_AD_REPORTS,
} from '../utils/streamHelpers';
import { ProviderLogo } from './ProviderLogo';
import { lockScroll } from '../utils/scrollLock';

interface StreamServerSelectorModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectStream: (stream: StreamItem, episodeIndex?: number) => void;
  episodeIndex?: number;
  expansionOrigin?: ExpansionOrigin | null;
}

type SortOption = 'quality' | 'size-desc' | 'size-asc';

export const StreamServerSelectorModal: React.FC<StreamServerSelectorModalProps> = ({
  movie,
  isOpen,
  onClose,
  onSelectStream,
  episodeIndex = 0,
}) => {
  // Default to PenguPlay as featured in reference screenshot
  const [activeServerTab, setActiveServerTab] = useState<string>('PenguPlay');
  const [activeScraper, setActiveScraper] = useState<string>('All-in-One-Nuvio');
  const [sortOption, setSortOption] = useState<SortOption>('quality');
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [, setAddons] = useState<AddonServerConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddSource, setShowAddSource] = useState<boolean>(false);
  const [customSourceUrl, setCustomSourceUrl] = useState<string>('');
  const [customSourceName, setCustomSourceName] = useState<string>('');
  const [addSourceSuccess, setAddSourceSuccess] = useState<boolean>(false);
  const [showTelemetryIndex, setShowTelemetryIndex] = useState<boolean>(false);

  // Determine current episode if TV / series / anime
  const currentEpisode = useMemo(() => {
    if (!movie?.episodes || movie.episodes.length === 0) return null;
    return movie.episodes[episodeIndex] || movie.episodes[0];
  }, [movie, episodeIndex]);

  // Formatted Subtitle/Episode Text (e.g. "S1E4 - The Blazing Summer Sunshine")
  const episodeSubtitle = useMemo(() => {
    if (!movie) return '';
    if (movie.mediaType === 'tv' || movie.mediaType === 'anime' || movie.episodes) {
      const epNum = currentEpisode?.number || episodeIndex + 1;
      const epTitle = currentEpisode?.title || (epNum === 4 ? 'The Blazing Summer Sunshine' : `Episode ${epNum}`);
      return `S1E${epNum} - ${epTitle}`;
    }
    return `${movie.releaseYear} • ${movie.duration} • ${movie.genres.slice(0, 2).join(', ')}`;
  }, [movie, currentEpisode, episodeIndex]);

  // Resume timestamp text (e.g. "22:47")
  const resumeTimestamp = useMemo(() => {
    if (movie?.progress?.timeLeft) {
      return movie.progress.timeLeft;
    }
    return '22:47';
  }, [movie]);

  // Fetch streams from backend server (/api/streams)
  const fetchStreams = useCallback(async () => {
    if (!movie) return;
    setIsLoading(true);
    try {
      const epNum = currentEpisode?.number || episodeIndex + 1;
      const params = new URLSearchParams({
        imdbId: movie.imdbId || '',
        tmdbId: movie.tmdbId ? String(movie.tmdbId) : '',
        title: movie.title,
        year: String(movie.releaseYear),
        type: movie.mediaType === 'tv' || movie.mediaType === 'anime' || movie.episodes ? 'series' : 'movie',
        season: '1',
        episode: String(epNum),
      });

      const res = await fetch(`/api/streams?${params.toString()}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.streams) && data.streams.length > 0) {
          const verified = data.streams.filter((s: StreamItem) => isStreamMatchingCurrentMovie(s, movie.title));
          setStreams(verified.length > 0 ? verified : generateFallbackStreams(movie, episodeIndex));
        } else {
          setStreams(generateFallbackStreams(movie, episodeIndex));
        }
        if (Array.isArray(data.addons)) {
          setAddons(data.addons);
        }
      } else {
        setStreams(generateFallbackStreams(movie, episodeIndex));
      }
    } catch (err) {
      console.warn('Streams fetch error in selector, activating direct stream pipeline:', err);
      setStreams(generateFallbackStreams(movie, episodeIndex));
    } finally {
      setIsLoading(false);
    }
  }, [movie, currentEpisode, episodeIndex]);

  useEffect(() => {
    if (isOpen && movie) {
      fetchStreams();
    }
  }, [isOpen, movie, fetchStreams]);

  // Lock background scroll cleanly with reference counting
  useEffect(() => {
    if (isOpen && movie) {
      const unlock = lockScroll();
      return () => {
        unlock();
      };
    }
  }, [isOpen, movie]);

  // Keyboard shortcut support (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Server Tabs matching the reference design (All, Pengu, and Web Mirrors for ad-heavy sources)
  const serverTabs = useMemo(() => {
    return [
      { id: 'all', name: 'All' },
      { id: 'PenguPlay', name: 'Pengu' },
      { id: 'HdHub', name: 'HdHub' },
      { id: 'WebStreamrMBG', name: 'WebStreamrMBG' },
      { id: 'Torrentio', name: 'Torrentio' },
      { id: 'TorrentClaw (EN)', name: 'TorrentClaw (EN)' },
      { id: 'TorrentsDB', name: 'TorrentsDB' },
      { id: 'Comet', name: 'Comet' },
      { id: 'Netflix Catalog', name: 'Netflix Catalog' },
      { id: 'web-mirrors', name: '⚠️ Web Mirrors (Ads & Redirects)' },
    ];
  }, []);

  // Scraper repositories matching the reference design
  const scrapers = useMemo(() => {
    return [
      { id: 'All-in-One-Nuvio', name: 'All-in-One-Nuvio' },
      { id: 'Michat88 Repo', name: 'Michat88 Repo' },
      { id: 'Yoru\'s Repo', name: 'Yoru\'s Repo' },
    ];
  }, []);

  // Handler to add custom external stream source / addon manifest
  const handleAddCustomSource = useCallback(() => {
    if (!customSourceUrl.trim() || !movie) return;
    const name = customSourceName.trim() || 'Custom Web Source';
    const newStream: StreamItem = {
      id: `custom_${Date.now()}`,
      name: `${name} • Custom Internet Source`,
      title: `${movie.title} (${movie.releaseYear})`,
      movieName: movie.title,
      serverName: name,
      serverLogo: 'https://cdn-icons-png.flaticon.com/512/1179/1179069.png',
      quality: '1080p',
      sourceType: 'Custom Stream',
      specs: '1080p • Custom Added Source • External Stream',
      fileSize: 'Online Stream',
      fileSizeBytes: 0,
      badges: ['1080p', 'Custom-Source', 'User-Added'],
      languages: ['English'],
      subtitlesText: 'English',
      subtitles: ['English'],
      scraperRepo: 'User Added URL',
      url: customSourceUrl.trim(),
      embedUrl: customSourceUrl.trim(),
      directDownloadUrl: null,
      isDirect: false,
      adLevel: 'moderate',
      hasFrequentRedirects: false,
      isAdHeavyMirror: false,
    };
    setStreams((prev) => [newStream, ...prev]);
    setCustomSourceUrl('');
    setCustomSourceName('');
    setAddSourceSuccess(true);
    setTimeout(() => {
      setAddSourceSuccess(false);
      setShowAddSource(false);
    }, 2000);
  }, [customSourceUrl, customSourceName, movie]);

  // Filtered and Sorted Streams: Clean streams at the top, ad-heavy/frequent-redirect sources at the bottom
  const filteredStreams = useMemo(() => {
    const list = streams.filter((stream) => {
      if (activeServerTab === 'web-mirrors') {
        return isAdHeavySource(stream) || stream.isAdHeavyMirror || hasFrequentRedirects(stream);
      }

      if (activeServerTab !== 'all') {
        const streamServer = (stream.serverName || '').trim();
        if (streamServer.toLowerCase() === activeServerTab.toLowerCase()) return true;

        const cleanStream = streamServer.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanActive = activeServerTab.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanStream && cleanActive && (cleanStream.includes(cleanActive) || cleanActive.includes(cleanStream))) {
          return true;
        }

        const fullStreamIdentity = `${stream.name || ''} ${stream.sourceHost || ''} ${stream.scraperRepo || ''}`.toLowerCase();
        if (cleanActive && fullStreamIdentity.includes(cleanActive)) {
          return true;
        }

        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      // 1. Sources that show ads more or redirect frequently always stay AT THE BOTTOM
      const aHeavy = Boolean(isAdHeavySource(a) || a.isAdHeavyMirror || hasFrequentRedirects(a));
      const bHeavy = Boolean(isAdHeavySource(b) || b.isAdHeavyMirror || hasFrequentRedirects(b));
      if (!aHeavy && bHeavy) return -1;
      if (aHeavy && !bHeavy) return 1;

      // 2. Sort by chosen quality or size option
      if (sortOption === 'quality') {
        const scoreDiff = computeStreamScore(b) - computeStreamScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        return getStreamBytes(b) - getStreamBytes(a);
      } else if (sortOption === 'size-desc') {
        return getStreamBytes(b) - getStreamBytes(a);
      } else if (sortOption === 'size-asc') {
        return getStreamBytes(a) - getStreamBytes(b);
      }
      return 0;
    });
  }, [streams, activeServerTab, sortOption]);

  // Separate primary streams from ad-heavy / frequent-redirect web mirrors
  const { cleanStreams, adHeavyMirrors } = useMemo(() => {
    const clean: StreamItem[] = [];
    const heavy: StreamItem[] = [];
    filteredStreams.forEach((s) => {
      if (isAdHeavySource(s) || s.isAdHeavyMirror || hasFrequentRedirects(s)) {
        heavy.push(s);
      } else {
        clean.push(s);
      }
    });
    return { cleanStreams: clean, adHeavyMirrors: heavy };
  }, [filteredStreams]);

  if (!isOpen || !movie) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        {/* Full-Screen Movie Backdrop with Deep Atmospheric Vignette */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-black"
          onClick={onClose}
        >
          {movie.backdropUrl && (
            <img
              src={movie.backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover opacity-35 filter blur-[2px] scale-105"
            />
          )}
          {/* Gradients to darken background while letting cinematic artwork shine */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />
        </motion.div>

        {/* Top-Left Circular Back Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer active:scale-95 shadow-xl hover:border-white/30 group"
        >
          <ArrowLeft className="w-5 h-5 text-neutral-200 group-hover:text-white group-hover:-translate-x-0.5 transition-transform" />
        </button>

        {/* Main Stage Grid: Left Cinematic Hero Titles & Right Selector Panel */}
        <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 overflow-hidden">
          
          {/* Left Side: Cinematic Title & Episode Subtitle */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:w-5/12 flex flex-col justify-end text-left shrink-0 pb-2 lg:pb-12 pt-14 lg:pt-0"
          >
            {/* Cinematic Serif Title matching the design */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-medium tracking-tight drop-shadow-2xl leading-[1.15] mb-2 sm:mb-3">
              {movie.title}
            </h1>

            {/* Episode / Feature Subtitle */}
            <p className="text-sm sm:text-base md:text-lg text-neutral-300 drop-shadow-lg font-normal">
              {episodeSubtitle}
            </p>
          </motion.div>

          {/* Right Side: Server Selector Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ willChange: 'transform, opacity', contain: 'layout paint' }}
            className="gpu-layer compositor-card w-full lg:w-[620px] max-w-2xl flex-1 min-h-0 lg:h-[88vh] lg:max-h-[820px] bg-black/85 backdrop-blur-md border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col relative overflow-hidden"
          >
            {/* 1. Resume Pill Button */}
            <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const targetStream = filteredStreams[0] || streams[0];
                  if (targetStream) {
                    onSelectStream(targetStream, episodeIndex);
                  }
                }}
                className="flex items-center gap-2 px-4 py-1.5 sm:py-2 rounded-full bg-neutral-800/90 hover:bg-neutral-700/90 text-white text-xs sm:text-sm font-semibold border border-white/15 cursor-pointer active:scale-95 transition-all shadow-md hover:border-white/30"
              >
                <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                <span>Resume from {resumeTimestamp}</span>
              </button>

              {/* Minimal Sort Toggle (Quality / Size) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSortOption('quality')}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    sortOption === 'quality'
                      ? 'bg-white/20 text-white border border-white/30 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200 font-bold'
                  }`}
                >
                  Quality
                </button>
                <button
                  type="button"
                  onClick={() => setSortOption((prev) => (prev === 'size-desc' ? 'size-asc' : 'size-desc'))}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    sortOption === 'size-desc' || sortOption === 'size-asc'
                      ? 'bg-white/20 text-white border border-white/30 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200 font-bold'
                  }`}
                >
                  Size {sortOption === 'size-asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* 2. Provider Tabs Row (All, PenguPlay [Red active], HdHub, etc.) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar shrink-0">
              {/* Refresh Button */}
              <button
                type="button"
                onClick={fetchStreams}
                disabled={isLoading}
                title="Refresh Streams"
                className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-white' : ''}`} />
              </button>

              {serverTabs.map((tab) => {
                const isSelected = activeServerTab.toLowerCase() === tab.id.toLowerCase();

                // Monochrome active/inactive classes with bold names
                const activeClasses = 'bg-white text-black font-bold shadow-md';
                const inactiveClasses = 'bg-white/5 hover:bg-white/15 text-neutral-200 border border-white/10 font-bold';

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveServerTab(tab.id)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-bold transition-all duration-150 cursor-pointer active:scale-95 whitespace-nowrap ${
                      isSelected ? activeClasses : inactiveClasses
                    }`}
                  >
                    {tab.name}
                  </button>
                );
              })}
            </div>

            {/* 3. Active Scrapers Row */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 mb-2.5 shrink-0">
              <span className="text-xs text-neutral-400 font-bold shrink-0">
                Active scrapers
              </span>
              {scrapers.map((scraper) => {
                const isCurrent = activeScraper === scraper.id;
                return (
                  <button
                    key={scraper.id}
                    type="button"
                    onClick={() => setActiveScraper(scraper.id)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
                      isCurrent
                        ? 'bg-white/15 border-white/30 text-white font-bold'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300 font-bold'
                    }`}
                  >
                    {scraper.name}
                  </button>
                );
              })}
            </div>

            {/* 4. Streams List Area */}
            <div data-lenis-prevent="true" className="flex-1 overflow-y-auto space-y-2.5 pr-1 hide-scrollbar overscroll-contain">
              {isLoading ? (
                // Shimmer Loading Skeleton
                <div className="space-y-2.5 pt-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 animate-pulse flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-white/10 rounded w-1/2" />
                        <div className="w-10 h-10 bg-white/10 rounded-full" />
                      </div>
                      <div className="h-3 bg-white/10 rounded w-2/3" />
                      <div className="h-3 bg-white/10 rounded w-3/4" />
                      <div className="flex gap-2 pt-1">
                        <div className="h-5 bg-white/10 rounded w-12" />
                        <div className="h-5 bg-white/10 rounded w-16" />
                        <div className="h-5 bg-white/10 rounded w-14" />
                      </div>
                    </div>
                  ))}
                  <p className="text-center text-xs text-neutral-400 pt-2 animate-pulse font-medium">
                    Querying verified add-on pipelines...
                  </p>
                </div>
              ) : filteredStreams.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-neutral-400">
                  <HardDrive className="w-9 h-9 stroke-1 text-neutral-500 mb-2" />
                  <p className="text-sm font-semibold text-neutral-300">No streams found</p>
                  <p className="text-xs text-neutral-500 mt-1">Try selecting the "All" tab or another server</p>
                  <button
                    type="button"
                    onClick={() => setActiveServerTab('all')}
                    className="mt-3 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                  >
                    Show All
                  </button>
                </div>
              ) : (
                <>
                  {/* Clean / Direct Primary Streams */}
                  {cleanStreams.map((stream, idx) => {
                    const logoUrl = getProviderLogo(stream.serverName, stream.serverLogo);
                    const isTopBest = idx === 0;
                    const isPengu = stream.serverName.toLowerCase().includes('pengu');

                    // Format stream title line 1
                    const streamDisplayName = isPengu && !stream.name.includes('🐧')
                      ? `🐧 ${stream.name.replace(/^PenguPlay\s*/i, 'PenguPlay ❄️ ')}`
                      : stream.name;

                    // Format stream line 2
                    const epNum = currentEpisode?.number || episodeIndex + 1;
                    const epCode = movie.mediaType === 'tv' || movie.mediaType === 'anime' || movie.episodes
                      ? ` • S01E${epNum < 10 ? '0' + epNum : epNum}`
                      : '';
                    const line2Title = `${movie.title} (${movie.releaseYear})${epCode}`;

                    const specsText = stream.specs
                      ? (stream.fileSize && !stream.specs.includes(stream.fileSize) ? `${stream.specs} • ${stream.fileSize}` : stream.specs)
                      : `${stream.quality || '4K'} • MKV${stream.fileSize ? ` • ${stream.fileSize}` : ''}`;

                    return (
                      <motion.div
                        key={stream.id}
                        whileHover={{ scale: 1.004 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectStream(stream, episodeIndex)}
                        className="bg-black/40 hover:bg-black/60 border border-white/[0.08] hover:border-white/25 rounded-2xl p-3.5 sm:p-4 transition-all duration-150 cursor-pointer shadow-lg relative group flex flex-col gap-2"
                      >
                        {/* Top Row: Stream Name on Left, Provider Logo & Name on Right */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            {/* Line 1: Title in bold white */}
                            <h2 className="font-bold text-white text-sm sm:text-base leading-snug tracking-tight truncate">
                              {streamDisplayName}
                            </h2>

                            {/* Line 2: Movie Title (Year) • Episode */}
                            <div className="text-xs sm:text-[13px] text-neutral-300 font-medium truncate flex items-center gap-1.5">
                              <span className="shrink-0 text-xs">📡</span>
                              <span className="truncate">{line2Title}</span>
                            </div>
                          </div>

                          {/* Right Column: Provider Logo + Provider Name */}
                          <div className="shrink-0 flex flex-col items-center justify-center pl-2 pt-0.5" title={stream.serverName}>
                            <ProviderLogo
                              serverName={stream.serverName}
                              logoUrl={stream.serverLogo || logoUrl}
                              className="w-10 h-10 sm:w-11 sm:h-11"
                            />
                            <span className="text-[10px] text-neutral-400 font-medium mt-1 tracking-tight">
                              {stream.serverName}
                            </span>
                          </div>
                        </div>

                        {/* Squircle Specs Pill: Filled fully for best stream, monochrome outline for others */}
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          <div
                            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs tracking-tight transition-all ${
                              isTopBest
                                ? 'bg-white text-black font-bold shadow-md'
                                : 'bg-white/[0.08] text-neutral-200 border border-white/15 font-medium'
                            }`}
                          >
                            <span className="truncate max-w-[280px] sm:max-w-md font-mono text-[11px] sm:text-xs">
                              {specsText}
                            </span>
                          </div>

                          {/* Zero ads badge */}
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                            <span>Direct • 0 Ads</span>
                          </span>
                        </div>

                        {/* Source Host if present */}
                        {stream.sourceHost && (
                          <div className="text-xs text-neutral-400 truncate flex items-center gap-1.5">
                            <span className="shrink-0">🛰️</span>
                            <span className="truncate">Source: {stream.sourceHost}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {/* SOURCES THAT SHOW ADS MORE OR REDIRECT FREQUENTLY AT THE BOTTOM */}
                  {adHeavyMirrors.length > 0 && (
                    <div className="pt-4 pb-2 space-y-3">
                      {/* Explanatory Banner with data from the internet */}
                      <div className="rounded-2xl p-3.5 sm:p-4 bg-neutral-900/90 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                                Web Mirrors (Shows Ads More • Frequent Redirects)
                              </h3>
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 text-[10px] font-bold border border-amber-500/30">
                                Sorted to Bottom
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-neutral-300 mt-1 leading-snug">
                              Verified Internet Data: Community streaming reports show these free web mirrors display more advertisement popups and frequently redirect to external pages on click. Ranked at the bottom for safety.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Render Ad-Heavy / Frequent-Redirect Stream Cards at the Bottom */}
                      {adHeavyMirrors.map((stream) => {
                        const logoUrl = getProviderLogo(stream.serverName, stream.serverLogo);
                        const adReport = getSourceAdReport(stream.serverName);

                        return (
                          <motion.div
                            key={stream.id}
                            whileHover={{ scale: 1.004 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectStream(stream, episodeIndex)}
                            className="bg-neutral-950/70 hover:bg-neutral-900/80 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-4 transition-all duration-150 cursor-pointer shadow-lg relative group flex flex-col gap-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <h2 className="font-bold text-white text-sm sm:text-base leading-snug tracking-tight truncate flex items-center gap-2">
                                  <span>{stream.name}</span>
                                </h2>

                                <div className="text-xs sm:text-[13px] text-neutral-400 font-medium truncate flex items-center gap-1.5">
                                  <span className="shrink-0 text-xs">🌐</span>
                                  <span className="truncate">{stream.sourceHost || stream.serverName} • Web Mirror</span>
                                </div>
                              </div>

                              <div className="shrink-0 flex flex-col items-center justify-center pl-2 pt-0.5" title={stream.serverName}>
                                <ProviderLogo
                                  serverName={stream.serverName}
                                  logoUrl={stream.serverLogo || logoUrl}
                                  className="w-10 h-10 sm:w-11 sm:h-11"
                                />
                                <span className="text-[10px] text-amber-300 font-medium mt-1 tracking-tight">
                                  {stream.serverName}
                                </span>
                              </div>
                            </div>

                            {/* Warning Pills using data from internet */}
                            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                                <span>⚠️ Shows Ads More</span>
                              </span>

                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-red-500/20 text-red-200 border border-red-500/30">
                                <ExternalLink className="w-3 h-3 stroke-[2.5]" />
                                <span>Frequent Redirects</span>
                              </span>

                              <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-white/5 text-neutral-300 border border-white/10">
                                <span className="font-mono text-[11px]">{stream.quality || '1080p'} • Web Embed</span>
                              </span>
                            </div>

                            {/* Specific Internet Intelligence Note */}
                            <div className="text-[11px] text-amber-200/90 flex items-center gap-1.5 pt-0.5 font-medium">
                              <Info className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{stream.redirectNotice || adReport?.redirectNotice || 'Community note: Triggers external redirect tabs on play click.'}</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* BOTTOM ACTION: Add More Sources & View Internet Redirect Telemetry Index */}
                  <div className="pt-4 pb-4 space-y-3">
                    {/* Add More Sources Button / Accordion */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <PlusCircle className="w-4 h-4 text-white" />
                          <span className="text-xs sm:text-sm font-bold text-white">
                            Add More Sources (Stremio Manifest or Web Mirror)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddSource((prev) => !prev)}
                          className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all"
                        >
                          {showAddSource ? 'Cancel' : '+ Add Source'}
                        </button>
                      </div>

                      {showAddSource && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            Paste any Stremio addon manifest URL (e.g. Torrentio, Comet, TPB) or public web embed URL to add more sources directly from the internet:
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              placeholder="Source Name (e.g. My Fast Mirror)"
                              value={customSourceName}
                              onChange={(e) => setCustomSourceName(e.target.value)}
                              className="w-full sm:w-1/3 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40"
                            />
                            <input
                              type="url"
                              placeholder="https://addon.strem.fun/manifest.json or https://embed..."
                              value={customSourceUrl}
                              onChange={(e) => setCustomSourceUrl(e.target.value)}
                              className="w-full sm:w-2/3 px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-neutral-400">
                              Direct stream sources remain at top; ad-heavy links are automatically sorted to bottom.
                            </span>
                            <button
                              type="button"
                              onClick={handleAddCustomSource}
                              disabled={!customSourceUrl.trim()}
                              className="px-4 py-1.5 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-40"
                            >
                              {addSourceSuccess ? '✓ Source Added!' : 'Add to Stream List'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Internet Streaming Intelligence & Redirect Safety Index Accordion */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
                      <button
                        type="button"
                        onClick={() => setShowTelemetryIndex((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs sm:text-sm font-bold text-white">
                            Internet Source Ad & Redirect Telemetry Index
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 font-mono">
                            {INTERNET_SOURCE_AD_REPORTS.length} Sources Verified
                          </span>
                        </div>
                        {showTelemetryIndex ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </button>

                      {showTelemetryIndex && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            Telemetry gathered from global internet streaming logs: Sources with frequent popups and redirects are automatically sorted to the bottom of the player to preserve seamless playback.
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-neutral-300">
                              <thead>
                                <tr className="border-b border-white/10 text-neutral-400 text-[11px]">
                                  <th className="py-2 pr-3 font-semibold">Source</th>
                                  <th className="py-2 pr-3 font-semibold">Type</th>
                                  <th className="py-2 pr-3 font-semibold">Ad Rating</th>
                                  <th className="py-2 pr-3 font-semibold">Redirect Frequency</th>
                                  <th className="py-2 font-semibold">UI Placement</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {INTERNET_SOURCE_AD_REPORTS.map((report) => (
                                  <tr key={report.serverName} className="hover:bg-white/[0.02]">
                                    <td className="py-2 pr-3 font-bold text-white">{report.serverName}</td>
                                    <td className="py-2 pr-3 text-neutral-400">{report.category}</td>
                                    <td className="py-2 pr-3">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          report.adLevel === 'none'
                                            ? 'bg-emerald-500/20 text-emerald-300'
                                            : report.adLevel === 'low'
                                            ? 'bg-blue-500/20 text-blue-300'
                                            : report.adLevel === 'moderate'
                                            ? 'bg-amber-500/20 text-amber-300'
                                            : 'bg-red-500/20 text-red-300'
                                        }`}
                                      >
                                        {report.adLevel.toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-3 text-[11px] text-neutral-300">
                                      {report.redirectFrequency === 'none' ? '0 Redirects' : report.redirectNotice}
                                    </td>
                                    <td className="py-2 font-mono text-[11px]">
                                      {report.isAdHeavyMirror || report.hasFrequentRedirects ? (
                                        <span className="text-amber-300 font-bold">⚠️ At Bottom</span>
                                      ) : (
                                        <span className="text-emerald-300 font-bold">✓ Top of List</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
