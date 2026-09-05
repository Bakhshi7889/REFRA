import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCw, Play, HardDrive, X } from 'lucide-react';
import { Movie, StreamItem, AddonServerConfig, ExpansionOrigin } from '../types';
import {
  getStreamBytes,
  getStreamOrderedTags,
  computeStreamScore,
  getProviderLogo,
  BEST_GREEN,
  STANDARD_TAG,
  SIZE_TAG,
  StreamTag,
} from '../utils/streamHelpers';

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
  const [activeServerTab, setActiveServerTab] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('quality');
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [, setAddons] = useState<AddonServerConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Determine current episode if TV / series / anime
  const currentEpisode = useMemo(() => {
    if (!movie?.episodes || movie.episodes.length === 0) return null;
    return movie.episodes[episodeIndex] || movie.episodes[0];
  }, [movie, episodeIndex]);

  // Formatted Subtitle/Episode Text
  const episodeSubtitle = useMemo(() => {
    if (!movie) return '';
    if (movie.mediaType === 'tv' || movie.mediaType === 'anime' || movie.episodes) {
      const epNum = currentEpisode?.number || episodeIndex + 1;
      const epTitle = currentEpisode?.title || `Episode ${epNum}`;
      return `S1E${epNum} - ${epTitle}`;
    }
    return `${movie.releaseYear} • ${movie.duration} • ${movie.genres.slice(0, 2).join(', ')}`;
  }, [movie, currentEpisode, episodeIndex]);

  // Fetch streams from backend server (/api/streams)
  const fetchStreams = useCallback(async () => {
    if (!movie) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        imdbId: movie.imdbId || '',
        tmdbId: movie.tmdbId ? String(movie.tmdbId) : '',
        title: movie.title,
        year: String(movie.releaseYear),
        type: movie.mediaType === 'tv' || movie.mediaType === 'anime' || movie.episodes ? 'series' : 'movie',
        season: '1',
        episode: String(currentEpisode?.number || episodeIndex + 1),
      });

      const res = await fetch(`/api/streams?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.streams)) {
          setStreams(data.streams);
        }
        if (Array.isArray(data.addons)) {
          setAddons(data.addons);
        }
      }
    } catch (err) {
      console.error('Error loading streams:', err);
    } finally {
      setIsLoading(false);
    }
  }, [movie, currentEpisode, episodeIndex]);

  useEffect(() => {
    if (isOpen && movie) {
      fetchStreams();
    }
  }, [isOpen, movie, fetchStreams]);

  // Lock background scroll to prevent behind-screen scrollbar movement
  useEffect(() => {
    if (isOpen && movie) {
      const prevOverflow = document.body.style.overflow;
      const prevOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'contain';
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.overscrollBehavior = prevOverscroll;
      };
    }
  }, [isOpen, movie]);

  // User Stremio Addons with favorite PenguPlay
  const serverTabs = useMemo(() => {
    return [
      { id: 'all', name: 'All' },
      { id: 'PenguPlay', name: 'PenguPlay 🐧' },
      { id: 'TorrentsDB', name: 'TorrentsDB' },
      { id: 'Torrentio', name: 'Torrentio' },
      { id: 'Comet', name: 'Comet' },
      { id: 'ThePirateBay+', name: 'ThePirateBay+' },
      { id: 'Kort', name: 'Kort' },
      { id: 'Netflix Catalog', name: 'Netflix Catalog' },
    ];
  }, []);

  // Filtered and Sorted Streams (Quality-scored by default or precise Size)
  const filteredStreams = useMemo(() => {
    const list = streams.filter((stream) => {
      if (activeServerTab !== 'all') {
        const streamServer = (stream.serverName || '').trim();
        // Exact match against tab id (e.g. 'PenguPlay')
        if (streamServer === activeServerTab) return true;

        // Clean alphanumeric lowercase match (e.g. 'penguplay' vs 'penguplay')
        const cleanStream = streamServer.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanActive = activeServerTab.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanStream && cleanActive && (cleanStream.includes(cleanActive) || cleanActive.includes(cleanStream))) {
          return true;
        }

        // Match against stream name or host identity (e.g. 'PenguPlay 🐧' in stream.name)
        const fullStreamIdentity = `${stream.name || ''} ${stream.sourceHost || ''} ${stream.scraperRepo || ''}`.toLowerCase();
        if (cleanActive && fullStreamIdentity.includes(cleanActive)) {
          return true;
        }

        return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
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

  if (!isOpen || !movie) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        {/* Background Backdrop with Dark Vignette */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          onClick={onClose}
        >
          {movie.backdropUrl && (
            <img
              src={movie.backdropUrl}
              alt={movie.title}
              className="w-full h-full object-cover opacity-25 filter blur-sm scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70" />
        </motion.div>

        {/* Main Content Container: Left Info & Right Floating Server Selector */}
        <div className="relative z-10 w-full h-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 lg:gap-6 overflow-hidden">
          
          {/* Left Side: Minimal Top Bar + Cinematic Player Stage at Top */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full lg:w-5/12 flex flex-col justify-start text-left shrink-0"
          >
            {/* Minimal Transparent Top Bar with Texture */}
            <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-sm mb-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.96]"
                title="Back to Details"
                aria-label="Back to Details"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-xs font-medium">Back</span>
              </button>

              <div className="min-w-0 flex-1 text-center">
                <h1 className="text-sm sm:text-base font-semibold text-white truncate">
                  {movie.title}
                </h1>
                <p className="text-[11px] text-neutral-400 truncate">
                  {episodeSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all cursor-pointer active:scale-[0.96]"
                title="Close"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Player Stage at Top */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/[0.08] shadow-xl mb-3 shrink-0">
              {movie.trailerYoutubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${movie.trailerYoutubeId}?autoplay=0&controls=1&modestbranding=1&rel=0&playsinline=1`}
                  title={`${movie.title} Trailer`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full relative">
                  <img
                    src={movie.backdropUrl || movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Synopsis for tablet/desktop */}
            <p className="hidden lg:block text-xs text-neutral-400 line-clamp-3 leading-relaxed">
              {movie.synopsis}
            </p>
          </motion.div>

          {/* Right Side: Floating Server Selector Liquid Glass Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24, mass: 0.8 }}
            className="w-full lg:w-7/12 max-w-[620px] flex-1 min-h-0 lg:h-[85vh] lg:max-h-[85vh] liquid-glass bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl flex flex-col relative overflow-hidden"
          >
            {/* Top Action Row: Title & Tactile Sort Buttons (QUALITY & SIZE) */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.08] shrink-0">
              <div className="text-xs font-semibold text-neutral-300">
                Stream Sources ({filteredStreams.length})
              </div>

              {/* Minimalist Tactile Sort Buttons: QUALITY & SIZE */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSortOption('quality')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-[0.96] ${
                    sortOption === 'quality'
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10'
                  }`}
                >
                  QUALITY
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSortOption((prev) => (prev === 'size-desc' ? 'size-asc' : 'size-desc'))
                  }
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 flex items-center gap-1 cursor-pointer active:scale-[0.96] ${
                    sortOption === 'size-desc' || sortOption === 'size-asc'
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10'
                  }`}
                >
                  <span>SIZE</span>
                  <span className="text-[10px] font-mono opacity-80">
                    {sortOption === 'size-asc' ? '↑ (Min)' : '↓ (Max)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Server Tabs Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none no-scrollbar mb-1.5 shrink-0">
              {/* Refresh Button */}
              <button
                onClick={fetchStreams}
                disabled={isLoading}
                title="Refresh Streams"
                className="flex-shrink-0 p-1.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-neutral-200' : ''}`} />
              </button>

              {/* Server Tabs: big logos, no borders, no pills, no names */}
              {serverTabs.map((tab) => {
                const isActive =
                  activeServerTab === tab.id ||
                  (tab.id === 'all' && activeServerTab === 'all') ||
                  activeServerTab === tab.name;

                if (tab.id === 'all') {
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveServerTab('all')}
                      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer active:scale-[0.96] ${
                        isActive
                          ? 'bg-white text-black shadow-sm'
                          : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                      }`}
                    >
                      All
                    </button>
                  );
                }

                const logo = getProviderLogo(tab.id);

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveServerTab(tab.id)}
                    title={tab.name}
                    className={`flex-shrink-0 p-1 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-[0.96] ${
                      isActive
                        ? 'scale-110 opacity-100 drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <img
                      src={logo}
                      alt={tab.name}
                      className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-md select-none pointer-events-none"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://pengu.uk/penguplay-icon.png';
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Streams List Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 hide-scrollbar overscroll-contain">
              {isLoading ? (
                // Shimmer Loading Skeleton
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="bg-white/[0.03] border border-white/5 rounded-xl p-3 animate-pulse flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="h-3.5 bg-white/10 rounded w-1/2" />
                        <div className="h-3.5 bg-white/10 rounded-full w-16" />
                      </div>
                      <div className="flex gap-1.5 pt-0.5">
                        <div className="h-4 bg-white/10 rounded w-8" />
                        <div className="h-4 bg-white/10 rounded w-12" />
                        <div className="h-4 bg-white/10 rounded w-10" />
                        <div className="h-4 bg-white/10 rounded w-14" />
                      </div>
                    </div>
                  ))}
                  <p className="text-center text-[11px] text-neutral-400 pt-1 animate-pulse">
                    Querying verified add-on pipelines...
                  </p>
                </div>
              ) : filteredStreams.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center h-40 text-center p-4 text-neutral-400">
                  <HardDrive className="w-8 h-8 stroke-1 text-neutral-500 mb-1.5" />
                  <p className="text-xs font-semibold text-neutral-300">No streams found</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Try selecting the "All" tab</p>
                  <button
                    onClick={() => setActiveServerTab('all')}
                    className="mt-2.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-pointer"
                  >
                    Show All
                  </button>
                </div>
              ) : (
                // Stream Cards: Using Movie Name in bold, scaled-up Provider Logo on right (no borders, no pills, no name), English subtitles
                filteredStreams.map((stream) => {
                  const logoUrl = getProviderLogo(stream.serverName, stream.serverLogo);
                  const orderedTags = getStreamOrderedTags(stream);
                  const displayTitle = stream.title || movie.title;

                  return (
                    <motion.div
                      key={stream.id}
                      whileHover={{ scale: 1.004 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelectStream(stream, episodeIndex)}
                      className="bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/20 rounded-xl p-2.5 sm:p-3 transition-all duration-150 cursor-pointer shadow-sm relative group flex flex-col gap-1.5"
                    >
                      {/* Row 1: Movie Name in bold on left, Scaled up Provider Logo on right (no border, no pill, no name) */}
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-white text-xs sm:text-sm tracking-tight truncate flex-1 leading-snug">
                          {displayTitle}
                        </span>

                        {/* Provider Logo on Right - scaled up, no borders, no pill, no name */}
                        <div className="shrink-0 flex items-center justify-center pl-1" title={stream.serverName}>
                          <img
                            src={logoUrl}
                            alt={stream.serverName}
                            className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-md select-none pointer-events-none"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://pengu.uk/penguplay-icon.png';
                            }}
                          />
                        </div>
                      </div>

                      {/* Row 2: Re-added Technical Description & Source from fetch */}
                      {stream.specs && (
                        <div className="text-[11px] text-neutral-300 font-mono flex items-center gap-1.5 truncate">
                          <span className="text-neutral-500 shrink-0">🎞️</span>
                          <span className="truncate">{stream.specs}</span>
                        </div>
                      )}
                      {stream.sourceHost && (
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 truncate">
                          <span className="text-neutral-500 shrink-0">🛰️</span>
                          <span className="truncate">Source: {stream.sourceHost}</span>
                        </div>
                      )}

                      {/* Row 3: Ordered Tags with ALL BEST SETTINGS IN GREEN + English Subtitles */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5">
                        {orderedTags.map((tag) => (
                          <span
                            key={tag.id}
                            className={`text-[10px] leading-tight px-2 py-0.5 rounded-md tracking-tight ${tag.className}`}
                          >
                            {tag.label}
                          </span>
                        ))}
                        {/* Subtitles: always include English subtitles */}
                        <span className="text-[10px] leading-tight px-2 py-0.5 rounded-md tracking-tight bg-purple-500/15 border border-purple-500/25 text-purple-300 font-medium flex items-center gap-1">
                          <span>💬</span>
                          <span>Subtitles: {stream.subtitlesText || 'English'}</span>
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
