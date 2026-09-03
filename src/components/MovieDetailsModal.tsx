import React, { useState } from 'react';
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
  Sliders,
  Film,
  Image as ImageIcon,
  Video,
  MessageSquare,
  Sparkles,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Movie } from '../types';
import { getBackdropUrl, getPosterUrl } from '../utils/imageHelpers';
import { ReviewsSection } from './ReviewsSection';

interface MovieDetailsModalProps {
  movie: Movie | null;
  onClose: () => void;
  watchlist: string[];
  onToggleWatchlist: (movieId: string) => void;
  autoPlay?: boolean;
}

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie,
  onClose,
  watchlist,
  onToggleWatchlist,
  autoPlay = false,
}) => {
  if (!movie) return null;

  const [isPlayingTrailer, setIsPlayingTrailer] = useState(autoPlay);
  const [activeMediaTab, setActiveMediaTab] = useState<'trailer' | 'gallery'>('trailer');
  const [contentTab, setContentTab] = useState<'overview' | 'reviews' | 'episodes'>('overview');
  const [selectedBackdropIndex, setSelectedBackdropIndex] = useState(0);
  const [streamQuality, setStreamQuality] = useState<'4K' | '1080p' | 'Atmos'>('4K');
  const [copiedShare, setCopiedShare] = useState(false);
  const isSaved = watchlist.includes(movie.id);

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
        {/* Backdrop Tint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Organic Liquid Sheet */}
        <motion.div
          initial={{ opacity: 0, y: '100%', scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: '100%', scale: 0.95 }}
          transition={{
            type: 'spring',
            damping: 32,
            stiffness: 340,
            mass: 0.9,
          }}
          className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[86vh] bg-[#12141a] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10"
        >
          {/* Top handle bar for mobile gesture feel */}
          <div className="w-12 h-1.5 rounded-full bg-neutral-600/60 mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Close Pill Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-neutral-300 hover:text-white backdrop-blur-md transition-colors"
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto hide-scrollbar flex-1 pb-8">
            {/* Cinematic Stage: Real YouTube/KinoCheck Trailer or Fanart Viewer */}
            <div className="relative w-full aspect-[16/10] bg-black overflow-hidden">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12141a] via-black/30 to-transparent" />

                  {/* Center Play Trailer Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.06 }}
                      type="button"
                      onClick={() => setIsPlayingTrailer(true)}
                      className="w-14 h-14 rounded-full bg-white/95 hover:bg-white text-neutral-950 flex items-center justify-center shadow-2xl transition-all"
                      aria-label="Play Trailer"
                    >
                      <Play className="w-6 h-6 fill-neutral-950 ml-0.5" />
                    </motion.button>
                  </div>
                </>
              )}

              {/* Badges on stage */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 pointer-events-none">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/65 text-neutral-200 backdrop-blur-md">
                  {movie.resolution}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-black/65 text-neutral-300 backdrop-blur-md">
                  {movie.audioFormat}
                </span>
              </div>
            </div>

            {/* Media Mode Pill Selector (Trailer / Fanart & Backdrops) */}
            {allArtworks.length > 1 && (
              <div className="px-5 pt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMediaTab('trailer');
                    setIsPlayingTrailer(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeMediaTab === 'trailer'
                      ? 'bg-neutral-200 text-neutral-950 font-semibold'
                      : 'bg-[#1a1d26] text-neutral-400 hover:text-white'
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeMediaTab === 'gallery'
                      ? 'bg-neutral-200 text-neutral-950 font-semibold'
                      : 'bg-[#1a1d26] text-neutral-400 hover:text-white'
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
                    className={`flex-shrink-0 w-24 aspect-[16/10] rounded-xl overflow-hidden border-2 transition-all ${
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

            {/* Info Body with Both Poster & Backdrop displayed */}
            <div className="px-5 pt-4 space-y-4">
              {/* Featured Header: Side-by-side Poster & Main Info */}
              <div className="flex gap-4 items-start">
                {/* Official Vertical Poster */}
                <div className="w-24 sm:w-28 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 relative bg-[#14161f]">
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1e222c] text-white">
                      {movie.releaseYear}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1e222c] text-neutral-300">
                      {movie.duration}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1e222c] text-neutral-300">
                      {movie.certification}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#272d3b] text-white flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-white text-white" />
                      {movie.score}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                    {movie.title}
                  </h3>

                  {movie.japaneseTitle && (
                    <div className="text-xs text-neutral-400 font-medium">
                      {movie.japaneseTitle}
                    </div>
                  )}

                  {movie.tagline && (
                    <p className="text-xs text-neutral-400 italic font-light line-clamp-2">
                      "{movie.tagline}"
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                    {movie.studios && movie.studios.length > 0 && (
                      <span className="text-[10px] text-neutral-300 px-2 py-0.5 rounded-md bg-[#242938] border border-white/10 font-semibold">
                        {movie.studios[0]}
                      </span>
                    )}
                    {movie.totalEpisodes && (
                      <span className="text-[10px] text-neutral-300 px-2 py-0.5 rounded-md bg-[#1e222e] border border-white/5 font-medium">
                        {movie.totalEpisodes} Episodes
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400 px-2 py-0.5 rounded-md bg-[#161822] border border-white/5 font-medium">
                      {movie.resolution}
                    </span>
                    <span className="text-[10px] text-neutral-400 px-2 py-0.5 rounded-md bg-[#161822] border border-white/5 font-medium">
                      {movie.audioFormat}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setIsPlayingTrailer(true)}
                  className="flex-1 py-3 px-5 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-colors min-h-[46px]"
                >
                  <Play className="w-4 h-4 fill-neutral-950" />
                  <span>Stream Movie</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={() => onToggleWatchlist(movie.id)}
                  className={`p-3 rounded-2xl flex items-center justify-center transition-colors min-h-[46px] min-w-[46px] ${
                    isSaved
                      ? 'bg-neutral-200 text-neutral-950'
                      : 'bg-[#1e222c] hover:bg-[#282e3b] text-neutral-200'
                  }`}
                  aria-label={isSaved ? 'In Watchlist' : 'Add to Watchlist'}
                >
                  {isSaved ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  type="button"
                  onClick={handleShare}
                  className="p-3 rounded-2xl bg-[#1e222c] hover:bg-[#282e3b] text-neutral-200 flex items-center justify-center transition-colors min-h-[46px] min-w-[46px]"
                  aria-label="Share movie"
                >
                  <Share2 className="w-5 h-5" />
                </motion.button>
              </div>

              {copiedShare && (
                <div className="text-center py-1 text-xs text-neutral-300 font-medium">
                  Link copied to clipboard
                </div>
              )}

              {/* Content Tabs (Overview, Reviews, Episodes) */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#161822] border border-white/5">
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
                  {/* Embed Player Server Selection */}
                  <div className="p-3.5 rounded-2xl bg-[#181a22] border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                        Embed Player Source
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        Multi-Source CDN
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(['VidSrc Pro', 'AutoEmbed VIP', 'SuperEmbed'] as const).map((source) => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => setStreamQuality(source as any)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            (streamQuality as string) === source || (streamQuality === '4K' && source === 'VidSrc Pro')
                              ? 'bg-neutral-200 text-neutral-950 font-semibold'
                              : 'bg-[#222631] text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {source}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Synopsis */}
                  <div>
                    <p className="text-xs text-neutral-300 font-light leading-relaxed">
                      {movie.synopsis}
                    </p>
                  </div>

                  {/* Director & Cast */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-neutral-400">Director:</span>
                      <span className="text-xs font-medium text-white px-2.5 py-0.5 rounded-full bg-[#1b1e27]">
                        {movie.director}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-neutral-400">Cast:</span>
                      {movie.cast.map((actor) => (
                        <span
                          key={actor}
                          className="text-xs font-light text-neutral-300 px-2.5 py-0.5 rounded-full bg-[#1b1e27]"
                        >
                          {actor}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-neutral-400">Genres:</span>
                      {movie.genres.map((genre) => (
                        <span
                          key={genre}
                          className="text-xs font-medium text-neutral-300 px-2.5 py-0.5 rounded-full bg-[#202531]"
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
                        onClick={() => setIsPlayingTrailer(true)}
                        className="p-3 rounded-2xl bg-[#161822] hover:bg-[#202433] border border-white/5 text-left transition-colors cursor-pointer group flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-400 mb-0.5">
                            <span className="font-bold text-white px-1.5 py-0.5 rounded bg-[#242938]">EP {ep.number}</span>
                            <span>{ep.duration || '24m'}</span>
                          </div>
                          <div className="text-xs font-medium text-neutral-200 group-hover:text-white line-clamp-1">
                            {ep.title}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-[#222736] group-hover:bg-white text-neutral-300 group-hover:text-neutral-950 transition-colors shrink-0">
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
      </div>
    </AnimatePresence>
  );
};
